#!/bin/bash
# 🎬 Demo Lengkap Webhook NexusLink

echo "🚀 DEMO WEBHOOK NEXUSLINK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Config
API_KEY="Vd9ULgpCq50sXxsF9d1yZmIUnKV2bqqb"
WEBHOOK_ID="fac10973-873f-448b-8f21-ceaa5083af61"

echo "📋 Step 1: Check Services Status"
echo "────────────────────────────────"
echo -n "API (8080): "
curl -s http://localhost:8080/health && echo " ✅" || echo " ❌"

echo -n "Agent (9090): "
curl -s http://localhost:9090/health > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Dashboard (3000): "
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✅" || echo "❌"

echo -n "Webhook Receiver (3001): "
curl -s http://localhost:3001 > /dev/null 2>&1 && echo "✅" || echo "❌"
echo ""

echo "📋 Step 2: View Existing Webhook"
echo "────────────────────────────────"
curl -s http://localhost:8080/admin/webhooks \
  -H "X-Nexus-Api-Key: $API_KEY" | \
  grep -o '"id":"[^"]*","url":"[^"]*","events":\[[^]]*\]' | \
  sed 's/"id":"\([^"]*\)","url":"\([^"]*\)","events":\(\[[^]]*\]\)/ID: \1\nURL: \2\nEvents: \3/' | head -6
echo ""

echo "📋 Step 3: Test Webhook Manually"
echo "────────────────────────────────"
echo "Sending test webhook..."
curl -s -X POST http://localhost:8080/admin/webhooks/$WEBHOOK_ID/test \
  -H "X-Nexus-Api-Key: $API_KEY" | grep -o '"message":"[^"]*"' | sed 's/"message":"//' | sed 's/"$//'
echo ""
sleep 2

echo "📋 Step 4: Create Link for Real Event Test"
echo "────────────────────────────────"
LINK_ALIAS="demo-$(date +%s)"
echo "Creating link: $LINK_ALIAS"
curl -s -X POST http://localhost:8080/links \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"alias\":\"$LINK_ALIAS\",\"targetUrl\":\"https://google.com\"}" | \
  grep -o '"alias":"[^"]*"' | sed 's/"alias":"/Alias: /' | sed 's/"$//'
echo ""

echo "📋 Step 5: Simulate Click (Trigger Webhook)"
echo "────────────────────────────────"
echo "Clicking link: http://localhost:9090/r/$LINK_ALIAS"
HTTP_CODE=$(curl -L \
  -H "X-Real-IP: 203.0.113.42" \
  -H "X-Visitor-User-Agent: Mozilla/5.0 (iPhone)" \
  -H "X-Visitor-Referer: https://twitter.com/demo" \
  "http://localhost:9090/r/$LINK_ALIAS" \
  -o /dev/null -s -w "%{http_code}")

if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Click successful (HTTP $HTTP_CODE)"
  echo "🪝 Webhook should be triggered now!"
  echo ""
  echo "Check webhook receiver terminal for:"
  echo "  📨 WEBHOOK RECEIVED"
  echo "  📋 Event Type: click.created"
  echo "  📦 Data: alias=$LINK_ALIAS, ipAddress=203.0.113.42"
else
  echo "❌ Click failed (HTTP $HTTP_CODE)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEMO SELESAI!"
echo ""
echo "📚 Dokumentasi Lengkap:"
echo "   - WEBHOOK_TUTORIAL.md (use cases & examples)"
echo "   - QUICK_START_WEBHOOK.md (step-by-step guide)"
echo ""
echo "🎯 Next Steps:"
echo "   1. Buka http://localhost:3000/webhooks (manage webhooks)"
echo "   2. Check terminal webhook receiver (see payloads)"
echo "   3. Test events lain: link.expired, link.maxclicks, node.offline"
echo ""
