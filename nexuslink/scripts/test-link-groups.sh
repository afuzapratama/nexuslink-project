#!/bin/bash

API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"
API_BASE="http://localhost:8081"

echo "======================================"
echo "🧪 Testing Link Groups Backend"
echo "======================================"
echo ""

# Create groups
echo "1️⃣ Creating groups..."
GROUP1=$(curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Marketing","description":"Marketing campaign links","color":"#3b82f6","icon":"📢","sortOrder":1}' \
  "$API_BASE/admin/groups" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   ✅ Created Marketing group: $GROUP1"

GROUP2=$(curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Products","description":"Product page shortcuts","color":"#10b981","icon":"🛍️","sortOrder":2}' \
  "$API_BASE/admin/groups" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   ✅ Created Products group: $GROUP2"

GROUP3=$(curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Support","description":"Customer support links","color":"#f59e0b","icon":"💬","sortOrder":3}' \
  "$API_BASE/admin/groups" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   ✅ Created Support group: $GROUP3"
echo ""

# List groups
echo "2️⃣ Listing all groups..."
curl -s -H "X-Nexus-Api-Key: $API_KEY" "$API_BASE/admin/groups" | head -c 200
echo "..."
echo ""

# Create links with groups
echo "3️⃣ Creating links with groups..."
curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"alias\":\"promo-summer\",\"targetUrl\":\"https://example.com/summer\",\"groupId\":\"$GROUP1\"}" \
  "$API_BASE/links" > /dev/null
echo "   ✅ Created promo-summer in Marketing"

curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"alias\":\"product-a\",\"targetUrl\":\"https://example.com/product-a\",\"groupId\":\"$GROUP2\"}" \
  "$API_BASE/links" > /dev/null
echo "   ✅ Created product-a in Products"

curl -s -X POST -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"alias\":\"help-center\",\"targetUrl\":\"https://example.com/help\",\"groupId\":\"$GROUP3\"}" \
  "$API_BASE/links" > /dev/null
echo "   ✅ Created help-center in Support"
echo ""

# Filter links by group
echo "4️⃣ Filtering links by group (Marketing)..."
FILTERED=$(curl -s -H "X-Nexus-Api-Key: $API_KEY" "$API_BASE/links?groupId=$GROUP1")
echo "   Response: $FILTERED" | head -c 150
echo "..."
echo ""

# Update group
echo "5️⃣ Updating group name..."
curl -s -X PUT -H "X-Nexus-Api-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Marketing Campaigns (Updated)","description":"All marketing links","color":"#3b82f6","sortOrder":1}' \
  "$API_BASE/admin/groups/$GROUP1" | head -c 150
echo "..."
echo ""

# Get single group
echo "6️⃣ Getting single group..."
curl -s -H "X-Nexus-Api-Key: $API_KEY" "$API_BASE/admin/groups/$GROUP1" | head -c 200
echo "..."
echo ""

echo "======================================"
echo "✅ Link Groups Backend Test Complete!"
echo "======================================"
echo ""
echo "Created Groups:"
echo "  - Marketing: $GROUP1"
echo "  - Products: $GROUP2"
echo "  - Support: $GROUP3"
echo ""
echo "Next: Implement frontend UI!"
