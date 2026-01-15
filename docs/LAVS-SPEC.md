# LAVS Specification v1.0

**Local Agent View Service Protocol**

## Abstract

LAVS (Local Agent View Service) is a standard protocol that enables local AI agents to expose structured data interfaces and interact securely with visual UI components. It fills the gap between conversational AI interfaces and visual data manipulation needs in local agent applications.

## Status of This Document

This document is a draft specification for LAVS version 1.0. It is subject to change based on community feedback and implementation experience.

**Version:** 1.0.0-draft
**Date:** 2025-01-15
**Authors:** AgentStudio Team
**License:** Apache 2.0

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Architecture](#3-architecture)
4. [Manifest Format](#4-manifest-format)
5. [Protocol Specification](#5-protocol-specification)
6. [Security Model](#6-security-model)
7. [View Component Interface](#7-view-component-interface)
8. [Examples](#8-examples)
9. [Interoperability](#9-interoperability)
10. [Appendix](#10-appendix)

---

## 1. Introduction

### 1.1 Motivation

Modern AI agent applications often require:
- **Conversational interface** for natural language interaction
- **Visual interface** for structured data manipulation
- **Bidirectional data flow** between AI and human users
- **Local data persistence** with various storage backends

Existing protocols address specific aspects:
- **MCP (Model Context Protocol)**: Agent ↔ External tools
- **A2A (Agent-to-Agent)**: Agent ↔ Agent communication
- **MCP UI**: Tool parameter input forms

However, none provide a standard way for local agents to:
1. Expose structured data operations to visual frontends
2. Execute local scripts/services safely
3. Maintain synchronized state between AI and UI

LAVS addresses this gap.

### 1.2 Design Goals

1. **Declarative**: Interfaces defined in JSON manifest
2. **Language-agnostic**: Works with any scripting language
3. **Secure**: Permission-based access control and sandboxing
4. **Framework-independent**: Frontend can use any UI framework
5. **Composable**: Works alongside MCP, A2A, and other protocols
6. **Developer-friendly**: Minimal boilerplate, clear contracts

### 1.3 Use Cases

- **Task Management**: AI conversation + Kanban board UI
- **Note-Taking**: AI organization + Rich text editor
- **Data Analysis**: AI insights + Chart visualizations
- **Code Assistance**: AI generation + Code editor
- **Personal Finance**: AI bookkeeping + Dashboard

---

## 2. Terminology

- **LAVS Service**: A service that implements the LAVS protocol
- **Manifest**: JSON file (`lavs.json`) defining service interfaces
- **Endpoint**: A callable operation exposed by the service
- **Handler**: Backend script/function that implements an endpoint
- **View Component**: Frontend UI component that consumes the service
- **Runtime**: Software that executes LAVS services
- **Client**: Software that calls LAVS endpoints (frontend or agent)

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────┐
│              Agent Application                   │
│                                                  │
│  ┌──────────────┐         ┌──────────────┐     │
│  │   Chat UI    │         │  Visual UI   │     │
│  │  (Dialogue)  │         │ (LAVS View)  │     │
│  └──────┬───────┘         └──────┬───────┘     │
│         │                        │              │
│         │   ┌────────────────────┘              │
│         │   │                                   │
│         ▼   ▼                                   │
│    ┌─────────────┐                             │
│    │   Agent     │                             │
│    │   Runtime   │                             │
│    └──────┬──────┘                             │
│           │                                     │
└───────────┼─────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐
   │  LAVS Runtime   │◄──── lavs.json
   └────────┬────────┘
            │
      ┌─────┴─────┬──────────┬──────────┐
      ▼           ▼          ▼          ▼
   Script    Function     HTTP      Database
   Handler    Handler    Proxy      Adapter
```

### 3.2 Communication Flow

```
Frontend Component
    │
    │ 1. Call endpoint
    ├──────────────────────────► LAVS Runtime
    │                                  │
    │                                  │ 2. Validate permissions
    │                                  │ 3. Resolve handler
    │                                  │
    │                                  ▼
    │                            Execute Handler
    │                            (script/function)
    │                                  │
    │ 4. Return result                 │
    │◄─────────────────────────────────┘
    │
    │ 5. Update UI
    ▼
```

### 3.3 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Manifest** | Define interfaces, permissions, handlers |
| **Runtime** | Parse manifest, execute handlers, enforce security |
| **Handler** | Implement business logic, data operations |
| **View Component** | Render UI, call endpoints via client SDK |
| **Client SDK** | Abstract communication protocol |

---

## 4. Manifest Format

### 4.1 Schema

A LAVS manifest is a JSON file named `lavs.json` with the following structure:

```typescript
interface LAVSManifest {
  lavs: string;              // Protocol version (e.g., "1.0")
  name: string;              // Service name (unique identifier)
  version: string;           // Service version (semver)
  description?: string;      // Human-readable description

  endpoints: Endpoint[];     // Exposed operations
  view?: ViewConfig;         // Optional UI component
  types?: TypeDefinitions;   // Type definitions
  permissions?: Permissions; // Security constraints
}
```

### 4.2 Endpoint Definition

```typescript
interface Endpoint {
  id: string;                // Unique endpoint identifier
  method: 'query' | 'mutation' | 'subscription';
  description?: string;

  handler: Handler;          // How to execute this endpoint
  schema?: Schema;           // Input/output schema
  permissions?: Permissions; // Endpoint-specific permissions
}
```

#### 4.2.1 Method Types

- **query**: Read-only operations (GET)
- **mutation**: Write operations (POST/PUT/DELETE)
- **subscription**: Real-time updates (WebSocket/SSE)

### 4.3 Handler Types

```typescript
type Handler =
  | ScriptHandler
  | FunctionHandler
  | HTTPHandler
  | MCPHandler;

interface ScriptHandler {
  type: 'script';
  command: string;           // Command to execute
  args?: string[];           // Static arguments
  input?: 'args' | 'stdin' | 'env'; // How to pass parameters
  cwd?: string;              // Working directory
  timeout?: number;          // Max execution time (ms)
  env?: Record<string, string>; // Environment variables
}

interface FunctionHandler {
  type: 'function';
  module: string;            // Path to JS/TS module
  function: string;          // Function name to call
}

interface HTTPHandler {
  type: 'http';
  url: string;               // HTTP endpoint
  method: string;            // HTTP method
  headers?: Record<string, string>;
}

interface MCPHandler {
  type: 'mcp';
  server: string;            // MCP server name
  tool: string;              // MCP tool name
}
```

### 4.4 Schema Definition

Uses JSON Schema format:

```typescript
interface Schema {
  input?: JSONSchema;        // Input parameters schema
  output?: JSONSchema;       // Output data schema
}
```

### 4.5 View Configuration

```typescript
interface ViewConfig {
  component: ComponentSource;
  fallback?: 'list' | 'table' | 'json'; // Fallback display mode
  icon?: string;             // Icon identifier
  theme?: Record<string, string>; // Theme variables
}

type ComponentSource =
  | { type: 'cdn'; url: string; exportName?: string }
  | { type: 'npm'; package: string; version?: string }
  | { type: 'local'; path: string }
  | { type: 'inline'; code: string };
```

### 4.6 Permissions

```typescript
interface Permissions {
  fileAccess?: string[];     // Allowed file path patterns
  networkAccess?: boolean | string[]; // Network access control
  maxExecutionTime?: number; // Max handler execution time (ms)
  maxMemory?: number;        // Max memory usage (bytes)
}
```

### 4.7 Complete Example

```json
{
  "lavs": "1.0",
  "name": "todo-manager",
  "version": "1.0.0",
  "description": "Todo management service with AI assistance",

  "endpoints": [
    {
      "id": "listTodos",
      "method": "query",
      "description": "Retrieve all todos",
      "handler": {
        "type": "script",
        "command": "node",
        "args": ["scripts/todo-service.js", "list"],
        "input": "args",
        "timeout": 5000
      },
      "schema": {
        "output": {
          "type": "array",
          "items": { "$ref": "#/types/Todo" }
        }
      }
    },
    {
      "id": "addTodo",
      "method": "mutation",
      "description": "Create a new todo",
      "handler": {
        "type": "script",
        "command": "node",
        "args": ["scripts/todo-service.js", "add"],
        "input": "stdin"
      },
      "schema": {
        "input": {
          "type": "object",
          "properties": {
            "text": { "type": "string" },
            "priority": { "type": "number", "default": 0 }
          },
          "required": ["text"]
        },
        "output": { "$ref": "#/types/Todo" }
      }
    },
    {
      "id": "todoUpdates",
      "method": "subscription",
      "description": "Subscribe to todo changes",
      "handler": {
        "type": "script",
        "command": "node",
        "args": ["scripts/todo-watch.js"]
      }
    }
  ],

  "view": {
    "component": {
      "type": "cdn",
      "url": "https://cdn.example.com/todo-view@1.0.0.js",
      "exportName": "TodoView"
    },
    "fallback": "table",
    "icon": "checklist"
  },

  "types": {
    "Todo": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "text": { "type": "string" },
        "done": { "type": "boolean" },
        "priority": { "type": "number" },
        "createdAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "text", "done"]
    }
  },

  "permissions": {
    "fileAccess": ["./data/**/*.json"],
    "networkAccess": false,
    "maxExecutionTime": 30000,
    "maxMemory": 104857600
  }
}
```

---

## 5. Protocol Specification

### 5.1 Transport

LAVS Runtime MUST support at least one of:
- HTTP/HTTPS (for queries and mutations)
- WebSocket (for subscriptions)

Recommended: HTTP for stateless operations, WebSocket for subscriptions.

### 5.2 Message Format

LAVS uses JSON-RPC 2.0 over HTTP/WebSocket.

#### 5.2.1 Request

```typescript
interface LAVSRequest {
  jsonrpc: '2.0';
  id: string | number;       // Request ID
  method: string;            // 'lavs/call' | 'lavs/subscribe' | 'lavs/unsubscribe'
  params: {
    endpoint: string;        // Endpoint ID from manifest
    input?: any;             // Input parameters
  };
}
```

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "lavs/call",
  "params": {
    "endpoint": "addTodo",
    "input": {
      "text": "Buy milk",
      "priority": 1
    }
  }
}
```

#### 5.2.2 Response

```typescript
interface LAVSResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;              // Success result
  error?: LAVSError;         // Error object
}

interface LAVSError {
  code: number;              // Error code
  message: string;           // Error message
  data?: any;                // Additional error data
}
```

**Success Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": 123,
    "text": "Buy milk",
    "done": false,
    "priority": 1,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: 'text' is required",
    "data": {
      "field": "text",
      "constraint": "required"
    }
  }
}
```

### 5.3 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid request | Invalid request object |
| -32601 | Method not found | Endpoint does not exist |
| -32602 | Invalid params | Invalid input parameters |
| -32603 | Internal error | Runtime error |
| -32001 | Permission denied | Insufficient permissions |
| -32002 | Timeout | Handler execution timeout |
| -32003 | Handler error | Handler script/function failed |

### 5.4 Subscription Protocol

For `subscription` endpoints, use WebSocket:

**Subscribe:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "lavs/subscribe",
  "params": {
    "endpoint": "todoUpdates"
  }
}
```

**Subscription Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "subscriptionId": "sub-123"
  }
}
```

**Data Push (no id, server-initiated):**
```json
{
  "jsonrpc": "2.0",
  "method": "lavs/data",
  "params": {
    "subscriptionId": "sub-123",
    "data": {
      "type": "todoAdded",
      "todo": { "id": 124, "text": "New task" }
    }
  }
}
```

**Unsubscribe:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "lavs/unsubscribe",
  "params": {
    "subscriptionId": "sub-123"
  }
}
```

---

## 6. Security Model

### 6.1 Principles

1. **Least Privilege**: Services declare minimum required permissions
2. **Sandboxing**: Handlers execute in isolated environments
3. **Validation**: All inputs validated against schemas
4. **Auditing**: All operations logged for review

### 6.2 Permission Enforcement

Runtime MUST enforce permissions declared in manifest:

- **fileAccess**: Glob patterns for accessible files
  - `./data/**/*.json` - Allow JSON files in data directory
  - `!./data/secrets.json` - Explicitly deny specific file

- **networkAccess**:
  - `false` - No network access
  - `true` - Allow all network access (discouraged)
  - `["api.example.com"]` - Whitelist specific domains

- **maxExecutionTime**: Kill handler if exceeds limit

- **maxMemory**: Enforce memory limits (OS-dependent)

### 6.3 Input Validation

Runtime MUST validate inputs against schema before execution:

```typescript
// Pseudocode
function validateAndExecute(endpoint, input) {
  if (!validate(input, endpoint.schema.input)) {
    throw new LAVSError(-32602, 'Invalid params');
  }

  const result = executeHandler(endpoint.handler, input);

  if (!validate(result, endpoint.schema.output)) {
    throw new LAVSError(-32603, 'Invalid output from handler');
  }

  return result;
}
```

### 6.4 Sandboxing

Recommended sandbox mechanisms:

- **Script handlers**:
  - Use OS-level process isolation
  - Drop unnecessary capabilities (Linux capabilities)
  - Use containers (Docker, podman) for strict isolation

- **Function handlers**:
  - Run in separate V8 isolate (Node.js)
  - Use `vm2` or similar sandboxing libraries

- **Network isolation**:
  - Use network namespaces or firewall rules
  - Enforce domain whitelists

### 6.5 View Component Security

View components from untrusted sources SHOULD:

1. Load in sandboxed iframe with CSP headers
2. Only access LAVS endpoints (no direct file access)
3. Be served with `Permissions-Policy` restrictions

Example CSP for view component:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  connect-src https://localhost:5555;
  frame-ancestors 'none';
```

---

## 7. View Component Interface

### 7.1 Component Contract

View components MUST implement this interface:

```typescript
interface LAVSViewComponent extends HTMLElement {
  // Called when component is mounted
  connectedCallback(): void;

  // Runtime injects API client
  setLAVSClient(client: LAVSClient): void;

  // Optional: receive notifications from agent
  onAgentAction?(action: AgentAction): void;

  // Called when component is unmounted
  disconnectedCallback(): void;
}
```

### 7.2 Client API

Runtime provides this client to view components:

```typescript
interface LAVSClient {
  // Call an endpoint
  call<T = any>(
    endpoint: string,
    input?: any
  ): Promise<T>;

  // Subscribe to updates
  subscribe(
    endpoint: string,
    callback: (data: any) => void
  ): () => void; // Returns unsubscribe function

  // Get service metadata
  getManifest(): Promise<LAVSManifest>;

  // Read files (if permitted)
  readFile(path: string): Promise<string>;
}
```

### 7.3 Example View Component

```typescript
class TodoView extends HTMLElement implements LAVSViewComponent {
  private client!: LAVSClient;
  private todos: Todo[] = [];

  connectedCallback() {
    this.render();
  }

  setLAVSClient(client: LAVSClient) {
    this.client = client;
    this.init();
  }

  async init() {
    // Load initial data
    this.todos = await this.client.call('listTodos');

    // Subscribe to updates
    this.client.subscribe('todoUpdates', (data) => {
      this.handleUpdate(data);
    });

    this.render();
  }

  async addTodo(text: string) {
    const newTodo = await this.client.call('addTodo', {
      text,
      priority: 1
    });
    this.todos.push(newTodo);
    this.render();
  }

  onAgentAction(action: AgentAction) {
    if (action.type === 'todoAdded') {
      this.todos.push(action.data);
      this.render();
    }
  }

  render() {
    this.innerHTML = `
      <div class="todo-list">
        ${this.todos.map(t => `
          <div class="todo-item">${t.text}</div>
        `).join('')}
      </div>
    `;
  }
}

customElements.define('todo-view', TodoView);
```

---

## 8. Examples

### 8.1 Simple File-Based Service

**lavs.json:**
```json
{
  "lavs": "1.0",
  "name": "simple-notes",
  "version": "1.0.0",

  "endpoints": [
    {
      "id": "getNotes",
      "method": "query",
      "handler": {
        "type": "script",
        "command": "cat",
        "args": ["notes.txt"]
      }
    },
    {
      "id": "saveNote",
      "method": "mutation",
      "handler": {
        "type": "script",
        "command": "bash",
        "args": ["-c", "echo \"$NOTE\" >> notes.txt"],
        "input": "env"
      },
      "schema": {
        "input": {
          "type": "object",
          "properties": {
            "NOTE": { "type": "string" }
          }
        }
      }
    }
  ],

  "permissions": {
    "fileAccess": ["notes.txt"]
  }
}
```

### 8.2 Database-Backed Service

**lavs.json:**
```json
{
  "lavs": "1.0",
  "name": "contact-manager",
  "version": "1.0.0",

  "endpoints": [
    {
      "id": "searchContacts",
      "method": "query",
      "handler": {
        "type": "script",
        "command": "python3",
        "args": ["scripts/contacts.py", "search"],
        "input": "stdin"
      },
      "schema": {
        "input": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          }
        }
      }
    }
  ],

  "permissions": {
    "fileAccess": ["contacts.db"]
  }
}
```

**scripts/contacts.py:**
```python
import sys
import json
import sqlite3

action = sys.argv[1]
conn = sqlite3.connect('contacts.db')

if action == 'search':
    params = json.load(sys.stdin)
    query = params['query']
    cursor = conn.execute(
        "SELECT * FROM contacts WHERE name LIKE ?",
        (f"%{query}%",)
    )
    results = [dict(row) for row in cursor.fetchall()]
    print(json.dumps(results))
```

### 8.3 MCP Integration

**lavs.json:**
```json
{
  "lavs": "1.0",
  "name": "github-issues",
  "version": "1.0.0",

  "endpoints": [
    {
      "id": "listIssues",
      "method": "query",
      "handler": {
        "type": "mcp",
        "server": "github",
        "tool": "list_issues"
      }
    }
  ]
}
```

---

## 9. Interoperability

### 9.1 Relationship with MCP

LAVS complements MCP:

- **MCP**: Agent calls external tools/services
- **LAVS**: Agent exposes internal data to UI

They can work together:

```json
{
  "endpoints": [
    {
      "id": "searchGitHub",
      "method": "query",
      "handler": {
        "type": "mcp",
        "server": "github",
        "tool": "search_code"
      }
    }
  ]
}
```

### 9.2 Relationship with A2A

LAVS services can be called by other agents via A2A:

```
Agent A (LAVS) ←─ HTTP ─→ Agent B (A2A client)
```

### 9.3 Standard File Locations

Recommended directory structure:

```
my-agent/
├── lavs.json              # LAVS manifest
├── mcp-config.json        # Optional: MCP servers
├── scripts/               # Handler scripts
├── data/                  # Data storage
└── views/                 # View components (if local)
```

---

## 10. Appendix

### 10.1 Complete Type Definitions

See reference implementation: `@lavs/types`

### 10.2 Migration from Custom APIs

To migrate existing agent APIs to LAVS:

1. Create `lavs.json` manifest
2. Wrap existing API endpoints as handlers
3. Define schemas for validation
4. Update frontend to use LAVS client

### 10.3 Performance Considerations

- **Script handlers**: Have startup overhead, consider long-running processes
- **Caching**: Implement response caching for read-heavy workloads
- **Batching**: Support batch operations to reduce round trips

### 10.4 Future Extensions

Possible future additions:

- **Streaming responses**: For large datasets
- **Transactions**: Multi-operation atomicity
- **Middleware**: Custom validation/transformation hooks
- **Service discovery**: Registry for finding LAVS services

---

## References

- JSON-RPC 2.0: https://www.jsonrpc.org/specification
- JSON Schema: https://json-schema.org/
- Model Context Protocol: https://modelcontextprotocol.io/
- Web Components: https://developer.mozilla.org/en-US/docs/Web/API/Web_components

---

## License

This specification is licensed under Apache License 2.0.

Copyright 2025 AgentStudio Team

---

## Changelog

### v1.0.0-draft (2025-01-15)
- Initial draft specification
