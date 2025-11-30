# 🧪 Rate Limit Analytics - Testing Guide

## Quick Test Methods

### Method 1: From Dashboard (Easiest) ⭐

1. Open: http://localhost:3000/rate-limits (atau :3001)
2. Click button:
   - **"🧪 Generate Test (30 req)"** - Normal test
   - **"🔥 Heavy Test (60 req)"** - Trigger rate limiting

Hasil akan muncul otomatis setelah 2 detik!

---

### Method 2: Terminal Script

```bash
cd /home/natama/Projects/nexuslink

# Default: 30 requests
bash scripts/generate-traffic.sh

# Custom count: 50 requests
bash scripts/generate-traffic.sh 50

# Heavy load: 100 requests
bash scripts/generate-traffic.sh 100
```

**Output:**
- Real-time progress
- Success/Rate-limited/Failed count
- Redis key count
- Sample keys

---

### Method 3: Manual cURL Loop

```bash
# Simple loop
for i in {1..40}; do 
  curl -s "http://localhost:9090/r/test-link" > /dev/null 2>&1
done

# With progress
for i in {1..40}; do 
  echo "Request $i/40"
  curl -s "http://localhost:9090/r/test-link" > /dev/null 2>&1
  sleep 0.1
done
```

---

## Expected Results

### Rate Limit: 60 requests/minute per IP

**Example Test (40 requests):**
- ✅ First ~50: Success (redirects)
- ⚠️  After 60: HTTP 429 (rate limited)

**Dashboard Display:**
- Total Active Limits: 1+
- IP Rate Limits: Should show 127.0.0.1
- Request Count: Actual requests in window
- Resets In: Countdown timer

---

## Verify Results

### 1. Check Redis
```bash
# List all rate limit keys
redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*"

# Get count for specific IP
redis-cli -a devpass --no-auth-warning ZCARD "ratelimit:ip:127.0.0.1"

# See all entries
redis-cli -a devpass --no-auth-warning ZRANGE "ratelimit:ip:127.0.0.1" 0 -1 WITHSCORES
```

### 2. Check API Directly
```bash
curl "http://localhost:8080/admin/rate-limits" \
  -H "X-Nexus-Api-Key: Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb" | jq .
```

### 3. Check Dashboard BFF
```bash
curl "http://localhost:3000/api/nexus/rate-limits" | jq .
```

---

## Test Scenarios

### Scenario 1: Normal Traffic (Under Limit)
```bash
bash scripts/generate-traffic.sh 30
```
**Expected:**
- All 30 requests succeed
- Rate limit entry created but under threshold
- No 429 errors

### Scenario 2: Burst Traffic (Hit Limit)
```bash
bash scripts/generate-traffic.sh 70
```
**Expected:**
- First ~60 succeed
- Remaining ~10 get 429
- Dashboard shows IP at/near limit

### Scenario 3: Sustained Traffic
```bash
# Run multiple times in quick succession
bash scripts/generate-traffic.sh 40
sleep 2
bash scripts/generate-traffic.sh 40
sleep 2
bash scripts/generate-traffic.sh 40
```
**Expected:**
- Sliding window prevents sustained high rate
- Mix of successes and 429s
- Dashboard shows accumulated count

---

## Dashboard Features

### Stats Cards
- **Total Active Limits**: Count of all rate-limited keys
- **IP Rate Limits**: Unique IPs being limited (red)
- **Link Rate Limits**: Per-link limits (yellow)

### Filters
- **All (N)**: Show everything
- **IPs (N)**: Only IP-based limits
- **Links (N)**: Only link-based limits

### Search
Type to filter by IP address or key name

### Table Columns
- **Type**: IP / Link badge (color-coded)
- **Key**: Full Redis key + parsed value
- **Request Count**: Current count in sliding window
- **Resets In**: Countdown timer (updates live)
- **Actions**: 🗑️ Reset button (clears specific limit)

### Auto Features
- ✅ Auto-refresh every 5 seconds
- ✅ Real-time countdown timers
- ✅ Toast notifications
- ✅ Loading states

---

## Troubleshooting

### No Data Showing

**Check Agent:**
```bash
curl http://localhost:9090/health
# Should return: OK
```

**Check Redis:**
```bash
redis-cli -a devpass ping
# Should return: PONG
```

**Generate Traffic:**
```bash
bash scripts/generate-traffic.sh 40
```

### All Requests Get 429

**Rate limit hit!** Wait 60 seconds or reset:

```bash
# Reset specific IP
redis-cli -a devpass --no-auth-warning DEL "ratelimit:ip:127.0.0.1"

# Or reset all
redis-cli -a devpass --no-auth-warning FLUSHDB
```

### Dashboard Shows 0

**Possible causes:**
1. API not returning data → Check API logs
2. Agent not running → Start Agent
3. No traffic generated → Click test button
4. Redis empty → Generate traffic first

---

## Tips

💡 **Best Testing Flow:**
1. Open dashboard: `http://localhost:3000/rate-limits`
2. Click "🧪 Generate Test (30 req)"
3. Wait 2 seconds
4. See stats update automatically
5. Click "🔥 Heavy Test (60 req)" to trigger rate limit
6. See red IP badge appear
7. Try Reset button to clear limit

🔥 **Trigger Rate Limit Fast:**
```bash
bash scripts/generate-traffic.sh 100
```
Will definitely hit 60/min limit and show 429s!

📊 **Compare Results:**
- Terminal shows HTTP codes in real-time
- Dashboard shows accumulated analytics
- Redis shows raw data

---

## Rate Limit Configuration

Edit in Dashboard → Settings:
- IP Limit: Default 60 req/min
- Link Limit: Default 120 req/min  
- Window: Default 60 seconds

After changing, restart Agent:
```bash
# Stop Agent (Ctrl+C in Agent terminal)
# Start Agent
bash scripts/start-agent.sh
```
