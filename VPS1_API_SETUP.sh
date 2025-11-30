#!/bin/bash

################################################################################
# NexusLink API Server - VPS 1 Complete Setup Script
# Domain: api.htmlin.my.id
# Role: Core API + DynamoDB + Redis
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
║           NexusLink API Server Setup                     ║
║              VPS 1 Configuration                         ║
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
echo -e "\n${BLUE}[1/12] Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Redis
echo -e "\n${BLUE}[2/12] Installing Redis...${NC}"
sudo apt install -y redis-server

# Step 3: Configure Redis
echo -e "\n${BLUE}[3/12] Configuring Redis...${NC}"

# Generate strong Redis password
REDIS_PASSWORD=$(openssl rand -hex 16)
echo -e "${GREEN}Generated Redis Password:${NC} ${BOLD}$REDIS_PASSWORD${NC}"

# Backup original config
sudo cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configure Redis password
echo -e "${YELLOW}Configuring Redis with password...${NC}"
if sudo grep -q "^requirepass" /etc/redis/redis.conf; then
    # Password already set, update it
    sudo sed -i "s/^requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
else
    # No password set, add it (find commented line and replace)
    if sudo grep -q "^# requirepass" /etc/redis/redis.conf; then
        sudo sed -i "s/^# requirepass .*/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
    else
        # Fallback: append at end
        echo "requirepass $REDIS_PASSWORD" | sudo tee -a /etc/redis/redis.conf > /dev/null
    fi
fi

# Also bind to localhost only (security)
sudo sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf

# Reload systemd and restart Redis
sudo systemctl daemon-reload
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Wait for Redis to start
sleep 2

# Test Redis connection
echo -e "\n${BLUE}Testing Redis connection...${NC}"
if redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis connected successfully!${NC}"
else
    echo -e "${RED}❌ Redis connection failed! Checking status...${NC}"
    sudo systemctl status redis-server --no-pager
    exit 1
fi

# Save password to file for reference
echo "$REDIS_PASSWORD" > ~/redis-password.txt
chmod 600 ~/redis-password.txt
echo -e "${YELLOW}Redis password saved to: ${BOLD}~/redis-password.txt${NC}"

# Step 4: Install Go
echo -e "\n${BLUE}[4/12] Installing Go...${NC}"
sudo apt install -y golang-go
go version

# Step 5: Clone repository
echo -e "\n${BLUE}[5/12] Cloning NexusLink repository...${NC}"
cd ~
if [ -d "nexuslink-project" ]; then
    echo -e "${YELLOW}⚠️  Repository already exists. Pulling latest...${NC}"
    cd nexuslink-project
    git pull
else
    git clone https://github.com/afuzapratama/nexuslink-project.git
    cd nexuslink-project
fi

# Step 6: Generate API key
echo -e "\n${BLUE}[6/12] Generating strong API key...${NC}"
API_KEY=$(openssl rand -hex 32)
echo -e "${GREEN}✅ Generated API Key:${NC}"
echo -e "${BOLD}$API_KEY${NC}"
echo ""
echo -e "${YELLOW}⚠️  SAVE THIS KEY! You'll need it for Dashboard & Agents!${NC}"
echo "$API_KEY" > ~/nexuslink-api-key.txt
echo -e "Also saved to: ${BOLD}~/nexuslink-api-key.txt${NC}"
echo ""
read -p "Press Enter to continue..."

# Step 7: Create ENV file
echo -e "\n${BLUE}[7/12] Creating environment file...${NC}"
cd nexuslink
cp .env.api.example .env.production

# Step 8: Configure ENV
echo -e "\n${BLUE}[8/12] Configuring environment variables...${NC}"
echo -e "${YELLOW}Choose DynamoDB setup method:${NC}"
echo "1. IAM Role (Recommended for production)"
echo "2. Access Keys (For testing)"
read -p "Enter choice (1 or 2): " DYNAMO_CHOICE

if [ "$DYNAMO_CHOICE" = "2" ]; then
    echo ""
    read -p "Enter AWS Access Key ID: " AWS_KEY_ID
    read -sp "Enter AWS Secret Access Key: " AWS_SECRET
    echo ""
    
    # Update ENV with credentials
    sed -i "s|AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$AWS_KEY_ID|" .env.production
    sed -i "s|AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$AWS_SECRET|" .env.production
