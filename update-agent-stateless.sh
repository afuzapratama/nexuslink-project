#!/bin/bash

################################################################################
# Update Agent to Stateless Version (No Redis)
# Run this on existing agents to remove Redis dependency
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/nexuslink-agent"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Update Agent to Stateless Version${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Check if root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

# Check if agent installed
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${RED}❌ Agent not found at $INSTALL_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}[1/3] Building new agent binary...${NC}"
cd /tmp
rm -rf nexuslink-build
mkdir -p nexuslink-build
cd nexuslink-build

git -c http.version=HTTP/1.1 clone --depth 1 https://github.com/afuzapratama/nexuslink-project.git . > /dev/null 2>&1
cd nexuslink

/usr/local/go/bin/go build -ldflags="-s -w" -o $INSTALL_DIR/agent cmd/agent/main.go

chmod +x $INSTALL_DIR/agent
chown nexus:nexus $INSTALL_DIR/agent

cd /tmp
rm -rf nexuslink-build

echo -e "${GREEN}✅ New agent binary compiled${NC}"

echo ""
echo -e "${BLUE}[2/3] Cleaning up Redis (optional)...${NC}"

# Remove Redis config from .env if exists
if grep -q "NEXUS_REDIS" $INSTALL_DIR/.env; then
    sed -i '/NEXUS_REDIS/d' $INSTALL_DIR/.env
    echo -e "${GREEN}✅ Removed Redis config from .env${NC}"
fi

# Optional: stop Redis if it was installed for agent only
read -p "Do you want to stop and disable Redis? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl stop redis-server 2>/dev/null
    systemctl disable redis-server 2>/dev/null
    echo -e "${GREEN}✅ Redis stopped and disabled${NC}"
    echo -e "${YELLOW}Note: You can uninstall with: apt remove redis-server${NC}"
else
    echo -e "${YELLOW}Redis left running (in case other services use it)${NC}"
fi

echo ""
echo -e "${BLUE}[3/3] Restarting agent...${NC}"
systemctl restart nexuslink-agent
sleep 3

if systemctl is-active --quiet nexuslink-agent; then
    echo -e "${GREEN}✅ Agent restarted successfully${NC}"
else
    echo -e "${RED}❌ Agent failed to restart${NC}"
    echo "Check logs: journalctl -u nexuslink-agent -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ AGENT UPDATED!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Agent is now stateless (no Redis dependency)"
echo "Memory usage reduced significantly"
echo "Rate limiting handled by API server"
echo ""
echo "Test your redirects now - should work perfectly!"
echo ""
echo "Check logs: journalctl -u nexuslink-agent -f"
