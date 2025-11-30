# 🔄 Update VPS - Pull Latest Code & Reload

Panduan untuk update VPS yang sudah running dengan perubahan code terbaru dari GitHub.

---

## 📋 Quick Commands

### VPS1 - API Server

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Navigate to project
cd /opt/nexuslink/nexuslink

# Pull latest code
git pull origin main

# Rebuild binary
go build -ldflags="-s -w" -o /opt/nexuslink/nexuslink/api cmd/api/main.go

# Restart service
systemctl restart nexuslink-api

# Check status
systemctl status nexuslink-api

# View logs (real-time)
journalctl -u nexuslink-api -f
```

**One-liner:**
```bash
cd /opt/nexuslink/nexuslink && \
git pull origin main && \
go build -ldflags="-s -w" -o api cmd/api/main.go && \
systemctl restart nexuslink-api && \
systemctl status nexuslink-api --no-pager
```

---

### VPS2 - Dashboard (aaPanel)

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Navigate to project
cd /www/wwwroot/nexuslink-project/nexuslink-dashboard

# Pull latest code
git pull origin main

# Install new dependencies (if any)
npm install

# Rebuild Next.js
npm run build

# Restart via aaPanel
# Option 1: Via aaPanel UI
# - Go to: Website → Node Project → Restart

# Option 2: Via PM2 command
pm2 restart nexuslink-dashboard

# Check status
pm2 list
pm2 logs nexuslink-dashboard --lines 50
```

**One-liner:**
```bash
cd /www/wwwroot/nexuslink-project/nexuslink-dashboard && \
git pull origin main && \
npm install && \
npm run build && \
pm2 restart nexuslink-dashboard && \
pm2 logs nexuslink-dashboard --lines 20
```

---

### VPS 3-22 - Agents

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Navigate to agent directory
cd /opt/nexuslink-agent

# Pull latest code (if installed from git)
# Note: Agent installer clones and builds, doesn't keep git repo
# So we need to rebuild from source

# Download latest code
cd /tmp
rm -rf nexuslink-build
git clone --depth 1 https://github.com/afuzapratama/nexuslink-project.git nexuslink-build
cd nexuslink-build/nexuslink

# Build new binary
go build -ldflags="-s -w" -o /opt/nexuslink-agent/agent cmd/agent/main.go

# Restart service
systemctl restart nexuslink-agent

# Check status
systemctl status nexuslink-agent

# View logs
journalctl -u nexuslink-agent -f

# Cleanup
cd /tmp && rm -rf nexuslink-build
```

**One-liner:**
```bash
cd /tmp && \
rm -rf nexuslink-build && \
git clone --depth 1 https://github.com/afuzapratama/nexuslink-project.git nexuslink-build && \
cd nexuslink-build/nexuslink && \
go build -ldflags="-s -w" -o /opt/nexuslink-agent/agent cmd/agent/main.go && \
systemctl restart nexuslink-agent && \
systemctl status nexuslink-agent --no-pager && \
journalctl -u nexuslink-agent -n 20 && \
cd /tmp && rm -rf nexuslink-build
```

---

## 🚀 Update Semua VPS Sekaligus (Batch)

### Update All Agents (VPS 3-22) Parallel

```bash
# Buat script update-agent.sh
cat > /tmp/update-agent.sh << 'EOF'
#!/bin/bash
cd /tmp && \
rm -rf nexuslink-build && \
git clone --depth 1 https://github.com/afuzapratama/nexuslink-project.git nexuslink-build && \
cd nexuslink-build/nexuslink && \
go build -ldflags="-s -w" -o /opt/nexuslink-agent/agent cmd/agent/main.go && \
systemctl restart nexuslink-agent && \
systemctl status nexuslink-agent --no-pager && \
cd /tmp && rm -rf nexuslink-build
EOF

chmod +x /tmp/update-agent.sh

# Update semua agent parallel
for i in {3..22}; do
  echo "Updating VPS $i..."
  ssh root@vps$i.htmlin.my.id "bash -s" < /tmp/update-agent.sh &
done

# Wait for all
wait

echo "✅ All agents updated!"
```

---

## 🔍 Verification Checklist

### After Update API (VPS1)

```bash
# 1. Check service running
systemctl is-active nexuslink-api
# Expected: active

# 2. Check health endpoint
curl -s http://localhost:8080/health
# Expected: OK - Nexus API is running

