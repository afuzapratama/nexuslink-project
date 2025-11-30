# 🚀 NexusLink Production Deployment Guide

## **📋 Overview: 3-Tier Deployment**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VPS 1: API Server                                              │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ • Domain: api.htmlin.my.id                             │   │
│  │ • Role: Core API + DynamoDB + Redis                    │   │
│  │ • Script: VPS1_API_SETUP.sh                            │   │
│  │ • Time: ~10 minutes                                    │   │
│  └────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  VPS 2: Dashboard                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ • Domain: dashboard.htmlin.my.id                       │   │
│  │ • Role: Next.js Admin UI                               │   │
│  │ • Script: VPS2_DASHBOARD_SETUP.sh                      │   │
│  │ • Time: ~8 minutes                                     │   │
│  └────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  VPS 3-22: Edge Agents (20 servers)                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ • Domains: go/link/s.htmlin.my.id, etc.               │   │
│  │ • Role: Edge redirectors                               │   │
│  │ • Script: nexuslink-agent/install.sh                   │   │
│  │ • Time: ~3 minutes per agent                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## **🎯 NEW Simplified Structure**

```
nexuslink-project/
├── VPS1_API_SETUP.sh          ← API Server installer (root level)
├── VPS2_DASHBOARD_SETUP.sh    ← Dashboard installer (root level)
├── nexuslink-agent/           ← Agent installer (separate folder)
│   ├── install.sh
│   └── README.md
│
├── DEPLOYMENT_GUIDE.md        ← This file (main guide)
├── ENV_FILE_LOADING.md        ← Environment config explanation
└── IP_CHECK_CONFIGURATION.md  ← Bot detection config
```

**Why root level?**
- ✅ Easy to find (no nested folders)
- ✅ Direct GitHub Raw URL access
- ✅ Clear separation by VPS role
- ✅ One script per server type

---

## **⚡ Quick Start (Copy-Paste Ready)**

### **VPS 1: API Server**

```bash
# 1. Launch VPS + Point DNS
#    api.htmlin.my.id → VPS_IP

# 2. SSH to VPS
ssh ubuntu@api.htmlin.my.id

# 3. ONE COMMAND - Full auto install!
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/VPS1_API_SETUP.sh | bash

# 4. Follow prompts:
#    - Set Redis password
#    - Choose DynamoDB method (IAM role or keys)
#    - Enter domain & email for SSL
#
# ⏱️ Time: ~10 minutes
# 💾 API Key saved to: ~/nexuslink-api-key.txt
```

### **VPS 2: Dashboard**

```bash
# 1. Launch VPS + Point DNS
#    dashboard.htmlin.my.id → VPS_IP

# 2. SSH to VPS
ssh ubuntu@dashboard.htmlin.my.id

# 3. ONE COMMAND - Full auto install!
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/VPS2_DASHBOARD_SETUP.sh | bash

# 4. Follow prompts:
#    - Enter API URL (https://api.htmlin.my.id)
#    - Enter API Key (from VPS 1)
#    - Enter domain & email for SSL
#
# ⏱️ Time: ~8 minutes
# 🌐 Access: https://dashboard.htmlin.my.id
```

### **VPS 3-22: Edge Agents (20 servers)**

```bash
# 1. Launch VPS + Point DNS
#    go.htmlin.my.id → VPS_IP

# 2. Generate Node Token from Dashboard
#    https://dashboard.htmlin.my.id/nodes
#    Click "Add Node" → Copy token

# 3. SSH to VPS
ssh ubuntu@go.htmlin.my.id

# 4. ONE COMMAND - Full auto install!
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=YOUR_API_KEY \
  --token=NODE_TOKEN_FROM_DASHBOARD \
  --email=admin@htmlin.my.id

# ⏱️ Time: ~3 minutes per agent
# 🚀 Repeat for all 20 agents
```

---

## **📝 Detailed Step-by-Step**

### **Phase 1: VPS 1 - API Server**

#### **Prerequisites:**
- ✅ Ubuntu 22.04 VPS (2GB RAM, 2 vCPU minimum)
- ✅ DNS configured: `api.htmlin.my.id` → VPS IP
- ✅ AWS account with DynamoDB access

#### **Installation:**

```bash
# Connect to VPS
ssh ubuntu@<VPS_IP>

# Download & run installer
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/VPS1_API_SETUP.sh | bash
```

#### **Interactive Prompts:**

**1. Redis Password:**
```bash
⚠️  You need to set Redis password manually!
1. Run: sudo nano /etc/redis/redis.conf
2. Find line: # requirepass foobared
3. Change to: requirepass YOUR_STRONG_PASSWORD
4. Save (Ctrl+O, Enter, Ctrl+X)
5. Restart: sudo systemctl restart redis-server

Press Enter after you've configured Redis password...
```

**2. Test Redis:**
```bash
Enter your Redis password: [type password]
✅ Redis connected successfully!
```

**3. API Key Generation:**
```bash
✅ Generated API Key:
a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2

⚠️  SAVE THIS KEY! You'll need it for Dashboard & Agents!
Also saved to: ~/nexuslink-api-key.txt
```

