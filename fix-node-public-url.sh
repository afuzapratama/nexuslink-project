#!/bin/bash

################################################################################
# Fix Public URL for Already Installed Agent
# Run this on VPS yang sudah install agent tapi Public URL masih localhost
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/nexuslink-agent"
ENV_FILE="$INSTALL_DIR/.env"

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Fix NexusLink Agent Public URL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Check if agent installed
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Agent not found at $INSTALL_DIR${NC}"
    echo "Please install agent first."
    exit 1
fi

# Read current domain
CURRENT_DOMAIN=$(grep NEXUS_NODE_DOMAIN $ENV_FILE | cut -d'=' -f2)

if [ -z "$CURRENT_DOMAIN" ]; then
    echo -e "${RED}❌ Cannot find NEXUS_NODE_DOMAIN in .env${NC}"
    exit 1
fi

echo -e "${BLUE}Current domain: ${YELLOW}$CURRENT_DOMAIN${NC}"
echo ""

# Check if PUBLIC_URL already exists
if grep -q "NEXUS_NODE_PUBLIC_URL" $ENV_FILE; then
    CURRENT_URL=$(grep NEXUS_NODE_PUBLIC_URL $ENV_FILE | cut -d'=' -f2)
    echo -e "${YELLOW}Current Public URL: $CURRENT_URL${NC}"
    
    if [[ "$CURRENT_URL" == "https://$CURRENT_DOMAIN" ]]; then
        echo -e "${GREEN}✅ Public URL already correct!${NC}"
        echo ""
        echo "Restarting agent to re-register..."
        sudo systemctl restart nexuslink-agent
        sleep 3
        
        if systemctl is-active --quiet nexuslink-agent; then
            echo -e "${GREEN}✅ Agent restarted successfully${NC}"
            echo ""
            echo "Check dashboard - Public URL should now be: https://$CURRENT_DOMAIN"
        else
            echo -e "${RED}❌ Agent failed to restart${NC}"
            echo "Check logs: journalctl -u nexuslink-agent -n 50"
        fi
        exit 0
    fi
    
    echo -e "${YELLOW}Updating to: https://$CURRENT_DOMAIN${NC}"
    sed -i "s|NEXUS_NODE_PUBLIC_URL=.*|NEXUS_NODE_PUBLIC_URL=https://$CURRENT_DOMAIN|g" $ENV_FILE
else
    echo -e "${YELLOW}Adding NEXUS_NODE_PUBLIC_URL to .env${NC}"
    echo "NEXUS_NODE_PUBLIC_URL=https://$CURRENT_DOMAIN" >> $ENV_FILE
fi

# Add other missing vars if needed
if ! grep -q "NEXUS_NODE_NAME" $ENV_FILE; then
    echo "NEXUS_NODE_NAME=$CURRENT_DOMAIN" >> $ENV_FILE
fi

if ! grep -q "NEXUS_NODE_REGION" $ENV_FILE; then
    echo "NEXUS_NODE_REGION=Auto-Detected" >> $ENV_FILE
fi

echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""

# Show updated config
echo -e "${BLUE}Updated .env:${NC}"
grep -E "NEXUS_NODE_DOMAIN|NEXUS_NODE_PUBLIC_URL|NEXUS_NODE_NAME|NEXUS_NODE_REGION" $ENV_FILE
echo ""

# Restart agent
echo -e "${BLUE}Restarting agent...${NC}"
sudo systemctl restart nexuslink-agent
sleep 3

if systemctl is-active --quiet nexuslink-agent; then
    echo -e "${GREEN}✅ Agent restarted successfully${NC}"
    echo ""
    echo -e "${GREEN}Done! Check dashboard:${NC}"
    echo -e "  Public URL should now be: ${BOLD}https://$CURRENT_DOMAIN${NC}"
    echo ""
    echo "View logs: journalctl -u nexuslink-agent -f"
else
    echo -e "${RED}❌ Agent failed to restart${NC}"
    echo ""
    echo "Check logs: journalctl -u nexuslink-agent -n 50"
    exit 1
fi
