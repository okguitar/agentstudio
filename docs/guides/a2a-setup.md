# A2A Protocol Setup Guide

## Overview

This guide walks you through setting up and configuring A2A (Agent-to-Agent) Protocol support in AgentStudio. By the end of this guide, you'll be able to:

- Generate API keys for your agents
- Configure allowed external agents
- Call external agents from your agents
- Monitor and manage agent tasks
- Troubleshoot common issues

**Time to Complete**: 15-20 minutes

**Prerequisites**:
- AgentStudio installed and running
- At least one project created
- Admin access to your project

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Configuration Guide](#configuration-guide)
4. [Using A2A in Your Agents](#using-a2a-in-your-agents)
5. [Testing Your Setup](#testing-your-setup)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Topics](#advanced-topics)

---

## Quick Start

For those who want to get started immediately:

**1. Generate an API Key**
```bash
# Via curl (replace {project_admin_token} with your admin token)
curl -X POST \
  "http://localhost:4936/api/projects/YOUR_PROJECT_ID/api-keys" \
  -H "Authorization: Bearer {project_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"description": "My first A2A key"}'
```

**2. Get Your Agent ID**
```bash
# Check the backend data directory
cat backend/data/a2a-agent-mappings.json
```

**3. Test Agent Card Retrieval**
```bash
curl -X GET \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**4. Send a Message**
```bash
curl -X POST \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/messages" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, agent!"}'
```

Done! Your agent is now A2A-enabled.

---

## Step-by-Step Setup

### Step 1: Access Project Settings

1. Open AgentStudio in your browser
2. Navigate to your project
3. Click on **Settings** > **A2A Configuration** (coming in frontend UI)

*Note: For now, configuration is done via API endpoints. UI is coming soon.*

### Step 2: Generate API Key

API keys authenticate external callers to your agents.

**Option A: Via Curl**

```bash
curl -X POST \
  "http://localhost:4936/api/projects/YOUR_PROJECT_ID/api-keys" \
  -H "Authorization: Bearer {your_project_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Production key for external integration"
  }'
```

**Response**:
```json
{
  "id": "key-abc-123",
  "key": "agt_proj_myproject_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c",
  "projectId": "myproject",
  "description": "Production key for external integration",
  "createdAt": "2025-11-21T10:00:00.000Z"
}
```

**IMPORTANT**:
- Save the `key` value immediately - it's only shown once!
- Store it in a secure location (password manager, secrets vault)
- Never commit it to version control

**Option B: Via Backend Direct Call (Development)**

```typescript
// In backend code or REPL
import { apiKeyService } from './services/a2a/apiKeyService.js';

const result = await apiKeyService.generateApiKey(
  'your-project-id',
  'Development key'
);

console.log('API Key:', result.key);
console.log('Key ID:', result.id);
```

### Step 3: Find Your Agent's A2A ID

Each agent gets a unique UUID for A2A communication.

**Method 1: Check Mapping File**

```bash
# From project root
cat backend/data/a2a-agent-mappings.json
```

Example output:
```json
{
  "7c9e6679-7425-40de-944b-e07fc1f90ae7": {
    "a2aAgentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "projectId": "myproject",
    "agentType": "ppt-editor",
    "workingDirectory": "/Users/user/projects/myproject",
    "createdAt": "2025-11-21T10:00:00.000Z"
  }
}
```

**Method 2: Generate on First Call**

Agent IDs are created automatically when first accessed. Try retrieving the Agent Card:

```bash
# This will create the mapping if it doesn't exist
curl -X GET \
  "http://localhost:4936/a2a/NEW_UUID/.well-known/agent-card.json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Step 4: Verify Agent Card

Test that your agent is discoverable:

```bash
curl -X GET \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Expected Response**:
```json
{
  "name": "PPT Editor Agent",
  "description": "Creates and edits presentation slides",
  "version": "1.0.0",
  "url": "http://localhost:4936/a2a/YOUR_AGENT_ID",
  "skills": [...],
  "context": {
    "projectId": "myproject",
    "agentType": "ppt-editor"
  }
}
```

If you see this, your agent is successfully A2A-enabled!

---

## Configuration Guide

### Configure Allowed External Agents

To call external agents, add them to your project's allowlist.

**Step 1: Create Configuration File** (or use API)

Create or update: `projects/YOUR_PROJECT_ID/.a2a/config.json`

```json
{
  "allowedAgents": [
    {
      "name": "Analytics Agent",
      "url": "https://analytics.example.com/a2a/uuid-123",
      "apiKey": "agt_ext_their_key_here",
      "description": "External data analytics agent",
      "enabled": true
    }
  ],
  "taskTimeout": 300000,
  "maxConcurrentTasks": 5
}
```

**Step 2: Validate Configuration**

```bash
curl -X PUT \
  "http://localhost:4936/api/projects/YOUR_PROJECT_ID/a2a-config" \
  -H "Authorization: Bearer {your_admin_token}" \
  -H "Content-Type: application/json" \
  -d @projects/YOUR_PROJECT_ID/.a2a/config.json
```

**Configuration Fields Explained**:

- **allowedAgents**: Array of external agents your project can call
  - `name`: Human-readable name for the agent
  - `url`: Full A2A endpoint URL (must be HTTPS in production)
  - `apiKey`: API key provided by the external agent owner
  - `description`: Optional description
  - `enabled`: Set to `false` to temporarily disable without removing

- **taskTimeout**: Maximum task duration in milliseconds (default: 300000 = 5 minutes)
  - Min: 1000 (1 second)
  - Max: 1800000 (30 minutes)

- **maxConcurrentTasks**: Maximum number of tasks running simultaneously (default: 5)
  - Min: 1
  - Max: 50

### Security Best Practices

1. **Use HTTPS in Production**: Always use HTTPS URLs for external agents in production
2. **Rotate API Keys**: Regularly rotate your API keys (recommended: every 90 days)
3. **Minimum Permissions**: Only add external agents you trust
4. **Monitor Usage**: Check rate limiting and usage patterns regularly
5. **Revoke Unused Keys**: Delete API keys that are no longer needed

---

## Using A2A in Your Agents

### Calling External Agents from Your Agent

Your agents can call external agents using the `call_external_agent` MCP tool.

**Example: Agent Prompt**

```
Please analyze this data using the Analytics Agent at https://analytics.example.com
```

The agent will automatically:
1. Check if the URL is in the allowlist
2. Use the configured API key
3. Call the external agent
4. Return the response

**Behind the Scenes** (MCP Tool Call):

```typescript
{
  "name": "call_external_agent",
  "input": {
    "agentUrl": "https://analytics.example.com/a2a/uuid-123",
    "message": "Analyze the following data: [data here]",
    "useTask": false,  // true for long-running operations
    "timeout": 30000   // 30 seconds
  }
}
```

**Synchronous vs Asynchronous Calls**:

- **Synchronous** (`useTask: false`): For quick operations (<30 seconds)
  - Blocks until response received
  - Simpler to use
  - Good for: queries, simple analysis, data retrieval

- **Asynchronous** (`useTask: true`): For long operations (>30 seconds)
  - Returns task ID immediately
  - Poll for status
  - Good for: report generation, complex processing, multi-step workflows

### Example Workflow

**1. Quick Query (Synchronous)**

Agent code automatically calls:
```json
{
  "name": "call_external_agent",
  "input": {
    "agentUrl": "https://analytics.example.com/a2a/uuid-123",
    "message": "What is the average revenue for Q4?",
    "useTask": false
  }
}
```

Response arrives within seconds.

**2. Long Task (Asynchronous)**

```json
{
  "name": "call_external_agent",
  "input": {
    "agentUrl": "https://analytics.example.com/a2a/uuid-123",
    "message": "Generate comprehensive annual report with charts",
    "useTask": true,
    "timeout": 600000
  }
}
```

Returns task ID. Agent polls until completion.

---

## Testing Your Setup

### Test 1: Agent Discovery

```bash
# Get Agent Card
curl -X GET \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Expected: 200 OK with Agent Card JSON
```

### Test 2: Send Message

```bash
# Send test message
curl -X POST \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/messages" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, this is a test message"}'

