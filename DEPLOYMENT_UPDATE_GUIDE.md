# NexusLink - Production Update Guide

Panduan lengkap untuk update code di production setelah push ke GitHub.

---

## ⚠️ Important: Database Persistence

NexusLink menggunakan **AWS DynamoDB** untuk persistent storage. Setelah restart:
- ✅ **Data AMAN** - Semua links, nodes, settings tetap ada
- ✅ **Credentials tetap** - Admin username/password tidak hilang
- ❌ **Session hilang** - User harus login ulang (normal behavior)

---

## 🔄 Update Workflow

### VPS API Server (108.137.82.75)

```bash
# 1. SSH ke VPS API
ssh -i ~/.ssh/vps-api-key.pem ubuntu@108.137.82.75

# 2. Navigate ke project directory
cd ~/nexuslink-project

# 3. Pull latest code
git pull origin main

# 4. Rebuild API binary
cd nexuslink
go build -o nexus-api ./cmd/api/main.go

# 5. Copy binary ke systemd location
sudo cp nexus-api /usr/local/bin/nexuslink-api

# 6. Restart service (WAJIB!)
sudo systemctl restart nexuslink-api

# 7. Check logs untuk verifikasi
sudo journalctl -u nexuslink-api -n 50 --no-pager

# 8. Verify DynamoDB connection (harus ada log ini):
# ✅ config: loaded .env.production
# DynamoDB client init: endpoint= region=ap-southeast-3
# Using AWS DynamoDB (production)
# DynamoDB tables ready

# 9. Test API endpoint
curl https://api.htmlin.my.id/health
# Expected: "OK - Nexus API is running"
```

---

### VPS Dashboard Server (80.209.241.84)

```bash
# 1. SSH ke VPS Dashboard
ssh root@80.209.241.84

# 2. Navigate ke project directory
cd /www/wwwroot/nexuslink-project

# 3. Pull latest code
git pull origin main

# 4. Navigate ke dashboard directory
cd nexuslink-dashboard

# 5. Install new dependencies (if any)
npm install

# 6. Clear Next.js cache (PENTING!)
rm -rf .next/cache

# 7. Rebuild dashboard
npm run build

# 8. Restart via aaPanel
# - Go to: Website → nexuslink-project → Node Project → Restart
# OR restart via PM2:
pm2 restart all

# 9. Verify
# - Open: https://dashboard.htmlin.my.id
# - Check browser console for errors
# - Hard refresh: Ctrl+Shift+R
```

---

## 🔍 Troubleshooting

### Problem: Admin credentials hilang setelah restart

**Root Cause:** API tidak load `.env.production` atau connect ke DynamoDB yang salah.

**Solution:**
```bash
# 1. Check systemd service status
sudo systemctl status nexuslink-api

# 2. Check recent logs
sudo journalctl -u nexuslink-api -n 100

# 3. Look for these logs:
# ✅ config: loaded .env.production
# DynamoDB client init: endpoint= region=ap-southeast-3
# Using AWS DynamoDB (production)

# 4. If missing, restart API
sudo systemctl restart nexuslink-api

# 5. Set credentials via API
curl -X PUT "https://api.htmlin.my.id/admin/settings" \
  -H "X-Nexus-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "global-settings",
    "adminUsername": "admin",
    "adminPassword": "$2a$10$JyQVcqMDYmQNDVY5C9Pmy.XcvV06aYVVauolCtNQd90ok05sKCD3u"
  }'
```

**Credentials Hash (bcrypt):**
- Username: `admin`
- Password: `admin`
- Hash: `$2a$10$JyQVcqMDYmQNDVY5C9Pmy.XcvV06aYVVauolCtNQd90ok05sKCD3u`

---

### Problem: Dashboard tidak update setelah build

**Root Cause:** Next.js aggressive caching atau browser cache.

