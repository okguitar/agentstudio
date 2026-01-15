/**
 * LAVS Client Types
 *
 * Frontend type definitions for LAVS (Local Agent View Service)
 */

/**
 * LAVS Manifest - describes the agent's data interface
 */
export interface LAVSManifest {
  lavs: string;
  name: string;
  version: string;
  description?: string;
  endpoints: Endpoint[];
  view?: ViewConfig;
  types?: Record<string, any>;
  permissions?: Permissions;
}

/**
 * Endpoint definition
 */
export interface Endpoint {
  id: string;
  method: 'query' | 'mutation' | 'subscription';
  description?: string;
  handler: Handler;
  schema?: Schema;
  permissions?: Permissions;
}

/**
 * Handler types
 */
export type Handler = ScriptHandler | FunctionHandler | HTTPHandler | MCPHandler;

export interface ScriptHandler {
  type: 'script';
  command: string;
  args?: string[];
  input?: 'args' | 'stdin' | 'env';
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface FunctionHandler {
  type: 'function';
  module: string;
  function: string;
}

export interface HTTPHandler {
  type: 'http';
  url: string;
  method: string;
  headers?: Record<string, string>;
}

export interface MCPHandler {
  type: 'mcp';
  server: string;
  tool: string;
}

/**
 * Schema definition (JSON Schema)
 */
export interface Schema {
  input?: any;
  output?: any;
}

/**
 * View configuration
 */
export interface ViewConfig {
  component: ComponentSource;
  fallback?: 'list' | 'table' | 'json';
  icon?: string;
  theme?: Record<string, string>;
}

export type ComponentSource =
  | { type: 'cdn'; url: string; exportName?: string }
  | { type: 'npm'; package: string; version?: string }
  | { type: 'local'; path: string }
  | { type: 'inline'; code: string };

/**
 * Permissions
 */
export interface Permissions {
  fileAccess?: string[];
  networkAccess?: boolean | string[];
  maxExecutionTime?: number;
  maxMemory?: number;
}

/**
 * LAVS Error
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
