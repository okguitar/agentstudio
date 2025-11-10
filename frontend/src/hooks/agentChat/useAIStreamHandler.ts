import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentStore } from '../../stores/useAgentStore';
import { tabManager } from '../../utils/tabManager';
import { eventBus, EVENTS } from '../../utils/eventBus';

export interface UseAIStreamHandlerProps {
  agentId: string;
  currentSessionId: string | null;
  projectPath?: string;
  isCompactCommand?: boolean;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  onSessionChange?: (sessionId: string | null) => void;
  setIsInitializingSession: (init: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setIsNewSession: (isNew: boolean) => void;
  setAiTyping: (typing: boolean) => void;
  setHasSuccessfulResponse: (success: boolean) => void;
}

export const useAIStreamHandler = ({
  agentId,
  currentSessionId,
  projectPath,
  isCompactCommand = false,
  abortControllerRef,
  onSessionChange,
  setIsInitializingSession,
  setCurrentSessionId,
  setIsNewSession,
  setAiTyping,
  setHasSuccessfulResponse,
}: UseAIStreamHandlerProps) => {
  const { t } = useTranslation('components');
  const queryClient = useQueryClient();
  const {
    addMessage,
    addTextPartToMessage,
    addThinkingPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    updateMcpStatus,
  } = useAgentStore();

  // Track current AI message ID
  const aiMessageIdRef = useRef<string | null>(null);

  const handleStreamMessage = useCallback((data: any) => {
    const eventData = data as {
      type: string;
      sessionId?: string;
      session_id?: string;
      subtype?: string;
      message?: { content: unknown[] } | string;
      permission_denials?: Array<{ tool_name: string; tool_input: Record<string, unknown> }>;
      error?: string;
    };

    // Handle direct error messages from Claude Code SDK
    if (eventData.type === 'error') {
      console.error('Claude Code SDK error:', eventData);
      setAiTyping(false);
      setIsInitializingSession(false);
      abortControllerRef.current = null;

      let errorMessage = `${t('agentChat.errorMessages.claudeCodeSDKError')}\n\n`;

      if (eventData.error === 'Claude Code SDK failed' && eventData.message && typeof eventData.message === 'string') {
        if (eventData.message.includes('not valid JSON')) {
          errorMessage += t('agentChatPanel.errors.jsonParseError');
        } else if (eventData.message.includes('timeout')) {
          errorMessage += t('agentChatPanel.errors.timeoutError');
        } else {
          errorMessage += `${eventData.message}\n\n**${t('agentChatPanel.errors.suggestedActions')}**\n- ${t('agentChatPanel.errors.resendMessage')}\n- ${t('agentChatPanel.errors.refreshPage')}`;
        }
      } else {
        errorMessage += `${eventData.error || t('agentChatPanel.errors.unknownError')}\n\n**${t('agentChatPanel.errors.suggestedActions')}**\n- ${t('agentChatPanel.errors.resendMessage')}\n- ${t('agentChatPanel.errors.refreshPage')}`;
      }

      // Add error message
      if (!aiMessageIdRef.current) {
        addMessage({
          content: errorMessage,
          role: 'assistant'
        });
      } else {
        addTextPartToMessage(aiMessageIdRef.current, '\n\n' + errorMessage);
      }
      return;
    }

    // Handle session initialization
    if (eventData.type === 'system' && eventData.subtype === 'init' && (eventData.sessionId || eventData.session_id)) {
      const newSessionId = eventData.sessionId || eventData.session_id;
      console.log('Setting session ID from AI response:', newSessionId);

      // 会话初始化完成，关闭初始化提示
      setIsInitializingSession(false);

      // Only set session ID if we don't have one (new session created by AI)
      if (!currentSessionId && newSessionId) {
        setCurrentSessionId(newSessionId);
        // This is a new session being created
        setIsNewSession(true);
        // Update URL with new session ID
        if (onSessionChange) {
          onSessionChange(newSessionId);
        }
        // Refresh sessions list when new session is created
        queryClient.invalidateQueries({ queryKey: ['agent-sessions', agentId] });
      }
      return;
    }

    // 🔧 处理 MCP 状态事件
    if (eventData.type === 'mcp_status') {
      console.log('📡 MCP Status Event:', eventData);

      if (eventData.subtype === 'connection_failed') {
        const failedServers = (eventData as any).failedServers || [];
        console.warn('🚨 MCP服务器连接失败:', failedServers);

        // 更新 MCP 状态到 store
        updateMcpStatus({
          hasError: true,
          connectionErrors: failedServers,
          lastError: `连接失败: ${failedServers.map((s: any) => s.name).join(', ')}`
        });
      } else if (eventData.subtype === 'connection_success') {
        const connectedServers = (eventData as any).connectedServers || [];
        console.log('✅ MCP服务器连接成功:', connectedServers.map((s: any) => s.name));

        // 更新 MCP 状态到 store
        updateMcpStatus({
          hasError: false,
          connectedServers: connectedServers,
          connectionErrors: [],
          lastError: null
        });
      }
      return;
    }

    // 🚨 处理 MCP 执行错误事件
    if (eventData.type === 'mcp_error') {
      console.log('❌ MCP Error Event:', eventData);

      if (eventData.subtype === 'execution_failed') {
        const errorData = eventData as any;
        const toolName = errorData.tool || '未知工具';
        const errorMessage = errorData.error || '执行失败';
        const details = errorData.details || '';

        console.error('❌ MCP工具执行失败:', { tool: toolName, error: errorMessage, details });

        // 更新 MCP 状态到 store
        updateMcpStatus({
          hasError: true,
          lastError: `工具执行失败: ${toolName} - ${errorMessage}`,
          lastErrorDetails: details
        });
      }
      return;
    }

    // Handle session resume notification
    if (eventData.type === 'session_resumed' && eventData.subtype === 'new_branch') {
      const resumeData = eventData as any as {
        originalSessionId: string;
        newSessionId: string;
        message: string;
        sessionId: string;
      };

      console.log('🔄 Session resumed with new branch:', resumeData);
      console.log('🔄 Updating session ID from', currentSessionId, 'to', resumeData.newSessionId);

      // 会话恢复完成，关闭初始化提示
      setIsInitializingSession(false);

      // Update session ID to the new one (this will trigger useAgentSessionMessages to reload history)
      setCurrentSessionId(resumeData.newSessionId);
      // This is a resumed session creating a new branch
      setIsNewSession(true); // 恢复会话创建新分支，视为新会话

      // Update URL with new session ID
      if (onSessionChange) {
        console.log('🔄 Updating URL with new session ID:', resumeData.newSessionId);
        onSessionChange(resumeData.newSessionId);
      }

      // Show session resume notification
      addMessage({
        content: `${t('agentChat.sessionResumed')}\n\n${resumeData.message}\n\n${t('agentChat.sessionIdUpdated')}`,
        role: 'assistant'
      });

      // Refresh sessions list to include the new session
      queryClient.invalidateQueries({ queryKey: ['agent-sessions', agentId] });

      // 🆕 TabManager 会话恢复处理
      if (currentSessionId && resumeData.originalSessionId && resumeData.newSessionId) {
        // 立即更新TabManager状态
        tabManager.handleSessionResume(
          agentId,
          resumeData.originalSessionId,
          resumeData.newSessionId
        );

        // 记录恢复事件以供智能监听使用
        tabManager.recordSessionResume(
          agentId,
          resumeData.originalSessionId,
          resumeData.newSessionId
        );

        console.log(`🎯 TabManager updated for session resume: ${resumeData.originalSessionId} → ${resumeData.newSessionId}`);
      }

      console.log('✅ Session resume handling complete');
      return;
    }

    // Handle Claude Code SDK initialization
    if (eventData.type === 'system' && eventData.subtype === 'init') {
      // Claude Code SDK initialization - silently initialize without showing message
      // Just ensure we have an AI message ID ready for when content starts coming
      return;
    }

    // Handle assistant messages
    if (eventData.type === 'assistant') {
      // Add AI message placeholder if not added yet
      if (!aiMessageIdRef.current) {
        const message = {
          content: '',
          role: 'assistant' as const
        };
        addMessage(message);
        // Get the ID of the message we just added
        const state = useAgentStore.getState();
        aiMessageIdRef.current = state.messages[state.messages.length - 1].id;
        console.log('📝 Created new AI message with ID:', aiMessageIdRef.current);
      }

      // Handle tool use and text content
      if (eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageIdRef.current) {
        console.log('📝 Processing assistant message content blocks:', eventData.message.content.length, 'aiMessageId:', aiMessageIdRef.current);
        for (const block of eventData.message.content as Array<{ type: string; text?: string; thinking?: string; name?: string; input?: unknown; id?: string }>) {
          console.log('📝 Processing block:', { type: block.type, hasText: !!block.text, hasThinking: !!block.thinking, textLength: block.text?.length, thinkingLength: block.thinking?.length, toolName: block.name });
          if (block.type === 'text') {
            // Add text as a separate part
            if (block.text) {
              console.log('📝 Adding text part:', block.text.substring(0, 100) + (block.text.length > 100 ? '...' : ''));
              // Check if this is a response to /compact command
              if (isCompactCommand) {
                console.log('📦 Detected /compact command response, adding as compactSummary');
                addTextPartToMessage(aiMessageIdRef.current, block.text);
              } else {
                addTextPartToMessage(aiMessageIdRef.current, block.text);
              }
            } else {
              console.warn('📝 Text block has no text content');
            }
          } else if (block.type === 'thinking') {
            // Add thinking as a separate part
            if (block.thinking) {
              console.log('🤔 Adding thinking part:', block.thinking.substring(0, 100) + (block.thinking.length > 100 ? '...' : ''));
              addThinkingPartToMessage(aiMessageIdRef.current, block.thinking);
            } else {
              console.warn('🤔 Thinking block has no thinking content');
            }
          } else if (block.type === 'tool_use') {
            // Add tool usage as a separate part
            if (block.name) {
              console.log('📝 Adding tool part:', block.name, 'id:', block.id);
              // Special logging for BashOutput
              if (block.name === 'BashOutput') {
                console.log('🐚 [BashOutput] Tool use detected, claudeId:', block.id, 'input:', block.input);
              }
              const toolData = {
                toolName: block.name,
                toolInput: (block.input as Record<string, unknown>) || {},
                isExecuting: true,
                claudeId: block.id // Store Claude's tool use ID for matching with results
              };
              addToolPartToMessage(aiMessageIdRef.current, toolData);
            }
          } else {
            console.log('📝 Unknown block type:', block.type);
          }
        }
      } else {
        console.warn('📝 No content or aiMessageId for assistant message:', {
          hasMessage: !!eventData.message,
          hasContent: !!(eventData.message as any)?.content,
          aiMessageId: aiMessageIdRef.current
        });
      }
      return;
    }

    // Handle tool results from user messages
    if (eventData.type === 'user') {
      // Tool results
      if (eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageIdRef.current) {
        for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean; tool_use_id?: string }>) {
          if (block.type === 'tool_result' && block.tool_use_id) {
            console.log('🔧 Processing tool_result for tool_use_id:', block.tool_use_id, 'content:', block.content);
            // Find the tool by tool_use_id - search across ALL messages, not just current
            const state = useAgentStore.getState();
            let targetTool: any = null;
            let targetMessageId: string | null = null;

            // Search through all messages to find the tool with matching claudeId
            for (const message of state.messages) {
              if (message.messageParts) {
                const foundTool = message.messageParts.find((part: any) =>
                  part.type === 'tool' && part.toolData?.claudeId === block.tool_use_id
                );
                if (foundTool) {
                  targetTool = foundTool;
                  targetMessageId = message.id;
                  break;
                }
              }
            }

            console.log('🔧 Found target tool:', {
              toolData: targetTool?.toolData,
              messageId: targetMessageId,
              currentMessageId: aiMessageIdRef.current
            });

            if (targetTool?.toolData && targetMessageId) {
              // Update the corresponding tool with results
              const toolResult = typeof block.content === 'string'
                ? block.content
                : Array.isArray(block.content)
                  ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                  : JSON.stringify(block.content);

              console.log('🔧 Updating tool with result, setting isExecuting: false');
              // Special logging for BashOutput
              if (targetTool.toolData.toolName === 'BashOutput') {
                console.log('🐚 [BashOutput] Updating tool result:', {
                  toolId: targetTool.toolData.id,
                  messageId: targetMessageId,
                  toolResult: toolResult?.substring(0, 200),
                  rawContent: block.content
                });
              }
              updateToolPartInMessage(targetMessageId, targetTool.toolData.id, {
                toolResult,
                isError: block.is_error || false,
                isExecuting: false
              });
            } else {
              console.warn('🔧 No target tool found for tool_use_id:', block.tool_use_id);
              // Log all available tools for debugging
              const allTools = state.messages.flatMap(m =>
                (m.messageParts || [])
                  .filter((p: any) => p.type === 'tool')
                  .map((p: any) => ({
                    claudeId: p.toolData?.claudeId,
                    toolName: p.toolData?.toolName,
                    isExecuting: p.toolData?.isExecuting
                  }))
              );
              console.warn('🔧 Available tools:', allTools);
            }
          }
        }
      }
      return;
    }

    // Also check for tool results in assistant messages (alternative path)
    if (eventData.type === 'assistant' && eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageIdRef.current) {
      for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean; tool_use_id?: string }>) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          console.log('🔧 Processing tool_result in assistant message for tool_use_id:', block.tool_use_id);
          // Find the tool by tool_use_id - search across ALL messages, not just current
          const state = useAgentStore.getState();
          let targetTool: any = null;
          let targetMessageId: string | null = null;

