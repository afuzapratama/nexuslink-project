#!/bin/bash
#
# NexusLink SSL Setup with Let's Encrypt
# Automated SSL certificate installation and renewal configuration
#
# Usage: sudo bash setup-ssl.sh <domain> <service-type>
# Example: sudo bash setup-ssl.sh api.example.com api
# Service types: api, agent, dashboard
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Check arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <domain> <service-type>"
    echo "Service types: api, agent, dashboard"
    echo "Example: $0 api.example.com api"
    exit 1
fi

DOMAIN=$1
SERVICE_TYPE=$2
EMAIL="admin@$DOMAIN"  # Change this if needed

echo -e "${GREEN}🔐 NexusLink SSL Setup${NC}"
echo "Domain: $DOMAIN"
echo "Service Type: $SERVICE_TYPE"
echo "----------------------------------------"

# Step 1: Install Certbot
echo -e "\n${YELLOW}📦 Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${GREEN}✅ Certbot already installed${NC}"
fi

# Step 2: Install Nginx if not installed
echo -e "\n${YELLOW}📦 Checking Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✅ Nginx installed and started${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Step 3: Create webroot directory for ACME challenge
echo -e "\n${YELLOW}📁 Creating webroot directory...${NC}"
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
echo -e "${GREEN}✅ Webroot created${NC}"

# Step 4: Copy appropriate Nginx config
echo -e "\n${YELLOW}📝 Configuring Nginx...${NC}"
NGINX_CONFIG_SOURCE="/opt/nexuslink/deployment/nginx/${SERVICE_TYPE}.conf"
NGINX_CONFIG_DEST="/etc/nginx/sites-available/nexuslink-${SERVICE_TYPE}"

if [ ! -f "$NGINX_CONFIG_SOURCE" ]; then
    echo -e "${RED}❌ Nginx config not found: $NGINX_CONFIG_SOURCE${NC}"
    exit 1
fi

# Replace yourdomain.com with actual domain
sed "s/yourdomain.com/$DOMAIN/g" "$NGINX_CONFIG_SOURCE" > "$NGINX_CONFIG_DEST"

# Create symlink (disable first if exists)
ln -sf "$NGINX_CONFIG_DEST" "/etc/nginx/sites-enabled/nexuslink-${SERVICE_TYPE}"
echo -e "${GREEN}✅ Nginx config installed${NC}"

# Step 5: Test Nginx configuration
echo -e "\n${YELLOW}🧪 Testing Nginx configuration...${NC}"
nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx config valid${NC}"
else
    echo -e "${RED}❌ Nginx config invalid${NC}"
    exit 1
fi

# Step 6: Reload Nginx
systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded${NC}"

# Step 7: Obtain SSL certificate
echo -e "\n${YELLOW}🔐 Obtaining SSL certificate from Let's Encrypt...${NC}"
echo "This may take a few moments..."

certbot certonly --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    --rsa-key-size 4096

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo "Please check:"
    echo "  - Domain DNS is pointing to this server"
    echo "  - Port 80 and 443 are open in firewall"
    echo "  - No other web server is using port 80"
    exit 1
fi

# Step 8: Update Nginx config to use SSL
echo -e "\n${YELLOW}🔄 Updating Nginx to use SSL...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx reloaded with SSL${NC}"

# Step 9: Setup auto-renewal
echo -e "\n${YELLOW}🔄 Setting up automatic renewal...${NC}"

# Create renewal hook script
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Test renewal process (dry-run)
certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Auto-renewal configured successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Auto-renewal test had warnings (this is usually OK)${NC}"
fi

# Step 10: Setup cron job for renewal (Certbot should do this automatically)
echo -e "\n${YELLOW}⏰ Checking renewal cron job...${NC}"
if ! crontab -l | grep -q certbot; then
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${GREEN}✅ Renewal cron job added${NC}"
else
    echo -e "${GREEN}✅ Renewal cron job already exists${NC}"
fi

# Step 11: Display certificate info
echo -e "\n${GREEN}📋 Certificate Information:${NC}"
certbot certificates -d "$DOMAIN"

# Final summary
echo -e "\n${GREEN}✅ SSL Setup Complete!${NC}"
echo "----------------------------------------"
echo "Domain: https://$DOMAIN"
echo "Certificate Location: /etc/letsencrypt/live/$DOMAIN/"
echo "Auto-Renewal: Enabled (runs twice daily)"
echo ""
echo "Next steps:"
echo "1. Verify HTTPS is working: curl -I https://$DOMAIN/health"
echo "2. Test SSL score: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "3. Check auto-renewal: sudo certbot renew --dry-run"
echo ""
echo -e "${YELLOW}⚠️  Remember to update your DNS if not done already!${NC}"
