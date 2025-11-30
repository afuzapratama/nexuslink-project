# 🪝 Tutorial Lengkap Webhook NexusLink

## 📋 Daftar Isi
1. [Apa itu Webhook?](#apa-itu-webhook)
2. [Setup Webhook Receiver](#setup-webhook-receiver)
3. [Daftar Event & Payload](#daftar-event--payload)
4. [Test Webhook dari Dashboard](#test-webhook-dari-dashboard)
5. [Contoh Implementasi Receiver](#contoh-implementasi-receiver)
6. [Troubleshooting](#troubleshooting)

---

## 🤔 Apa itu Webhook?

**Webhook = Notifikasi Otomatis dari NexusLink ke Server Kamu**

Bayangkan seperti ini:
```
User klik link → NexusLink → Kirim notifikasi ke server kamu → Kamu proses data
```

**Contoh Use Case:**
- 📊 Setiap ada click, catat ke database kamu sendiri
- 🚨 Node offline? Langsung kirim alert ke Telegram
- 📈 Link expired? Update status di sistem kamu
- 💰 Track conversions untuk affiliate marketing

---

## 🛠️ Setup Webhook Receiver

### Pilihan 1: Test dengan Webhook.site (Paling Mudah)

1. **Buka https://webhook.site**
2. **Copy URL unik kamu** (misal: `https://webhook.site/12345678-abcd-1234-5678-1234567890ab`)
3. **Buka Dashboard NexusLink:** http://localhost:3000/webhooks
4. **Klik "Create Webhook":**
   - URL: Paste URL dari webhook.site
   - Events: Centang "Click Created"
   - Secret: Biarkan auto-generate
   - Klik **"Create Webhook"**
5. **Test:** Klik tombol "Test" di tabel
6. **Lihat di webhook.site** - payload akan muncul real-time!

### Pilihan 2: Server Node.js (Untuk Production)

Buat file `webhook-receiver.js`:

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Secret dari dashboard (contoh)
const WEBHOOK_SECRET = 'wh_secret_abc123xyz';

// Fungsi verifikasi signature
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Endpoint webhook
app.post('/nexus-webhook', (req, res) => {
  const signature = req.headers['x-nexus-signature'];
  const payload = req.body;

  console.log('📨 Webhook received:', payload.event);

  // 1. Verifikasi signature (PENTING untuk keamanan!)
  if (!verifySignature(payload, signature)) {
    console.error('❌ Invalid signature!');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Handle event berdasarkan tipe
  switch (payload.event) {
    case 'click.created':
      handleClickCreated(payload.data);
      break;
    case 'node.offline':
      handleNodeOffline(payload.data);
      break;
    case 'link.expired':
      handleLinkExpired(payload.data);
      break;
    default:
      console.log('Unknown event:', payload.event);
  }

  // 3. Balas 200 OK (biar NexusLink tahu sukses)
  res.json({ received: true });
});

function handleClickCreated(data) {
  console.log('🖱️  Click Event:', {
    link: data.alias,
    target: data.targetUrl,
    location: data.geoLocation,
    device: data.deviceType,
    timestamp: data.timestamp
  });

  // TODO: Simpan ke database kamu
  // await db.clicks.insert(data);
  
  // TODO: Kirim notifikasi
  // await sendToSlack(`New click on ${data.alias}`);
}

function handleNodeOffline(data) {
  console.log('🚨 Node Offline:', data.nodeId);
  
  // TODO: Kirim alert
  // await sendToTelegram(`⚠️ Node ${data.domain} is offline!`);
}

function handleLinkExpired(data) {
  console.log('⏰ Link Expired:', data.alias);
  
  // TODO: Update status di sistem kamu
  // await updateLinkStatus(data.linkId, 'expired');
}

app.listen(3001, () => {
  console.log('🎧 Webhook receiver listening on port 3001');
});
```

**Jalankan:**
```bash
npm install express
node webhook-receiver.js
```

**Expose ke Internet (untuk test):**
```bash
# Pakai ngrok
npx ngrok http 3001

# Copy URL ngrok (misal: https://abc123.ngrok.io)
# Tambahkan path: https://abc123.ngrok.io/nexus-webhook
```

### Pilihan 3: Python Flask

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)

WEBHOOK_SECRET = 'wh_secret_abc123xyz'

def verify_signature(payload, signature):
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/nexus-webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Nexus-Signature')
    payload = request.json
    
    print(f"📨 Webhook received: {payload['event']}")
    
    # Verifikasi signature
    if not verify_signature(payload, signature):
        print("❌ Invalid signature!")
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Handle event
    event_type = payload['event']
    data = payload['data']
    
    if event_type == 'click.created':
        print(f"🖱️  Click on {data['alias']}: {data['targetUrl']}")
        # TODO: Simpan ke database
        
    elif event_type == 'node.offline':
        print(f"🚨 Node offline: {data['nodeId']}")
        # TODO: Kirim alert
        
    elif event_type == 'link.expired':
        print(f"⏰ Link expired: {data['alias']}")
        # TODO: Update status
    
    return jsonify({'received': True})

if __name__ == '__main__':
    app.run(port=3001, debug=True)
```

**Jalankan:**
```bash
pip install flask
python webhook-receiver.py
```

---

## 📦 Daftar Event & Payload

### 1. `click.created` - Setiap Ada Click Link

**Kapan trigger:** User mengklik link NexusLink

**Payload:**
```json
{
  "event": "click.created",
  "timestamp": "2025-11-30T10:30:45Z",
  "data": {
    "linkId": "link_abc123",
    "alias": "promo2024",
    "targetUrl": "https://example.com/product",
    "nodeId": "node_xyz789",
    "nodeDomain": "short.link",
    "ipAddress": "203.0.113.42",
    "userAgent": "Mozilla/5.0 ...",
    "referer": "https://twitter.com/...",
    "geoLocation": "Jakarta, ID",
    "deviceType": "mobile",
    "osName": "Android",
    "browserName": "Chrome"
  }
}
```

**Contoh Penggunaan:**
```javascript
// Catat setiap click ke analytics
function handleClickCreated(data) {
  await analytics.track({
    event: 'link_clicked',
    properties: {
      link: data.alias,
      source: data.referer,
      country: data.geoLocation,
      device: data.deviceType
    }
  });
  
  // Kirim ke Google Analytics
  await ga.event('link_click', {
    link_alias: data.alias,
    target_url: data.targetUrl
  });
}
```

### 2. `node.offline` - Node Tidak Merespons

**Kapan trigger:** Node gagal heartbeat 3x berturut-turut (90 detik)

**Payload:**
```json
{
  "event": "node.offline",
  "timestamp": "2025-11-30T10:35:00Z",
  "data": {
    "nodeId": "node_xyz789",
    "domain": "short.link",
    "lastSeen": "2025-11-30T10:33:00Z",
    "failedHeartbeats": 3
  }
}
```

**Contoh Penggunaan:**
```javascript
// Alert ke Telegram
async function handleNodeOffline(data) {
  const message = `
🚨 *NODE OFFLINE ALERT*

Domain: ${data.domain}
Node ID: ${data.nodeId}
Last Seen: ${data.lastSeen}
Failed Checks: ${data.failedHeartbeats}

⚠️ Action Required: Check server status!
  `;
  
  await sendToTelegram(ADMIN_CHAT_ID, message);
  
  // Kirim email
  await sendEmail({
    to: 'admin@example.com',
    subject: `[ALERT] Node ${data.domain} is offline`,
    body: message
  });
}
```

### 3. `traffic.blocked` - Rate Limit Exceeded

**Kapan trigger:** IP/Link melewati batas rate limit

**Payload:**
```json
{
  "event": "traffic.blocked",
  "timestamp": "2025-11-30T10:40:00Z",
  "data": {
    "linkId": "link_abc123",
    "alias": "promo2024",
    "ipAddress": "203.0.113.42",
    "reason": "rate_limit_exceeded",
    "limit": 100,
    "window": "1h",
    "attempts": 150
  }
}
```

**Contoh Penggunaan:**
```javascript
// Deteksi abuse & block IP
async function handleTrafficBlocked(data) {
  if (data.attempts > data.limit * 2) {
    // Block IP di firewall
    await firewall.blockIP(data.ipAddress, '24h');
    
    // Log ke security system
    await securityLog.create({
      type: 'rate_limit_abuse',
      ip: data.ipAddress,
      link: data.alias,
      attempts: data.attempts
    });
  }
}
```

### 4. `link.expired` - Link Sudah Kadaluarsa

**Kapan trigger:** Link mencapai tanggal expiry

**Payload:**
```json
{
  "event": "link.expired",
  "timestamp": "2025-11-30T10:45:00Z",
  "data": {
    "linkId": "link_abc123",
    "alias": "promo2024",
    "targetUrl": "https://example.com/promo",
    "expiresAt": "2025-11-30T10:45:00Z",
    "totalClicks": 1543
  }
}
```

**Contoh Penggunaan:**
```javascript
// Archive link & update database
async function handleLinkExpired(data) {
  // Archive di database kamu
  await db.links.update(data.linkId, {
    status: 'expired',
    archivedAt: new Date()
  });
  
  // Generate laporan
  const report = await generateLinkReport(data.linkId);
  await sendEmail({
    to: 'marketing@example.com',
    subject: `Link ${data.alias} has expired`,
    body: `
      Link: ${data.alias}
      Total Clicks: ${data.totalClicks}
      Performance Report: ${report.url}
    `
  });
}
```

### 5. `link.maxclicks` - Max Clicks Tercapai

**Kapan trigger:** Link mencapai batas maxClicks

**Payload:**
```json
{
  "event": "link.maxclicks",
  "timestamp": "2025-11-30T10:50:00Z",
  "data": {
    "linkId": "link_abc123",
    "alias": "limited-offer",
    "targetUrl": "https://example.com/offer",
    "maxClicks": 1000,
    "totalClicks": 1000
  }
}
```

**Contoh Penggunaan:**
```javascript
// Stop campaign & notify team
async function handleMaxClicksReached(data) {
  // Update campaign status
  await campaign.updateStatus(data.linkId, 'completed');
  
  // Send Slack notification
  await slack.sendMessage('#marketing', {
    text: `🎯 Campaign Complete!`,
    attachments: [{
      color: 'good',
      fields: [
        { title: 'Link', value: data.alias },
        { title: 'Total Clicks', value: data.totalClicks },
        { title: 'Target', value: data.maxClicks }
      ]
    }]
  });
}
```

### 6. `link.created` - Link Baru Dibuat

**Payload:**
```json
{
  "event": "link.created",
  "timestamp": "2025-11-30T11:00:00Z",
  "data": {
    "linkId": "link_new123",
    "alias": "new-promo",
    "targetUrl": "https://example.com/new",
    "createdBy": "admin",
    "groupId": "group_abc"
  }
}
```

### 7. `link.updated` - Link Diupdate

**Payload:**
```json
{
  "event": "link.updated",
  "timestamp": "2025-11-30T11:05:00Z",
  "data": {
    "linkId": "link_abc123",
    "alias": "promo2024",
    "changes": {
      "targetUrl": "https://new-url.com",
      "maxClicks": 2000
    }
  }
}
```

### 8. `link.deleted` - Link Dihapus

**Payload:**
```json
{
  "event": "link.deleted",
  "timestamp": "2025-11-30T11:10:00Z",
  "data": {
    "linkId": "link_abc123",
    "alias": "old-promo",
    "deletedBy": "admin"
  }
}
```

---

## 🎯 Test Webhook dari Dashboard

### Step-by-Step Test:

1. **Buka Dashboard:** http://localhost:3000/webhooks

2. **Setup Webhook Receiver (pilih salah satu):**
   - **Option A:** Pakai webhook.site (paling mudah)
   - **Option B:** Jalankan server Node.js/Python di atas

3. **Create Webhook di Dashboard:**
   ```
   URL: https://webhook.site/your-unique-id
   Events: ✅ Click Created
           ✅ Node Offline
           ✅ Link Expired
   Secret: wh_secret_abc123xyz (auto-generate)
   Active: ✅ Yes
   ```

4. **Test Manual:**
   - Klik tombol **"Test"** di tabel webhooks
   - Cek di webhook.site → payload test muncul!

5. **Test Real Event - Click:**
   ```bash
   # Create link dulu
   curl -X POST http://localhost:8080/links \
     -H "X-Nexus-Api-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{
       "alias": "test-webhook",
       "targetUrl": "https://google.com"
     }'
   
   # Simulasi click
   curl -H "X-Real-IP: 1.2.3.4" \
        -H "X-Visitor-User-Agent: Mozilla/5.0" \
        http://localhost:9090/r/test-webhook
   
   # Cek di webhook.site → event click.created muncul!
   ```

6. **Test Real Event - Node Offline:**
   ```bash
   # Stop agent
   pkill -f "go run ./cmd/agent"
   
   # Tunggu 90 detik (3x heartbeat miss)
   # Webhook "node.offline" akan terkirim!
   ```

---

## 💻 Contoh Implementasi Lengkap

### Use Case: Affiliate Marketing Tracker

```javascript
const express = require('express');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.NEXUS_WEBHOOK_SECRET;
const mongo = new MongoClient(process.env.MONGO_URL);
const db = mongo.db('affiliate');

// Verifikasi signature
function verifySignature(payload, signature) {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const expected = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

app.post('/webhooks/nexus', async (req, res) => {
  const signature = req.headers['x-nexus-signature'];
  const payload = req.body;

  if (!verifySignature(payload, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    switch (payload.event) {
      case 'click.created':
        await trackAffiliateClick(payload.data);
        break;
      case 'link.maxclicks':
        await notifyCampaignComplete(payload.data);
        break;
      case 'node.offline':
        await alertTeam(payload.data);
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function trackAffiliateClick(data) {
  // 1. Simpan click event
  await db.collection('clicks').insertOne({
    linkAlias: data.alias,
    targetUrl: data.targetUrl,
    ipAddress: data.ipAddress,
    country: data.geoLocation,
    device: data.deviceType,
    browser: data.browserName,
    referer: data.referer,
    timestamp: new Date(data.timestamp)
  });

  // 2. Update stats affiliate
  const linkStats = await db.collection('link_stats')
    .findOneAndUpdate(
      { alias: data.alias },
      {
        $inc: { 
          totalClicks: 1,
          [`clicks_${data.deviceType}`]: 1
        },
        $set: { lastClickAt: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );

  // 3. Cek conversion (misal: user beli dalam 30 menit)
  setTimeout(async () => {
    const conversion = await checkConversion(data.ipAddress);
    if (conversion) {
      await db.collection('conversions').insertOne({
        linkAlias: data.alias,
        clickId: click._id,
        revenue: conversion.amount,
        commission: conversion.amount * 0.1, // 10% komisi
        convertedAt: new Date()
      });
      
      // Notify affiliate
      await notifyAffiliate(data.alias, conversion);
    }
  }, 30 * 60 * 1000); // 30 menit
}

async function notifyCampaignComplete(data) {
  const campaign = await db.collection('campaigns')
    .findOne({ linkAlias: data.alias });
  
  if (!campaign) return;

  // Generate report
  const stats = await db.collection('clicks').aggregate([
    { $match: { linkAlias: data.alias } },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: 1 },
        uniqueIPs: { $addToSet: '$ipAddress' },
        countries: { $addToSet: '$country' },
        devices: { $push: '$device' }
      }
    }
  ]).toArray();

  const report = {
    campaign: campaign.name,
    link: data.alias,
    totalClicks: data.totalClicks,
    uniqueVisitors: stats[0].uniqueIPs.length,
    topCountries: getTopCountries(stats[0].countries),
    deviceBreakdown: getDeviceBreakdown(stats[0].devices)
  };

  // Send email report
  await sendEmailReport(campaign.owner, report);

  // Post to Slack
  await postToSlack(`
    🎉 Campaign "${campaign.name}" Complete!
    
    📊 Results:
    - Total Clicks: ${report.totalClicks}
    - Unique Visitors: ${report.uniqueVisitors}
    - Top Country: ${report.topCountries[0]}
    
    Full report: ${generateReportURL(report)}
  `);
}

async function alertTeam(data) {
  // Critical alert: node offline
  await sendPagerDuty({
    service: 'nexuslink-nodes',
    event_action: 'trigger',
    payload: {
      severity: 'critical',
      summary: `Node ${data.domain} is offline`,
      source: data.nodeId,
      custom_details: {
        domain: data.domain,
        lastSeen: data.lastSeen,
        failedHeartbeats: data.failedHeartbeats
      }
    }
  });
}

app.listen(3001, () => {
  console.log('🎧 Affiliate webhook receiver running on port 3001');
});
```

---

## 🐛 Troubleshooting

### Problem 1: Webhook Tidak Terkirim

**Cek:**
```bash
# 1. Pastikan webhook active
curl http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: your-key"

# 2. Cek logs API
tail -f /tmp/nexuslink-api.log | grep webhook

# 3. Test manual
curl -X POST http://localhost:8080/admin/webhooks/webhook-id/test \
  -H "X-Nexus-Api-Key: your-key"
```

**Solusi:**
- Pastikan webhook Active = true
- URL harus HTTPS di production (HTTP ok untuk test)
- Cek firewall tidak block outgoing request

### Problem 2: Signature Verification Failed

**Debug:**
```javascript
// Log signature di receiver kamu
console.log('Received signature:', req.headers['x-nexus-signature']);
console.log('Payload:', JSON.stringify(req.body));
console.log('Expected signature:', expectedSignature);

// Pastikan:
// 1. Secret sama persis dengan di dashboard
// 2. JSON payload tidak dimodifikasi (whitespace, etc)
// 3. Encoding konsisten (UTF-8)
```

**Solusi:**
```javascript
// Cara benar generate signature
const crypto = require('crypto');

function verifySignature(rawBody, signature, secret) {
  // PENTING: Pakai raw body (string), bukan parsed JSON
  const hmac = crypto.createHmac('sha256', secret);
  const expected = hmac.update(rawBody).digest('hex');
  return signature === expected;
}

// Di Express, pakai raw body
app.use('/webhook', express.raw({ type: 'application/json' }));
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-nexus-signature'];
  const rawBody = req.body.toString('utf8');
  
  if (!verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const payload = JSON.parse(rawBody);
  // ... process payload
});
```

### Problem 3: Webhook Timeout

**Gejala:** Webhook retry terus-menerus

**Solusi:**
```javascript
// JANGAN lakukan operasi berat di webhook handler
app.post('/webhook', async (req, res) => {
  const payload = req.body;
  
  // ✅ BENAR: Balas 200 dulu, proses async
  res.json({ received: true });
  
  // Process di background (jangan tunggu)
  processWebhookAsync(payload).catch(console.error);
});

async function processWebhookAsync(payload) {
  // Heavy operation: save to DB, call external API, etc
  await saveToDatabase(payload);
  await callExternalAPI(payload);
  await sendNotifications(payload);
}

// ❌ SALAH: Tunggu operasi selesai
app.post('/webhook', async (req, res) => {
  await saveToDatabase(req.body); // Bisa lambat!
  await callExternalAPI(req.body); // Bisa timeout!
  res.json({ received: true }); // Terlambat!
});
```

### Problem 4: Duplicate Events

**Gejala:** Webhook terkirim 2-3 kali untuk event yang sama

**Penyebab:** Retry mechanism (normal behavior)

**Solusi: Implementasi Idempotency**
```javascript
const processedEvents = new Set();

app.post('/webhook', async (req, res) => {
  const payload = req.body;
  
  // Generate unique event ID
  const eventId = `${payload.event}-${payload.timestamp}-${payload.data.linkId}`;
  
  // Cek sudah diproses?
  if (processedEvents.has(eventId)) {
    console.log('Duplicate event, skipping:', eventId);
    return res.json({ received: true, duplicate: true });
  }
  
  // Tandai sebagai processed
  processedEvents.add(eventId);
  
  // Proses event
  await handleEvent(payload);
  
  res.json({ received: true });
});

// Atau pakai Redis untuk distributed system
async function isDuplicate(eventId) {
  const key = `webhook:processed:${eventId}`;
  const exists = await redis.exists(key);
  if (exists) return true;
  
  await redis.setex(key, 3600, '1'); // Expire 1 jam
  return false;
}
```

---

## 🎓 Best Practices

### 1. Selalu Verifikasi Signature
```javascript
// ❌ BAHAYA: Tidak verifikasi
app.post('/webhook', (req, res) => {
  handleEvent(req.body); // Siapapun bisa kirim fake webhook!
});

// ✅ AMAN: Verifikasi signature
app.post('/webhook', (req, res) => {
  if (!verifySignature(req.body, req.headers['x-nexus-signature'])) {
    return res.status(401).send('Unauthorized');
  }
  handleEvent(req.body);
});
```

### 2. Balas 200 Cepat
```javascript
// ✅ Pattern yang benar
app.post('/webhook', async (req, res) => {
  // 1. Validasi
  if (!verifySignature(...)) {
    return res.status(401).send('Unauthorized');
  }
  
  // 2. Balas 200 SEGERA (< 2 detik)
  res.json({ received: true });
  
  // 3. Process async di background
  setImmediate(() => {
    processWebhook(req.body).catch(console.error);
  });
});
```

### 3. Log Semua Webhook
```javascript
app.post('/webhook', async (req, res) => {
  const logId = uuidv4();
  
  // Log incoming webhook
  await db.webhook_logs.insert({
    id: logId,
    event: req.body.event,
    payload: req.body,
    receivedAt: new Date(),
    signature: req.headers['x-nexus-signature']
  });
  
  res.json({ received: true, logId });
  
  // Process & update log
  try {
    await processWebhook(req.body);
    await db.webhook_logs.update(logId, { status: 'success' });
  } catch (error) {
    await db.webhook_logs.update(logId, { 
      status: 'failed',
      error: error.message 
    });
  }
});
```

### 4. Handle Retry Gracefully
```javascript
// NexusLink akan retry 3x (1s, 2s, 4s)
// Pastikan operasi kamu idempotent!

async function handleClickCreated(data) {
  // ✅ BENAR: Upsert (idempotent)
  await db.clicks.updateOne(
    { linkId: data.linkId, timestamp: data.timestamp },
    { $set: data },
    { upsert: true }
  );
  
  // ❌ SALAH: Insert bisa duplicate
  await db.clicks.insert(data);
}
```

---

## 🚀 Quick Start (Copy-Paste Ready)

### Test dengan Webhook.site

1. Buka https://webhook.site
2. Copy URL unik kamu
3. Jalankan command ini:

```bash
# Ganti YOUR_API_KEY dan WEBHOOK_URL
curl -X POST http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/YOUR-UNIQUE-ID",
    "events": ["click.created", "link.expired"],
    "isActive": true
  }'

# Test kirim webhook
curl -X POST http://localhost:8080/admin/webhooks/WEBHOOK_ID/test \
  -H "X-Nexus-Api-Key: YOUR_API_KEY"

# Cek di webhook.site → payload muncul!
```

### Setup Node.js Receiver (Production-Ready)

```bash
# 1. Create project
mkdir nexus-webhook-receiver
cd nexus-webhook-receiver
npm init -y

# 2. Install dependencies
npm install express dotenv

# 3. Create .env
cat > .env << EOF
WEBHOOK_SECRET=wh_secret_abc123xyz
PORT=3001
EOF

# 4. Create server.js (copy dari contoh di atas)

# 5. Run
node server.js

# 6. Expose dengan ngrok
npx ngrok http 3001
```

---

## 📞 Butuh Bantuan?

Masih bingung? Coba ini:

1. **Test Manual:**
   ```bash
   # Kirim webhook test dari API
   curl -X POST http://localhost:8080/admin/webhooks/YOUR_WEBHOOK_ID/test \
     -H "X-Nexus-Api-Key: YOUR_API_KEY"
   ```

2. **Lihat Logs:**
   ```bash
   tail -f /tmp/nexuslink-api.log | grep -i webhook
   ```

3. **Debug Receiver:**
   ```javascript
   // Tambah logging ekstensif
   app.post('/webhook', (req, res) => {
     console.log('Headers:', req.headers);
     console.log('Body:', req.body);
     console.log('Signature:', req.headers['x-nexus-signature']);
     res.json({ received: true });
   });
   ```

---

**Happy Webhooking! 🚀**

Kalau masih ada yang bingung, tanya aja specific bagian mana yang kurang jelas!
