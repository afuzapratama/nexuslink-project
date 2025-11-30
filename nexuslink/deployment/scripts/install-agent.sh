#!/bin/bash

#####################################################################
# NexusLink Agent Easy Installer
# One-command agent deployment with interactive prompts
#####################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

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
║              AGENT EASY INSTALLER v1.0                        ║
║         Fast, Simple, Production-Ready Deployment             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root: sudo $0${NC}"
    exit 1
fi

# Check OS
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}❌ Cannot detect OS. Ubuntu 22.04 recommended.${NC}"
    exit 1
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
    echo -e "${YELLOW}⚠️  Warning: This script is tested on Ubuntu 22.04. Detected: $PRETTY_NAME${NC}"
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🚀 Welcome to NexusLink Agent Installer!${NC}"
echo ""
echo "This script will:"
echo "  ✅ Install Go, Git, Nginx, Certbot"
echo "  ✅ Clone NexusLink repository (if not exists)"
echo "  ✅ Build agent binary"
echo "  ✅ Setup systemd service"
echo "  ✅ Configure Nginx reverse proxy"
echo "  ✅ Setup SSL with Let's Encrypt"
echo "  ✅ Register agent with API server"
echo ""

# ============================================
# STEP 1: Collect Information
# ============================================

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 1: Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