          // Search through all messages to find the tool with matching claudeId
          for (const message of state.messages) {
            if (message.messageParts) {
              const foundTool = message.messageParts.find((part: any) =>
                part.type === 'tool' && part.toolData?.claudeId === block.tool_use_id
              );
              if (foundTool) {
                targetTool = foundTool;
                targetMessageId = message.id;
                break;
              }
            }
          }

          console.log('🔧 Found target tool in assistant message:', {
            toolData: targetTool?.toolData,
            messageId: targetMessageId,
            currentMessageId: aiMessageIdRef.current
          });

          if (targetTool?.toolData && targetMessageId) {
            // Update the corresponding tool with results
            const toolResult = typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? block.content.map((c: { text?: string }) => c.text || String(c)).join('')
                : JSON.stringify(block.content);

            console.log('🔧 Updating tool with result in assistant message, setting isExecuting: false');
            updateToolPartInMessage(targetMessageId, targetTool.toolData.id, {
              toolResult,
              isError: block.is_error || false,
              isExecuting: false
            });
          } else {
            console.warn('🔧 No target tool found for tool_use_id in assistant message:', block.tool_use_id);
          }
        }
      }
      return;
    }

    // Handle result events
    if (eventData.type === 'result') {
      console.log('Received result event:', { subtype: eventData.subtype, isSideChain: (eventData as any).isSideChain });

      // 只有主任务结束才停止 AI 输入状态（检查 isSideChain）
      const isSideChain = (eventData as any).isSideChain;
      if (!isSideChain) {
        console.log('Main task result received, stopping AI typing...');
        // Clear the abort controller and immediately stop typing
        abortControllerRef.current = null;
        setAiTyping(false);

        // Mark as successful response if result is successful
        if (eventData.subtype === 'success') {
          setHasSuccessfulResponse(true);
          console.log('✅ Marked session as having successful response for heartbeat');

          // 发送AI回复完成事件，通知其他组件刷新
          eventBus.emit(EVENTS.AI_RESPONSE_COMPLETE, {
            agentId: agentId,
            sessionId: currentSessionId,
            projectPath
          });
          console.log('📡 Emitted AI_RESPONSE_COMPLETE event');
        }
      } else {
        console.log('Side chain result received, continuing main task...');
      }

      // 只有主任务结束才处理最终消息（非 side chain）
      if (!isSideChain) {
        // If no AI message was created yet (e.g., only result event received), create one now
        if (!aiMessageIdRef.current && eventData.subtype === 'success') {
          console.log('📝 Creating AI message from result event - no assistant messages received');
          const resultContent = (eventData as any).result;
          if (resultContent && typeof resultContent === 'string') {
            const message = {
              content: '',
              role: 'assistant' as const
            };
            addMessage(message);
            // Get the ID of the message we just added
            const state = useAgentStore.getState();
            aiMessageIdRef.current = state.messages[state.messages.length - 1].id;

            // Add the result content as text
            if (aiMessageIdRef.current) {
              addTextPartToMessage(aiMessageIdRef.current, resultContent);
            }
            console.log('📝 Added result content to new AI message:', resultContent.substring(0, 100));
          } else {
            console.warn('📝 Result event with no content - creating empty success message');
            const message = {
              content: t('agentChat.taskComplete'),
              role: 'assistant' as const
            };
            addMessage(message);
            const state = useAgentStore.getState();
            aiMessageIdRef.current = state.messages[state.messages.length - 1].id;
          }
        }

        // Ensure all executing tools are marked as completed
        if (aiMessageIdRef.current) {
          const state = useAgentStore.getState();
          const currentMessage = state.messages.find(m => m.id === aiMessageIdRef.current);
          if (currentMessage?.messageParts) {
            currentMessage.messageParts.forEach((part: any) => {
              if (part.type === 'tool' && part.toolData?.isExecuting) {
                console.log('Force completing tool:', part.toolData.toolName, 'claudeId:', part.toolData.claudeId);
                updateToolPartInMessage(aiMessageIdRef.current!, part.toolData.id, {
                  isExecuting: false,
                  toolResult: part.toolData.toolResult || t('agentChat.executionCompleted')
                });
              }
            });
          }
        }

        // Handle different result types
        let finalMessage = '';
        if (eventData.subtype === 'success') {
          finalMessage = '';
        } else if (eventData.subtype === 'error_max_turns') {
          finalMessage = `\n\n${t('agentChat.maxTurnsReached')}`;
          if (eventData.permission_denials && eventData.permission_denials.length > 0) {
            finalMessage += `\n\n${t('agentChat.permissionDenials')}`;
            eventData.permission_denials.forEach((denial: { tool_name: string; tool_input: Record<string, unknown> }, index: number) => {
              finalMessage += `\n${index + 1}. ${denial.tool_name}: \`${denial.tool_input.command || denial.tool_input.description || JSON.stringify(denial.tool_input)}\``;
            });
            finalMessage += `\n\n${t('agentChat.permissionNote')}`;
          }
        } else if (eventData.subtype === 'error_during_execution') {
          finalMessage = `\n\n${t('agentChat.executionError')}`;
        } else if (eventData.subtype === 'error') {
          // Generic error case
          finalMessage = `\n\n${t('agentChat.processingError')}`;
        } else {
          finalMessage = `\n\n${t('agentChat.processingComplete')}`;
        }

        // Update final message content
        if (aiMessageIdRef.current && finalMessage) {
          addTextPartToMessage(aiMessageIdRef.current, finalMessage);
        }

        // Refresh sessions list only if we had a session (don't refresh on new session creation)
        if (currentSessionId) {
          queryClient.invalidateQueries({ queryKey: ['agent-sessions', agentId] });
        }
      }
      return;
    }
  }, [
    agentId,
    currentSessionId,
    projectPath,
    isCompactCommand,
    abortControllerRef,
    onSessionChange,
    setIsInitializingSession,
    setCurrentSessionId,
    setIsNewSession,
    setAiTyping,
    setHasSuccessfulResponse,
    t,
    queryClient,
    addMessage,
    addTextPartToMessage,
    addThinkingPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    updateMcpStatus,
  ]);

  const handleStreamError = useCallback((error: unknown) => {
    console.error('SSE error:', error);
    setAiTyping(false);
    setIsInitializingSession(false);
    abortControllerRef.current = null;

    // Check if error is due to user cancellation
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Request was aborted by user');
      return;
    }

    // Determine specific error message
    let errorMessage = t('agentChat.genericError');

    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = t('agentChatPanel.errors.networkError');
      } else if (error.message.includes('timeout')) {
        errorMessage = t('agentChatPanel.errors.requestTimeout');
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = t('agentChatPanel.errors.rateLimit');
      } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        errorMessage = t('agentChatPanel.errors.unauthorized');
      } else if (error.message.includes('forbidden') || error.message.includes('403')) {
        errorMessage = t('agentChatPanel.errors.forbidden');
      } else if (error.message.includes('500') || error.message.includes('internal server')) {
        errorMessage = t('agentChatPanel.errors.internalServerError');
      } else {
        errorMessage = `❌ **${t('agentChatPanel.errors.processingError')}**\n\n${error.message || t('agentChatPanel.errors.unknownErrorRetry')}`;
      }
    }

    // Add error message if no AI message was created yet
    if (!aiMessageIdRef.current) {
      addMessage({
        content: errorMessage,
        role: 'assistant'
      });
    } else {
      // Update existing message with error
      addTextPartToMessage(aiMessageIdRef.current, '\n\n' + errorMessage);
    }
  }, [abortControllerRef, setAiTyping, setIsInitializingSession, t, addMessage, addTextPartToMessage]);

  // Reset AI message ID when starting new message
  const resetMessageId = useCallback(() => {
    aiMessageIdRef.current = null;
  }, []);

  return {
    handleStreamMessage,
    handleStreamError,
    resetMessageId,
  };
};
