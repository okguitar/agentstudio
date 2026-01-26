/**
 * A2A Client MCP Tool
 *
 * Implements the `call_external_agent` MCP tool for calling external A2A-compatible agents.
 * This tool enables AgentStudio agents to delegate tasks to specialized external agents.
 *
 * Features:
 * - Allowlist validation against project's a2a-config.json
 * - HTTP client using @a2a-js/sdk for A2A standard protocol support
 * - Streaming support using A2A standard events (Task, Message, TaskStatusUpdateEvent, etc.)
 * - Timeout handling (default 10min, configurable)
 * - Clear error messages for failures
 * - Support for both sync messages and async tasks
 *
 * A2A Protocol Streaming:
 * - Uses message/stream method for real-time updates
 * - Supports Task lifecycle stream (Task → TaskStatusUpdateEvent/TaskArtifactUpdateEvent → terminal state)
 * - Supports Message-only stream (single Message response)
 *
 * Phase 5: US3 - Agent as A2A Client via MCP Tool
 */

/// <reference lib="dom" />
import type { CallExternalAgentInput, CallExternalAgentOutput } from '../../types/a2a.js';
import { loadA2AConfig } from './a2aConfigService.js';
import { a2aHistoryService } from './a2aHistoryService.js';
import {
  a2aStreamEventEmitter,
  type TaskState,
} from './a2aStreamEvents.js';
import { v4 as uuidv4 } from 'uuid';
// Import A2A SDK types from main module
import type { MessageSendParams } from '@a2a-js/sdk';
// Note: A2AClient is from @a2a-js/sdk/client but requires agent card discovery
// We implement direct fetch-based calls for more control over authentication

declare const process: any;

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
      contextId: {
        type: 'string',
        description: 'Context ID for continuing a conversation (A2A standard)',
      },
      taskId: {
        type: 'string',
        description: 'Task ID for continuing an existing task (A2A standard)',
      },
      stream: {
        type: 'boolean',
        description: 'Enable streaming response (default: false, streaming is only useful for web frontend real-time updates)',
        default: false,
      }
    },
    required: ['agentUrl', 'message'],
  },
} as const;

/**
 * Call external A2A agent tool handler
 *
 * Validates agent URL against project allowlist, then makes HTTP call
 * using @a2a-js/sdk A2AClient. Returns structured response with success/error status.
 *
 * @param input - Tool input parameters
 * @param projectId - Project ID for allowlist validation
 * @returns Structured response with success/error status
 */
