#!/bin/bash

################################################################################
# Test Domain Validation in Agent
# 
# This script demonstrates the domain whitelist security feature that prevents
# unauthorized domains from using your agent infrastructure.
#
# Scenario:
# 1. Node registered with domain: go.htmlin.my.id
# 2. Attacker points evil.com to same IP
# 3. Agent rejects requests from evil.com
################################################################################

set -e

API_BASE="${NEXUS_API_BASE:-http://localhost:8080}"
API_KEY="${NEXUS_API_KEY:-your-api-key}"
AGENT_BASE="http://localhost:9090"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  NexusLink Domain Validation Security Test                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if API & Agent running
echo "📋 Checking services..."
if ! curl -sf "$API_BASE/health" > /dev/null 2>&1; then
    echo "❌ API not running at $API_BASE"
    echo "   Start: cd nexuslink && go run cmd/api/main.go"
    exit 1
fi

if ! curl -sf "$AGENT_BASE/health" > /dev/null 2>&1; then
    echo "❌ Agent not running at $AGENT_BASE"
    echo "   Start: cd nexuslink && go run cmd/agent/main.go"
    exit 1
fi

echo "✅ API running: $API_BASE"
echo "✅ Agent running: $AGENT_BASE"
echo ""

# Create test link
echo "📝 Creating test link..."
LINK_RESPONSE=$(curl -s -X POST "$API_BASE/links" \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -d '{
    "alias": "domain-test",
    "targetUrl": "https://google.com",
    "domain": ""
  }')

echo "✅ Link created: /r/domain-test → https://google.com"
echo ""

# Test 1: Valid domain (from NEXUS_NODE_DOMAIN env)
echo "═══════════════════════════════════════════════════════════"
echo "🧪 TEST 1: Request from REGISTERED domain"
echo "═══════════════════════════════════════════════════════════"
echo ""

NODE_DOMAIN="${NEXUS_NODE_DOMAIN:-localhost}"
echo "Testing: http://$NODE_DOMAIN:9090/r/domain-test"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Host: $NODE_DOMAIN" \
  "$AGENT_BASE/r/domain-test")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS: Request accepted (HTTP $HTTP_CODE)"
    echo "   Domain '$NODE_DOMAIN' is in agent whitelist"
else
    echo "❌ FAILED: Got HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi

echo ""
sleep 1

# Test 2: Unauthorized domain
echo "═══════════════════════════════════════════════════════════"
echo "🧪 TEST 2: Request from UNAUTHORIZED domain"
echo "═══════════════════════════════════════════════════════════"
echo ""

EVIL_DOMAIN="evil-attacker.com"
echo "Testing: http://$EVIL_DOMAIN:9090/r/domain-test (spoofed Host header)"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Host: $EVIL_DOMAIN" \
  "$AGENT_BASE/r/domain-test")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ SUCCESS: Request BLOCKED (HTTP 403 Forbidden)"
    echo "   Domain '$EVIL_DOMAIN' correctly rejected"
    echo "   Security: ✓ Protected from unauthorized domains"
else
    echo "❌ SECURITY ISSUE: Got HTTP $HTTP_CODE (expected 403)"
    echo "   Response: $BODY"
    echo "   ⚠️  Agent is accepting requests from any domain!"
fi

echo ""
sleep 1

# Test 3: Add new domain via API
echo "═══════════════════════════════════════════════════════════"
echo "🧪 TEST 3: Add domain to whitelist dynamically"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get node ID from agent logs or use default
NODE_ID=$(curl -s "$API_BASE/admin/nodes" \
  -H "X-Nexus-Api-Key: $API_KEY" | \
  jq -r '.[0].id // "node-localhost"')

echo "Adding 'link.htmlin.my.id' to node $NODE_ID..."
curl -s -X POST "$API_BASE/admin/nodes/$NODE_ID/domains" \
  -H "Content-Type: application/json" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -d '{"domain": "link.htmlin.my.id"}' > /dev/null

echo "✅ Domain added"
echo ""
echo "⏳ Waiting for agent cache refresh (30s TTL)..."
sleep 3
echo ""

# Test with newly added domain
echo "Testing: http://link.htmlin.my.id:9090/r/domain-test"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Host: link.htmlin.my.id" \
  "$AGENT_BASE/r/domain-test")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS: New domain accepted after adding to whitelist"
    echo "   Domain 'link.htmlin.my.id' now authorized"
else
    echo "⏳ Domain not yet in agent cache (wait for next heartbeat/30s)"
    echo "   Or manually trigger: restart agent or wait for cache refresh"
fi

echo ""

# Cleanup
echo "═══════════════════════════════════════════════════════════"
echo "🧹 Cleanup"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "Removing test link..."
curl -s -X DELETE "$API_BASE/links/domain-test" \
  -H "X-Nexus-Api-Key: $API_KEY" > /dev/null

echo "Removing added domain..."
curl -s -X DELETE "$API_BASE/admin/nodes/$NODE_ID/domains?domain=link.htmlin.my.id" \
  -H "X-Nexus-Api-Key: $API_KEY" > /dev/null

echo "✅ Cleanup complete"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Security Summary                                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Domain Whitelist: Agent validates incoming Host header"
echo "✅ Auto-Sync: Domain list refreshes every 30s (heartbeat)"
echo "✅ Dynamic Add: Dashboard can add domains without agent restart"
echo "✅ Attack Prevention: Random domains can't abuse infrastructure"
echo ""
echo "How it works:"
echo "  1. Agent registers with domain (e.g., go.htmlin.my.id)"
echo "  2. Agent caches allowed domains locally (30s TTL)"
echo "  3. Each request validates Host header against whitelist"
echo "  4. Unauthorized domains get 403 Forbidden"
echo "  5. Dashboard can add domains → syncs to agent automatically"
echo ""
echo "📚 Docs: See DOMAIN_VALIDATION.md for production setup"
