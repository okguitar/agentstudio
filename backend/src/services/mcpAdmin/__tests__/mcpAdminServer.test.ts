/**
 * MCP Admin Server Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  McpAdminServer,
  getMcpAdminServer,
  resetMcpAdminServer,
} from '../mcpAdminServer.js';
import type {
  JsonRpcRequest,
  ToolDefinition,
  McpToolCallResult,
  ToolContext,
} from '../types.js';

describe('McpAdminServer', () => {
  let server: McpAdminServer;

  beforeEach(() => {
    resetMcpAdminServer();
    server = new McpAdminServer();
  });

  afterEach(() => {
    resetMcpAdminServer();
  });

  describe('initialization', () => {
    it('should start uninitialized', () => {
      expect(server.isInitialized()).toBe(false);
    });

    it('should handle initialize request', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('protocolVersion');
      expect(response.result).toHaveProperty('serverInfo');
      expect(server.isInitialized()).toBe(true);
    });

    it('should handle initialized notification', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: null,
        method: 'initialized',
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeUndefined();
    });
  });

  describe('tool registration', () => {
    it('should register tools', () => {
      const toolDef: ToolDefinition = {
        tool: {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        handler: async () => ({
          content: [{ type: 'text', text: 'test' }],
        }),
        requiredPermissions: ['admin:*'],
      };

      server.registerTool(toolDef);
      expect(server.getToolCount()).toBe(1);
    });

    it('should register multiple tools', () => {
      const tools: ToolDefinition[] = [
        {
          tool: {
            name: 'tool1',
            description: 'Tool 1',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
          requiredPermissions: ['admin:*'],
        },
        {
          tool: {
            name: 'tool2',
            description: 'Tool 2',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
          requiredPermissions: ['admin:*'],
        },
      ];

      server.registerTools(tools);
      expect(server.getToolCount()).toBe(2);
    });
  });

  describe('tools/list', () => {
    beforeEach(() => {
      const tools: ToolDefinition[] = [
        {
          tool: {
            name: 'public_tool',
            description: 'Public tool',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
          requiredPermissions: ['system:read'],
        },
        {
          tool: {
            name: 'admin_tool',
            description: 'Admin tool',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'test' }] }),
          requiredPermissions: ['admin:*'],
        },
      ];
      server.registerTools(tools);
    });

    it('should list tools based on permissions', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      // User with only system:read permission
      const limitedContext: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['system:read'],
      };

      const response = await server.handleRequest(request, limitedContext);

      expect(response.error).toBeUndefined();
      const result = response.result as { tools: Array<{ name: string }> };
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('public_tool');
    });

    it('should list all tools for admin', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      const adminContext: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, adminContext);

      expect(response.error).toBeUndefined();
      const result = response.result as { tools: Array<{ name: string }> };
      expect(result.tools).toHaveLength(2);
    });
  });

  describe('tools/call', () => {
    beforeEach(() => {
      const tool: ToolDefinition = {
        tool: {
          name: 'echo',
          description: 'Echo tool',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
        },
        handler: async (params): Promise<McpToolCallResult> => ({
          content: [{ type: 'text', text: `Echo: ${params.message}` }],
        }),
        requiredPermissions: ['system:read'],
      };
      server.registerTool(tool);
    });

    it('should call a tool successfully', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'Hello, World!' },
        },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['system:read'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeUndefined();
      const result = response.result as McpToolCallResult;
      expect(result.content[0].text).toBe('Echo: Hello, World!');
    });

    it('should return error for missing tool name', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {},
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602); // Invalid params
    });

    it('should return error for non-existent tool', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'non_existent',
        },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601); // Method not found
    });

    it('should deny access for insufficient permissions', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'echo',
        },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['projects:read'], // Different permission
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32001); // Permission denied
    });
  });

  describe('error handling', () => {
    it('should return error for invalid JSON-RPC version', async () => {
      const request = {
        jsonrpc: '1.0', // Invalid
        id: 1,
        method: 'ping',
      } as unknown as JsonRpcRequest;

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32600); // Invalid request
    });

    it('should return error for unknown method', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'unknown_method',
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601); // Method not found
    });

    it('should handle tool execution errors gracefully', async () => {
      const tool: ToolDefinition = {
        tool: {
          name: 'failing_tool',
          description: 'A tool that throws',
          inputSchema: { type: 'object', properties: {} },
        },
        handler: async () => {
          throw new Error('Tool execution failed');
        },
        requiredPermissions: ['admin:*'],
      };
      server.registerTool(tool);

      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'failing_tool' },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      // Tool errors are returned as successful response with isError flag
      expect(response.error).toBeUndefined();
      const result = response.result as McpToolCallResult;
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Tool execution failed');
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getMcpAdminServer();
      const instance2 = getMcpAdminServer();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getMcpAdminServer();
      instance1.registerTool({
        tool: { name: 'test', description: 'test', inputSchema: { type: 'object', properties: {} } },
        handler: async () => ({ content: [] }),
        requiredPermissions: ['admin:*'],
      });

      resetMcpAdminServer();

      const instance2 = getMcpAdminServer();
      expect(instance2.getToolCount()).toBe(0);
    });
  });

  describe('allowedTools filtering', () => {
    beforeEach(() => {
      const tools: ToolDefinition[] = [
        {
          tool: {
            name: 'list_projects',
            description: 'List projects',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'projects list' }] }),
          requiredPermissions: ['projects:read'],
        },
        {
          tool: {
            name: 'get_project',
            description: 'Get project',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'project details' }] }),
          requiredPermissions: ['projects:read'],
        },
        {
          tool: {
            name: 'list_agents',
            description: 'List agents',
            inputSchema: { type: 'object', properties: {} },
          },
          handler: async () => ({ content: [{ type: 'text', text: 'agents list' }] }),
          requiredPermissions: ['agents:read'],
        },
      ];
      server.registerTools(tools);
    });

    it('should list only allowed tools when allowedTools is specified', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
        allowedTools: ['list_projects', 'get_project'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeUndefined();
      const result = response.result as { tools: Array<{ name: string }> };
      expect(result.tools).toHaveLength(2);
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_projects');
      expect(toolNames).toContain('get_project');
      expect(toolNames).not.toContain('list_agents');
    });

    it('should list all tools for admin:* when allowedTools is not specified', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeUndefined();
      const result = response.result as { tools: Array<{ name: string }> };
      expect(result.tools).toHaveLength(3);
    });

    it('should deny tool call when tool is not in allowedTools', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_agents',
        },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
        allowedTools: ['list_projects', 'get_project'], // list_agents not included
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32002); // Tool not allowed
    });

    it('should allow tool call when tool is in allowedTools', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_projects',
        },
      };

      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['admin:*'],
        allowedTools: ['list_projects', 'get_project'],
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeUndefined();
      const result = response.result as McpToolCallResult;
      expect(result.content[0].text).toBe('projects list');
    });

    it('should require both permission and allowedTools for tool call', async () => {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_projects',
        },
      };

      // Has permission but tool not in allowedTools
      const context: ToolContext = {
        apiKeyId: 'test-key',
        permissions: ['projects:read'],
        allowedTools: ['list_agents'], // list_projects not included
      };

      const response = await server.handleRequest(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32002); // Tool not allowed
    });
  });
});