# Domain
while true; do
    read -p "Enter agent domain (e.g., go.htmlin.my.id): " AGENT_DOMAIN
    if [ -z "$AGENT_DOMAIN" ]; then
        echo -e "${RED}❌ Domain cannot be empty${NC}"
    elif [[ ! "$AGENT_DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]]; then
        echo -e "${RED}❌ Invalid domain format${NC}"
    else
        break
    fi
done

# API Server
while true; do
    read -p "Enter API server URL (e.g., https://api.htmlin.my.id): " API_URL
    if [ -z "$API_URL" ]; then
        echo -e "${RED}❌ API URL cannot be empty${NC}"
    elif [[ ! "$API_URL" =~ ^https?:// ]]; then
        echo -e "${RED}❌ API URL must start with http:// or https://${NC}"
    else
        # Remove trailing slash
        API_URL=${API_URL%/}
        break
    fi
done

# API Key
while true; do
    read -sp "Enter API key (from API server .env): " API_KEY
    echo ""
    if [ -z "$API_KEY" ]; then
        echo -e "${RED}❌ API key cannot be empty${NC}"
    elif [ ${#API_KEY} -lt 16 ]; then
        echo -e "${RED}❌ API key too short (minimum 16 characters)${NC}"
    else
        break
    fi
done

# Node Token
echo ""
echo -e "${BLUE}ℹ️  Generate node token from dashboard: ${API_URL}/nodes${NC}"
while true; do
    read -p "Enter node token (from dashboard): " NODE_TOKEN
    if [ -z "$NODE_TOKEN" ]; then
        echo -e "${RED}❌ Token cannot be empty${NC}"
    else
        break
    fi
done

# Email for SSL
while true; do
    read -p "Enter email for SSL certificates: " SSL_EMAIL
    if [ -z "$SSL_EMAIL" ]; then
        echo -e "${RED}❌ Email cannot be empty${NC}"
    elif [[ ! "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        echo -e "${RED}❌ Invalid email format${NC}"
    else
        break
    fi
done

# Installation directory
DEFAULT_DIR="/opt/nexuslink-agent"
read -p "Installation directory [$DEFAULT_DIR]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_DIR}

echo ""
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""
echo "Summary:"
echo "  Domain:      $AGENT_DOMAIN"
echo "  API Server:  $API_URL"
echo "  API Key:     ${API_KEY:0:8}***"
echo "  Token:       ${NODE_TOKEN:0:8}***"
echo "  Email:       $SSL_EMAIL"
echo "  Install Dir: $INSTALL_DIR"
echo ""
read -p "Continue with installation? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo -e "${YELLOW}Installation cancelled.${NC}"
    exit 0
fi

# ============================================
# STEP 2: Install Dependencies
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 2: Installing Dependencies${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "📦 Updating system packages..."
apt-get update -qq

echo "📦 Installing required packages..."
apt-get install -y -qq wget curl git nginx certbot python3-certbot-nginx ufw > /dev/null 2>&1

# Install Go if not present
if ! command -v go &> /dev/null; then
    echo "🔧 Installing Go 1.23..."
    cd /tmp
    wget -q https://go.dev/dl/go1.23.3.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.23.3.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
    export PATH=$PATH:/usr/local/go/bin
    echo "✅ Go $(go version | awk '{print $3}') installed"
else
    echo "✅ Go already installed: $(go version | awk '{print $3}')"
fi

# ============================================
# STEP 3: Clone or Update Repository
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 3: Setting Up Repository${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

if [ -d "$INSTALL_DIR" ]; then
    echo "📁 Directory exists, pulling latest changes..."
    cd "$INSTALL_DIR"
    git pull -q origin main || echo "⚠️  Could not pull updates (will use existing code)"
else
    echo "📥 Cloning NexusLink repository..."
    mkdir -p $(dirname "$INSTALL_DIR")
    git clone -q https://github.com/afuzapratama/nexuslink-project.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/nexuslink"

# ============================================
# STEP 4: Build Agent Binary
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 4: Building Agent Binary${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "🔨 Building agent..."
/usr/local/go/bin/go build -o agent cmd/agent/main.go
chmod +x agent
echo "✅ Agent binary built: $(pwd)/agent"

# ============================================
# STEP 5: Create Environment File
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 5: Creating Environment Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

cat > .env.production << EOF
# NexusLink Agent Configuration
# Generated: $(date)

NEXUS_AGENT_HTTP_ADDR=:9090
NEXUS_API_BASE=$API_URL
NEXUS_AGENT_API_KEY=$API_KEY
NEXUS_NODE_TOKEN=$NODE_TOKEN
NEXUS_NODE_DOMAIN=$AGENT_DOMAIN
NEXUS_DEBUG_IP=
EOF

chmod 600 .env.production
echo "✅ Environment file created: $(pwd)/.env.production"

# ============================================
# STEP 6: Create Systemd Service
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 6: Setting Up Systemd Service${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

# Create nexus user if not exists
if ! id "nexus" &>/dev/null; then
    useradd -r -s /bin/false nexus
    echo "✅ Created system user: nexus"
fi

# Set ownership
chown -R nexus:nexus "$INSTALL_DIR"

# Create systemd service
cat > /etc/systemd/system/nexuslink-agent.service << EOF
[Unit]
Description=NexusLink Agent - Fast URL Redirector
Documentation=https://github.com/afuzapratama/nexuslink-project
After=network.target

[Service]
Type=simple
User=nexus
Group=nexus
WorkingDirectory=$INSTALL_DIR/nexuslink
EnvironmentFile=$INSTALL_DIR/nexuslink/.env.production
ExecStart=$INSTALL_DIR/nexuslink/agent
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexuslink-agent
echo "✅ Systemd service configured"

# ============================================
# STEP 7: Configure Nginx
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 7: Configuring Nginx${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create Nginx config
cat > /etc/nginx/sites-available/$AGENT_DOMAIN << EOF
server {
    listen 80;
    server_name $AGENT_DOMAIN;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Pass visitor headers
        proxy_set_header X-Visitor-User-Agent \$http_user_agent;
        proxy_set_header X-Visitor-Referer \$http_referer;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:9090/health;
        access_log off;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$AGENT_DOMAIN /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
echo "✅ Nginx configured for $AGENT_DOMAIN"

# ============================================
# STEP 8: Configure Firewall
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 8: Configuring Firewall${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

# Setup UFW
ufw --force enable > /dev/null 2>&1
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force reload > /dev/null 2>&1

echo "✅ Firewall configured (ports: 22, 80, 443)"

# ============================================
# STEP 9: Start Agent
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 9: Starting Agent Service${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

systemctl start nexuslink-agent

# Wait for service to start
sleep 3

if systemctl is-active --quiet nexuslink-agent; then
    echo "✅ Agent service started successfully"
else
    echo -e "${RED}❌ Agent failed to start. Check logs: journalctl -u nexuslink-agent -n 50${NC}"
    exit 1
fi

# Test local health
if curl -f http://localhost:9090/health > /dev/null 2>&1; then
    echo "✅ Agent health check passed"
else
    echo -e "${YELLOW}⚠️  Agent health check failed (may be normal if still initializing)${NC}"
fi

# ============================================
# STEP 10: Setup SSL with Let's Encrypt
# ============================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 10: Setting Up SSL Certificate${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""

echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
echo ""
echo -e "${BLUE}⚠️  IMPORTANT: Make sure DNS is pointing to this server!${NC}"
echo "   Check: dig $AGENT_DOMAIN +short"
echo ""
read -p "DNS configured? Press Enter to continue or Ctrl+C to cancel..."

certbot --nginx -d $AGENT_DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL --redirect

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained and configured"
    
    # Test HTTPS
    if curl -f https://$AGENT_DOMAIN/health > /dev/null 2>&1; then
        echo "✅ HTTPS health check passed"
    else
        echo -e "${YELLOW}⚠️  HTTPS not responding yet (DNS may need time to propagate)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SSL setup failed. You can run manually later:${NC}"
    echo "   sudo certbot --nginx -d $AGENT_DOMAIN"
fi

# ============================================
# STEP 11: Verification & Summary
# ============================================

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ INSTALLATION COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""

echo "📊 System Status:"
echo ""
systemctl status nexuslink-agent --no-pager | head -3
echo ""

echo "🔗 Your Agent URLs:"
echo "  • HTTP:  http://$AGENT_DOMAIN/r/{alias}"
echo "  • HTTPS: https://$AGENT_DOMAIN/r/{alias}"
echo ""

echo "🛠️  Useful Commands:"
echo "  • View logs:       sudo journalctl -u nexuslink-agent -f"
echo "  • Restart agent:   sudo systemctl restart nexuslink-agent"
echo "  • Agent status:    sudo systemctl status nexuslink-agent"
echo "  • Test redirect:   curl -I https://$AGENT_DOMAIN/r/test"
echo "  • Health check:    curl https://$AGENT_DOMAIN/health"
echo ""

echo "📝 Next Steps:"
echo "  1. Check agent appears in dashboard: $API_URL/nodes"
echo "  2. Create test link with domain: $AGENT_DOMAIN"
echo "  3. Test redirect: https://$AGENT_DOMAIN/r/your-alias"
echo "  4. Monitor logs for any issues"
echo ""

echo "📂 Installation Directory: $INSTALL_DIR/nexuslink"
echo "📄 Environment File: $INSTALL_DIR/nexuslink/.env.production"
echo "🔧 Service File: /etc/systemd/system/nexuslink-agent.service"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Need to add another agent? Just run this script again!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Save installation info
cat > "$INSTALL_DIR/INSTALLATION_INFO.txt" << EOF
NexusLink Agent Installation
=============================
Date: $(date)
Domain: $AGENT_DOMAIN
API Server: $API_URL
Installation Directory: $INSTALL_DIR
Email: $SSL_EMAIL

Service: nexuslink-agent
Status: Active

To view logs:
  sudo journalctl -u nexuslink-agent -f

To restart:
  sudo systemctl restart nexuslink-agent
EOF

echo "ℹ️  Installation info saved: $INSTALL_DIR/INSTALLATION_INFO.txt"
echo ""
echo -e "${GREEN}🎉 Agent is ready to serve redirects!${NC}"