**Solution:**
```bash
# Server-side
rm -rf /www/wwwroot/nexuslink-project/nexuslink-dashboard/.next/cache
npm run build
pm2 restart all

# Client-side
# - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
# - Clear browser cache
# - Try incognito mode
# - Purge CDN cache (if using Cloudflare)
```

---

### Problem: API shows old endpoints (404 errors)

**Root Cause:** Systemd running old binary, not the newly built one.

**Solution:**
```bash
# 1. Check binary timestamp
ls -lah /usr/local/bin/nexuslink-api

# 2. Check code timestamp
ls -lah ~/nexuslink-project/nexuslink/nexus-api

# 3. If timestamps don't match, copy and restart
sudo cp ~/nexuslink-project/nexuslink/nexus-api /usr/local/bin/nexuslink-api
sudo systemctl restart nexuslink-api

# 4. Verify with strings command
strings /usr/local/bin/nexuslink-api | grep -i "new-endpoint-name"
```

---

### Problem: PORT environment variable tidak terbaca

**Root Cause:** aaPanel tidak otomatis load `.env` files.

**Solution:**
```bash
# Option 1: Set via aaPanel UI
# Website → Node Project → Environment Variables → Add PORT=3005

# Option 2: Hardcode in package.json
"start": "next start -p 3005"

# Option 3: Export before start
export PORT=3005 && npm start
```

---

## 📋 Pre-Deployment Checklist

Sebelum update production, pastikan:

- [ ] Code sudah di-test di local
- [ ] Semua tests pass
- [ ] `.env.production` sudah diupdate (jika ada env baru)
- [ ] Database migration sudah dijalankan (jika ada)
- [ ] Backup database (jika perubahan critical)
- [ ] Dokumentasi API diupdate (jika ada endpoint baru)

---

## 🚀 Quick Commands

### Check Service Status
```bash
# API
sudo systemctl status nexuslink-api

# Agent (if installed)
sudo systemctl status nexuslink-agent

# Dashboard (aaPanel/PM2)
pm2 status
```

### View Logs
```bash
# API logs (real-time)
sudo journalctl -u nexuslink-api -f

# API logs (last 100 lines)
sudo journalctl -u nexuslink-api -n 100 --no-pager

# Dashboard logs
pm2 logs
```

### Test Endpoints
```bash
# API health
curl https://api.htmlin.my.id/health

# API settings
curl https://api.htmlin.my.id/admin/settings \
  -H "X-Nexus-Api-Key: YOUR_KEY"

# Dashboard health
curl https://dashboard.htmlin.my.id/api/nexus/health
```

---

## 🔒 Security Notes

1. **NEVER commit `.env.production`** ke git
2. API Key minimal **32 characters** random string
3. Admin password **HARUS bcrypt hash**, bukan plain text
4. Redis password **wajib** untuk production
5. AWS credentials via **IAM role** lebih aman daripada hardcode

---

## 📞 Emergency Rollback

Jika update production error critical:

```bash
# 1. Check git log
git log --oneline -5

# 2. Rollback to previous commit
git reset --hard <previous-commit-hash>

# 3. Rebuild & restart
cd nexuslink && go build -o nexus-api ./cmd/api/main.go
sudo cp nexus-api /usr/local/bin/nexuslink-api
sudo systemctl restart nexuslink-api

# 4. Dashboard rollback
cd nexuslink-dashboard
npm run build
pm2 restart all
```

---

## 📝 Post-Update Verification

Setelah update, verifikasi:

1. ✅ API health endpoint response 200
2. ✅ Login dashboard berhasil
3. ✅ Create link berhasil
4. ✅ Click tracking berhasil
5. ✅ Node registration berhasil
6. ✅ Webhook delivery berhasil
7. ✅ Rate limiting berfungsi

Test command:
```bash
# Full system test
bash /home/natama/Projects/tested-scripts/test-full-system.sh
```

---

**Last Updated:** December 3, 2025  
**Author:** NexusLink Team