# Expected: 200 OK with response
```

### Test 3: Create Task

```bash
# Create task
RESPONSE=$(curl -X POST \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a test slide"}')

# Extract task ID
TASK_ID=$(echo $RESPONSE | jq -r '.taskId')

# Check task status
curl -X GET \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/tasks/$TASK_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Expected: Task status (pending/running/completed)
```

### Test 4: Rate Limiting

```bash
# Make 101 requests quickly (should be rate-limited)
for i in {1..101}; do
  curl -X GET \
    "http://localhost:4936/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
    -H "Authorization: Bearer YOUR_API_KEY"
done

# Expected: Request 101 returns 429 Too Many Requests
```

### Test 5: Invalid API Key

```bash
# Try with invalid key
curl -X GET \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/.well-known/agent-card.json" \
  -H "Authorization: Bearer invalid_key_here"

# Expected: 401 Unauthorized
```

---

## Troubleshooting

### Issue: "Invalid or missing API key"

**Symptoms**: 401 Unauthorized error

**Causes**:
1. API key not in Authorization header
2. Incorrect key format
3. Key has been revoked
4. Key doesn't belong to this project

**Solutions**:
```bash
# Check key format (should start with "agt_proj_")
echo $YOUR_API_KEY

# Verify key hasn't been revoked
cat projects/YOUR_PROJECT_ID/.a2a/api-keys.json

# Regenerate if needed
curl -X POST \
  "http://localhost:4936/api/projects/YOUR_PROJECT_ID/api-keys" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"description": "New key"}'
