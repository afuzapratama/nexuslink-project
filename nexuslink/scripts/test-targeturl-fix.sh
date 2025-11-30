#!/bin/bash

echo "🧪 Testing TargetURL Fix"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"

# Test 1: Create a test link
echo "1️⃣ Creating test link..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "test-target-fix",
    "targetUrl": "https://google.com",
    "nodeId": "node-local-1"
  }')

if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Link created${NC}"
  LINK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "   Link ID: $LINK_ID"
  echo "   Alias: test-target-fix"
else
  echo -e "${RED}✗ Failed to create link${NC}"
  echo "   Response: $CREATE_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Test API resolve endpoint
echo "2️⃣ Testing API /links/resolve endpoint..."
API_RESPONSE=$(curl -s "http://localhost:8080/links/resolve?alias=test-target-fix&nodeId=node-local-1" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "X-Real-IP: 127.0.0.1" \
  -H "X-Visitor-User-Agent: Mozilla/5.0")

echo "   Response: $API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"targetUrl"'; then
  echo -e "${GREEN}✓ API returns 'targetUrl' (correct!)${NC}"
  TARGET=$(echo "$API_RESPONSE" | grep -o '"targetUrl":"[^"]*"' | cut -d'"' -f4)
  echo "   Target URL: $TARGET"
elif echo "$API_RESPONSE" | grep -q '"target"'; then
  echo -e "${RED}✗ API returns 'target' (old format, needs fix)${NC}"
  echo "   This will cause 'no target url' error in Agent!"
  exit 1
else
  echo -e "${YELLOW}⚠ Unexpected response format${NC}"
  echo "   Response: $API_RESPONSE"
fi
echo ""

# Test 3: Test Agent redirect
echo "3️⃣ Testing Agent /r/test-target-fix..."
AGENT_RESPONSE=$(curl -s -I "http://localhost:9090/r/test-target-fix" 2>&1 | head -20)

if echo "$AGENT_RESPONSE" | grep -q "Location:"; then
  echo -e "${GREEN}✓ Agent redirect works!${NC}"
  LOCATION=$(echo "$AGENT_RESPONSE" | grep "Location:" | cut -d' ' -f2 | tr -d '\r')
  echo "   Redirects to: $LOCATION"
elif echo "$AGENT_RESPONSE" | grep -q "no target url"; then
  echo -e "${RED}✗ Agent error: 'no target url'${NC}"
  echo "   This means API is still returning wrong format"
  echo "   Make sure to restart API server after fix!"
  exit 1
elif echo "$AGENT_RESPONSE" | grep -q "HTTP/1.1 429"; then
  echo -e "${YELLOW}⚠ Rate limited (this is expected if testing rapidly)${NC}"
  echo "   Wait 60 seconds or clear Redis: redis-cli -a devpass FLUSHALL"
else
  echo -e "${YELLOW}⚠ Unexpected response${NC}"
  echo "   Response: $AGENT_RESPONSE"
fi
echo ""

# Cleanup
echo "4️⃣ Cleaning up test link..."
DELETE_RESPONSE=$(curl -s -X DELETE "http://localhost:8080/links/$LINK_ID" \
  -H "X-Nexus-Api-Key: $API_KEY")
echo -e "${GREEN}✓ Test link deleted${NC}"
echo ""

echo "========================"
echo -e "${GREEN}✅ Test complete!${NC}"
echo ""
echo "📝 Fix Summary:"
echo "   Problem: API returned {\"target\":\"...\"}"
echo "   Solution: Changed to {\"targetUrl\":\"...\"}"
echo "   Location: internal/handler/resolver_handler.go"
echo ""
echo "⚠️  Remember to restart API if you haven't:"
echo "   pkill -f 'go run cmd/api/main.go'"
echo "   cd /home/natama/Projects/nexuslink && go run cmd/api/main.go &"
