#!/bin/bash

# Fix Nginx config untuk agent - tambahkan User-Agent header forwarding

if [ $# -ne 1 ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 link.siswayapim.com"
    exit 1
fi

DOMAIN=$1

echo "Fixing Nginx config for $DOMAIN..."

ssh root@$DOMAIN << 'ENDSSH'
# Backup
cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/$DOMAIN.backup

# Update config dengan header yang lengkap
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    listen 443 ssl;
    server_name $DOMAIN;

    # SSL config (jika sudah ada certbot akan update)
    
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

# Replace DOMAIN placeholder
sed -i "s/\$DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

# Test dan reload
nginx -t && systemctl reload nginx

echo "Nginx config updated and reloaded!"
ENDSSH

echo "Done! Test redirect now."
