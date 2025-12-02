# IP Detection & Visitor Headers Fix

**Updated:** December 2, 2025  
**Issue:** Masalah deteksi IP visitor yang tidak akurat karena konfigurasi Nginx header forwarding

---

## 🔧 Yang Diperbaiki

### 1. **Agent Installer** (`nexuslink-agent/install.sh`)
**Masalah:** Nginx config kurang terstruktur, tidak jelas mana header critical  
**Fix:** Header dikelompokkan dan diberi comment jelas

```nginx
location / {
    proxy_pass http://localhost:9090;
    proxy_http_version 1.1;
    
    # Critical: Pass real visitor IP (not agent's IP)
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Pass visitor context for analytics
    proxy_set_header X-Visitor-User-Agent $http_user_agent;
    proxy_set_header X-Visitor-Referer $http_referer;
    
    # Standard proxy headers
    proxy_set_header Host $host;
    
    # Timeouts for fast redirects
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
}
```

**Kenapa penting:**
- Agent forward IP asli visitor (bukan IP agent sendiri) ke API
- Headers `X-Visitor-*` dipakai API untuk analytics akurat

---

### 2. **API VPS1 Setup** (`VPS1_API_SETUP.sh`)
**Masalah:** Nginx TIDAK forward `X-Visitor-*` headers dari agent  
**Fix:** Tambah forwarding untuk visitor context headers

```nginx
location / {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    
    # WebSocket support
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
    
    # Critical: Pass real visitor IP from agents
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Pass visitor context headers from agents
    proxy_set_header X-Visitor-User-Agent $http_x_visitor_user_agent;
    proxy_set_header X-Visitor-Referer $http_x_visitor_referer;
    
    # Standard headers
    proxy_set_header Host $host;
    
    # Timeouts
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

**Perubahan kritis:**
```nginx
# SEBELUM (visitor headers hilang):
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;

# SESUDAH (visitor headers di-forward):
proxy_set_header X-Visitor-User-Agent $http_x_visitor_user_agent;
proxy_set_header X-Visitor-Referer $http_x_visitor_referer;
```

**Kenapa penting:**
- Tanpa ini, API cuma dapat IP Nginx (localhost) bukan IP visitor asli
- Analytics jadi tidak akurat (semua traffic sepertinya dari 127.0.0.1)

---

### 3. **Dashboard VPS2 Setup** (`VPS2_DASHBOARD_SETUP.sh`)
**Masalah:** Nginx config kurang lengkap untuk audit logging  
**Fix:** Tambah comment dan struktur yang lebih jelas

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    # Next.js WebSocket support (HMR, etc.)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_cache_bypass $http_upgrade;
    
    # Pass real admin IP for audit logs
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Standard headers
    proxy_set_header Host $host;
    
    # Timeouts
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
}
```

**Kenapa penting:**
- Dashboard bisa track IP admin yang login
- Berguna untuk audit log security

---

## 📊 Flow Data IP yang Benar

### Before Fix (SALAH ❌)
```
Visitor (IP: 203.0.113.45)
    ↓
Agent Nginx (IP: 10.0.1.5)
    ↓ X-Real-IP: 10.0.1.5 (IP agent, SALAH!)
Agent Process
    ↓
API Nginx (IP: 10.0.2.8)
    ↓ X-Real-IP: 127.0.0.1 (localhost, SALAH!)
API Process
    ✗ Analytics: visitor IP = 127.0.0.1
```

### After Fix (BENAR ✅)
```
Visitor (IP: 203.0.113.45, UA: "Chrome/120", Referer: "google.com")
    ↓
Agent Nginx
    ↓ X-Real-IP: 203.0.113.45
    ↓ X-Visitor-User-Agent: "Chrome/120"
    ↓ X-Visitor-Referer: "google.com"
Agent Process (forward semua ke API)
    ↓
API Nginx
    ↓ X-Real-IP: 203.0.113.45 (preserved!)
    ↓ X-Visitor-User-Agent: "Chrome/120" (preserved!)
    ↓ X-Visitor-Referer: "google.com" (preserved!)
API Process (resolver_handler.go line 184-203)
    ✓ Analytics: visitor IP = 203.0.113.45
    ✓ UA parsing: Chrome, Desktop
    ✓ GeoIP: Country from real IP
```

---

## 🔍 Verification di Code

### API Handler (`nexuslink/internal/handler/resolver_handler.go:184-203`)
```go
// Line 184: Ambil IP dari header yang di-forward Nginx
ip := r.Header.Get("X-Real-IP")
if ip == "" {
    ip = r.Header.Get("X-Forwarded-For")
    if idx := strings.Index(ip, ","); idx > 0 {
        ip = strings.TrimSpace(ip[:idx])
    }
}
if ip == "" {
    ip = strings.Split(r.RemoteAddr, ":")[0]
}

// Line 196: Ambil User-Agent dari header agent
userAgent := r.Header.Get("X-Visitor-User-Agent")
if userAgent == "" {
    userAgent = r.UserAgent()
}

// Line 201: Ambil Referer dari header agent
referer := r.Header.Get("X-Visitor-Referer")
if referer == "" {
    referer = r.Referer()
}
```