export async function callExternalAgent(
  input: CallExternalAgentInput,
  projectId: string
): Promise<CallExternalAgentOutput> {
  // Default stream to false - streaming is only useful for web frontend real-time updates
  // When called via MCP SDK tool, the caller should explicitly set stream based on channel context
  const { agentUrl, message, useTask = false, stream = false, timeout: inputTimeout } = input;
  const timeout = inputTimeout || 600000; // Use provided timeout or default to 10 minutes

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

    // Step 3: Make HTTP call to external agent using A2A SDK
    if (useTask) {
      // Async task mode - uses tasks endpoint
      const taskResult = await callExternalAgentTask(agentUrl, message, apiKey, timeout);
      return taskResult;
    } else {
      // Message mode (Sync or Streaming)
      // Generate a unique session ID for tracking this interaction
      const sessionId = uuidv4();

      // Use A2A standard streaming if requested
      const messageResult = await callExternalAgentMessage(
        agentUrl,
        message,
        apiKey,
        timeout,
        sessionId,
        stream,
        projectId,
        input.contextId,
        input.taskId
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
 * Build messages endpoint URL with smart format detection
 * 
 * Supports both standard A2A format and non-standard formats:
 * - Standard: `http://host/agent-id` → `http://host/agent-id/messages`
 * - Non-standard: `http://host/messages/project-id` → `http://host/messages/project-id` (no change)
 * 
 * @param agentUrl - Base agent URL
 * @param stream - Whether to add stream query parameter
 * @returns Complete messages endpoint URL
 */
function buildMessagesUrl(agentUrl: string, stream: boolean): string {
  // Check if URL already contains /messages path
  if (agentUrl.includes('/messages/') || agentUrl.endsWith('/messages')) {
    // Already a complete messages endpoint (non-standard format), use as-is
    return stream ? `${agentUrl}?stream=true` : agentUrl;
  }
  
  // Standard A2A format: append /messages
  const base = agentUrl.endsWith('/') ? agentUrl.slice(0, -1) : agentUrl;
  return stream ? `${base}/messages?stream=true` : `${base}/messages`;
}

/**
 * Call external agent with message using A2A SDK (message/send or message/stream)
 * 
 * Uses A2A standard protocol:
 * - For streaming: Uses message/stream endpoint via A2AClient.sendMessageStream()
 * - Returns A2A standard events: Message, Task, TaskStatusUpdateEvent, TaskArtifactUpdateEvent
 */
async function callExternalAgentMessage(
  agentUrl: string,
  message: string,
  apiKey: string,
  timeout: number,
  sessionId: string,
  stream: boolean,
  projectId: string,
  contextId?: string,
  taskId?: string
): Promise<CallExternalAgentOutput> {
  const workingDirectory = projectId.startsWith('/') ? projectId : process.cwd();

  try {
    // Build A2A standard message params
    const messageParams: MessageSendParams = {
      message: {
        kind: 'message',
        messageId: uuidv4(),
        role: 'user',
        parts: [{ kind: 'text', text: message }],
        contextId,
        taskId,
      },
      configuration: {
        acceptedOutputModes: ['text/plain', 'application/json'],
      },
    };

    if (stream) {
      // Use A2A streaming with fetch-based SSE (since A2AClient requires agent card)
      return await callExternalAgentStreamFetch(
        agentUrl,
        messageParams,
        apiKey,
        timeout,
        sessionId,
        workingDirectory
      );
    } else {
      // Use sync call with fetch
      return await callExternalAgentSyncFetch(
        agentUrl,
        messageParams,
        apiKey,
        timeout,
        sessionId,
        workingDirectory
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Error calling external agent: ${errorMessage}`,
    };
  }
}

/**
 * Call external agent with streaming using fetch-based SSE
 * Implements A2A message/stream protocol manually since A2AClient requires agent card
 */
async function callExternalAgentStreamFetch(
  agentUrl: string,
  messageParams: MessageSendParams,
  apiKey: string,
  timeout: number,
  sessionId: string,
  workingDirectory: string
): Promise<CallExternalAgentOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Extract text message from parts
  const textMessage = messageParams.message.parts
    .filter((p): p is { kind: 'text'; text: string } => p.kind === 'text')
    .map(p => p.text)
    .join('');

  // Build request body matching server's expected format
  const requestBody = {
    message: textMessage,
    sessionId: messageParams.message.contextId || undefined,
  };

  // Emit stream start event
  a2aStreamEventEmitter.emitStreamStart({
    sessionId,
    projectId: workingDirectory,
    agentUrl,
    message: textMessage,
    contextId: messageParams.message.contextId,
    taskId: messageParams.message.taskId,
  });

  try {
    // Build messages URL with smart format detection
    const messagesUrl = buildMessagesUrl(agentUrl, true);

    const response = await fetch(messagesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      a2aStreamEventEmitter.emitStreamEnd({
        sessionId,
        projectId: workingDirectory,
        success: false,
        error: `HTTP ${response.status}: ${(errorData as any).error || response.statusText}`,
      });
      return {
        success: false,
        error: `External agent returned ${response.status}: ${(errorData as any).error || response.statusText}`,
      };
    }

    if (!response.body) {
      a2aStreamEventEmitter.emitStreamEnd({
        sessionId,
        projectId: workingDirectory,
        success: false,
        error: 'No response body',
      });
      return {
        success: false,
        error: 'No response body from external agent',
      };
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let collectedText = '';
    let finalContextId: string | undefined;
    let finalTaskId: string | undefined;
    let finalState: TaskState | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const event = JSON.parse(dataStr);

              // Check for error event
              if (event.type === 'error') {
                const errorMsg = event.error || 'Unknown error';
                a2aStreamEventEmitter.emitStreamEnd({
                  sessionId,
                  projectId: workingDirectory,
                  success: false,
                  error: errorMsg,
                });
                return {
                  success: false,
                  error: errorMsg,
                };
              }

              // Check for done event
              if (event.type === 'done') {
                continue; // Will be handled at end of stream
              }

              // Store event in history
              await a2aHistoryService.appendEvent(workingDirectory, sessionId, event);

              // Emit stream data event for frontend
              a2aStreamEventEmitter.emitStreamData({
                sessionId,
                projectId: workingDirectory,
                agentUrl,
                event,
              });

              // Get sessionId from event if available
              if (event.sessionId) {
                finalContextId = event.sessionId;
              }

              // Process SDK message event based on type
              switch (event.type) {
                case 'assistant': {
                  // SDK assistant message: { type: 'assistant', message: { role: 'user', content: [...] } }
                  if (event.message?.content) {
                    for (const block of event.message.content) {
                      if (block.type === 'text') {
                        collectedText += block.text;
                      }
                    }
                  }
                  break;
                }
                case 'result': {
                  // Result event indicates completion
                  const isError = event.subtype === 'error' || event.is_error;
                  if (!isError) {
                    finalState = 'completed';
                  } else {
                    finalState = 'failed';
                  }
                  break;
                }
                case 'system': {
                  // System init event contains sessionId
                  if (event.sessionId) {
                    finalContextId = event.sessionId;
                  }
                  break;
                }
                case 'user': {
                  // Tool result events - extract text if available
                  if (event.message?.content) {
                    for (const block of event.message.content) {
                      if (block.type === 'tool_result' && typeof block.content === 'string') {
                        // Tool results can be included in response
                        // collectedText += block.content;
                      }
                    }
                  }
                  break;
                }
              }
            } catch (parseError) {
              // Ignore parse errors for partial data
              console.warn('[A2A Client Tool] Parse error in SSE:', parseError);
            }
          }
        }
      }
    } catch (streamError) {
      console.error('[A2A Client Tool] Error reading stream:', streamError);
      a2aStreamEventEmitter.emitStreamEnd({
        sessionId,
        projectId: workingDirectory,
        success: false,
        error: streamError instanceof Error ? streamError.message : String(streamError),
        finalState,
      });
      return {
        success: false,
        error: `Stream error: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
      };
    }

    // Stream completed normally
    a2aStreamEventEmitter.emitStreamEnd({
      sessionId,
      projectId: workingDirectory,
      success: true,
      finalState: finalState || 'completed',
    });

    return {
      success: true,
      data: collectedText || 'Streaming completed',
      sessionId,
      contextId: finalContextId,
      taskId: finalTaskId,
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      a2aStreamEventEmitter.emitStreamEnd({
        sessionId,
        projectId: workingDirectory,
        success: false,
        error: 'Timeout',
      });
      return {
        success: false,
        error: `External agent call timed out after ${timeout}ms`,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    a2aStreamEventEmitter.emitStreamEnd({
      sessionId,
      projectId: workingDirectory,
      success: false,
      error: errorMessage,
    });
    return {
      success: false,
      error: `Network error calling external agent: ${errorMessage}`,
    };
  }
}

/**
 * Call external agent with sync message using fetch
 * Implements A2A message/send protocol
 */
async function callExternalAgentSyncFetch(
  agentUrl: string,
  messageParams: MessageSendParams,
  apiKey: string,
  timeout: number,
  sessionId: string,
  workingDirectory: string
): Promise<CallExternalAgentOutput> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Extract text message from parts
  const textMessage = messageParams.message.parts
    .filter((p): p is { kind: 'text'; text: string } => p.kind === 'text')
    .map(p => p.text)
    .join('');

  // Build request body matching server's expected format
  const requestBody = {
    message: textMessage,
    sessionId: messageParams.message.contextId || undefined,
  };

  try {
    // Build messages URL with smart format detection
    const messagesUrl = buildMessagesUrl(agentUrl, false);

    const response = await fetch(messagesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        error: `External agent returned ${response.status}: ${(errorData as any).error || response.statusText}`,
      };
    }

    const responseData = await response.json();

    // Check for error in response
    if (responseData.error) {
      return {
        success: false,
        error: responseData.error.message || responseData.error || 'Unknown error',
      };
    }

    // Server returns: { sessionId, message, duration_ms }
    // Store in history as a simple message event
    const historyEvent = {
      kind: 'message' as const,
      role: 'assistant' as const,
      messageId: sessionId,
      parts: [{ kind: 'text' as const, text: responseData.message || '' }],
    };
    await a2aHistoryService.appendEvent(workingDirectory, sessionId, historyEvent);

    return {
      success: true,
      data: responseData.message || 'Message processed',
      sessionId: responseData.sessionId || sessionId,
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
