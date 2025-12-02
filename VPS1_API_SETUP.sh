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
    git -c http.version=HTTP/1.1 pull
else
    git -c http.version=HTTP/1.1 clone https://github.com/afuzapratama/nexuslink-project.git
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
echo -e "${GREEN}Press Enter to continue...${NC}"
read -r </dev/tty

# Step 7: Create ENV file
echo -e "\n${BLUE}[7/12] Creating environment file...${NC}"
cd nexuslink
cp .env.api.example .env.production

# Step 8: Configure ENV
echo -e "\n${BLUE}[8/12] Configuring environment variables...${NC}"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  AWS DynamoDB Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Choose authentication method:${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} IAM Role (Recommended for production)"
echo -e "     - No hardcoded credentials"
echo -e "     - Requires IAM role attached to EC2"
echo -e "     - More secure"
echo ""
echo -e "  ${GREEN}2.${NC} Access Keys (Simpler, works immediately)"
echo -e "     - Use AWS Access Key ID + Secret Key"
echo -e "     - Works on any server"
echo -e "     - Easier to setup"
echo ""
echo -n "Enter choice (1 or 2): "
read -r DYNAMO_CHOICE </dev/tty

if [ "$DYNAMO_CHOICE" = "2" ]; then
    echo ""
    echo -e "${BLUE}Using Access Keys method${NC}"
    echo -e "${YELLOW}You need AWS credentials from IAM console:${NC}"
    echo -e "  1. Go to: https://console.aws.amazon.com/iam/home#/users"
    echo -e "  2. Select your user → Security credentials"
    echo -e "  3. Create access key → Copy Access Key ID & Secret"
    echo ""
    
    echo -n "Enter AWS Access Key ID: "
    read -r AWS_KEY_ID </dev/tty
    echo -n "Enter AWS Secret Access Key (hidden): "
    read -rs AWS_SECRET </dev/tty
    echo ""
    echo -n "Enter AWS Region (press Enter for ap-southeast-1): "
    read -r AWS_REGION </dev/tty
    AWS_REGION=${AWS_REGION:-ap-southeast-1}
    
    # Update ENV with credentials
    sed -i "s|AWS_ACCESS_KEY_ID=.*|AWS_ACCESS_KEY_ID=$AWS_KEY_ID|" .env.production
    sed -i "s|AWS_SECRET_ACCESS_KEY=.*|AWS_SECRET_ACCESS_KEY=$AWS_SECRET|" .env.production
    sed -i "s|NEXUS_AWS_REGION=.*|NEXUS_AWS_REGION=$AWS_REGION|" .env.production
    
    echo ""
    echo -e "${GREEN}✅ Access Keys configured!${NC}"
else
    echo ""
    echo -e "${BLUE}Using IAM Role method${NC}"
    echo -e "${YELLOW}⚠️  Make sure you have:${NC}"
    echo -e "  1. Created IAM role with DynamoDB permissions"
    echo -e "  2. Attached role to this EC2 instance"
    echo -e "  3. Verified role: ${BOLD}curl http://169.254.169.254/latest/meta-data/iam/security-credentials/${NC}"
    echo ""
    echo -e "${GREEN}Press Enter if role is attached, or Ctrl+C to abort...${NC}"
    read -r </dev/tty
    echo ""
    echo -n "Enter AWS Region (press Enter for ap-southeast-1): "
    read -r AWS_REGION </dev/tty
    AWS_REGION=${AWS_REGION:-ap-southeast-1}
    
    # Comment out AWS credentials
    sed -i 's|^AWS_ACCESS_KEY_ID=|#AWS_ACCESS_KEY_ID=|' .env.production
    sed -i 's|^AWS_SECRET_ACCESS_KEY=|#AWS_SECRET_ACCESS_KEY=|' .env.production
    sed -i "s|NEXUS_AWS_REGION=.*|NEXUS_AWS_REGION=$AWS_REGION|" .env.production
    
    echo ""
    echo -e "${GREEN}✅ IAM Role configured!${NC}"
