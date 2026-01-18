/**
 * Unit tests for webhookService.ts
 * Tests for webhook callback functionality with retries and authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendTaskCompletionWebhook } from '../webhookService.js';
import type { PushNotificationConfig } from '../../../types/a2a.js';

describe('webhookService - Webhook Callbacks', () => {
  // Mock fetch globally
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create a new mock for each test
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('sendTaskCompletionWebhook()', () => {
    it('should send webhook successfully on first attempt', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      // Mock successful response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const result = await sendTaskCompletionWebhook(
        config,
        'task-123',
        'completed',
        { result: 'Task completed successfully' }
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
      expect(result.error).toBeUndefined();

      // Verify fetch was called with correct parameters
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        config.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('task-123'),
        })
      );
    });

    it('should include task output in payload for completed tasks', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const output = { result: 'Task completed with result' };

      await sendTaskCompletionWebhook(config, 'task-456', 'completed', output);

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.taskId).toBe('task-456');
      expect(body.status).toBe('completed');
      expect(body.output).toEqual(output);
      expect(body.timestamp).toBeDefined();
    });

    it('should include error details in payload for failed tasks', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      const errorDetails = {
        message: 'Task failed due to timeout',
        code: 'TIMEOUT_ERROR',
        stack: 'Error stack trace...',
      };

      await sendTaskCompletionWebhook(
        config,
        'task-789',
        'failed',
        undefined,
        errorDetails
      );

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.status).toBe('failed');
      expect(body.error).toEqual(errorDetails);
      expect(body.output).toBeUndefined();
    });

    it('should add Bearer token authentication when token is provided', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
        token: 'my-secret-token',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await sendTaskCompletionWebhook(config, 'task-001', 'completed');

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe('Bearer my-secret-token');
    });

    it('should use authentication info when provided', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
        authentication: {
          schemes: ['Bearer'],
          credentials: 'custom-auth-token',
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await sendTaskCompletionWebhook(config, 'task-002', 'completed');

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe('Bearer custom-auth-token');
    });

    it('should retry on failure with exponential backoff', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      // Fail first two attempts, succeed on third
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
        });

      const result = await sendTaskCompletionWebhook(config, 'task-retry', 'completed');

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }, 15000); // Increase timeout for retry delays

    it('should fail after max retries', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      // Fail all attempts
      fetchMock.mockRejectedValue(new Error('Persistent network error'));

      const result = await sendTaskCompletionWebhook(config, 'task-fail', 'completed');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(result.error).toContain('network error');
      expect(fetchMock).toHaveBeenCalledTimes(4);
    }, 20000); // Increase timeout for all retry attempts

    it('should handle non-200 HTTP responses as failures', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      // Return 500 error
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await sendTaskCompletionWebhook(config, 'task-500', 'completed');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    }, 20000);

    it('should handle timeout errors', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      // Simulate timeout by rejecting with AbortError
      fetchMock.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        });
      });

      const result = await sendTaskCompletionWebhook(config, 'task-timeout', 'completed');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 20000);

    it('should send canceled status correctly', async () => {
      const config: PushNotificationConfig = {
        url: 'https://example.com/webhook',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      await sendTaskCompletionWebhook(config, 'task-cancel', 'canceled');

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.status).toBe('canceled');
    });
  });
});
