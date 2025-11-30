# NexusLink AI Agent Instructions

**Project:** Distributed URL shortener with advanced traffic routing, analytics, A/B testing, and webhook notifications  
**Stack:** Go (backend), Next.js 16 (dashboard), DynamoDB, Redis  
**Root:** `/home/natama/Projects`

---

## Architecture Overview

### Three-Tier System
1. **Agent** (`cmd/agent/main.go:9090`) - Edge redirector with rate limiting, forwards visitor context to API
2. **API** (`cmd/api/main.go:8080`) - Core business logic, handles link resolution, analytics, A/B testing, webhooks
3. **Dashboard** (`nexuslink-dashboard:3000`) - Next.js admin UI with BFF pattern (`app/api/nexus/**`)

### Critical Data Flow
```
User → Agent /r/{alias} → API /links/resolve → DynamoDB → Redirect
                ↓
         Headers: X-Real-IP, X-Visitor-User-Agent, X-Visitor-Referer
                ↓
         Analytics: LinkStats.IncrementHit + ClickRepository.LogClick
                ↓
         Webhooks: Async event delivery with HMAC-SHA256 signatures
```

**Why this matters:** Agent MUST forward visitor headers for accurate analytics & rule evaluation. API never trusts agent's IP—always uses `X-Real-IP`.

---

## Database Schema (DynamoDB)

10 tables with `PayPerRequest` billing, auto-created by `database.EnsureTables()`:
- **NexusLinks** (PK: `id`) - `AllowedOS/Devices/Browsers`, `BlockBots`, `FallbackURL`, scheduling (`ActiveFrom/Until`), limits (`MaxClicks`, `ExpiresAt`)
- **NexusLinkVariants** (PK: `id`) - A/B testing variants with weight distribution & conversion tracking
- **NexusClickEvents** (PK: `id`) - Full visitor context per click (UA parsed, GeoIP optional)
- **NexusWebhooks** (PK: `id`) - Event subscriptions with retry logic (3 attempts, exponential backoff)
- **NexusLinkGroups** (PK: `id`) - Link organization with color/icon metadata
- **NexusNodes/NodeTokens/LinkStats/Settings** - Node registration, stats aggregation, global config

**No GSI exists.** Queries use Scan with filter expressions. Adding new fields to `Link` requires updating:
1. `internal/models/link.go` struct
2. `LinkRepository.Create()` defaults
3. `cmd/api/main.go` POST `/links` handler
4. `app/api/nexus/links/route.ts` BFF
5. `app/links/page.tsx` form state

---

## Key Workflows

### Starting Development
```bash
# Required order:
cd /home/natama/Projects/nexuslink && docker-compose up -d  # DynamoDB:8000, Admin:8001, Redis:6379
cd /home/natama/Projects/nexuslink && go run ./cmd/api/main.go  # API:8080
cd /home/natama/Projects/nexuslink && go run ./cmd/agent/main.go  # Agent:9090
cd /home/natama/Projects/nexuslink-dashboard && npm run dev  # Dashboard:3000
```

**Path trap:** Always use absolute paths from `/home/natama/Projects`. Commands like `cd nexuslink && go run cmd/api/main.go` will fail.

### Adding Endpoints (Go)
Pattern in `cmd/api/main.go`:
```go
mux.HandleFunc("/new-endpoint", handler.WithAgentAuth(func(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    // Validate, call repository, return JSON
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}))
```
- No external routers (chi/gorilla banned)
- Method validation explicit (no middleware magic)
- All sensitive endpoints wrapped in `WithAgentAuth` (checks `X-Nexus-Api-Key` header)

### Frontend Pattern (Next.js)
Collocated components in `app/*/page.tsx`:
```tsx
'use client';
// State + form + table in SAME file
const [data, setData] = useState<T[]>([]);
useEffect(() => {
  fetch('/api/nexus/endpoint', {cache: 'no-store'}) // Always bypass cache
    .then(r => r.json())
    .then(setData);
}, []);
```
- BFF routes in `app/api/nexus/**/*.ts` add `X-Nexus-Api-Key` header
- No TypeScript `any` allowed (strict mode)
- No shared API client—use plain `fetch`
- Tailwind v4 dark theme with utility classes

