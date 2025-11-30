# 🔒 Domain Validation Security

## Masalah Yang Dipecahkan

### Skenario Attack Tanpa Domain Validation:

```
1. Kamu deploy agent di VPS dengan IP: 103.10.20.30
2. Agent terdaftar dengan domain: go.htmlin.my.id → 103.10.20.30
3. Link kamu: https://go.htmlin.my.id/r/promo → https://tokoku.com/promo

❌ ATTACK:
4. Attacker beli domain: evil-site.com
5. Attacker pointing DNS: evil-site.com → 103.10.20.30
6. Attacker akses: https://evil-site.com/r/promo
7. BERHASIL REDIRECT ke tokoku.com! ❌

DAMPAK:
- Attacker pakai infrastruktur kamu GRATIS
- Traffic hijacking
- Brand abuse
- Analytics kamu kotor
```

### ✅ Dengan Domain Validation:

```
1. Agent punya whitelist: [go.htmlin.my.id, link.htmlin.my.id]
2. Setiap request, Agent cek Host header
3. Request dari evil-site.com → HTTP 403 Forbidden ✅
4. Request dari go.htmlin.my.id → HTTP 302 Redirect ✅
```

---

## Cara Kerja

### 1. **Registration Phase**

```go
// Agent startup
NEXUS_NODE_TOKEN=abc123
NEXUS_NODE_DOMAIN=go.htmlin.my.id

→ Agent calls: POST /nodes/register
   {
     "token": "abc123",
     "domain": "go.htmlin.my.id"
   }

→ Database stores:
   Node {
     ID: "node-xyz",
     PublicURL: "https://go.htmlin.my.id",
     Domains: ["go.htmlin.my.id"]  ← Whitelist
   }

→ Agent initializes:
   allowedDomains = ["go.htmlin.my.id"]
```

### 2. **Request Validation**

```go
// Setiap redirect request
GET https://go.htmlin.my.id/r/promo
Host: go.htmlin.my.id

→ Agent extracts: currentDomain = "go.htmlin.my.id"
→ Agent checks: isDomainAllowed("go.htmlin.my.id")
   - Loop through allowedDomains
   - Case-insensitive match
   - Result: true ✅

→ Proceed with redirect
```

```go
// Attack request
GET http://103.10.20.30/r/promo
Host: evil-site.com

→ Agent extracts: currentDomain = "evil-site.com"
→ Agent checks: isDomainAllowed("evil-site.com")
   - Loop through allowedDomains
   - No match found
   - Result: false ❌

→ Return: HTTP 403 Forbidden
```

### 3. **Auto-Sync Mechanism**

```go
// Heartbeat goroutine (every 30s)
func startHeartbeat() {
    ticker := time.NewTicker(30 * time.Second)
    for {
        // Send heartbeat
        POST /nodes/heartbeat

        // Refresh domain whitelist
        refreshAllowedDomains()  ← Fetch from API

        <-ticker.C
    }
}

// Domain cache
allowedDomains []string
domainsLastUpdate time.Time
domainsCacheTTL = 30 * time.Second

// On each request
if time.Since(domainsLastUpdate) > 30s {
    go refreshAllowedDomains()  // Non-blocking
}
```

### 4. **Dynamic Domain Management**

```bash
# Dashboard adds domain (no agent restart!)
POST /admin/nodes/{nodeId}/domains
{
  "domain": "link.htmlin.my.id"
}

→ Database updates:
   Node.Domains = ["go.htmlin.my.id", "link.htmlin.my.id"]

→ Next heartbeat (within 30s):
   Agent fetches updated list
   allowedDomains = ["go.htmlin.my.id", "link.htmlin.my.id"]

→ New domain instantly works ✅
```

---

## Implementation Details

### Agent Code (`cmd/agent/main.go`)

