# 🚀 NexusLink Production Quick Start

**Get your NexusLink instance running in production in under 30 minutes!**

---

## Prerequisites Checklist

- [ ] Ubuntu 22.04 LTS server (2+ vCPU, 4+ GB RAM)
- [ ] Root/sudo access
- [ ] 3 domain names pointing to your server IP:
  - `api.yourdomain.com`
  - `short.yourdomain.com`
  - `dashboard.yourdomain.com`
- [ ] AWS account with DynamoDB access
- [ ] AWS IAM credentials (Access Key + Secret)

---

## 🏁 Quick Deploy (5 Commands)

### 1. Initial Server Setup (5 mins)

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Set timezone
timedatectl set-timezone Asia/Jakarta
```

### 2. Clone Repository (1 min)

```bash
# Clone to /opt
cd /opt
git clone https://github.com/afuzapratama/nexuslink.git
cd nexuslink
```

### 3. Run Automated Deployment (10 mins)

```bash
# Deploy API + Agent
sudo bash deployment/scripts/deploy.sh all

# This will:
# - Install Go, Redis, Nginx, etc.
# - Build binaries
# - Create systemd services
# - Configure firewall
# - Start services
```

### 4. Configure Environment (5 mins)

```bash
# Edit .env file
sudo nano /opt/nexuslink/.env
```

**Update these critical values:**

```bash
# Strong API key (min 32 characters)
NEXUS_API_KEY=your-super-secret-random-key-min-32-chars

# AWS DynamoDB (remove endpoint for AWS, keep empty)
NEXUS_DYNAMO_ENDPOINT=
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Redis password
NEXUS_REDIS_PASSWORD=your-strong-redis-password

# Agent config (update after getting token from dashboard)
NEXUS_NODE_DOMAIN=short.yourdomain.com
NEXUS_NODE_PUBLIC_URL=https://short.yourdomain.com
```

**Save and restart:**

```bash
sudo systemctl restart nexuslink-api
```

### 5. Setup SSL Certificates (5 mins)

```bash
# For API
sudo bash deployment/scripts/setup-ssl.sh api.yourdomain.com api

# For Agent
sudo bash deployment/scripts/setup-ssl.sh short.yourdomain.com agent
```

---

## ✅ Verification

### Check Services

```bash
# Check API
curl https://api.yourdomain.com/health
# Expected: "OK - Nexus API is running"

# Check Agent
curl https://short.yourdomain.com/health
# Expected: "OK - Nexus Agent is running"

# Check service status
sudo systemctl status nexuslink-api
sudo systemctl status nexuslink-agent
```

### Register Agent Node

```bash
# 1. Create node token from dashboard or via API
curl -X POST https://api.yourdomain.com/admin/node-tokens \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: your-api-key" \
  -d '{"description": "Production Node"}'

# 2. Copy the token from response

# 3. Update .env with token
sudo nano /opt/nexuslink/.env
# Add: NEXUS_NODE_TOKEN=your-token-here

# 4. Restart agent
sudo systemctl restart nexuslink-agent
```

### Create Test Link

```bash
curl -X POST https://api.yourdomain.com/links \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: your-api-key" \
  -d '{
    "alias": "test",
    "targetUrl": "https://google.com",
    "isActive": true
  }'
```

### Test Redirect

```bash
# Should redirect to google.com
curl -L https://short.yourdomain.com/r/test
```

---

## 🎨 Deploy Dashboard

### Option 1: Same Server

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone dashboard
cd /opt
git clone https://github.com/afuzapratama/nexuslink-dashboard.git
cd nexuslink-dashboard

# Install dependencies
npm install

# Create production env
cat > .env.production << EOF
NEXUS_API_BASE=https://api.yourdomain.com
NEXUS_API_KEY=your-api-key-same-as-backend
NEXT_PUBLIC_APP_NAME=NexusLink Dashboard
EOF

# Build
npm run build

# Install PM2
sudo npm install -g pm2

# Start
pm2 start npm --name "nexuslink-dashboard" -- start
pm2 save
pm2 startup

# Setup SSL for dashboard
sudo bash /opt/nexuslink/deployment/scripts/setup-ssl.sh dashboard.yourdomain.com dashboard
```

**Access dashboard:** `https://dashboard.yourdomain.com`

### Option 2: Vercel (Recommended)

```bash
npm i -g vercel
cd /opt/nexuslink-dashboard
vercel login
vercel --prod

# Set environment variables in Vercel dashboard:
# NEXUS_API_BASE=https://api.yourdomain.com
# NEXUS_API_KEY=your-api-key
```

---

## 📊 Setup Monitoring (Optional)

### Daily Backups

```bash
# Test backup
bash /opt/nexuslink/deployment/scripts/backup-dynamodb.sh

# Add to cron
sudo crontab -e

# Add line (runs at 3 AM daily):
0 3 * * * bash /opt/nexuslink/deployment/scripts/backup-dynamodb.sh >> /var/log/nexuslink/backup-cron.log 2>&1
```

### Prometheus Metrics

```bash
# Metrics endpoint available at:
curl https://api.yourdomain.com/metrics
```

---

## 🛠️ Useful Commands

### Service Management

```bash
# Restart services
sudo systemctl restart nexuslink-api
sudo systemctl restart nexuslink-agent

# View logs
sudo journalctl -u nexuslink-api -f
sudo journalctl -u nexuslink-agent -f

# Check status
sudo systemctl status nexuslink-api
```

### Using Makefile

```bash
cd /opt/nexuslink

# Build binaries
make build-all

# Check status
make status

# View logs
make logs-api
make logs-agent

# Health checks
make health-check

# Backup
make backup
```

---

## 🔒 Security Checklist

- [ ] Strong API key set (min 32 chars)
- [ ] Redis password configured
- [ ] Firewall enabled (ufw)
- [ ] SSL certificates installed
- [ ] SSH key-based auth (disable password)
- [ ] Daily backups configured
- [ ] AWS IAM permissions restricted to DynamoDB only

---

## 💰 Estimated Costs

**Small Scale (10K clicks/day):**
- Server (DigitalOcean/AWS): $24-30/month
- DynamoDB: $5-10/month
- **Total:** ~$30-40/month

---

## 🆘 Troubleshooting

### API won't start

```bash
# Check logs
sudo journalctl -u nexuslink-api -n 50

# Test AWS connection
aws dynamodb list-tables --region ap-southeast-1

# Restart Redis
sudo systemctl restart redis-server
```

### SSL certificate failed

```bash
# Verify DNS
dig +short api.yourdomain.com

# Check firewall
sudo ufw status

# Try manual
sudo certbot certonly --standalone -d api.yourdomain.com
```

### Redirects not working

```bash
# Check agent logs
sudo journalctl -u nexuslink-agent -f

# Test API connectivity
curl http://localhost:8080/health

# Verify node registration
curl https://api.yourdomain.com/nodes -H "X-Nexus-Api-Key: your-key"
```

---

## 📚 Next Steps

1. **Read full documentation:** `deployment/PRODUCTION_DEPLOYMENT.md`
2. **Setup monitoring:** Configure Prometheus & Grafana
3. **Configure webhooks:** For real-time notifications
4. **Add more agents:** Deploy to multiple regions
5. **Setup CDN:** CloudFlare for better performance

---

## 🎉 Success!

Your NexusLink instance is now running in production!

- **API:** https://api.yourdomain.com
- **Agent:** https://short.yourdomain.com
- **Dashboard:** https://dashboard.yourdomain.com

**Monitor your instance regularly and enjoy! 🚀**
