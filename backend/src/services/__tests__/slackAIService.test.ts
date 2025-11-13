/**
 * Unit tests for slackAIService.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackAIService } from '../slackAIService.js';
import { clearConfigCache } from '../../config/index.js';
import type { SlackMessageEvent, SlackAppMentionEvent } from '../../types/slack.js';

// Mock dependencies
vi.mock('../slackClient.js', () => ({
  SlackClient: vi.fn().mockImplementation(() => ({
    postMessage: vi.fn().mockResolvedValue({ ts: '1234567890.123456', ok: true }),
    updateMessage: vi.fn().mockResolvedValue({ ts: '1234567890.123456', ok: true })
  }))
}));

vi.mock('../agentStorage.js', () => ({
  AgentStorage: vi.fn().mockImplementation(() => ({
    getAllAgents: vi.fn().mockReturnValue([
      {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test description',
        enabled: true,
        systemPrompt: 'Test prompt',
        workingDirectory: './',
        ui: { icon: '🤖' }
      },
      {
        id: 'disabled-agent',
        name: 'Disabled Agent',
        description: 'Disabled',
        enabled: false,
        systemPrompt: 'Test',
        workingDirectory: './',
        ui: {}
      }
    ]),
    getAgent: vi.fn((id: string) => {
      if (id === 'test-agent') {
        return {
          id: 'test-agent',
          name: 'Test Agent',
          description: 'Test description',
          enabled: true,
          systemPrompt: 'Test prompt',
          workingDirectory: './',
          ui: { icon: '🤖' }
        };
      }
      if (id === 'disabled-agent') {
        return {
          id: 'disabled-agent',
          name: 'Disabled Agent',
          description: 'Disabled',
          enabled: false,
          systemPrompt: 'Test',
          workingDirectory: './',
          ui: {}
        };
      }
      return null;
    })
  }))
}));

vi.mock('../projectMetadataStorage.js', () => ({
  ProjectMetadataStorage: vi.fn().mockImplementation(() => ({
    getAllProjects: vi.fn().mockReturnValue([
      {
        id: 'proj1',
        name: 'Test Project',
        path: '/home/user/test-project',
        dirName: 'test-project',
        realPath: '/home/user/test-project',
        lastAccessed: '2024-01-01T00:00:00Z'
      },
      {
        id: 'proj2',
        name: 'Another Project',
        path: '/home/user/another',
        dirName: 'another',
        realPath: '/home/user/another',
        lastAccessed: '2024-01-02T00:00:00Z'
      }
    ]),
    getProjectMetadata: vi.fn((pathOrDirName: string) => {
      // Extract the directory name from the path
      const dirName = pathOrDirName.split('/').pop() || pathOrDirName;
      return {
        id: `project_${Date.now()}`,
        name: dirName,
        description: '',
        path: pathOrDirName,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        agents: {},
        defaultAgent: '',
        tags: [],
        metadata: {}
      };
    }),
    saveProjectMetadata: vi.fn()
  }))
}));

vi.mock('../sessionManager.js', () => ({
  sessionManager: {
    getSession: vi.fn().mockReturnValue(null),
    createNewSession: vi.fn().mockReturnValue({
      getAgentId: vi.fn().mockReturnValue('test-agent'),
      getClaudeSessionId: vi.fn().mockReturnValue(null),
      setClaudeSessionId: vi.fn(),
      sendMessage: vi.fn()
    }),
    confirmSessionId: vi.fn()
  }
}));

vi.mock('../slackThreadMapper.js', () => ({
  slackThreadMapper: {
    getSessionId: vi.fn().mockReturnValue(null),
    setMapping: vi.fn()
  }
}));

vi.mock('../slackSessionLock.js', () => ({
  slackSessionLock: {
    isSessionLocked: vi.fn().mockReturnValue({ locked: false }),
    tryAcquireLock: vi.fn().mockReturnValue(true),
    releaseLock: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../claudeVersionStorage.js', () => ({
  getDefaultVersionId: vi.fn().mockResolvedValue('default-version'),
  getVersionByIdInternal: vi.fn().mockResolvedValue({
    id: 'default-version',
    alias: 'default',
    models: [{ id: 'sonnet', name: 'Claude Sonnet' }],
    environmentVariables: {
      ANTHROPIC_API_KEY: 'test-key'
    }
  })
}));

vi.mock('../../utils/claudeUtils.js', () => ({
  buildQueryOptions: vi.fn().mockResolvedValue({
    appendSystemPrompt: 'Test prompt',
    allowedTools: ['Write', 'Read'],
    maxTurns: 10,
    permissionMode: 'acceptEdits',
    model: 'sonnet',
    pathToClaudeCodeExecutable: '/usr/local/bin/claude',
    cwd: './',
    env: {}
  }),
  getDefaultClaudeVersionEnv: vi.fn().mockResolvedValue({
    ANTHROPIC_API_KEY: 'test-key'
  })
}));

describe('SlackAIService', () => {
  let service: SlackAIService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SlackAIService('test-token', 'test-agent');
  });

  describe('getDefaultProject', () => {
    it('should use SLACK_DEFAULT_PROJECT env var if set', async () => {
      // Set environment variable
      process.env.SLACK_DEFAULT_PROJECT = '/home/user/test-project';
      clearConfigCache(); // Clear cache to pick up new env var

      const service = new SlackAIService('test-token', 'test-agent');
      const defaultProject = await (service as any).getDefaultProject();

      expect(defaultProject).not.toBeNull();
      expect(defaultProject?.name).toBe('Test Project');
      expect(defaultProject?.realPath).toBe('/home/user/test-project');

      // Clean up
      delete process.env.SLACK_DEFAULT_PROJECT;
      clearConfigCache();
    });

    it('should create slack-app project if no env var is set', async () => {
      // Ensure no env var is set
      delete process.env.SLACK_DEFAULT_PROJECT;
      clearConfigCache(); // Clear cache to ensure no env var is used

      const service = new SlackAIService('test-token', 'test-agent');
      const defaultProject = await (service as any).getDefaultProject();

      expect(defaultProject).not.toBeNull();
      expect(defaultProject?.name).toBe('slack-app');
      expect(defaultProject?.path).toContain('claude-code-projects/slack-app');
    });

    it('should cache default project path', async () => {
      clearConfigCache(); // Start fresh
      const service = new SlackAIService('test-token', 'test-agent');
      
      // First call
      const defaultProject1 = await (service as any).getDefaultProject();
      const cachedPath1 = (service as any).defaultProjectPath;
      
      // Second call should use cache
      const defaultProject2 = await (service as any).getDefaultProject();
      const cachedPath2 = (service as any).defaultProjectPath;

      // Verify the cached path is set and consistent
      expect(cachedPath1).not.toBeNull();
      expect(cachedPath1).toBe(cachedPath2);
      expect(defaultProject1?.path).toBe(defaultProject2?.path);
    });

    it('should return null if env var path is not found in projects', async () => {
      // Set env var to a path that doesn't exist in mock projects
      process.env.SLACK_DEFAULT_PROJECT = '/nonexistent/path';
      clearConfigCache(); // Clear cache to pick up new env var

      const service = new SlackAIService('test-token', 'test-agent');
      const defaultProject = await (service as any).getDefaultProject();

      // Should fall back to slack-app
      expect(defaultProject).not.toBeNull();
      expect(defaultProject?.name).toBe('slack-app');

      // Clean up
      delete process.env.SLACK_DEFAULT_PROJECT;
      clearConfigCache();
    });
  });

  describe('parseMessageContext', () => {
    it('should parse agent from message with @ prefix', async () => {
      const event: SlackAppMentionEvent = {
        type: 'app_mention',
        channel: 'C123',
        user: 'U123',
        text: '<@UBOT> @test-agent Hello there',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456'
      };

      // Access private method for testing
      const context = await (service as any).parseMessageContext(event);

      expect(context).toBeTruthy();
      expect(context.agentId).toBe('test-agent');
      expect(context.cleanText).toContain('Hello there');
    });

    it('should parse agent from message without @ prefix', async () => {
      const event: SlackAppMentionEvent = {
        type: 'app_mention',
        channel: 'C123',
        user: 'U123',
        text: '<@UBOT> test-agent Hello there',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456'
      };

      const context = await (service as any).parseMessageContext(event);

      expect(context).toBeTruthy();
      expect(context.agentId).toBe('test-agent');
    });

    it('should fallback to default agent if no agent specified', async () => {
      const event: SlackAppMentionEvent = {
        type: 'app_mention',
        channel: 'C123',
        user: 'U123',
        text: '<@UBOT> Hello there',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456'
      };

      const context = await (service as any).parseMessageContext(event);

      expect(context).toBeTruthy();
      expect(context.agentId).toBe('test-agent'); // Falls back to default
    });

    it('should parse project specification from message', async () => {
      const event: SlackAppMentionEvent = {
        type: 'app_mention',
        channel: 'C123',
        user: 'U123',
        text: '<@UBOT> test-agent proj:test-project Create a new file',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456'
      };

      const context = await (service as any).parseMessageContext(event);

      expect(context).toBeTruthy();
      expect(context.selectedProject).toBeTruthy();
      expect(context.selectedProject.dirName).toBe('test-project');
      // Note: cleanText should have the project specification removed
      // But parseAgentFromMessage processes first, then project parsing
      // So the cleanText will have "Create a new file" after both parsings
      expect(context.cleanText).toContain('Create a new file');
    });

    it('should return null if project not found', async () => {
      const event: SlackAppMentionEvent = {
        type: 'app_mention',
        channel: 'C123',
        user: 'U123',
        text: '<@UBOT> test-agent proj:nonexistent Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456'
      };

      const context = await (service as any).parseMessageContext(event);

      expect(context).toBeNull();
    });
  });

  describe('getClaudeVersionConfig', () => {
    it('should return Claude version configuration', async () => {
      const config = await (service as any).getClaudeVersionConfig();

      expect(config).toBeTruthy();
      expect(config.versionId).toBe('default-version');
      expect(config.model).toBe('sonnet');
      expect(config.env).toBeTruthy();
      expect(config.env.ANTHROPIC_API_KEY).toBe('test-key');
    });

    it('should return default config if no version found', async () => {
      const { getDefaultVersionId } = await import('../claudeVersionStorage.js');
      vi.mocked(getDefaultVersionId).mockResolvedValueOnce(null);

      const config = await (service as any).getClaudeVersionConfig();

      expect(config).toBeTruthy();
      expect(config.env).toBeNull();
    });
  });

  describe('acquireSessionLock', () => {
    it('should return true if lock acquired successfully', async () => {
      const event: SlackMessageEvent = {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456',
        channel_type: 'channel'
      };

      const result = await (service as any).acquireSessionLock(
        'session-123',
        event,
        '1234567890.123456',
        'test-agent',
        '1234567890.123457',
        'Test Agent'
      );

      expect(result).toBe(true);
    });

    it('should return false if session is locked', async () => {
      const { slackSessionLock } = await import('../slackSessionLock.js');
      vi.mocked(slackSessionLock.isSessionLocked).mockReturnValueOnce({
        locked: true,
        reason: 'Processing another message'
      });

      const event: SlackMessageEvent = {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456',
        channel_type: 'channel'
      };

      const result = await (service as any).acquireSessionLock(
        'session-123',
        event,
        '1234567890.123456',
        'test-agent',
        '1234567890.123457',
        'Test Agent'
      );

      expect(result).toBe(false);
    });

    it('should return false if lock acquisition fails', async () => {
      const { slackSessionLock } = await import('../slackSessionLock.js');
      vi.mocked(slackSessionLock.tryAcquireLock).mockReturnValueOnce(false);

      const event: SlackMessageEvent = {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456',
        channel_type: 'channel'
      };

      const result = await (service as any).acquireSessionLock(
        'session-123',
        event,
        '1234567890.123456',
        'test-agent',
        '1234567890.123457',
        'Test Agent'
      );

      expect(result).toBe(false);
    });
  });

  describe('processClaudeResponse', () => {
    it('should process Claude response and return text', async () => {
      const mockSession = {
        sendMessage: vi.fn((userMessage, callback) => {
          // Simulate assistant response
          callback({
            type: 'assistant',
            message: {
              content: [
                { type: 'text', text: 'Hello! ' },
                { type: 'text', text: 'How can I help?' }
              ]
            }
          });

          // Simulate completion
          callback({ type: 'result' });

          return Promise.resolve();
        }),
        setClaudeSessionId: vi.fn(),
        getClaudeSessionId: vi.fn().mockReturnValue('session-123')
      };

      const event: SlackMessageEvent = {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456',
        channel_type: 'channel'
      };

      const result = await (service as any).processClaudeResponse(
        mockSession,
        { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
        event,
        '1234567890.123456',
        'test-agent',
        null,
        '1234567890.123457' // placeholderTs
      );

      expect(result.fullResponse).toBe('Hello! How can I help?');
      expect(result.hasError).toBe(false);
    });

    it('should handle tool usage', async () => {
      const mockSession = {
        sendMessage: vi.fn((userMessage, callback) => {
          // Simulate tool usage
          callback({
            type: 'tool_use',
            subtype: 'start',
            tool_use: { name: 'Write' }
          });

          // Simulate completion
          callback({ type: 'result' });

          return Promise.resolve();
        }),
        setClaudeSessionId: vi.fn(),
        getClaudeSessionId: vi.fn().mockReturnValue('session-123')
      };

      const event: SlackMessageEvent = {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456',
        channel_type: 'channel'
      };

      const result = await (service as any).processClaudeResponse(
        mockSession,
        { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
        event,
        '1234567890.123456',
        'test-agent',
        null,
        '1234567890.123457' // placeholderTs
      );

      // Tool info is now in fullResponse to maintain chronological order
      expect(result.fullResponse).toContain('Write');
    });

    it('should handle errors', async () => {
      const mockSession = {
        sendMessage: vi.fn((userMessage, callback) => {
          // Simulate error
          callback({
            type: 'error',
            error: 'Something went wrong'
          });

          return Promise.resolve();
        }),
        setClaudeSessionId: vi.fn(),
        getClaudeSessionId: vi.fn().mockReturnValue('session-123')
      };

      const event: SlackMessageEvent = {
        type: 'message',
        channel: 'C123',
        user: 'U123',
        text: 'Hello',
        ts: '1234567890.123456',
        event_ts: '1234567890.123456',
        channel_type: 'channel'
      };

      const result = await (service as any).processClaudeResponse(
        mockSession,
        { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] } },
        event,
        '1234567890.123456',
        'test-agent',
        null,
        '1234567890.123457' // placeholderTs
      );

      expect(result.hasError).toBe(true);
    });
  });
});

