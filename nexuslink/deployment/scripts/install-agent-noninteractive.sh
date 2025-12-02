#!/bin/bash

#####################################################################
# NexusLink Agent Non-Interactive Installer
# Automated agent deployment using environment variables
#####################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root: sudo $0${NC}"
    exit 1
fi

# Required Environment Variables
# AGENT_DOMAIN
# API_URL
# API_KEY
# NODE_TOKEN
# SSL_EMAIL
# INSTALL_DIR (optional)

# Validate required variables
if [ -z "$AGENT_DOMAIN" ] || [ -z "$API_URL" ] || [ -z "$API_KEY" ] || [ -z "$NODE_TOKEN" ] || [ -z "$SSL_EMAIL" ]; then
    echo -e "${RED}Error: Missing required environment variables${NC}"
    echo "Required: AGENT_DOMAIN, API_URL, API_KEY, NODE_TOKEN, SSL_EMAIL"
    exit 1
fi

INSTALL_DIR="${INSTALL_DIR:-/opt/nexuslink-agent}"

echo -e "${GREEN}🚀 Starting Non-Interactive Agent Installation${NC}"
echo "Domain: $AGENT_DOMAIN"
echo "API: $API_URL"
echo "Dir: $INSTALL_DIR"

# ============================================
# Install Dependencies
# ============================================
echo "📦 Installing dependencies..."
apt-get update -qq
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
else
    echo "✅ Go already installed"
fi

# ============================================
# Setup Repository
# ============================================
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 Directory exists, pulling latest changes..."
    cd "$INSTALL_DIR"
    git pull -q origin main || echo "⚠️  Could not pull updates"
else
    echo "📥 Cloning NexusLink repository..."
    mkdir -p $(dirname "$INSTALL_DIR")
    git clone -q https://github.com/afuzapratama/nexuslink-project.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR/nexuslink"

# ============================================
# Build Agent
# ============================================
echo "🔨 Building agent..."
/usr/local/go/bin/go build -o agent cmd/agent/main.go
chmod +x agent

# ============================================
# Configure Environment
# ============================================
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

# ============================================
# Setup Systemd
# ============================================
if ! id "nexus" &>/dev/null; then
    useradd -r -s /bin/false nexus
fi
chown -R nexus:nexus "$INSTALL_DIR"

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
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexuslink-agent

# ============================================
# Configure Nginx
# ============================================
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/sites-available/$AGENT_DOMAIN << EOF
server {
    listen 80;
    server_name $AGENT_DOMAIN;

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
        proxy_set_header X-Visitor-User-Agent \$http_user_agent;
        proxy_set_header X-Visitor-Referer \$http_referer;
    }

    location /health {
        proxy_pass http://localhost:9090/health;
        access_log off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$AGENT_DOMAIN /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ============================================
# Configure Firewall
# ============================================
ufw --force enable > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1

# ============================================
# Start Service
# ============================================
systemctl start nexuslink-agent
sleep 3
if ! systemctl is-active --quiet nexuslink-agent; then
    echo -e "${RED}❌ Agent failed to start${NC}"
    exit 1
fi

# ============================================
# Setup SSL
# ============================================
echo "🔐 Obtaining SSL certificate..."
certbot --nginx -d $AGENT_DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL --redirect

echo -e "${GREEN}✅ Installation Complete!${NC}"
