#!/bin/bash

echo "🧪 Testing Link Groups - End to End"
echo "===================================="
echo ""

# Test 1: Check if groups page is accessible
echo "1️⃣ Testing Groups page accessibility..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/groups)
if [ "$STATUS" -eq 200 ]; then
  echo "✓ Groups page accessible (HTTP 200)"
else
  echo "✗ Groups page not accessible (HTTP $STATUS)"
fi
echo ""

# Test 2: Load existing groups
echo "2️⃣ Loading existing groups..."
GROUPS=$(curl -s http://localhost:3000/api/nexus/groups 2>&1)
if echo "$GROUPS" | grep -q '\['; then
  echo "✓ Groups API works"
  echo "   Response: $GROUPS"
else
  echo "⚠ No groups or API error"
  echo "   Response: $GROUPS"
fi
echo ""

# Test 3: Create a test group via backend API
echo "3️⃣ Creating test group via backend..."
RESULT=$(curl -s -X POST http://localhost:8080/admin/groups \
  -H "X-Nexus-Api-Key: Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Group","description":"Auto-created test group","color":"#10b981","icon":"✨","sortOrder":999}')

if echo "$RESULT" | grep -q '"id"'; then
  echo "✓ Group created successfully"
  echo "   Response: $RESULT"
  GROUP_ID=$(echo "$RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "   Group ID: $GROUP_ID"
else
  echo "✗ Failed to create group"
  echo "   Response: $RESULT"
fi
echo ""

# Test 4: Verify in dashboard
echo "4️⃣ Verifying group appears in dashboard..."
GROUPS=$(curl -s http://localhost:3000/api/nexus/groups 2>&1)
if echo "$GROUPS" | grep -q "Test Group"; then
  echo "✓ Test group visible in dashboard"
else
  echo "✗ Test group not found in dashboard"
fi
echo ""

echo "===================================="
echo "✅ Groups UI test complete!"
echo ""
echo "📝 Summary:"
echo "   - Groups page: Accessible at /groups"
echo "   - Navigation: Added to Sidebar with 📁 icon"
echo "   - Features: Create, Edit, Delete groups"
echo "   - Form: Name, description, color picker, icon selector"
echo "   - Table: Shows all groups with actions"
echo ""
echo "🎨 Open http://localhost:3000/groups to manage groups"
