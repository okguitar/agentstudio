/**
 * Webhook Service for A2A Task Completion Notifications
 *
 * Handles sending webhook callbacks when async tasks complete,
 * with support for retries and authentication.
 */

import type { PushNotificationConfig } from '../../types/a2a.js';

// ============================================================================
// Types
// ============================================================================

export interface WebhookResult {
  success: boolean;
  attempts: number;
  error?: string;
}

interface WebhookPayload {
  taskId: string;
  status: 'completed' | 'failed' | 'canceled';
  output?: { result: string };
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
  timestamp: string;
}

// ============================================================================
// Configuration
// ============================================================================

const WEBHOOK_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000, // 1 second
  timeoutMs: 10000, // 10 seconds
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Send task completion webhook notification
 *
 * @param config - Push notification configuration (URL, auth, etc.)
 * @param taskId - Task identifier
 * @param status - Task completion status
 * @param output - Task output (for completed tasks)
 * @param errorDetails - Error details (for failed tasks)
 * @returns Result indicating success/failure and number of attempts
 */
export async function sendTaskCompletionWebhook(
  config: PushNotificationConfig,
  taskId: string,
  status: 'completed' | 'failed' | 'canceled',
  output?: { result: string },
  errorDetails?: { message: string; code: string; stack?: string }
): Promise<WebhookResult> {
  const payload: WebhookPayload = {
    taskId,
    status,
    output,
    error: errorDetails,
    timestamp: new Date().toISOString(),
  };

  let attempts = 0;
  let lastError: string | undefined;

  // Retry loop
  for (let i = 0; i <= WEBHOOK_CONFIG.maxRetries; i++) {
    attempts++;

    try {
      await sendWebhookRequest(config, payload);

      // Success!
      return {
        success: true,
        attempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      // Log the failure
      console.warn(
        `[WebhookService] Attempt ${attempts}/${WEBHOOK_CONFIG.maxRetries + 1} failed for task ${taskId}: ${lastError}`
      );

      // If not the last attempt, wait before retrying
      if (i < WEBHOOK_CONFIG.maxRetries) {
        const delay = WEBHOOK_CONFIG.retryDelayMs * Math.pow(2, i); // Exponential backoff
        await sleep(delay);
      }
    }
  }

  // All retries failed
  return {
    success: false,
    attempts,
    error: lastError,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send a single webhook HTTP request
 */
async function sendWebhookRequest(
  config: PushNotificationConfig,
  payload: WebhookPayload
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authentication if configured
  if (config.authentication?.schemes && config.authentication.credentials) {
    const scheme = config.authentication.schemes[0]; // Use first scheme
    headers['Authorization'] = `${scheme} ${config.authentication.credentials}`;
  } else if (config.token) {
    // Fallback to token field
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  // Use fetch API (available in Node 18+)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.timeoutMs);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Webhook request failed with status ${response.status}: ${response.statusText}`
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
