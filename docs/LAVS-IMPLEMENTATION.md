# LAVS Implementation Guide

**Reference SDK Design and Requirements**

## Document Overview

This document provides detailed requirements and design specifications for implementing LAVS (Local Agent View Service) reference SDKs. It covers both backend runtime implementations (Python and TypeScript) and frontend client SDK (TypeScript/JavaScript).

**Target Audience:** Developers implementing LAVS SDK
**Version:** 1.0.0-draft
**Last Updated:** 2025-01-15

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Backend Runtime Requirements](#2-backend-runtime-requirements)
3. [Frontend Client Requirements](#4-frontend-client-requirements)
4. [Testing Requirements](#5-testing-requirements)
5. [Documentation Requirements](#6-documentation-requirements)
6. [Deployment and Distribution](#7-deployment-and-distribution)

---

## 1. System Architecture

### 1.1 Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      LAVS Ecosystem                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Browser/Desktop App)                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  View Component (Web Component)                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  @lavs/client (TypeScript SDK)               │  │    │
│  │  │  • call(endpoint, input)                     │  │    │
│  │  │  • subscribe(endpoint, callback)             │  │    │
│  │  │  • getManifest()                             │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └─────────────────────┬──────────────────────────────┘    │
│                        │ JSON-RPC 2.0                       │
│                        │ (HTTP/WebSocket)                   │
│                        ▼                                    │
│  Backend (Node.js/Python)                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @lavs/runtime (TypeScript) / lavs-py (Python)     │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Core Modules:                               │  │    │
│  │  │  • Manifest Loader & Validator               │  │    │
│  │  │  • Endpoint Router                           │  │    │
│  │  │  • Handler Executor                          │  │    │
│  │  │  • Permission Enforcer                       │  │    │
│  │  │  • Schema Validator                          │  │    │
│  │  │  • HTTP/WebSocket Server                     │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                     │                               │    │
│  │                     ▼                               │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Handler Implementations:                    │  │    │
│  │  │  • Script Handler (exec child process)       │  │    │
│  │  │  • Function Handler (direct call)            │  │    │
│  │  │  • HTTP Handler (proxy to URL)               │  │    │
│  │  │  • MCP Handler (bridge to MCP server)        │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

**Query/Mutation Flow:**

```
1. View Component
   └─► client.call('addTodo', { text: 'Buy milk' })
        │
2. LAVS Client SDK
   └─► Send JSON-RPC request via HTTP POST
        │
        ▼
        {
          "jsonrpc": "2.0",
          "id": 1,
          "method": "lavs/call",
          "params": {
            "endpoint": "addTodo",
            "input": { "text": "Buy milk" }
          }
        }
        │
3. LAVS Runtime
   ├─► Parse & validate request
   ├─► Load endpoint from manifest
   ├─► Check permissions (fileAccess, networkAccess)
   ├─► Validate input against schema
   ├─► Execute handler (script/function/http/mcp)
   │   │
   │   └─► Script Handler:
   │       • Spawn child process
   │       • Pass input via stdin/args/env
   │       • Capture stdout/stderr
   │       • Parse output as JSON
   │
   ├─► Validate output against schema
   └─► Send JSON-RPC response
        │
        ▼
        {
          "jsonrpc": "2.0",
          "id": 1,
          "result": { "id": 123, "text": "Buy milk", ... }
        }
        │
4. LAVS Client SDK
   └─► Resolve promise with result
        │
5. View Component
   └─► Update UI with new todo
```

**Subscription Flow:**

```
1. View Component
   └─► client.subscribe('todoUpdates', callback)
        │
2. LAVS Client SDK
   └─► Open WebSocket connection
   └─► Send subscribe request
        │
3. LAVS Runtime
   ├─► Create subscription
   ├─► Start handler (long-running process/function)
   └─► Listen for handler output
        │
        [Handler emits data]
        │
   └─► Send data push to client
        │
4. LAVS Client SDK
   └─► Invoke callback with data
        │
5. View Component
   └─► Update UI reactively
```

### 1.3 File Structure

**Backend Runtime (TypeScript):**

```
@lavs/runtime/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── runtime.ts                  # LAVSRuntime class
│   ├── server/
│   │   ├── http-server.ts          # HTTP server implementation
│   │   └── websocket-server.ts     # WebSocket server implementation
│   ├── manifest/
│   │   ├── loader.ts               # Load & parse lavs.json
│   │   ├── validator.ts            # Validate manifest schema
│   │   └── types.ts                # TypeScript types for manifest
│   ├── executor/
│   │   ├── executor.ts             # Base executor interface
│   │   ├── script-executor.ts      # Execute script handlers
│   │   ├── function-executor.ts    # Execute function handlers
│   │   ├── http-executor.ts        # Execute HTTP handlers
│   │   └── mcp-executor.ts         # Execute MCP handlers
│   ├── security/
│   │   ├── permission-checker.ts   # Enforce permissions
│   │   ├── sandbox.ts              # Sandboxing utilities
│   │   └── input-validator.ts      # Validate inputs against schema
│   ├── subscription/
│   │   └── subscription-manager.ts # Manage subscriptions
│   └── utils/
│       ├── logger.ts               # Logging
│       └── errors.ts               # Error types
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
└── tsconfig.json
```

**Backend Runtime (Python):**

```
lavs-py/
├── lavs/
│   ├── __init__.py
│   ├── runtime.py                  # LAVSRuntime class
│   ├── server/
│   │   ├── __init__.py
│   │   ├── http_server.py          # HTTP server (aiohttp)
│   │   └── websocket_server.py     # WebSocket server
│   ├── manifest/
│   │   ├── __init__.py
│   │   ├── loader.py               # Load & parse lavs.json
│   │   ├── validator.py            # Validate manifest
│   │   └── types.py                # Pydantic models
│   ├── executor/
│   │   ├── __init__.py
│   │   ├── base.py                 # Base executor
│   │   ├── script.py               # Script executor
│   │   ├── function.py             # Function executor
│   │   ├── http.py                 # HTTP executor
│   │   └── mcp.py                  # MCP executor
│   ├── security/
│   │   ├── __init__.py
│   │   ├── permissions.py          # Permission enforcer
│   │   └── validator.py            # Schema validator (jsonschema)
│   ├── subscription/
│   │   └── manager.py              # Subscription manager
│   └── utils/
│       ├── logger.py
│       └── errors.py
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml
└── README.md
```

**Frontend Client (TypeScript):**

```
@lavs/client/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── client.ts                   # LAVSClient class
│   ├── transport/
│   │   ├── http-transport.ts       # HTTP transport
│   │   └── websocket-transport.ts  # WebSocket transport
│   ├── types.ts                    # TypeScript types
│   └── utils/
│       └── errors.ts               # Error handling
├── tests/
├── package.json
└── tsconfig.json
```

---

## 2. Backend Runtime Requirements

### 2.1 Core Classes and Interfaces

#### 2.1.1 LAVSRuntime Class

**TypeScript:**

```typescript
// src/runtime.ts

interface LAVSRuntimeOptions {
  manifestPath?: string;          // Path to lavs.json (default: ./lavs.json)
  workdir?: string;               // Working directory for handlers
  port?: number;                  // HTTP server port (default: 5555)
  host?: string;                  // Server host (default: localhost)
  enableWebSocket?: boolean;      // Enable WebSocket for subscriptions
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  // Security
  enforcePermissions?: boolean;   // Enforce manifest permissions (default: true)
  maxConcurrentHandlers?: number; // Max concurrent handler executions

  // CORS
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
}

export class LAVSRuntime {
  private manifest: LAVSManifest;
  private httpServer: HTTPServer;
  private wsServer?: WebSocketServer;
  private executors: Map<string, Executor>;
  private subscriptionManager: SubscriptionManager;

  constructor(options?: LAVSRuntimeOptions);

  // Lifecycle
  async start(): Promise<void>;
  async stop(): Promise<void>;

  // Endpoint execution
  async call(endpoint: string, input?: any): Promise<any>;

  // Subscription
  subscribe(
    endpoint: string,
    callback: (data: any) => void
  ): () => void; // Returns unsubscribe function

  // Introspection
  getManifest(): LAVSManifest;
  getEndpoint(id: string): Endpoint | undefined;

  // Testing helpers
  async executeHandler(
    handler: Handler,
    input?: any
  ): Promise<any>;
}
```

**Python:**

```python
# lavs/runtime.py

from typing import Optional, Dict, Callable, Any
from dataclasses import dataclass

@dataclass
class LAVSRuntimeOptions:
    manifest_path: str = "./lavs.json"
    workdir: str = "."
    port: int = 5555
    host: str = "localhost"
    enable_websocket: bool = True
    log_level: str = "info"
    enforce_permissions: bool = True
    max_concurrent_handlers: int = 10
    cors_origin: str | list[str] = "*"

class LAVSRuntime:
    def __init__(self, options: Optional[LAVSRuntimeOptions] = None):
        self.options = options or LAVSRuntimeOptions()
        self.manifest: Optional[LAVSManifest] = None
        self.http_server: Optional[HTTPServer] = None
        self.ws_server: Optional[WebSocketServer] = None
        self.executors: Dict[str, Executor] = {}
        self.subscription_manager = SubscriptionManager()

    async def start(self) -> None:
        """Load manifest and start servers"""
        pass

    async def stop(self) -> None:
        """Stop servers and cleanup"""
        pass

    async def call(self, endpoint: str, input: Any = None) -> Any:
        """Execute an endpoint"""
        pass

    def subscribe(
        self,
        endpoint: str,
        callback: Callable[[Any], None]
    ) -> Callable[[], None]:
        """Subscribe to endpoint, returns unsubscribe function"""
        pass

    def get_manifest(self) -> LAVSManifest:
        """Get loaded manifest"""
        pass
```

#### 2.1.2 Manifest Loader

**Requirements:**

1. Load `lavs.json` from file system
2. Parse JSON with error handling
3. Validate against schema (see LAVS-SPEC.md section 4)
4. Resolve relative paths (scripts, data files)
5. Support JSON Schema `$ref` resolution for type definitions

**TypeScript:**

```typescript
// src/manifest/loader.ts

export class ManifestLoader {
  async load(path: string): Promise<LAVSManifest> {
    // 1. Read file
    const content = await fs.readFile(path, 'utf-8');

    // 2. Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new ManifestError('Invalid JSON', { cause: e });
    }

    // 3. Validate schema
    const validator = new ManifestValidator();
    const errors = validator.validate(parsed);
    if (errors.length > 0) {
      throw new ManifestError('Invalid manifest', { errors });
    }

    // 4. Resolve relative paths
    const manifest = this.resolvePaths(parsed, path);

    return manifest as LAVSManifest;
  }

  private resolvePaths(
    manifest: any,
    manifestPath: string
  ): any {
    const basedir = dirname(manifestPath);

    // Resolve script handler paths
    for (const endpoint of manifest.endpoints) {
      if (endpoint.handler.type === 'script') {
        // Convert relative paths to absolute
        if (!isAbsolute(endpoint.handler.command)) {
          endpoint.handler.command = resolve(
            basedir,
            endpoint.handler.command
          );
        }

        // Resolve handler.cwd if specified
        if (endpoint.handler.cwd) {
          endpoint.handler.cwd = resolve(
            basedir,
            endpoint.handler.cwd
          );
        }
      }

      if (endpoint.handler.type === 'function') {
        endpoint.handler.module = resolve(
          basedir,
          endpoint.handler.module
        );
      }
    }

    // Resolve view component paths
    if (manifest.view?.component?.type === 'local') {
      manifest.view.component.path = resolve(
        basedir,
        manifest.view.component.path
      );
    }

    return manifest;
  }
}
```

**Python:**

```python
# lavs/manifest/loader.py

import json
from pathlib import Path
from typing import Any
from .validator import ManifestValidator
from .types import LAVSManifest

class ManifestLoader:
    def load(self, path: str) -> LAVSManifest:
        """Load and validate manifest from file"""

        # 1. Read file
        manifest_path = Path(path)
        content = manifest_path.read_text()

        # 2. Parse JSON
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            raise ManifestError(f"Invalid JSON: {e}")

        # 3. Validate schema
        validator = ManifestValidator()
        errors = validator.validate(parsed)
        if errors:
            raise ManifestError(f"Invalid manifest: {errors}")

        # 4. Resolve relative paths
        resolved = self._resolve_paths(parsed, manifest_path)

        # 5. Convert to Pydantic model
        return LAVSManifest(**resolved)

    def _resolve_paths(
        self,
        manifest: dict,
        manifest_path: Path
    ) -> dict:
        basedir = manifest_path.parent

        # Resolve script handlers
        for endpoint in manifest.get('endpoints', []):
            handler = endpoint.get('handler', {})

            if handler.get('type') == 'script':
                # Resolve command path
                cmd = handler['command']
                if not Path(cmd).is_absolute():
                    handler['command'] = str(basedir / cmd)

                # Resolve cwd
                if 'cwd' in handler:
                    handler['cwd'] = str(basedir / handler['cwd'])

            elif handler.get('type') == 'function':
                handler['module'] = str(basedir / handler['module'])

        # Resolve view component
        if 'view' in manifest:
            component = manifest['view'].get('component', {})
            if component.get('type') == 'local':
                component['path'] = str(basedir / component['path'])

        return manifest
```

#### 2.1.3 Executor Interface

**Base interface for all handler executors:**

```typescript
// src/executor/executor.ts

export interface Executor {
  // Execute handler with input, return output
  execute(
    handler: Handler,
    input: any,
    context: ExecutionContext
  ): Promise<any>;

  // Check if this executor can handle the given handler
  canHandle(handler: Handler): boolean;

  // Cleanup resources
  dispose(): Promise<void>;
}

export interface ExecutionContext {
  endpointId: string;
  workdir: string;
  permissions: Permissions;
  timeout?: number;
  env?: Record<string, string>;
}
```

#### 2.1.4 Script Executor

**Most complex executor - handles script execution with security.**

**Requirements:**

1. Spawn child process with handler.command
2. Pass input via stdin/args/env based on handler.input
3. Enforce timeout (kill process if exceeded)
4. Capture stdout (as result) and stderr (as logs)
5. Validate output is valid JSON
6. Enforce file access permissions (prevent access to unauthorized paths)
7. Handle process errors gracefully

**TypeScript:**

```typescript
// src/executor/script-executor.ts

import { spawn, ChildProcess } from 'child_process';

export class ScriptExecutor implements Executor {
  canHandle(handler: Handler): boolean {
    return handler.type === 'script';
  }

  async execute(
    handler: ScriptHandler,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    // 1. Prepare command and args
    const { command, args = [], env = {} } = handler;
    const resolvedArgs = this.resolveArgs(args, input);

    // 2. Prepare environment
    const processEnv = {
      ...process.env,
      ...env,
      ...(handler.input === 'env' ? this.inputToEnv(input) : {})
    };

    // 3. Spawn process
    const proc = spawn(command, resolvedArgs, {
      cwd: handler.cwd || context.workdir,
      env: processEnv,
      timeout: context.timeout || handler.timeout || 30000
    });

    // 4. Send input to stdin if needed
    if (handler.input === 'stdin' && input) {
      proc.stdin.write(JSON.stringify(input));
      proc.stdin.end();
    }

    // 5. Capture output
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      logger.debug(`[${context.endpointId}] stderr: ${data}`);
    });

    // 6. Wait for completion
    const exitCode = await new Promise<number>((resolve, reject) => {
      proc.on('exit', (code) => resolve(code || 0));
      proc.on('error', reject);
    });

    // 7. Handle errors
    if (exitCode !== 0) {
      throw new HandlerError(
        `Script exited with code ${exitCode}`,
        { stderr, stdout }
      );
    }

    // 8. Parse output
    try {
      return JSON.parse(stdout.trim());
    } catch (e) {
      throw new HandlerError(
        'Invalid JSON output from script',
        { stdout, stderr }
      );
    }
  }

  private resolveArgs(args: string[], input: any): string[] {
    // Replace {{placeholders}} in args with input values
    return args.map(arg => {
      return arg.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        return this.getValueByPath(input, path);
      });
    });
  }

  private getValueByPath(obj: any, path: string): string {
    const value = path.split('.').reduce((o, k) => o?.[k], obj);
    return value != null ? String(value) : '';
  }

  private inputToEnv(input: any): Record<string, string> {
    // Flatten input object to ENV vars
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      env[key.toUpperCase()] = String(value);
    }
    return env;
  }

  async dispose(): Promise<void> {
    // Cleanup any running processes
  }
}
```

**Python:**

```python
# lavs/executor/script.py

import subprocess
import json
from typing import Any, Dict
from .base import Executor, ExecutionContext

class ScriptExecutor(Executor):
    def can_handle(self, handler: dict) -> bool:
        return handler.get('type') == 'script'

    async def execute(
        self,
        handler: dict,
        input: Any,
        context: ExecutionContext
    ) -> Any:
        command = handler['command']
        args = handler.get('args', [])
        timeout = handler.get('timeout', context.timeout or 30)

        # Resolve args with input placeholders
        resolved_args = self._resolve_args(args, input)

        # Prepare environment
        env = dict(os.environ)
        env.update(handler.get('env', {}))

        if handler.get('input') == 'env':
            env.update(self._input_to_env(input))

        # Build full command
        full_command = [command] + resolved_args

        # Prepare stdin
        stdin_data = None
        if handler.get('input') == 'stdin' and input:
            stdin_data = json.dumps(input).encode()

        # Execute
        try:
            result = subprocess.run(
                full_command,
                input=stdin_data,
                capture_output=True,
                timeout=timeout,
                cwd=handler.get('cwd', context.workdir),
                env=env
            )
        except subprocess.TimeoutExpired:
            raise HandlerError(f"Script timeout after {timeout}s")

        # Check exit code
        if result.returncode != 0:
            stderr = result.stderr.decode()
            raise HandlerError(
                f"Script exited with code {result.returncode}",
                details={'stderr': stderr}
            )

        # Parse output
        stdout = result.stdout.decode().strip()
        try:
            return json.loads(stdout)
        except json.JSONDecodeError as e:
            raise HandlerError(
                f"Invalid JSON output: {e}",
                details={'stdout': stdout}
            )

    def _resolve_args(self, args: list, input: Any) -> list:
        """Replace {{placeholders}} in args"""
        import re

        resolved = []
        for arg in args:
            def replace(match):
                path = match.group(1)
                return str(self._get_value_by_path(input, path))

            resolved.append(
                re.sub(r'\{\{([^}]+)\}\}', replace, arg)
            )

        return resolved

    def _get_value_by_path(self, obj: Any, path: str) -> Any:
        """Get value from nested object by dot path"""
        for key in path.split('.'):
            obj = obj.get(key) if isinstance(obj, dict) else None
        return obj or ''

    def _input_to_env(self, input: dict) -> dict:
        """Convert input dict to env vars"""
        return {
            k.upper(): str(v)
            for k, v in input.items()
        }
```

#### 2.1.5 Function Executor

**For direct function calls (TypeScript/Python).**

**TypeScript:**

```typescript
// src/executor/function-executor.ts

export class FunctionExecutor implements Executor {
  private moduleCache = new Map<string, any>();

  canHandle(handler: Handler): boolean {
    return handler.type === 'function';
  }

  async execute(
    handler: FunctionHandler,
    input: any,
    context: ExecutionContext
  ): Promise<any> {
    // 1. Load module (with caching)
    let module = this.moduleCache.get(handler.module);
    if (!module) {
      module = await import(handler.module);
      this.moduleCache.set(handler.module, module);
    }

    // 2. Get function
    const fn = module[handler.function];
    if (typeof fn !== 'function') {
      throw new HandlerError(
        `Function ${handler.function} not found in module`
      );
    }

    // 3. Call function with timeout
    const timeout = context.timeout || 30000;
    const result = await Promise.race([
      fn(input, context),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Function timeout')),
          timeout
        )
      )
    ]);

    return result;
  }

  async dispose(): Promise<void> {
    this.moduleCache.clear();
  }
}
```

**Python:**

```python
# lavs/executor/function.py

import importlib.util
from typing import Any

class FunctionExecutor(Executor):
    def __init__(self):
        self.module_cache = {}

    def can_handle(self, handler: dict) -> bool:
        return handler.get('type') == 'function'

    async def execute(
        self,
        handler: dict,
        input: Any,
        context: ExecutionContext
    ) -> Any:
        # Load module
        module_path = handler['module']
        if module_path not in self.module_cache:
            spec = importlib.util.spec_from_file_location(
                "handler_module",
                module_path
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self.module_cache[module_path] = module
        else:
            module = self.module_cache[module_path]

        # Get function
        fn_name = handler['function']
        fn = getattr(module, fn_name, None)
        if not callable(fn):
            raise HandlerError(f"Function {fn_name} not found")

        # Call function
        import asyncio
        timeout = context.timeout or 30

        try:
            result = await asyncio.wait_for(
                fn(input, context),
                timeout=timeout
            )
            return result
        except asyncio.TimeoutError:
            raise HandlerError(f"Function timeout after {timeout}s")
```

#### 2.1.6 Permission Checker

**Enforce file access and network permissions.**

**TypeScript:**

```typescript
// src/security/permission-checker.ts

export class PermissionChecker {
  constructor(private permissions: Permissions) {}

  checkFileAccess(path: string): boolean {
    if (!this.permissions.fileAccess) {
      return false; // No file access by default
    }

    const patterns = this.permissions.fileAccess;

    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        // Explicit deny
        if (minimatch(path, pattern.slice(1))) {
          return false;
        }
      } else {
        // Allow pattern
        if (minimatch(path, pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  checkNetworkAccess(url: string): boolean {
    const { networkAccess } = this.permissions;

    if (networkAccess === false) {
      return false;
    }

    if (networkAccess === true) {
      return true; // Allow all (not recommended)
    }

    if (Array.isArray(networkAccess)) {
      const hostname = new URL(url).hostname;
      return networkAccess.some(domain =>
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    }

    return false;
  }
}
```

#### 2.1.7 HTTP Server

**Handle JSON-RPC requests over HTTP.**

**TypeScript:**

```typescript
// src/server/http-server.ts

import express from 'express';
import cors from 'cors';

export class HTTPServer {
  private app: express.Application;
  private server?: any;

  constructor(
    private runtime: LAVSRuntime,
    private options: LAVSRuntimeOptions
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(cors(this.options.cors));
  }

  private setupRoutes() {
    // Main endpoint
    this.app.post('/rpc', async (req, res) => {
      try {
        const response = await this.handleRequest(req.body);
        res.json(response);
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: -32603,
            message: error.message
          }
        });
      }
    });

    // Manifest endpoint
    this.app.get('/manifest', (req, res) => {
      res.json(this.runtime.getManifest());
    });
  }

  private async handleRequest(request: any) {
    // Validate JSON-RPC format
    if (request.jsonrpc !== '2.0') {
      return this.errorResponse(
        request.id,
        -32600,
        'Invalid request: jsonrpc must be "2.0"'
      );
    }

    const { method, params } = request;

    if (method === 'lavs/call') {
      const { endpoint, input } = params;

      try {
        const result = await this.runtime.call(endpoint, input);
        return {
          jsonrpc: '2.0',
          id: request.id,
          result
        };
      } catch (error) {
        return this.errorResponse(
          request.id,
          error.code || -32603,
          error.message,
          error.data
        );
      }
    }

    return this.errorResponse(
      request.id,
      -32601,
      'Method not found'
    );
  }

  private errorResponse(
    id: any,
    code: number,
    message: string,
    data?: any
  ) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message, data }
    };
  }

  async start(): Promise<void> {
    const { port, host } = this.options;
    return new Promise((resolve) => {
      this.server = this.app.listen(port, host, () => {
        console.log(`LAVS server listening on ${host}:${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
  }
}
```

**Python:**

```python
# lavs/server/http_server.py

from aiohttp import web
import json

class HTTPServer:
    def __init__(self, runtime, options):
        self.runtime = runtime
        self.options = options
        self.app = web.Application()
        self._setup_routes()

    def _setup_routes(self):
        self.app.router.add_post('/rpc', self.handle_rpc)
        self.app.router.add_get('/manifest', self.handle_manifest)

        # CORS middleware
        self.app.middlewares.append(self.cors_middleware)

    async def handle_rpc(self, request):
        try:
            data = await request.json()
            response = await self._handle_request(data)
            return web.json_response(response)
        except Exception as e:
            return web.json_response({
                'jsonrpc': '2.0',
                'id': data.get('id'),
                'error': {
                    'code': -32603,
                    'message': str(e)
                }
            }, status=500)

    async def _handle_request(self, request):
        if request.get('jsonrpc') != '2.0':
            return self._error_response(
                request.get('id'),
                -32600,
                'Invalid request'
            )

        method = request.get('method')
        params = request.get('params', {})

        if method == 'lavs/call':
            endpoint = params['endpoint']
            input_data = params.get('input')

            try:
                result = await self.runtime.call(endpoint, input_data)
                return {
                    'jsonrpc': '2.0',
                    'id': request['id'],
                    'result': result
                }
            except Exception as e:
                return self._error_response(
                    request['id'],
                    getattr(e, 'code', -32603),
                    str(e)
                )

        return self._error_response(
            request.get('id'),
            -32601,
            'Method not found'
        )

    def _error_response(self, id, code, message, data=None):
        return {
            'jsonrpc': '2.0',
            'id': id,
            'error': {
                'code': code,
                'message': message,
                **(data and {'data': data} or {})
            }
        }

    async def handle_manifest(self, request):
        manifest = self.runtime.get_manifest()
        return web.json_response(manifest.dict())

    @web.middleware
    async def cors_middleware(self, request, handler):
        response = await handler(request)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    async def start(self):
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(
            runner,
            self.options.host,
            self.options.port
        )
        await site.start()
        print(f"LAVS server on {self.options.host}:{self.options.port}")

    async def stop(self):
        await self.app.shutdown()
```

#### 2.1.8 WebSocket Server (for Subscriptions)

**Requirements:**

1. Accept WebSocket connections
2. Handle `lavs/subscribe` and `lavs/unsubscribe` messages
3. Start long-running handler for subscriptions
4. Stream handler output to subscribed clients
5. Clean up subscriptions on disconnect

**TypeScript:**

```typescript
// src/server/websocket-server.ts

import WebSocket from 'ws';

export class WebSocketServer {
  private wss?: WebSocket.Server;
  private subscriptions = new Map<string, Subscription>();

  constructor(
    private runtime: LAVSRuntime,
    private httpServer: any
  ) {}

  async start(): Promise<void> {
    this.wss = new WebSocket.Server({ server: this.httpServer });

    this.wss.on('connection', (ws) => {
      ws.on('message', async (data) => {
        try {
          const request = JSON.parse(data.toString());
          const response = await this.handleMessage(ws, request);
          if (response) {
            ws.send(JSON.stringify(response));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32700,
              message: 'Parse error'
            }
          }));
        }
      });

      ws.on('close', () => {
        this.cleanupSubscriptions(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, request: any) {
    const { method, params, id } = request;

    if (method === 'lavs/subscribe') {
      const { endpoint } = params;
      const subscriptionId = this.createSubscription(ws, endpoint);

      return {
        jsonrpc: '2.0',
        id,
        result: { subscriptionId }
      };
    }

    if (method === 'lavs/unsubscribe') {
      const { subscriptionId } = params;
      this.removeSubscription(subscriptionId);

      return {
        jsonrpc: '2.0',
        id,
        result: { success: true }
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    };
  }

  private createSubscription(
    ws: WebSocket,
    endpoint: string
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`;

    // Start subscription handler
    const unsubscribe = this.runtime.subscribe(endpoint, (data) => {
      // Send data to client
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'lavs/data',
        params: {
          subscriptionId,
          data
        }
      }));
    });

    this.subscriptions.set(subscriptionId, {
      ws,
      endpoint,
      unsubscribe
    });

    return subscriptionId;
  }

  private removeSubscription(subscriptionId: string) {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  private cleanupSubscriptions(ws: WebSocket) {
    for (const [id, sub] of this.subscriptions) {
      if (sub.ws === ws) {
        sub.unsubscribe();
        this.subscriptions.delete(id);
      }
    }
  }

  async stop(): Promise<void> {
    // Cleanup all subscriptions
    for (const [id, sub] of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();

    // Close server
    if (this.wss) {
      this.wss.close();
    }
  }
}

interface Subscription {
  ws: WebSocket;
  endpoint: string;
  unsubscribe: () => void;
}
```

### 2.2 Implementation Checklist

**Phase 1: Core Infrastructure (Week 1-2)**
- [ ] Set up project structure (TypeScript + Python)
- [ ] Define TypeScript types / Pydantic models for manifest
- [ ] Implement ManifestLoader with validation
- [ ] Implement basic LAVSRuntime class
- [ ] Unit tests for manifest loading

**Phase 2: Executors (Week 2-3)**
- [ ] Implement ScriptExecutor
- [ ] Implement FunctionExecutor
- [ ] Implement HTTPExecutor
- [ ] Unit tests for each executor
- [ ] Integration tests with sample scripts

**Phase 3: Server (Week 3-4)**
- [ ] Implement HTTP server with JSON-RPC
- [ ] Implement WebSocket server for subscriptions
- [ ] Add CORS support
- [ ] Integration tests for client-server communication

**Phase 4: Security (Week 4-5)**
- [ ] Implement PermissionChecker
- [ ] Add schema validation (JSON Schema)
- [ ] Add timeout enforcement
- [ ] Security audit and penetration testing

**Phase 5: Polish (Week 5-6)**
- [ ] Error handling and logging
- [ ] Performance optimization
- [ ] Documentation and examples
- [ ] CLI tool for running LAVS services

---

## 4. Frontend Client Requirements

### 4.1 LAVSClient Class

**TypeScript SDK for frontend applications.**

```typescript
// @lavs/client/src/client.ts

export interface LAVSClientOptions {
  endpoint: string;              // LAVS server URL
  transport?: 'http' | 'websocket' | 'auto';
  timeout?: number;              // Request timeout (ms)
  reconnect?: boolean;           // Auto-reconnect WebSocket
}

export class LAVSClient {
  private httpTransport: HTTPTransport;
  private wsTransport?: WebSocketTransport;
  private requestId = 0;

  constructor(options: LAVSClientOptions);

  /**
   * Call a query or mutation endpoint
   */
  async call<T = any>(
    endpoint: string,
    input?: any
  ): Promise<T> {
    const request = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'lavs/call',
      params: { endpoint, input }
    };

    const response = await this.httpTransport.send(request);

    if (response.error) {
      throw new LAVSError(
        response.error.code,
        response.error.message,
        response.error.data
      );
    }

    return response.result as T;
  }

  /**
   * Subscribe to a subscription endpoint
   * Returns unsubscribe function
   */
  subscribe(
    endpoint: string,
    callback: (data: any) => void
  ): () => void {
    if (!this.wsTransport) {
      this.wsTransport = new WebSocketTransport(this.options);
    }

    return this.wsTransport.subscribe(endpoint, callback);
  }

  /**
   * Get service manifest
   */
  async getManifest(): Promise<LAVSManifest> {
    const response = await fetch(
      `${this.options.endpoint}/manifest`
    );
    return response.json();
  }

  /**
   * Read file (if permitted by service)
   */
  async readFile(path: string): Promise<string> {
    return this.call('__builtin_readFile', { path });
  }

  /**
   * Close connections
   */
  disconnect(): void {
    this.wsTransport?.close();
  }
}
```

### 4.2 HTTP Transport

```typescript
// @lavs/client/src/transport/http-transport.ts

export class HTTPTransport {
  constructor(private endpoint: string) {}

  async send(request: any): Promise<any> {
    const response = await fetch(`${this.endpoint}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 4.3 WebSocket Transport

```typescript
// @lavs/client/src/transport/websocket-transport.ts

export class WebSocketTransport {
  private ws?: WebSocket;
  private subscriptions = new Map<string, Subscription>();

  constructor(private options: LAVSClientOptions) {
    this.connect();
  }

  private connect() {
    const wsUrl = this.options.endpoint.replace(/^http/, 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.method === 'lavs/data') {
        const { subscriptionId, data } = message.params;
        const sub = this.subscriptions.get(subscriptionId);
        if (sub) {
          sub.callback(data);
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      if (this.options.reconnect) {
        setTimeout(() => this.connect(), 1000);
      }
    };
  }

  subscribe(
    endpoint: string,
    callback: (data: any) => void
  ): () => void {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'lavs/subscribe',
      params: { endpoint }
    };

    // Send subscribe request
    this.ws!.send(JSON.stringify(request));

    // Wait for subscription ID in response
    const listener = (event: MessageEvent) => {
      const response = JSON.parse(event.data);
      if (response.id === request.id) {
        const subscriptionId = response.result.subscriptionId;

        this.subscriptions.set(subscriptionId, {
          endpoint,
          callback
        });

        this.ws!.removeEventListener('message', listener);
      }
    };

    this.ws!.addEventListener('message', listener);

    // Return unsubscribe function
    return () => {
      // Find subscription ID
      for (const [id, sub] of this.subscriptions) {
        if (sub.endpoint === endpoint && sub.callback === callback) {
          this.unsubscribe(id);
          break;
        }
      }
    };
  }

  private unsubscribe(subscriptionId: string) {
    this.ws!.send(JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'lavs/unsubscribe',
      params: { subscriptionId }
    }));

    this.subscriptions.delete(subscriptionId);
  }

  close() {
    this.ws?.close();
  }
}

interface Subscription {
  endpoint: string;
  callback: (data: any) => void;
}
```

### 4.4 Usage Example

```typescript
// Example: Todo app frontend

import { LAVSClient } from '@lavs/client';

const client = new LAVSClient({
  endpoint: 'http://localhost:5555'
});

// Call mutation
const newTodo = await client.call('addTodo', {
  text: 'Buy milk',
  priority: 1
});

// Subscribe to updates
const unsubscribe = client.subscribe('todoUpdates', (data) => {
  console.log('Todo updated:', data);
  // Update UI
});

// Later: unsubscribe
unsubscribe();
```

---

## 5. Testing Requirements

### 5.1 Unit Tests

**Coverage targets: >80%**

**Backend (TypeScript/Python):**

- [ ] ManifestLoader
  - Valid manifest parsing
  - Invalid JSON handling
  - Schema validation errors
  - Path resolution
- [ ] ScriptExecutor
  - Successful execution
  - Timeout handling
  - Error handling (non-zero exit)
  - Input methods (stdin, args, env)
  - Output parsing
- [ ] FunctionExecutor
  - Module loading
  - Function calls
  - Timeout handling
- [ ] PermissionChecker
  - File access patterns
  - Network access rules
- [ ] Schema validation
  - Valid inputs
  - Invalid inputs
  - Type coercion

**Frontend:**

- [ ] LAVSClient
  - HTTP calls
  - WebSocket subscriptions
  - Error handling
  - Reconnection logic

### 5.2 Integration Tests

- [ ] End-to-end request flow
  - HTTP request → Script execution → Response
- [ ] Subscription flow
  - WebSocket connection → Subscribe → Data push → Unsubscribe
- [ ] Permission enforcement
  - Blocked file access
  - Blocked network access
- [ ] Multi-client scenarios
  - Concurrent requests
  - Multiple subscriptions

### 5.3 Example Test Cases

**TypeScript:**

```typescript
// tests/integration/script-executor.test.ts

import { LAVSRuntime } from '../src';

describe('ScriptExecutor', () => {
  let runtime: LAVSRuntime;

  beforeAll(async () => {
    runtime = new LAVSRuntime({
      manifestPath: './tests/fixtures/todo-manifest.json'
    });
    await runtime.start();
  });

  afterAll(async () => {
    await runtime.stop();
  });

  it('should execute script and return result', async () => {
    const result = await runtime.call('listTodos');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should pass input via stdin', async () => {
    const result = await runtime.call('addTodo', {
      text: 'Test todo',
      priority: 1
    });

    expect(result).toMatchObject({
      text: 'Test todo',
      priority: 1,
      done: false
    });
  });

  it('should enforce timeout', async () => {
    await expect(
      runtime.call('slowEndpoint')
    ).rejects.toThrow('timeout');
  });
});
```

### 5.4 Test Fixtures

Create sample LAVS services for testing:

```
tests/fixtures/
├── todo-service/
│   ├── lavs.json
│   ├── scripts/
│   │   └── todo-service.js
│   └── data/
│       └── todos.json
├── notes-service/
│   └── lavs.json
└── invalid-manifests/
    ├── missing-version.json
    ├── invalid-schema.json
    └── bad-handler.json
```

---

## 6. Documentation Requirements

### 6.1 README Files

**For each package:**

- Quick start guide
- Installation instructions
- Basic usage examples
- API reference link

### 6.2 API Documentation

Use JSDoc (TypeScript) and docstrings (Python) for inline documentation.

Generate API docs with:
- TypeScript: **TypeDoc**
- Python: **Sphinx**

### 6.3 Tutorial Documents

Create step-by-step tutorials:

1. **Getting Started**: Build a simple note-taking service
2. **Advanced Topics**: Subscriptions, permissions, MCP integration
3. **Best Practices**: Security, performance, error handling
4. **Migration Guide**: From custom APIs to LAVS

### 6.4 Example Projects

Provide complete example projects:

- **todo-manager**: Full-featured todo app with React frontend
- **note-taker**: Markdown notes with rich editor
- **data-dashboard**: Charts and visualizations
- **code-snippet-manager**: Code storage with syntax highlighting

---

## 7. Deployment and Distribution

### 7.1 NPM Packages

**Backend (TypeScript):**

```json
{
  "name": "@lavs/runtime",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "lavs": "dist/cli.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "ws": "^8.0.0",
    "ajv": "^8.12.0",
    "minimatch": "^9.0.0"
  }
}
```

**Frontend:**

```json
{
  "name": "@lavs/client",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "module": "dist/index.esm.js"
}
```

### 7.2 PyPI Package (Python)

```toml
# pyproject.toml

[project]
name = "lavs"
version = "1.0.0"
description = "LAVS Runtime for Python"
dependencies = [
    "aiohttp>=3.8.0",
    "pydantic>=2.0.0",
    "jsonschema>=4.0.0"
]

[project.scripts]
lavs = "lavs.cli:main"
```

### 7.3 CLI Tool

Provide CLI for running LAVS services:

```bash
# Install
npm install -g @lavs/runtime

# Run service
lavs start ./lavs.json

# Options
lavs start ./lavs.json --port 8000 --host 0.0.0.0
```

### 7.4 Docker Support

```dockerfile
# Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5555

CMD ["lavs", "start", "/app/lavs.json"]
```

---

## 8. Implementation Timeline

### Week 1-2: Foundation
- Set up repositories (TypeScript + Python)
- Define types and interfaces
- Implement manifest loader and validator

### Week 3-4: Core Execution
- Implement all executors (script, function, HTTP, MCP)
- Add permission enforcement
- Unit tests for executors

### Week 5-6: Server Layer
- HTTP server with JSON-RPC
- WebSocket server for subscriptions
- Integration tests

### Week 7-8: Frontend SDK
- Implement LAVSClient
- HTTP and WebSocket transports
- Example view components

### Week 9-10: Testing & Documentation
- Comprehensive test suite
- API documentation
- Tutorial and examples

### Week 11-12: Polish & Release
- Performance optimization
- Security audit
- Beta release and community feedback

---

## 9. Success Metrics

### Technical Metrics
- [ ] Test coverage > 80%
- [ ] API documentation complete
- [ ] All spec requirements implemented
- [ ] Security audit passed

### Community Metrics
- [ ] 3+ example projects published
- [ ] Tutorial documentation complete
- [ ] Early adopter feedback incorporated
- [ ] 50+ GitHub stars in first month

### Performance Metrics
- [ ] HTTP request latency < 50ms (local)
- [ ] Subscription latency < 100ms
- [ ] Supports 100+ concurrent requests
- [ ] Memory usage < 100MB for typical service

---

## Appendix A: Technology Stack

### Backend (TypeScript)
- **Runtime**: Node.js 18+
- **HTTP Server**: Express.js
- **WebSocket**: ws
- **Validation**: Ajv (JSON Schema)
- **Testing**: Vitest
- **Build**: tsup

### Backend (Python)
- **Runtime**: Python 3.10+
- **HTTP Server**: aiohttp
- **Validation**: jsonschema + Pydantic
- **Testing**: pytest
- **Build**: setuptools

### Frontend (TypeScript)
- **Build**: Vite
- **Testing**: Vitest + jsdom
- **Bundle**: ESM + CommonJS

---

## Appendix B: Reference Links

- LAVS Specification: [LAVS-SPEC.md](./LAVS-SPEC.md)
- JSON-RPC 2.0: https://www.jsonrpc.org/specification
- JSON Schema: https://json-schema.org/
- Model Context Protocol: https://modelcontextprotocol.io/

---

## License

Apache 2.0

Copyright 2025 AgentStudio Team
