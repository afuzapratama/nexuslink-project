# 🚀 Quick Start: Test Webhook NexusLink (5 Menit)

## ✅ Yang Sudah Jalan

Saya sudah jalankan **webhook test receiver** untuk kamu:

```
✅ Webhook Receiver: http://localhost:3001/webhook
🔐 Secret: test_secret_123
📍 PID: 501092
```

---

## 📝 Langkah-langkah Test (Copy-Paste Ready)

### STEP 1: Buka Dashboard Webhooks

```bash
# Buka di browser
http://localhost:3000/webhooks
```

Atau klik link: **http://localhost:3000/webhooks**

---

### STEP 2: Create Webhook di Dashboard

Isi form dengan nilai ini:

| Field | Value |
|-------|-------|
| **URL** | `http://localhost:3001/webhook` |
| **Events** | ✅ Centang "Click Created" |
| **Secret** | `test_secret_123` |
| **Active** | ✅ Yes |

Lalu klik tombol **"Create Webhook"** (warna hijau).

---

### STEP 3: Test Manual dari Dashboard

Setelah webhook dibuat, lihat di tabel bawah:

1. Klik tombol **"Test"** (icon 🧪) di baris webhook yang baru dibuat
2. Lihat terminal webhook receiver (jalankan command ini):

```bash
tail -f /tmp/webhook-receiver.log
```

Atau cek output di terminal langsung:

```bash
# Cek apakah webhook test diterima
ps aux | grep webhook-test-receiver
```

Kamu akan lihat output seperti ini:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 WEBHOOK RECEIVED: 2025-11-30T10:30:45Z

🔐 Signature: abc123...
✅ Valid: ✅ YES

📋 Event Type: click.created
⏰ Timestamp: 2025-11-30T10:30:45Z

📦 Data:
{
  "linkId": "test-link",
  "alias": "test",
  "targetUrl": "https://example.com",
  "ipAddress": "127.0.0.1",
  ...
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### STEP 4: Test Real Event (Create Link + Click)

**4A. Create Link:**

```bash
# Copy-paste command ini ke terminal
curl -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "webhook-test",
    "targetUrl": "https://google.com"
  }'
```

**Expected Output:**
```json
{
  "id": "link_...",
  "alias": "webhook-test",
  "targetUrl": "https://google.com",
  ...
}
```

**4B. Simulasi Click:**

```bash
# Simulasi user klik link
curl -L \
  -H "X-Real-IP: 203.0.113.42" \
  -H "X-Visitor-User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" \
  -H "X-Visitor-Referer: https://twitter.com/promo" \
  http://localhost:9090/r/webhook-test
```

**4C. Cek Webhook Diterima:**

Terminal webhook receiver akan tampilkan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 WEBHOOK RECEIVED: 2025-11-30T10:35:22Z

🔐 Signature: def456...
✅ Valid: ✅ YES

📋 Event Type: click.created
⏰ Timestamp: 2025-11-30T10:35:22Z

📦 Data:
{
  "linkId": "link_...",
  "alias": "webhook-test",
  "targetUrl": "https://google.com",
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0 (iPhone...)",
  "referer": "https://twitter.com/promo",
  "geoLocation": "Jakarta, ID",
  "deviceType": "mobile",
  "osName": "iOS",
  "browserName": "Safari"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖱️  ACTION: New click detected!
   Link: webhook-test
   Location: Jakarta, ID
   Device: mobile
```

---

## 🎯 Test Webhook Lainnya

### Test Event: Link Expired

**1. Create link dengan expiry:**

```bash
curl -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "expires-soon",
    "targetUrl": "https://example.com",
    "expiresAt": "2025-11-30T10:40:00Z"
  }'
```

**2. Tunggu sampai waktu expiry, atau update webhook untuk event `link.expired`**

---

### Test Event: Max Clicks Reached

**1. Create link dengan maxClicks:**

```bash
curl -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "limited",
    "targetUrl": "https://example.com",
    "maxClicks": 5
  }'
