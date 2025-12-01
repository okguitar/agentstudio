/**
 * A2A Client MCP Tool
 *
 * Implements the `call_external_agent` MCP tool for calling external A2A-compatible agents.
 * This tool enables AgentStudio agents to delegate tasks to specialized external agents.
 *
 * Features:
 * - Allowlist validation against project's a2a-config.json
 * - HTTP client using @a2a-js/sdk
 * - Timeout handling (default 30s, configurable)
 * - Clear error messages for failures
 * - Support for both sync messages and async tasks
 *
 * Phase 5: US3 - Agent as A2A Client via MCP Tool
 */

import type { CallExternalAgentInput, CallExternalAgentOutput } from '../../types/a2a.js';
import { loadA2AConfig } from './a2aConfigService.js';

/**
 * MCP Tool Definition for call_external_agent
 */
export const CALL_EXTERNAL_AGENT_TOOL = {
  name: 'call_external_agent',
  description:
    'Call an external A2A-compatible agent to delegate a task. The external agent must be in the project allowlist.',
  inputSchema: {
    type: 'object',
    properties: {
      agentUrl: {
        type: 'string',
        description: 'Target agent base URL (e.g., https://analytics.example.com/a2a/agent-id)',
      },
      message: {
        type: 'string',
        description: 'Task description or query for the external agent',
      },
      useTask: {
        type: 'boolean',
        description: 'Use async task mode (default: false for synchronous message)',
        default: false,
      },

    },
    required: ['agentUrl', 'message'],
  },
} as const;

/**
 * Call external A2A agent tool handler
 *
 * Validates agent URL against project allowlist, then makes HTTP call
 * using fetch API. Returns structured response with success/error status.
 *
 * This function is used both by the MCP tool definition and can be called
 * directly by the SDK MCP server.
 *
 * @param input - Tool input parameters
 * @param projectId - Project ID for allowlist validation
 * @returns Structured response with success/error status
 */
export async function callExternalAgent(
  input: CallExternalAgentInput,
  projectId: string
): Promise<CallExternalAgentOutput> {
  const { agentUrl, message, useTask = false } = input;
  const timeout = 600000; // Hardcoded default timeout: 10 minutes

  try {
    // Step 1: Validate agent URL against project allowlist
    const validationResult = await validateAgentUrl(agentUrl, projectId);

    if (!validationResult.allowed) {
      return {
        success: false,
        error: validationResult.error || 'Agent URL not in project allowlist',
      };
    }

    // Step 2: Get API key for external agent from allowlist
    const apiKey = validationResult.apiKey;

    if (!apiKey) {
      return {
        success: false,
        error: 'API key not found for allowed agent',
      };
    }

    // Step 3: Make HTTP call to external agent
    if (useTask) {
      // Async task mode
      const taskResult = await callExternalAgentTask(agentUrl, message, apiKey, timeout);
      return taskResult;
    } else {
      // Sync message mode
      const messageResult = await callExternalAgentMessage(
        agentUrl,
        message,
        apiKey,
        timeout,
        input.sessionId // Pass sessionId if provided
      );
      return messageResult;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[A2A Client Tool] Error calling external agent:', error);

    return {
      success: false,
      error: `Failed to call external agent: ${errorMessage}`,
    };
  }
}

/**
 * Validate agent URL against project's allowlist
 *
 * Checks if the agent URL is in the project's allowed agents list.
 * Returns API key if validation succeeds.
 *
 * @param agentUrl - Target agent URL
 * @param projectId - Project ID for config lookup
 * @returns Validation result with API key if allowed
 */
async function validateAgentUrl(
  agentUrl: string,
  projectId: string
): Promise<{ allowed: boolean; apiKey?: string; error?: string }> {
  try {
    // Load project A2A configuration
    const config = await loadA2AConfig(projectId);

    if (!config) {
      return {
        allowed: false,
        error: 'Project A2A configuration not found. Please configure allowed agents in project settings.',
      };
    }

    // Normalize URL for comparison (remove trailing slash)
    const normalizedTargetUrl = agentUrl.replace(/\/$/, '');

    // Check if agent URL is in allowlist
    for (const allowedAgent of config.allowedAgents) {
      const normalizedAllowedUrl = allowedAgent.url.replace(/\/$/, '');

      // Check if target URL starts with allowed URL (allows subpaths)
      if (normalizedTargetUrl.startsWith(normalizedAllowedUrl) && allowedAgent.enabled) {
        return {
          allowed: true,
          apiKey: allowedAgent.apiKey,
        };
      }
    }

    // Not found in allowlist
    return {
      allowed: false,
      error: `Agent URL '${agentUrl}' not found in project's allowed agents list. Please add it in project A2A settings.`,
    };
  } catch (error) {
    console.error('[A2A Client Tool] Error validating agent URL:', error);
    return {
      allowed: false,
      error: 'Failed to validate agent URL against allowlist',
    };
  }
}

/**
 * Call external agent with synchronous message
 *
 * Uses POST /messages endpoint of A2A protocol.
 *
 * @param agentUrl - Target agent base URL
 * @param message - Message to send
 * @param apiKey - API key for authentication
 * @param timeout - Request timeout in milliseconds
 * @returns Tool output with response
 */
async function callExternalAgentMessage(
  agentUrl: string,
  message: string,
  apiKey: string,
  timeout: number,
  sessionId?: string
): Promise<CallExternalAgentOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const requestBody: any = { message };
    if (sessionId) {
      requestBody.sessionId = sessionId;
    }

    const response = await fetch(`${agentUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
        error?: string;
      };
      return {
        success: false,
        error: `External agent returned ${response.status}: ${errorData.error || response.statusText}`,
      };
    }

    const data = await response.json() as any;

    return {
      success: true,
      data: data.response, // Assuming standard A2A response format
      sessionId: data.sessionId, // Extract session ID from response
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `External agent call timed out after ${timeout}ms`,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Network error calling external agent: ${errorMessage}`,
    };
  }
}

/**
 * Call external agent with asynchronous task
 *
 * Uses POST /tasks endpoint of A2A protocol.
 *
 * @param agentUrl - Target agent base URL
 * @param message - Task description
 * @param apiKey - API key for authentication
 * @param timeout - Request timeout in milliseconds
 * @returns Tool output with task ID and status
 */
async function callExternalAgentTask(
  agentUrl: string,
  message: string,
  apiKey: string,
  timeout: number
): Promise<CallExternalAgentOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${agentUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ message, timeout }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
        error?: string;
      };
      return {
        success: false,
        error: `External agent returned ${response.status}: ${errorData.error || response.statusText}`,
      };
    }

    const data = (await response.json()) as {
      taskId?: string;
      status?: string;
      checkUrl?: string;
      [key: string]: unknown;
    };

    return {
      success: true,
      taskId: data.taskId,
      status: data.status,
      data: data.checkUrl
        ? {
          taskId: data.taskId,
          status: data.status,
          checkUrl: data.checkUrl,
        }
        : data,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `External agent task creation timed out after ${timeout}ms`,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Network error creating external agent task: ${errorMessage}`,
    };
  }
}
