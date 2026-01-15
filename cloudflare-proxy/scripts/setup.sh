#!/bin/bash
# Quick setup script for Cloudflare Subdomain Proxy Service

set -e

echo "======================================"
echo "Cloudflare Subdomain Proxy Setup"
echo "======================================"
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "✓ Python 3 detected: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed"
    exit 1
fi

echo "✓ pip3 detected"
echo ""

# Install dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Setup environment file
if [ ! -f .env ]; then
    echo "Creating .env file from example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env file with your Cloudflare credentials:"
    echo "   - CLOUDFLARE_API_TOKEN"
    echo "   - CLOUDFLARE_ACCOUNT_ID"
    echo "   - CLOUDFLARE_ZONE_ID"
    echo "   - PARENT_DOMAIN"
    echo "   - API_KEYS"
    echo ""
    read -p "Press Enter after you've configured .env file..."
else
    echo "✓ .env file already exists"
fi

# Generate API key if needed
echo ""
read -p "Generate a random API key? (y/n): " generate_key
if [ "$generate_key" = "y" ]; then
    API_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    echo ""
    echo "Generated API Key:"
    echo "================================"
    echo "$API_KEY"
    echo "================================"
    echo ""
    echo "⚠️  Save this key securely! Add it to .env file under API_KEYS"
    echo ""
fi

# Initialize database
echo "Initializing database..."
python3 -c "from app.database import init_db; init_db()"
echo "✓ Database initialized"
echo ""

echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "To start the server:"
echo "  python3 run.py"
echo ""
echo "The service will be available at:"
echo "  http://localhost:8000"
echo ""
echo "API Documentation:"
echo "  http://localhost:8000/docs"
echo ""
echo "Health Check:"
echo "  curl http://localhost:8000/health"
echo ""
