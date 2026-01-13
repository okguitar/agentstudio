/**
 * MCP Admin Server Types
 *
 * Type definitions for the MCP Admin Server that provides
 * management APIs via MCP HTTP Streamable protocol.
 */

// =============================================================================
// JSON-RPC 2.0 Types
// =============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard JSON-RPC error codes
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' },
} as const;

// =============================================================================
// MCP Protocol Types
// =============================================================================

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpCapabilities {
  tools?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  prompts?: Record<string, unknown>;
}

export interface McpInitializeParams {
  protocolVersion: string;
  capabilities: McpCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolsListResult {
  tools: McpTool[];
}

export interface McpToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// =============================================================================
// Admin API Key Types
// =============================================================================

export interface AdminApiKey {
  id: string;
  keyHash: string;
  encryptedKey: string;
  description: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  permissions: AdminPermission[];
  /** Optional list of allowed tool names. If undefined or empty, all tools are allowed (based on permissions). */
  allowedTools?: string[];
  /** Whether the key is enabled. Defaults to true if not specified. */
  enabled?: boolean;
}

export interface AdminApiKeyRegistry {
  version: '1.0.0';
  keys: AdminApiKey[];
}

export type AdminPermission =
  | 'projects:read'
  | 'projects:write'
  | 'agents:read'
  | 'agents:write'
  | 'mcp:read'
  | 'mcp:write'
  | 'system:read'
  | 'system:write'
  | 'admin:*';

// =============================================================================
// Tool Handler Types
// =============================================================================

export interface ToolContext {
  apiKeyId: string;
  permissions: AdminPermission[];
  /** Optional list of allowed tool names. If undefined, all tools are allowed (based on permissions). */
  allowedTools?: string[];
}

export type ToolHandler = (
  params: Record<string, unknown>,
  context: ToolContext
) => Promise<McpToolCallResult>;

export interface ToolDefinition {
  tool: McpTool;
  handler: ToolHandler;
  requiredPermissions: AdminPermission[];
}
