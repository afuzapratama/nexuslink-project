#!/bin/bash

################################################################################
# Update Nginx Config for Existing Agents
# Fix IP detection & visitor headers forwarding
#
# Usage:
#   1. SSH ke agent VPS
#   2. Run: curl -fsSL https://raw.githubusercontent.com/afuzapratama/nexuslink-project/main/UPDATE_AGENT_NGINX.sh | sudo bash
#
# Or manual:
#   sudo bash UPDATE_AGENT_NGINX.sh
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NexusLink Agent - Nginx Config Update${NC}"
echo -e "${BLUE}  Fix: IP Detection & Visitor Headers${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

# Check root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root: sudo bash $0${NC}"
    exit 1
fi

# Find domain from existing config
echo -e "${BLUE}[1/5] Finding agent domain...${NC}"
DOMAIN=$(ls /etc/nginx/sites-available/ | grep -v default | head -1)

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ No agent config found in /etc/nginx/sites-available/${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found domain: $DOMAIN${NC}"

# Backup existing config
echo -e "\n${BLUE}[2/5] Backing up current config...${NC}"
cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/$DOMAIN.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Backup created${NC}"

# Get SSL block (if exists)
echo -e "\n${BLUE}[3/5] Updating Nginx configuration...${NC}"

# Create new config
cat > /tmp/nexus-nginx-new << 'NGINXEOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        
        # Critical: Pass real visitor IP (not agent's IP)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Pass visitor context for analytics
        proxy_set_header X-Visitor-User-Agent $http_user_agent;
        proxy_set_header X-Visitor-Referer $http_referer;
        
        # Standard proxy headers
        proxy_set_header Host $host;
        
        # Timeouts for fast redirects
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
}
NGINXEOF

# Replace domain placeholder
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /tmp/nexus-nginx-new

# Copy to sites-available
cp /tmp/nexus-nginx-new /etc/nginx/sites-available/$DOMAIN
rm /tmp/nexus-nginx-new

echo -e "${GREEN}✓ Config updated${NC}"

# Test config
echo -e "\n${BLUE}[4/5] Testing Nginx configuration...${NC}"
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Config valid${NC}"
else
    echo -e "${RED}❌ Config test failed!${NC}"
    echo -e "${YELLOW}Restoring backup...${NC}"
    LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/$DOMAIN.backup.* | head -1)
    cp $LATEST_BACKUP /etc/nginx/sites-available/$DOMAIN
    echo -e "${RED}Backup restored. Manual fix needed.${NC}"
    exit 1
fi

# Reload Nginx
echo -e "\n${BLUE}[5/5] Reloading Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# Re-setup SSL if needed
if ! grep -q "listen 443 ssl" /etc/nginx/sites-available/$DOMAIN; then
    echo -e "\n${YELLOW}⚠️  SSL not configured. Running certbot...${NC}"
    
    # Get email from existing SSL cert if exists
    EMAIL=$(certbot certificates 2>/dev/null | grep -A 5 "$DOMAIN" | grep "Domains:" -A 1 | tail -1 | awk '{print $2}')
    
    if [ -z "$EMAIL" ]; then
        echo -n "Enter email for SSL: "
        read EMAIL
    fi
    
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL certificate renewed${NC}"
    else
        echo -e "${YELLOW}⚠️  SSL setup failed (you can configure manually later)${NC}"
    fi
else
    echo -e "${GREEN}✓ SSL already configured${NC}"
fi

# Final summary
echo -e "\n${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Update Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}Changes applied:${NC}"
echo -e "  • X-Real-IP forwarding (visitor's real IP)"
echo -e "  • X-Visitor-User-Agent forwarding"
echo -e "  • X-Visitor-Referer forwarding"
echo -e "  • Optimized timeouts for fast redirects\n"

echo -e "${BLUE}Backups:${NC}"
ls -lht /etc/nginx/sites-available/$DOMAIN.backup.* | head -3
echo ""

echo -e "${BLUE}Test your agent:${NC}"
echo -e "  ${GREEN}curl -I https://$DOMAIN/r/test${NC}\n"

echo -e "${BLUE}Check agent logs:${NC}"
echo -e "  ${GREEN}sudo journalctl -u nexuslink-agent -f${NC}\n"

echo -e "${YELLOW}Note: Check analytics in dashboard to verify real IP is logged${NC}"
