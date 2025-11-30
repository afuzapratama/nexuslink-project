#!/bin/bash

# NexusLink Feature Testing Script
# Run this to verify all 4 steps are working correctly

echo "🧪 NexusLink - Testing All Features"
echo "======================================"
echo ""

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"
API_BASE="http://localhost:8080"
AGENT_BASE="http://localhost:9090"
DASHBOARD_BASE="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_code="$3"
  
  echo -n "Testing: $name... "
  
  status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" \
    -H "X-Nexus-Api-Key: $API_KEY")
  
  if [ "$status_code" = "$expected_code" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $status_code)"
    ((FAILED++))
  fi
}

test_qr_generation() {
  echo -n "Testing: QR Code Generation... "
  
  response=$(curl -s -H "X-Nexus-Api-Key: $API_KEY" \
    "$API_BASE/links/docs/qr?size=128" | file -)
  
  if echo "$response" | grep -q "PNG image data"; then
    echo -e "${GREEN}✓ PASSED${NC} (Valid PNG)"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} (Not a valid PNG)"
    ((FAILED++))
  fi
}

test_link_creation_with_advanced_features() {
  echo -n "Testing: Create Link with Expiration & Max Clicks... "
  
  # Create link with expiration 1 hour from now
  expires_at=$(date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ")
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/links" \
    -H "X-Nexus-Api-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"alias\": \"test-$(date +%s)\",
      \"targetUrl\": \"https://example.com\",
      \"expiresAt\": \"$expires_at\",
      \"maxClicks\": 100
    }")
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code)"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} (HTTP $status_code)"
    ((FAILED++))
  fi
}

echo "📋 Step 1: Testing API Endpoints"
echo "--------------------------------"
test_endpoint "Health Check" "$API_BASE/health" "200"
test_endpoint "List Links" "$API_BASE/links" "200"
test_endpoint "List Admin Nodes" "$API_BASE/admin/nodes" "200"
test_endpoint "Get Click Stats (docs)" "$API_BASE/analytics/clicks?alias=docs" "200"
echo ""

echo "📋 Step 2: Testing Advanced Features"
echo "------------------------------------"
test_qr_generation
test_link_creation_with_advanced_features
echo ""

echo "📋 Step 3: Testing Dashboard Endpoints"
echo "--------------------------------------"
test_endpoint "Dashboard Home" "$DASHBOARD_BASE/" "200"
test_endpoint "Links Page" "$DASHBOARD_BASE/links" "200"
test_endpoint "Nodes Page" "$DASHBOARD_BASE/nodes" "200"
test_endpoint "Installation Guide" "$DASHBOARD_BASE/nodes/install" "200"
test_endpoint "Settings Page" "$DASHBOARD_BASE/settings" "200"
echo ""

echo "📋 Step 4: Testing Agent Redirect"
echo "---------------------------------"
echo -n "Testing: Agent Redirect... "
status_code=$(curl -s -o /dev/null -w "%{http_code}" "$AGENT_BASE/r/docs")

if [ "$status_code" = "302" ] || [ "$status_code" = "301" ]; then
  echo -e "${GREEN}✓ PASSED${NC} (HTTP $status_code - Redirect)"
  ((PASSED++))
elif [ "$status_code" = "404" ]; then
  echo -e "${YELLOW}⚠ SKIPPED${NC} (Link 'docs' not found - create it first)"
else
  echo -e "${RED}✗ FAILED${NC} (HTTP $status_code)"
  ((FAILED++))
fi
echo ""

echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! NexusLink is working correctly.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please check the output above.${NC}"
  exit 1
fi
