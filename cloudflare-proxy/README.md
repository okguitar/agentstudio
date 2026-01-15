# Cloudflare Subdomain Proxy Service

A centralized service for managing Cloudflare Tunnel subdomains across multiple AgentStudio instances.

## Features

- 🚀 Automatic subdomain allocation under your custom domain
- 🔐 API key authentication
- 🗄️ SQLAlchemy-based storage (SQLite for dev, MySQL for production)
- ✅ Subdomain availability checking
- 🌐 Cloudflare DNS + Tunnel management
- 🐳 Docker deployment ready

## Architecture

```
AgentStudio Instance → [API Key Auth] → Proxy Service → Cloudflare API
                                            ↓
                                        Database
                                    (Tunnels, DNS Records)
```

## Quick Start

### Development Setup

```bash
# 1. Install dependencies
cd cloudflare-proxy
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env with your Cloudflare credentials

# 3. Run development server
python run.py
```

### Environment Variables

```env
# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
PARENT_DOMAIN=agentstudio.cc

# API Security
API_KEYS=key1,key2,key3  # Comma-separated API keys

# Database
DATABASE_URL=sqlite:///./proxy.db  # Dev: SQLite, Prod: mysql://...

# Service
HOST=0.0.0.0
PORT=8000
```

## API Endpoints

### 1. Create Subdomain & Tunnel

```bash
POST /api/subdomain/create
Headers:
  X-API-Key: your-api-key
  Content-Type: application/json

Body:
{
  "subdomain": "user123",      # Optional, auto-generated if not provided
  "localPort": 4936,
  "description": "User's instance"  # Optional
}

Response:
{
  "success": true,
  "subdomain": "user123",
  "publicUrl": "https://user123.agentstudio.cc",
  "tunnelId": "xxx-xxx-xxx",
  "tunnelToken": "yyy...",
  "createdAt": "2024-01-15T10:30:00Z",
  "instructions": {
    "cli": "cloudflared tunnel run --token yyy...",
    "docker": "docker run cloudflare/cloudflared:latest tunnel run --token yyy..."
  }
}
```

### 2. Check Subdomain Availability

```bash
GET /api/subdomain/check/{subdomain}
Headers:
  X-API-Key: your-api-key

Response:
{
  "subdomain": "user123",
  "available": false,
  "message": "Subdomain is already taken"
}
```

### 3. Delete Subdomain

```bash
DELETE /api/subdomain/{subdomain}
Headers:
  X-API-Key: your-api-key

Response:
{
  "success": true,
  "message": "Subdomain user123 deleted successfully"
}
```

### 4. List All Subdomains

```bash
GET /api/subdomain/list
Headers:
  X-API-Key: your-api-key

Response:
{
  "success": true,
  "subdomains": [
    {
      "subdomain": "user123",
      "publicUrl": "https://user123.agentstudio.cc",
      "tunnelId": "xxx",
      "createdAt": "2024-01-15T10:30:00Z",
      "status": "active"
    }
  ]
}
```

## Database Schema

### Table: `tunnels`

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| subdomain | String(100) | Subdomain prefix (unique) |
| tunnel_id | String(200) | Cloudflare tunnel ID |
| tunnel_name | String(200) | Tunnel name |
| tunnel_secret | Text | Tunnel secret (encrypted) |
| dns_record_id | String(200) | Cloudflare DNS record ID |
| public_url | String(500) | Full public URL |
| local_port | Integer | Local port mapping |
| description | Text | Optional description |
| status | String(20) | active/inactive/deleted |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t cloudflare-proxy .

# Run container
docker run -d \
  --name cloudflare-proxy \
  -p 8000:8000 \
  -e CLOUDFLARE_API_TOKEN=xxx \
  -e CLOUDFLARE_ACCOUNT_ID=xxx \
  -e CLOUDFLARE_ZONE_ID=xxx \
  -e PARENT_DOMAIN=agentstudio.cc \
  -e API_KEYS=key1,key2 \
  -e DATABASE_URL=mysql://user:pass@host/db \
  cloudflare-proxy
```

### Production Notes

1. **Database Migration**: Use MySQL in production
   ```env
   DATABASE_URL=mysql+pymysql://user:password@localhost/cloudflare_proxy
   ```

2. **Security**:
   - Use strong API keys (32+ characters)
   - Enable HTTPS (use reverse proxy like Nginx)
   - Rotate API keys regularly

3. **Monitoring**: Check `/health` endpoint for service status

## Development

### Project Structure

```
cloudflare-proxy/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # Database connection
│   ├── cloudflare_manager.py # Cloudflare API client
│   ├── auth.py              # API key authentication
│   └── config.py            # Configuration management
├── tests/
│   ├── test_api.py
│   └── test_cloudflare.py
├── requirements.txt
├── Dockerfile
├── .env.example
├── run.py                   # Development server
└── README.md
```

### Running Tests

```bash
pytest tests/
```

## License

Apache 2.0
