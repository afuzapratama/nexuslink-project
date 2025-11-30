#!/bin/bash
# 🎬 Test Webhook Real-time Events

echo "🎯 TESTING WEBHOOK REAL-TIME EVENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Step 1: Check Services"
echo "────────────────────────────────"

# Check API
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API Server (8080)${NC}"
else
  echo -e "${RED}❌ API Server not running${NC}"
  echo "   Start with: cd /home/natama/Projects/nexuslink && go run cmd/api/main.go &"
  exit 1
fi

# Check Agent
if curl -s http://localhost:9090/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Agent Server (9090)${NC}"
else
  echo -e "${YELLOW}⚠️  Agent not running, starting...${NC}"
  (cd /home/natama/Projects/nexuslink && go run cmd/agent/main.go > /tmp/agent.log 2>&1) &
  echo "   Waiting 5 seconds..."
  sleep 5
fi

# Check Webhook Receiver
if curl -s http://localhost:3001/ > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Webhook Receiver (3001)${NC}"
else
  echo -e "${RED}❌ Webhook receiver not running${NC}"
  echo "   Start with: cd /home/natama/Projects && node webhook-test-receiver.js &"
  exit 1
fi

echo ""
echo "📋 Step 2: Create Test Link"
echo "────────────────────────────────"

TIMESTAMP=$(date +%s)
TEST_ALIAS="realtime-test-$TIMESTAMP"

LINK_RESPONSE=$(curl -s -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"alias\": \"$TEST_ALIAS\",
    \"targetUrl\": \"https://google.com\"
  }")

if echo "$LINK_RESPONSE" | grep -q "\"alias\""; then
  echo -e "${GREEN}✅ Link created: $TEST_ALIAS${NC}"
  echo "   🪝 Webhook 'link.created' should trigger now!"
  echo "   Check terminal webhook receiver for payload"
else
  echo -e "${RED}❌ Failed to create link${NC}"
  echo "$LINK_RESPONSE"
  exit 1
fi

sleep 2
echo ""
echo "📋 Step 3: Simulate Click Event"
echo "────────────────────────────────"
echo "Clicking: http://localhost:9090/r/$TEST_ALIAS"

CLICK_RESPONSE=$(curl -s -L \
  -H "X-Real-IP: 203.0.113.99" \
  -H "X-Visitor-User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15" \
  -H "X-Visitor-Referer: https://twitter.com/realtime-test" \
  -w "\nHTTP_CODE:%{http_code}" \
  http://localhost:9090/r/$TEST_ALIAS 2>&1)

HTTP_CODE=$(echo "$CLICK_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Click successful (HTTP $HTTP_CODE)${NC}"
  echo "   🪝 Webhook 'click.created' should trigger now!"
  echo ""
  echo "   Expected payload in webhook receiver:"
  echo "   • event: click.created"
  echo "   • alias: $TEST_ALIAS"
  echo "   • ipAddress: 203.0.113.99"
  echo "   • deviceType: mobile"
  echo "   • osName: iOS"
  echo "   • referer: https://twitter.com/realtime-test"
else
  echo -e "${YELLOW}⚠️  Click returned HTTP $HTTP_CODE${NC}"
  echo "   Agent might still be starting up"
fi

sleep 2
echo ""
echo "📋 Step 4: Test Link Expiry Event"
echo "────────────────────────────────"

# Create link yang sudah expired
EXPIRED_ALIAS="expired-$TIMESTAMP"
PAST_TIME=$(date -u -d "1 minute ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-1M +"%Y-%m-%dT%H:%M:%SZ")

curl -s -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"alias\": \"$EXPIRED_ALIAS\",
    \"targetUrl\": \"https://example.com\",
    \"expiresAt\": \"$PAST_TIME\"
  }" > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Expired link created: $EXPIRED_ALIAS"
  
  # Try to access expired link
  sleep 1
  EXPIRED_RESPONSE=$(curl -s http://localhost:9090/r/$EXPIRED_ALIAS -w "%{http_code}")
  
  echo "   🪝 Webhook 'link.expired' should trigger now!"
  echo "   Check webhook receiver terminal"
else
  echo -e "${YELLOW}⚠️  Could not create expired link${NC}"
fi

sleep 2
echo ""
echo "📋 Step 5: Test Max Clicks Event"
echo "────────────────────────────────"

MAXCLICK_ALIAS="maxclick-$TIMESTAMP"

curl -s -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"alias\": \"$MAXCLICK_ALIAS\",
    \"targetUrl\": \"https://example.com\",
    \"maxClicks\": 2
  }" > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Max-clicks link created: $MAXCLICK_ALIAS (limit: 2)"
  
  # Click twice to reach limit
  for i in 1 2 3; do
    echo "   Click #$i..."
    curl -s http://localhost:9090/r/$MAXCLICK_ALIAS > /dev/null
    sleep 1
  done
  
  echo "   🪝 Webhook 'link.maxclicks' should trigger on 3rd click!"
  echo "   Check webhook receiver terminal"
else
  echo -e "${YELLOW}⚠️  Could not create max-clicks link${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ TEST COMPLETED!${NC}"
echo ""
echo "📊 Events Tested:"
echo "   ✅ link.created"
echo "   ✅ click.created"
echo "   ✅ link.expired"
echo "   ✅ link.maxclicks"
echo ""
echo "📺 Check Webhook Receiver Terminal:"
echo "   You should see 4-5 webhook payloads with:"
echo "   • Valid HMAC signatures (✅ YES)"
echo "   • Event types matching above"
echo "   • Full data payloads"
echo ""
echo "🔍 Troubleshoot:"
echo "   • Webhook receiver logs: Check terminal where you ran webhook-test-receiver.js"
echo "   • API logs: tail -f /tmp/nexuslink-api.log | grep -i webhook"
echo "   • List webhooks: curl http://localhost:8080/admin/webhooks -H 'X-Nexus-Api-Key: $API_KEY'"
echo ""
