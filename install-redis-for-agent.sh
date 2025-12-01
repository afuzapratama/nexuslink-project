#!/bin/bash

################################################################################
# Install Redis for Existing NexusLink Agent
# Fixes "Rate limit check failed" error
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/nexuslink-agent"
ENV_FILE="$INSTALL_DIR/.env"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Install Redis for NexusLink Agent${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Check if root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo "Please run: sudo bash"
    exit 1
fi

# Check if agent installed
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Agent not found at $INSTALL_DIR${NC}"
    echo "Please install agent first."
    exit 1
fi

echo -e "${BLUE}[1/4] Installing Redis...${NC}"
apt-get update -qq > /dev/null 2>&1
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq redis-server > /dev/null 2>&1
echo -e "${GREEN}✅ Redis installed${NC}"

echo ""
echo -e "${BLUE}[2/4] Starting Redis...${NC}"
systemctl enable redis-server > /dev/null 2>&1
systemctl start redis-server

if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
    echo "Check logs: journalctl -u redis-server -n 50"
    exit 1
fi

echo ""
echo -e "${BLUE}[3/4] Updating agent configuration...${NC}"

# Add Redis config if not exists
if ! grep -q "NEXUS_REDIS_ADDR" $ENV_FILE; then
    echo "NEXUS_REDIS_ADDR=127.0.0.1:6379" >> $ENV_FILE
    echo "NEXUS_REDIS_PASSWORD=" >> $ENV_FILE
    echo -e "${GREEN}✅ Redis config added to .env${NC}"
else
    echo -e "${YELLOW}Redis config already exists${NC}"
fi

echo ""
echo -e "${BLUE}[4/4] Restarting agent...${NC}"
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
echo -e "${GREEN}${BOLD}  ✅ REDIS INSTALLED!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

echo "Rate limiting is now working with Redis."
echo "Try your redirect again - should work now!"
echo ""
echo "Check logs: journalctl -u nexuslink-agent -f"
