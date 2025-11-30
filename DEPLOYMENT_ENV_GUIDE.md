# 🚀 NexusLink Environment Configuration Guide

## **3 Server Architecture = 3 Different ENV Files**

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  VPS 1: API     │      │ VPS 2: Dashboard │      │ VPS 3-22: Agent │
│  Port: 8080     │◄─────┤  Port: 3000      │      │  Port: 9090     │
│                 │      │                  │      │                 │
│  + DynamoDB     │      │  (Next.js only)  │      │  (Redirector)   │
│  + Redis        │      └──────────────────┘      └─────────────────┘
└─────────────────┘
```

---

## **📋 VPS 1: API Server Configuration**

### **Server Info:**
- **Domain:** `api.htmlin.my.id`
- **Role:** Core API + DynamoDB + Redis
- **Port:** 8080
- **ENV File:** `/home/natama/Projects/nexuslink/.env.api.example`

### **Step-by-Step Setup:**

#### **1. Launch VPS & Point DNS**
```bash
# Launch VPS with Ubuntu 22.04
# Point DNS: api.htmlin.my.id → VPS_IP
# Wait 5-10 minutes for DNS propagation
```

#### **2. SSH & Clone Repository**
```bash
ssh ubuntu@<VPS_IP>

# Clone repository (public, no SSH needed!)
git clone https://github.com/afuzapratama/nexuslink-project.git
cd nexuslink-project/nexuslink
```

#### **3. Install Redis**
```bash
# Install Redis first!
sudo apt update
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Find and change:
# bind 127.0.0.1 ::1
# requirepass CHANGE-THIS-TO-STRONG-PASSWORD

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli -a "YOUR_PASSWORD" ping
# Should return: PONG
```

#### **4. Create ENV File**
```bash
# Copy API environment template
cp .env.api.example .env.production

# Edit with your values
nano .env.production
```

#### **5. Fill ENV Values**

```bash
# ========================================
# AWS DynamoDB Configuration
# ========================================
# Option A: Use IAM Role (RECOMMENDED)
NEXUS_DYNAMO_ENDPOINT=
NEXUS_AWS_REGION=ap-southeast-1
# DO NOT set AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
# Attach IAM role to EC2 with DynamoDB permissions

# Option B: Use Access Keys (for testing)
NEXUS_DYNAMO_ENDPOINT=
NEXUS_AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here

# ========================================
# API Configuration
# ========================================
NEXUS_API_PORT=8080
NEXUS_API_KEY=generate-this-with-command-below

# ========================================
# Redis Configuration
# ========================================
NEXUS_REDIS_ADDR=localhost:6379
NEXUS_REDIS_PASSWORD=same-as-redis-requirepass-above
NEXUS_REDIS_PORT=6379

# ========================================
# Optional: GeoIP (for visitor location)
# ========================================
NEXUS_MAXMIND_DB_PATH=/opt/GeoLite2-City.mmdb

# ========================================
# System
# ========================================
TZ=Asia/Jakarta
```

#### **6. Generate Strong API Key**
```bash
# Generate 32-character random key
openssl rand -hex 32

# Example output: a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
# Copy this to NEXUS_API_KEY in .env.production
```

#### **7. Setup AWS DynamoDB**

**Option A: IAM Role (Production - RECOMMENDED)**
```bash
# 1. Go to AWS Console → EC2 → Your Instance
# 2. Actions → Security → Modify IAM Role
# 3. Create new role with policy:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*"
      ],
      "Resource": "*"
    }
  ]
}
# 4. Attach role to EC2
# 5. In .env.production, leave AWS_ACCESS_KEY_ID empty
```

**Option B: Access Keys (Testing Only)**
```bash
# 1. AWS Console → IAM → Users → Create User
# 2. Attach DynamoDBFullAccess policy
# 3. Security Credentials → Create Access Key
# 4. Copy Access Key ID & Secret Access Key
# 5. Paste to .env.production
```

#### **8. Install Dependencies & Run**
```bash
# Install Go
sudo apt install -y golang-go

# Test configuration
go run cmd/api/main.go

# Should see:
# ✅ DynamoDB tables ensured
# ✅ Redis connected
# 🚀 API Server listening on :8080
```

#### **9. Setup SystemD Service**
```bash
# Build binary
go build -o /usr/local/bin/nexuslink-api cmd/api/main.go

# Create service file
sudo nano /etc/systemd/system/nexuslink-api.service
```

```ini
[Unit]
Description=NexusLink API Server
After=network.target redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/nexuslink-project/nexuslink
EnvironmentFile=/home/ubuntu/nexuslink-project/nexuslink/.env.production
ExecStart=/usr/local/bin/nexuslink-api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable & start service
sudo systemctl daemon-reload
sudo systemctl enable nexuslink-api
sudo systemctl start nexuslink-api

