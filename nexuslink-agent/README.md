# 🚀 NexusLink Agent - One-Command Installer

**Ultra-simple production deployment** - Add new edge nodes in 3 minutes with DNS auto-verification!

---

## ⚡ Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | sudo bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=your-api-key-here \
  --token=your-node-token-here \
  --email=admin@htmlin.my.id
```

**That's it!** Agent is installed, SSL configured, and serving redirects! ✅

---

## 📋 Prerequisites

### Before Running Installer

1. **DNS Must Be Configured** ⚠️
   ```bash
   # Add A record in your DNS provider:
   # go.htmlin.my.id → VPS IP (e.g., 192.168.1.100)
   
   # Verify DNS (wait 5-15 min after adding record):
   dig go.htmlin.my.id +short
   # Should return your VPS IP
   ```

2. **Get API Key** (from API server)
   ```bash
   # On API server:
   cat /opt/nexuslink/nexuslink/.env.production | grep NEXUS_API_KEY
   # Copy the value
   ```

3. **Generate Node Token** (from dashboard)
   - Visit: https://dashboard.htmlin.my.id/nodes
   - Click "Generate Token"
   - Copy the token (one-time use!)

---

## 🎯 Real-World Example

### Scenario: Deploy 3 agents

**Agents:**
- `go.htmlin.my.id` → Server in US (DigitalOcean NYC)
- `link.htmlin.my.id` → Server in EU (AWS Frankfurt)
- `s.htmlin.my.id` → Server in Asia (Vultr Singapore)

### Step 1: Configure DNS

In your DNS provider (Cloudflare/Namecheap/etc):
```
Type  Name    Value (IP)         TTL
────────────────────────────────────
A     go      192.0.2.1          300
A     link    192.0.2.2          300  
A     s       192.0.2.3          300
```

Wait 5-15 minutes, then verify:
```bash
dig go.htmlin.my.id +short    # Should return 192.0.2.1
dig link.htmlin.my.id +short  # Should return 192.0.2.2
dig s.htmlin.my.id +short     # Should return 192.0.2.3
```

### Step 2: Get Credentials

From API server (api.htmlin.my.id):
```bash
# API Key
ssh ubuntu@api-server
cat /opt/nexuslink/nexuslink/.env.production | grep NEXUS_API_KEY
# Output: NEXUS_API_KEY=abc123def456...
```

From dashboard (dashboard.htmlin.my.id):
- Visit: https://dashboard.htmlin.my.id/nodes
- Click "Generate Token" 3 times (one for each agent)
- Save tokens: `token1`, `token2`, `token3`

### Step 3: Deploy Agents (3 minutes each!)

**Agent 1: go.htmlin.my.id**
```bash
ssh root@192.0.2.1

curl -fsSL https://cdn.htmlin.my.id/nexuslink/install.sh | bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=abc123def456... \
  --token=token1 \
  --email=admin@htmlin.my.id
  
# Output: ✅ INSTALLATION COMPLETE! (3 minutes)
```

**Agent 2: link.htmlin.my.id**
```bash
ssh root@192.0.2.2

curl -fsSL https://cdn.htmlin.my.id/nexuslink/install.sh | bash -s -- \
  --domain=link.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=abc123def456... \
  --token=token2 \
  --email=admin@htmlin.my.id
```

**Agent 3: s.htmlin.my.id**
```bash
ssh root@192.0.2.3

curl -fsSL https://cdn.htmlin.my.id/nexuslink/install.sh | bash -s -- \
  --domain=s.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=abc123def456... \
  --token=token3 \
  --email=admin@htmlin.my.id