# 3. Check version/features working
curl -s http://localhost:8080/admin/nodes \
  -H "X-Nexus-Api-Key: YOUR_KEY" | head -c 200
# Expected: JSON node list

# 4. Check logs for errors
journalctl -u nexuslink-api -n 50 | grep -i error
# Expected: No critical errors
```

### After Update Dashboard (VPS2)

```bash
# 1. Check PM2 status
pm2 list | grep nexuslink-dashboard
# Expected: online status

# 2. Check website
curl -I https://dashboard.htmlin.my.id
# Expected: HTTP/2 200

# 3. Check logs
pm2 logs nexuslink-dashboard --lines 20 --nostream
# Expected: No errors, "ready started server on"

# 4. Browser test
# Open: https://dashboard.htmlin.my.id
# Expected: Dashboard loads, shows data
```

### After Update Agent (VPS 3-22)

```bash
# 1. Check service
systemctl is-active nexuslink-agent
# Expected: active

# 2. Check health
curl -s http://localhost:9090/health
# Expected: OK - Nexus Agent is running

# 3. Check registration
journalctl -u nexuslink-agent -n 50 | grep -E "Domain whitelist|nodeID"
# Expected: "Domain whitelist updated: [your-domain.com]"

# 4. Test redirect
curl -I https://go.htmlin.my.id/r/test
# Expected: HTTP/2 302 (or 404 if link doesn't exist)
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: Git Pull Conflict

**Error:**
```
error: Your local changes to the following files would be overwritten by merge:
  cmd/api/main.go
```

**Fix:**
```bash
# Backup local changes
cp cmd/api/main.go cmd/api/main.go.backup

# Discard local changes
git checkout -- .

# Pull again
git pull origin main

# Review differences
diff cmd/api/main.go.backup cmd/api/main.go
```

### Issue 2: Build Fails - Missing Dependencies

**Error:**
```
go: github.com/some/package: unknown revision
```

**Fix:**
```bash
# Download dependencies
go mod download

# Clean cache
go clean -modcache

# Retry build
go build -o api cmd/api/main.go
```

### Issue 3: Service Won't Start After Update

**Error:**
```
systemctl status nexuslink-api
● nexuslink-api.service - failed
```

**Debug:**
```bash
# Check logs
journalctl -u nexuslink-api -n 100 --no-pager

# Common causes:
# - ENV file missing/changed
# - Port already in use
# - Database connection failed

# Test binary manually
cd /opt/nexuslink/nexuslink
sudo -u nexus ./api
# See detailed error
```

**Fix:**
```bash
# Check ENV file intact
cat /opt/nexuslink/nexuslink/.env.production

# Check port
netstat -tlnp | grep 8080

# Restart dependencies
systemctl restart redis
docker-compose -f /opt/nexuslink/docker-compose.yml restart

# Retry
systemctl restart nexuslink-api
```

### Issue 4: Dashboard Build Fails

**Error:**
```
npm run build
Error: Cannot find module 'next'
```

**Fix:**
```bash
# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Issue 5: Agent Domain Whitelist Not Updating

**Symptoms:**
```
journalctl -u nexuslink-agent -f
# Shows: Domain whitelist updated: [old-domain.com]
# Expected: [new-domain.com]
```

**Fix:**
```bash
# 1. Check database
curl -s http://api.htmlin.my.id/admin/nodes/YOUR_NODE_ID \
  -H "X-Nexus-Api-Key: YOUR_KEY"
# Verify "domains" array has new domain

# 2. Force refresh (restart agent)
systemctl restart nexuslink-agent

# 3. Check logs
journalctl -u nexuslink-agent -n 20 | grep whitelist
# Should show updated list
```

---

## 📊 Zero-Downtime Update Strategy

### For Production (Recommended)

**API Server (VPS1):**
```bash
# 1. Pull code
cd /opt/nexuslink/nexuslink
git pull origin main

# 2. Build new binary with different name
go build -ldflags="-s -w" -o api.new cmd/api/main.go

# 3. Test new binary
sudo -u nexus ./api.new &
TEST_PID=$!
sleep 3
curl -s http://localhost:8081/health || kill $TEST_PID
kill $TEST_PID

# 4. Swap binaries
mv api api.old
mv api.new api

# 5. Restart service (downtime: ~1-2 seconds)
systemctl restart nexuslink-api

