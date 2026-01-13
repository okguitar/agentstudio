/**
 * MCP Server Management Tools
 *
 * MCP tools for managing external MCP servers connected to AgentStudio.
 */

import type { ToolDefinition, McpToolCallResult } from '../types.js';
import { readMcpConfig, writeMcpConfig } from '../../../routes/mcp.js';

/**
 * List all configured MCP servers
 */
export const listMcpServersTool: ToolDefinition = {
  tool: {
    name: 'list_mcp_servers',
    description: 'List all configured MCP servers',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: "active", "error", "unknown", or "all" (default: all)',
        },
      },
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const status = (params.status as string) || 'all';
      const config = readMcpConfig();

      let servers = Object.entries(config.mcpServers || {}).map(([name, serverConfig]: [string, any]) => ({
        name,
        type: serverConfig.url ? 'http' : 'stdio',
        url: serverConfig.url,
        command: serverConfig.command,
        status: serverConfig.status || 'unknown',
        tools: serverConfig.tools || [],
        error: serverConfig.error,
        lastValidated: serverConfig.lastValidated,
      }));

      // Filter by status
      if (status !== 'all') {
        servers = servers.filter((s) => s.status === status);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                servers,
                total: servers.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing MCP servers: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['mcp:read'],
};

/**
 * Get MCP server details
 */
export const getMcpServerTool: ToolDefinition = {
  tool: {
    name: 'get_mcp_server',
    description: 'Get detailed information about a specific MCP server',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'MCP server name',
        },
      },
      required: ['name'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const serverName = params.name as string;

      if (!serverName) {
        return {
          content: [{ type: 'text', text: 'Server name is required' }],
          isError: true,
        };
      }

      const config = readMcpConfig();
      const serverConfig = config.mcpServers?.[serverName];

      if (!serverConfig) {
        return {
          content: [{ type: 'text', text: `MCP server not found: ${serverName}` }],
          isError: true,
        };
      }

      const serverInfo = {
        name: serverName,
        type: serverConfig.url ? 'http' : 'stdio',
        url: serverConfig.url,
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env ? Object.keys(serverConfig.env) : [], // Only show env var names
        headers: serverConfig.headers ? Object.keys(serverConfig.headers) : [],
        status: serverConfig.status || 'unknown',
        tools: serverConfig.tools || [],
        error: serverConfig.error,
        lastValidated: serverConfig.lastValidated,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(serverInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting MCP server: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['mcp:read'],
};

/**
 * Add a new MCP server
 */
export const addMcpServerTool: ToolDefinition = {
  tool: {
    name: 'add_mcp_server',
    description: 'Add a new MCP server configuration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique name for the MCP server',
        },
        type: {
          type: 'string',
          description: 'Server type: "http" or "stdio"',
        },
        url: {
          type: 'string',
          description: 'URL for HTTP MCP servers',
        },
        command: {
          type: 'string',
          description: 'Command for stdio MCP servers',
        },
        args: {
          type: 'array',
          description: 'Command arguments for stdio servers',
        },
      },
      required: ['name', 'type'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const name = params.name as string;
      const type = params.type as string;
      const url = params.url as string | undefined;
      const command = params.command as string | undefined;
      const args = params.args as string[] | undefined;

      if (!name) {
        return {
          content: [{ type: 'text', text: 'Server name is required' }],
          isError: true,
        };
      }

      if (type !== 'http' && type !== 'stdio') {
        return {
          content: [{ type: 'text', text: 'Type must be "http" or "stdio"' }],
          isError: true,
        };
      }

      if (type === 'http' && !url) {
        return {
          content: [{ type: 'text', text: 'URL is required for HTTP servers' }],
          isError: true,
        };
      }

      if (type === 'stdio' && !command) {
        return {
          content: [{ type: 'text', text: 'Command is required for stdio servers' }],
          isError: true,
        };
      }

      const config = readMcpConfig();

      if (config.mcpServers?.[name]) {
        return {
          content: [{ type: 'text', text: `Server already exists: ${name}` }],
          isError: true,
        };
      }

      // Create server config
      const serverConfig: Record<string, unknown> = {
        status: 'unknown',
      };

      if (type === 'http') {
        serverConfig.url = url;
      } else {
        serverConfig.command = command;
        if (args) {
          serverConfig.args = args;
        }
      }

      // Add to config
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      config.mcpServers[name] = serverConfig;

      writeMcpConfig(config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                server: {
                  name,
                  type,
                  ...serverConfig,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error adding MCP server: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['mcp:write'],
};

/**
 * Remove an MCP server
 */
export const removeMcpServerTool: ToolDefinition = {
  tool: {
    name: 'remove_mcp_server',
    description: 'Remove an MCP server configuration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the MCP server to remove',
        },
      },
      required: ['name'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const name = params.name as string;

      if (!name) {
        return {
          content: [{ type: 'text', text: 'Server name is required' }],
          isError: true,
        };
      }

      const config = readMcpConfig();

      if (!config.mcpServers?.[name]) {
        return {
          content: [{ type: 'text', text: `Server not found: ${name}` }],
          isError: true,
        };
      }

      delete config.mcpServers[name];
      writeMcpConfig(config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Server removed: ${name}`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error removing MCP server: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['mcp:write'],
};

/**
 * All MCP server tools
 */
export const mcpServerTools: ToolDefinition[] = [
  listMcpServersTool,
  getMcpServerTool,
  addMcpServerTool,
  removeMcpServerTool,
];
