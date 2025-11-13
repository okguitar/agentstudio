/**
 * Unit tests for claudeUtils.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import {
  getClaudeExecutablePath,
  readMcpConfig,
  getDefaultClaudeVersionEnv,
  buildQueryOptions
} from '../claudeUtils';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

// Mock os
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home')
}));

// Mock claudeVersionStorage
vi.mock('../../services/claudeVersionStorage', () => ({
  getDefaultVersionId: vi.fn(),
  getAllVersionsInternal: vi.fn(),
  getVersionByIdInternal: vi.fn()
}));

describe('claudeUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClaudeExecutablePath', () => {
    it('should return the Claude executable path', async () => {
      // Mock exec to return a valid path
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '/usr/local/bin/claude\n', stderr: '' });
        return {} as any;
      });

      const result = await getClaudeExecutablePath();
      expect(result).toBe('/usr/local/bin/claude');
    });

    it('should skip node_modules paths and find global installation', async () => {
      // First call returns node_modules path
      let callCount = 0;
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { stdout: './node_modules/.bin/claude\n', stderr: '' });
        } else {
          // Second call (which -a) returns multiple paths
          callback(null, { 
            stdout: './node_modules/.bin/claude\n/usr/local/bin/claude\n', 
            stderr: '' 
          });
        }
        return {} as any;
      });

      const result = await getClaudeExecutablePath();
      expect(result).toBe('/usr/local/bin/claude');
    });

    it('should return null if claude is not found', async () => {
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(new Error('command not found'), { stdout: '', stderr: 'not found' });
        return {} as any;
      });

      const result = await getClaudeExecutablePath();
      expect(result).toBeNull();
    });
  });

  describe('readMcpConfig', () => {
    it('should read and parse MCP config file', () => {
      const mockConfig = {
        mcpServers: {
          'test-server': {
            type: 'stdio',
            command: 'node',
            args: ['server.js'],
            status: 'active'
          }
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

      const result = readMcpConfig();
      expect(result).toEqual(mockConfig);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join('/mock/home', '.claude-agent', 'mcp-server.json'),
        'utf-8'
      );
    });

    it('should return default config if file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = readMcpConfig();
      expect(result).toEqual({ mcpServers: {} });
    });

    it('should return default config if JSON parsing fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      const result = readMcpConfig();
      expect(result).toEqual({ mcpServers: {} });
    });
  });

  describe('getDefaultClaudeVersionEnv', () => {
    it('should return environment variables from default version', async () => {
      const mockVersions = [
        {
          id: 'default-version',
          name: 'Claude Default',
          alias: 'default',
          environmentVariables: {
            ANTHROPIC_API_KEY: 'test-key-123'
          }
        }
      ];

      const { getDefaultVersionId, getAllVersionsInternal } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('default-version');
      vi.mocked(getAllVersionsInternal).mockResolvedValue(mockVersions as any);

      const result = await getDefaultClaudeVersionEnv();
      expect(result).toEqual({
        ANTHROPIC_API_KEY: 'test-key-123'
      });
    });

    it('should return null if no default version found', async () => {
      const { getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue(null);

      const result = await getDefaultClaudeVersionEnv();
      expect(result).toBeNull();
    });

    it('should return null if default version has no API keys', async () => {
      const mockVersions = [
        {
          id: 'default-version',
          name: 'Claude Default',
          alias: 'default',
          environmentVariables: {
            // No API keys
            SOME_OTHER_VAR: 'value'
          }
        }
      ];

      const { getDefaultVersionId, getAllVersionsInternal } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue('default-version');
      vi.mocked(getAllVersionsInternal).mockResolvedValue(mockVersions as any);

      const result = await getDefaultClaudeVersionEnv();
      expect(result).toBeNull();
    });
  });

  describe('buildQueryOptions', () => {
    const mockAgent = {
      systemPrompt: 'Test system prompt',
      workingDirectory: './test-dir',
      permissionMode: 'acceptEdits',
      model: 'sonnet',
      maxTurns: 10,
      allowedTools: [
        { name: 'Write', enabled: true },
        { name: 'Read', enabled: true },
        { name: 'Disabled', enabled: false }
      ]
    };

    beforeEach(() => {
      // Mock exec for getClaudeExecutablePath
      vi.mocked(exec).mockImplementation((cmd, callback: any) => {
        callback(null, { stdout: '/usr/local/bin/claude\n', stderr: '' });
        return {} as any;
      });
    });

    it('should build basic query options', async () => {
      const { getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue(null);

      const options = await buildQueryOptions(mockAgent);

      expect(options).toMatchObject({
        systemPrompt: 'Test system prompt',
        allowedTools: ['Write', 'Read'],
        maxTurns: 10,
        permissionMode: 'acceptEdits',
        model: 'sonnet',
        pathToClaudeCodeExecutable: '/usr/local/bin/claude'
      });
      expect(options.env).toBeDefined();
    });

    it('should use projectPath as cwd if provided', async () => {
      const { getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue(null);

      const options = await buildQueryOptions(mockAgent, '/custom/project/path');

      expect(options.cwd).toBe('/custom/project/path');
    });

    it('should include MCP tools in allowed tools', async () => {
      const { getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue(null);

      const mcpTools = ['mcp__server1__tool1', 'mcp__server2__tool2'];
      const options = await buildQueryOptions(mockAgent, undefined, mcpTools);

      expect(options.allowedTools).toContain('mcp__server1__tool1');
      expect(options.allowedTools).toContain('mcp__server2__tool2');
    });

    it('should configure MCP servers when MCP tools are provided', async () => {
      const { getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue(null);

      const mockMcpConfig = {
        mcpServers: {
          'server1': {
            type: 'stdio',
            command: 'node',
            args: ['server1.js'],
            status: 'active'
          }
        }
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockMcpConfig));

      const mcpTools = ['mcp__server1__tool1'];
      const options = await buildQueryOptions(mockAgent, undefined, mcpTools);

      expect(options.mcpServers).toBeDefined();
      expect(options.mcpServers?.server1).toMatchObject({
        type: 'stdio',
        command: 'node',
        args: ['server1.js']
      });
    });

    it('should use agent-specific Claude version if provided', async () => {
      const mockVersion = {
        id: 'custom-version',
        name: 'Custom Claude',
        alias: 'custom',
        executablePath: '/custom/claude',
        environmentVariables: {
          ANTHROPIC_API_KEY: 'custom-key'
        }
      };

      const { getVersionByIdInternal } = await import('../../services/claudeVersionStorage');
      vi.mocked(getVersionByIdInternal).mockResolvedValue(mockVersion as any);

      const options = await buildQueryOptions(mockAgent, undefined, undefined, undefined, undefined, 'custom-version');

      expect(options.pathToClaudeCodeExecutable).toBe('/custom/claude');
      expect(options.env?.ANTHROPIC_API_KEY).toBe('custom-key');
    });

    it('should override agent settings with request parameters', async () => {
      const { getDefaultVersionId } = await import('../../services/claudeVersionStorage');
      vi.mocked(getDefaultVersionId).mockResolvedValue(null);

      const options = await buildQueryOptions(
        mockAgent,
        undefined,
        undefined,
        'bypassPermissions',
        'opus'
      );

      expect(options.permissionMode).toBe('bypassPermissions');
      expect(options.model).toBe('opus');
    });
  });
});

