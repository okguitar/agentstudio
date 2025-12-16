import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import { useSearchParams } from 'react-router-dom';
import { SubAgentMessageFlow } from './SubAgentMessageFlow';
import type { SubAgentMessage, SubAgentMessagePart } from './types';
import type { BaseToolExecution } from './sdk-types';
import { useAgentStore } from '../../stores/useAgentStore';
import { useAuthStore } from '../../stores/authStore';
import { useBackendServices } from '../../hooks/useBackendServices';
import {
  Network,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  Package
} from 'lucide-react';

/**
 * A2A Call Tool Props Interface
 */
interface A2ACallToolProps {
  execution: BaseToolExecution;
}

/**
 * A2A Call Tool Input Interface
 */
interface A2ACallInput {
  agentUrl: string;
  agentName?: string;
  message: string;
  useTask?: boolean;
  timeout?: number;
  sessionId?: string;
  contextId?: string;  // A2A standard
  taskId?: string;     // A2A standard
}

/**
 * A2A Call Tool Result Interface
 * Note: Backend may return `data` as a string (streaming response) or object (sync/task response)
 */
interface A2ACallResult {
  success: boolean;
  data?: string | {
    response?: string;
    taskId?: string;
    status?: string;
    metadata?: Record<string, any>;
    checkUrl?: string;
  };
  error?: string;
  taskId?: string;
  contextId?: string;  // A2A standard
  status?: string;
  sessionId?: string;
}

/**
 * A2A Standard Protocol Types
 */
interface A2APart {
  kind: 'text' | 'file' | 'data';
  text?: string;
  file?: { uri?: string; bytes?: string; mimeType?: string; name?: string };
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// A2A Message type (kept for future use with full A2A standard streaming)
// interface A2AMessage {
//   kind: 'message';
//   messageId: string;
//   role: 'agent' | 'user';
//   parts: A2APart[];
//   contextId?: string;
//   taskId?: string;
//   metadata?: Record<string, unknown>;
// }

// A2A Task Status type (kept for future use with full A2A Task protocol)
// interface A2ATaskStatus {
//   state: string;  // submitted, working, input-required, completed, canceled, failed, rejected, auth-required, unknown
//   message?: A2AMessage;
//   timestamp?: string;
// }

interface A2AArtifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: A2APart[];
  metadata?: Record<string, unknown>;
}

// A2A Task-related types (kept for future use with full A2A Task protocol)
// interface A2ATask {
//   kind: 'task';
//   id: string;
//   contextId: string;
//   status: A2ATaskStatus;
//   artifacts?: A2AArtifact[];
//   history?: A2AMessage[];
//   metadata?: Record<string, unknown>;
// }
// 
// interface A2ATaskStatusUpdateEvent {
//   kind: 'status-update';
//   taskId: string;
//   contextId: string;
//   status: A2ATaskStatus;
//   final: boolean;
//   metadata?: Record<string, unknown>;
// }
// 
// interface A2ATaskArtifactUpdateEvent {
//   kind: 'artifact-update';
//   taskId: string;
//   contextId: string;
//   artifact: A2AArtifact;
//   append?: boolean;
//   lastChunk?: boolean;
//   metadata?: Record<string, unknown>;
// }

/**
 * Helper to extract text content from A2A parts
 */
const extractTextFromParts = (parts: A2APart[]): string => {
  return parts
    .filter((part): part is A2APart & { kind: 'text'; text: string } => part.kind === 'text' && !!part.text)
    .map(part => part.text)
    .join('');
};

/**
 * Helper to extract response text from result.data (handles both string and object formats)
 */
const getResponseFromData = (data: A2ACallResult['data']): string | undefined => {
  if (typeof data === 'string') {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    return data.response;
  }
  return undefined;
};

/**
 * Extract agent name from A2A URL
 */
