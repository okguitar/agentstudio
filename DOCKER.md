# Docker Deployment Guide

AgentStudio can be deployed as a single Docker container that includes both the frontend and backend.

## Building the Docker Image

```bash
docker build -t agentstudio:latest .
```

This will build a complete image containing:
- Frontend (React + Vite)
- Backend (Node.js + Express)
- All dependencies and configurations

## Running with Docker Compose (Recommended)

1. **Create environment file** (optional):
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env and add your API keys
   ```

2. **Start the service**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Open browser: http://localhost:4936
   - The frontend and API are both served from the same port

4. **Check logs**:
   ```bash
   docker-compose logs -f agentstudio
   ```

5. **Stop the service**:
   ```bash
   docker-compose down
   ```

## Running with Docker directly

```bash
docker run -d \
  --name agentstudio \
  -p 4936:4936 \
  -e ANTHROPIC_API_KEY=your_key_here \
  -v agentstudio_data:/app/data \
  agentstudio:latest
```

Then open http://localhost:4936 in your browser.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models | Optional* |
| `OPENAI_API_KEY` | OpenAI API key | Optional* |
| `PORT` | Backend port (default: 4936) | No |
| `NODE_ENV` | Environment mode | No |

*At least one AI provider API key is required.

## Volume Mounts

- `/app/data`: Directory for agent configurations, session data, and other persistent files

**Important**: The `/app/data` volume ensures your data persists across container restarts and updates.

## Health Check

The container includes a health check endpoint at `/api/health` that runs every 30 seconds.

Check container health:
```bash
docker ps
# Look for "healthy" status
```

## Accessing the Application

Once running, AgentStudio will be available at:
- **Frontend**: http://localhost (port 80)
- **API**: http://localhost/api (proxied by nginx) or http://localhost:4936/api (direct)
- **Health check**: http://localhost:4936/api/health

The frontend is served by nginx on port 80, and the backend API runs on port 4936. Nginx proxies `/api/*` requests to the backend automatically.

## Troubleshooting

### Build fails with TypeScript errors

Clean the project and rebuild:
```bash
# Clean build artifacts
find . -name "*.tsbuildinfo" -delete
rm -rf shared/dist backend/dist

# Rebuild
docker build -t agentstudio-backend:latest .
```

### Container exits immediately

Check logs for errors:
```bash
docker logs agentstudio-backend
```

Common issues:
- Missing API keys
- Port 4936 already in use
- Invalid .env file

### Port already in use

Change the port mapping in docker-compose.yml:
```yaml
ports:
  - "5000:4936"  # Use port 5000 instead
```

## Data Persistence

### How Docker Container Data Works

**Container Stop/Start** (data is preserved):
```bash
docker stop agentstudio   # Stop the container
docker start agentstudio  # Start it again - all data is still there
```

**Container Removal** (data is lost without volumes):
```bash
docker rm agentstudio  # ⚠️ This deletes the container and its data
```

**Using Volumes** (recommended - data persists):
- The docker-compose.yml file already configures a volume at `/app/data`
- Data is stored on the host machine
- Survives container removal and updates
- Can be backed up separately

### Backing Up Data

```bash
# Backup volume data
docker run --rm -v agentstudio_data:/data -v $(pwd):/backup ubuntu tar czf /backup/agentstudio-backup.tar.gz -C /data .

# Restore volume data
docker run --rm -v agentstudio_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/agentstudio-backup.tar.gz -C /data
```

## Production Deployment

For production deployments:

1. **Use specific image tags**:
   ```bash
   docker build -t agentstudio:v1.0.0 .
   ```

2. **Set resource limits** in docker-compose.yml:
   ```yaml
   services:
     agentstudio:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

3. **Use secrets for API keys**:
   ```yaml
   services:
     agentstudio:
       secrets:
         - anthropic_api_key

   secrets:
     anthropic_api_key:
       external: true
   ```

4. **Enable logging**:
   ```yaml
   services:
     agentstudio:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

## Updating the Application

1. Pull latest changes from git
2. Rebuild the image:
   ```bash
   docker build -t agentstudio:latest .
   ```
3. Restart the service (data will be preserved):
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Cleaning Up

Remove containers, images, and volumes:
```bash
# Stop and remove containers (data in volumes is preserved)
docker-compose down

# Remove the image
docker rmi agentstudio:latest

# Remove volumes (⚠️ This deletes all data permanently!)
docker volume rm agentstudio_data

# Complete cleanup (everything)
docker-compose down -v
docker rmi agentstudio:latest
```

## Architecture

The Docker container runs two services:
- **Nginx**: Serves the React frontend and proxies API requests
- **Node.js Backend**: Handles API requests and manages data

```
┌─────────────────────────────────────────────┐
│         Docker Container                     │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │  Nginx (port 80)                       │ │
│  │  - Serves frontend static files        │ │
│  │  - Proxies /api/* to backend           │ │
│  └────────────────────────────────────────┘ │
│                  │                           │
│                  │ proxy /api/*              │
│                  ↓                           │
│  ┌────────────────────────────────────────┐ │
│  │  Backend (port 4936)                   │ │
│  │  - Express API server                  │ │
│  │  - Manages authentication & sessions   │ │
│  └────────────────────────────────────────┘ │
│                  │                           │
│                  ↓                           │
│  ┌────────────────────────────────────────┐ │
│  │  Persistent Volume (/app/data)         │ │
│  │  - Agent configurations                │ │
│  │  - Session data                        │ │
│  │  - Application state                   │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
         ↑                    ↑
    Port 80              Port 4936
   (Frontend)          (API - optional)
```

**Access Points:**
- Port 80: Frontend UI (recommended for users)
- Port 4936: Backend API (optional, for direct API access)
