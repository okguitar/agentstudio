/**
 * Agent Management Tools
 *
 * MCP tools for managing AI agents in AgentStudio.
 */

import type { ToolDefinition, McpToolCallResult } from '../types.js';
import { AgentStorage } from '../../agentStorage.js';

const agentStorage = new AgentStorage();

/**
 * List all agents
 */
export const listAgentsTool: ToolDefinition = {
  tool: {
    name: 'list_agents',
    description: 'List all registered agents in AgentStudio',
    inputSchema: {
      type: 'object',
      properties: {
        includeDisabled: {
          type: 'boolean',
          description: 'Include disabled agents (default: false)',
        },
        source: {
          type: 'string',
          description: 'Filter by source: "local", "plugin", or "all" (default: all)',
        },
      },
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const includeDisabled = (params.includeDisabled as boolean) ?? false;
      const source = (params.source as string) || 'all';

      let agents = agentStorage.getAllAgents();

      // Filter by enabled status
      if (!includeDisabled) {
        agents = agents.filter((a) => a.enabled !== false);
      }

      // Filter by source
      if (source !== 'all') {
        agents = agents.filter((a) => a.source === source);
      }

      const agentList = agents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        enabled: a.enabled !== false,
        source: a.source,
        version: a.version,
        // Note: model field removed - model is now determined by project/provider configuration
        tags: a.tags,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                agents: agentList,
                total: agentList.length,
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
            text: `Error listing agents: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['agents:read'],
};

/**
 * Get agent details
 */
export const getAgentTool: ToolDefinition = {
  tool: {
    name: 'get_agent',
    description: 'Get detailed information about a specific agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
      },
      required: ['agentId'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const agentId = params.agentId as string;

      if (!agentId) {
        return {
          content: [{ type: 'text', text: 'Agent ID is required' }],
          isError: true,
        };
      }

      const agent = agentStorage.getAgent(agentId);

      if (!agent) {
        return {
          content: [{ type: 'text', text: `Agent not found: ${agentId}` }],
          isError: true,
        };
      }

      // Return full agent config (excluding sensitive data)
      // Note: model field removed - model is now determined by project/provider configuration
      const agentInfo = {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        enabled: agent.enabled !== false,
        source: agent.source,
        version: agent.version,
        maxTurns: agent.maxTurns,
        permissionMode: agent.permissionMode,
        tags: agent.tags,
        author: agent.author,
        allowedTools: agent.allowedTools?.map((t) => ({
          name: t.name,
          enabled: t.enabled,
        })),
        ui: agent.ui,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(agentInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting agent: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['agents:read'],
};

/**
 * Update agent settings
 */
export const updateAgentTool: ToolDefinition = {
  tool: {
    name: 'update_agent',
    description: 'Update agent settings (enabled status, maxTurns, etc.). Note: model is determined by project/provider config, not agent config.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        enabled: {
          type: 'boolean',
          description: 'Enable or disable the agent',
        },
        maxTurns: {
          type: 'number',
          description: 'Maximum conversation turns',
        },
        description: {
          type: 'string',
          description: 'Agent description',
        },
      },
      required: ['agentId'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const agentId = params.agentId as string;

      if (!agentId) {
        return {
          content: [{ type: 'text', text: 'Agent ID is required' }],
          isError: true,
        };
      }

      const agent = agentStorage.getAgent(agentId);

      if (!agent) {
        return {
          content: [{ type: 'text', text: `Agent not found: ${agentId}` }],
          isError: true,
        };
      }

      // Build update object
      // Note: model field removed - model is now determined by project/provider configuration
      const updates: Record<string, unknown> = {};

      if (params.enabled !== undefined) {
        updates.enabled = params.enabled;
      }
      if (params.maxTurns !== undefined) {
        updates.maxTurns = params.maxTurns;
      }
      if (params.description !== undefined) {
        updates.description = params.description;
      }

      // Update the agent
      const updatedAgent = {
        ...agent,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      agentStorage.saveAgent(updatedAgent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                agent: {
                  id: updatedAgent.id,
                  name: updatedAgent.name,
                  enabled: updatedAgent.enabled,
                  updatedAt: updatedAgent.updatedAt,
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
            text: `Error updating agent: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['agents:write'],
};

/**
 * Toggle agent tool
 */
export const toggleAgentToolTool: ToolDefinition = {
  tool: {
    name: 'toggle_agent_tool',
    description: 'Enable or disable a specific tool for an agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        toolName: {
          type: 'string',
          description: 'Name of the tool to toggle',
        },
        enabled: {
          type: 'boolean',
          description: 'Enable or disable the tool',
        },
      },
      required: ['agentId', 'toolName', 'enabled'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const agentId = params.agentId as string;
      const toolName = params.toolName as string;
      const enabled = params.enabled as boolean;

      if (!agentId || !toolName || enabled === undefined) {
        return {
          content: [{ type: 'text', text: 'agentId, toolName, and enabled are required' }],
          isError: true,
        };
      }

      const agent = agentStorage.getAgent(agentId);

      if (!agent) {
        return {
          content: [{ type: 'text', text: `Agent not found: ${agentId}` }],
          isError: true,
        };
      }

      // Find and update the tool
      const tool = agent.allowedTools?.find((t) => t.name === toolName);

      if (!tool) {
        return {
          content: [{ type: 'text', text: `Tool not found: ${toolName}` }],
          isError: true,
        };
      }

      tool.enabled = enabled;
      agent.updatedAt = new Date().toISOString();

      agentStorage.saveAgent(agent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                tool: {
                  name: toolName,
                  enabled,
                },
                agent: {
                  id: agent.id,
                  updatedAt: agent.updatedAt,
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
            text: `Error toggling tool: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['agents:write'],
};

/**
 * All agent tools
 */
export const agentTools: ToolDefinition[] = [
  listAgentsTool,
  getAgentTool,
  updateAgentTool,
  toggleAgentToolTool,
];
