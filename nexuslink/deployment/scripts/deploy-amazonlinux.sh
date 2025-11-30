#!/bin/bash

# NexusLink Deployment Script - Amazon Linux 2023 Version
# Modified from Ubuntu version

set -e

INSTALL_TYPE=${1:-all}  # all, api, agent

echo "🚀 NexusLink Deployment for Amazon Linux 2023"
echo "Installation type: $INSTALL_TYPE"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# ============================================
# 1. UPDATE SYSTEM
# ============================================
update_system() {
    echo -e "${GREEN}📦 Updating system packages...${NC}"
    dnf update -y
    dnf install -y wget curl git tar gzip
}

# ============================================
# 2. INSTALL GO
# ============================================
install_go() {
    echo -e "${GREEN}🔧 Installing Go 1.23...${NC}"
    
    if command -v go &> /dev/null; then
        GO_VERSION=$(go version | awk '{print $3}')
        echo "Go already installed: $GO_VERSION"
        return
    fi
    
    cd /tmp
    wget https://go.dev/dl/go1.23.3.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf go1.23.3.linux-amd64.tar.gz
    
    # Add to PATH for all users
    echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
    export PATH=$PATH:/usr/local/go/bin
    
    go version
}

# ============================================
# 3. INSTALL REDIS (Amazon Linux)
# ============================================
install_redis() {
    echo -e "${GREEN}💾 Installing Redis...${NC}"
    
    # Redis available in amazon-linux-extras
    dnf install -y redis6
    
    # Configure Redis
    sed -i 's/^# requirepass .*/requirepass devpass/' /etc/redis/redis.conf
    sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
    
    # Enable and start
    systemctl enable redis
    systemctl start redis
    
    echo "Redis installed and started"
}

# ============================================
# 4. INSTALL NGINX (Amazon Linux)
# ============================================
install_nginx() {
    echo -e "${GREEN}🌐 Installing Nginx...${NC}"
    
    dnf install -y nginx
    
    systemctl enable nginx
    systemctl start nginx
    
    echo "Nginx installed and started"
}

# ============================================
# 5. CONFIGURE FIREWALL (firewalld on Amazon Linux)
# ============================================
configure_firewall() {
    echo -e "${GREEN}🔥 Configuring firewall...${NC}"
    
    # Install firewalld
    dnf install -y firewalld
    systemctl enable firewalld
    systemctl start firewalld
    
    # Open ports
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=443/tcp
    firewall-cmd --permanent --add-port=8080/tcp
    firewall-cmd --permanent --add-port=9090/tcp
    firewall-cmd --permanent --add-port=6379/tcp  # Redis
    firewall-cmd --reload
    
    echo "Firewall configured"
}

# ============================================
# 6. CREATE USER
# ============================================
create_user() {
    if id "nexus" &>/dev/null; then
        echo "User 'nexus' already exists"
    else
        echo -e "${GREEN}👤 Creating nexus user...${NC}"
        useradd -m -s /bin/bash nexus
        echo "User 'nexus' created"
    fi
}

# ============================================
# 7. BUILD BINARIES
# ============================================
build_binaries() {
    echo -e "${GREEN}🔨 Building binaries...${NC}"
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
    
    cd "$PROJECT_ROOT/nexuslink"
    
    if [ "$INSTALL_TYPE" = "all" ] || [ "$INSTALL_TYPE" = "api" ]; then
        echo "Building API..."
        go build -o api cmd/api/main.go
        chmod +x api
    fi
    
    if [ "$INSTALL_TYPE" = "all" ] || [ "$INSTALL_TYPE" = "agent" ]; then
        echo "Building Agent..."
        go build -o agent cmd/agent/main.go
        chmod +x agent
    fi
    
    echo "Binaries built successfully"
}

# ============================================
# 8. INSTALL SYSTEMD SERVICES
# ============================================
install_systemd_service() {
    echo -e "${GREEN}⚙️  Installing systemd services...${NC}"
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    if [ "$INSTALL_TYPE" = "all" ] || [ "$INSTALL_TYPE" = "api" ]; then
        cp "$SCRIPT_DIR/../systemd/nexuslink-api.service" /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable nexuslink-api
        systemctl start nexuslink-api
        echo "API service installed"
    fi
    
    if [ "$INSTALL_TYPE" = "all" ] || [ "$INSTALL_TYPE" = "agent" ]; then
        cp "$SCRIPT_DIR/../systemd/nexuslink-agent.service" /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable nexuslink-agent
        systemctl start nexuslink-agent
        echo "Agent service installed"
    fi
}

# ============================================
# MAIN EXECUTION
# ============================================

echo -e "${YELLOW}Starting deployment...${NC}"

update_system
create_user
install_go

if [ "$INSTALL_TYPE" = "all" ]; then
    install_redis
    install_nginx
    configure_firewall
fi

build_binaries
install_systemd_service

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "Services status:"
systemctl status nexuslink-api --no-pager | head -3 2>/dev/null || echo "API not installed"
systemctl status nexuslink-agent --no-pager | head -3 2>/dev/null || echo "Agent not installed"
echo ""
echo "Next steps:"
echo "1. Setup SSL: sudo ./deployment/scripts/setup-ssl.sh"
echo "2. Check logs: sudo journalctl -u nexuslink-api -f"
echo "3. Health check: curl http://localhost:8080/health"