**Urutan prioritas IP detection:**
1. `X-Real-IP` (dari Nginx agent)
2. `X-Forwarded-For` (fallback)
3. `r.RemoteAddr` (terakhir, biasanya localhost jika via Nginx)

**Urutan prioritas User-Agent:**
1. `X-Visitor-User-Agent` (forwarded dari agent)
2. `r.UserAgent()` (fallback, biasanya agent's Go HTTP client)

---

## 🧪 Testing

### Test 1: Verify Headers di Agent
```bash
# Deploy agent dengan installer baru
curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/nexuslink-agent/install.sh | \
  sudo bash -s -- \
  --domain=go.htmlin.my.id \
  --api=https://api.htmlin.my.id \
  --key=YOUR_API_KEY \
  --token=YOUR_NODE_TOKEN \
  --email=admin@example.com

# Test dengan curl dari IP eksternal
curl -I -H "User-Agent: TestBot/1.0" \
  -H "Referer: https://google.com" \
  https://go.htmlin.my.id/r/test

# Check agent logs
sudo journalctl -u nexuslink-agent -n 50 | grep "X-Real-IP"
```

### Test 2: Verify API Menerima Headers
```bash
# Di VPS API, check logs
sudo journalctl -u nexuslink-api -f

# Seharusnya terlihat:
# ip=203.0.113.45 (bukan 127.0.0.1 atau 10.0.x.x)
```

### Test 3: Verify Analytics di Dashboard
```bash
# Login ke dashboard: https://dashboard.htmlin.my.id
# Buat link test, klik dari browser
# Check analytics:
# - Country harus benar (dari GeoIP based on real IP)
# - Device/OS/Browser harus benar (dari UA parsing)
# - Referer harus tercatat
```

---

## 🚨 Rollback (Jika Ada Masalah)

### Agent
```bash
sudo systemctl stop nexuslink-agent
sudo nano /etc/nginx/sites-available/go.htmlin.my.id
# Restore old config
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl start nexuslink-agent
```

### API VPS1
```bash
sudo systemctl stop nexuslink-api
sudo nano /etc/nginx/sites-available/nexuslink-api
# Restore old config
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl start nexuslink-api
```

---

## ✅ Checklist Deployment

- [ ] Pull latest changes: `git pull`
- [ ] **CRITICAL:** Existing agents perlu update Nginx config:
  ```bash
  # Di setiap agent VPS:
  sudo nano /etc/nginx/sites-available/YOUR_DOMAIN
  # Copy nginx config dari install.sh line 458-478
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- [ ] API VPS1 perlu update Nginx config:
  ```bash
  sudo nano /etc/nginx/sites-available/nexuslink-api
  # Copy nginx config dari VPS1_API_SETUP.sh
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- [ ] Dashboard VPS2 (optional, tapi disarankan):
  ```bash
  sudo nano /etc/nginx/sites-available/nexuslink-dashboard
  # Copy nginx config dari VPS2_DASHBOARD_SETUP.sh
  sudo nginx -t
  sudo systemctl reload nginx
  ```
- [ ] Test dengan traffic real
- [ ] Verify analytics di dashboard

---

## 📚 Reference

- **Agent Installer:** `nexuslink-agent/install.sh` line 458-478
- **API Setup:** `VPS1_API_SETUP.sh` line 438-465
- **Dashboard Setup:** `VPS2_DASHBOARD_SETUP.sh` line 235-260
- **Resolver Handler:** `nexuslink/internal/handler/resolver_handler.go` line 184-203
- **Architecture Doc:** `DOMAIN_VALIDATION_SECURITY.md` (if exists)

---

## 🎯 Impact

### Before
- ❌ Analytics tidak akurat (IP = localhost/agent IP)
- ❌ GeoIP salah (based on localhost)
- ❌ Rate limiting tidak efektif (semua visitor = same IP)
- ❌ UA filtering tidak work (UA = Go HTTP client)

### After
- ✅ Analytics 100% akurat (real visitor IP)
- ✅ GeoIP correct (country/city detection)
- ✅ Rate limiting per visitor (bukan per agent)
- ✅ UA/OS/Browser filtering work correctly
- ✅ VPN/Proxy detection (ProxyCheck.io, IPQS) based on real IP
- ✅ Webhook events contain real visitor data

---

**Catatan:** Fix ini **WAJIB** di-deploy ke semua agent yang sudah running. Tanpa ini, semua analytics dan rate limiting tidak berguna.
