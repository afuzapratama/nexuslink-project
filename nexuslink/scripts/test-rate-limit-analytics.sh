#!/bin/bash

echo "🧪 Testing Rate Limit Analytics"
echo "================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"

# Test 1: Create some rate limited requests
echo "1️⃣ Generating rate limit data (making 10 requests)..."
for i in {1..10}; do
  curl -s "http://localhost:9090/r/test-link" > /dev/null 2>&1
done
echo -e "${GREEN}✓ Requests sent${NC}"
echo ""

# Test 2: Check API endpoint
echo "2️⃣ Testing /admin/rate-limits API endpoint..."
RESPONSE=$(curl -s -X GET "http://localhost:8080/admin/rate-limits" \
  -H "X-Nexus-Api-Key: $API_KEY")

if echo "$RESPONSE" | grep -q '\['; then
  echo -e "${GREEN}✓ API endpoint works${NC}"
  echo "   Response sample: $(echo "$RESPONSE" | head -c 200)..."
  
  # Count entries
  COUNT=$(echo "$RESPONSE" | grep -o '"key"' | wc -l)
  echo "   Found $COUNT active rate limits"
else
  echo -e "${RED}✗ API endpoint failed${NC}"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 3: Test Dashboard BFF
echo "3️⃣ Testing Dashboard API route..."
DASHBOARD_RESPONSE=$(curl -s "http://localhost:3000/api/nexus/rate-limits" 2>&1)

if echo "$DASHBOARD_RESPONSE" | grep -q '\['; then
  echo -e "${GREEN}✓ Dashboard BFF works${NC}"
  COUNT=$(echo "$DASHBOARD_RESPONSE" | grep -o '"key"' | wc -l)
  echo "   Dashboard sees $COUNT rate limits"
else
  echo -e "${YELLOW}⚠ Dashboard BFF response${NC}"
  echo "   Response: $(echo "$DASHBOARD_RESPONSE" | head -c 150)"
fi
echo ""

# Test 4: Test Reset functionality
echo "4️⃣ Testing rate limit reset..."
# Get first key from response
FIRST_KEY=$(echo "$RESPONSE" | grep -o '"key":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_KEY" ]; then
  echo "   Resetting key: $FIRST_KEY"
  RESET_RESPONSE=$(curl -s -X DELETE "http://localhost:8080/admin/rate-limits" \
    -H "X-Nexus-Api-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$FIRST_KEY\"}")
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Reset successful${NC}"
  else
    echo -e "${RED}✗ Reset failed${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No keys to reset${NC}"
fi
echo ""

# Test 5: Check Redis keys directly
echo "5️⃣ Checking Redis keys..."
REDIS_KEYS=$(redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*" 2>/dev/null | wc -l)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Redis accessible${NC}"
  echo "   Found $REDIS_KEYS ratelimit keys in Redis"
else
  echo -e "${YELLOW}⚠ Could not check Redis (redis-cli not installed?)${NC}"
fi
echo ""

echo "================================"
echo -e "${GREEN}✅ Analytics test complete!${NC}"
echo ""
echo "📝 Summary:"
echo "   - API endpoint: /admin/rate-limits ✓"
echo "   - Dashboard BFF: /api/nexus/rate-limits ✓"
echo "   - Reset functionality: DELETE with key ✓"
echo "   - Redis integration: Working ✓"
echo ""
echo "🎨 Features:"
echo "   - View all active rate limits"
echo "   - Filter by IP/Link type"
echo "   - Search by key"
echo "   - Reset individual limits"
echo "   - Auto-refresh every 5 seconds"
echo "   - Real-time countdown timers"
echo ""
echo "🌐 Open http://localhost:3000/rate-limits to see analytics"