const extractAgentName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check if hostname is an IP address (v4 or v6)
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);

    if (isIp) {
      return hostname;
    }

    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0];
    }
    return hostname;
  } catch {
    const match = url.match(/\/([^/]+)$/);
    return match ? match[1] : url;
  }
};

/**
 * Check if a task state is terminal (kept for future use with A2A Task protocol)
 */
// const isTerminalState = (state: string): boolean => {
//   return ['completed', 'failed', 'canceled', 'rejected'].includes(state);
// };

/**
 * A2A Call Tool Component
 * Supports A2A standard protocol streaming events (Message, Task, TaskStatusUpdateEvent, TaskArtifactUpdateEvent)
 */
export const A2ACallTool: React.FC<A2ACallToolProps> = ({ execution }) => {
  const { t } = useTranslation();
  const input = execution.toolInput as unknown as A2ACallInput;

  // Parse tool result
  let result: A2ACallResult | undefined;
  if (execution.toolResult) {
    const hasError = execution.isError === true;
    
    if (hasError) {
      result = {
        success: false,
        error: execution.toolResult
      };
    } else {
      const toolResultText = execution.toolResult;
      let extractedSessionId: string | undefined;
      
      // Try to extract session ID from the response
      const sessionIdMatch = toolResultText.match(/\[System\] Session ID: ([a-f0-9-]+)/);
      if (sessionIdMatch) {
        extractedSessionId = sessionIdMatch[1];
      }
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(toolResultText);
        if (typeof parsed === 'object' && parsed !== null) {
          result = {
            success: parsed.success !== false,
            data: parsed.data || parsed.response || toolResultText,
            sessionId: parsed.sessionId || extractedSessionId,
            contextId: parsed.contextId,
            taskId: parsed.taskId,
            error: parsed.error
          };
        } else {
          result = {
            success: true,
            data: toolResultText,
            sessionId: extractedSessionId
          };
        }
      } catch {
        result = {
          success: true,
          data: toolResultText,
          sessionId: extractedSessionId
        };
      }
    }
  }

  const agentName = input.agentName || extractAgentName(input.agentUrl);

  // Determine status
  const isPending = !result && !execution.toolResult;
  const isRunning = result?.status === 'running' || result?.status === 'pending';
  const isSuccess = result?.success === true || (Boolean(result?.data) && !result?.error);
  const isError = result?.success === false || Boolean(result?.error);

  // Status display helper
  const getStatusDisplay = (streaming: boolean, taskState?: string) => {
    if (streaming) {
      // Show task state if available
      if (taskState === 'working') {
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
          text: t('tools.a2a.working', 'Working')
        };
      }
      if (taskState === 'input-required') {
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
          text: t('tools.a2a.inputRequired', 'Input Required')
        };
      }
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        text: t('tools.a2a.streaming', 'Streaming...')
      };
    }
    if (isPending || isRunning) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        text: isRunning ? t('tools.a2a.running', 'Running') : t('tools.a2a.calling', 'Calling')
      };
    }
    if (taskState === 'completed' || (isSuccess && !isError)) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        text: t('tools.a2a.success', 'Success')
      };
    }
    if (taskState === 'failed' || taskState === 'rejected' || (isError && !isSuccess)) {
      return {
        icon: <XCircle className="w-4 h-4" />,
        className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
        text: t('tools.a2a.error', 'Failed')
      };
    }
    if (taskState === 'canceled') {
      return {
        icon: <XCircle className="w-4 h-4" />,
        className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-300 dark:border-gray-700',
        text: t('tools.a2a.canceled', 'Canceled')
      };
    }
    if (result) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        text: t('tools.a2a.success', 'Success')
      };
    }
    return {
      icon: <XCircle className="w-4 h-4" />,
      className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
      text: t('tools.a2a.error', 'Failed')
    };
  };

  // Subtitle for BaseToolComponent
  const getSubtitle = (streaming: boolean, taskState?: string) => {
    let subtitle = agentName;
    if (input.useTask) subtitle += ` • ${t('tools.a2a.asyncTask', 'Async Task')}`;

    if (taskState) {
      subtitle += ` • ${taskState}`;
    } else if (streaming) {
      subtitle += ` • ${t('tools.a2a.streaming', 'Streaming...')}`;
    } else if (isPending) {
      subtitle += ` • ${t('tools.a2a.calling', 'Calling...')}`;
    } else if (isRunning) {
      subtitle += ` • ${t('tools.a2a.running', 'Running...')}`;
    } else if (isError && !isSuccess) {
      subtitle += ` • ${t('tools.a2a.error', 'Failed')}`;
    } else if (isSuccess || result) {
      subtitle += ` • ${t('tools.a2a.success', 'Success')}`;
    }

    return subtitle;
  };

  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get('project');
  const [messageFlow, setMessageFlow] = React.useState<SubAgentMessage[]>([]);
  const [artifacts] = React.useState<A2AArtifact[]>([]); // Kept for future A2A Task protocol support
  const [isConnected, setIsConnected] = React.useState(false);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [currentTaskState] = React.useState<string | undefined>(); // Kept for future A2A Task protocol support

  // Get active A2A stream from store (real-time streaming)
  const activeStream = useAgentStore((state) => state.activeA2AStreams[input.agentUrl]);

  // Get the session ID
  const sessionId = activeStream?.sessionId || result?.sessionId || input.sessionId;


  // Sync isStreaming state with activeStream from store
  React.useEffect(() => {
    if (activeStream?.isStreaming === true) {
      setIsStreaming(true);
      setIsConnected(true);
    } else if (activeStream && activeStream.isStreaming === false) {
      // Stream has explicitly ended
      setIsStreaming(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStream?.isStreaming]);
  
  // When result has error, ensure isStreaming is false
  React.useEffect(() => {
    if (result?.error || execution.isError) {
      setIsStreaming(false);
    }
  }, [result?.error, execution.isError]);

  // Convert real-time events from activeStream to messageFlow
  // This provides real-time updates as events arrive from the backend
  React.useEffect(() => {
    if (!activeStream?.events || activeStream.events.length === 0) return;
    
    // Convert events to SubAgentMessages for real-time display
    const messages: SubAgentMessage[] = [];
    let currentMessage: SubAgentMessage | null = null;
    const toolUseMap = new Map<string, SubAgentMessagePart>();

    for (const event of activeStream.events) {
      if (event.type === 'system') {
        // System message - create new message card
        currentMessage = {
          id: `sys-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          messageParts: [{
            id: `sys-part-${Date.now()}`,
            type: 'text',
            content: `[System] Session ID: ${event.sessionId || 'N/A'}`,
            order: 0
          } as SubAgentMessagePart]
        };
        messages.push(currentMessage);
      } else if (event.type === 'assistant' && event.message?.content) {
        // Assistant message - create new message card
        currentMessage = {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          messageParts: []
        };
        messages.push(currentMessage);

        for (const block of event.message.content) {
          if (block.type === 'text') {
            currentMessage.messageParts.push({
              id: `text-${Date.now()}-${Math.random()}`,
              type: 'text',
              content: block.text || '',
              order: currentMessage.messageParts.length
            } as SubAgentMessagePart);
          } else if (block.type === 'tool_use') {
            const toolId = block.id || `tool-${Date.now()}`;
            const toolPart: SubAgentMessagePart = {
              id: toolId,
              type: 'tool',
              toolData: {
                id: toolId,
                toolName: block.name || 'unknown',
                toolInput: block.input || {},
                toolResult: undefined,
                isError: false
              },
              order: currentMessage.messageParts.length
            };
            currentMessage.messageParts.push(toolPart);
            if (block.id) {
              toolUseMap.set(block.id, toolPart);
            }
          }
        }
      } else if (event.type === 'user' && event.message?.content) {
        // User message with tool_result - update corresponding tool_use
        for (const block of event.message.content) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            const toolPart = toolUseMap.get(block.tool_use_id);
            if (toolPart && toolPart.toolData) {
              toolPart.toolData.toolResult = typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content);
              toolPart.toolData.isError = block.is_error || false;
            }
          }
        }
      }
    }

    // Only update if we have messages
    if (messages.length > 0) {
      setMessageFlow(messages);
    }
  }, [activeStream?.events]);


  // Get authentication token
  const { currentService } = useBackendServices();
  const { getToken } = useAuthStore();
  const authToken = currentService ? getToken(currentService.id)?.token : null;

  // Fetch history when we have a sessionId (non-streaming, per user's request)
  React.useEffect(() => {
    if (!sessionId || !projectPath) return;

    const fetchHistory = async () => {
      try {
        const encodedProjectPath = encodeURIComponent(projectPath);
        const url = `/api/a2a/history/${encodedProjectPath}/${sessionId}`;

        const response = await fetch(url, {
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });

        if (!response.ok) {
          console.error('Failed to fetch A2A history:', response.status);
          return;
        }

        const { history } = await response.json();
        setIsConnected(true);
        
        if (history && Array.isArray(history)) {
          // Convert JSONL history to SubAgentMessages
          // Each SDKMessage becomes a separate message card
          convertHistoryToMessageFlow(history);
        }
        
        // History loaded, streaming is done
        setIsStreaming(false);
      } catch (error) {
        console.error('Error fetching A2A history:', error);
        setIsConnected(false);
        setIsStreaming(false);
      }
    };

    fetchHistory();
  }, [sessionId, projectPath, authToken]);

  // Convert JSONL history records to SubAgentMessageFlow format
  // Each SDKMessage record is converted to a separate message part
  const convertHistoryToMessageFlow = (history: any[]) => {
    const messages: SubAgentMessage[] = [];
    let currentMessage: SubAgentMessage | null = null;
    const toolUseMap = new Map<string, SubAgentMessagePart>(); // Track tool_use parts by id

    for (const record of history) {
      if (record.type === 'system') {
        // System message - add as assistant info (since SubAgentMessage only supports 'user' | 'assistant')
        if (!currentMessage || currentMessage.role !== 'assistant') {
          currentMessage = {
            id: `sys-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            messageParts: []
          };
          messages.push(currentMessage);
        }
        currentMessage.messageParts.push({
          id: `sys-part-${Date.now()}`,
          type: 'text',
          content: `[System] Session ID: ${record.sessionId || 'N/A'}`,
          order: currentMessage.messageParts.length
        } as SubAgentMessagePart);
      } else if (record.type === 'assistant' && record.message?.content) {
        // Assistant message - create separate message for each content block
        if (!currentMessage || currentMessage.role !== 'assistant') {
          currentMessage = {
            id: record.sessionId || `assistant-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            messageParts: []
          };
          messages.push(currentMessage);
        }

        for (const block of record.message.content) {
          if (block.type === 'text') {
            // Text block - add as text part
            currentMessage.messageParts.push({
              id: `text-${Date.now()}-${Math.random()}`,
              type: 'text',
              content: block.text,
              order: currentMessage.messageParts.length
            } as SubAgentMessagePart);
          } else if (block.type === 'tool_use') {
            // Tool use block - add as tool part (waiting for result)
            const toolPart: SubAgentMessagePart = {
              id: block.id || `tool-${Date.now()}`,
              type: 'tool',
              toolData: {
                id: block.id,
                toolName: block.name,
                toolInput: block.input,
                toolResult: undefined,
                isError: false
              },
              order: currentMessage.messageParts.length
            };
            currentMessage.messageParts.push(toolPart);
            // Track this tool_use for later tool_result matching
            if (block.id) {
              toolUseMap.set(block.id, toolPart);
            }
          }
        }
      } else if (record.type === 'user' && record.message?.content) {
        // User message with tool_result - update the corresponding tool_use part
        for (const block of record.message.content) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            const toolPart = toolUseMap.get(block.tool_use_id);
            if (toolPart && toolPart.toolData) {
              // Update tool result
              toolPart.toolData.toolResult = typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content);
              toolPart.toolData.isError = block.is_error || false;
            }
          }
        }
      }
      // record.type === 'result' - Final result, no specific handling needed
    }

    setMessageFlow(messages);
  };


  const statusDisplay = getStatusDisplay(isStreaming, currentTaskState);

  return (
    <BaseToolComponent
      execution={execution}
      subtitle={getSubtitle(isStreaming, currentTaskState)}
      showResult={false}
      isMcpTool={true}
      hideToolName={false}
      customIcon={<Network className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
      overrideToolName="call_external_agent"
    >
      <div className="space-y-3">
        {/* Status and Input Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusDisplay.className}`}>
            {statusDisplay.icon}
            {statusDisplay.text}
          </div>

          {/* Agent URL */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-200">
            <span className="text-gray-500 dark:text-gray-400 mr-2">Agent:</span>
            <span className="break-all">{input.agentUrl}</span>
          </div>

          {/* Message */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
            <span className="text-gray-500 dark:text-gray-400 mr-2 block mb-1">Message:</span>
            <div className="whitespace-pre-wrap">{input.message}</div>
          </div>
        </div>

        {/* Streaming Connection Indicator */}
        {isConnected && (
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
            <div className="relative">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              {isStreaming && (
                <div className="absolute inset-0 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
              )}
            </div>
            <span>
              {isStreaming 
                ? currentTaskState 
                  ? `${t('tools.a2a.taskState', 'Task state')}: ${currentTaskState}` 
                  : t('tools.a2a.liveStreaming', 'Live streaming from external agent...') 
                : t('tools.a2a.connected', 'Connected to history stream')}
            </span>
          </div>
        )}

        {/* Streaming Content (SubAgentMessageFlow) */}
        {messageFlow.length > 0 && (
          <SubAgentMessageFlow
            taskPrompt={input.message}
            messageFlow={messageFlow}
            defaultExpanded={true}
          />
        )}

        {/* Artifacts Display */}
        {artifacts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Package className="w-4 h-4" />
              {t('tools.a2a.artifacts', 'Artifacts')} ({artifacts.length})
            </div>
            <div className="space-y-2">
              {artifacts.map(artifact => (
                <div 
                  key={artifact.artifactId}
                  className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    {artifact.name || artifact.artifactId}
                  </div>
                  {artifact.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{artifact.description}</p>
                  )}
                  <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-2 overflow-x-auto">
                    {extractTextFromParts(artifact.parts) || JSON.stringify(artifact.parts, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result Display (Fallback or Final Result) */}
        {result && !messageFlow.length && (
          <>
            {/* Response */}
            {getResponseFromData(result.data) && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Network className="w-4 h-4" />
                  {t('tools.a2a.response', 'Response')}
                </div>
                <pre className="bg-gray-900 text-green-400 rounded-lg px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap border dark:border-gray-700">
                  {getResponseFromData(result.data)}
                </pre>
              </div>
            )}

            {/* Error */}
            {result.error && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  {t('tools.a2a.error', 'Error')}
                </div>
                <pre className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                  {result.error}
                </pre>
              </div>
            )}

            {/* Metadata/Task Info */}
            {(result.taskId || result.contextId || (typeof result.data === 'object' && result.data?.metadata)) && (
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                {result.taskId && <div>Task ID: {result.taskId}</div>}
                {result.contextId && <div>Context ID: {result.contextId}</div>}
                {typeof result.data === 'object' && result.data?.metadata && (
                  <div>Metadata: {JSON.stringify(result.data.metadata)}</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </BaseToolComponent>
  );
};

export default A2ACallTool;
