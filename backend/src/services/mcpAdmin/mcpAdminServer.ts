/**
 * MCP Admin Server
 *
 * Core MCP Server implementation for management APIs.
 * Handles JSON-RPC 2.0 requests and dispatches to registered tools.
 *
 * Supports pure JSON responses (no SSE streaming) for stateless operation.
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  McpInitializeParams,
  McpInitializeResult,
  McpToolsListResult,
  McpToolCallParams,
  McpToolCallResult,
  ToolDefinition,
  ToolContext,
  AdminPermission,
} from './types.js';
import { JSON_RPC_ERRORS } from './types.js';
import { hasPermission } from './adminApiKeyService.js';

// MCP Protocol version
const PROTOCOL_VERSION = '2024-11-05';

// Server info
const SERVER_INFO = {
  name: 'agentstudio-admin',
  version: '1.0.0',
};

/**
 * MCP Admin Server class
 *
 * Manages tool registration and handles MCP JSON-RPC requests.
 */
export class McpAdminServer {
  private tools: Map<string, ToolDefinition> = new Map();
  private initialized: boolean = false;

  constructor() {
    // Server starts uninitialized
  }

  /**
   * Register a tool with the server
   */
  registerTool(definition: ToolDefinition): void {
    this.tools.set(definition.tool.name, definition);
  }

  /**
   * Register multiple tools at once
   */
  registerTools(definitions: ToolDefinition[]): void {
    for (const def of definitions) {
      this.registerTool(def);
    }
  }

  /**
   * Get all registered tools (filtered by permissions and allowedTools)
   */
  getTools(permissions: AdminPermission[], allowedTools?: string[]): McpToolsListResult {
    const visibleTools = [];

    for (const [, def] of this.tools) {
      // Check if user has any of the required permissions
      const hasAccess = def.requiredPermissions.some((perm) =>
        hasPermission(permissions, perm)
      );

      if (!hasAccess) {
        continue;
      }

      // If allowedTools is specified, filter by it
      if (allowedTools && allowedTools.length > 0) {
        if (!allowedTools.includes(def.tool.name)) {
          continue;
        }
      }

      visibleTools.push(def.tool);
    }

    return { tools: visibleTools };
  }

  /**
   * Handle a JSON-RPC request
   */
  async handleRequest(
    request: JsonRpcRequest,
    context: ToolContext
  ): Promise<JsonRpcResponse> {
    try {
      // Validate JSON-RPC structure
      if (request.jsonrpc !== '2.0') {
        return this.errorResponse(request.id, JSON_RPC_ERRORS.INVALID_REQUEST);
      }

      // Route by method
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);

        case 'initialized':
          // Client notification that initialization is complete
          return this.successResponse(request.id, {});

        case 'tools/list':
          return this.handleToolsList(request, context);

        case 'tools/call':
          return this.handleToolCall(request, context);

        case 'ping':
          return this.successResponse(request.id, {});

        default:
          return this.errorResponse(request.id, JSON_RPC_ERRORS.METHOD_NOT_FOUND);
      }
    } catch (error) {
      console.error('[MCP Admin] Request handling error:', error);
      return this.errorResponse(request.id, {
        ...JSON_RPC_ERRORS.INTERNAL_ERROR,
        data: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    const params = request.params as McpInitializeParams | undefined;

    console.info('[MCP Admin] Initialize request from:', params?.clientInfo?.name);

    const result: McpInitializeResult = {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      serverInfo: SERVER_INFO,
    };

    this.initialized = true;

    return this.successResponse(request.id, result);
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(
    request: JsonRpcRequest,
    context: ToolContext
  ): JsonRpcResponse {
    const toolsList = this.getTools(context.permissions, context.allowedTools);

    console.info(
      '[MCP Admin] Tools list request, returning',
      toolsList.tools.length,
      'tools',
      context.allowedTools ? `(filtered by ${context.allowedTools.length} allowed tools)` : ''
    );

    return this.successResponse(request.id, toolsList);
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(
    request: JsonRpcRequest,
    context: ToolContext
  ): Promise<JsonRpcResponse> {
    const params = request.params as McpToolCallParams | undefined;

    if (!params?.name) {
      return this.errorResponse(request.id, {
        ...JSON_RPC_ERRORS.INVALID_PARAMS,
        data: 'Tool name is required',
      });
    }

    const toolDef = this.tools.get(params.name);

    if (!toolDef) {
      return this.errorResponse(request.id, {
        ...JSON_RPC_ERRORS.METHOD_NOT_FOUND,
        data: `Tool not found: ${params.name}`,
      });
    }

    // Check permissions
    const hasAccess = toolDef.requiredPermissions.some((perm) =>
      hasPermission(context.permissions, perm)
    );

    if (!hasAccess) {
      return this.errorResponse(request.id, {
        code: -32001,
        message: 'Permission denied',
        data: `Insufficient permissions for tool: ${params.name}`,
      });
    }

    // Check allowedTools filter
    if (context.allowedTools && context.allowedTools.length > 0) {
      if (!context.allowedTools.includes(params.name)) {
        return this.errorResponse(request.id, {
          code: -32002,
          message: 'Tool not allowed',
          data: `This API key does not have access to tool: ${params.name}`,
        });
      }
    }

    console.info('[MCP Admin] Tool call:', params.name);

    try {
      const result = await toolDef.handler(params.arguments || {}, context);
      return this.successResponse(request.id, result);
    } catch (error) {
      console.error('[MCP Admin] Tool execution error:', error);

      const errorResult: McpToolCallResult = {
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };

      return this.successResponse(request.id, errorResult);
    }
  }

  /**
   * Create a success response
   */
  private successResponse(
    id: string | number | null,
    result: unknown
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Create an error response
   */
  private errorResponse(
    id: string | number | null,
    error: JsonRpcError
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error,
    };
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset server state (for testing)
   */
  reset(): void {
    this.initialized = false;
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }
}

// Singleton instance
let serverInstance: McpAdminServer | null = null;

/**
 * Get the MCP Admin Server singleton instance
 */
export function getMcpAdminServer(): McpAdminServer {
  if (!serverInstance) {
    serverInstance = new McpAdminServer();
  }
  return serverInstance;
}

/**
 * Reset the server instance (for testing)
 */
export function resetMcpAdminServer(): void {
  if (serverInstance) {
    serverInstance.reset();
  }
  serverInstance = null;
}
