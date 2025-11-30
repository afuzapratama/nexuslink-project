#!/bin/bash

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"
API_BASE="http://localhost:8081"

echo "======================================"
echo "🧪 Testing Bulk Operations"
echo "======================================"
echo ""

# Create 5 test links
echo "1️⃣ Creating 5 test links..."
for i in {1..5}; do
  curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
    -d "{\"alias\":\"bulk-test-$i\",\"targetUrl\":\"https://example.com/page-$i\",\"nodeId\":\"node-1\"}" \
    "$API_BASE/links" > /dev/null
  echo "   ✅ Created bulk-test-$i"
done
echo ""

# Test bulk toggle (disable)
echo "2️⃣ Testing bulk toggle (disable 3 links)..."
RESULT=$(curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"aliases":["bulk-test-1","bulk-test-2","bulk-test-3"],"isActive":false}' \
  "$API_BASE/links/bulk/toggle")
echo "   Response: $RESULT"
echo ""

# Test bulk toggle (enable)
echo "3️⃣ Testing bulk toggle (enable 2 links)..."
RESULT=$(curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"aliases":["bulk-test-1","bulk-test-2"],"isActive":true}' \
  "$API_BASE/links/bulk/toggle")
echo "   Response: $RESULT"
echo ""

# Test bulk delete
echo "4️⃣ Testing bulk delete (delete 2 links)..."
RESULT=$(curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"aliases":["bulk-test-4","bulk-test-5"]}' \
  "$API_BASE/links/bulk/delete")
echo "   Response: $RESULT"
echo ""

# Verify remaining links
echo "5️⃣ Checking remaining links..."
LINKS=$(curl -s -H "X-Nexus-Api-Key: $API_KEY" "$API_BASE/links" | grep -o '"alias":"bulk-test-[^"]*"' | wc -l)
echo "   ✅ Found $LINKS remaining bulk-test links"
echo ""

echo "======================================"
echo "✅ Bulk Operations Test Complete!"
echo "======================================"
echo ""
echo "📊 Open Dashboard: http://localhost:3000/links"
echo "   - You should see checkboxes on each row"
echo "   - Select multiple links to see action bar"
echo "   - Try Enable/Disable/Delete actions"