```

### Issue: "Agent not found"

**Symptoms**: 404 Not Found error

**Causes**:
1. Invalid Agent ID
2. Agent mapping doesn't exist
3. Wrong project context

**Solutions**:
```bash
# Check agent mappings
cat backend/data/a2a-agent-mappings.json

# Verify project ID matches
echo "Project: YOUR_PROJECT_ID"
echo "Agent ID: YOUR_AGENT_ID"

# Try creating mapping manually
# Access the agent card endpoint to auto-generate
```

### Issue: "Rate limit exceeded"

**Symptoms**: 429 Too Many Requests

**Causes**:
1. More than 100 requests in 1 hour
2. Aggressive polling of task status

**Solutions**:
```bash
# Wait for rate limit to reset (check header)
curl -I http://localhost:4936/a2a/YOUR_AGENT_ID/.well-known/agent-card.json \
  -H "Authorization: Bearer YOUR_API_KEY"

# Look for:
# X-RateLimit-Reset: 1700003600

# Calculate time remaining
date -r 1700003600

# Reduce polling frequency (recommended: 5-10 seconds between polls)
```

### Issue: "External agent call failed"

**Symptoms**: Error when calling external agent via MCP tool

**Causes**:
1. Agent URL not in allowlist
2. External agent is down
3. Invalid API key for external agent
4. Network timeout

**Solutions**:
```bash
# Check allowlist
cat projects/YOUR_PROJECT_ID/.a2a/config.json

# Test external agent directly
curl -X GET \
  "https://external-agent.com/a2a/uuid/.well-known/agent-card.json" \
  -H "Authorization: Bearer THEIR_API_KEY"

# Add agent to allowlist if missing
curl -X PUT \
  "http://localhost:4936/api/projects/YOUR_PROJECT_ID/a2a-config" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedAgents": [
      {
        "name": "External Agent",
        "url": "https://external-agent.com/a2a/uuid",
        "apiKey": "THEIR_API_KEY",
        "enabled": true
      }
    ]
  }'
```

### Issue: "Task timeout"

**Symptoms**: Task fails with TIMEOUT_ERROR

**Causes**:
1. Task took longer than configured timeout
2. Agent execution hung
3. External dependency unavailable

**Solutions**:
```bash
# Increase timeout in config
cat projects/YOUR_PROJECT_ID/.a2a/config.json
# Set taskTimeout to higher value (max 1800000 = 30 min)

# Cancel stuck task
curl -X DELETE \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/tasks/TASK_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check task status to see what step failed
curl -X GET \
  "http://localhost:4936/a2a/YOUR_AGENT_ID/tasks/TASK_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: "Max concurrent tasks reached"

