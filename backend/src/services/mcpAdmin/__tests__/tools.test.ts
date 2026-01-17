/**
 * MCP Admin Tools Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { McpToolCallResult, ToolContext } from '../types.js';

// Mock dependencies before imports
vi.mock('../../projectMetadataStorage.js', () => ({
  ProjectMetadataStorage: vi.fn().mockImplementation(() => ({
    getAllProjects: vi.fn().mockReturnValue([
      {
        id: 'proj_1',
        path: '/path/to/project1',
        name: 'project1',
        dirName: 'project1',
        lastAccessed: '2024-01-01T00:00:00Z',
        defaultAgent: 'claude-code',
        defaultAgentName: 'Claude Code',
        defaultAgentIcon: '🔧',
        agents: ['claude-code'],
        tags: [],
        metadata: {},
      },
      {
        id: 'proj_2',
        path: '/path/to/project2',
        name: 'project2',
        dirName: 'project2',
        lastAccessed: '2024-01-02T00:00:00Z',
        defaultAgent: 'custom-agent',
        defaultAgentName: 'Custom Agent',
        defaultAgentIcon: '🤖',
        agents: ['custom-agent'],
        tags: ['test'],
        metadata: {},
      },
    ]),
    getProject: vi.fn().mockImplementation((path: string) => {
      if (path === '/path/to/project1') {
        return {
          id: 'proj_1',
          path: '/path/to/project1',
          name: 'project1',
          dirName: 'project1',
          lastAccessed: '2024-01-01T00:00:00Z',
          defaultAgent: 'claude-code',
          defaultAgentName: 'Claude Code',
          defaultAgentIcon: '🔧',
          agents: ['claude-code'],
          tags: [],
          metadata: {},
        };
      }
      return null;
    }),
    createProject: vi.fn().mockImplementation((path: string, options: any) => ({
      id: 'new_proj',
      path,
      name: options?.name || path.split('/').pop(),
      dirName: path.split('/').pop(),
      lastAccessed: new Date().toISOString(),
      defaultAgent: options?.agentId || '',
      defaultAgentName: '',
      defaultAgentIcon: '',
      agents: [],
      tags: [],
      metadata: {},
    })),
    updateProjectInfo: vi.fn(),
    setDefaultAgent: vi.fn(),
    updateProjectTags: vi.fn(),
    getProjectMetadata: vi.fn().mockImplementation((path: string) => {
      if (path === '/path/to/project1') {
        return {
          id: 'proj_1',
          path: '/path/to/project1',
          name: 'project1',
          defaultAgent: 'claude-code',
          tags: [],
          metadata: {},
          agents: {},
          skills: {},
          createdAt: '2024-01-01T00:00:00Z',
          lastAccessed: '2024-01-01T00:00:00Z',
        };
      }
      return null;
    }),
    saveProjectMetadata: vi.fn(),
  })),
}));

vi.mock('../../agentStorage.js', () => ({
  AgentStorage: vi.fn().mockImplementation(() => ({
    getAllAgents: vi.fn().mockReturnValue([
      {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'Default agent',
        enabled: true,
        source: 'local',
        version: '1.0.0',
        // Note: model field removed - model is now determined by project/provider configuration
        tags: ['development'],
        allowedTools: [
          { name: 'Read', enabled: true },
          { name: 'Write', enabled: true },
        ],
      },
      {
        id: 'custom-agent',
        name: 'Custom Agent',
        description: 'A custom agent',
        enabled: false,
        source: 'plugin',
        version: '1.0.0',
        // Note: model field removed - model is now determined by project/provider configuration
        tags: [],
        allowedTools: [],
      },
    ]),
    getAgent: vi.fn().mockImplementation((id: string) => {
      if (id === 'claude-code') {
        return {
          id: 'claude-code',
          name: 'Claude Code',
          description: 'Default agent',
          enabled: true,
          source: 'local',
          version: '1.0.0',
          // Note: model field removed - model is now determined by project/provider configuration
          maxTurns: 25,
          permissionMode: 'acceptEdits',
          tags: ['development'],
          author: 'System',
          allowedTools: [
            { name: 'Read', enabled: true },
            { name: 'Write', enabled: true },
          ],
          ui: { icon: '🔧' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };
      }
      return null;
    }),
    saveAgent: vi.fn(),
  })),
}));

vi.mock('../../../routes/mcp.js', () => ({
  readMcpConfig: vi.fn().mockReturnValue({
    mcpServers: {
      'test-server': {
        url: 'http://localhost:3001',
        status: 'active',
        tools: ['tool1', 'tool2'],
        lastValidated: '2024-01-01T00:00:00Z',
      },
      'stdio-server': {
        command: 'node',
        args: ['server.js'],
        status: 'error',
        error: 'Connection failed',
      },
    },
  }),
  writeMcpConfig: vi.fn(),
}));

vi.mock('../../sessionManager.js', () => ({
  sessionManager: {
    getSessionsInfo: vi.fn().mockReturnValue([
      {
        sessionId: 'session_1',
        agentId: 'claude-code',
        isActive: true,
        lastActivity: Date.now(),
        idleTimeMs: 1000,
        lastHeartbeat: Date.now(),
        heartbeatTimedOut: false,
        status: 'confirmed',
        projectPath: '/path/to/project1',
        claudeVersionId: 'v1',
        modelId: 'sonnet',
      },
    ]),
    getActiveSessionCount: vi.fn().mockReturnValue(1),
  },
}));

// Import tools after mocks
import { projectTools } from '../tools/projectTools.js';
import { agentTools } from '../tools/agentTools.js';
import { mcpServerTools } from '../tools/mcpServerTools.js';
import { systemTools } from '../tools/systemTools.js';

const defaultContext: ToolContext = {
  apiKeyId: 'test-key',
  permissions: ['admin:*'],
};

describe('Project Tools', () => {
  describe('list_projects', () => {
    it('should list all projects', async () => {
      const listProjects = projectTools.find((t) => t.tool.name === 'list_projects');
      expect(listProjects).toBeDefined();

      const result = await listProjects!.handler({}, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.projects).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should support pagination', async () => {
      const listProjects = projectTools.find((t) => t.tool.name === 'list_projects');

      const result = await listProjects!.handler({ limit: 1, offset: 0 }, defaultContext);

      const data = JSON.parse(result.content[0].text!);
      expect(data.projects).toHaveLength(1);
      expect(data.limit).toBe(1);
      expect(data.offset).toBe(0);
    });
  });

  describe('get_project', () => {
    it('should get project by path', async () => {
      const getProject = projectTools.find((t) => t.tool.name === 'get_project');
      expect(getProject).toBeDefined();

      const result = await getProject!.handler(
        { path: '/path/to/project1' },
        defaultContext
      );

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.id).toBe('proj_1');
      expect(data.path).toBe('/path/to/project1');
    });

    it('should return error for non-existent project', async () => {
      const getProject = projectTools.find((t) => t.tool.name === 'get_project');

      const result = await getProject!.handler(
        { path: '/non/existent' },
        defaultContext
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should return error when path is missing', async () => {
      const getProject = projectTools.find((t) => t.tool.name === 'get_project');

      const result = await getProject!.handler({}, defaultContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('required');
    });
  });
});

describe('Agent Tools', () => {
  describe('list_agents', () => {
    it('should list all enabled agents by default', async () => {
      const listAgents = agentTools.find((t) => t.tool.name === 'list_agents');
      expect(listAgents).toBeDefined();

      const result = await listAgents!.handler({}, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.agents).toHaveLength(1); // Only enabled agent
      expect(data.agents[0].id).toBe('claude-code');
    });

    it('should include disabled agents when requested', async () => {
      const listAgents = agentTools.find((t) => t.tool.name === 'list_agents');

      const result = await listAgents!.handler(
        { includeDisabled: true },
        defaultContext
      );

      const data = JSON.parse(result.content[0].text!);
      expect(data.agents).toHaveLength(2);
    });

    it('should filter by source', async () => {
      const listAgents = agentTools.find((t) => t.tool.name === 'list_agents');

      const result = await listAgents!.handler(
        { includeDisabled: true, source: 'plugin' },
        defaultContext
      );

      const data = JSON.parse(result.content[0].text!);
      expect(data.agents).toHaveLength(1);
      expect(data.agents[0].source).toBe('plugin');
    });
  });

  describe('get_agent', () => {
    it('should get agent by ID', async () => {
      const getAgent = agentTools.find((t) => t.tool.name === 'get_agent');
      expect(getAgent).toBeDefined();

      const result = await getAgent!.handler({ agentId: 'claude-code' }, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.id).toBe('claude-code');
      expect(data.name).toBe('Claude Code');
      expect(data.allowedTools).toHaveLength(2);
    });

    it('should return error for non-existent agent', async () => {
      const getAgent = agentTools.find((t) => t.tool.name === 'get_agent');

      const result = await getAgent!.handler({ agentId: 'non-existent' }, defaultContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });
});

describe('MCP Server Tools', () => {
  describe('list_mcp_servers', () => {
    it('should list all MCP servers', async () => {
      const listServers = mcpServerTools.find((t) => t.tool.name === 'list_mcp_servers');
      expect(listServers).toBeDefined();

      const result = await listServers!.handler({}, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.servers).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should filter by status', async () => {
      const listServers = mcpServerTools.find((t) => t.tool.name === 'list_mcp_servers');

      const result = await listServers!.handler({ status: 'active' }, defaultContext);

      const data = JSON.parse(result.content[0].text!);
      expect(data.servers).toHaveLength(1);
      expect(data.servers[0].name).toBe('test-server');
    });
  });

  describe('get_mcp_server', () => {
    it('should get MCP server by name', async () => {
      const getServer = mcpServerTools.find((t) => t.tool.name === 'get_mcp_server');
      expect(getServer).toBeDefined();

      const result = await getServer!.handler({ name: 'test-server' }, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.name).toBe('test-server');
      expect(data.type).toBe('http');
      expect(data.url).toBe('http://localhost:3001');
    });

    it('should return error for non-existent server', async () => {
      const getServer = mcpServerTools.find((t) => t.tool.name === 'get_mcp_server');

      const result = await getServer!.handler({ name: 'non-existent' }, defaultContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });
});

describe('System Tools', () => {
  describe('get_system_status', () => {
    it('should return system status', async () => {
      const getStatus = systemTools.find((t) => t.tool.name === 'get_system_status');
      expect(getStatus).toBeDefined();

      const result = await getStatus!.handler({}, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.status).toBe('healthy');
      expect(data.uptime).toBeDefined();
      expect(data.memory).toBeDefined();
      expect(data.system).toBeDefined();
    });
  });

  describe('get_active_sessions', () => {
    it('should return active sessions', async () => {
      const getSessions = systemTools.find((t) => t.tool.name === 'get_active_sessions');
      expect(getSessions).toBeDefined();

      const result = await getSessions!.handler({}, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.sessions).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.active).toBe(1);
    });
  });

  describe('health_check', () => {
    it('should perform health check', async () => {
      const healthCheck = systemTools.find((t) => t.tool.name === 'health_check');
      expect(healthCheck).toBeDefined();

      const result = await healthCheck!.handler({}, defaultContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text!);
      expect(data.status).toBeDefined();
      expect(data.checks).toBeDefined();
      expect(data.checks.memory).toBeDefined();
      expect(data.checks.sessions).toBeDefined();
    });
  });
});

describe('Tool Permissions', () => {
  it('should require projects:read for list_projects', () => {
    const listProjects = projectTools.find((t) => t.tool.name === 'list_projects');
    expect(listProjects?.requiredPermissions).toContain('projects:read');
  });

  it('should require projects:write for register_project', () => {
    const registerProject = projectTools.find((t) => t.tool.name === 'register_project');
    expect(registerProject?.requiredPermissions).toContain('projects:write');
  });

  it('should require agents:read for list_agents', () => {
    const listAgents = agentTools.find((t) => t.tool.name === 'list_agents');
    expect(listAgents?.requiredPermissions).toContain('agents:read');
  });

  it('should require agents:write for update_agent', () => {
    const updateAgent = agentTools.find((t) => t.tool.name === 'update_agent');
    expect(updateAgent?.requiredPermissions).toContain('agents:write');
  });

  it('should require mcp:read for list_mcp_servers', () => {
    const listServers = mcpServerTools.find((t) => t.tool.name === 'list_mcp_servers');
    expect(listServers?.requiredPermissions).toContain('mcp:read');
  });

  it('should require system:read for get_system_status', () => {
    const getStatus = systemTools.find((t) => t.tool.name === 'get_system_status');
    expect(getStatus?.requiredPermissions).toContain('system:read');
  });
});
