#!/bin/bash

################################################################################
# NexusLink Agent - Add Domain Utility
# 
# Usage: sudo ./add-domain.sh example.com
# 
# What it does:
#   1. Verifies DNS points to this server
#   2. Creates Nginx configuration for the new domain
#   3. Obtains SSL certificate via Certbot
#   4. Reloads Nginx
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Check root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Check argument
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name required${NC}"
    echo "Usage: sudo ./add-domain.sh <new-domain.com>"
    exit 1
fi

DOMAIN=$1
EMAIL="admin@$DOMAIN" # Default email for certbot

echo -e "${BLUE}${BOLD}NexusLink Agent - Add Domain: $DOMAIN${NC}"
echo ""

# 1. Verify DNS
echo -e "${YELLOW}[1/4] Verifying DNS...${NC}"
SERVER_IP=$(hostname -I | awk '{print $1}')
DOMAIN_IP=$(dig +short $DOMAIN | grep -E '^[0-9.]+$' | head -1)

if [ -z "$DOMAIN_IP" ]; then
    echo -e "${RED}Error: Could not resolve domain $DOMAIN${NC}"
    exit 1
fi

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}Error: DNS mismatch!${NC}"
    echo "Domain $DOMAIN points to: $DOMAIN_IP"
    echo "This server IP:           $SERVER_IP"
    echo "Please update your DNS records first."
    exit 1
fi
echo -e "${GREEN}DNS verified ✓${NC}"

# 2. Create Nginx Config
echo -e "${YELLOW}[2/4] Configuring Nginx...${NC}"

cat > /etc/nginx/sites-available/$DOMAIN << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        
        # Critical: Pass real visitor IP
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Pass visitor context
        proxy_set_header X-Visitor-User-Agent \$http_user_agent;
        proxy_set_header X-Visitor-Referer \$http_referer;
        
        # Standard proxy headers
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
echo -e "${GREEN}Nginx configured ✓${NC}"

# 3. SSL Setup
echo -e "${YELLOW}[3/4] Obtaining SSL Certificate...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos \
    --email $EMAIL --redirect --register-unsafely-without-email

if [ $? -eq 0 ]; then
    echo -e "${GREEN}SSL certificate obtained ✓${NC}"
else
    echo -e "${RED}SSL setup failed. Check certbot logs.${NC}"
    # Don't exit, Nginx is still working on HTTP
fi

# 4. Final Instructions
echo ""
echo -e "${GREEN}${BOLD}✅ Domain Added Successfully!${NC}"
echo ""
echo "⚠️  IMPORTANT FINAL STEP:"
echo "   Go to your NexusLink Dashboard → Nodes → Click 'Domains' button"
echo "   and add '$DOMAIN' to the whitelist."
echo ""
echo "   The agent will automatically pick up the new domain within 30 seconds."