```

**2. Click 5x:**

```bash
# Click 5 kali
for i in {1..5}; do
  echo "Click #$i"
  curl -L http://localhost:9090/r/limited
  sleep 1
done
```

**3. Webhook `link.maxclicks` akan terkirim setelah click ke-5!**

---

### Test Event: Node Offline

**1. Edit webhook, centang event "Node Offline"**

**2. Stop agent:**

```bash
# Stop agent sementara
pkill -f "go run ./cmd/agent"
```

**3. Tunggu 90 detik** (3x heartbeat missed)

**4. Webhook `node.offline` akan terkirim!**

**5. Start agent lagi:**

```bash
cd /home/natama/Projects/nexuslink
go run ./cmd/agent/main.go > /tmp/nexuslink-agent.log 2>&1 &
```

---

## 🧪 Advanced Testing: Custom Receiver

Kalau mau test dengan server sendiri, edit file receiver:

```bash
cd /home/natama/Projects
nano webhook-test-receiver.js
```

Contoh modifikasi untuk save ke file:

```javascript
// Tambahkan setelah console.log data
const fs = require('fs');
const logFile = `/tmp/webhook-events-${new Date().toISOString().split('T')[0]}.json`;

// Append event ke file
fs.appendFileSync(logFile, JSON.stringify({
  event: payload.event,
  timestamp: payload.timestamp,
  data: payload.data
}) + '\n');

console.log('💾 Saved to:', logFile);
```

Lalu restart receiver:

```bash
# Kill old receiver
pkill -f webhook-test-receiver

# Start new receiver
cd /home/natama/Projects
node webhook-test-receiver.js &
```

---

## 📊 Monitor Webhook Logs

**Lihat semua webhook events:**

```bash
# Real-time monitoring
tail -f /tmp/webhook-events-*.json | jq .

# Count events per type
cat /tmp/webhook-events-*.json | jq -r .event | sort | uniq -c

# Filter hanya click events
cat /tmp/webhook-events-*.json | jq 'select(.event == "click.created")'
```

---

## 🐛 Troubleshooting

### Problem: Webhook tidak diterima

**Cek:**

```bash
# 1. Pastikan receiver running
ps aux | grep webhook-test-receiver

# 2. Pastikan webhook active di dashboard
curl http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: dev-key-12345" | jq .

# 3. Test manual
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Signature: test123" \
  -d '{"event":"test","timestamp":"2025-11-30T10:00:00Z","data":{}}'
```

### Problem: Signature Invalid

**Cek secret sama di:**
- Dashboard webhook form
- Webhook receiver (WEBHOOK_SECRET)

```bash
# Lihat webhook config
curl http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: dev-key-12345" | jq '.[0].secret'

# Bandingkan dengan receiver
grep WEBHOOK_SECRET webhook-test-receiver.js
```

---

## 🎉 Selesai!

Kamu sudah berhasil setup dan test webhook NexusLink!

**Next Steps:**
1. ✅ Test semua event types (8 events)
2. ✅ Implementasi handler custom (save to DB, send to Slack, dll)
3. ✅ Deploy receiver ke server production
4. ✅ Setup monitoring & alerting

**Dokumentasi Lengkap:** Lihat `WEBHOOK_TUTORIAL.md` untuk use cases advanced!

---

## 📞 Quick Commands Reference

```bash
# Start webhook receiver
cd /home/natama/Projects && node webhook-test-receiver.js &

# Stop webhook receiver
pkill -f webhook-test-receiver

# Check receiver status
curl http://localhost:3001/

# Create webhook via CLI
curl -X POST http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:3001/webhook",
    "events": ["click.created"],
    "secret": "test_secret_123",
    "isActive": true
  }'

# Test webhook
curl -X POST http://localhost:8080/admin/webhooks/WEBHOOK_ID/test \
  -H "X-Nexus-Api-Key: dev-key-12345"

# Monitor webhook logs
tail -f /tmp/webhook-events-*.json | jq .
```

---

**Happy Testing! 🚀**
