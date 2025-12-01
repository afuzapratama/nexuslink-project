#!/bin/bash

# Quick debug script untuk check agent status
echo "=== Agent Debug Info ==="
echo ""
echo "1. Agent binary timestamp:"
ls -lh /opt/nexuslink-agent/agent
echo ""
echo "2. Agent ENV (Redis check):"
grep -E "NEXUS_NODE|NEXUS_API|NEXUS_REDIS" /opt/nexuslink-agent/.env
echo ""
echo "3. Agent service status:"
systemctl status nexuslink-agent --no-pager --lines=3
echo ""
echo "4. Recent logs (last 20 lines):"
journalctl -u nexuslink-agent -n 20 --no-pager
echo ""
echo "5. Test API resolve (from agent VPS):"
DOMAIN=$(grep NEXUS_NODE_DOMAIN /opt/nexuslink-agent/.env | cut -d'=' -f2)
API_BASE=$(grep NEXUS_API_BASE /opt/nexuslink-agent/.env | cut -d'=' -f2)
API_KEY=$(grep NEXUS_AGENT_API_KEY /opt/nexuslink-agent/.env | cut -d'=' -f2)
NODE_ID=$(journalctl -u nexuslink-agent --no-pager | grep "Registered as nodeID" | tail -1 | sed 's/.*nodeID=\([^ ]*\).*/\1/')

if [ -z "$NODE_ID" ]; then
    NODE_ID="node-$DOMAIN"
fi

echo "Testing: $API_BASE/links/resolve?alias=kambing&nodeId=$NODE_ID&domain=$DOMAIN"
curl -v -H "X-Nexus-Api-Key: $API_KEY" \
  "$API_BASE/links/resolve?alias=kambing&nodeId=$NODE_ID&domain=$DOMAIN" 2>&1 | grep -A 20 "< HTTP"
