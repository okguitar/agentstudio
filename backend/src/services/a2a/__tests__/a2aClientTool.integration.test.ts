/**
 * Integration tests for a2aClientTool.ts
 * Tests for Phase 5 (US3): Agent as A2A Client - End-to-End Scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callExternalAgent } from '../a2aClientTool.js';
import { saveA2AConfig } from '../a2aConfigService.js';
import type { CallExternalAgentInput, A2AConfig } from '../../../types/a2a.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock global fetch
global.fetch = vi.fn();

describe.skip('a2aClientTool - Integration Tests', () => {
  const testProjectId = 'test-integration-proj';
  const testConfigPath = path.join(
    os.homedir(),
    '.claude',
    'projects',
    testProjectId,
    '.a2a',
    'config.json'
  );

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clean up test config if exists
    try {
      await fs.rm(path.dirname(testConfigPath), { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  afterEach(async () => {
    // Clean up test config
    try {
      await fs.rm(path.dirname(testConfigPath), { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
    vi.restoreAllMocks();
  });

  describe('End-to-end external agent call', () => {
    it('should successfully call external agent with valid config', async () => {
      // Setup: Create A2A config with allowed agent
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Analytics Agent',
            url: 'https://analytics.example.com/a2a/agent-123',
            apiKey: 'analytics-api-key-xyz',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      };

      await saveA2AConfig(testProjectId, config);

      // Mock successful external agent response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            response: 'Analysis complete: User engagement increased by 15%',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      // Execute: Call external agent
      const input: CallExternalAgentInput = {
        agentUrl: 'https://analytics.example.com/a2a/agent-123',
        message: 'Analyze user engagement metrics for Q4',
      };

      const result = await callExternalAgent(input, testProjectId);

      // Verify: Successful response
      expect(result.success).toBe(true);
      expect(result.data).toContain('Analysis complete');
      expect(result.error).toBeUndefined();

      // Verify: Correct API call
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        'https://analytics.example.com/a2a/agent-123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer analytics-api-key-xyz',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle asynchronous task workflow', async () => {
      // Setup: Create A2A config
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Data Processing Agent',
            url: 'https://dataproc.example.com/a2a/proc-1',
            apiKey: 'proc-api-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      };

      await saveA2AConfig(testProjectId, config);

      // Mock task creation response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            taskId: 'task-long-running-456',
            status: 'pending',
            checkUrl: '/a2a/proc-1/tasks/task-long-running-456',
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      // Execute: Create async task
      const input: CallExternalAgentInput = {
        agentUrl: 'https://dataproc.example.com/a2a/proc-1',
        message: 'Process 1M records and generate report',
        useTask: true,
        timeout: 600000, // 10 minutes
      };

      const result = await callExternalAgent(input, testProjectId);

      // Verify: Task created successfully
      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-long-running-456');
      expect(result.status).toBe('pending');
      expect(result.data).toBeDefined();
      expect(result.data?.checkUrl).toBe('/a2a/proc-1/tasks/task-long-running-456');

      // Verify: Correct endpoint called
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        'https://dataproc.example.com/a2a/proc-1/tasks',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should reject call when agent not in allowlist', async () => {
      // Setup: Create A2A config with different agent
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Authorized Agent',
            url: 'https://authorized.example.com/a2a/agent-1',
            apiKey: 'authorized-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      };

      await saveA2AConfig(testProjectId, config);

      // Execute: Try to call unauthorized agent
      const input: CallExternalAgentInput = {
        agentUrl: 'https://unauthorized.example.com/a2a/agent-2',
        message: 'Attempt unauthorized access',
      };

      const result = await callExternalAgent(input, testProjectId);

      // Verify: Request rejected
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found in project\'s allowed agents list');

      // Verify: No network call made
      expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
    });

    it('should use correct API key for each allowed agent', async () => {
      // Setup: Create A2A config with multiple agents
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Agent A',
            url: 'https://agent-a.example.com/a2a',
            apiKey: 'key-for-agent-a',
            enabled: true,
          },
          {
            name: 'Agent B',
            url: 'https://agent-b.example.com/a2a',
            apiKey: 'key-for-agent-b',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      };

      await saveA2AConfig(testProjectId, config);

      // Mock responses
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(JSON.stringify({ response: 'Success' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Execute: Call Agent A
      const inputA: CallExternalAgentInput = {
        agentUrl: 'https://agent-a.example.com/a2a/sub',
        message: 'Test A',
      };

      await callExternalAgent(inputA, testProjectId);

      // Verify: Used correct API key for Agent A
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer key-for-agent-a',
          }),
        })
      );

      vi.clearAllMocks();

      // Execute: Call Agent B
      const inputB: CallExternalAgentInput = {
        agentUrl: 'https://agent-b.example.com/a2a/sub',
        message: 'Test B',
      };

      await callExternalAgent(inputB, testProjectId);

      // Verify: Used correct API key for Agent B
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer key-for-agent-b',
          }),
        })
      );
    });

    it('should handle network timeout gracefully', async () => {
      // Setup: Create A2A config
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Slow Agent',
            url: 'https://slow.example.com/a2a/agent-1',
            apiKey: 'slow-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      };

      await saveA2AConfig(testProjectId, config);

      // Mock delayed response (longer than timeout)
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                new Response(JSON.stringify({ response: 'Too late' }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                })
              );
            }, 100);
          })
      );

      // Execute: Call with short timeout
      const input: CallExternalAgentInput = {
        agentUrl: 'https://slow.example.com/a2a/agent-1',
        message: 'Time-sensitive request',
        timeout: 50, // Very short timeout
      };

      const result = await callExternalAgent(input, testProjectId);

      // Verify: Timeout error
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    }, 10000);

    it('should handle external agent error responses', async () => {
      // Setup: Create A2A config
      const config: A2AConfig = {
        allowedAgents: [
          {
            name: 'Error Agent',
            url: 'https://error.example.com/a2a/agent-1',
            apiKey: 'error-key',
            enabled: true,
          },
        ],
        taskTimeout: 300000,
        maxConcurrentTasks: 5,
      };

      await saveA2AConfig(testProjectId, config);

      // Mock error response
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'Invalid input: Missing required field "data"',
            code: 'VALIDATION_ERROR',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      // Execute: Call agent
      const input: CallExternalAgentInput = {
        agentUrl: 'https://error.example.com/a2a/agent-1',
        message: 'Invalid request',
      };

      const result = await callExternalAgent(input, testProjectId);

      // Verify: Error propagated correctly
      expect(result.success).toBe(false);
      expect(result.error).toContain('400');
      expect(result.error).toContain('Invalid input');
    });
  });
});