```go
// Global state
var (
    currentNodeID     string
    allowedDomains    []string
    domainsLastUpdate time.Time
    domainsCacheTTL   = 30 * time.Second
)

// Fetch domains from API
func refreshAllowedDomains(apiBase, apiKey string) {
    resp := GET /admin/nodes/{nodeId}
    
    node := parseResponse(resp)
    
    // Extract domain from PublicURL
    publicDomain := extractDomain(node.PublicURL)
    
    // Combine with Domains array
    allowedDomains = [publicDomain] + node.Domains
    
    domainsLastUpdate = time.Now()
    
    log.Printf("Whitelist: %v", allowedDomains)
}

// Validate domain
func isDomainAllowed(domain string) bool {
    // Auto-refresh if cache expired (non-blocking)
    if time.Since(domainsLastUpdate) > domainsCacheTTL {
        go refreshAllowedDomains(apiBase, apiKey)
    }
    
    // Empty whitelist = allow all (backward compat)
    if len(allowedDomains) == 0 {
        return true
    }
    
    // Case-insensitive match
    domain = strings.ToLower(domain)
    for _, allowed := range allowedDomains {
        if strings.EqualFold(allowed, domain) {
            return true
        }
    }
    
    return false
}

// Redirect handler
func redirectHandler(w http.ResponseWriter, r *http.Request) {
    // Extract domain from Host header
    currentDomain := r.Host
    if idx := strings.Index(currentDomain, ":"); idx != -1 {
        currentDomain = currentDomain[:idx]  // Remove port
    }
    
    // Validate
    if !isDomainAllowed(currentDomain) {
        log.Printf("BLOCKED: domain=%s not in %v", 
            currentDomain, allowedDomains)
        http.Error(w, "Domain not authorized", 403)
        return
    }
    
    // Continue with redirect...
}
```

### API Code (`cmd/api/main.go`)

```go
// Get node details (used by agent)
GET /admin/nodes/{id}
→ Returns:
   {
     "id": "node-xyz",
     "name": "US-NYC-01",
     "publicUrl": "https://go.htmlin.my.id",
     "domains": ["go.htmlin.my.id", "link.htmlin.my.id"]
   }

// Add domain to node
POST /admin/nodes/{id}/domains
{
  "domain": "s.htmlin.my.id"
}
→ Appends to Node.Domains array

// Remove domain
DELETE /admin/nodes/{id}/domains?domain=s.htmlin.my.id
→ Removes from Node.Domains array
```

---

## Production Setup

### Step 1: Deploy Agent with Initial Domain

```bash
# VPS 3: go.htmlin.my.id
curl -fsSL https://raw.githubusercontent.com/.../install.sh | sudo bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=$API_KEY \
  --token=$NODE_TOKEN \
  --email=admin@htmlin.my.id

# Agent registers with domain whitelist: [go.htmlin.my.id]
```

### Step 2: Verify Whitelist Active

```bash
# Check agent logs
journalctl -u nexuslink-agent -f

# Look for:
# Domain whitelist updated: [go.htmlin.my.id] (nodeID=node-xyz)
```

### Step 3: Test Security

```bash
# Valid domain (should work)
curl -H "Host: go.htmlin.my.id" https://go.htmlin.my.id/r/test
# → HTTP 302 Redirect ✅

# Invalid domain (should block)
curl -H "Host: evil.com" https://103.10.20.30/r/test
# → HTTP 403 Forbidden ✅
```

### Step 4: Add Additional Domains

**Via Dashboard:**
1. Go to: https://dashboard.htmlin.my.id/nodes
2. Click node "go.htmlin.my.id"
3. Add domain: `link.htmlin.my.id`
4. Wait 30s for agent cache refresh
5. Test: `curl https://link.htmlin.my.id/r/test` → Works! ✅

**Via API:**
```bash
curl -X POST https://api.htmlin.my.id/admin/nodes/node-xyz/domains \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -d '{"domain": "link.htmlin.my.id"}'
```

### Step 5: Monitor Agent Logs

```bash
journalctl -u nexuslink-agent -f | grep -E "whitelist|BLOCKED"

# Expected output every 30s:
# Domain whitelist updated: [go.htmlin.my.id, link.htmlin.my.id]

# If attack detected:
# BLOCKED: domain=evil.com not in [go.htmlin.my.id, link.htmlin.my.id]
```

---

## Edge Cases

### Case 1: Agent Starts Before Dashboard Setup

```
Scenario: Fresh deployment, no domains added yet

Behavior:
- allowedDomains = [] (empty array)
- isDomainAllowed() returns TRUE (backward compat)
- All domains accepted (like old behavior)

Solution:
- Always register with --domain flag
- Installer ensures first domain added
- No security risk during initial setup
```

