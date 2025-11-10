import { useState, useCallback, RefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentStore } from '../../stores/useAgentStore';
import type { AgentConfig } from '../../types/index.js';

export interface UseSessionManagementProps {
  agent: AgentConfig;
  onSessionChange?: (sessionId: string | null) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export const useSessionManagement = ({
  agent,
  onSessionChange,
  textareaRef
}: UseSessionManagementProps) => {
  const queryClient = useQueryClient();
  const { setCurrentSessionId, clearMessages } = useAgentStore();

  const [showSessions, setShowSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSuccessfulResponse, setHasSuccessfulResponse] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // 切换会话
  const handleSwitchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSessions(false);
    // Set loading state for message loading
    setIsLoadingMessages(true);
    // Reset heartbeat states for resumed session
    setIsNewSession(false);
    setHasSuccessfulResponse(false); // 恢复会话时重置，等待检查存在性
    // Update URL with new session ID
    if (onSessionChange) {
      onSessionChange(sessionId);
    }
    // Clear messages first, then invalidate to trigger fresh load
    clearMessages();
    queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agent.id, sessionId] });
  }, [agent.id, clearMessages, onSessionChange, queryClient, setCurrentSessionId]);

  // 新建会话
  const handleNewSession = useCallback(() => {
    // Clear current session and messages
    setCurrentSessionId(null);
    clearMessages();
    setShowSessions(false);
    // Reset heartbeat states
    setIsNewSession(true);
    setHasSuccessfulResponse(false);
    // Update URL to remove session ID
    if (onSessionChange) {
      onSessionChange(null);
    }
    // Clear search term
    setSearchTerm('');
    // Focus on textarea after state updates
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [clearMessages, onSessionChange, setCurrentSessionId, textareaRef]);

  // 刷新消息
  const handleRefreshMessages = useCallback(() => {
    const { currentSessionId } = useAgentStore.getState();
    if (currentSessionId) {
      // Set loading state
      setIsLoadingMessages(true);
      // Clear messages first, then invalidate to trigger fresh load
      clearMessages();
      queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agent.id, currentSessionId] });
    }
  }, [agent.id, clearMessages, queryClient]);

  return {
    // State
    showSessions,
    searchTerm,
    hasSuccessfulResponse,
    isNewSession,
    isLoadingMessages,

    // Setters
    setShowSessions,
    setSearchTerm,
    setHasSuccessfulResponse,
    setIsNewSession,
    setIsLoadingMessages,

    // Actions
    handleSwitchSession,
    handleNewSession,
    handleRefreshMessages
  };
};