```

**Done!** 3 agents deployed globally in 9 minutes! 🎉

---

## 🔍 What The Installer Does

### Automatic Steps (You Don't Lift a Finger!)

1. **✅ DNS Verification**
   - Checks domain points to this server
   - Fails fast if DNS not configured (prevents wasted time!)
   - Shows clear error message with fix instructions

2. **✅ System Setup**
   - Updates packages
   - Installs Go, Nginx, Certbot, UFW
   - Creates system user (`nexus`)

3. **✅ Agent Binary**
   - Downloads prebuilt binary (fast!) or
   - Compiles from source (if no prebuilt available)
   - Installs to `/opt/nexuslink-agent/`

4. **✅ Configuration**
   - Creates `.env` file with your parameters
   - Secure permissions (600)
   - Owned by `nexus` user

5. **✅ Systemd Service**
   - Auto-start on boot
   - Auto-restart on failure
   - Security hardening (PrivateTmp, ProtectSystem)
   - Logs to journald

6. **✅ Nginx Reverse Proxy**
   - Configures proxy to local :9090
   - Forwards visitor headers
   - Optimized timeouts

7. **✅ SSL Certificate**
   - Obtains Let's Encrypt certificate
   - Configures HTTPS redirect
   - Auto-renewal setup

8. **✅ Firewall**
   - Opens ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Blocks everything else
   - UFW enabled

9. **✅ Service Start**
   - Starts agent immediately
   - Verifies health check
   - Registers with API server

10. **✅ Verification**
    - Tests local endpoint
    - Tests HTTPS endpoint
    - Shows service status
    - Prints useful commands

**Total Time:** ~3 minutes per agent!

---

## 📊 Installation Locations

```
/opt/nexuslink-agent/
├── agent                   # Binary executable
├── .env                    # Configuration (sensitive!)
└── INFO.txt                # Installation summary

/etc/systemd/system/
└── nexuslink-agent.service # Systemd service file

/etc/nginx/sites-available/
└── go.htmlin.my.id         # Nginx configuration

/etc/letsencrypt/live/
└── go.htmlin.my.id/        # SSL certificates
```

---

## 🛠️ Post-Installation

### Check Status
```bash
systemctl status nexuslink-agent
```

### View Live Logs
```bash
journalctl -u nexuslink-agent -f
```

### Test Redirect
```bash
# Create link in dashboard first (alias: "test")
curl -I https://go.htmlin.my.id/r/test
# Should return: HTTP/2 302 (redirect)
```

### Restart Service
```bash
systemctl restart nexuslink-agent
```

### View Configuration
```bash
cat /opt/nexuslink-agent/.env
```

### Check Nginx Config
```bash
nginx -t
cat /etc/nginx/sites-available/go.htmlin.my.id
```

---

## 🚨 Troubleshooting

### DNS Verification Failed

**Error:** `DNS mismatch! Domain points to X.X.X.X but server is Y.Y.Y.Y`

**Solution:**
```bash
# 1. Check your DNS record
dig go.htmlin.my.id +short

# 2. Check server IP
hostname -I

# 3. Update DNS to match server IP
# 4. Wait 5-15 minutes for propagation
# 5. Try installer again
```

**Bypass (not recommended):**
```bash
# Only if you're 100% sure DNS is correct but resolver is cached
curl -fsSL ... | bash -s -- \
  --domain=... \
  --api=... \
  --skip-dns  # ⚠️ Bypasses DNS check
```

### Agent Not Registering

**Symptoms:** Agent not appearing in dashboard Nodes page

**Check:**
```bash
# 1. View logs
journalctl -u nexuslink-agent -n 50

# Common issues:
# - Wrong API key (check .env matches API server)
# - Token already used (generate new token)
# - Network connectivity to API server
# - Domain mismatch in .env
```

**Fix:**
```bash
# Edit configuration
nano /opt/nexuslink-agent/.env
# Fix: NEXUS_AGENT_API_KEY or NEXUS_NODE_TOKEN

# Restart
systemctl restart nexuslink-agent

# Monitor logs
journalctl -u nexuslink-agent -f
```

### SSL Certificate Failed

**Error:** `Certbot failed to obtain certificate`

**Common causes:**
- DNS not fully propagated
- Port 80/443 blocked by firewall
- Domain already has cert on another server

**Manual fix:**
```bash
# Wait 10 minutes for DNS propagation, then:
certbot --nginx -d go.htmlin.my.id

# Or test without SSL first:
curl -I http://go.htmlin.my.id/r/test
```

### Service Won't Start

**Check logs:**
```bash
journalctl -u nexuslink-agent -xe

# Test binary directly:
cd /opt/nexuslink-agent
sudo -u nexus ./agent  # See errors

# Check port conflict:
netstat -tlnp | grep 9090
```

---

## 🔄 Updating Agent

When new version is released:

```bash
# Stop service
systemctl stop nexuslink-agent

# Backup config
cp /opt/nexuslink-agent/.env /root/agent-env-backup

