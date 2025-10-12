#!/bin/bash

# Nginx + SSL Setup Script for AgentStudio Backend
# This script configures nginx with SSL certificate for your domain
# Usage: ./setup-nginx-ssl.sh <domain> [email] [backend_port]

set -e

# Default values
DEFAULT_EMAIL="admin@agentstudio.cc"
DEFAULT_PORT="4936"

# Parse arguments
DOMAIN=${1:-}
EMAIL=${2:-$DEFAULT_EMAIL}
BACKEND_PORT=${3:-$DEFAULT_PORT}

# Validate required domain parameter
if [ -z "$DOMAIN" ]; then
    echo "❌ Error: Domain is required"
    echo ""
    echo "Usage: $0 <domain> [email] [backend_port]"
    echo ""
    echo "Examples:"
    echo "  $0 jeff-hk.agentstudio.cc"
    echo "  $0 jeff-hk.agentstudio.cc bbmyth@gmail.com"
    echo "  $0 jeff-hk.agentstudio.cc bbmyth@gmail.com 8080"
    echo ""
    exit 1
fi

echo "🚀 Starting Nginx + SSL setup for $DOMAIN..."
echo "📧 Email: $EMAIL"
echo "🔌 Backend Port: $BACKEND_PORT"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running as root for apt operations
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

# Update package list
echo "📦 Updating package list..."
$SUDO apt update

# Install nginx if not already installed
if ! command_exists nginx; then
    echo "🔧 Installing nginx..."
    $SUDO apt install nginx -y
else
    echo "✅ Nginx is already installed"
fi

# Install certbot and nginx plugin if not already installed
if ! command_exists certbot; then
    echo "🔐 Installing certbot for SSL certificates..."
    $SUDO apt install certbot python3-certbot-nginx -y
else
    echo "✅ Certbot is already installed"
fi

# Stop nginx to free up port 80 for certbot validation
echo "⏸️  Temporarily stopping nginx for certificate validation..."
$SUDO systemctl stop nginx

# Create initial nginx configuration (HTTP only)
echo "📝 Creating initial nginx configuration..."
$SUDO tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Enhanced location block with SSE support
    location / {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # SSE (Server-Sent Events) support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 86400s;

        # SSE specific headers
        proxy_set_header Accept \$http_accept;
        proxy_set_header Cache-Control no-cache;
        proxy_set_header X-Accel-Buffering no;

        # Note: CORS headers are handled by the backend application
        # This prevents duplicate CORS headers that cause browser errors
    }
}
EOF

# Enable the site
echo "🔗 Enabling the site..."
$SUDO ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  Removing default site..."
    $SUDO rm /etc/nginx/sites-enabled/default
fi

# Test initial nginx configuration
echo "🧪 Testing initial nginx configuration..."
if ! $SUDO nginx -t; then
    echo "❌ Initial nginx configuration test failed"
    exit 1
fi

# Start nginx for certificate validation
echo "🚀 Starting nginx for certificate validation..."
$SUDO systemctl start nginx

# Wait a moment for nginx to fully start
sleep 3

# Check if backend service is running
echo "🔍 Checking if backend service is running on port $BACKEND_PORT..."
if curl -s --connect-timeout 5 http://127.0.0.1:$BACKEND_PORT > /dev/null; then
    echo "✅ Backend service is responding on port $BACKEND_PORT"
else
    echo "⚠️  Warning: Backend service is not responding on port $BACKEND_PORT"
    echo "   Please ensure your backend service is running before continuing"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
fi

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN..."
if $SUDO certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email --non-interactive; then
    echo "✅ SSL certificate obtained successfully!"
else
    echo "❌ Failed to obtain SSL certificate"
    echo "   Possible causes:"
    echo "   - Domain DNS records are not pointing to this server"
    echo "   - Port 80 is blocked by firewall"
    echo "   - Domain is not reachable from the internet"
    exit 1
fi

# Verify automatic renewal is configured
echo "🔄 Verifying automatic renewal configuration..."
if systemctl list-timers certbot.timer --no-pager | grep -q "certbot.timer"; then
    echo "✅ Automatic renewal is configured via systemd timer"
else
    echo "⚠️  Automatic renewal timer not found, configuring manually..."
    $SUDO systemctl enable certbot.timer
    $SUDO systemctl start certbot.timer
fi

# Test final nginx configuration
echo "🧪 Testing final nginx configuration..."
if $SUDO nginx -t; then
    echo "✅ Final nginx configuration is valid"
else
    echo "❌ Final nginx configuration test failed"
    exit 1
fi

# Ensure nginx is running and enabled
echo "🚀 Ensuring nginx is running and enabled..."
$SUDO systemctl reload nginx
$SUDO systemctl enable nginx

# Check final status
echo "📊 Checking final service status..."
$SUDO systemctl status nginx --no-pager | head -10

# Check if ports are listening
echo "🔍 Checking if ports are listening..."
sleep 2
echo "HTTP port 80:"
$SUDO netstat -tlnp | grep :80 || echo "  Not listening"
echo "HTTPS port 443:"
$SUDO netstat -tlnp | grep :443 || echo "  Not listening"

# Test HTTPS access
echo "🌐 Testing HTTPS access..."
if curl -s --connect-timeout 10 -I https://$DOMAIN > /dev/null; then
    echo "✅ HTTPS access is working!"
else
    echo "⚠️  HTTPS test failed - this might be due to DNS propagation"
    echo "   Please test manually after DNS records are updated"
fi

echo ""
echo "🎉 Nginx + SSL setup completed successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo "   Backend Port: $BACKEND_PORT"
echo "   HTTP URL: http://$DOMAIN (redirects to HTTPS)"
echo "   HTTPS URL: https://$DOMAIN"
echo "   SSE Support: ✅ Enabled"
echo ""
echo "📁 Important Files:"
echo "   Nginx Config: /etc/nginx/sites-available/$DOMAIN"
echo "   SSL Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   SSL Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "   Certbot Logs: /var/log/letsencrypt/letsencrypt.log"
echo ""
echo "🔧 Useful Commands:"
echo "   - Check nginx status: $SUDO systemctl status nginx"
echo "   - View nginx logs: $SUDO tail -f /var/log/nginx/access.log"
echo "   - Restart nginx: $SUDO systemctl restart nginx"
echo "   - Test nginx config: $SUDO nginx -t"
echo "   - Check certificate expiry: $SUDO certbot certificates"
echo "   - Force certificate renewal: $SUDO certbot renew --dry-run"
echo "   - Test renewal process: $SUDO certbot renew --dry-run"
echo ""
echo "🔄 Automatic Renewal:"
echo "   - Systemd Timer: $SUDO systemctl status certbot.timer"
echo "   - Renewal will trigger automatically when < 30 days remaining"
echo "   - You can also manually renew: $SUDO certbot renew"
echo ""
echo "⚠️  Important Notes:"
echo "   - Ensure DNS A record for $DOMAIN points to this server's IP"
echo "   - Keep port 80 and 443 open in firewall"
echo "   - Backup your SSL certificates from /etc/letsencrypt/ regularly"
echo "   - Monitor certificate expiry (certificates expire every 90 days)"