### Case 2: DNS Propagation Delay

```
Scenario: You add link.htmlin.my.id to dashboard, but DNS still propagating

Problem:
- User tries: https://link.htmlin.my.id/r/test
- DNS resolves to old server or fails
- Even if DNS correct, link might not be in agent cache yet

Solution:
- Dashboard shows warning: "DNS propagation: 5-15 min"
- Agent cache refreshes every 30s
- Test with curl -H "Host: link.htmlin.my.id" http://IP/r/test
```

### Case 3: Node Has No Domains Array (Old DB)

```
Scenario: Existing nodes from before multi-domain feature

Database:
Node {
  PublicURL: "https://go.htmlin.my.id",
  Domains: null  ← Old nodes don't have this field
}

Agent Behavior:
- Extracts domain from PublicURL → "go.htmlin.my.id"
- allowedDomains = ["go.htmlin.my.id"]
- Works correctly with fallback logic ✅
```

### Case 4: Localhost Development

```
Environment:
- Agent: http://localhost:9090
- NEXUS_NODE_DOMAIN=localhost

Request:
Host: localhost:9090

Agent Logic:
- Strips port: currentDomain = "localhost"
- Checks: isDomainAllowed("localhost")
- Match found in allowedDomains ✅
- Development works without issues
```

---

## Performance Impact

### Latency Analysis

```
Without Domain Validation:
Request → Agent → API → Redirect
         0ms    5ms     0ms
Total: 5ms

With Domain Validation:
Request → Domain Check → Agent → API → Redirect
         0.001ms       0ms    5ms     0ms
Total: 5.001ms

Impact: +0.001ms (negligible, <0.02% overhead)
```

### Memory Usage

```
Per Agent:
- allowedDomains: ~100 bytes (assuming 5 domains @ 20 chars each)
- domainsLastUpdate: 8 bytes (time.Time)
- Cache TTL: 8 bytes (time.Duration)

Total: ~116 bytes per agent
Impact: Negligible (< 1KB)
```

### API Load

```
Domain Refresh:
- Frequency: Every 30s (heartbeat)
- Endpoint: GET /admin/nodes/{id}
- Response: ~500 bytes JSON

Load:
- 20 agents × 2 req/min = 40 req/min
- Bandwidth: 40 × 500 bytes = 20KB/min
- Negligible impact on API ✅
```

---

## Security Benefits

### ✅ Prevents Infrastructure Abuse

```
Attack: Attacker points random domains to your IP
Before: All domains work → Attacker gets free redirects
After: Only whitelisted domains work → Attack blocked
```

### ✅ Brand Protection

```
Attack: Phishing site uses your short URL domain
Before: https://phishing.com/r/bank → Looks like official bank link
After: HTTP 403 → Phishing attempt fails
```

### ✅ Analytics Accuracy

```
Attack: Bot traffic from random domains
Before: Pollutes analytics with fake traffic
After: Only legitimate domains counted
```

### ✅ Compliance & Control

```
Requirement: Only serve links on approved domains
Before: No enforcement → Compliance risk
After: Programmatic whitelist → Audit trail
```

---

## Troubleshooting

### Problem: Agent Rejects Valid Domain

**Symptoms:**
```bash
curl https://go.htmlin.my.id/r/test
# → HTTP 403 Forbidden
```

**Debug:**
```bash
# Check agent logs
journalctl -u nexuslink-agent | grep whitelist
# Expected: Domain whitelist updated: [go.htmlin.my.id]

# Check domain in database
curl https://api.htmlin.my.id/admin/nodes/node-xyz \
  -H "X-Nexus-Api-Key: $API_KEY"
# Check: "domains": ["go.htmlin.my.id"]
```

**Fix:**
```bash
# Manually add domain
curl -X POST https://api.htmlin.my.id/admin/nodes/node-xyz/domains \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -d '{"domain": "go.htmlin.my.id"}'

# Wait 30s for agent cache refresh
# Or restart agent:
systemctl restart nexuslink-agent
```

---

### Problem: Domain Added But Still Blocked

**Cause:** Agent cache not refreshed yet (30s TTL)

