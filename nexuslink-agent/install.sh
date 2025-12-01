#!/bin/bash

################################################################################
# NexusLink Agent - Ultra-Fast Production Installer
# 
# Usage: curl -fsSL https://cdn.yourdomain.com/install.sh | bash -s -- \
#          --domain=go.htmlin.my.id \
#          --api=https://api.htmlin.my.id \
#          --key=YOUR_API_KEY \
#          --token=YOUR_NODE_TOKEN \
#          --email=admin@example.com
#
# What it does:
#   1. Verify DNS points to this server (auto-fail if not)
#   2. Install Go, Nginx, Certbot
#   3. Download & compile agent binary
#   4. Setup systemd service
#   5. Configure Nginx + SSL
#   6. Register with API server
#   7. Start service automatically
#
# Time: ~3 minutes per agent
################################################################################

set -e
trap 'handle_error $?' EXIT

VERSION="1.0.0"
GITHUB_REPO="https://github.com/afuzapratama/nexuslink-project.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Default values
DOMAIN=""
API_URL=""
API_KEY=""
NODE_TOKEN=""
EMAIL=""
SKIP_DNS_CHECK=false
INSTALL_DIR="/opt/nexuslink-agent"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain=*) DOMAIN="${1#*=}"; shift ;;
        --api=*) API_URL="${1#*=}"; shift ;;
        --key=*) API_KEY="${1#*=}"; shift ;;
        --token=*) NODE_TOKEN="${1#*=}"; shift ;;
        --email=*) EMAIL="${1#*=}"; shift ;;
        --skip-dns) SKIP_DNS_CHECK=true; shift ;;
        --dir=*) INSTALL_DIR="${1#*=}"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

