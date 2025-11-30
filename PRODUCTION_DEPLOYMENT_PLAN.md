# 🚀 NexusLink Production Deployment Plan

**Date:** November 30, 2025  
**Infrastructure:** Multi-Server Production Setup  
**Domains:** api.htmlin.my.id, dashboard.htmlin.my.id, go.htmlin.my.id, link.htmlin.my.id

---

## 🏗️ Server Architecture

### Server Requirements (Minimum 2, Recommended 4+)

#### **Server 1: API Server** (Required)
- **Domain:** `api.htmlin.my.id`
- **Purpose:** Core business logic, database operations, analytics
- **Stack:** Go API, DynamoDB, Redis
- **Instance:** t3.small (2GB RAM minimum)
- **Ports:** 8080 (API), 6379 (Redis)

#### **Server 2: Dashboard** (Required)
- **Domain:** `dashboard.htmlin.my.id`
- **Purpose:** Admin UI for link management
- **Stack:** Next.js 16, Node.js
- **Instance:** t3.micro (1GB RAM sufficient)
- **Port:** 3000

#### **Server 3+: Agent/Edge Servers** (Required 1+, Recommended 2+)
- **Domains:** `go.htmlin.my.id`, `link.htmlin.my.id`, `s.htmlin.my.id`, etc.
- **Purpose:** Fast redirects, rate limiting, edge caching
- **Stack:** Go Agent
- **Instance:** t3.micro per agent (lightweight)
- **Port:** 9090
- **Strategy:** Deploy in multiple regions for global performance

---

## 📊 Server Responsibilities

```
┌──────────────────────────────────────────────────────────┐
│ SERVER 1: API (api.htmlin.my.id)                         │
├──────────────────────────────────────────────────────────┤
│ ✅ Link CRUD operations                                  │
│ ✅ Analytics processing                                  │
│ ✅ A/B testing logic                                     │
│ ✅ Webhook delivery                                      │
│ ✅ Database operations (DynamoDB)                        │
│ ✅ Rate limit data storage (Redis)                       │
│ ✅ Link resolution (fallback for agents)                 │
│ ❌ NOT handling user redirects directly                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ SERVER 2: Dashboard (dashboard.htmlin.my.id)             │
├──────────────────────────────────────────────────────────┤
│ ✅ Admin interface                                       │
│ ✅ Link creation & editing                               │
│ ✅ Analytics visualization                               │
│ ✅ A/B testing management                                │
│ ✅ Webhook configuration                                 │
│ ✅ Node management                                       │
│ 🔜 Authentication (future)                               │
│ → Communicates with API server via BFF                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ SERVER 3+: Agents (go.htmlin.my.id, link.htmlin.my.id)  │
├──────────────────────────────────────────────────────────┤
│ ✅ Fast redirects (primary job!)                         │
│ ✅ Rate limiting per IP                                  │
│ ✅ Bot detection                                         │
│ ✅ Visitor context collection                            │
│ ✅ Forward analytics to API                              │
│ → Lightweight, high-performance                          │
│ → Can deploy many instances globally                     │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Deployment Sequence

### Phase 1: Core Infrastructure (Server 1 - API)

**Domain:** `api.htmlin.my.id` → Point to VPS 1 IP

```bash
# 1. Launch Ubuntu 22.04 EC2/VPS
# 2. SSH to server
ssh ubuntu@api-server-ip

# 3. Setup SSH for GitHub
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub Settings → SSH keys

# 4. Clone repository
git clone git@github.com:afuzapratama/nexuslink-project.git
cd nexuslink-project/nexuslink

# 5. Configure environment
cp .env.production.example .env.production
nano .env.production
```

**Edit `.env.production`:**
```bash
NEXUS_HTTP_ADDR=:8080
NEXUS_DYNAMO_ENDPOINT=  # Empty = use AWS DynamoDB
NEXUS_AWS_REGION=ap-southeast-1
NEXUS_AWS_ACCESS_KEY_ID=your-aws-key
NEXUS_AWS_SECRET_ACCESS_KEY=your-aws-secret
NEXUS_API_KEY=GENERATE_STRONG_KEY_HERE_32_CHARS
NEXUS_REDIS_ADDR=localhost:6379
NEXUS_REDIS_PASSWORD=GENERATE_STRONG_REDIS_PASSWORD
```

**Generate secure keys:**
```bash
# Generate API key
openssl rand -hex 32

# Generate Redis password
openssl rand -base64 24
```

```bash
# 6. Deploy API
sudo ./deployment/scripts/deploy.sh api

# 7. Setup SSL
sudo ./deployment/scripts/setup-ssl.sh
# Enter domain: api.htmlin.my.id
# Enter email: your-email@example.com

