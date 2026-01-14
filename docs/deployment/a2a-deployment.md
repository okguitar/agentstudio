# A2A Protocol Deployment Checklist

## Overview

This document provides a comprehensive checklist for deploying AgentStudio with A2A Protocol support to production environments. Follow this checklist to ensure a secure, reliable, and performant deployment.

**Deployment Type**: Production with A2A Protocol Enabled

**Estimated Time**: 1-2 hours (depending on infrastructure)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Security Configuration](#security-configuration)
4. [Infrastructure Setup](#infrastructure-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Validation](#post-deployment-validation)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Rollback Procedure](#rollback-procedure)
9. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All A2A-related tests passing (`npm test`)
- [ ] Test coverage meets 80% threshold for A2A services
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] ESLint checks passing (`npm run lint`)
- [ ] No known security vulnerabilities (`npm audit`)
- [ ] All dependencies up to date
- [ ] Git repository tagged with release version

### Documentation

- [ ] API documentation reviewed and accurate
- [ ] User guide tested with real scenarios
- [ ] Deployment guide (this document) reviewed
- [ ] Change log updated with A2A features
- [ ] Migration guide prepared (if applicable)

### Infrastructure

- [ ] Production server provisioned (CPU: 2+ cores, RAM: 4GB+)
- [ ] Domain name configured (e.g., `api.agentstudio.cc`)
- [ ] SSL/TLS certificate obtained (Let's Encrypt, DigiCert, etc.)
- [ ] Firewall rules configured (allow ports 443, 80 for redirect)
- [ ] Load balancer configured (if using multiple instances)
- [ ] CDN configured (optional, for static assets)

### Database and Storage

- [ ] File system storage provisioned (min 10GB for tasks, logs, API keys)
- [ ] Backup solution configured (daily backups recommended)
- [ ] File permissions verified (backend process has read/write access)
- [ ] Directory structure created (`backend/data/`, `projects/`, etc.)

### Access and Permissions

- [ ] Production server SSH access configured
- [ ] Non-root user created for running services
- [ ] Sudo/admin access for deployment user configured
- [ ] API keys for external services ready (Claude, OpenAI, etc.)

---

## Environment Configuration

### Required Environment Variables

Create or update `/backend/.env` with the following:

```bash
# ====================================
# Server Configuration
# ====================================
NODE_ENV=production
PORT=4936
HOST=0.0.0.0

# ====================================
# AI Provider (choose one or both)
# ====================================
ANTHROPIC_API_KEY=sk-ant-xxx...
OPENAI_API_KEY=sk-xxx...

# ====================================
# File System
# ====================================
SLIDES_DIR=../slides
PROJECTS_DIR=../projects
DATA_DIR=./data

# ====================================
# CORS Configuration
# ====================================
CORS_ORIGINS=https://agentstudio.cc,https://www.agentstudio.cc,https://app.agentstudio.cc

# ====================================
# A2A Protocol Configuration
# ====================================
# Enforce HTTPS for A2A endpoints
A2A_REQUIRE_HTTPS=true

# Rate limiting (requests per hour per API key)
A2A_RATE_LIMIT=100

# Task timeout default (milliseconds, max 30 minutes)
A2A_TASK_TIMEOUT_DEFAULT=300000

# Max concurrent tasks per project
A2A_MAX_CONCURRENT_TASKS=5

# ====================================
# Security
# ====================================
# bcrypt salt rounds for API key hashing
BCRYPT_SALT_ROUNDS=10

# Session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-secret-here

# ====================================
# Logging
# ====================================
LOG_LEVEL=info
LOG_FILE=./logs/a2a.log

# ====================================
# Optional: External Services
# ====================================
# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Analytics
ANALYTICS_ENABLED=true
```

### Environment Variable Validation

**Check all required variables are set**:

```bash
#!/bin/bash
# validate-env.sh

REQUIRED_VARS=(
  "NODE_ENV"
  "PORT"
  "ANTHROPIC_API_KEY"
  "CORS_ORIGINS"
  "A2A_REQUIRE_HTTPS"
  "SESSION_SECRET"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "ERROR: Missing required environment variables:"
  printf '  - %s\n' "${MISSING_VARS[@]}"
  exit 1
else
  echo "✓ All required environment variables are set"
fi
```

Run validation:
```bash
source /backend/.env
./validate-env.sh
```

---

## Security Configuration

### 1. HTTPS Enforcement

**Requirement**: All A2A endpoints MUST use HTTPS in production.

**Nginx Configuration** (recommended):

```nginx
# /etc/nginx/sites-available/agentstudio

server {
    listen 80;
    server_name api.agentstudio.cc;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.agentstudio.cc;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/api.agentstudio.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.agentstudio.cc/privkey.pem;

    # SSL Configuration (Mozilla Intermediate)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js backend
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
    }

    # A2A endpoints with stricter rate limiting
    location /a2a/ {
        limit_req zone=a2a_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:4936;
        # ... same proxy settings as above
    }
}

# Rate limiting zone
limit_req_zone $http_authorization zone=a2a_limit:10m rate=100r/h;
```

**Enable Nginx Configuration**:
```bash
sudo ln -s /etc/nginx/sites-available/agentstudio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Checklist**:
- [ ] SSL certificate installed and valid
- [ ] HTTP redirects to HTTPS
- [ ] HTTPS enforced in backend (`A2A_REQUIRE_HTTPS=true`)
- [ ] Security headers configured
- [ ] Rate limiting configured at proxy level

### 2. API Key Security

**Checklist**:
- [ ] bcrypt salt rounds set to 10 (`BCRYPT_SALT_ROUNDS=10`)
- [ ] API keys stored hashed, never in plaintext
- [ ] API key file permissions: `chmod 600 projects/*/. a2a/api-keys.json`
- [ ] API keys never logged or exposed in error messages
- [ ] Key rotation procedure documented and tested

**Verify API Key Storage**:
```bash
# API keys should be hashed (bcrypt format: $2b$10$...)
cat projects/*/. a2a/api-keys.json | jq -r '.[].hashedKey'
# Should output: $2b$10$... (never plaintext keys)
```

### 3. CORS Configuration

**Checklist**:
- [ ] CORS origins explicitly listed (no `*` wildcard)
- [ ] Only trusted domains allowed
- [ ] Preflight requests handled correctly
- [ ] Credentials included for authenticated requests

**Test CORS**:
```bash
curl -H "Origin: https://agentstudio.cc" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.agentstudio.cc/a2a/test/messages

# Expected header:
# Access-Control-Allow-Origin: https://agentstudio.cc
```

### 4. File System Permissions

**Checklist**:
- [ ] Backend runs as non-root user
- [ ] Data directory owned by backend user: `chown -R backend-user:backend-user backend/data`
- [ ] Project directories have correct permissions: `chmod 755 projects/`
- [ ] Task files readable/writable by backend: `chmod 644 projects/*/.a2a/tasks/*.json`
- [ ] API key files restricted: `chmod 600 projects/*/.a2a/api-keys.json`

**Set Permissions**:
```bash
sudo chown -R backend-user:backend-user backend/data projects/
find backend/data projects/ -type d -exec chmod 755 {} \;
find backend/data projects/ -type f -exec chmod 644 {} \;
find projects/ -name "api-keys.json" -exec chmod 600 {} \;
```

---

## Infrastructure Setup

### 1. System Dependencies

**Install Node.js (LTS)**:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should be v20.x or later
```

**Install pnpm**:
```bash
npm install -g pnpm
pnpm --version
```

**Install PM2 (Process Manager)**:
```bash
npm install -g pm2
pm2 --version
```

**Checklist**:
- [ ] Node.js v20+ installed
- [ ] pnpm installed globally
- [ ] PM2 installed globally
- [ ] Git installed

### 2. Firewall Configuration

**Allow HTTPS and HTTP**:
```bash
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw enable
sudo ufw status
```

**Checklist**:
- [ ] Port 443 (HTTPS) open
- [ ] Port 80 (HTTP) open (for redirect)
- [ ] Backend port 4936 NOT exposed externally (proxied through Nginx)
- [ ] SSH port 22 open (for deployment access)

### 3. Log Rotation

**Create Log Rotation Config** (`/etc/logrotate.d/agentstudio`):
```
/var/log/agentstudio/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 backend-user backend-user
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

**Test**:
```bash
sudo logrotate -d /etc/logrotate.d/agentstudio
```

**Checklist**:
- [ ] Log rotation configured
- [ ] Logs kept for 14 days
- [ ] PM2 logs rotated
- [ ] Disk space monitored

---

## Deployment Steps

### Step 1: Clone Repository

```bash
cd /var/www
sudo git clone https://github.com/jeffkit/ai-editor-a2a.git agentstudio
sudo chown -R backend-user:backend-user agentstudio
cd agentstudio
git checkout tags/v0.2.0  # Replace with your release tag
```

**Checklist**:
- [ ] Repository cloned to deployment directory
- [ ] Correct release tag checked out
- [ ] Ownership set to backend user

### Step 2: Install Dependencies

```bash
cd /var/www/agentstudio
pnpm install --frozen-lockfile
```

**Checklist**:
- [ ] All dependencies installed
- [ ] No security vulnerabilities (`pnpm audit`)
- [ ] Lockfile used (reproducible builds)

### Step 3: Build Application

```bash
# Build backend
cd backend
pnpm run build

# Build frontend
cd ../frontend
pnpm run build
```

**Checklist**:
- [ ] Backend TypeScript compiled successfully
- [ ] Frontend built successfully
- [ ] No build errors or warnings

### Step 4: Configure Environment

```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit with production values
nano backend/.env
```

**Use the environment configuration from earlier section.**

**Checklist**:
- [ ] `.env` file created with production values
- [ ] All required variables set
- [ ] API keys configured
- [ ] File permissions: `chmod 600 backend/.env`

### Step 5: Initialize Data Directories

```bash
mkdir -p backend/data
mkdir -p backend/logs
mkdir -p projects
mkdir -p slides

# Initialize agent mappings
echo '{}' > backend/data/a2a-agent-mappings.json

# Set permissions
chmod 755 backend/data backend/logs projects slides
chmod 644 backend/data/a2a-agent-mappings.json
```

**Checklist**:
- [ ] Data directories created
- [ ] Agent mappings file initialized
- [ ] Permissions set correctly

### Step 6: Start Application with PM2

**Create PM2 Ecosystem File** (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [
    {
      name: 'agentstudio-backend',
      script: './backend/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4936
      },
      error_file: './backend/logs/error.log',
      out_file: './backend/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G'
    }
  ]
};
```

**Start with PM2**:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable startup script
```

**Checklist**:
- [ ] PM2 ecosystem file created
- [ ] Backend started with PM2
- [ ] Cluster mode enabled (2+ instances)
- [ ] Auto-restart configured
- [ ] Startup script enabled (survives reboots)

---

## Post-Deployment Validation

### 1. Health Check

```bash
# Check A2A health endpoint
curl https://api.agentstudio.cc/api/a2a/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "timestamp": "2025-11-21T10:00:00.000Z"
# }
```

**Checklist**:
- [ ] Health endpoint returns 200 OK
- [ ] HTTPS connection successful
- [ ] SSL certificate valid

### 2. API Key Generation Test

```bash
# Generate test API key
curl -X POST \
  "https://api.agentstudio.cc/api/projects/test-project/api-keys" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"description": "Deployment validation key"}'

# Save the returned key for next tests
```

**Checklist**:
- [ ] API key generated successfully
- [ ] Key format correct (`agt_proj_...`)
- [ ] Key stored hashed in filesystem

### 3. Agent Card Retrieval Test

```bash
# Get agent card
curl -X GET \
  "https://api.agentstudio.cc/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Checklist**:
- [ ] Agent card retrieved successfully
- [ ] HTTPS enforced (HTTP request rejected)
- [ ] JSON response valid

### 4. Message Sending Test

```bash
# Send test message
curl -X POST \
  "https://api.agentstudio.cc/a2a/YOUR_AGENT_ID/messages" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Deployment validation test"}'
```

**Checklist**:
- [ ] Message sent successfully
- [ ] Response received
- [ ] No errors in backend logs

### 5. Task Creation Test

```bash
# Create task
curl -X POST \
  "https://api.agentstudio.cc/a2a/YOUR_AGENT_ID/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test task creation"}'
```

**Checklist**:
- [ ] Task created successfully
- [ ] Task ID returned
- [ ] Task file created in filesystem

### 6. Rate Limiting Test

```bash
# Make 101 requests (should trigger rate limit)
for i in {1..101}; do
  curl -X GET \
    "https://api.agentstudio.cc/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
    -H "Authorization: Bearer YOUR_API_KEY"
done
```

**Checklist**:
- [ ] Request 101 returns 429
- [ ] Rate limit headers present
- [ ] Retry-After header included

### 7. Log Verification

```bash
# Check logs for errors
pm2 logs agentstudio-backend --lines 100
tail -f backend/logs/a2a.log
```

**Checklist**:
- [ ] No errors in logs
- [ ] Request logging working
- [ ] Log rotation configured

---

## Monitoring and Alerting

### 1. PM2 Monitoring

```bash
# View PM2 dashboard
pm2 monit

# Check process status
pm2 status

# View metrics
pm2 describe agentstudio-backend
```

**Set up alerts**:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

**Checklist**:
- [ ] PM2 monitoring active
- [ ] CPU/memory usage normal (<70%)
- [ ] No restarts due to crashes
- [ ] Log rotation working

### 2. Application Metrics

**Monitor**:
- Request rate (requests/minute)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx errors)
- Task completion rate
- API key usage

