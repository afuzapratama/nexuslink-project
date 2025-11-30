#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Rate Limit Analytics - Traffic Generator${NC}"
echo "=============================================="
echo ""

# Configuration
AGENT_URL="http://localhost:9090"
ALIAS="test-link"
DEFAULT_COUNT=30

# Get count from argument or use default
COUNT=${1:-$DEFAULT_COUNT}

echo -e "${YELLOW}Configuration:${NC}"
echo "  Agent URL: $AGENT_URL"
echo "  Test Alias: $ALIAS"
echo "  Request Count: $COUNT"
echo ""

# Check if Agent is running
echo "Checking Agent availability..."
if ! curl -s -f "$AGENT_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ Agent not available at $AGENT_URL${NC}"
  echo "  Make sure Agent is running: bash scripts/start-agent.sh"
  exit 1
fi
echo -e "${GREEN}✓ Agent is running${NC}"
echo ""

# Generate traffic
echo -e "${BLUE}Generating $COUNT requests...${NC}"
echo ""

SUCCESS=0
FAILED=0
RATE_LIMITED=0

for i in $(seq 1 $COUNT); do
  # Make request and capture response code
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AGENT_URL/r/$ALIAS" 2>&1)
  
  case $HTTP_CODE in
    302|301)
      SUCCESS=$((SUCCESS + 1))
      echo -ne "\r  Progress: $i/$COUNT | ✓ $SUCCESS | ⚠ $RATE_LIMITED | ✗ $FAILED"
      ;;
    429)
      RATE_LIMITED=$((RATE_LIMITED + 1))
      echo -ne "\r  Progress: $i/$COUNT | ✓ $SUCCESS | ⚠ $RATE_LIMITED | ✗ $FAILED"
      ;;
    *)
      FAILED=$((FAILED + 1))
      echo -ne "\r  Progress: $i/$COUNT | ✓ $SUCCESS | ⚠ $RATE_LIMITED | ✗ $FAILED"
      ;;
  esac
  
  # Small delay to avoid overwhelming
  sleep 0.05
done

echo ""
echo ""

# Summary
echo "=============================================="
echo -e "${GREEN}✓ Traffic generation complete!${NC}"
echo ""
echo "Results:"
echo -e "  ${GREEN}✓ Success (redirected):${NC} $SUCCESS"
echo -e "  ${YELLOW}⚠ Rate Limited (429):${NC} $RATE_LIMITED"
echo -e "  ${RED}✗ Failed (other):${NC} $FAILED"
echo ""

# Check Redis keys
echo "Checking Redis keys..."
REDIS_KEYS=$(redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*" 2>/dev/null | wc -l)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Found $REDIS_KEYS rate limit keys in Redis${NC}"
  
  # Show some keys
  if [ $REDIS_KEYS -gt 0 ]; then
    echo ""
    echo "Sample keys:"
    redis-cli -a devpass --no-auth-warning KEYS "ratelimit:*" 2>/dev/null | head -5
  fi
else
  echo -e "${YELLOW}⚠ Could not check Redis (redis-cli not installed?)${NC}"
fi

echo ""
echo "=============================================="
echo -e "${BLUE}📊 View analytics:${NC}"
echo "   http://localhost:3000/rate-limits"
echo "   or"
echo "   http://localhost:3001/rate-limits"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - Run again to generate more data"
echo "   - Use argument for custom count: bash $0 50"
echo "   - Rate limit is ${GREEN}60 requests/minute${NC} per IP"
echo "   - Dashboard auto-refreshes every 5 seconds"
