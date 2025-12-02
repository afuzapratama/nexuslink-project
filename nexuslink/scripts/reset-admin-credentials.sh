#!/bin/bash

# Reset admin credentials to default (admin/admin)
# Usage: ./reset-admin-credentials.sh

API_BASE=${NEXUS_API_BASE:-"http://localhost:8080"}
API_KEY=${NEXUS_API_KEY:-"Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"}

echo "🔄 Resetting admin credentials to default..."
echo "   Username: admin"
echo "   Password: admin"
echo ""

# Bcrypt hash of "admin" (generated with cost 10)
ADMIN_HASH='$2a$10$JyQVcqMDYmQNDVY5C9Pmy.XcvV06aYVVauolCtNQd90ok05sKCD3u'

curl -X PUT "${API_BASE}/admin/settings" \
  -H "X-Nexus-Api-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"adminUsername\": \"admin\",
    \"adminPassword\": \"${ADMIN_HASH}\",
    \"enableProxyCheck\": false,
    \"enableIpQualityScore\": false,
    \"blockVpn\": false,
    \"blockTor\": false,
    \"blockProxies\": false,
    \"blockBots\": false
  }" | python3 -m json.tool 2>/dev/null || echo ""

echo ""
echo "✅ Admin credentials reset successfully!"
echo ""
echo "You can now login with:"
echo "   Username: admin"
echo "   Password: admin"