**Tools** (optional):
- Prometheus + Grafana
- New Relic
- Datadog
- Sentry (for error tracking)

**Checklist**:
- [ ] Metrics collection configured
- [ ] Dashboards created
- [ ] Alerts configured for:
  - [ ] High error rate (>5%)
  - [ ] High response time (>2s)
  - [ ] Memory usage (>80%)
  - [ ] Disk usage (>80%)

### 3. Disk Space Monitoring

```bash
# Monitor disk usage
df -h

# Monitor task file growth
du -sh projects/*/. a2a/tasks/

# Set up alert for disk usage >80%
```

**Checklist**:
- [ ] Disk space monitoring enabled
- [ ] Alerts configured for low disk space
- [ ] Cleanup policy for old tasks defined

---

## Rollback Procedure

If deployment fails or critical issues arise:

### Quick Rollback Steps

1. **Stop current deployment**:
```bash
pm2 stop agentstudio-backend
```

2. **Checkout previous version**:
```bash
cd /var/www/agentstudio
git checkout tags/v0.1.19  # Previous stable version
```

3. **Restore dependencies**:
```bash
pnpm install --frozen-lockfile
```

4. **Rebuild**:
```bash
cd backend && pnpm run build
cd ../frontend && pnpm run build
```

5. **Restart**:
```bash
pm2 restart agentstudio-backend
```

