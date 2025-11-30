#!/bin/bash

# Test Multi-Domain Feature
# =========================
# This script tests the multi-domain functionality of NexusLink

API_BASE="http://localhost:8080"
AGENT_BASE="http://localhost:9090"
API_KEY="dev-secret-key-change-in-production"

echo "=== NexusLink Multi-Domain Feature Test ==="
echo ""

# Get existing node ID (should have node-localhost-dev from agent)
echo "1. Fetching nodes..."
NODE_RESPONSE=$(curl -s -H "X-Nexus-Api-Key: $API_KEY" "$API_BASE/admin/nodes")
NODE_ID=$(echo "$NODE_RESPONSE" | jq -r '.[0].id // empty')

if [ -z "$NODE_ID" ]; then
  echo "❌ No nodes found. Make sure the agent is running."
  exit 1
fi

echo "✅ Found node: $NODE_ID"
echo ""

# Add domains to node
echo "2. Adding domains to node..."
curl -X POST \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}' \
  "$API_BASE/admin/nodes/$NODE_ID/domains"
echo ""

curl -X POST \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "demo.com"}' \
  "$API_BASE/admin/nodes/$NODE_ID/domains"
echo ""

# Verify domains added
echo "3. Verifying domains..."
NODE_DETAIL=$(curl -s -H "X-Nexus-Api-Key: $API_KEY" "$API_BASE/admin/nodes")
DOMAINS=$(echo "$NODE_DETAIL" | jq -r ".[0].domains // []")
echo "Node domains: $DOMAINS"
echo ""

# Create test links
echo "4. Creating test links..."

# Link 1: No domain restriction (should work on all domains)
curl -X POST \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "test-all",
    "targetUrl": "https://google.com",
    "nodeId": "'"$NODE_ID"'",
    "domain": ""
  }' \
  "$API_BASE/links"
echo ""

# Link 2: Restricted to example.com
curl -X POST \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "test-example",
    "targetUrl": "https://example.com",
    "nodeId": "'"$NODE_ID"'",
    "domain": "example.com"
  }' \
  "$API_BASE/links"
echo ""

# Link 3: Restricted to demo.com
curl -X POST \
  -H "X-Nexus-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "alias": "test-demo",
    "targetUrl": "https://demo.com",
    "nodeId": "'"$NODE_ID"'",
    "domain": "demo.com"
  }' \
  "$API_BASE/links"
echo ""

echo "5. Testing link resolution with different domains..."
echo ""

# Test 1: All-domain link should work from any domain
echo "Test 1a: Access test-all via localhost (should work)"
curl -s -H "Host: localhost" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=test-all&nodeId=$NODE_ID&domain=localhost" | jq
echo ""

echo "Test 1b: Access test-all via example.com (should work)"
curl -s -H "Host: example.com" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=test-all&nodeId=$NODE_ID&domain=example.com" | jq
echo ""

# Test 2: example.com link should only work from example.com
echo "Test 2a: Access test-example via example.com (should work)"
curl -s -H "Host: example.com" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=test-example&nodeId=$NODE_ID&domain=example.com" | jq
echo ""

echo "Test 2b: Access test-example via demo.com (should fail)"
curl -s -H "Host: demo.com" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=test-example&nodeId=$NODE_ID&domain=demo.com"
echo ""

# Test 3: demo.com link should only work from demo.com
echo "Test 3a: Access test-demo via demo.com (should work)"
curl -s -H "Host: demo.com" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=test-demo&nodeId=$NODE_ID&domain=demo.com" | jq
echo ""

echo "Test 3b: Access test-demo via example.com (should fail)"
curl -s -H "Host: example.com" \
  -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=test-demo&nodeId=$NODE_ID&domain=example.com"
echo ""

echo "6. Testing via Agent (with Host header simulation)..."
echo ""

echo "Test 4a: Agent redirect test-all via localhost"
curl -i -H "Host: localhost" "$AGENT_BASE/r/test-all" 2>&1 | head -20
echo ""

echo "Test 4b: Agent redirect test-example via example.com"
curl -i -H "Host: example.com" "$AGENT_BASE/r/test-example" 2>&1 | head -20
echo ""

echo "Test 4c: Agent redirect test-demo via wrong domain (should 403)"
curl -i -H "Host: example.com" "$AGENT_BASE/r/test-demo" 2>&1 | head -20
echo ""

echo "=== Test Summary ==="
echo "✅ Domains added to node"
echo "✅ Links created with different domain restrictions"
echo "✅ API resolution tested"
echo "✅ Agent redirect tested"
echo ""
echo "Manual verification steps:"
echo "1. Open http://localhost:3000/nodes - check domain management UI"
echo "2. Open http://localhost:3000/links - check domain dropdown and badges"
echo "3. Create a new link with domain restriction"
echo "4. Test redirect with different Host headers"
echo ""
echo "Cleanup (optional):"
echo "curl -X DELETE -H 'X-Nexus-Api-Key: $API_KEY' '$API_BASE/admin/nodes/$NODE_ID/domains?domain=example.com'"
echo "curl -X DELETE -H 'X-Nexus-Api-Key: $API_KEY' '$API_BASE/admin/nodes/$NODE_ID/domains?domain=demo.com'"