fi

# Update other ENV values (API key, Redis, port)
sed -i "s|NEXUS_API_KEY=.*|NEXUS_API_KEY=$API_KEY|" .env.production
sed -i "s|NEXUS_REDIS_PASSWORD=.*|NEXUS_REDIS_PASSWORD=$REDIS_PASSWORD|" .env.production
sed -i "s|NEXUS_API_PORT=.*|NEXUS_API_PORT=8080|" .env.production

# CRITICAL: Ensure DynamoDB endpoint is EMPTY (production = AWS DynamoDB)
# This must be done LAST to avoid being overwritten
sed -i 's|^NEXUS_DYNAMO_ENDPOINT=.*|NEXUS_DYNAMO_ENDPOINT=|' .env.production

echo ""
echo -e "${GREEN}✅ Environment file configured!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Configuration Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
if [ "$DYNAMO_CHOICE" = "2" ]; then
    echo -e "  Auth Method: ${BOLD}Access Keys${NC}"
    echo -e "  Access Key: ${BOLD}${AWS_KEY_ID:0:20}...${NC}"
else
    echo -e "  Auth Method: ${BOLD}IAM Role${NC}"
fi
echo -e "  DynamoDB: ${BOLD}AWS DynamoDB (${AWS_REGION})${NC}"
echo -e "  Redis: ${BOLD}localhost:6379${NC}"
echo -e "  API Port: ${BOLD}8080${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Step 8.5: Configure MaxMind GeoIP (Optional)
echo -e "\n${BLUE}[8.5/12] MaxMind GeoIP Configuration (Optional)${NC}"
echo ""
echo -e "${YELLOW}GeoIP enables location-based analytics and targeting${NC}"
echo -e "${YELLOW}Sign up free at: https://www.maxmind.com/en/geolite2/signup${NC}"
echo ""
echo -n "Do you want to configure GeoIP? (y/n, default: n): "
read -r GEOIP_CHOICE </dev/tty

if [ "$GEOIP_CHOICE" = "y" ] || [ "$GEOIP_CHOICE" = "Y" ]; then
    echo ""
    echo -e "${BLUE}Installing geoipupdate...${NC}"
    
    # Add MaxMind PPA and install geoipupdate
    sudo add-apt-repository -y ppa:maxmind/ppa > /dev/null 2>&1
    sudo apt update > /dev/null 2>&1
    sudo apt install -y geoipupdate > /dev/null 2>&1
    echo -e "${GREEN}✓ geoipupdate installed${NC}"
    
    echo ""
    echo -e "${YELLOW}Enter your MaxMind account details:${NC}"
    echo -e "${YELLOW}(Get these from: https://www.maxmind.com/en/accounts/current/license-key)${NC}"
    echo ""
    
    echo -n "Enter MaxMind Account ID: "
    read -r MAXMIND_ACCOUNT_ID </dev/tty
    
    echo -n "Enter MaxMind License Key: "
    read -r MAXMIND_LICENSE_KEY </dev/tty
    
    # Backup original config
    sudo cp /etc/GeoIP.conf /etc/GeoIP.conf.backup 2>/dev/null || true
    
    # Create GeoIP.conf
    echo -e "${YELLOW}⏳ Configuring GeoIP...${NC}"
    sudo tee /etc/GeoIP.conf > /dev/null <<EOF
# MaxMind GeoIP Configuration
# Generated by NexusLink installer

# Your MaxMind account information
AccountID $MAXMIND_ACCOUNT_ID
LicenseKey $MAXMIND_LICENSE_KEY

# Database editions to download
EditionIDs GeoLite2-ASN GeoLite2-City GeoLite2-Country