else
    echo -e "${GREEN}✅ Using IAM Role (make sure it's attached to this EC2)${NC}"
    # Comment out AWS credentials
    sed -i 's|^AWS_ACCESS_KEY_ID=|#AWS_ACCESS_KEY_ID=|' .env.production
    sed -i 's|^AWS_SECRET_ACCESS_KEY=|#AWS_SECRET_ACCESS_KEY=|' .env.production
fi

# Update other ENV values
sed -i "s|NEXUS_API_KEY=.*|NEXUS_API_KEY=$API_KEY|" .env.production
sed -i "s|NEXUS_REDIS_PASSWORD=.*|NEXUS_REDIS_PASSWORD=$REDIS_PASSWORD|" .env.production

echo -e "${GREEN}✅ Environment file configured!${NC}"

# Step 9: Test API locally
echo -e "\n${BLUE}[9/12] Testing API locally...${NC}"
echo -e "${YELLOW}Starting API in background for testing...${NC}"
go run cmd/api/main.go &
API_PID=$!
sleep 5

# Test health endpoint
if curl -s http://localhost:8080/health | grep -q "ok"; then
    echo -e "${GREEN}✅ API is running successfully!${NC}"
    kill $API_PID
else
    echo -e "${RED}❌ API failed to start. Check logs above.${NC}"
    kill $API_PID
    exit 1
fi

# Step 10: Build binary
echo -e "\n${BLUE}[10/12] Building production binary...${NC}"
go build -o /tmp/nexuslink-api cmd/api/main.go
sudo mv /tmp/nexuslink-api /usr/local/bin/nexuslink-api
sudo chmod +x /usr/local/bin/nexuslink-api

# Step 11: Create SystemD service
echo -e "\n${BLUE}[11/12] Creating systemd service...${NC}"
sudo tee /etc/systemd/system/nexuslink-api.service > /dev/null <<EOF
[Unit]
Description=NexusLink API Server
After=network.target redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$HOME/nexuslink-project/nexuslink
ExecStart=/usr/local/bin/nexuslink-api
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security hardening
PrivateTmp=yes
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$HOME/nexuslink-project/nexuslink

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nexuslink-api
sudo systemctl start nexuslink-api

# Wait and check status
sleep 3
if sudo systemctl is-active --quiet nexuslink-api; then
    echo -e "${GREEN}✅ Service started successfully!${NC}"
else
    echo -e "${RED}❌ Service failed to start. Checking logs:${NC}"
    sudo journalctl -u nexuslink-api -n 20
    exit 1
fi

# Step 12: Install Nginx & Certbot
echo -e "\n${BLUE}[12/12] Installing Nginx & Certbot...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
echo -e "\n${BLUE}Configuring Nginx...${NC}"
read -p "Enter your domain (e.g., api.htmlin.my.id): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

sudo tee /etc/nginx/sites-available/nexuslink-api > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:8080;
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
sudo ln -sf /etc/nginx/sites-available/nexuslink-api /etc/nginx/sites-enabled/
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

# Setup firewall
echo -e "\n${BLUE}Configuring firewall...${NC}"
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

echo -e "${GREEN}API Server Configuration:${NC}"
echo -e "  Domain: ${BOLD}https://$DOMAIN${NC}"
echo -e "  Status: ${BOLD}Running${NC}"
echo -e "  Port: ${BOLD}8080 (proxied via Nginx)${NC}"
echo ""
echo -e "${YELLOW}Important Information:${NC}"
echo -e "  API Key: ${BOLD}$API_KEY${NC}"
echo -e "  API Key saved to: ${BOLD}~/nexuslink-api-key.txt${NC}"
echo -e "  Redis Password: ${BOLD}$REDIS_PASSWORD${NC}"
echo ""
echo -e "${BLUE}Test your API:${NC}"
echo -e "  ${BOLD}curl https://$DOMAIN/health${NC}"
echo ""
echo -e "${BLUE}Check service status:${NC}"
echo -e "  ${BOLD}sudo systemctl status nexuslink-api${NC}"
echo ""
echo -e "${BLUE}View logs:${NC}"
echo -e "  ${BOLD}sudo journalctl -u nexuslink-api -f${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Test API health endpoint"
echo -e "  2. Save API key for Dashboard & Agents"
echo -e "  3. Setup Dashboard (VPS 2)"
echo -e "  4. Deploy Agents (VPS 3-22)"
echo ""
