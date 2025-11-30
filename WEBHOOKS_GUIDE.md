# 🪝 NexusLink Webhooks Guide

**Last Updated:** November 30, 2025  
**Feature Status:** ✅ COMPLETE

---

## 📋 Overview

NexusLink Webhooks allow you to receive real-time HTTP notifications when specific events occur in your link management system. Webhooks are delivered as HTTP POST requests with HMAC-SHA256 signatures for security.

---

## 🎯 Supported Events

| Event Name          | Description                              | Trigger Condition                  |
|---------------------|------------------------------------------|------------------------------------|
| `click.created`     | A link was clicked                       | Every successful redirect          |
| `node.offline`      | A node went offline                      | Node missed 3 consecutive heartbeats |
| `traffic.blocked`   | Traffic was blocked by rate limiting     | Rate limit exceeded                |
| `link.expired`      | A link reached its expiration date       | Link accessed after `activeUntil`  |
| `link.maxclicks`    | A link reached maximum clicks            | Click count >= `maxClicks`         |
| `link.created`      | A new link was created                   | POST /links                        |
| `link.updated`      | A link was updated                       | PUT /links/:id                     |
| `link.deleted`      | A link was deleted                       | DELETE /links/:id                  |

---

## 🚀 Quick Start

### 1. Create a Webhook

#### Via Dashboard:
1. Navigate to **Webhooks** page
2. Fill in the form:
   - **URL**: Your webhook endpoint (e.g., `https://example.com/webhooks`)
   - **Events**: Select one or more events to subscribe to
   - **Secret**: Generate or enter a secret for HMAC signing
   - **Active**: Toggle to enable/disable webhook
3. Click **Create Webhook**

#### Via API:
```bash
curl -X POST http://localhost:8080/admin/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: your-api-key" \
  -d '{
    "url": "https://example.com/webhooks",
    "events": ["click.created", "link.expired"],
    "secret": "your-secret-key-here",
    "isActive": true
  }'
```

---

## 📦 Payload Structure

All webhook payloads follow this structure:

```json
{
  "event": "click.created",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    // Event-specific data (see examples below)
  }
}
```

### Event-Specific Payloads

#### `click.created`
```json
{
  "event": "click.created",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    "linkId": "abc123",
    "alias": "promo2025",
    "targetUrl": "https://example.com/sale",
    "visitorIP": "1.2.3.4",
    "visitorCountry": "US",
    "userAgent": "Mozilla/5.0 ...",
    "os": "Windows",
    "device": "Desktop",
    "browser": "Chrome",
    "isBot": false,
    "referer": "https://google.com"
  }
}
```

#### `node.offline`
```json
{
  "event": "node.offline",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    "nodeId": "node-xyz",
    "nodeName": "US-East-1",
    "domain": "us1.nexuslink.io",
    "lastSeen": "2025-11-30T12:32:10Z",
    "region": "us-east-1"
  }
}
```

#### `traffic.blocked`
```json
{
  "event": "traffic.blocked",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    "type": "rate_limit",
    "reason": "IP rate limit exceeded",
    "ip": "1.2.3.4",
    "alias": "promo2025",
    "limit": 60,
    "window": 60,
    "count": 75
  }
}
```

#### `link.expired`
```json
{
  "event": "link.expired",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    "linkId": "abc123",
    "alias": "promo2025",
    "targetUrl": "https://example.com/sale",
    "expiredAt": "2025-11-30T00:00:00Z",
    "totalClicks": 1234
  }
}
```

#### `link.maxclicks`
```json
{
  "event": "link.maxclicks",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    "linkId": "abc123",
    "alias": "promo2025",
    "targetUrl": "https://example.com/sale",
    "maxClicks": 1000,
    "totalClicks": 1001
  }
}
```

---

## 🔒 Security: HMAC Verification

Every webhook request includes an `X-Webhook-Signature` header with an HMAC-SHA256 signature. **Always verify this signature** before processing webhooks.

### Verification Examples

#### Node.js (Express)
```javascript
const crypto = require('crypto');

app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const body = JSON.stringify(req.body);
  const secret = 'your-secret-key-here';
  
  // Calculate expected signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  
  // Compare signatures (timing-safe)
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  const { event, data } = req.body;
  console.log(`Received event: ${event}`, data);
  
  res.status(200).send('OK');
});
```

