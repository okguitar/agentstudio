# AgentStudio Integration Guide

This document explains how to integrate the Cloudflare Subdomain Proxy Service with AgentStudio instances.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Proxy Service                     │
│                  (This Repository)                           │
│                                                              │
│  • Manages subdomains under your domain                     │
│  • Creates Cloudflare Tunnels                               │
│  • Configures DNS records automatically                     │
│  • Provides API for subdomain operations                    │
│                                                              │
│  API: https://cf-proxy.yourdomain.com                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP API Calls
                     │ (X-API-Key: xxx)
                     │
┌────────────────────┴────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │ AgentStudio  │        │ AgentStudio  │                  │
│  │ Instance #1  │        │ Instance #2  │   ...            │
│  │              │        │              │                  │
│  │ Port: 4936   │        │ Port: 4936   │                  │
│  └──────────────┘        └──────────────┘                  │
│                                                              │
│  Each instance calls proxy service to get:                  │
│  • Unique subdomain (e.g., user123.agentstudio.cc)         │
│  • Tunnel token                                             │
│  • cloudflared startup command                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Integration Steps

### 1. Deploy Proxy Service

First, deploy this proxy service to a server with a public URL.

**Recommended: Use Docker**

```bash
# On your server
git clone <this-repo>
cd cloudflare-proxy

# Configure environment
cp .env.example .env
# Edit .env with your Cloudflare credentials

# Start service
docker-compose up -d

# Verify
curl http://localhost:8000/health
```

**Make it accessible**: Use nginx to expose on subdomain:
- Example: `https://cf-proxy.yourdomain.com`
- See [DEPLOYMENT.md](DEPLOYMENT.md#option-3-behind-nginx-reverse-proxy)

### 2. Update AgentStudio Backend

Add new environment variables to `backend/.env`:

```env
# Cloudflare Proxy Service
CLOUDFLARE_PROXY_URL=https://cf-proxy.yourdomain.com
CLOUDFLARE_PROXY_API_KEY=your_generated_api_key_here
```

### 3. Create New API Route in AgentStudio

Create `backend/src/routes/publicAccess.ts`:

```typescript
import express, { Router } from 'express';
import fetch from 'node-fetch';

const router: Router = express.Router();

const PROXY_URL = process.env.CLOUDFLARE_PROXY_URL;
const PROXY_API_KEY = process.env.CLOUDFLARE_PROXY_API_KEY;

// GET /api/public-access/check/:subdomain
router.get('/check/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const response = await fetch(
      `${PROXY_URL}/api/subdomain/check/${subdomain}`,
      {
        headers: {
          'X-API-Key': PROXY_API_KEY
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check subdomain',
      message: error.message
    });
  }
});

// POST /api/public-access/create
router.post('/create', async (req, res) => {
  try {
    const { subdomain, localPort = 4936, description } = req.body;

    const response = await fetch(
      `${PROXY_URL}/api/subdomain/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PROXY_API_KEY
        },
        body: JSON.stringify({
          subdomain,
          localPort,
          description
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create subdomain');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create subdomain',
      message: error.message
    });
  }
});

