#!/bin/bash

################################################################################
# Fix NexusLink Agent API Key
# 
# Usage: 
#   ./fix-agent-apikey.sh link.siswayapim.com NEW_API_KEY
#
# This script:
#   1. SSH to the agent server
#   2. Update API key in .env
#   3. Restart agent service
#   4. Verify it's working
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

if [ $# -ne 2 ]; then
    echo -e "${RED}Usage: $0 <domain> <new_api_key>${NC}"
    echo ""
    echo "Example:"
    echo "  $0 link.siswayapim.com 47fcf67bd36381edc3b63dfadf3d75d3051b93fcaa483a95"
    echo ""
    exit 1
fi

DOMAIN=$1
NEW_API_KEY=$2

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Fixing Agent API Key${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
echo "Domain:  $DOMAIN"
echo "New Key: ${NEW_API_KEY:0:20}..."
echo ""

echo -e "${YELLOW}[1/4] Connecting to agent...${NC}"
ssh root@$DOMAIN "echo 'Connected successfully'"

echo -e "${YELLOW}[2/4] Updating API key...${NC}"
ssh root@$DOMAIN "sed -i 's/^NEXUS_AGENT_API_KEY=.*/NEXUS_AGENT_API_KEY=$NEW_API_KEY/' /opt/nexuslink-agent/.env"
echo -e "${GREEN}✓ API key updated${NC}"

echo -e "${YELLOW}[3/4] Restarting agent service...${NC}"
ssh root@$DOMAIN "systemctl restart nexuslink-agent"
sleep 3
echo -e "${GREEN}✓ Service restarted${NC}"

echo -e "${YELLOW}[4/4] Verifying status...${NC}"
STATUS=$(ssh root@$DOMAIN "systemctl is-active nexuslink-agent" || echo "inactive")

if [ "$STATUS" = "active" ]; then
    echo -e "${GREEN}✓ Agent is running${NC}"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ API Key Fixed Successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo "Check logs:"
    echo "  ssh root@$DOMAIN 'journalctl -u nexuslink-agent -n 20'"
    echo ""
else
    echo -e "${RED}✗ Agent failed to start${NC}"
    echo ""
    echo "Check logs:"
    echo "  ssh root@$DOMAIN 'journalctl -u nexuslink-agent -n 50'"
    exit 1
fi