# Check status
sudo systemctl status nexuslink-api
```

#### **10. Setup Nginx & SSL**
```bash
# Install Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/nexuslink-api
```

```nginx
server {
    listen 80;
    server_name api.htmlin.my.id;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nexuslink-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d api.htmlin.my.id --non-interactive --agree-tos -m admin@htmlin.my.id
```

#### **11. Setup Firewall**
```bash
# Configure UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

#### **12. Test API**
```bash
# From your local machine
curl -X GET https://api.htmlin.my.id/health

# Should return:
{"status":"ok","timestamp":"2025-11-30T12:00:00Z"}
```

---

## **📋 VPS 2: Dashboard Configuration**

### **Server Info:**
- **Domain:** `dashboard.htmlin.my.id`
- **Role:** Next.js Dashboard UI
- **Port:** 3000
- **ENV File:** `/home/natama/Projects/nexuslink-dashboard/.env.dashboard.example`

### **Setup (After API is Running):**

```bash
# 1. Launch VPS & Point DNS
# dashboard.htmlin.my.id → VPS_IP

# 2. Clone & Setup
ssh ubuntu@<VPS_IP>
git clone https://github.com/afuzapratama/nexuslink-project.git
cd nexuslink-project/nexuslink-dashboard

# 3. Create ENV
cp .env.dashboard.example .env.production
nano .env.production
```

```bash
# Dashboard ENV content:
NEXUS_API_BASE=https://api.htmlin.my.id
NEXUS_API_KEY=SAME-KEY-AS-API-SERVER
NEXT_PUBLIC_APP_NAME=NexusLink Dashboard
NEXT_PUBLIC_API_BASE=https://api.htmlin.my.id
```

```bash
# 4. Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 5. Build & Run
npm install
npm run build
npm run start

# 6. Setup Nginx + SSL (same as API but port 3000)
# 7. Test: https://dashboard.htmlin.my.id
```

---

## **📋 VPS 3-22: Agent Configuration**

### **Server Info:**
- **Domains:** `go.htmlin.my.id`, `link.htmlin.my.id`, `s.htmlin.my.id`, etc.
- **Role:** Edge redirector
- **Port:** 9090
- **ENV:** Set via installer flags (NO .env file needed!)

### **One-Command Installation:**

```bash
# 1. Launch VPS & Point DNS
# go.htmlin.my.id → VPS_IP

# 2. Generate Node Token (from Dashboard)
# Go to: https://dashboard.htmlin.my.id/nodes
# Click "Add Node" → Copy token

# 3. ONE COMMAND INSTALL!
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=SAME-KEY-AS-API-SERVER \
  --token=NODE-TOKEN-FROM-DASHBOARD \
  --email=admin@htmlin.my.id

# That's it! 3 minutes per agent!
```

---

## **🔐 Security Checklist**

### **API Server:**
- ✅ Redis password set & `requirepass` configured
- ✅ UFW firewall enabled (only 22, 80, 443)
- ✅ SSL certificate installed
- ✅ IAM role for DynamoDB (no hardcoded keys)
- ✅ Strong API key (32+ chars)

### **Dashboard:**
- ✅ Same API key as API server
- ✅ SSL certificate installed
- ✅ No database access (uses API)

### **Agents:**
- ✅ Only opens port 80, 443
- ✅ No direct database access
- ✅ Uses node token authentication

---

## **📊 Deployment Order**

```
1. API Server (VPS 1)       → 30 minutes
   ├─ Install Redis
   ├─ Configure DynamoDB
   ├─ Setup API service
   └─ SSL certificate

2. Dashboard (VPS 2)        → 20 minutes
   ├─ Point to API
   ├─ Build Next.js
   └─ SSL certificate

3. Agents (VPS 3-22)        → 3 min × 20 = 60 minutes
   └─ One-command install!
```

**Total: ~2 hours for complete setup!** 🚀

---

## **🐛 Troubleshooting**

### **API Server Issues:**

**Redis connection failed:**
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli -a "YOUR_PASSWORD" ping

# Check logs
sudo journalctl -u redis-server -n 50
```

**DynamoDB permission denied:**
```bash
# Check IAM role attached to EC2
aws sts get-caller-identity

# Test DynamoDB access
aws dynamodb list-tables --region ap-southeast-1
```

**API won't start:**
```bash
# Check service logs
sudo journalctl -u nexuslink-api -n 50

# Test manually
cd /home/ubuntu/nexuslink-project/nexuslink
go run cmd/api/main.go
```

### **Dashboard Issues:**

**Can't connect to API:**
```bash
# Test API from dashboard server
curl -H "X-Nexus-Api-Key: YOUR_KEY" https://api.htmlin.my.id/health

# Check ENV
cat .env.production | grep NEXUS_API
```

### **Agent Issues:**

**DNS verification failed:**
```bash
# Check DNS propagation
dig +short go.htmlin.my.id

# Should return your VPS IP
# If not, wait 10 minutes and retry
```

**SSL certificate failed:**
```bash
# Check domain points to server
curl -I http://go.htmlin.my.id

# Manual certbot
sudo certbot --nginx -d go.htmlin.my.id
```

---

## **💡 Key Differences Between ENV Files**

| Variable | API Server | Dashboard | Agent |
|----------|------------|-----------|-------|
| `NEXUS_DYNAMO_ENDPOINT` | ✅ Required | ❌ No | ❌ No |
| `NEXUS_REDIS_ADDR` | ✅ Required | ❌ No | ❌ No |
| `NEXUS_API_KEY` | ✅ Required | ✅ Required | ✅ Flag |
| `NEXUS_API_BASE` | ❌ No | ✅ Required | ✅ Flag |
| `NEXUS_NODE_TOKEN` | ❌ No | ❌ No | ✅ Flag |

**Remember:**
- API server = Full config (DB, Redis, API)
- Dashboard = API connection only
- Agent = Installer flags (no .env file)

---

## **📞 Need Help?**

Check logs:
```bash
# API
sudo journalctl -u nexuslink-api -f

# Dashboard
pm2 logs nexuslink-dashboard

# Agent
sudo journalctl -u nexuslink-agent -f
```

Test connectivity:
```bash
# API health
curl https://api.htmlin.my.id/health

# Dashboard
curl https://dashboard.htmlin.my.id

# Agent
curl https://go.htmlin.my.id/health
```
