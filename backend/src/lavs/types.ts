/**
 * LAVS (Local Agent View Service) Type Definitions
 *
 * This file defines the TypeScript types for LAVS manifests and related interfaces.
 * See docs/LAVS-SPEC.md for full specification.
 */

/**
 * LAVS Manifest - defines agent's data interface and view configuration
 */
export interface LAVSManifest {
  lavs: string;                     // Protocol version (e.g., "1.0")
  name: string;                     // Service name
  version: string;                  // Service version (semver)
  description?: string;             // Human-readable description

  endpoints: Endpoint[];            // Exposed operations
  view?: ViewConfig;                // Optional UI component
  types?: TypeDefinitions;          // Type definitions (JSON Schema)
  permissions?: Permissions;        // Security constraints
}

/**
 * Endpoint - a callable operation exposed by the service
 */
export interface Endpoint {
  id: string;                       // Unique endpoint identifier
  method: 'query' | 'mutation' | 'subscription';
  description?: string;             // Human-readable description

  handler: Handler;                 // How to execute this endpoint
  schema?: Schema;                  // Input/output schema
  permissions?: Permissions;        // Endpoint-specific permissions
}

/**
 * Handler - defines how to execute an endpoint
 */
export type Handler = ScriptHandler | FunctionHandler | HTTPHandler | MCPHandler;

/**
 * Script Handler - executes a script/command
 */
export interface ScriptHandler {
  type: 'script';
  command: string;                  // Command to execute (e.g., "node", "python3")
  args?: string[];                  // Static arguments
  input?: 'args' | 'stdin' | 'env'; // How to pass input parameters
  cwd?: string;                     // Working directory
  timeout?: number;                 // Max execution time (ms)
  env?: Record<string, string>;     // Environment variables
}

/**
 * Function Handler - calls a JavaScript/TypeScript function
 */
export interface FunctionHandler {
  type: 'function';
  module: string;                   // Path to JS/TS module
  function: string;                 // Function name to call
}

/**
 * HTTP Handler - proxies to HTTP endpoint
 */
export interface HTTPHandler {
  type: 'http';
  url: string;                      // HTTP endpoint
  method: string;                   // HTTP method
  headers?: Record<string, string>; // HTTP headers
}

/**
 * MCP Handler - bridges to MCP server tool
 */
export interface MCPHandler {
  type: 'mcp';
  server: string;                   // MCP server name
  tool: string;                     // MCP tool name
}

/**
 * Schema - JSON Schema for input/output validation
 */
export interface Schema {
  input?: JSONSchema;               // Input parameters schema
  output?: JSONSchema;              // Output data schema
}

/**
 * JSON Schema type (simplified)
 */
export type JSONSchema = Record<string, any>;

/**
 * Type Definitions - reusable type schemas
 */
export type TypeDefinitions = Record<string, JSONSchema>;

/**
 * View Configuration - UI component definition
 */
export interface ViewConfig {
  component: ComponentSource;
  fallback?: 'list' | 'table' | 'json'; // Fallback display mode
  icon?: string;                    // Icon identifier
  theme?: Record<string, string>;   // Theme variables
}

/**
 * Component Source - how to load the view component
 */
export type ComponentSource =
  | { type: 'cdn'; url: string; exportName?: string }
  | { type: 'npm'; package: string; version?: string }
  | { type: 'local'; path: string }
  | { type: 'inline'; code: string };

/**
 * Permissions - security constraints
 */
export interface Permissions {
  fileAccess?: string[];            // Allowed file path patterns (glob)
  networkAccess?: boolean | string[]; // Network access control
  maxExecutionTime?: number;        // Max handler execution time (ms)
  maxMemory?: number;               // Max memory usage (bytes)
}

/**
 * Execution Context - runtime context for handler execution
 */
export interface ExecutionContext {
  endpointId: string;               // Endpoint being executed
  agentId: string;                  // Agent ID (for file access)
  workdir: string;                  // Working directory
  permissions: Permissions;         // Permissions to enforce
  timeout?: number;                 // Timeout override
  env?: Record<string, string>;     // Additional env vars
}

/**
 * LAVS Error - standard error format
 */
export class LAVSError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'LAVSError';
  }
}

/**
 * LAVS Error Codes (JSON-RPC 2.0 compatible)
 */
export enum LAVSErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  PermissionDenied = -32001,
  Timeout = -32002,
  HandlerError = -32003,
}