# 6. Verify
systemctl status nexuslink-api
curl -s http://localhost:8080/health

# 7. Cleanup
rm api.old
```

**Agents (VPS 3-22):**
```bash
# Update agents in rolling fashion (5 at a time)
# Group 1: VPS 3-7
for i in {3..7}; do
  ssh root@vps$i "cd /tmp && git clone --depth 1 ... && ... && systemctl restart nexuslink-agent" &
done
wait

# Wait 30 seconds, verify first batch
sleep 30

# Group 2: VPS 8-12
for i in {8..12}; do
  ssh root@vps$i "cd /tmp && git clone --depth 1 ... && ... && systemctl restart nexuslink-agent" &
done
wait

# Continue...
```

---

## 🔐 Security: Update ENV Variables

If update includes new ENV variables:

### VPS1 - API
```bash
# Edit ENV
nano /opt/nexuslink/nexuslink/.env.production

# Add new variables from .env.example
# Example:
NEXUS_NEW_FEATURE=enabled

# Restart
systemctl restart nexuslink-api
```

### VPS2 - Dashboard
```bash
# Edit ENV
nano /www/wwwroot/nexuslink-project/nexuslink-dashboard/.env.production

# Add new variables

# Rebuild (bakes ENV into bundle)
npm run build

# Restart
pm2 restart nexuslink-dashboard
```

### VPS 3-22 - Agents
```bash
# Edit ENV
nano /opt/nexuslink-agent/.env

# Add new variables

# Restart
systemctl restart nexuslink-agent
```

---

## 📝 Update Log Template

Keep track of updates:

```bash
# Create update log
cat >> /root/nexuslink-updates.log << EOF
=====================================
Date: $(date)
Component: API Server (VPS1)
Commit: $(cd /opt/nexuslink/nexuslink && git rev-parse HEAD)
Changes: Domain validation security feature
Status: ✅ Success
Downtime: ~2 seconds
Notes: All services running normally
=====================================
EOF
```

---

## 🆘 Rollback Procedure

If update causes issues:

### Rollback API (VPS1)
```bash
# 1. Check git log
cd /opt/nexuslink/nexuslink
git log --oneline -5

# 2. Rollback to previous commit
git reset --hard HEAD~1

# 3. Rebuild
go build -ldflags="-s -w" -o api cmd/api/main.go

# 4. Restart
systemctl restart nexuslink-api

# 5. Verify
systemctl status nexuslink-api
```

### Rollback Dashboard (VPS2)
```bash
cd /www/wwwroot/nexuslink-project/nexuslink-dashboard
git reset --hard HEAD~1
npm install
npm run build
pm2 restart nexuslink-dashboard
```

### Rollback Agent (VPS 3-22)
```bash
# Agents don't keep git repo, so need to rebuild from specific commit
cd /tmp
rm -rf nexuslink-build
git clone https://github.com/afuzapratama/nexuslink-project.git nexuslink-build
cd nexuslink-build
git checkout PREVIOUS_COMMIT_HASH
cd nexuslink
go build -ldflags="-s -w" -o /opt/nexuslink-agent/agent cmd/agent/main.go
systemctl restart nexuslink-agent
```

---

## 🎯 Best Practices

1. **Always test in staging first** (if available)
2. **Update during low-traffic hours** (e.g., 2-4 AM)
3. **Update API → Dashboard → Agents** (順序 penting)
4. **Monitor logs after each update**
5. **Keep backups of working binaries**
6. **Document changes in update log**
7. **Test critical features after update**
8. **Have rollback plan ready**

---

## 📞 Emergency Contact

If something goes wrong:

```bash
# Quick health check all services
curl -s http://api.htmlin.my.id/health
curl -I https://dashboard.htmlin.my.id
curl -s https://go.htmlin.my.id/health

# If all fail, check from VPS directly:
ssh root@api-vps "systemctl status nexuslink-api"
ssh root@dashboard-vps "pm2 status"
ssh root@agent-vps "systemctl status nexuslink-agent"
```

**Critical issue checklist:**
- [ ] Services running? (`systemctl status`)
- [ ] Ports open? (`netstat -tlnp | grep PORT`)
- [ ] Database accessible? (`redis-cli ping`, DynamoDB check)
- [ ] Disk space? (`df -h`)
- [ ] Logs? (`journalctl -u SERVICE -n 100`)

---

**Made for production reliability! 🚀**