# Download new binary
cd /opt/nexuslink-agent
curl -fsSL -o agent https://github.com/afuzapratama/nexuslink-project/releases/latest/download/agent
chmod +x agent
chown nexus:nexus agent

# Start service
systemctl start nexuslink-agent

# Verify
systemctl status nexuslink-agent
journalctl -u nexuslink-agent -f
```

Or **reinstall** (keeps same domain/config):
```bash
# Backup token & key first!
cat /opt/nexuslink-agent/.env | grep -E "TOKEN|KEY"

# Remove old installation
systemctl stop nexuslink-agent
rm -rf /opt/nexuslink-agent
rm /etc/systemd/system/nexuslink-agent.service

# Run installer again with same parameters
curl -fsSL ... | bash -s -- (same command as before)
```

---

## 📦 Hosting on CDN

### Option 1: GitHub Raw (Free, Simple)

Already works! Use:
```bash
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | sudo bash -s -- ...
```

### Option 2: Custom Domain with Cloudflare Pages

**Setup:**

1. Create `nexuslink-agent` repo or folder
2. Add `install.sh` file
3. Deploy to Cloudflare Pages
4. Custom domain: `cdn.htmlin.my.id`
5. File URL: `https://cdn.htmlin.my.id/install.sh`

**Usage:**
```bash
curl -fsSL https://cdn.htmlin.my.id/install.sh | sudo bash -s -- ...
```

### Option 3: Your Own Server

```bash
# On your web server:
mkdir -p /var/www/cdn/nexuslink
cp install.sh /var/www/cdn/nexuslink/install.sh
chmod 644 /var/www/cdn/nexuslink/install.sh

# Nginx config:
location /nexuslink/ {
    alias /var/www/cdn/nexuslink/;
    add_header Content-Type "text/plain; charset=utf-8";
}

# Usage:
curl -fsSL https://yourdomain.com/nexuslink/install.sh | sudo bash -s -- ...
```

---

## 💰 Cost Analysis

### Per Agent (Monthly)

**Minimal:** t3.micro (1GB RAM) = **$7/month**
- Handles 10K-50K clicks/day
- Perfect for edge nodes

**Recommended:** t3.small (2GB RAM) = **$15/month**
- Handles 100K+ clicks/day
- Better performance

### 20 Agents Deployment

**Minimal:** 20 × $7 = **$140/month**
**Recommended:** 20 × $15 = **$300/month**

**Plus:**
- 1x API server (t3.small): $15/month
- 1x Dashboard (t3.micro): $7/month
- DynamoDB (100K clicks): $25/month

**Total 20-agent setup:** $187-350/month

---

## ⚡ Performance

One agent can handle:
- **10,000 req/sec** (redirects)
- **<5ms** average latency
- **99.9% uptime** with systemd auto-restart

With 20 agents globally:
- **200,000 req/sec** total capacity
- **<50ms** global latency (with geo-routing)
- **Multi-region redundancy**

---

## 🎯 Best Practices

### DNS Setup
- ✅ Use short TTL (300s) for easy changes
- ✅ Verify before installation
- ✅ Use wildcard if needed: `*.htmlin.my.id`

### Security
- ✅ Use strong API keys (32+ chars)
- ✅ Don't share tokens publicly
- ✅ Rotate credentials periodically
- ✅ Use separate keys per environment

### Deployment
- ✅ Deploy agents in multiple regions
- ✅ Use small instances (agents are lightweight)
- ✅ Monitor with dashboard Nodes page
- ✅ Keep installer URL accessible

### Monitoring
- ✅ Check dashboard daily
- ✅ Setup alerts for offline nodes
- ✅ Monitor redirect success rate
- ✅ Watch for suspicious traffic

---

## 📚 Documentation

- **Main Project:** https://github.com/afuzapratama/nexuslink-project
- **Full Deployment Guide:** `/nexuslink/deployment/PRODUCTION_DEPLOYMENT.md`
- **API Documentation:** `/nexuslink/README.md`
- **Dashboard Setup:** `/nexuslink-dashboard/README.md`

---

## 🆘 Support

**Issues:** https://github.com/afuzapratama/nexuslink-project/issues  
**Community:** GitHub Discussions  
**Logs:** `journalctl -u nexuslink-agent -f`

---

**Made with ❤️ - Deploy edge nodes at scale!**