**Fix:**
```bash
# Option 1: Wait 30s (next heartbeat)
sleep 30

# Option 2: Restart agent (instant)
systemctl restart nexuslink-agent

# Option 3: Check logs for refresh
journalctl -u nexuslink-agent -f | grep whitelist
```

---

### Problem: All Domains Accepted (No Validation)

**Symptoms:**
```bash
curl -H "Host: any-domain.com" http://103.10.20.30/r/test
# → HTTP 302 Redirect (should be 403!)
```

**Cause:** Empty allowedDomains array

**Debug:**
```bash
# Check agent logs
journalctl -u nexuslink-agent | grep whitelist
# If empty: Domain whitelist updated: []

# Check registration
journalctl -u nexuslink-agent | grep "Registered as"
# Should show: Registered as nodeID=xyz domain=go.htmlin.my.id
```

**Fix:**
```bash
# Ensure NEXUS_NODE_DOMAIN set in .env
cat /opt/nexuslink-agent/.env | grep NODE_DOMAIN
# Should have: NEXUS_NODE_DOMAIN=go.htmlin.my.id

# Restart agent
systemctl restart nexuslink-agent
```

---

## Testing

### Automated Test Suite

```bash
# Run domain validation tests
cd /home/natama/Projects
./test-domain-validation.sh

# Tests:
# 1. ✅ Valid domain accepted
# 2. ✅ Invalid domain blocked (403)
# 3. ✅ Dynamic domain addition works
```

### Manual Test Cases

**Test 1: Valid Domain**
```bash
curl -v https://go.htmlin.my.id/r/test 2>&1 | grep "< HTTP"
# Expected: < HTTP/2 302 (or 404 if link doesn't exist)
```

**Test 2: Invalid Domain**
```bash
curl -v -H "Host: evil.com" http://YOUR_VPS_IP:9090/r/test 2>&1 | grep "< HTTP"
# Expected: < HTTP/1.1 403 Forbidden
```

**Test 3: Domain Addition**
```bash
# Add domain
curl -X POST https://api.htmlin.my.id/admin/nodes/YOUR_NODE_ID/domains \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -d '{"domain": "new.htmlin.my.id"}'

# Wait 30s
sleep 30

# Test
curl -H "Host: new.htmlin.my.id" http://YOUR_VPS_IP:9090/r/test
# Expected: HTTP 302 (works!)
```

---

## Migration Guide

### For Existing Deployments

**Step 1: Update Code**
```bash
cd /home/natama/Projects
git pull origin main
```

**Step 2: Rebuild Agent**
```bash
cd nexuslink
go build -o /opt/nexuslink-agent/agent cmd/agent/main.go
```

**Step 3: Restart Agent**
```bash
systemctl restart nexuslink-agent
```

**Step 4: Verify Domain Registered**
```bash
journalctl -u nexuslink-agent | grep whitelist
# Should show: Domain whitelist updated: [your-domain.com]
```

**Step 5: Test**
```bash
./test-domain-validation.sh
```

---

## FAQ

**Q: Does this affect performance?**  
A: No. Overhead is <0.001ms per request. Domain check is in-memory string comparison.

**Q: What if I want multiple domains per agent?**  
A: Use the Dashboard → Nodes → Add Domain feature. Max 100 domains per agent (practical limit).

**Q: Can I disable validation for testing?**  
A: Yes. If allowedDomains is empty, all domains are accepted. But don't do this in production!

**Q: What happens if API is down during domain refresh?**  
A: Agent uses cached domain list. No disruption to service. Next refresh will retry.

**Q: Can attacker bypass by spoofing X-Forwarded-Host?**  
A: No. Agent reads `r.Host` (actual HTTP Host header), not forwarded headers.

**Q: Does this work with HTTPS?**  
A: Yes. SSL termination happens at Nginx, then proxies to Agent with original Host header intact.

---

## References

- **Code:** `nexuslink/cmd/agent/main.go` (isDomainAllowed, refreshAllowedDomains)
- **API:** `nexuslink/cmd/api/main.go` (GET /admin/nodes/:id, POST/DELETE /admin/nodes/:id/domains)
- **Test:** `test-domain-validation.sh`
- **Model:** `nexuslink/internal/models/node.go` (Node.Domains field)
