import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentStore } from '../../stores/useAgentStore';
import { tabManager } from '../../utils/tabManager';

export interface UseAIStreamHandlerProps {
  currentSessionId: string | null;
  onSessionChange?: (sessionId: string | null) => void;
  setIsInitializingSession: (init: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setIsNewSession: (isNew: boolean) => void;
  setAiTyping: (typing: boolean) => void;
  setHasSuccessfulResponse: (success: boolean) => void;
  agentId: string;
  mcpStatus: any;
  updateMcpStatus: (status: any) => void;
}

export const useAIStreamHandler = ({
  currentSessionId,
  onSessionChange,
  setIsInitializingSession,
  setCurrentSessionId,
  setIsNewSession,
  setAiTyping,
  setHasSuccessfulResponse,
  agentId,
  mcpStatus,
  updateMcpStatus
}: UseAIStreamHandlerProps) => {
  const { t } = useTranslation('components');
  const queryClient = useQueryClient();
  const { addMessage, addTextPartToMessage, addThinkingPartToMessage, addToolPartToMessage, updateToolPartInMessage } = useAgentStore();
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

    // Handle error messages
    if (eventData.type === 'error') {
      console.error('Claude Code SDK error:', eventData);
      setAiTyping(false);
      setIsInitializingSession(false);
      
      let errorMessage = `${t('agentChat.errorMessages.claudeCodeSDKError')}\\n\\n`;
      
      if (eventData.error === 'Claude Code SDK failed' && eventData.message && typeof eventData.message === 'string') {
        if (eventData.message.includes('not valid JSON')) {
          errorMessage += t('agentChatPanel.errors.jsonParseError');
        } else if (eventData.message.includes('timeout')) {
          errorMessage += t('agentChatPanel.errors.timeoutError');
        } else {
          errorMessage += `${eventData.message}\\n\\n**${t('agentChatPanel.errors.suggestedActions')}**\\n- ${t('agentChatPanel.errors.resendMessage')}\\n- ${t('agentChatPanel.errors.refreshPage')}`;
        }
      } else {
        errorMessage += `${eventData.error || t('agentChatPanel.errors.unknownError')}\\n\\n**${t('agentChatPanel.errors.suggestedActions')}**\\n- ${t('agentChatPanel.errors.resendMessage')}\\n- ${t('agentChatPanel.errors.refreshPage')}`;
      }
      
      if (!aiMessageIdRef.current) {
        addMessage({
          content: errorMessage,
          role: 'assistant'
        });
      } else {
        addTextPartToMessage(aiMessageIdRef.current, '\\n\\n' + errorMessage);
      }
      return;
    }

    // Handle session initialization
    if (eventData.type === 'system' && eventData.subtype === 'init' && (eventData.sessionId || eventData.session_id)) {
      const newSessionId = eventData.sessionId || eventData.session_id;
      setIsInitializingSession(false);
      
      if (!currentSessionId && newSessionId) {
        setCurrentSessionId(newSessionId);
        setIsNewSession(true);
        if (onSessionChange) {
          onSessionChange(newSessionId);
        }
        queryClient.invalidateQueries({ queryKey: ['agent-sessions', agentId] });
      }
      return;
    }

    // Handle MCP status events
    if (eventData.type === 'mcp_status') {
      if (eventData.subtype === 'connection_failed') {
        const failedServers = (eventData as any).failedServers || [];
        console.warn('🚨 MCP服务器连接失败:', failedServers);
        
        updateMcpStatus({
          hasError: true,
          lastError: `连接失败: ${failedServers.join(', ')}`,
          connectedServers: mcpStatus.connectedServers,
          failedServers,
          timestamp: new Date().toISOString()
        });
      } else if (eventData.subtype === 'connection_success') {
        const connectedServers = (eventData as any).connectedServers || [];
        updateMcpStatus({
          hasError: false,
          lastError: null,
          connectedServers,
          failedServers: mcpStatus.failedServers,
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Handle session resume events
    if (eventData.type === 'session' && eventData.subtype === 'resume') {
      const resumeData = (eventData as any).resume;
      if (resumeData?.newSessionId && resumeData?.originalSessionId) {
        if (resumeData.originalSessionId === currentSessionId) {
          setCurrentSessionId(resumeData.newSessionId);
          if (onSessionChange) {
            onSessionChange(resumeData.newSessionId);
          }
          queryClient.invalidateQueries({ queryKey: ['agent-sessions', agentId] });
          tabManager.setupWakeupListener(agentId, resumeData.newSessionId);
        }
      }
      return;
    }

    // Handle assistant messages
    if (eventData.type === 'message') {
      if (!aiMessageIdRef.current && eventData.message) {
        const messageId = addMessage({
          role: 'assistant',
          content: '',
        });
        if (typeof messageId === 'string') {
          aiMessageIdRef.current = messageId;
        }
      }

      if (aiMessageIdRef.current && eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content) {
        for (const block of eventData.message.content as Array<{ type: string; text?: string; thinking?: string; name?: string; id?: string; input?: any }>) {
          if (block.type === 'text' && block.text) {
            addTextPartToMessage(aiMessageIdRef.current, block.text);
          } else if (block.type === 'thinking' && block.thinking) {
            addThinkingPartToMessage(aiMessageIdRef.current, block.thinking);
          } else if (block.type === 'tool_use' && block.name) {
            const toolData = {
              toolName: block.name,
              toolInput: (block.input as Record<string, unknown>) || {},
              isExecuting: true,
              claudeId: block.id || ''
            };
            addToolPartToMessage(aiMessageIdRef.current, toolData);
          }
        }
      }
      return;
    }

    // Handle tool results
    if (eventData.type === 'user' && eventData.message && typeof eventData.message === 'object' && 'content' in eventData.message && eventData.message.content && aiMessageIdRef.current) {
      for (const block of eventData.message.content as Array<{ type: string; content?: unknown; is_error?: boolean; tool_use_id?: string }>) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          const state = useAgentStore.getState();
          let targetTool: any = null;
          let targetMessageId: string | null = null;
          
          for (const message of state.messages) {
            if (message.role === 'assistant' && message.messageParts) {
              for (const part of message.messageParts) {
                if (part.type === 'tool' && (part as any).claudeId === block.tool_use_id) {
                  targetTool = part;
                  targetMessageId = message.id;
                  break;
                }
              }
            }
            if (targetTool) break;
          }
          
          if (targetTool && targetMessageId) {
            const toolResult = typeof block.content === 'string' 
              ? block.content
              : JSON.stringify(block.content, null, 2);
            
            updateToolPartInMessage(targetMessageId, (targetTool as any).claudeId, {
              output: toolResult,
              isExecuting: false,
              isError: block.is_error || false
            } as any);
          }
        }
      }
    }
  }, [
    currentSessionId,
    onSessionChange,
    setIsInitializingSession,
    setCurrentSessionId,
    setIsNewSession,
    setAiTyping,
    agentId,
    mcpStatus,
    updateMcpStatus,
    queryClient,
    addMessage,
    addTextPartToMessage,
    addThinkingPartToMessage,
    addToolPartToMessage,
    updateToolPartInMessage,
    t
  ]);

  const onStreamComplete = useCallback(() => {
    if (aiMessageIdRef.current) {
      setHasSuccessfulResponse(true);
    }
    aiMessageIdRef.current = null;
  }, [setHasSuccessfulResponse]);

  return {
    handleStreamMessage,
    onStreamComplete
  };
};