import { useCallback, useEffect } from 'react';
import { RefObject } from 'react';

export interface UseKeyboardHandlersProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  inputMessage: string;
  isAiTyping: boolean;
  selectedImages: any[];
  onSendMessage: () => void;
  onInterruptSession: () => void;
  onShowCommandSelector: boolean;
  onSelectCommand: (command: any) => void;
  onSetShowCommandSelector: (show: boolean) => void;
}

export const useKeyboardHandlers = ({
  textareaRef,
  inputMessage,
  isAiTyping,
  selectedImages,
  onSendMessage,
  onInterruptSession,
  onShowCommandSelector,
  onSetShowCommandSelector
}: UseKeyboardHandlersProps) => {

  // Handle textarea key events
  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
      return;
    }

    // Handle command selector navigation
    if (onShowCommandSelector) {
      if (e.key === 'Escape') {
        onSetShowCommandSelector(false);
        return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        // Prevent sending if command selector is open
        e.preventDefault();
        return;
      }
    }
  }, [onSendMessage, onShowCommandSelector, onSetShowCommandSelector]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter to send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isAiTyping && (inputMessage.trim() || selectedImages.length > 0)) {
        onSendMessage();
      }
      return;
    }

    // Escape to interrupt AI response
    if (e.key === 'Escape' && isAiTyping) {
      e.preventDefault();
      onInterruptSession();
      return;
    }

    // Focus textarea when typing anywhere in the component
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      textareaRef.current &&
      document.activeElement !== textareaRef.current &&
      !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase() || '')
    ) {
      textareaRef.current.focus();
    }
  }, [inputMessage, isAiTyping, selectedImages, onSendMessage, onInterruptSession, textareaRef]);

  // Add global keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    handleTextareaKeyDown
  };
};