**Symptoms**: 429 error when creating new task

**Causes**:
1. Too many tasks running simultaneously
2. Tasks not completing
3. maxConcurrentTasks set too low

**Solutions**:
```bash
# List running tasks
ls projects/YOUR_PROJECT_ID/.a2a/tasks/

# Check task statuses
for file in projects/YOUR_PROJECT_ID/.a2a/tasks/*.json; do
  echo "Task: $file"
  cat $file | jq -r '.status'
done

# Cancel stuck tasks or increase limit
# Edit config.json and set maxConcurrentTasks higher
```

---

## Advanced Topics

### API Key Rotation

Rotate keys without downtime using grace period:

```bash
curl -X POST \
  "http://localhost:4936/api/projects/YOUR_PROJECT_ID/api-keys/OLD_KEY_ID/rotate" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"gracePeriodMinutes": 5}'
```

Response includes:
- New key (use this immediately)
- Old key revocation time (5 minutes from now)

Update your integrations within the grace period.

### Monitoring Task Execution

Poll task status with exponential backoff:

```bash
#!/bin/bash
AGENT_ID="YOUR_AGENT_ID"
TASK_ID="YOUR_TASK_ID"
API_KEY="YOUR_API_KEY"
WAIT_TIME=1

while true; do
  STATUS=$(curl -s -X GET \
    "http://localhost:4936/a2a/$AGENT_ID/tasks/$TASK_ID" \
    -H "Authorization: Bearer $API_KEY" | jq -r '.status')

  echo "Task status: $STATUS (waited ${WAIT_TIME}s)"

  if [[ "$STATUS" == "completed" ]] || [[ "$STATUS" == "failed" ]]; then
    break
  fi

  sleep $WAIT_TIME
  WAIT_TIME=$((WAIT_TIME * 2))  # Exponential backoff
  if [ $WAIT_TIME -gt 30 ]; then
    WAIT_TIME=30  # Cap at 30 seconds
  fi
done
```

### Debugging Agent Calls

Enable verbose logging for A2A calls:

```bash
# Backend logs (check server output)
tail -f backend/logs/a2a.log

# Enable debug mode in config
export DEBUG=a2a:*
npm run dev:backend
```

### HTTPS Configuration (Production)

For production deployment, always use HTTPS:

```bash
# Update allowed agent URLs to HTTPS
# Edit config.json
{
  "allowedAgents": [
    {
      "url": "https://agent.example.com/a2a/uuid",  // HTTPS required
      ...
    }
  ]
}

# Backend enforces HTTPS in production
# Set NODE_ENV=production
export NODE_ENV=production

# Non-HTTPS URLs will be rejected with 400 error
```

### Performance Optimization

**Caching Agent Cards**:

Agent Cards are auto-generated but can be cached. Check cache configuration:

```typescript
// backend/src/utils/agentCardCache.ts
// LRU cache with 100 entry limit
// Invalidates on config changes
```

**Rate Limit Tuning**:

Adjust rate limits in production:

```typescript
// backend/src/middleware/rateLimiting.ts
// Current: 100 requests/hour
// Modify for your needs
```

---

## Next Steps

Now that you have A2A configured:

1. **Read API Documentation**: See [A2A API Endpoints](../api/a2a-endpoints.md) for detailed API reference
2. **Deploy to Production**: Follow [Deployment Checklist](../deployment/a2a-deployment.md)
3. **Integrate External Agents**: Add trusted external agents to your allowlist
4. **Monitor Usage**: Set up monitoring for API key usage and task execution
5. **Automate Workflows**: Use A2A to build multi-agent workflows

---

## Getting Help

**Documentation**:
- API Reference: `/docs/api/a2a-endpoints.md`
- Deployment Guide: `/docs/deployment/a2a-deployment.md`

**Support Channels**:
- GitHub Issues: https://github.com/jeffkit/ai-editor-a2a/issues
- Email: bbmyth@gmail.com

**Common Resources**:
- A2A Protocol Specification: https://github.com/a2a-protocol/spec
- AgentStudio Documentation: https://docs.agentstudio.cc

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-21
**Maintained By**: AgentStudio Team
