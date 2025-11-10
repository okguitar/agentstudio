import { useState, useCallback, useEffect, RefObject } from 'react';

export interface UseScrollManagementProps {
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messages: any[];
  isAiTyping: boolean;
}

export const useScrollManagement = ({
  messagesContainerRef,
  messagesEndRef,
  messages,
  isAiTyping
}: UseScrollManagementProps) => {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  // Check if scroll position is near bottom
  const isNearBottom = useCallback((threshold = 100) => {
    if (!messagesContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [messagesContainerRef]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, [messagesEndRef]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    const nearBottom = isNearBottom();
    setIsUserScrolling(!nearBottom);
    if (nearBottom) {
      setNewMessagesCount(0);
    }
  }, [isNearBottom]);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, messagesContainerRef]);

  // Conditional auto-scroll when messages update
  useEffect(() => {
    if (!isUserScrolling) {
      scrollToBottom();
    } else {
      // User is scrolling, increment new messages count
      setNewMessagesCount(prev => prev + 1);
    }
  }, [messages, isAiTyping, isUserScrolling, scrollToBottom]);

  return {
    isUserScrolling,
    newMessagesCount,
    scrollToBottom,
    setNewMessagesCount,
    setIsUserScrolling
  };
};
