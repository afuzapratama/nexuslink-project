#!/bin/bash

echo "🚀 NexusLink Full System Test"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo "📊 Checking Services..."
echo ""

API_PORT=8080
AGENT_PORT=9090
REDIS_PORT=6379
DYNAMO_PORT=8000

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✓${NC} Port $1: Running"
        return 0
    else
        echo -e "${RED}✗${NC} Port $1: Not Running"
        return 1
    fi
}

check_port $API_PORT && API_OK=1 || API_OK=0
check_port $AGENT_PORT && AGENT_OK=1 || AGENT_OK=0
check_port $REDIS_PORT && REDIS_OK=1 || REDIS_OK=0
check_port $DYNAMO_PORT && DYNAMO_OK=1 || DYNAMO_OK=0

echo ""

if [ $API_OK -eq 0 ] || [ $AGENT_OK -eq 0 ]; then
    echo -e "${RED}✗ Services not ready. Please start API and Agent first.${NC}"
    echo ""
    echo "To start services:"
    echo "  Terminal 1: cd /home/natama/Projects/nexuslink && go run ./cmd/api/main.go"
    echo "  Terminal 2: cd /home/natama/Projects/nexuslink && go run ./cmd/agent/main.go"
    exit 1
fi

if [ $REDIS_OK -eq 0 ] || [ $DYNAMO_OK -eq 0 ]; then
    echo -e "${YELLOW}⚠ Docker services not running${NC}"
    echo "  Run: cd /home/natama/Projects/nexuslink && docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✓ All services running!${NC}"
echo ""

# Clear Redis
echo "🧹 Clearing Redis rate limit data..."
redis-cli -a devpass FLUSHDB >/dev/null 2>&1
echo ""

# Test 1: Create test link
echo "📝 Test 1: Creating test link..."
RESPONSE=$(curl -s -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "rl-test",
    "targetUrl": "https://example.com",
    "nodeId": "",
    "isActive": true
  }')

if echo "$RESPONSE" | grep -q "rl-test"; then
    echo -e "${GREEN}✓${NC} Link created successfully"
else
    echo -e "${RED}✗${NC} Failed to create link"
    echo "$RESPONSE"
    exit 1
fi
echo ""

# Test 2: Normal redirects (first 5 requests)
echo "🔀 Test 2: Testing redirects with rate limiting..."
for i in {1..5}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/r/rl-test)
    REMAINING=$(curl -s -I http://localhost:9090/r/rl-test 2>/dev/null | grep -i "x-ratelimit-remaining" | awk '{print $2}' | tr -d '\r')
    
    if [ "$RESPONSE" == "302" ] || [ "$RESPONSE" == "307" ]; then
        echo -e "  Request $i: ${GREEN}HTTP $RESPONSE${NC} (Remaining: $REMAINING)"
    else
        echo -e "  Request $i: ${YELLOW}HTTP $RESPONSE${NC} (Remaining: $REMAINING)"
    fi
done
echo ""

# Test 3: Hit rate limit (make 60 more requests)
echo "⚡ Test 3: Testing rate limit (60 req/min)..."
SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

for i in {1..65}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/r/rl-test)
    
    if [ "$HTTP_CODE" == "429" ]; then
        RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
        if [ $RATE_LIMITED_COUNT -eq 1 ]; then
            echo -e "  ${YELLOW}⚠ Rate limit triggered at request $i${NC}"
        fi
    else
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
done

echo ""
echo "📊 Results:"
echo -e "  Success: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "  Rate Limited (429): ${RED}$RATE_LIMITED_COUNT${NC}"
echo ""

if [ $RATE_LIMITED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Rate limiting is working!${NC}"
else
    echo -e "${RED}✗ Rate limiting not triggered${NC}"
fi

echo ""

# Test 4: Check Redis keys
echo "🔍 Test 4: Checking Redis keys..."
KEY_COUNT=$(redis-cli -a devpass --scan --pattern "ratelimit:*" 2>/dev/null | wc -l)
echo -e "  Redis keys created: ${GREEN}$KEY_COUNT${NC}"
echo ""

# Test 5: Check rate limit headers
echo "📋 Test 5: Checking rate limit headers..."
HEADERS=$(curl -s -I http://localhost:9090/r/rl-test 2>/dev/null)
LIMIT=$(echo "$HEADERS" | grep -i "x-ratelimit-limit" | awk '{print $2}' | tr -d '\r')
REMAINING=$(echo "$HEADERS" | grep -i "x-ratelimit-remaining" | awk '{print $2}' | tr -d '\r')
RESET=$(echo "$HEADERS" | grep -i "x-ratelimit-reset" | awk '{print $2}' | tr -d '\r')

echo "  X-RateLimit-Limit: $LIMIT"
echo "  X-RateLimit-Remaining: $REMAINING"
echo "  X-RateLimit-Reset: $RESET"
echo ""

if [ -n "$LIMIT" ] && [ -n "$REMAINING" ]; then
    echo -e "${GREEN}✓ Rate limit headers present${NC}"
else
    echo -e "${RED}✗ Rate limit headers missing${NC}"
fi

echo ""
echo "🎉 Test Complete!"
