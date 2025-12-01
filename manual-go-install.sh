#!/bin/bash

################################################################################
# Manual Go Installation for Restricted VPS
# Use this when VPS cannot download Go due to firewall/network restrictions
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Manual Go Installation for Restricted VPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Check if Go already installed
if command -v go &> /dev/null; then
    echo -e "${GREEN}✅ Go already installed: $(go version)${NC}"
    echo -e "${BLUE}You can proceed with agent installation.${NC}"
    exit 0
fi

echo -e "${YELLOW}INSTRUCTIONS:${NC}"
echo ""
echo -e "${BLUE}Since your VPS cannot download Go directly, follow these steps:${NC}"
echo ""
echo -e "${YELLOW}Step 1: On your LOCAL machine (laptop/PC)${NC}"
echo -e "Download Go:"
echo -e "${GREEN}wget https://go.dev/dl/go1.23.3.linux-amd64.tar.gz${NC}"
echo ""
echo -e "${YELLOW}Step 2: Upload to VPS${NC}"
echo -e "Using SCP (from your local machine):"
echo -e "${GREEN}scp go1.23.3.linux-amd64.tar.gz root@YOUR_VPS_IP:/tmp/${NC}"
echo ""
echo -e "Or using SFTP client like FileZilla, WinSCP, etc."
echo ""
echo -e "${YELLOW}Step 3: On VPS, extract and install${NC}"
echo -e "Run these commands:"
echo ""
echo -e "${GREEN}cd /tmp${NC}"
echo -e "${GREEN}sudo rm -rf /usr/local/go${NC}"
echo -e "${GREEN}sudo tar -C /usr/local -xzf go1.23.3.linux-amd64.tar.gz${NC}"
echo -e "${GREEN}export PATH=\$PATH:/usr/local/go/bin${NC}"
echo -e "${GREEN}echo 'export PATH=\$PATH:/usr/local/go/bin' | sudo tee /etc/profile.d/go.sh${NC}"
echo -e "${GREEN}source /etc/profile.d/go.sh${NC}"
echo ""
echo -e "${YELLOW}Step 4: Verify installation${NC}"
echo -e "${GREEN}go version${NC}"
echo ""
echo -e "${YELLOW}Step 5: Run agent installer${NC}"
echo -e "After Go is installed, the installer will skip Go download step:"
echo -e "${GREEN}curl -fsSL https://raw.githubusercontent.com/.../install.sh | sudo bash -s -- \\${NC}"
echo -e "${GREEN}  --domain=go.yourdomain.com \\${NC}"
echo -e "${GREEN}  --api=https://api.htmlin.my.id \\${NC}"
echo -e "${GREEN}  --key=YOUR_API_KEY \\${NC}"
echo -e "${GREEN}  --token=YOUR_TOKEN \\${NC}"
echo -e "${GREEN}  --email=admin@example.com${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Alternative: Use VPN/Proxy on VPS${NC}"
echo -e "If you have VPN access, install it first:"
echo -e "${GREEN}# Example with OpenVPN${NC}"
echo -e "${GREEN}sudo apt install openvpn${NC}"
echo -e "${GREEN}sudo openvpn --config your-vpn.ovpn &${NC}"
echo -e "Then retry the installer."
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