---

## Advanced Features

### Rate Limiting
- Implemented in Agent via `middleware.RateLimitMiddleware`
- Default: 60 req/min per IP tracked in Redis (`ratelimit.Limiter`)
- Headers: `X-RateLimit-Limit/Remaining/Reset` + `Retry-After` on 429
- Analytics stored in Redis for dashboard consumption

### A/B Testing (Link Variants)
- Variants have `Weight` (0-100), selected via weighted random in `ResolverHandler`
- Conversion tracking via `POST /links/:alias/variants/:id/convert` (increment counter)
- Analytics endpoint: `GET /links/:alias/variants/analytics` compares conversion rates

### Webhooks
- Events: `click.created`, `link.expired`, `link.maxclicks`, `node.offline`, etc.
- Async delivery via `webhook.Sender` (3 retries, exponential backoff)
- HMAC-SHA256 signature in `X-Webhook-Signature` header
- Test receiver: `webhook-test-receiver.js` (Node.js Express server)

### Link Rules Engine
Evaluated in `ResolverHandler.HandleResolve()`:
1. Domain restriction (`link.Domain` vs `domain` query param)
2. Time-based activation (`ActiveFrom/Until`)
3. Click limits (`MaxClicks`)
4. UA filtering (`AllowedOS/Devices/Browsers`, `BlockBots`)
5. Fallback to `FallbackURL` on rule violations

---

## Environment Variables

**API** (`nexuslink/.env`):
```
NEXUS_DYNAMO_ENDPOINT=http://localhost:8000
NEXUS_AWS_REGION=ap-southeast-1
NEXUS_API_KEY=your-secret-key
NEXUS_HTTP_ADDR=:8080
NEXUS_REDIS_ADDR=localhost:6379
NEXUS_REDIS_PASSWORD=devpass
```

**Agent** (`nexuslink/.env`):
```
NEXUS_API_BASE=http://localhost:8080
NEXUS_AGENT_API_KEY=your-secret-key  # Must match API's NEXUS_API_KEY
NEXUS_NODE_TOKEN=<from-dashboard>
NEXUS_NODE_DOMAIN=localhost
NEXUS_DEBUG_IP=  # Override visitor IP for testing
```

**Dashboard** (`nexuslink-dashboard/.env.local`):
```
NEXUS_API_BASE=http://localhost:8080
NEXUS_API_KEY=your-secret-key
```

---

## Code Style & Conventions

### Go
- Mixed EN/ID comments acceptable
- Always check errors, return 500 on unexpected failures
- Use `attributevalue.Marshal/Unmarshal` for DynamoDB
- Repositories in `internal/repository/*` use singleton client from `database.Client()`
- Handlers in `internal/handler/*` injected with dependencies (no globals)

### TypeScript/React
- Strict mode, no `any`
- Component-level state (no global store)
- Pages are `'use client'` with collocated logic
- MultiSelect component for array inputs (OS/Browser/Device filters)

### Testing
- Test scripts in `nexuslink/scripts/*.sh` use absolute paths
- Manual testing via DynamoDB Admin UI: `http://localhost:8001`
- Webhook testing: `node webhook-test-receiver.js` (port 4000)

---

## Debugging Checklist

1. **Agent can't reach API:** Check `NEXUS_AGENT_API_KEY` matches `NEXUS_API_KEY`
2. **Analytics missing:** Verify Agent forwards `X-Real-IP/X-Visitor-*` headers
3. **Rate limit not working:** Redis must be running, check `NEXUS_REDIS_ADDR`
4. **Webhook not firing:** Check `isActive=true`, correct event subscription, inspect Agent logs
5. **Link resolution fails:** Inspect in DynamoDB Admin, verify `isActive=true`, check time-based rules

---

## Critical Don'ts
- ❌ Don't add GSI to DynamoDB (scan+filter sufficient for current scale)
- ❌ Don't use Redis without explicit requirement (currently only for rate limiting)
- ❌ Don't refactor existing patterns without user approval
- ❌ Don't use relative paths in terminal commands
- ❌ Don't create new middleware—handlers use explicit auth checks

---

**Communication:** Respond in casual but professional Indonesian unless user requests otherwise.
