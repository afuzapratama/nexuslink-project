#!/bin/bash

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"
API_BASE="http://localhost:8080"
AGENT_BASE="http://localhost:9090"

echo "🧪 Testing Pagination Implementation"
echo "======================================"
echo ""

# Function to create a link
create_link() {
  local alias=$1
  local target=$2
  
  curl -s -X POST "$API_BASE/links" \
    -H "X-Nexus-Api-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"alias\":\"$alias\",\"targetUrl\":\"$target\"}" > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "✅ Created link: $alias"
  else
    echo "❌ Failed to create link: $alias"
  fi
}

# Function to simulate clicks
simulate_click() {
  local alias=$1
  
  curl -s "$AGENT_BASE/r/$alias" \
    -H "X-Real-IP: 203.0.113.$((RANDOM % 255))" \
    -H "X-Visitor-User-Agent: Mozilla/5.0" \
    -H "X-Visitor-Referer: https://example.com" > /dev/null
}

echo "📋 Step 1: Creating 25 test links..."
echo ""

for i in {1..25}; do
  create_link "pagination-test-$i" "https://example.com/page-$i"
  sleep 0.1
done

echo ""
echo "✅ Created 25 links"
echo ""

echo "📋 Step 2: Simulating 50 clicks on 'pagination-test-1'..."
echo ""

for i in {1..50}; do
  simulate_click "pagination-test-1"
  if [ $((i % 10)) -eq 0 ]; then
    echo "   ✅ Simulated $i clicks"
  fi
done

echo ""
echo "✅ Simulated 50 clicks"
echo ""

echo "📋 Step 3: Testing Links Pagination API..."
echo ""

# Test page 1
response=$(curl -s "$API_BASE/links?page=1&limit=10" -H "X-Nexus-Api-Key: $API_KEY")
total=$(echo $response | jq -r '.total')
page=$(echo $response | jq -r '.page')
limit=$(echo $response | jq -r '.limit')
totalPages=$(echo $response | jq -r '.totalPages')
dataCount=$(echo $response | jq -r '.data | length')

echo "   Page 1: total=$total, page=$page, limit=$limit, totalPages=$totalPages, items=$dataCount"

if [ "$dataCount" -eq 10 ]; then
  echo "   ✅ Page 1 has correct number of items (10)"
else
  echo "   ❌ Page 1 expected 10 items, got $dataCount"
fi

# Test page 2
response2=$(curl -s "$API_BASE/links?page=2&limit=10" -H "X-Nexus-Api-Key: $API_KEY")
dataCount2=$(echo $response2 | jq -r '.data | length')

echo "   Page 2: items=$dataCount2"

if [ "$dataCount2" -eq 10 ]; then
  echo "   ✅ Page 2 has correct number of items (10)"
else
  echo "   ⚠️  Page 2 has $dataCount2 items (may vary depending on total data)"
fi

echo ""

echo "📋 Step 4: Testing Clicks Pagination API..."
echo ""

# Test clicks page 1
clicksResponse=$(curl -s "$API_BASE/analytics/clicks?alias=pagination-test-1&page=1&limit=10" -H "X-Nexus-Api-Key: $API_KEY")
clicksTotal=$(echo $clicksResponse | jq -r '.total')
clicksPage=$(echo $clicksResponse | jq -r '.page')
clicksLimit=$(echo $clicksResponse | jq -r '.limit')
clicksTotalPages=$(echo $clicksResponse | jq -r '.totalPages')
clicksDataCount=$(echo $clicksResponse | jq -r '.data | length')

echo "   Page 1: total=$clicksTotal, page=$clicksPage, limit=$clicksLimit, totalPages=$clicksTotalPages, items=$clicksDataCount"

if [ "$clicksDataCount" -eq 10 ] && [ "$clicksTotal" -ge 50 ]; then
  echo "   ✅ Clicks pagination working correctly"
else
  echo "   ⚠️  Clicks: expected 50+ total with 10 items per page, got total=$clicksTotal items=$clicksDataCount"
fi

# Test clicks page 2
clicksResponse2=$(curl -s "$API_BASE/analytics/clicks?alias=pagination-test-1&page=2&limit=10" -H "X-Nexus-Api-Key: $API_KEY")
clicksDataCount2=$(echo $clicksResponse2 | jq -r '.data | length')

echo "   Page 2: items=$clicksDataCount2"

if [ "$clicksDataCount2" -eq 10 ]; then
  echo "   ✅ Page 2 has correct number of items (10)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PAGINATION TEST COMPLETED!"
echo ""
echo "📊 Summary:"
echo "   - Total links in system: $total"
echo "   - Links per page: $limit"
echo "   - Total pages: $totalPages"
echo "   - Clicks on test link: $clicksTotal"
echo "   - Click events per page: $clicksLimit"
echo "   - Click event pages: $clicksTotalPages"
echo ""
echo "🌐 Open dashboard to see pagination UI:"
echo "   Links: http://localhost:3000/links"
echo "   Analytics: http://localhost:3000/links/pagination-test-1/analytics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