**4. DynamoDB Setup:**
```bash
Choose DynamoDB setup method:
1. IAM Role (Recommended for production)
2. Access Keys (For testing)
Enter choice (1 or 2): 1

✅ Using IAM Role (make sure it's attached to this EC2)
```

**5. Domain & Email:**
```bash
Enter your domain (e.g., api.htmlin.my.id): api.htmlin.my.id
Enter your email for SSL certificate: admin@htmlin.my.id
```

#### **Verification:**

```bash
# Test API health
curl https://api.htmlin.my.id/health
# Expected: {"status":"ok","timestamp":"..."}

# Check service
sudo systemctl status nexuslink-api

# Check logs
sudo journalctl -u nexuslink-api -n 20

# Test Redis
redis-cli -a "YOUR_PASSWORD" ping
# Expected: PONG
```

#### **Troubleshooting:**

```bash
# Service won't start
sudo journalctl -u nexuslink-api -n 50

# DynamoDB permission issues
aws dynamodb list-tables --region ap-southeast-1

# Redis connection failed
sudo systemctl status redis-server
redis-cli -a "PASSWORD" ping
```

---

### **Phase 2: VPS 2 - Dashboard**

#### **Prerequisites:**
- ✅ VPS 1 (API) must be running
- ✅ API key from VPS 1 setup
- ✅ Ubuntu 22.04 VPS (1GB RAM minimum)
- ✅ DNS configured: `dashboard.htmlin.my.id` → VPS IP

#### **Installation:**

```bash
# Connect to VPS
ssh ubuntu@<VPS_IP>

# Download & run installer
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/VPS2_DASHBOARD_SETUP.sh | bash
```

#### **Interactive Prompts:**

**1. API Configuration:**
```bash
Enter API URL (e.g., https://api.htmlin.my.id): https://api.htmlin.my.id
Enter API Key (from VPS 1 setup): a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2
Enter Dashboard Domain (e.g., dashboard.htmlin.my.id): dashboard.htmlin.my.id
Enter Email for SSL: admin@htmlin.my.id
```

**2. Build Process:**
```bash
Building production bundle...
This may take 2-3 minutes...

✓ Linting and checking validity of types
✓ Creating an optimized production build
✓ Compiled successfully
```

#### **Verification:**

```bash
# Test dashboard
curl https://dashboard.htmlin.my.id
# Should return HTML

# Check PM2 status
pm2 status
# Should show: nexuslink-dashboard | online

# Check logs
pm2 logs nexuslink-dashboard

# Open in browser
https://dashboard.htmlin.my.id
```

#### **Troubleshooting:**

```bash
# Dashboard not loading
pm2 logs nexuslink-dashboard --lines 50

# Can't connect to API
curl -H "X-Nexus-Api-Key: YOUR_KEY" https://api.htmlin.my.id/health

# Restart dashboard
pm2 restart nexuslink-dashboard

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

### **Phase 3: VPS 3-22 - Edge Agents**

#### **Prerequisites:**
- ✅ VPS 1 (API) must be running
- ✅ VPS 2 (Dashboard) must be running
- ✅ Node token from Dashboard
- ✅ Ubuntu 22.04 VPS (512MB RAM minimum)
- ✅ DNS configured for each domain

#### **Generate Node Token:**

```bash
# 1. Open Dashboard
https://dashboard.htmlin.my.id/nodes

# 2. Click "Add Node" button

# 3. Fill form:
Name: Agent Singapore 1
Region: SG-SIN
Domain: go.htmlin.my.id
Description: Primary agent

# 4. Click "Create Node"

# 5. Copy token from response:
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Installation (20 agents):**

```bash
# Agent 1: go.htmlin.my.id
ssh ubuntu@<VPS_IP>
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=YOUR_API_KEY \
  --token=NODE_TOKEN_1 \
  --email=admin@htmlin.my.id

# Agent 2: link.htmlin.my.id
ssh ubuntu@<VPS_IP_2>
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | bash -s -- \
  --domain=link.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=YOUR_API_KEY \
  --token=NODE_TOKEN_2 \
  --email=admin@htmlin.my.id

# ... Repeat for remaining 18 agents
```

#### **Batch Deployment Script:**

```bash
# Create deployment script
cat > deploy-all-agents.sh << 'EOF'
#!/bin/bash

API_KEY="a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2"
API_URL="https://api.htmlin.my.id"
EMAIL="admin@htmlin.my.id"

# Array of [IP, Domain, Token]
declare -a AGENTS=(
  "203.0.113.1 go.htmlin.my.id token1"
  "203.0.113.2 link.htmlin.my.id token2"
  "203.0.113.3 s.htmlin.my.id token3"
  # ... add remaining 17 agents
)

for agent in "${AGENTS[@]}"; do
  read -r IP DOMAIN TOKEN <<< "$agent"
  
  echo "Deploying $DOMAIN..."
  
  ssh ubuntu@$IP "curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | bash -s -- \
    --domain=$DOMAIN \
    --api=$API_URL \
    --key=$API_KEY \
    --token=$TOKEN \
    --email=$EMAIL"
  
  echo "✅ $DOMAIN deployed"
  sleep 5
done
EOF

chmod +x deploy-all-agents.sh
./deploy-all-agents.sh
```