#### Python (Flask)
```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhooks', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    body = request.get_data()
    secret = b'your-secret-key-here'
    
    # Calculate expected signature
    expected_signature = hmac.new(
        secret,
        body,
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures (timing-safe)
    if not hmac.compare_digest(signature, expected_signature):
        return 'Invalid signature', 401
    
    # Process webhook
    data = request.json
    print(f"Received event: {data['event']}", data['data'])
    
    return 'OK', 200
```

#### Go
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io"
    "net/http"
)

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-Webhook-Signature")
    secret := []byte("your-secret-key-here")
    
    // Read body
    body, _ := io.ReadAll(r.Body)
    defer r.Body.Close()
    
    // Calculate expected signature
    h := hmac.New(sha256.New, secret)
    h.Write(body)
    expectedSignature := hex.EncodeToString(h.Sum(nil))
    
    // Compare signatures (timing-safe)
    if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    // Process webhook
    var payload map[string]interface{}
    json.Unmarshal(body, &payload)
    event := payload["event"].(string)
    
    log.Printf("Received event: %s", event)
    
    w.WriteHeader(http.StatusOK)
}
```

---

## 🔄 Retry Logic

NexusLink implements automatic retry logic for failed webhook deliveries:

- **Max Retries:** 3 attempts
- **Backoff Strategy:** Exponential (1s, 2s, 4s)
- **Stop Retrying On:** 4xx client errors (except 408, 429)
- **Continue Retrying On:** 5xx server errors, network errors, timeouts

### Response Codes
- **2xx (200-299):** Success - no retry
- **4xx (400-499):** Client error - no retry (except 408, 429)
- **5xx (500-599):** Server error - retry with backoff
- **Timeout/Network Error:** Retry with backoff

---

## 📊 Monitoring & Debugging

### Dashboard Features
1. **Webhook List:** View all configured webhooks
2. **Test Button:** Send test payloads to verify endpoint
3. **Active/Inactive Toggle:** Temporarily disable webhooks
4. **Edit/Delete:** Manage webhook configuration

### API Endpoints

#### List All Webhooks
```bash
GET /admin/webhooks
```

#### Get Specific Webhook
```bash
GET /admin/webhooks/:id
```

#### Update Webhook
```bash
PUT /admin/webhooks/:id
```

#### Delete Webhook
```bash
DELETE /admin/webhooks/:id
```

#### Test Webhook
```bash
POST /admin/webhooks/:id/test
```

### Logs
Check backend logs for webhook delivery results:
```bash
# Successful delivery
Webhook delivered successfully: id=abc123 url=https://example.com/webhooks event=click.created attempt=1 status=200

# Failed delivery
Webhook delivery failed: id=abc123 url=https://example.com/webhooks event=click.created attempt=1/3 error=connection refused

# Exhausted retries
Webhook delivery exhausted retries: id=abc123 url=https://example.com/webhooks event=click.created
```

---

## 🛠️ Best Practices

### 1. **Always Verify Signatures**
Never process webhook payloads without verifying the HMAC signature. This prevents attackers from sending fake events.

### 2. **Respond Quickly**
Webhook endpoints should respond within 10 seconds. For long-running tasks, queue them for background processing.

```javascript
app.post('/webhooks', async (req, res) => {
  // Verify signature first
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Acknowledge immediately
  res.status(200).send('OK');
  
  // Process in background
  await queue.add('process-webhook', req.body);
});
```

### 3. **Handle Idempotency**
Webhooks may be delivered multiple times. Use the event timestamp and data to detect duplicates.

```javascript
const processedEvents = new Set();

app.post('/webhooks', (req, res) => {
  const eventId = `${req.body.event}-${req.body.timestamp}`;
  
  if (processedEvents.has(eventId)) {
    console.log('Duplicate event, skipping');
    return res.status(200).send('OK');
  }
  
  processedEvents.add(eventId);
  // Process event...
});
```

### 4. **Use HTTPS**
Always use HTTPS endpoints for production webhooks to prevent man-in-the-middle attacks.

### 5. **Rotate Secrets Regularly**
Change webhook secrets periodically (e.g., every 90 days) to minimize risk if compromised.

### 6. **Monitor Webhook Health**
Set up alerts for:
- High failure rates (>10%)
- Consistent timeouts
- Signature verification failures

---

## 🧪 Testing Webhooks

### Test with RequestBin
1. Create a RequestBin at https://requestbin.com
2. Copy the URL
3. Create webhook in NexusLink dashboard
4. Click **Test** button
5. View captured payload in RequestBin

### Test with ngrok
```bash
# Start local server
node webhook-server.js

