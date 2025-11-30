#!/bin/bash

################################################################################
# NexusLink Dashboard Server - VPS 2 Complete Setup Script
# Domain: dashboard.htmlin.my.id
# Role: Next.js Dashboard UI
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        NexusLink Dashboard Server Setup                  ║
║             VPS 2 Configuration                          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please run as ubuntu user (not root)${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "\n${BLUE}[1/10] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js 22 LTS
echo -e "\n${BLUE}[2/10] Installing Node.js 22 LTS...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js already installed: $NODE_VERSION${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"
fi

# Step 3: Clone repository
echo -e "\n${BLUE}[3/10] Cloning NexusLink repository...${NC}"
cd ~
if [ -d "nexuslink-project" ]; then
    echo -e "${YELLOW}⚠️  Repository already exists. Pulling latest...${NC}"
    cd nexuslink-project
    git pull
else
    git clone https://github.com/afuzapratama/nexuslink-project.git
    cd nexuslink-project
fi

# Step 4: Get API configuration
echo -e "\n${BLUE}[4/10] Dashboard Configuration...${NC}"
echo -e "${YELLOW}You need API server information:${NC}"
echo ""
read -p "Enter API URL (e.g., https://api.htmlin.my.id): " API_URL
read -p "Enter API Key (from VPS 1 setup): " API_KEY
read -p "Enter Dashboard Domain (e.g., dashboard.htmlin.my.id): " DOMAIN
read -p "Enter Email for SSL: " EMAIL

# Step 5: Create ENV file
echo -e "\n${BLUE}[5/10] Creating environment file...${NC}"
cd nexuslink-dashboard
cat > .env.production << EOF
# ========================================
# NexusLink Dashboard - Production Config
# Generated: $(date)
# ========================================

# API Connection
NEXUS_API_BASE=$API_URL
NEXUS_API_KEY=$API_KEY

# Next.js Public Config
NEXT_PUBLIC_APP_NAME=NexusLink Dashboard
NEXT_PUBLIC_API_BASE=$API_URL
EOF

chmod 600 .env.production
echo -e "${GREEN}✅ Environment file created${NC}"

# Step 6: Install dependencies
echo -e "\n${BLUE}[6/10] Installing dependencies...${NC}"
npm install

# Step 7: Build production bundle
echo -e "\n${BLUE}[7/10] Building production bundle...${NC}"
echo -e "${YELLOW}This may take 2-3 minutes...${NC}"
npm run build

# Step 8: Install PM2 for process management
echo -e "\n${BLUE}[8/10] Installing PM2...${NC}"
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'nexuslink-dashboard',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | sudo bash

echo -e "${GREEN}✅ Dashboard started with PM2${NC}"

# Step 9: Install Nginx & Certbot
echo -e "\n${BLUE}[9/10] Installing Nginx & SSL...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/nexuslink-dashboard > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/nexuslink-dashboard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if sudo nginx -t; then
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx configured successfully!${NC}"
else
    echo -e "${RED}❌ Nginx configuration failed!${NC}"
    exit 1
fi

# Get SSL certificate
echo -e "\n${BLUE}Getting SSL certificate...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

# Step 10: Configure firewall
echo -e "\n${BLUE}[10/10] Configuring firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# Final summary
echo -e "\n${GREEN}${BOLD}"
cat << "EOF"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              ✅ SETUP COMPLETED!                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}Dashboard Configuration:${NC}"
echo -e "  Domain: ${BOLD}https://$DOMAIN${NC}"
echo -e "  Status: ${BOLD}Running${NC}"
echo -e "  Port: ${BOLD}3000 (proxied via Nginx)${NC}"
echo ""
echo -e "${YELLOW}Important Files:${NC}"
echo -e "  ENV: ${BOLD}~/nexuslink-project/nexuslink-dashboard/.env.production${NC}"
echo -e "  PM2: ${BOLD}pm2 list${NC}"
echo ""
echo -e "${BLUE}Test your Dashboard:${NC}"
echo -e "  ${BOLD}curl https://$DOMAIN${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  Status:  ${BOLD}pm2 status${NC}"
echo -e "  Stop:    ${BOLD}pm2 stop nexuslink-dashboard${NC}"
echo -e "  Start:   ${BOLD}pm2 start nexuslink-dashboard${NC}"
echo -e "  Restart: ${BOLD}pm2 restart nexuslink-dashboard${NC}"
echo -e "  Logs:    ${BOLD}pm2 logs nexuslink-dashboard${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Open Dashboard: ${BOLD}https://$DOMAIN${NC}"
echo -e "  2. Create Node Tokens for Agents"
echo -e "  3. Deploy Agents (VPS 3-22)"
echo ""
