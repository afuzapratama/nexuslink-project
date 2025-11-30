#!/bin/bash

echo "Testing Rate Limit Analytics - Quick Fix"
echo "========================================="
echo ""

# Test 1: Check API is running
echo "1. Checking API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ "$API_STATUS" = "200" ]; then
  echo "   ✓ API running (port 8080)"
else
  echo "   ✗ API not responding"
  exit 1
fi

# Test 2: Check Agent is running  
echo "2. Checking Agent..."
AGENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/health)
if [ "$AGENT_STATUS" = "200" ]; then
  echo "   ✓ Agent running (port 9090)"
else
  echo "   ✗ Agent not responding"
  exit 1
fi

# Test 3: Generate some traffic
echo "3. Generating traffic (20 requests)..."
for i in {1..20}; do
  curl -s "http://localhost:9090/r/test" -o /dev/null 2>&1 &
done
wait
echo "   ✓ Requests sent"

# Wait a bit for Redis to update
sleep 1

# Test 4: Check Redis keys
echo "4. Checking Redis..."
REDIS_COUNT=$(redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*" 2>/dev/null | wc -l)
echo "   Found $REDIS_COUNT rate limit keys"

# Test 5: Test API endpoint directly
echo "5. Testing /admin/rate-limits endpoint..."
RESULT=$(curl -s "http://localhost:8080/admin/rate-limits" \
  -H "X-Nexus-Api-Key: Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb")

if echo "$RESULT" | grep -q '\['; then
  COUNT=$(echo "$RESULT" | grep -o '"key"' | wc -l)
  echo "   ✓ API returned $COUNT rate limits"
  echo "   Sample: $(echo "$RESULT" | head -c 200)"
else
  echo "   Response: $RESULT"
fi

echo ""
echo "========================================="
echo "✓ Setup complete!"
echo ""
echo "Now refresh your browser: http://localhost:3000/rate-limits"