# Database directory
DatabaseDirectory /usr/share/GeoIP
EOF
    
    echo -e "${GREEN}✓ GeoIP configuration created${NC}"
    
    # Create database directory if not exists
    sudo mkdir -p /usr/share/GeoIP
    
    # Download databases
    echo ""
    echo -e "${YELLOW}⏳ Downloading GeoIP databases (this may take 1-2 minutes)...${NC}"
    if sudo geoipupdate -v; then
        echo -e "${GREEN}✓ GeoIP databases downloaded${NC}"
        
        # Verify database exists
        if [ -f "/usr/share/GeoIP/GeoLite2-City.mmdb" ]; then
            echo -e "${GREEN}✓ GeoLite2-City.mmdb found${NC}"
            
            # Update ENV file with database path
            sed -i "s|^NEXUS_MAXMIND_DB_PATH=.*|NEXUS_MAXMIND_DB_PATH=/usr/share/GeoIP/GeoLite2-City.mmdb|" .env.production
            echo -e "${GREEN}✓ ENV updated with GeoIP database path${NC}"
        else
            echo -e "${YELLOW}⚠️  Database download may have failed, check manually later${NC}"
        fi
        
        # Setup weekly auto-update cron job
        echo -e "${YELLOW}⏳ Setting up auto-update cron job...${NC}"
        
        # Create cron job that runs weekly (Wednesdays at 3 AM)
        (sudo crontab -l 2>/dev/null || echo "") | grep -v "geoipupdate" > /tmp/nexus-cron
        echo "0 3 * * 3 /usr/bin/geoipupdate -v >> /var/log/geoipupdate.log 2>&1" >> /tmp/nexus-cron
        sudo crontab /tmp/nexus-cron
        rm /tmp/nexus-cron
        
        echo -e "${GREEN}✓ Auto-update scheduled (weekly on Wednesdays at 3 AM)${NC}"
        
        echo ""
        echo -e "${GREEN}✅ GeoIP configured successfully!${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "  Database: ${BOLD}/usr/share/GeoIP/GeoLite2-City.mmdb${NC}"
        echo -e "  Auto-update: ${BOLD}Weekly (Wednesdays 3 AM)${NC}"
        echo -e "  Update logs: ${BOLD}/var/log/geoipupdate.log${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    else
        echo -e "${RED}❌ Failed to download GeoIP databases${NC}"
        echo -e "${YELLOW}⚠️  Check your Account ID and License Key${NC}"
        echo -e "${YELLOW}⚠️  You can manually configure later in /etc/GeoIP.conf${NC}"
    fi
else
    echo -e "${YELLOW}⏭  Skipping GeoIP configuration${NC}"
    echo -e "${YELLOW}   You can configure later by running: sudo apt install geoipupdate${NC}"
fi

# Step 9: Verify ENV configuration
echo -e "\n${BLUE}[9/12] Verifying environment configuration...${NC}"

# Check critical ENV vars
echo -e "${YELLOW}Checking configuration...${NC}"
if grep -q "NEXUS_API_KEY=$API_KEY" .env.production; then
    echo -e "${GREEN}  ✅ API Key configured${NC}"
else
    echo -e "${RED}  ❌ API Key not configured${NC}"
    exit 1
fi

if grep -q "NEXUS_REDIS_PASSWORD=$REDIS_PASSWORD" .env.production; then
    echo -e "${GREEN}  ✅ Redis password configured${NC}"
else
    echo -e "${RED}  ❌ Redis password not configured${NC}"
    exit 1
fi

# Verify AWS configuration
if [ "$DYNAMO_CHOICE" = "2" ]; then
    if grep -q "AWS_ACCESS_KEY_ID=$AWS_KEY_ID" .env.production; then
        echo -e "${GREEN}  ✅ AWS credentials configured${NC}"
    else
        echo -e "${RED}  ❌ AWS credentials not configured${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}  ✅ IAM Role mode (no hardcoded keys)${NC}"
    echo -e "${YELLOW}  ⚠️  Make sure IAM role is attached to this EC2 instance!${NC}"
fi

