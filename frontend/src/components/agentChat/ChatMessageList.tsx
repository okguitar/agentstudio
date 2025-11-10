import React, { useMemo } from 'react';
import { ChatMessageRenderer } from '../ChatMessageRenderer';
import { useTranslation } from 'react-i18next';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  messageParts?: any[];
  images?: any[];
}

export interface ChatMessageListProps {
  messages: Message[];
  isLoadingMessages: boolean;
  isInitializingSession: boolean;
  isAiTyping: boolean;
  isStopping: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isUserScrolling: boolean;
  newMessagesCount: number;
  onScrollToBottom: () => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoadingMessages,
  isInitializingSession,
  isAiTyping,
  isStopping,
  messagesContainerRef,
  messagesEndRef,
  isUserScrolling,
  newMessagesCount,
  onScrollToBottom
}) => {
  const { t } = useTranslation('components');

  // Memoize rendered messages to prevent unnecessary re-renders
  const renderedMessages = useMemo(() => {
    return messages.map((message) => (
      <div
        key={message.id}
        className="px-4"
      >
        <div
          className={`text-sm leading-relaxed break-words overflow-hidden ${
            message.role === 'user'
              ? 'text-white p-3 rounded-lg'
              : 'text-gray-800 dark:text-gray-200'
          }`}
          style={message.role === 'user' ? { backgroundColor: 'hsl(var(--primary))', color: 'white' } : {}}
        >
          <ChatMessageRenderer message={message as any} />
        </div>
      </div>
    ));
  }, [messages]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto space-y-4 py-4 relative"
    >
      {isLoadingMessages && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('agentChatPanel.loadingMessages')}</p>
          </div>
        </div>
      )}

      {!isLoadingMessages && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-gray-400">
           
          </div>
        </div>
      )}

      {!isLoadingMessages && renderedMessages}

      {/* 会话初始化指示器：优先级最高 */}
      {isInitializingSession && (
        <div className="px-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('agentChatPanel.initializingSession')}
            </div>
          </div>
        </div>
      )}

      {/* AI 输入指示器：会话初始化完成后显示 */}
      {!isInitializingSession && (isAiTyping || isStopping) && (
        <div className="px-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            {isStopping && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('agentChat.stopping')}
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />

      {/* Floating "New Messages" indicator */}
      {isUserScrolling && newMessagesCount > 0 && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <button
            onClick={onScrollToBottom}
            className="pointer-events-auto bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <span>{t('agentChatPanel.newMessages', { count: newMessagesCount })}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
