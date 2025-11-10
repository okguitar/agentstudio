import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAgentStore } from '../../stores/useAgentStore';

export interface UseSessionManagerProps {
  agentId: string;
  currentSessionId: string | null;
  onSessionChange?: (sessionId: string | null) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export interface UseSessionManagerReturn {
  isLoadingMessages: boolean;
  isNewSession: boolean;
  hasSuccessfulResponse: boolean;
  setIsLoadingMessages: (loading: boolean) => void;
  setIsNewSession: (isNew: boolean) => void;
  setHasSuccessfulResponse: (success: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  handleSwitchSession: (sessionId: string) => void;
  handleNewSession: () => void;
  handleRefreshMessages: () => void;
}

/**
 * Hook for managing session-related state and operations
 * Handles session switching, creation, and message loading
 */
export const useSessionManager = ({
  agentId,
  currentSessionId,
  onSessionChange,
  textareaRef
}: UseSessionManagerProps): UseSessionManagerReturn => {
  const queryClient = useQueryClient();
  const { setCurrentSessionId, clearMessages } = useAgentStore();

  // Session state
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isNewSession, setIsNewSession] = useState(false);
  const [hasSuccessfulResponse, setHasSuccessfulResponse] = useState(false);

  /**
   * Switch to an existing session
   * Loads messages for the selected session
   */
  const handleSwitchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
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
    queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agentId, sessionId] });
  }, [agentId, onSessionChange, setCurrentSessionId, clearMessages, queryClient]);

  /**
   * Create a new session
   * Clears current session and messages
   */
  const handleNewSession = useCallback(() => {
    // Clear current session and messages
    setCurrentSessionId(null);
    clearMessages();
    // Reset heartbeat states
    setIsNewSession(true);
    setHasSuccessfulResponse(false);
    // Update URL to remove session ID
    if (onSessionChange) {
      onSessionChange(null);
    }
    // Focus on textarea after state updates
    setTimeout(() => {
      textareaRef?.current?.focus();
    }, 0);
  }, [onSessionChange, setCurrentSessionId, clearMessages, textareaRef]);

  /**
   * Refresh messages for current session
   * Reloads messages from backend
   */
  const handleRefreshMessages = useCallback(() => {
    if (currentSessionId) {
      // Set loading state
      setIsLoadingMessages(true);
      // Clear messages first, then invalidate to trigger fresh load
      clearMessages();
      queryClient.invalidateQueries({ queryKey: ['agent-session-messages', agentId, currentSessionId] });
    }
  }, [agentId, currentSessionId, clearMessages, queryClient]);

  return {
    isLoadingMessages,
    isNewSession,
    hasSuccessfulResponse,
    setIsLoadingMessages,
    setIsNewSession,
    setHasSuccessfulResponse,
    setCurrentSessionId,
    handleSwitchSession,
    handleNewSession,
    handleRefreshMessages
  };
};
