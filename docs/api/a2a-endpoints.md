# A2A API Endpoints Documentation

## Overview

This document provides comprehensive documentation for AgentStudio's A2A (Agent-to-Agent) Protocol implementation, including all HTTP endpoints, authentication requirements, request/response formats, and practical curl examples.

**Base URL**: `https://api.agentstudio.cc` (Production) or `http://localhost:4936` (Development)

**Protocol Version**: A2A v1.0.0

**Authentication**: All A2A endpoints require Bearer token authentication

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core A2A Endpoints](#core-a2a-endpoints)
   - [GET Agent Card](#get-agent-card)
   - [POST Message (Synchronous)](#post-message-synchronous)
   - [POST Task (Asynchronous)](#post-task-asynchronous)
   - [GET Task Status](#get-task-status)
   - [DELETE Task (Cancel)](#delete-task-cancel)
3. [Configuration Endpoints](#configuration-endpoints)
   - [GET A2A Config](#get-a2a-config)
   - [PUT A2A Config](#put-a2a-config)
4. [API Key Management](#api-key-management)
   - [POST Generate API Key](#post-generate-api-key)
   - [DELETE Revoke API Key](#delete-revoke-api-key)
   - [POST Rotate API Key](#post-rotate-api-key)
5. [Health Check](#health-check)
6. [Error Codes Reference](#error-codes-reference)
7. [Rate Limiting](#rate-limiting)

---

## Authentication

All A2A endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer agt_proj_{projectId}_{32-hex-chars}
```

**Example**:
```bash
curl -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c" \
  https://api.agentstudio.cc/a2a/{agentId}/.well-known/agent-card.json
```

**Error Response (401 Unauthorized)**:
```json
{
  "error": "Invalid or missing API key",
  "code": "INVALID_API_KEY"
}
```

---

## Core A2A Endpoints

### GET Agent Card

Retrieve Agent Card metadata for agent discovery (A2A standard pattern).

**Endpoint**: `GET /a2a/:a2aAgentId/.well-known/agent-card.json`

**Path Parameters**:
- `a2aAgentId` (string, required): Agent's A2A UUID

**Authentication**: Required

**Example Request**:
```bash
curl -X GET \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/.well-known/agent-card.json" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c"
```

**Success Response (200 OK)**:
```json
{
  "name": "PPT Editor Agent",
  "description": "Creates and edits presentation slides",
  "version": "1.0.0",
  "url": "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "skills": [
    {
      "name": "create-slide",
      "description": "Create a new presentation slide",
      "inputSchema": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["title", "content"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "slideIndex": { "type": "number" },
          "slideUrl": { "type": "string" }
        }
      }
    }
  ],
  "securitySchemes": [
    {
      "type": "apiKey",
      "in": "header",
      "name": "Authorization",
      "scheme": "bearer"
    }
  ],
  "context": {
    "a2aAgentId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "projectId": "proj-abc123",
    "projectName": "Q4 Presentation",
    "workingDirectory": "/Users/user/projects/q4-presentation",
    "agentType": "ppt-editor",
    "agentCategory": "builtin"
  }
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "Agent not found",
  "code": "AGENT_NOT_FOUND",
  "details": {
    "a2aAgentId": "invalid-uuid"
  }
}
```

---

### POST Message (Synchronous)

Send synchronous message to agent for short-lived, blocking operations.

**Endpoint**: `POST /a2a/:a2aAgentId/messages`

**Path Parameters**:
- `a2aAgentId` (string, required): Agent's A2A UUID

**Authentication**: Required

**Request Body**:
```typescript
{
  message: string;        // Required, max 10,000 characters
  context?: object;       // Optional, arbitrary JSON object
}
```

**Example Request**:
```bash
curl -X POST \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/messages" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze slide 3 and suggest improvements",
    "context": {
      "slideIndex": 3,
      "format": "bullet-points"
    }
  }'
```

**Success Response (200 OK)**:
```json
{
  "response": "I analyzed slide 3 titled 'Q4 Results'. Here are my suggestions:\n1. Add more visual elements\n2. Simplify the bullet points\n3. Highlight key metrics",
  "metadata": {
    "processingTimeMs": 1250,
    "tokensUsed": 450
  }
}
```

**Error Response (400 Bad Request)**:
```json
{
  "error": "Invalid request payload",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "message",
      "message": "Message is required and cannot be empty"
    }
  ]
}
```

**Error Response (429 Too Many Requests)**:
```json
{
  "error": "Too many A2A requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

---

### POST Task (Asynchronous)

Create asynchronous long-running task for operations that may take minutes to complete.

**Endpoint**: `POST /a2a/:a2aAgentId/tasks`

**Path Parameters**:
- `a2aAgentId` (string, required): Agent's A2A UUID

**Authentication**: Required

**Request Body**:
```typescript
{
  message: string;        // Required, max 10,000 characters
  timeout?: number;       // Optional, milliseconds (default 300000 = 5 min, max 1800000 = 30 min)
  context?: object;       // Optional, arbitrary JSON object
}
```

**Example Request**:
```bash
curl -X POST \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generate a complete 10-slide presentation on AI trends in 2025",
    "timeout": 600000,
    "context": {
      "projectId": "proj-abc123",
      "targetAudience": "executives"
    }
  }'
```

**Success Response (202 Accepted)**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "checkUrl": "/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks/550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400 Bad Request)**:
```json
{
  "error": "Invalid request payload",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "timeout",
      "message": "Timeout must be between 1000 and 1800000 milliseconds"
    }
  ]
}
```

**Error Response (429 Max Concurrent Tasks)**:
```json
{
  "error": "Max concurrent tasks (5) reached. Please wait for tasks to complete.",
  "code": "MAX_CONCURRENT_TASKS_REACHED",
  "currentRunningTasks": 5
}
```

---

### GET Task Status

Query task status and results. Poll this endpoint to check task progress.

**Endpoint**: `GET /a2a/:a2aAgentId/tasks/:taskId`

**Path Parameters**:
- `a2aAgentId` (string, required): Agent's A2A UUID
- `taskId` (string, required): Task UUID from POST /tasks response

**Authentication**: Required

**Example Request**:
```bash
curl -X GET \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c"
```

**Response (Pending)**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "createdAt": "2025-11-21T10:00:00Z"
}
```

**Response (Running)**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": {
    "currentStep": "Researching AI trends",
    "percentComplete": 40
  },
  "createdAt": "2025-11-21T10:00:00Z",
  "startedAt": "2025-11-21T10:00:05Z"
}
```

**Response (Completed)**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "output": {
    "result": "Presentation created with 10 slides covering: AI Ethics, Machine Learning, LLMs, Computer Vision, Robotics, Healthcare AI, Finance AI, Future Trends, Challenges, Conclusion",
    "artifacts": [
      {
        "type": "slide-deck",
        "name": "ai-trends-2025.html",
        "url": "/slides/proj-abc123/ai-trends-2025.html"
      }
    ]
  },
  "createdAt": "2025-11-21T10:00:00Z",
  "startedAt": "2025-11-21T10:00:05Z",
  "completedAt": "2025-11-21T10:08:30Z"
}
```

**Response (Failed)**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "errorDetails": {
    "message": "Task execution failed: Unable to connect to external data source",
    "code": "EXECUTION_ERROR"
  },
  "createdAt": "2025-11-21T10:00:00Z",
  "startedAt": "2025-11-21T10:00:05Z",
  "completedAt": "2025-11-21T10:01:30Z"
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "Task not found",
  "code": "TASK_NOT_FOUND",
  "details": {
    "taskId": "invalid-uuid"
  }
}
```

---

### DELETE Task (Cancel)

Cancel running or pending task. Completed or failed tasks cannot be canceled.

**Endpoint**: `DELETE /a2a/:a2aAgentId/tasks/:taskId`

**Path Parameters**:
- `a2aAgentId` (string, required): Agent's A2A UUID
- `taskId` (string, required): Task UUID

**Authentication**: Required

**Example Request**:
```bash
curl -X DELETE \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c"
```

**Success Response (200 OK)**:
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "canceled",
  "message": "Task canceled successfully"
}
```

**Error Response (400 Bad Request)**:
```json
{
  "error": "Task cannot be canceled",
  "code": "INVALID_STATE_TRANSITION",
  "details": {
    "currentStatus": "completed",
    "message": "Only pending or running tasks can be canceled"
  }
}
```

---

## Configuration Endpoints

### GET A2A Config

Retrieve project-level A2A configuration including allowed external agents.

**Endpoint**: `GET /api/projects/:projectId/a2a-config`

**Path Parameters**:
- `projectId` (string, required): Project identifier

**Authentication**: Required (Project access token)

**Example Request**:
```bash
curl -X GET \
  "https://api.agentstudio.cc/api/projects/proj-abc123/a2a-config" \
  -H "Authorization: Bearer {project_access_token}"
```

**Success Response (200 OK)**:
```json
{
  "allowedAgents": [
    {
      "name": "Analytics Agent",
      "url": "https://analytics.example.com/a2a/uuid-123",
      "apiKey": "agt_ext_abc123...",
      "description": "External data analytics agent",
      "enabled": true
    },
    {
      "name": "Translation Agent",
      "url": "https://translate.example.com/a2a/uuid-456",
      "apiKey": "agt_ext_translate_key",
      "description": "Multi-language translation agent",
      "enabled": false
    }
  ],
  "taskTimeout": 300000,
  "maxConcurrentTasks": 5
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "Project not found or A2A not configured",
  "code": "PROJECT_NOT_FOUND"
}
```

---

### PUT A2A Config

Update project-level A2A configuration.

**Endpoint**: `PUT /api/projects/:projectId/a2a-config`

**Path Parameters**:
- `projectId` (string, required): Project identifier

**Authentication**: Required (Project admin access)

**Request Body**:
```typescript
{
  allowedAgents: Array<{
    name: string;
    url: string;          // Must be HTTPS in production
    apiKey: string;
    description?: string;
    enabled: boolean;
  }>;
  taskTimeout: number;    // 1000 <= value <= 1800000 milliseconds
  maxConcurrentTasks: number;  // 1 <= value <= 50
}
```

**Example Request**:
```bash
curl -X PUT \
  "https://api.agentstudio.cc/api/projects/proj-abc123/a2a-config" \
  -H "Authorization: Bearer {project_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "allowedAgents": [
      {
        "name": "Analytics Agent",
        "url": "https://analytics.example.com/a2a/uuid-123",
        "apiKey": "agt_ext_abc123...",
        "description": "External data analytics agent",
        "enabled": true
      }
    ],
    "taskTimeout": 600000,
    "maxConcurrentTasks": 10
  }'
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Configuration updated successfully"
}
```

**Error Response (400 Bad Request)**:
```json
{
  "error": "Invalid configuration",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "allowedAgents[0].url",
      "message": "URL must use HTTPS in production environment"
    },
    {
      "field": "taskTimeout",
      "message": "Timeout must be between 1000 and 1800000 milliseconds"
    }
  ]
}
```

---

## API Key Management

### POST Generate API Key

Generate new API key for project. The key is only displayed once at creation.

**Endpoint**: `POST /api/projects/:projectId/api-keys`

**Path Parameters**:
- `projectId` (string, required): Project identifier

**Authentication**: Required (Project admin access)

**Request Body**:
```typescript
{
  description: string;  // Optional, for identification purposes
}
```

**Example Request**:
```bash
curl -X POST \
  "https://api.agentstudio.cc/api/projects/proj-abc123/api-keys" \
  -H "Authorization: Bearer {project_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Production API key for analytics integration"
  }'
```

**Success Response (201 Created)**:
```json
{
  "id": "key-uuid-1",
  "key": "agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c",
  "projectId": "proj-abc123",
  "description": "Production API key for analytics integration",
  "createdAt": "2025-11-21T10:00:00.000Z"
}
```

**IMPORTANT**: The `key` field is only returned once. Store it securely - it cannot be retrieved later.

---

### DELETE Revoke API Key

Revoke API key. The key will no longer authenticate requests.

**Endpoint**: `DELETE /api/projects/:projectId/api-keys/:keyId`

**Path Parameters**:
- `projectId` (string, required): Project identifier
- `keyId` (string, required): API key ID (not the key itself)

**Authentication**: Required (Project admin access)

**Example Request**:
```bash
curl -X DELETE \
  "https://api.agentstudio.cc/api/projects/proj-abc123/api-keys/key-uuid-1" \
  -H "Authorization: Bearer {project_admin_token}"
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "API key revoked successfully",
  "keyId": "key-uuid-1",
  "revokedAt": "2025-11-21T15:00:00.000Z"
}
```

**Error Response (404 Not Found)**:
```json
{
  "error": "API key not found",
  "code": "KEY_NOT_FOUND"
}
```

---

### POST Rotate API Key

Rotate API key with grace period. Creates new key and schedules old key revocation.

**Endpoint**: `POST /api/projects/:projectId/api-keys/:keyId/rotate`

**Path Parameters**:
- `projectId` (string, required): Project identifier
- `keyId` (string, required): API key ID to rotate

**Authentication**: Required (Project admin access)

**Request Body**:
```typescript
{
  gracePeriodMinutes?: number;  // Optional, default 5 minutes
}
```

**Example Request**:
```bash
curl -X POST \
  "https://api.agentstudio.cc/api/projects/proj-abc123/api-keys/key-uuid-1/rotate" \
  -H "Authorization: Bearer {project_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "gracePeriodMinutes": 5
  }'
```

**Success Response (200 OK)**:
```json
{
  "newKey": {
    "id": "key-uuid-2",
    "key": "agt_proj_abc123_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
    "projectId": "proj-abc123",
    "description": "Production API key for analytics integration (rotated)",
    "createdAt": "2025-11-21T15:00:00.000Z"
  },
  "oldKey": {
    "id": "key-uuid-1",
    "revokedAt": "2025-11-21T15:05:00.000Z",
    "gracePeriodEnds": "2025-11-21T15:05:00.000Z"
  }
}
```

---

## Health Check

Check A2A service health and availability.

**Endpoint**: `GET /api/a2a/health`

**Authentication**: Not required

**Example Request**:
```bash
curl -X GET "https://api.agentstudio.cc/api/a2a/health"
```

**Success Response (200 OK)**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-11-21T10:00:00.000Z"
}
```

---

## Error Codes Reference

All error responses follow this standardized format:

```typescript
interface ErrorResponse {
  error: string;              // Human-readable error message
  code: string;               // Machine-readable error code
  details?: object | array;   // Optional additional context
}
```

**Error Code Table**:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key missing, malformed, or invalid |
| `AGENT_NOT_FOUND` | 404 | A2A agent ID doesn't exist |
| `TASK_NOT_FOUND` | 404 | Task ID doesn't exist |
| `KEY_NOT_FOUND` | 404 | API key ID doesn't exist |
| `PROJECT_NOT_FOUND` | 404 | Project not found or A2A not configured |
| `VALIDATION_ERROR` | 400 | Request payload failed validation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from this API key |
| `MAX_CONCURRENT_TASKS_REACHED` | 429 | Project has too many running tasks |
| `INVALID_STATE_TRANSITION` | 400 | Task state transition not allowed |
| `EXECUTION_ERROR` | 500 | Agent execution failed |
| `TIMEOUT_ERROR` | 500 | Task exceeded timeout limit |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

All A2A endpoints are rate-limited to prevent abuse.

**Limits**:
- 100 requests per hour per API key
- Rate limit applies per unique API key
- Limits reset on a rolling window basis

**Rate Limit Headers**:

All responses include these headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1700000000
```

**Example**:
- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

**Rate Limit Exceeded Response (429)**:
```json
{
  "error": "Too many A2A requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

**Headers**:
```
Retry-After: 3600
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700003600
```

---

## CORS Configuration

A2A endpoints support CORS for cross-origin requests.

**CORS Headers**:
```
Access-Control-Allow-Origin: * (or specific origins in production)
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

**Preflight Request Example**:
```bash
curl -X OPTIONS \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/messages" \
  -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Authorization, Content-Type"
```

---

## Versioning

**Current Version**: v1.0.0

Version information is included in all response headers:

```
X-A2A-Protocol-Version: 1.0.0
X-AgentStudio-Version: 0.1.19
```

Future breaking changes will use URL versioning:
```
/a2a/v2/:a2aAgentId/
```

Non-breaking changes (additive fields, new optional parameters) will maintain the same version.

---

## Complete Workflow Example

Here's a complete example of calling an external agent:

**Step 1: Get Agent Card (Discovery)**
```bash
curl -X GET \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/.well-known/agent-card.json" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c"
```

**Step 2: Send Message (Quick Operation)**
```bash
curl -X POST \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/messages" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c" \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze slide 3"}'
```

**Step 3: Create Task (Long Operation)**
```bash
TASK_RESPONSE=$(curl -X POST \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c" \
  -H "Content-Type: application/json" \
  -d '{"message": "Generate 10-slide presentation on AI"}')

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.taskId')
```

**Step 4: Poll Task Status**
```bash
# Poll every 5 seconds until task completes
while true; do
  STATUS=$(curl -X GET \
    "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks/$TASK_ID" \
    -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c")

  TASK_STATUS=$(echo $STATUS | jq -r '.status')

  if [ "$TASK_STATUS" = "completed" ] || [ "$TASK_STATUS" = "failed" ]; then
    echo $STATUS | jq .
    break
  fi

  sleep 5
done
```

**Step 5: Cancel Task (if needed)**
```bash
curl -X DELETE \
  "https://api.agentstudio.cc/a2a/7c9e6679-7425-40de-944b-e07fc1f90ae7/tasks/$TASK_ID" \
  -H "Authorization: Bearer agt_proj_abc123_4f3a2c1b9e8d7f6a5b4c3d2e1f0a9b8c"
```

---

## Support

For questions or issues:
- Documentation: https://docs.agentstudio.cc
- GitHub Issues: https://github.com/jeffkit/ai-editor-a2a/issues
- Email: bbmyth@gmail.com

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-21
**Maintained By**: AgentStudio Team
