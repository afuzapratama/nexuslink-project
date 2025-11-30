#!/bin/bash

#####################################################################
# NexusLink One-Line Installer
# Usage: curl -sL https://setup.nexuslink.dev | bash -s -- [options]
# Or: curl -sL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/setup.sh | bash -s -- [options]
#####################################################################

set -e

VERSION="1.0.0"
REPO="afuzapratama/nexuslink-project"
INSTALL_DIR="/opt/nexuslink"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

# Default values
COMPONENT=""
DOMAIN=""
API_URL=""
API_KEY=""
TOKEN=""
EMAIL=""
INTERACTIVE=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --component=*)
            COMPONENT="${1#*=}"
            INTERACTIVE=false
            shift
            ;;
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --api-url=*)
            API_URL="${1#*=}"
            shift
            ;;
        --api-key=*)
            API_KEY="${1#*=}"
            shift
            ;;
        --token=*)
            TOKEN="${1#*=}"
            shift
            ;;
        --email=*)
            EMAIL="${1#*=}"
            shift
            ;;
        --dir=*)
            INSTALL_DIR="${1#*=}"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

show_help() {
    cat << EOF
NexusLink One-Line Installer v${VERSION}

USAGE:
  # Interactive installation (recommended for first time)
  curl -sL setup.nexuslink.dev | sudo bash

  # Non-interactive agent installation
  curl -sL setup.nexuslink.dev | sudo bash -s -- \\
    --component=agent \\
    --domain=go.htmlin.my.id \\
    --api-url=https://api.htmlin.my.id \\
    --api-key=YOUR_API_KEY \\
    --token=YOUR_NODE_TOKEN \\
    --email=your@email.com

OPTIONS:
  --component=TYPE    Component to install: api, dashboard, agent
  --domain=DOMAIN     Agent domain (e.g., go.htmlin.my.id)
  --api-url=URL       API server URL (e.g., https://api.htmlin.my.id)
  --api-key=KEY       API authentication key
  --token=TOKEN       Node registration token (for agent)
  --email=EMAIL       Email for SSL certificates
  --dir=PATH          Installation directory (default: /opt/nexuslink)
  -h, --help          Show this help

EXAMPLES:
  # Install agent with one command
  curl -sL setup.nexuslink.dev | sudo bash -s -- \\
    --component=agent \\
    --domain=go.htmlin.my.id \\
    --api-url=https://api.htmlin.my.id \\
    --api-key=abc123 \\
    --token=xyz789 \\
    --email=admin@htmlin.my.id

  # Install API server interactively
  curl -sL setup.nexuslink.dev | sudo bash -s -- --component=api

  # Install everything interactively
  curl -sL setup.nexuslink.dev | sudo bash

REPOSITORY:
  https://github.com/${REPO}

EOF
}

# Check root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please use: sudo bash"
    exit 1
fi

clear
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               ║
║    ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               ║
║    ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗               ║
║    ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║               ║
║    ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║               ║
║    ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║                                                               ║
║              ONE-LINE INSTALLER v1.0.0                        ║
║         Production-Ready in Under 5 Minutes                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Interactive mode
if [ "$INTERACTIVE" = true ] && [ -z "$COMPONENT" ]; then
    echo "What would you like to install?"
    echo "  1) API Server (api.htmlin.my.id)"
    echo "  2) Dashboard (dashboard.htmlin.my.id)"
    echo "  3) Agent (go.htmlin.my.id, link.htmlin.my.id, etc.)"
    echo "  4) Full Stack (API + Dashboard)"
    echo ""
    read -p "Select option [1-4]: " OPTION
    
    case $OPTION in
        1) COMPONENT="api" ;;
        2) COMPONENT="dashboard" ;;
        3) COMPONENT="agent" ;;
        4) COMPONENT="full" ;;
        *) 
            echo -e "${RED}Invalid option${NC}"
            exit 1
            ;;
    esac
fi

# Detect OS
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}Cannot detect OS. Ubuntu 22.04 recommended.${NC}"
    exit 1
fi

source /etc/os-release
echo "Detected OS: $PRETTY_NAME"

# Update system
echo ""
echo -e "${GREEN}📦 Updating system...${NC}"
apt-get update -qq

# Install base requirements
echo -e "${GREEN}📦 Installing base packages...${NC}"
apt-get install -y -qq wget curl git > /dev/null 2>&1

# Clone or update repository
echo ""
echo -e "${GREEN}📥 Fetching NexusLink...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull -q origin main 2>/dev/null || echo "Using existing code"
else
    echo "Cloning repository..."
    git clone -q https://github.com/${REPO}.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# Route to specific installer
case $COMPONENT in
    agent)
        echo ""
        echo -e "${YELLOW}🚀 Installing Agent...${NC}"
        
        if [ "$INTERACTIVE" = true ]; then
            bash "$INSTALL_DIR/nexuslink/deployment/scripts/install-agent.sh"
        else
            # Non-interactive agent install
            if [ -z "$DOMAIN" ] || [ -z "$API_URL" ] || [ -z "$API_KEY" ] || [ -z "$TOKEN" ] || [ -z "$EMAIL" ]; then
                echo -e "${RED}Error: Missing required parameters for non-interactive agent installation${NC}"
                echo "Required: --domain, --api-url, --api-key, --token, --email"
                exit 1
            fi
            
            # Run agent install with environment variables
            AGENT_DOMAIN="$DOMAIN" \
            API_URL="$API_URL" \
            API_KEY="$API_KEY" \
            NODE_TOKEN="$TOKEN" \
            SSL_EMAIL="$EMAIL" \
            INSTALL_DIR="$INSTALL_DIR/nexuslink" \
            bash "$INSTALL_DIR/nexuslink/deployment/scripts/install-agent-noninteractive.sh"
        fi
        ;;
        
    api)
        echo ""
        echo -e "${YELLOW}🚀 Installing API Server...${NC}"
        cd "$INSTALL_DIR/nexuslink"
        bash "$INSTALL_DIR/nexuslink/deployment/scripts/deploy.sh" api
        ;;
        
    dashboard)
        echo ""
        echo -e "${YELLOW}🚀 Installing Dashboard...${NC}"
        echo "For dashboard installation, please follow:"
        echo "  $INSTALL_DIR/nexuslink/deployment/PRODUCTION_DEPLOYMENT.md"
        echo ""
        echo "Quick steps:"
        echo "  1. cd $INSTALL_DIR/nexuslink-dashboard"
        echo "  2. cp .env.example .env.production"
        echo "  3. Edit .env.production with API details"
        echo "  4. npm install && npm run build"
        echo "  5. pm2 start npm --name nexuslink-dashboard -- start"
        ;;
        
    full)
        echo ""
        echo -e "${YELLOW}🚀 Installing Full Stack...${NC}"
        cd "$INSTALL_DIR/nexuslink"
        bash "$INSTALL_DIR/nexuslink/deployment/scripts/deploy.sh" all
        ;;
        
    *)
        echo -e "${RED}Unknown component: $COMPONENT${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "📚 Documentation: https://github.com/${REPO}"
echo "📂 Installation: $INSTALL_DIR"
echo ""
echo -e "${BLUE}Need help? Open an issue: https://github.com/${REPO}/issues${NC}"
echo ""