# Verify DynamoDB endpoint is empty (production)
if grep -q "^NEXUS_DYNAMO_ENDPOINT=$" .env.production || grep -q "^NEXUS_DYNAMO_ENDPOINT=\\s*$" .env.production; then
    echo -e "${GREEN}  ✅ DynamoDB endpoint: AWS DynamoDB (${AWS_REGION})${NC}"
else
    CURRENT_ENDPOINT=$(grep "^NEXUS_DYNAMO_ENDPOINT=" .env.production | cut -d'=' -f2)
    echo -e "${RED}  ❌ DynamoDB endpoint should be empty!${NC}"
    echo -e "${RED}     Current: NEXUS_DYNAMO_ENDPOINT=$CURRENT_ENDPOINT${NC}"
    echo -e "${YELLOW}     Fixing...${NC}"
    sed -i 's|^NEXUS_DYNAMO_ENDPOINT=.*|NEXUS_DYNAMO_ENDPOINT=|' .env.production
    echo -e "${GREEN}  ✅ Fixed: NEXUS_DYNAMO_ENDPOINT= (empty)${NC}"
fi

echo -e "${GREEN}✅ All configuration verified!${NC}"
echo -e "${YELLOW}⚠️  Note: API will be tested after deployment via systemd${NC}"

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
sleep 5
if sudo systemctl is-active --quiet nexuslink-api; then
    echo -e "${GREEN}✅ Service started successfully!${NC}"
    
    # Test health endpoint
    echo -e "${BLUE}Testing API health endpoint...${NC}"
    sleep 2
    if curl -4 -s http://localhost:8080/health 2>/dev/null | grep -q "ok"; then
        echo -e "${GREEN}✅ API is responding correctly!${NC}"
    else
        echo -e "${YELLOW}⚠️  API started but health check failed (might need more time)${NC}"
        echo -e "${YELLOW}   Check logs: sudo journalctl -u nexuslink-api -f${NC}"
    fi
else
    echo -e "${RED}❌ Service failed to start. Checking logs:${NC}"
    sudo journalctl -u nexuslink-api -n 50 --no-pager
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "  1. DynamoDB access: Check IAM role or AWS credentials"
    echo -e "  2. Redis connection: Check password in .env.production"
    echo -e "  3. Port conflict: Check if port 8080 is already in use"
    echo ""
    echo -e "${BLUE}Manual fix:${NC}"
    echo -e "  1. Check logs: sudo journalctl -u nexuslink-api -n 100"
    echo -e "  2. Check env: cat ~/nexuslink-project/nexuslink/.env.production"
    echo -e "  3. Test manually: cd ~/nexuslink-project/nexuslink && go run cmd/api/main.go"
    exit 1
fi

# Step 12: Install Nginx & Certbot
echo -e "\n${BLUE}[12/12] Installing Nginx & SSL...${NC}"
echo -e "${YELLOW}⏳ Installing Nginx & Certbot (if not already installed)...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx > /dev/null 2>&1
echo -e "${GREEN}✓ Nginx & Certbot ready${NC}"

# Create Nginx config
echo -e "\n${BLUE}Configuring Nginx...${NC}"
echo -e "${YELLOW}⚠️ Ensure DNS A record points to this server IP${NC}"
echo ""
echo -n "Enter your domain (e.g., api.htmlin.my.id): "
read -r DOMAIN </dev/tty
echo -n "Enter your email for SSL certificate: "
read -r EMAIL </dev/tty

sudo tee /etc/nginx/sites-available/nexuslink-api > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
        
        # Critical: Pass real visitor IP from agents
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Pass visitor context headers from agents
        proxy_set_header X-Visitor-User-Agent \$http_x_visitor_user_agent;
        proxy_set_header X-Visitor-Referer \$http_x_visitor_referer;
        
        # Standard headers
        proxy_set_header Host \$host;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
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
echo ""
echo -e "${YELLOW}⏳ Obtaining SSL certificate (this may take 1-2 minutes)...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL
echo -e "${GREEN}✓ SSL certificate obtained and configured${NC}"

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
