#!/bin/bash

################################################################################
# Update NexusLink API on VPS1
# Fix: NodeID now uses UUID instead of domain (prevents routing issues)
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

VPS1_HOST="ubuntu@103.127.134.250"
PROJECT_DIR="~/nexuslink-project/nexuslink"

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Updating API on VPS1${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}[1/5] Pulling latest code...${NC}"
ssh $VPS1_HOST "cd $PROJECT_DIR && git pull origin main"
echo -e "${GREEN}✓ Code updated${NC}"

echo -e "${YELLOW}[2/5] Building API binary...${NC}"
ssh $VPS1_HOST "cd $PROJECT_DIR && /usr/local/go/bin/go build -o api cmd/api/main.go"
echo -e "${GREEN}✓ Binary built${NC}"

echo -e "${YELLOW}[3/5] Stopping API service...${NC}"
ssh $VPS1_HOST "sudo systemctl stop nexuslink-api"
echo -e "${GREEN}✓ Service stopped${NC}"

echo -e "${YELLOW}[4/5] Restarting API service...${NC}"
ssh $VPS1_HOST "sudo systemctl start nexuslink-api"
sleep 3
echo -e "${GREEN}✓ Service started${NC}"

echo -e "${YELLOW}[5/5] Verifying API status...${NC}"
STATUS=$(ssh $VPS1_HOST "sudo systemctl is-active nexuslink-api" || echo "inactive")

if [ "$STATUS" = "active" ]; then
    echo -e "${GREEN}✓ API is running${NC}"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ API Updated Successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    echo "What changed:"
    echo "  • NodeID now uses UUID format (fixes routing with dots in domain)"
    echo "  • Re-registering nodes will get new UUID-based IDs"
    echo "  • Existing nodes with old IDs need to be re-registered"
    echo ""
    echo "Next steps:"
    echo "  1. Restart all agents (they will auto re-register with new UUID)"
    echo "  2. Old nodes in dashboard will show offline"
    echo "  3. New nodes will appear with UUID IDs"
else
    echo -e "${RED}✗ API failed to start${NC}"
    echo ""
    echo "Check logs:"
    echo "  ssh $VPS1_HOST 'sudo journalctl -u nexuslink-api -n 50'"
    exit 1
fi
