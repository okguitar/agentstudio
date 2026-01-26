/**
 * Unit tests for a2aClientTool.ts
 * Tests for Phase 5 (US3): Agent as A2A Client via MCP Tool
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callExternalAgent, CALL_EXTERNAL_AGENT_TOOL } from '../a2aClientTool.js';
import type { CallExternalAgentInput } from '../../../types/a2a.js';
import * as a2aConfigService from '../a2aConfigService.js';

// Mock the a2aConfigService
vi.mock('../a2aConfigService.js');

// Mock global fetch
global.fetch = vi.fn();

describe('a2aClientTool - MCP Tool for Calling External Agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CALL_EXTERNAL_AGENT_TOOL definition', () => {
    it('should have correct tool name', () => {
      expect(CALL_EXTERNAL_AGENT_TOOL.name).toBe('call_external_agent');
    });

    it('should have required parameters defined', () => {
      expect(CALL_EXTERNAL_AGENT_TOOL.inputSchema.required).toEqual(['agentUrl', 'message']);
    });

    it('should have correct parameter types', () => {
      const props = CALL_EXTERNAL_AGENT_TOOL.inputSchema.properties;
      expect(props.agentUrl.type).toBe('string');
      expect(props.message.type).toBe('string');
      expect(props.useTask.type).toBe('boolean');
    });

    it('should have default values for optional parameters', () => {
      const props = CALL_EXTERNAL_AGENT_TOOL.inputSchema.properties;
      expect(props.useTask.default).toBe(false);
    });
  });

  describe('allowlist validation', () => {
    it('should reject agent URL not in allowlist', async () => {
      // Mock loadA2AConfig to return config with no allowed agents
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      const input: CallExternalAgentInput = {
        agentUrl: 'https://unauthorized.example.com/a2a/agent-1',
        message: 'Test message',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in project\'s allowed agents list');
    });

    it('should accept agent URL in allowlist', async () => {
      // Mock loadA2AConfig to return config with allowed agent
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Test Agent',
            url: 'https://test.example.com/a2a/agent-1',
            apiKey: 'test-api-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      // Mock fetch to return success
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ response: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test message',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(true);
      expect(vi.mocked(global.fetch)).toHaveBeenCalled();
    });

    it('should reject disabled agent in allowlist', async () => {
      // Mock loadA2AConfig to return config with disabled agent
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Disabled Agent',
            url: 'https://disabled.example.com/a2a/agent-1',
            apiKey: 'test-api-key',
            enabled: false,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      const input: CallExternalAgentInput = {
        agentUrl: 'https://disabled.example.com/a2a/agent-1',
        message: 'Test message',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in project\'s allowed agents list');
    });

    it('should allow subpaths of allowed agent URL', async () => {
      // Mock loadA2AConfig to return config
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Test Agent',
            url: 'https://test.example.com/a2a',
            apiKey: 'test-api-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      // Mock fetch
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ response: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-123',
        message: 'Test message',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(true);
    });

    it('should handle missing A2A configuration', async () => {
      // Mock loadA2AConfig to return null (config error)
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(null);

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test message',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project A2A configuration not found');
    });
  });

  describe('synchronous message mode', () => {
    beforeEach(() => {
      // Mock loadA2AConfig for all sync tests
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Test Agent',
            url: 'https://test.example.com/a2a/agent-1',
            apiKey: 'test-api-key-123',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });
    });

    it('should call /messages endpoint for sync mode', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Test response', sessionId: 'test-session' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test message',
        useTask: false,
        stream: false,  // Explicitly disable streaming for sync mode test
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe('Test response');
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        'https://test.example.com/a2a/agent-1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-123',
          }),
        })
      );
    });

    it('should include message in request body', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ response: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Analyze this data',
      };

      await callExternalAgent(input, 'proj-123');

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      expect(requestBody.message).toBe('Analyze this data');
    });

    it('should handle HTTP error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('400');
      expect(result.error).toContain('Invalid request');
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout', async () => {
      // Mock loadA2AConfig
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Test Agent',
            url: 'https://test.example.com/a2a/agent-1',
            apiKey: 'test-api-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      // Mock fetch to return a promise that stays pending but respects abort signal
      vi.mocked(global.fetch).mockImplementation((_url, init) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
        stream: false,
        timeout: 1, // 1ms timeout to trigger AbortController immediately
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('asynchronous task mode', () => {
    beforeEach(() => {
      // Mock loadA2AConfig for all async tests
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Test Agent',
            url: 'https://test.example.com/a2a/agent-1',
            apiKey: 'test-api-key-456',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });
    });

    it('should call /tasks endpoint for task mode', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            taskId: 'task-123',
            status: 'pending',
            checkUrl: '/a2a/agent-1/tasks/task-123',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Long running task',
        useTask: true,
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
      expect(result.status).toBe('pending');
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        'https://test.example.com/a2a/agent-1/tasks',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should include timeout in task request body', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ taskId: 'task-123', status: 'pending' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
        useTask: true,
        timeout: 60000,
      };

      await callExternalAgent(input, 'proj-123');

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      // Timeout should now use the provided input value
      expect(requestBody.timeout).toBe(60000);
    });

    it('should return structured task data', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            taskId: 'task-456',
            status: 'pending',
            checkUrl: '/a2a/agent-1/tasks/task-456',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
        useTask: true,
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-456');
      expect(result.data).toBeDefined();
      expect(result.data?.checkUrl).toBe('/a2a/agent-1/tasks/task-456');
    });
  });

  describe('URL format compatibility', () => {
    it('should handle standard A2A URL format (append /messages)', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Standard Agent',
            url: 'http://localhost:4936/a2a/agent-123',
            apiKey: 'test-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'http://localhost:4936/a2a/agent-123',
        message: 'Test message',
      };

      await callExternalAgent(input, 'proj-123');

      // Verify that fetch was called with /messages appended
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:4936/a2a/agent-123/messages');
    });

    it('should handle non-standard URL format with /messages/ in path (no append)', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Non-standard Agent',
            url: 'http://localhost:4300/messages/project-123',
            apiKey: 'test-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'http://localhost:4300/messages/project-123',
        message: 'Test message',
      };

      await callExternalAgent(input, 'proj-123');

      // Verify that fetch was called with original URL (no /messages appended)
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:4300/messages/project-123');
    });

    it('should handle URL ending with /messages (no append)', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Complete Endpoint Agent',
            url: 'http://localhost:5000/agent/messages',
            apiKey: 'test-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'http://localhost:5000/agent/messages',
        message: 'Test message',
      };

      await callExternalAgent(input, 'proj-123');

      // Verify that fetch was called with original URL (no /messages appended)
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:5000/agent/messages');
    });

    it('should handle URL with trailing slash (standard format)', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Trailing Slash Agent',
            url: 'http://localhost:4936/a2a/agent-123/',
            apiKey: 'test-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ message: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'http://localhost:4936/a2a/agent-123/',
        message: 'Test message',
      };

      await callExternalAgent(input, 'proj-123');

      // Verify that trailing slash is handled correctly
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:4936/a2a/agent-123/messages');
    });

    it('should handle streaming URL with standard format', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Stream Agent',
            url: 'http://localhost:4936/a2a/agent-123',
            apiKey: 'test-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      // Mock streaming response
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
          controller.close();
        },
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(mockBody, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'http://localhost:4936/a2a/agent-123',
        message: 'Test message',
        stream: true,
      };

      await callExternalAgent(input, 'proj-123');

      // Verify that fetch was called with /messages and ?stream=true appended
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:4936/a2a/agent-123/messages?stream=true');
    });

    it('should handle streaming URL with non-standard format', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Non-standard Stream Agent',
            url: 'http://localhost:4300/messages/project-123',
            apiKey: 'test-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      // Mock streaming response
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
          controller.close();
        },
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(mockBody, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'http://localhost:4300/messages/project-123',
        message: 'Test message',
        stream: true,
      };

      await callExternalAgent(input, 'proj-123');

      // Verify that fetch was called with original URL + ?stream=true (no /messages appended)
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toBe('http://localhost:4300/messages/project-123?stream=true');
    });
  });

  describe('error handling', () => {
    it('should provide clear error message for missing config', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue(null);

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('configuration not found');
      expect(result.error).toContain('configure allowed agents');
    });

    it('should provide clear error message for unauthorized agent', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      const input: CallExternalAgentInput = {
        agentUrl: 'https://unauthorized.example.com/a2a/agent-1',
        message: 'Test',
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in project\'s allowed agents list');
      expect(result.error).toContain('add it in project A2A settings');
    });

    it('should handle malformed response from external agent', async () => {
      vi.mocked(a2aConfigService.loadA2AConfig).mockResolvedValue({
        allowedAgents: [
          {
            name: 'Test',
            url: 'https://test.example.com/a2a/agent-1',
            apiKey: 'key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      });

      vi.mocked(global.fetch).mockResolvedValue(
        new Response('Invalid JSON', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const input: CallExternalAgentInput = {
        agentUrl: 'https://test.example.com/a2a/agent-1',
        message: 'Test',
        stream: false,  // Explicitly disable streaming to test sync mode error handling
      };

      const result = await callExternalAgent(input, 'proj-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
