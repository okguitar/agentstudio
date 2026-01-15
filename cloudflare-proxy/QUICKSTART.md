# Quick Start Guide

Get the Cloudflare Subdomain Proxy Service running in 5 minutes.

## Prerequisites

- Python 3.8+
- Cloudflare account with a domain
- Cloudflare API credentials (see [DEPLOYMENT.md](DEPLOYMENT.md#1-cloudflare-account-setup))

## 1. Automated Setup

```bash
cd cloudflare-proxy
bash scripts/setup.sh
```

The script will:
- Install dependencies
- Create `.env` file
- Generate API key
- Initialize database

## 2. Manual Setup

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ZONE_ID=your_zone_id
PARENT_DOMAIN=agentstudio.cc
API_KEYS=generated_key1,generated_key2
DATABASE_URL=sqlite:///./proxy.db
```

### Generate API Keys

```bash
# Generate secure API key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add the generated key to `.env` under `API_KEYS`.

## 3. Start Server

```bash
python run.py
```

Server starts at `http://localhost:8000`

## 4. Test API

### Check Health

```bash
curl http://localhost:8000/health
```

### Check Subdomain Availability

```bash
curl -H "X-API-Key: your_api_key_here" \
  http://localhost:8000/api/subdomain/check/myapp
```

### Create Subdomain

```bash
curl -X POST http://localhost:8000/api/subdomain/create \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "myapp",
    "localPort": 4936,
    "description": "My AgentStudio instance"
  }'
```

Response:

```json
{
  "success": true,
  "subdomain": "myapp",
  "publicUrl": "https://myapp.agentstudio.cc",
  "tunnelId": "xxx-xxx-xxx",
  "tunnelToken": "yyy...",
  "createdAt": "2024-01-15T10:30:00Z",
  "instructions": {
    "cli": "cloudflared tunnel run --token yyy...",
    "docker": "docker run cloudflare/cloudflared:latest tunnel run --token yyy..."
  }
}
```

### Start Cloudflare Tunnel Client

Copy the `tunnelToken` from the response and run:

```bash
# Using Docker (recommended)
docker run -d cloudflare/cloudflared:latest tunnel run --token YOUR_TUNNEL_TOKEN

# Or using CLI
cloudflared tunnel run --token YOUR_TUNNEL_TOKEN
```

Now your local service at port 4936 is accessible at `https://myapp.agentstudio.cc`!

## 5. List All Subdomains

```bash
curl -H "X-API-Key: your_api_key_here" \
  http://localhost:8000/api/subdomain/list
```

## 6. Delete Subdomain

```bash
curl -X DELETE http://localhost:8000/api/subdomain/myapp \
  -H "X-API-Key: your_api_key_here"
```

## Docker Quick Start

```bash
# Build image
docker build -t cloudflare-proxy .

# Run container
docker run -d \
  --name cloudflare-proxy \
  -p 8000:8000 \
  -e CLOUDFLARE_API_TOKEN=your_token \
  -e CLOUDFLARE_ACCOUNT_ID=your_account \
  -e CLOUDFLARE_ZONE_ID=your_zone \
  -e PARENT_DOMAIN=agentstudio.cc \
  -e API_KEYS=your_api_key \
  cloudflare-proxy

# Check logs
docker logs -f cloudflare-proxy
```

## Docker Compose Quick Start

```bash
# Configure .env file
cp .env.example .env
# Edit .env with your credentials

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## API Documentation

Interactive API documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Next Steps

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- See [README.md](README.md) for complete API reference
- Check [tests/](tests/) for example usage

## Troubleshooting

### "Invalid API key" Error

- Verify `X-API-Key` header matches a key in `.env` `API_KEYS`
- Ensure no extra spaces in API key

### "Cloudflare API Error"

- Verify API token has correct permissions:
  - Zone:DNS:Edit
  - Account:Cloudflare Tunnel:Edit
- Check token hasn't expired

### Database Connection Failed

- For SQLite: Ensure write permissions in directory
- For MySQL: Verify connection string and database exists

### Subdomain Not Accessible

- Ensure cloudflared client is running with correct token
- Check Cloudflare dashboard for tunnel status
- Verify local service is running on specified port

## Need Help?

- See detailed [DEPLOYMENT.md](DEPLOYMENT.md)
- Check Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
