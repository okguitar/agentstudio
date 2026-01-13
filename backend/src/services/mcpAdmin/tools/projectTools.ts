/**
 * Project Management Tools
 *
 * MCP tools for managing projects in AgentStudio.
 */

import type { ToolDefinition, McpToolCallResult } from '../types.js';
import { ProjectMetadataStorage } from '../../projectMetadataStorage.js';
import fs from 'fs/promises';
import path from 'path';

const projectStorage = new ProjectMetadataStorage();

/**
 * List all projects
 */
export const listProjectsTool: ToolDefinition = {
  tool: {
    name: 'list_projects',
    description: 'List all registered projects in AgentStudio',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of projects to return (default: 100)',
        },
        offset: {
          type: 'number',
          description: 'Number of projects to skip (default: 0)',
        },
      },
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const limit = (params.limit as number) || 100;
      const offset = (params.offset as number) || 0;

      const allProjects = projectStorage.getAllProjects();
      const paginatedProjects = allProjects.slice(offset, offset + limit);

      const projects = paginatedProjects.map((p) => ({
        id: p.id,
        path: p.path,
        name: p.name,
        dirName: p.dirName,
        lastAccessed: p.lastAccessed,
        defaultAgent: p.defaultAgent,
        defaultAgentName: p.defaultAgentName,
        agents: p.agents,
        tags: p.tags,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                projects,
                total: allProjects.length,
                limit,
                offset,
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
            text: `Error listing projects: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['projects:read'],
};

/**
 * Get project details
 */
export const getProjectTool: ToolDefinition = {
  tool: {
    name: 'get_project',
    description: 'Get detailed information about a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
      },
      required: ['path'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const projectPath = params.path as string;

      if (!projectPath) {
        return {
          content: [{ type: 'text', text: 'Project path is required' }],
          isError: true,
        };
      }

      const project = projectStorage.getProject(projectPath);

      if (!project) {
        return {
          content: [{ type: 'text', text: `Project not found: ${projectPath}` }],
          isError: true,
        };
      }

      // Get additional info from the file system
      let exists = false;
      let fileCount = 0;

      try {
        await fs.access(projectPath);
        exists = true;

        const files = await fs.readdir(projectPath);
        fileCount = files.length;
      } catch {
        // Directory doesn't exist or can't be accessed
      }

      const projectInfo = {
        ...project,
        exists,
        fileCount,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projectInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting project: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['projects:read'],
};

/**
 * Register a new project
 */
export const registerProjectTool: ToolDefinition = {
  tool: {
    name: 'register_project',
    description: 'Register a new project directory in AgentStudio',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
        name: {
          type: 'string',
          description: 'Display name for the project (optional)',
        },
        agentId: {
          type: 'string',
          description: 'Default agent ID for this project (optional)',
        },
      },
      required: ['path'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const projectPath = params.path as string;
      const name = params.name as string | undefined;
      const agentId = params.agentId as string | undefined;

      if (!projectPath) {
        return {
          content: [{ type: 'text', text: 'Project path is required' }],
          isError: true,
        };
      }

      // Check if path is absolute
      if (!path.isAbsolute(projectPath)) {
        return {
          content: [{ type: 'text', text: 'Project path must be absolute' }],
          isError: true,
        };
      }

      // Check if directory exists
      try {
        const stat = await fs.stat(projectPath);
        if (!stat.isDirectory()) {
          return {
            content: [{ type: 'text', text: 'Path is not a directory' }],
            isError: true,
          };
        }
      } catch {
        return {
          content: [{ type: 'text', text: 'Directory does not exist' }],
          isError: true,
        };
      }

      // Create the project
      const project = projectStorage.createProject(projectPath, {
        name,
        agentId,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                project: {
                  id: project.id,
                  path: project.path,
                  name: project.name,
                  defaultAgent: project.defaultAgent,
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
            text: `Error registering project: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['projects:write'],
};

/**
 * Update project settings
 */
export const updateProjectTool: ToolDefinition = {
  tool: {
    name: 'update_project',
    description: 'Update project settings (name, description, default agent, tags)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
        name: {
          type: 'string',
          description: 'New display name for the project',
        },
        description: {
          type: 'string',
          description: 'New description for the project',
        },
        defaultAgent: {
          type: 'string',
          description: 'Default agent ID for this project',
        },
        tags: {
          type: 'array',
          description: 'Tags for the project',
        },
      },
      required: ['path'],
    },
  },
  handler: async (params): Promise<McpToolCallResult> => {
    try {
      const projectPath = params.path as string;
      const name = params.name as string | undefined;
      const description = params.description as string | undefined;
      const defaultAgent = params.defaultAgent as string | undefined;
      const tags = params.tags as string[] | undefined;

      if (!projectPath) {
        return {
          content: [{ type: 'text', text: 'Project path is required' }],
          isError: true,
        };
      }

      const project = projectStorage.getProject(projectPath);

      if (!project) {
        return {
          content: [{ type: 'text', text: `Project not found: ${projectPath}` }],
          isError: true,
        };
      }

      // Update project info
      if (name !== undefined || description !== undefined) {
        projectStorage.updateProjectInfo(projectPath, { name, description });
      }

      if (defaultAgent !== undefined) {
        projectStorage.setDefaultAgent(projectPath, defaultAgent);
      }

      if (tags !== undefined) {
        projectStorage.updateProjectTags(projectPath, tags);
      }

      // Get updated project
      const updatedProject = projectStorage.getProject(projectPath);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                project: updatedProject,
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
            text: `Error updating project: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
  requiredPermissions: ['projects:write'],
};

/**
 * All project tools
 */
export const projectTools: ToolDefinition[] = [
  listProjectsTool,
  getProjectTool,
  registerProjectTool,
  updateProjectTool,
];