# 8. Verify
curl https://api.htmlin.my.id/health
# Expected: {"status":"ok"}
```

---

### Phase 2: Dashboard (Server 2)

**Domain:** `dashboard.htmlin.my.id` → Point to VPS 2 IP

```bash
# 1. Launch Ubuntu 22.04 EC2/VPS
# 2. SSH to server
ssh ubuntu@dashboard-server-ip

# 3. Setup SSH & clone (same as Phase 1 steps 3-4)

# 4. Configure dashboard environment
cd nexuslink-project/nexuslink-dashboard
cp .env.example .env.production

nano .env.production
```

**Edit `.env.production`:**
```bash
NEXUS_API_BASE=https://api.htmlin.my.id
NEXUS_API_KEY=SAME_KEY_FROM_API_SERVER
```

```bash
# 5. Install dependencies
sudo apt update
sudo apt install -y nodejs npm

# 6. Build dashboard
npm install
npm run build

# 7. Install PM2
sudo npm install -g pm2

# 8. Start dashboard
pm2 start npm --name nexuslink-dashboard -- start

# 9. Save PM2 config
pm2 save
pm2 startup

# 10. Setup Nginx reverse proxy
sudo nano /etc/nginx/sites-available/dashboard.htmlin.my.id
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name dashboard.htmlin.my.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dashboard.htmlin.my.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 11. Setup SSL
sudo certbot --nginx -d dashboard.htmlin.my.id

# 12. Verify
curl https://dashboard.htmlin.my.id
# Should return Next.js HTML
```

---

### Phase 3: Agent Servers (Server 3+)

**Domains:** `go.htmlin.my.id`, `link.htmlin.my.id` → Point to respective VPS IPs

**For EACH agent server:**

```bash
# 1. Launch Ubuntu 22.04 EC2/VPS (can be smaller instance)
# 2. SSH to server
ssh ubuntu@agent-server-ip

# 3. Setup SSH & clone

# 4. Generate node token from dashboard
# Visit: https://dashboard.htmlin.my.id/nodes
# Click "Generate Token"
# Copy the token (one-time use!)

# 5. Configure agent environment
cd nexuslink-project/nexuslink
cp .env.production.example .env.production

nano .env.production
```

**Edit `.env.production`:**
```bash
NEXUS_AGENT_HTTP_ADDR=:9090
NEXUS_API_BASE=https://api.htmlin.my.id
NEXUS_AGENT_API_KEY=SAME_KEY_FROM_API_SERVER
NEXUS_NODE_TOKEN=PASTE_TOKEN_FROM_DASHBOARD
NEXUS_NODE_DOMAIN=go.htmlin.my.id  # Or link.htmlin.my.id
NEXUS_DEBUG_IP=  # Empty for production
```

```bash
# 6. Deploy agent only
sudo ./deployment/scripts/deploy.sh agent

# 7. Verify registration
# Check dashboard → Nodes page
# Agent should appear as "Online"