# Expose with ngrok
ngrok http 3000

# Use ngrok URL in NexusLink
# Example: https://abc123.ngrok.io/webhooks
```

### Test Payload Example
When you click **Test** in the dashboard, NexusLink sends:
```json
{
  "event": "test.webhook",
  "timestamp": "2025-11-30T12:34:56Z",
  "data": {
    "message": "This is a test webhook from NexusLink",
    "test": true
  }
}
```

---

## ❓ Troubleshooting

### Webhooks Not Firing

**Check 1:** Is the webhook active?
```bash
curl http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: your-key"
# Verify "isActive": true
```

**Check 2:** Are you subscribed to the right events?
```json
{
  "events": ["click.created"]  // Make sure this includes your event
}
```

**Check 3:** Check backend logs
```bash
# Look for webhook-related logs
grep "Webhook" /var/log/nexuslink.log
```

### Signature Verification Fails

**Issue:** Your signature calculation doesn't match.

**Solution:**
1. Ensure you're using the **exact** raw request body (no parsing)
2. Use the **exact** secret from NexusLink
3. Use **HMAC-SHA256** (not SHA256 alone)
4. Encode result as **hexadecimal** (not base64)

**Debug Code:**
```javascript
console.log('Received signature:', req.headers['x-webhook-signature']);
console.log('Body:', req.body);
console.log('Secret:', secret);

const hmac = crypto.createHmac('sha256', secret);
hmac.update(JSON.stringify(req.body));
console.log('Calculated signature:', hmac.digest('hex'));
```

### High Retry Rates

**Issue:** Webhooks failing and retrying constantly.

**Solutions:**
1. **Timeout:** Ensure your endpoint responds within 10s
2. **5xx Errors:** Fix server errors in your webhook handler
3. **Network:** Check firewall rules, DNS resolution
4. **Load:** Scale your webhook endpoint if under heavy load

---

## 📚 Integration Examples

### Slack Notifications

Send click notifications to Slack:

```javascript
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_TOKEN);

app.post('/webhooks', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  
  if (event === 'click.created') {
    await slack.chat.postMessage({
      channel: '#alerts',
      text: `:link: New click on \`${data.alias}\` from ${data.visitorCountry}`
    });
  }
  
  res.status(200).send('OK');
});
```

### Discord Webhooks

Post events to Discord:

```javascript
const axios = require('axios');

app.post('/webhooks', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  
  if (event === 'link.expired') {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      content: `⚠️ Link expired: **${data.alias}** (${data.totalClicks} clicks)`
    });
  }
  
  res.status(200).send('OK');
});
```

### Database Logging

Store webhook events in database:

```javascript
const db = require('./database');

app.post('/webhooks', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, timestamp, data } = req.body;
  
  await db.webhookEvents.create({
    event,
    timestamp: new Date(timestamp),
    data: JSON.stringify(data),
    receivedAt: new Date()
  });
  
  res.status(200).send('OK');
});
```

---

## 🚀 Production Checklist

Before deploying webhooks to production:

- [ ] **HTTPS Only:** All webhook URLs use HTTPS
- [ ] **Signature Verification:** Implemented in all endpoints
- [ ] **Error Handling:** Proper try/catch blocks
- [ ] **Logging:** Log all webhook events for debugging
- [ ] **Monitoring:** Set up alerts for webhook failures
- [ ] **Idempotency:** Handle duplicate deliveries
- [ ] **Fast Response:** Endpoint responds <10 seconds
- [ ] **Secret Rotation:** Plan for regular secret updates
- [ ] **Rate Limiting:** Protect your endpoint from abuse
- [ ] **Backup Processing:** Queue system for failed webhooks

---

## 📞 Support

**Questions?** Contact us:
- Documentation: https://docs.nexuslink.io
- Issues: https://github.com/yourusername/nexuslink/issues
- Email: support@nexuslink.io

---

**Happy Webhooking! 🪝**
