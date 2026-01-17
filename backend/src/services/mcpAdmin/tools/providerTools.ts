/**
 * Model Provider Management Tools
 *
 * MCP tools for managing model providers (Claude Versions) in AgentStudio.
 * These tools allow external agents to query and configure model providers.
 */

import type { ToolDefinition, McpToolCallResult } from '../types.js';
import {
  getAllVersions,
  createVersion,
  updateVersion,
  deleteVersion,
  getDefaultVersionId,
  setDefaultVersion,
  loadClaudeVersions,
} from '../../claudeVersionStorage.js';
import type { ClaudeVersionCreate, ClaudeVersionUpdate } from '../../../types/claude-versions.js';

/**
 * List all model providers
 */
export const listProvidersTool: ToolDefinition = {
  tool: {
    name: 'list_providers',
    description: 'List all model providers (Claude Versions) in AgentStudio',
    inputSchema: {
      type: 'object',
      properties: {
        includeSystem: {
          type: 'boolean',
          description: 'Include system provider (default: true)',
        },
      },
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const includeSystem = (params.includeSystem as boolean) ?? true;
      
      let providers = await getAllVersions();
      
      // Filter out system provider if requested
      if (!includeSystem) {
        providers = providers.filter((p) => !p.isSystem);
      }
      
      // Get default provider ID
      const defaultId = await getDefaultVersionId();
      
      const providerList = providers.map((p) => ({
        id: p.id,
        name: p.name,
        alias: p.alias,
        description: p.description,
        isSystem: p.isSystem,
        isDefault: p.id === defaultId,
        models: p.models?.map((m) => ({
          id: m.id,
          name: m.name,
          isVision: m.isVision,
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                providers: providerList,
                total: providerList.length,
                defaultProviderId: defaultId,
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
            text: `Error listing providers: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:read'],
};

/**
 * Get a specific provider by ID
 */
export const getProviderTool: ToolDefinition = {
  tool: {
    name: 'get_provider',
    description: 'Get detailed information about a specific model provider',
    inputSchema: {
      type: 'object',
      properties: {
        providerId: {
          type: 'string',
          description: 'Provider ID',
        },
      },
      required: ['providerId'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const providerId = params.providerId as string;
      
      if (!providerId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Provider ID is required',
            },
          ],
          isError: true,
        };
      }
      
      const providers = await getAllVersions();
      const provider = providers.find((p) => p.id === providerId);
      
      if (!provider) {
        return {
          content: [
            {
              type: 'text',
              text: `Provider not found: ${providerId}`,
            },
          ],
          isError: true,
        };
      }
      
      const defaultId = await getDefaultVersionId();
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...provider,
                isDefault: provider.id === defaultId,
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
            text: `Error getting provider: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:read'],
};

/**
 * Create a new model provider
 */
export const createProviderTool: ToolDefinition = {
  tool: {
    name: 'create_provider',
    description: 'Create a new model provider with API key configuration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Provider display name',
        },
        alias: {
          type: 'string',
          description: 'Unique alias for the provider (e.g., "my-claude")',
        },
        description: {
          type: 'string',
          description: 'Optional description',
        },
        executablePath: {
          type: 'string',
          description: 'Optional path to Claude executable',
        },
        environmentVariables: {
          type: 'object',
          description: 'Environment variables including API keys (e.g., {"ANTHROPIC_API_KEY": "sk-xxx"})',
        },
        models: {
          type: 'array',
          description: 'Optional list of supported models',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              isVision: { type: 'boolean' },
              description: { type: 'string' },
            },
          },
        },
      },
      required: ['name', 'alias'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const data: ClaudeVersionCreate = {
        name: params.name as string,
        alias: params.alias as string,
        description: params.description as string | undefined,
        executablePath: params.executablePath as string | undefined,
        environmentVariables: params.environmentVariables as Record<string, string> | undefined,
        models: params.models as any[] | undefined,
      };
      
      if (!data.name || !data.alias) {
        return {
          content: [
            {
              type: 'text',
              text: 'Name and alias are required',
            },
          ],
          isError: true,
        };
      }
      
      const provider = await createVersion(data);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Provider "${provider.name}" created successfully`,
                provider: {
                  id: provider.id,
                  name: provider.name,
                  alias: provider.alias,
                  description: provider.description,
                  isDefault: provider.isDefault,
                  createdAt: provider.createdAt,
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
            text: `Error creating provider: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:write'],
};

/**
 * Update a model provider
 */
export const updateProviderTool: ToolDefinition = {
  tool: {
    name: 'update_provider',
    description: 'Update an existing model provider configuration',
    inputSchema: {
      type: 'object',
      properties: {
        providerId: {
          type: 'string',
          description: 'Provider ID to update',
        },
        name: {
          type: 'string',
          description: 'New display name',
        },
        alias: {
          type: 'string',
          description: 'New alias',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
        executablePath: {
          type: 'string',
          description: 'New executable path',
        },
        environmentVariables: {
          type: 'object',
          description: 'New environment variables (replaces existing)',
        },
        models: {
          type: 'array',
          description: 'New list of supported models',
        },
      },
      required: ['providerId'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const providerId = params.providerId as string;
      
      if (!providerId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Provider ID is required',
            },
          ],
          isError: true,
        };
      }
      
      const updateData: ClaudeVersionUpdate = {};
      
      if (params.name !== undefined) updateData.name = params.name as string;
      if (params.alias !== undefined) updateData.alias = params.alias as string;
      if (params.description !== undefined) updateData.description = params.description as string;
      if (params.executablePath !== undefined) updateData.executablePath = params.executablePath as string;
      if (params.environmentVariables !== undefined) {
        updateData.environmentVariables = params.environmentVariables as Record<string, string>;
      }
      if (params.models !== undefined) updateData.models = params.models as any[];
      
      const provider = await updateVersion(providerId, updateData);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Provider "${provider.name}" updated successfully`,
                provider: {
                  id: provider.id,
                  name: provider.name,
                  alias: provider.alias,
                  description: provider.description,
                  updatedAt: provider.updatedAt,
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
            text: `Error updating provider: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:write'],
};

/**
 * Delete a model provider
 */
export const deleteProviderTool: ToolDefinition = {
  tool: {
    name: 'delete_provider',
    description: 'Delete a model provider (system provider cannot be deleted)',
    inputSchema: {
      type: 'object',
      properties: {
        providerId: {
          type: 'string',
          description: 'Provider ID to delete',
        },
      },
      required: ['providerId'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const providerId = params.providerId as string;
      
      if (!providerId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Provider ID is required',
            },
          ],
          isError: true,
        };
      }
      
      await deleteVersion(providerId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Provider ${providerId} deleted successfully`,
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
            text: `Error deleting provider: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:write'],
};

/**
 * Get default model provider
 */
export const getDefaultProviderTool: ToolDefinition = {
  tool: {
    name: 'get_default_provider',
    description: 'Get the current default model provider',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: async (): Promise<McpToolCallResult> => {
    try {
      const defaultId = await getDefaultVersionId();
      
      if (!defaultId) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  defaultProvider: null,
                  message: 'No default provider is set',
                },
                null,
                2
              ),
            },
          ],
        };
      }
      
      const providers = await getAllVersions();
      const defaultProvider = providers.find((p) => p.id === defaultId);
      
      if (!defaultProvider) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  defaultProviderId: defaultId,
                  defaultProvider: null,
                  message: 'Default provider ID is set but provider not found',
                },
                null,
                2
              ),
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                defaultProviderId: defaultId,
                defaultProvider: {
                  id: defaultProvider.id,
                  name: defaultProvider.name,
                  alias: defaultProvider.alias,
                  description: defaultProvider.description,
                  isSystem: defaultProvider.isSystem,
                  models: defaultProvider.models?.map((m) => ({
                    id: m.id,
                    name: m.name,
                    isVision: m.isVision,
                  })),
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
            text: `Error getting default provider: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:read'],
};

/**
 * Set default model provider
 */
export const setDefaultProviderTool: ToolDefinition = {
  tool: {
    name: 'set_default_provider',
    description: 'Set a model provider as the default',
    inputSchema: {
      type: 'object',
      properties: {
        providerId: {
          type: 'string',
          description: 'Provider ID to set as default',
        },
      },
      required: ['providerId'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const providerId = params.providerId as string;
      
      if (!providerId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Provider ID is required',
            },
          ],
          isError: true,
        };
      }
      
      await setDefaultVersion(providerId);
      
      // Get the provider info for confirmation
      const providers = await getAllVersions();
      const provider = providers.find((p) => p.id === providerId);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Default provider set to "${provider?.name || providerId}"`,
                defaultProviderId: providerId,
                defaultProvider: provider
                  ? {
                      id: provider.id,
                      name: provider.name,
                      alias: provider.alias,
                    }
                  : null,
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
            text: `Error setting default provider: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['system:write'],
};

/**
 * All provider tools
 */
export const providerTools: ToolDefinition[] = [
  listProvidersTool,
  getProviderTool,
  createProviderTool,
  updateProviderTool,
  deleteProviderTool,
  getDefaultProviderTool,
  setDefaultProviderTool,
];