# 8. Setup Nginx for agent
sudo nano /etc/nginx/sites-available/go.htmlin.my.id
```

**Agent Nginx config:**
```nginx
server {
    listen 80;
    server_name go.htmlin.my.id;

    location / {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable & SSL
sudo ln -s /etc/nginx/sites-available/go.htmlin.my.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d go.htmlin.my.id

# 9. Test redirect
# Create link in dashboard with alias "test"
curl -I https://go.htmlin.my.id/r/test
# Should return 302 redirect
```

**Repeat for additional agents** (link.htmlin.my.id, s.htmlin.my.id, etc.)

---

## 🔐 Security Checklist

### API Server
- ✅ Strong API key (32+ characters)
- ✅ Redis password set
- ✅ Firewall: Only ports 80, 443, 22 open to public
- ✅ SSH key-only authentication (disable password)
- ✅ AWS IAM user with minimal permissions (DynamoDB only)

### Dashboard Server
- ✅ API key matches API server
- ✅ Firewall: Only ports 80, 443, 22 open
- ✅ PM2 auto-restart enabled
- 🔜 Authentication system (FASE 8)

### Agent Servers
- ✅ Unique node token per agent
- ✅ Domain configured correctly
- ✅ Firewall: Only ports 80, 443, 22 open
- ✅ Rate limiting enabled

---

## 🌍 Domain Configuration

### DNS Records (at your DNS provider)

```
Type    Name        Value               TTL
─────────────────────────────────────────────
A       api         <API_SERVER_IP>     300
A       dashboard   <DASH_SERVER_IP>    300
A       go          <AGENT1_SERVER_IP>  300
A       link        <AGENT2_SERVER_IP>  300
A       s           <AGENT3_SERVER_IP>  300 (optional)
```

**Wait for DNS propagation** (5-15 minutes)

Verify:
```bash
dig api.htmlin.my.id +short
dig dashboard.htmlin.my.id +short
dig go.htmlin.my.id +short
```

---

## 📊 Testing & Verification

### 1. API Health
```bash
curl https://api.htmlin.my.id/health
# Expected: {"status":"ok"}

curl https://api.htmlin.my.id/metrics
# Should return Prometheus metrics
```

### 2. Dashboard Access
```bash
curl https://dashboard.htmlin.my.id
# Should return HTML (Next.js page)
```

Open browser: https://dashboard.htmlin.my.id
- Should show dashboard UI
- No authentication yet (coming in FASE 8)

### 3. Agent Redirects
Create test link in dashboard:
- Alias: `test`
- Target: `https://google.com`
- Domain: `go.htmlin.my.id`

Test:
```bash
curl -I https://go.htmlin.my.id/r/test
# Expected: HTTP 302 → Location: https://google.com
```

### 4. Analytics Flow
After redirect, check dashboard:
- Dashboard → Links → test → Analytics
- Should show 1 click with device/browser/country info

---

## 💰 Cost Estimation (Per Month)

### Minimal Setup (2 Servers)
```
Server 1 (API): t3.small    = $15
Server 2 (Dashboard): t3.micro = $7
DynamoDB: On-Demand (10K clicks) = $5
Total: ~$27/month
```

### Recommended Setup (4 Servers)
```
Server 1 (API): t3.small        = $15
Server 2 (Dashboard): t3.micro  = $7
Server 3 (Agent US): t3.micro   = $7
Server 4 (Agent EU): t3.micro   = $7
DynamoDB: On-Demand (10K clicks) = $5
Total: ~$41/month
```

### Enterprise Setup (6+ Servers)
```
API: t3.medium              = $30
Dashboard: t3.small         = $15
Agents (4x): t3.micro each  = $28
DynamoDB (100K clicks)      = $25
Redis: ElastiCache          = $15
Total: ~$113/month
```

---

## 🚀 Deployment Timeline

**Estimated time for complete setup:**

- ✅ Phase 1 (API): 30 minutes
- ✅ Phase 2 (Dashboard): 20 minutes
- ✅ Phase 3 (Agent 1): 15 minutes
- ✅ Phase 3 (Agent 2+): 10 minutes each

**Total:** ~1.5 hours for 4-server setup

---

## 📝 Post-Deployment Tasks

### Immediate
1. ✅ Create first short link via dashboard
2. ✅ Test redirect from all agent domains
3. ✅ Verify analytics recording
4. ✅ Setup backup cron job (daily DynamoDB backups)

### Week 1
1. 🔜 Monitor error logs (`journalctl -u nexuslink-api -f`)
2. 🔜 Check rate limiting effectiveness
3. 🔜 Verify webhook delivery (if configured)
4. 🔜 Test A/B variants

### Week 2+
1. 🔜 Implement authentication (FASE 8)
2. 🔜 Setup monitoring dashboard (Grafana)
3. 🔜 Configure auto-scaling (if needed)
4. 🔜 Add more agent nodes based on traffic

---

## 🆘 Troubleshooting

### Agent not registering
```bash
# Check agent logs
sudo journalctl -u nexuslink-agent -f

# Common issues:
# 1. Wrong API key
# 2. Token already used (generate new one)
# 3. Network connectivity to API server
# 4. Domain mismatch in .env
```

### Dashboard can't connect to API
```bash
# Check dashboard logs
pm2 logs nexuslink-dashboard

# Common issues:
# 1. Wrong API base URL
# 2. Wrong API key
# 3. CORS issue (shouldn't happen with BFF pattern)
# 4. API server down
```

### Redirects not working
```bash
# Check agent logs
sudo journalctl -u nexuslink-agent -f

# Test direct to agent
curl -I http://localhost:9090/r/test

# Common issues:
# 1. Link not created in dashboard
# 2. Link inactive
# 3. Domain mismatch
# 4. Nginx misconfiguration
```

---

## 🎯 Next Steps (FASE 8)

After production is stable:

1. **Authentication System** 🔐
   - JWT-based auth
   - User registration
   - Role-based access (admin, viewer)
   - API key management per user

2. **Monitoring & Alerts** 📊
   - Grafana dashboard
   - Alert on high error rate
   - Alert on node offline
   - Traffic anomaly detection

3. **Performance Optimization** ⚡
   - CDN integration (CloudFlare)
   - Redis caching for hot links
   - Database query optimization
   - Load testing with k6

---

**Status:** Ready to deploy!  
**Next:** Launch VPS servers and follow Phase 1-3 sequentially
