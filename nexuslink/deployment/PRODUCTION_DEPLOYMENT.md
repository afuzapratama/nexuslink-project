# 🚀 NexusLink Production Deployment Guide

**Complete Step-by-Step Guide for Deploying NexusLink to Production**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Deployment Options](#deployment-options)
4. [Post-Deployment](#post-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

**Minimum Specifications:**
- **CPU:** 2 vCPUs
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **OS:** Ubuntu 20.04 LTS or later
- **Network:** Public IP with open ports 80, 443

**Recommended Specifications:**
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Storage:** 50 GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Network:** Static IP with CDN

### Domain Names

You'll need 3 subdomains:
- **API:** `api.yourdomain.com`
- **Agent:** `short.yourdomain.com` (untuk redirects)
- **Dashboard:** `dashboard.yourdomain.com`

### AWS Account

- DynamoDB access in `ap-southeast-1` region
- IAM user with programmatic access
- (Optional) S3 bucket for backups

### Software Requirements

Will be installed automatically:
- Go 1.23+
- Nginx
- Redis 7+
- Certbot (Let's Encrypt)
- Docker & Docker Compose (optional)

---

## Infrastructure Setup

### Step 1: Provision Server

#### Option A: AWS EC2

```bash
# Launch t3.medium instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=NexusLink-API}]'
```

#### Option B: DigitalOcean

```bash
# Via doctl CLI
doctl compute droplet create nexuslink-api \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region sgp1 \
  --ssh-keys YOUR_SSH_KEY_ID
```

#### Option C: Any VPS Provider

- Vultr, Linode, Hetzner, etc.
- Choose Ubuntu 22.04 LTS
- At least 2 vCPU, 4 GB RAM

### Step 2: Initial Server Setup

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt-get update && apt-get upgrade -y

# Create swap (if RAM < 8GB)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Set timezone
timedatectl set-timezone Asia/Jakarta

# Install basic tools
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw
```

### Step 3: Configure DNS

Point your domains to server IP:

```
A    api.yourdomain.com        -> YOUR_SERVER_IP
A    short.yourdomain.com      -> YOUR_SERVER_IP
A    dashboard.yourdomain.com  -> YOUR_SERVER_IP
```

Verify with:
```bash
dig +short api.yourdomain.com
dig +short short.yourdomain.com
dig +short dashboard.yourdomain.com
```

---

## Deployment Options

### Option 1: Automated Deployment (Recommended)

#### 1.1 Clone Repository

```bash
cd /opt
git clone https://github.com/afuzapratama/nexuslink.git
cd nexuslink
```

#### 1.2 Run Deployment Script

```bash
# Deploy API + Agent
sudo bash deployment/scripts/deploy.sh all

# Or deploy separately
sudo bash deployment/scripts/deploy.sh api    # API only
sudo bash deployment/scripts/deploy.sh agent  # Agent only
```

#### 1.3 Configure Environment

```bash
# Edit .env file
sudo nano /opt/nexuslink/.env
```

Update these critical values:
```bash
# Strong API key (min 32 characters)
NEXUS_API_KEY=your-super-secret-key-here-min-32-chars

# AWS DynamoDB (leave endpoint empty for AWS)
NEXUS_DYNAMO_ENDPOINT=
NEXUS_AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Redis password
NEXUS_REDIS_PASSWORD=your-strong-redis-password

# Agent configuration
NEXUS_NODE_TOKEN=get-from-dashboard-after-api-starts
NEXUS_NODE_DOMAIN=short.yourdomain.com
NEXUS_NODE_PUBLIC_URL=https://short.yourdomain.com
```

#### 1.4 Start Services

```bash
# Start API
sudo systemctl start nexuslink-api
sudo systemctl status nexuslink-api

# Verify API is running
curl http://localhost:8080/health

# Get node token from dashboard (next step)
# Then update .env with NEXUS_NODE_TOKEN

# Start Agent
sudo systemctl start nexuslink-agent
sudo systemctl status nexuslink-agent
```

#### 1.5 Setup SSL Certificates

```bash
# For API
sudo bash /opt/nexuslink/deployment/scripts/setup-ssl.sh api.yourdomain.com api

# For Agent
sudo bash /opt/nexuslink/deployment/scripts/setup-ssl.sh short.yourdomain.com agent

# For Dashboard (after deploying dashboard)
sudo bash /opt/nexuslink/deployment/scripts/setup-ssl.sh dashboard.yourdomain.com dashboard
```

#### 1.6 Verify HTTPS

```bash
curl -I https://api.yourdomain.com/health
curl -I https://short.yourdomain.com/health
```

---

### Option 2: Docker Deployment

#### 2.1 Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2.2 Prepare Environment

```bash
cd /opt/nexuslink

# Copy production env template
cp .env.production.example .env.production

# Edit values
nano .env.production
```

#### 2.3 Build & Run

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

#### 2.4 Setup Nginx & SSL

```bash
# Install Nginx on host
sudo apt-get install nginx certbot python3-certbot-nginx

# Copy configs
sudo cp /opt/nexuslink/deployment/nginx/api.conf /etc/nginx/sites-available/
sudo cp /opt/nexuslink/deployment/nginx/agent.conf /etc/nginx/sites-available/

# Update domain names in configs
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/api.conf
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN/g' /etc/nginx/sites-available/agent.conf

# Enable sites
sudo ln -s /etc/nginx/sites-available/api.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/agent.conf /etc/nginx/sites-enabled/

# Test & reload
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificates
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d short.yourdomain.com
```

---

## Dashboard Deployment

The dashboard runs separately (Next.js application).

### Option 1: Deploy on Same Server

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone dashboard (if not already)
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

# Install PM2 for process management
sudo npm install -g pm2

# Start dashboard
pm2 start npm --name "nexuslink-dashboard" -- start
pm2 save
pm2 startup

# Setup Nginx reverse proxy (already included in deployment/nginx/dashboard.conf)
```

### Option 2: Deploy on Vercel (Recommended for Dashboard)

```bash
# Install Vercel CLI
npm i -g vercel

# From dashboard directory
cd /opt/nexuslink-dashboard

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
NEXUS_API_BASE=https://api.yourdomain.com
NEXUS_API_KEY=your-api-key
```

---

## Post-Deployment

### 1. Generate First Node Token

```bash
# From dashboard or API directly
curl -X POST https://api.yourdomain.com/admin/node-tokens \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: your-api-key" \
  -d '{
    "description": "Production Agent Node"
  }'

# Response will contain token
# Copy token and update .env on agent server
```

### 2. Register Agent Node

```bash
# Update agent .env
sudo nano /opt/nexuslink/.env

# Add token
NEXUS_NODE_TOKEN=your-token-from-step-1

# Restart agent
sudo systemctl restart nexuslink-agent

# Verify registration
curl https://api.yourdomain.com/nodes \
  -H "X-Nexus-Api-Key: your-api-key"
```

### 3. Create First Link

Via dashboard or API:

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

### 4. Test Redirect

```bash
# Should redirect to targetUrl
curl -L https://short.yourdomain.com/r/test
```

### 5. Setup Backups

```bash
# Test backup
bash /opt/nexuslink/deployment/scripts/backup-dynamodb.sh

# Setup daily cron
sudo crontab -e

# Add line:
0 3 * * * bash /opt/nexuslink/deployment/scripts/backup-dynamodb.sh >> /var/log/nexuslink/backup-cron.log 2>&1
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/health

# Agent health
curl https://short.yourdomain.com/health

# Check service status
sudo systemctl status nexuslink-api
sudo systemctl status nexuslink-agent
sudo systemctl status redis-server
sudo systemctl status nginx
```

### View Logs

```bash
# API logs
sudo journalctl -u nexuslink-api -f

# Agent logs
sudo journalctl -u nexuslink-agent -f

# Nginx access logs
sudo tail -f /var/log/nginx/nexuslink-api-access.log
sudo tail -f /var/log/nginx/nexuslink-agent-access.log

# Redis logs
sudo journalctl -u redis-server -f
```

### Resource Monitoring

```bash
# Install monitoring tools
sudo apt-get install -y htop iotop nethogs

# Check resources
htop           # CPU & RAM
df -h          # Disk usage
netstat -tulpn # Port usage
```

### Update Application

```bash
# Stop services
sudo systemctl stop nexuslink-api
sudo systemctl stop nexuslink-agent

# Pull latest code
cd /opt/nexuslink
git pull origin main

# Rebuild binaries
CGO_ENABLED=0 go build -o nexus-api ./cmd/api/main.go
CGO_ENABLED=0 go build -o nexus-agent ./cmd/agent/main.go

# Restart services
sudo systemctl start nexuslink-api
sudo systemctl start nexuslink-agent

# Verify
curl https://api.yourdomain.com/health
```

---

## Troubleshooting

### Issue: API Won't Start

**Check logs:**
```bash
sudo journalctl -u nexuslink-api -n 50
```

**Common causes:**
1. Port 8080 already in use
2. AWS credentials invalid
3. DynamoDB connection failed
4. Redis not running

**Solutions:**
```bash
# Check port
sudo lsof -i :8080

# Test AWS credentials
aws dynamodb list-tables --region ap-southeast-1

# Check Redis
redis-cli -a your-password ping

# Restart Redis
sudo systemctl restart redis-server
```

### Issue: SSL Certificate Failed

**Error:** "Failed to obtain certificate"

**Solutions:**
1. Verify DNS: `dig +short api.yourdomain.com`
2. Check firewall: `sudo ufw status`
3. Check port 80 is open: `sudo netstat -tulpn | grep :80`
4. Try manual: `sudo certbot certonly --standalone -d api.yourdomain.com`

### Issue: Redirects Not Working

**Check agent logs:**
```bash
sudo journalctl -u nexuslink-agent -f
```

**Common causes:**
1. Agent can't reach API
2. Node not registered
3. Link doesn't exist
4. Rate limit exceeded

**Solutions:**
```bash
# Test API connectivity from agent
curl http://localhost:8080/health

# Check node registration
curl https://api.yourdomain.com/nodes -H "X-Nexus-Api-Key: your-key"

# Test link resolution
curl "http://localhost:8080/links/resolve?alias=test&nodeId=your-node-id" \
  -H "X-Nexus-Api-Key: your-key"
```

### Issue: High Memory Usage

**Check memory:**
```bash
free -h
sudo ps aux --sort=-%mem | head -10
```

**Solutions:**
```bash
# Restart services
sudo systemctl restart nexuslink-api
sudo systemctl restart nexuslink-agent

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Issue: Database Connection Timeout

**Error:** "context deadline exceeded"

**Solutions:**
1. Check AWS credentials
2. Verify security group allows outbound to DynamoDB
3. Check IAM permissions
4. Try increasing timeout in code

```bash
# Test DynamoDB access
aws dynamodb list-tables --region ap-southeast-1

# Check IAM permissions
aws iam get-user
```

---

## Security Checklist

- [ ] Strong API key (min 32 random characters)
- [ ] Redis password set
- [ ] Firewall enabled (ufw)
- [ ] SSH key-based auth only
- [ ] SSL certificates installed
- [ ] DynamoDB IAM permissions restricted
- [ ] Regular backups configured
- [ ] Monitoring & alerts set up
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled
- [ ] Fail2ban installed (optional)

---

## Performance Tuning

### Nginx Optimization

```nginx
# In /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 4096;
keepalive_timeout 65;
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### Redis Optimization

```bash
# In /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save ""  # Disable RDB if only using for cache
```

### DynamoDB Optimization

- Use GSI for frequently queried patterns
- Enable auto-scaling for provisioned capacity
- Use batch operations when possible
- Implement caching layer (Redis)

---

## Cost Optimization

### Estimated Monthly Costs

**Small Scale (1K links, 10K clicks/day):**
- Server (DigitalOcean): $24
- DynamoDB: $5-10
- Data Transfer: $2-5
- **Total:** ~$35/month

**Medium Scale (10K links, 100K clicks/day):**
- Server (AWS t3.medium): $30
- DynamoDB: $20-40
- Redis: $15 (if using ElastiCache)
- Data Transfer: $10-20
- **Total:** ~$75-105/month

**Large Scale (100K links, 1M clicks/day):**
- Server (AWS t3.large): $60
- DynamoDB: $100-200
- Redis: $50
- CloudFront CDN: $50
- **Total:** ~$260-360/month

### Cost Reduction Tips

1. Use DynamoDB on-demand for unpredictable traffic
2. Switch to provisioned capacity for steady traffic
3. Enable TTL to auto-delete old click events
4. Use CloudFront for static assets
5. Compress logs and rotate regularly
6. Use spot instances for non-critical workloads

---

## Support & Resources

- **Documentation:** `/opt/nexuslink/README.md`
- **GitHub Issues:** https://github.com/afuzapratama/nexuslink/issues
- **AWS Support:** https://console.aws.amazon.com/support/
- **Community:** (Add Discord/Slack link if available)

---

**Deployment Complete! 🎉**

Your NexusLink instance is now running in production. Monitor logs regularly and set up alerts for critical issues.