handle_error() {
    if [ $1 -ne 0 ]; then
        echo -e "\n${RED}❌ Installation failed! Check logs above.${NC}"
        exit $1
    fi
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Header
clear
echo -e "${BLUE}${BOLD}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗        ║
║     ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝        ║
║     ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗        ║
║     ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║        ║
║     ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║        ║
║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝        ║
║                                                          ║
║           AGENT INSTALLER v1.0.0                         ║
║      Production-Ready in 3 Minutes ⚡                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# Validate root
if [ "$EUID" -ne 0 ]; then 
    log_error "This script must be run as root"
    echo "Please run: sudo bash or curl ... | sudo bash"
    exit 1
fi

# Validate required parameters
if [ -z "$DOMAIN" ] || [ -z "$API_URL" ] || [ -z "$API_KEY" ] || [ -z "$NODE_TOKEN" ] || [ -z "$EMAIL" ]; then
    log_error "Missing required parameters!"
    echo ""
    echo "Usage:"
    echo "  curl -fsSL https://cdn.yourdomain.com/install.sh | sudo bash -s -- \\"
    echo "    --domain=go.htmlin.my.id \\"
    echo "    --api=https://api.htmlin.my.id \\"
    echo "    --key=YOUR_API_KEY \\"
    echo "    --token=YOUR_NODE_TOKEN \\"
    echo "    --email=admin@example.com"
    echo ""
    echo "Optional:"
    echo "  --skip-dns        Skip DNS verification"
    echo "  --dir=/custom     Custom installation directory"
    exit 1
fi

log_info "Starting NexusLink Agent installation..."
echo ""
echo "Configuration:"
echo "  Domain:     $DOMAIN"
echo "  API Server: $API_URL"
echo "  Email:      $EMAIL"
echo "  Install:    $INSTALL_DIR"
echo ""

# ============================================
# STEP 1: DNS Verification
# ============================================
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[1/10] Verifying DNS Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

if [ "$SKIP_DNS_CHECK" = false ]; then
    log_info "Checking DNS for $DOMAIN..."
    
    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    log_info "Server IP: $SERVER_IP"
    
    # Resolve domain
    DOMAIN_IP=$(dig +short $DOMAIN | grep -E '^[0-9.]+$' | head -1)
    
    if [ -z "$DOMAIN_IP" ]; then
        log_error "DNS resolution failed for $DOMAIN"
        echo ""
        echo "Please ensure:"
        echo "  1. DNS A record points to: $SERVER_IP"
        echo "  2. DNS has propagated (wait 5-15 minutes after DNS change)"
        echo "  3. Domain is spelled correctly"
        echo ""
        echo "Check DNS: dig $DOMAIN +short"
        echo ""
        echo "To skip this check (not recommended), add: --skip-dns"
        exit 1
    fi
    
    log_info "Domain resolves to: $DOMAIN_IP"
    
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        log_error "DNS mismatch!"
        echo ""
        echo "Domain $DOMAIN points to: $DOMAIN_IP"
        echo "This server IP:           $SERVER_IP"
        echo ""
        echo "❌ Installation cannot continue - domain must point to this server!"
        echo ""
        echo "Fix DNS and try again, or use --skip-dns to bypass (not recommended)"
        exit 1
    fi
    
    log_success "DNS correctly configured!"
else
    log_warning "DNS check skipped"
fi

sleep 1

# ============================================
# STEP 2: System Update
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[2/10] Updating System${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

log_info "Updating package lists..."
apt-get update -qq > /dev/null 2>&1
log_success "System updated"

# ============================================
# STEP 3: Install Dependencies
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[3/10] Installing Dependencies${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

log_info "Installing required packages..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    wget curl git nginx certbot python3-certbot-nginx ufw \
    build-essential > /dev/null 2>&1
log_success "Dependencies installed"

# ============================================
# STEP 4: Install Go
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[4/10] Installing Go${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

if ! command -v go &> /dev/null; then
    log_info "Downloading Go 1.25.4..."
    cd /tmp
    
    # Try primary mirror (go.dev) - Force IPv4
    if wget -4 --timeout=30 --tries=2 -q https://go.dev/dl/go1.25.4.linux-amd64.tar.gz 2>/dev/null; then
        log_success "Downloaded from go.dev"
    # Try Google mirror - Force IPv4
    elif wget -4 --timeout=30 --tries=2 -q https://golang.google.cn/dl/go1.25.4.linux-amd64.tar.gz 2>/dev/null; then
        log_success "Downloaded from golang.google.cn"
    # Try GitHub mirror - Force IPv4
    elif wget -4 --timeout=30 --tries=2 -q https://go.dev/dl/go1.25.4.linux-amd64.tar.gz 2>/dev/null; then
        log_success "Downloaded from GitHub mirror"
    else
        log_error "Failed to download Go from all mirrors"
        echo -e "${RED}Please check your internet connection or try manually:${NC}"
        echo -e "${BLUE}wget -4 https://go.dev/dl/go1.25.4.linux-amd64.tar.gz${NC}"
        exit 1
    fi
    
    log_info "Extracting Go..."
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.25.4.linux-amd64.tar.gz
    export PATH=$PATH:/usr/local/go/bin
    echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
    rm -f go1.25.4.linux-amd64.tar.gz
    log_success "Go $(go version | awk '{print $3}') installed"
else
    log_success "Go already installed: $(go version | awk '{print $3}')"
fi

# ============================================
# STEP 5: Create System User
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[5/10] Creating System User${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

if ! id "nexus" &>/dev/null; then
    useradd -r -s /bin/false -d $INSTALL_DIR nexus
    log_success "User 'nexus' created"
else
    log_success "User 'nexus' exists"
fi

# ============================================
# STEP 6: Download & Build Agent
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[6/10] Building Agent Binary${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

mkdir -p $INSTALL_DIR

# Build from source
log_info "Cloning repository..."
mkdir -p /tmp/nexuslink-build
cd /tmp/nexuslink-build

git -c http.version=HTTP/1.1 clone --depth 1 $GITHUB_REPO . > /dev/null 2>&1
cd nexuslink

log_info "Downloading dependencies..."
/usr/local/go/bin/go mod download > /dev/null 2>&1

log_info "Compiling agent binary..."
/usr/local/go/bin/go build -ldflags="-s -w" -o $INSTALL_DIR/agent cmd/agent/main.go

cd $INSTALL_DIR
chmod +x agent
rm -rf /tmp/nexuslink-build

log_success "Agent compiled successfully"

# Verify binary
if [ ! -x "$INSTALL_DIR/agent" ]; then
    log_error "Agent binary not found or not executable"
    exit 1
fi

# ============================================
# STEP 7: Create Configuration
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[7/10] Creating Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

cat > $INSTALL_DIR/.env << EOF
# NexusLink Agent Configuration
# Auto-generated: $(date)
# Domain: $DOMAIN

NEXUS_AGENT_HTTP_ADDR=:9090
NEXUS_API_BASE=$API_URL
NEXUS_AGENT_API_KEY=$API_KEY
NEXUS_NODE_TOKEN=$NODE_TOKEN
NEXUS_NODE_DOMAIN=$DOMAIN
NEXUS_NODE_PUBLIC_URL=https://$DOMAIN
NEXUS_NODE_NAME=$DOMAIN
NEXUS_NODE_REGION=Auto-Detected
NEXUS_DEBUG_IP=
EOF

chmod 600 $INSTALL_DIR/.env
chown -R nexus:nexus $INSTALL_DIR
log_success "Configuration created"

# ============================================
# STEP 8: Create Systemd Service
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[8/10] Setting Up Systemd Service${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

cat > /etc/systemd/system/nexuslink-agent.service << EOF
[Unit]
Description=NexusLink Agent - Fast URL Redirector
Documentation=https://github.com/afuzapratama/nexuslink-project
After=network.target

[Service]
Type=simple
User=nexus
Group=nexus
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/agent
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR

# Limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nexuslink-agent > /dev/null 2>&1
log_success "Systemd service configured"

# ============================================
# STEP 9: Configure Nginx + SSL
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[9/10] Configuring Nginx & SSL${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create Nginx config
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Visitor-User-Agent $http_user_agent;
        proxy_set_header X-Visitor-Referer $http_referer;
        
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
EOF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t > /dev/null 2>&1
systemctl reload nginx
log_success "Nginx configured"

# Configure firewall
log_info "Configuring firewall..."
ufw --force enable > /dev/null 2>&1
ufw default deny incoming > /dev/null 2>&1
ufw default allow outgoing > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force reload > /dev/null 2>&1
log_success "Firewall configured"

# Start agent before SSL
log_info "Starting agent service..."
systemctl start nexuslink-agent
sleep 3

if ! systemctl is-active --quiet nexuslink-agent; then
    log_error "Agent failed to start"
    echo "Check logs: journalctl -u nexuslink-agent -n 50"
    exit 1
fi
log_success "Agent service started"

# Setup SSL
log_info "Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos \
    --email $EMAIL --redirect > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log_success "SSL certificate obtained"
else
    log_warning "SSL setup failed (you can configure manually later)"
fi

# ============================================
# STEP 10: Final Verification
# ============================================
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[10/10] Final Verification${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

# Test local health
if curl -4 -f http://localhost:9090/health > /dev/null 2>&1; then
    log_success "Local health check passed"
else
    log_warning "Local health check failed"
fi

# Test HTTPS (may fail if DNS just propagated)
sleep 2
if curl -4 -fk https://$DOMAIN/health > /dev/null 2>&1; then
    log_success "HTTPS health check passed"
else
    log_warning "HTTPS check failed (may need DNS propagation time)"
fi

# ============================================
# SUCCESS SUMMARY
# ============================================
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ INSTALLATION COMPLETE!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

echo "🎉 Your NexusLink Agent is ready!"
echo ""
echo "📊 Service Status:"
systemctl status nexuslink-agent --no-pager --lines=0
echo ""

echo "🔗 Agent URLs:"
echo "  • HTTP:  http://$DOMAIN/r/{alias}"
echo "  • HTTPS: https://$DOMAIN/r/{alias}"
echo ""

echo "🛠️  Useful Commands:"
echo "  • Status:  systemctl status nexuslink-agent"
echo "  • Logs:    journalctl -u nexuslink-agent -f"
echo "  • Restart: systemctl restart nexuslink-agent"
echo "  • Test:    curl -I https://$DOMAIN/r/test"
echo ""

echo "📝 Next Steps:"
echo "  1. Check dashboard: $API_URL → Nodes (agent should appear)"
echo "  2. Create test link with domain: $DOMAIN"
echo "  3. Test redirect: https://$DOMAIN/r/your-alias"
echo ""

echo "📂 Files:"
echo "  • Binary: $INSTALL_DIR/agent"
echo "  • Config: $INSTALL_DIR/.env"
echo "  • Service: /etc/systemd/system/nexuslink-agent.service"
echo "  • Nginx: /etc/nginx/sites-available/$DOMAIN"
echo ""

# Save installation info
cat > $INSTALL_DIR/INFO.txt << EOF
NexusLink Agent Installation Summary
====================================
Installed: $(date)
Domain: $DOMAIN
API Server: $API_URL
Version: $VERSION

Commands:
- View logs: journalctl -u nexuslink-agent -f
- Restart: systemctl restart nexuslink-agent
- Status: systemctl status nexuslink-agent
- Test: curl -I https://$DOMAIN/r/test

Need more agents? Run the installer again with a different domain!
EOF

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  To add another agent, run this command on another server!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