6. **Verify**:
```bash
curl https://api.agentstudio.cc/api/a2a/health
```

**Checklist**:
- [ ] Previous version tagged in git
- [ ] Database/file backups recent
- [ ] Rollback tested in staging
- [ ] Rollback time <10 minutes

---

## Troubleshooting

### Issue: "HTTPS Required" errors

**Solution**:
```bash
# Verify HTTPS enforcement
grep A2A_REQUIRE_HTTPS backend/.env

# Check Nginx HTTPS config
sudo nginx -t
sudo systemctl status nginx

# Verify SSL certificate
openssl s_client -connect api.agentstudio.cc:443 -servername api.agentstudio.cc
```

### Issue: Backend not starting

**Solution**:
```bash
# Check PM2 logs
pm2 logs agentstudio-backend --err

# Check environment variables
pm2 env agentstudio-backend

# Restart with logs
pm2 restart agentstudio-backend --update-env
pm2 logs agentstudio-backend --lines 100
```

### Issue: File permission errors

**Solution**:
```bash
# Fix ownership
sudo chown -R backend-user:backend-user /var/www/agentstudio

# Fix permissions
find backend/data projects/ -type d -exec chmod 755 {} \;
find backend/data projects/ -type f -exec chmod 644 {} \;
find projects/ -name "api-keys.json" -exec chmod 600 {} \;

# Restart
pm2 restart agentstudio-backend
```

---

## Final Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Release tagged in git

### Infrastructure
- [ ] Server provisioned
- [ ] SSL certificate configured
- [ ] Firewall configured
- [ ] Nginx configured

### Application
- [ ] Dependencies installed
- [ ] Application built
- [ ] Environment configured
- [ ] PM2 configured

### Security
- [ ] HTTPS enforced
- [ ] API keys hashed
- [ ] CORS configured
- [ ] File permissions set

### Validation
- [ ] Health check passing
- [ ] API key generation working
- [ ] Agent card retrieval working
- [ ] Message sending working
- [ ] Task creation working
- [ ] Rate limiting working

### Monitoring
- [ ] PM2 monitoring active
- [ ] Application metrics configured
- [ ] Disk space monitoring enabled
- [ ] Alerts configured

### Rollback
- [ ] Rollback procedure documented
- [ ] Previous version tagged
- [ ] Backups recent
- [ ] Rollback tested

---

**Deployment Sign-off**:

- [ ] Deployed by: ________________
- [ ] Date: ________________
- [ ] Version: ________________
- [ ] Sign-off: ________________

**Document Version**: 1.0.0
**Last Updated**: 2025-11-21
**Maintained By**: AgentStudio Team
