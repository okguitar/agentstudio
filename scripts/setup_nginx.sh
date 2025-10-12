#!/bin/bash

# Nginx setup script for jeff-hk.agentstudio.cc
# This script will configure nginx to proxy jeff-hk.agentstudio.cc to localhost:4936

set -e

echo "🚀 Starting Nginx setup for jeff-hk.agentstudio.cc..."

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "🔧 Installing nginx..."
    sudo apt install nginx -y
else
    echo "✅ Nginx is already installed"
fi

# Create nginx configuration file
echo "📝 Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/jeff-hk.agentstudio.cc > /dev/null << 'EOF'
server {
    listen 80;
    server_name jeff-hk.agentstudio.cc;

    # Enhanced location block with SSE support
    location / {
        proxy_pass http://127.0.0.1:4936;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE (Server-Sent Events) support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 86400s;

        # SSE specific headers
        proxy_set_header Accept $http_accept;
        proxy_set_header Cache-Control no-cache;
        proxy_set_header X-Accel-Buffering no;

        # Note: CORS headers are handled by the backend application
        # This prevents duplicate CORS headers that cause browser errors
    }
}
EOF

# Enable the site
echo "🔗 Enabling the site..."
sudo ln -sf /etc/nginx/sites-available/jeff-hk.agentstudio.cc /etc/nginx/sites-enabled/

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "🗑️  Removing default site..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Start and enable nginx service
echo "🚀 Starting nginx service..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Check nginx status
echo "📊 Checking nginx status..."
sudo systemctl status nginx --no-pager

# Check if port 80 is listening
echo "🔍 Checking if port 80 is listening..."
sleep 2
sudo netstat -tlnp | grep :80

echo ""
echo "🎉 Nginx setup completed successfully!"
echo ""
echo "📋 Configuration Summary:"
echo "   Domain: jeff-hk.agentstudio.cc"
echo "   Backend Port: 4936"
echo "   HTTP URL: http://jeff-hk.agentstudio.cc"
echo "   SSE Support: ✅ Enabled"
echo ""
echo "📋 Next steps:"
echo "1. Make sure your DNS A record for 'jeff-hk.agentstudio.cc' points to this server's IP"
echo "2. Ensure your backend service is running on port 4936"
echo "3. Test the setup by visiting: http://jeff-hk.agentstudio.cc"
echo ""
echo "🔧 Useful commands:"
echo "- Check nginx status: sudo systemctl status nginx"
echo "- View nginx logs: sudo tail -f /var/log/nginx/access.log"
echo "- Restart nginx: sudo systemctl restart nginx"
echo "- Test configuration: sudo nginx -t"