// DELETE /api/public-access/:subdomain
router.delete('/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const response = await fetch(
      `${PROXY_URL}/api/subdomain/${subdomain}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-Key': PROXY_API_KEY
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete subdomain',
      message: error.message
    });
  }
});

export default router;
```

Register the route in `backend/src/index.ts`:

```typescript
import publicAccessRouter from './routes/publicAccess.js';

// ... other imports

app.use('/api/public-access', publicAccessRouter);
```

### 4. Update Frontend Component

Update `frontend/src/pages/settings/CloudflareTunnelPage.tsx`:

Replace the existing implementation with simplified version that calls the new API:

```typescript
// Remove credential configuration UI
// Keep only:
// 1. Subdomain input (optional)
// 2. "One-Click Enable" button
// 3. Display public URL + cloudflared command

const enablePublicAccess = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/public-access/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt')}`
      },
      body: JSON.stringify({
        subdomain: subdomain || undefined,
        localPort: 4936,
        description: 'AgentStudio instance'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create public access');
    }

    const data = await response.json();

    // Display result
    setPublicUrl(data.publicUrl);
    setTunnelToken(data.tunnelToken);
    setInstructions(data.instructions);

  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 5. Simplified User Flow

**Before** (Complex):
```
1. User clicks "Enable Public Access"
2. System asks for Cloudflare API Token
3. System asks for Account ID
4. System asks for Zone ID
5. User fills subdomain
6. System creates tunnel
7. User runs cloudflared command
```

**After** (Simple):
```
1. User clicks "Enable Public Access"
2. (Optional) User fills subdomain
3. System returns public URL + command
4. User runs cloudflared command
✨ Done!
```

## Frontend UI Redesign

### Recommended New Layout

```
┌─────────────────────────────────────────────────────┐
│  🌐 Public Access                                    │
│                                                      │
│  Get a public URL for your AgentStudio instance     │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Subdomain (optional)                           │ │
│  │ ┌──────────────────────────────────────────┐   │ │
│  │ │ myapp                 .agentstudio.cc     │   │ │
│  │ └──────────────────────────────────────────┘   │ │
│  │ Leave blank to auto-generate                   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [ 🚀 One-Click Enable Public Access ]              │
│                                                      │
└─────────────────────────────────────────────────────┘

After clicking:

┌─────────────────────────────────────────────────────┐
│  ✅ Public Access Enabled!                          │
│                                                      │
│  Your public URL:                                   │
│  ┌────────────────────────────────────────────────┐ │
│  │ https://myapp.agentstudio.cc         [Copy]    │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Run this command to start the tunnel:             │
│  ┌────────────────────────────────────────────────┐ │
│  │ docker run -d cloudflare/cloudflared:latest \  │ │
│  │   tunnel run --token eyJhIjoi...       [Copy]  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [ 🗑️ Delete Public Access ]                        │
└─────────────────────────────────────────────────────┘
```

## Testing Integration

### 1. Test Proxy Service

```bash
# Check proxy service is running
curl https://cf-proxy.yourdomain.com/health

# Test API key
curl -H "X-API-Key: your_key" \
  https://cf-proxy.yourdomain.com/api/subdomain/check/test
```

### 2. Test AgentStudio API

```bash
# Check subdomain
curl http://localhost:4936/api/public-access/check/myapp

# Create subdomain
curl -X POST http://localhost:4936/api/public-access/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"subdomain": "myapp"}'
```

### 3. Test End-to-End

1. Open AgentStudio settings
2. Click "Enable Public Access"
3. Copy cloudflared command
4. Run command in terminal
5. Visit public URL
6. Should see AgentStudio interface!

## Security Considerations

### Proxy Service

- **API Keys**: Store in environment variables, never commit to git
- **HTTPS Only**: Always use reverse proxy with SSL
- **Rate Limiting**: Implement in nginx to prevent abuse
- **IP Whitelist**: Consider restricting API access to known IPs

### AgentStudio

- **API Key Storage**: Store proxy API key in backend .env only
- **User Isolation**: Each user should get unique subdomain
- **Cleanup**: Implement automatic deletion of unused subdomains
- **Audit Log**: Track subdomain creation/deletion

## Troubleshooting

### "Failed to create subdomain"

**Cause**: Proxy service unreachable or API key invalid

**Solution**:
```bash
# Verify proxy service
curl https://cf-proxy.yourdomain.com/health

# Test API key
curl -H "X-API-Key: your_key" \
  https://cf-proxy.yourdomain.com/api/subdomain/check/test
```

### "Subdomain already taken"

**Cause**: Subdomain exists in database or DNS

**Solution**:
```bash
# Check subdomain status
curl -H "X-API-Key: your_key" \
  https://cf-proxy.yourdomain.com/api/subdomain/check/your_subdomain

# If orphaned, manually delete DNS record in Cloudflare dashboard
```

### Public URL not accessible

**Cause**: cloudflared client not running or wrong token

**Solution**:
1. Verify local service is running on port 4936
2. Check cloudflared logs: `docker logs <container_id>`
3. Verify tunnel status in Cloudflare dashboard

## Migration from Old System

If you have existing Cloudflare Tunnel implementation:

1. Deploy new proxy service
2. Keep old routes functional
3. Add new simplified routes
4. Update frontend to use new routes
5. Gradually migrate users
6. Deprecate old routes after migration

## Maintenance

### Database Cleanup

Run monthly to clean up deleted tunnels:

```bash
# SSH into proxy service server
cd cloudflare-proxy

# Clean up old deleted records
python3 -c "
from app.database import SessionLocal
from app.models import Tunnel
from datetime import datetime, timedelta

db = SessionLocal()
cutoff = datetime.now() - timedelta(days=30)
deleted = db.query(Tunnel).filter(
    Tunnel.status == 'deleted',
    Tunnel.updated_at < cutoff
).delete()
db.commit()
print(f'Cleaned up {deleted} old records')
"
```

### Monitor Usage

```bash
# Check active tunnels
curl -H "X-API-Key: your_key" \
  https://cf-proxy.yourdomain.com/api/subdomain/list | jq .

# Check database size
du -sh /path/to/proxy.db
```

## Next Steps

1. ✅ Deploy proxy service
2. ✅ Test API endpoints
3. 📝 Update AgentStudio backend routes
4. 🎨 Simplify frontend UI
5. 🧪 Test end-to-end flow
6. 📚 Update user documentation
7. 🚀 Deploy to production

## Support

For proxy service issues:
- Check logs: `docker-compose logs -f`
- Review [DEPLOYMENT.md](DEPLOYMENT.md)
- Cloudflare docs: https://developers.cloudflare.com/

For integration issues:
- Check AgentStudio backend logs
- Verify environment variables
- Test API endpoints manually