#### **Verification:**

```bash
# Test agent
curl https://go.htmlin.my.id/health
# Expected: {"status":"ok","node":"go.htmlin.my.id"}

# Check service
ssh ubuntu@go.htmlin.my.id
sudo systemctl status nexuslink-agent

# Check in Dashboard
https://dashboard.htmlin.my.id/nodes
# Should show all agents with status: Online
```

---

## **🔐 Security Checklist**

### **All Servers:**
```bash
# ✅ UFW enabled
sudo ufw status

# ✅ Only necessary ports open
# VPS 1: 22, 80, 443
# VPS 2: 22, 80, 443
# VPS 3-22: 22, 80, 443

# ✅ SSL certificates installed
sudo certbot certificates

# ✅ Automatic updates enabled
sudo apt install unattended-upgrades
```

### **API Server:**
```bash
# ✅ Redis password set
redis-cli -a "PASSWORD" ping

# ✅ IAM role (no hardcoded keys)
aws sts get-caller-identity

# ✅ Strong API key (32+ chars)
cat ~/nexuslink-api-key.txt

# ✅ .env.production permissions
ls -la ~/nexuslink-project/nexuslink/.env.production
# Should be: -rw------- (600)
```

---

## **📊 Deployment Timeline**

| Phase | Task | Time | Total |
|-------|------|------|-------|
| **1** | VPS 1: API Server | 10 min | 10 min |
| **2** | VPS 2: Dashboard | 8 min | 18 min |
| **3** | VPS 3-22: 20 Agents | 3 min × 20 | 78 min |
| | **TOTAL** | | **~1.5 hours** |

**With parallel deployment (5 agents at once):**
- Agents: 3 min × 4 batches = 12 minutes
- **Total: ~30 minutes** ⚡

---

## **💰 Cost Estimate**

### **Monthly Costs:**

| Server | Type | Specs | Cost |
|--------|------|-------|------|
| VPS 1 (API) | VPS | 2GB RAM, 2 vCPU | $10 |
| VPS 2 (Dashboard) | VPS | 1GB RAM, 1 vCPU | $5 |
| VPS 3-22 (Agents) | VPS × 20 | 512MB RAM × 20 | $100 |
| **Total** | | | **$115/month** |

### **AWS Costs:**
- DynamoDB: $0-5/month (free tier)
- Data transfer: $0-10/month

**Grand Total: ~$125/month** for complete infrastructure

---

## **🛠️ Management Commands**

### **API Server (VPS 1):**

```bash
# Status
sudo systemctl status nexuslink-api

# Restart
sudo systemctl restart nexuslink-api

# Logs
sudo journalctl -u nexuslink-api -f

# Update
cd ~/nexuslink-project && git pull
go build -o /tmp/api cmd/api/main.go
sudo mv /tmp/api /usr/local/bin/nexuslink-api
sudo systemctl restart nexuslink-api
```

### **Dashboard (VPS 2):**

```bash
# Status
pm2 status

# Restart
pm2 restart nexuslink-dashboard

# Logs
pm2 logs nexuslink-dashboard

# Update
cd ~/nexuslink-project/nexuslink-dashboard
git pull
npm install
npm run build
pm2 restart nexuslink-dashboard
```

### **Agents (VPS 3-22):**

```bash
# Status
sudo systemctl status nexuslink-agent

# Restart
sudo systemctl restart nexuslink-agent

# Logs
sudo journalctl -u nexuslink-agent -f

# Update (auto-update supported in installer)
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=YOUR_API_KEY \
  --token=YOUR_TOKEN \
  --email=admin@htmlin.my.id
```

---

## **📚 Additional Documentation**

- **Environment Configuration:** `ENV_FILE_LOADING.md`
- **Bot Detection Setup:** `IP_CHECK_CONFIGURATION.md`
- **Agent Installer Details:** `nexuslink-agent/README.md`
- **Legacy Deployment:** `nexuslink/deployment/` (archived)

---

## **🎯 Summary**

### **What Changed:**

✅ **OLD Structure (Confusing):**
```
nexuslink/deployment/scripts/
├── deploy.sh              ← Generic, incomplete
├── install-agent.sh       ← Separate from main
└── deploy-amazonlinux.sh  ← OS-specific
```

✅ **NEW Structure (Clear):**
```
Root Level:
├── VPS1_API_SETUP.sh          ← API installer
├── VPS2_DASHBOARD_SETUP.sh    ← Dashboard installer
└── nexuslink-agent/install.sh ← Agent installer
```

### **Benefits:**

1. **Clear Separation**
   - One script per server type
   - Root level (easy to find)
   - No nested folders

2. **Copy-Paste Ready**
   - Direct GitHub Raw URLs
   - One command per VPS
   - ~1.5 hours for full deployment

3. **Production Ready**
   - Complete automation
   - Security hardening
   - SSL auto-install
   - Health checks

---

**Ready to deploy? Start with VPS 1! 🚀**

```bash
ssh ubuntu@api.htmlin.my.id
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/VPS1_API_SETUP.sh | bash
```
