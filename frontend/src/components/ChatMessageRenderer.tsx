import React from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ToolUsage } from './ToolUsage';
import type { ChatMessage } from '../types/index';

interface ChatMessageRendererProps {
  message: ChatMessage;
}

export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ message }) => {
  // Use messageParts if available, otherwise fall back to legacy content + toolUsage
  if (message.messageParts && message.messageParts.length > 0) {
    const sortedParts = [...message.messageParts].sort((a, b) => a.order - b.order);
    
    return (
      <div className="space-y-3">
        {sortedParts.map((part) => {
          if (part.type === 'text' && part.content) {
            return (
              <div key={part.id}>
                {message.role === 'assistant' ? (
                  <MarkdownMessage content={part.content} />
                ) : (
                  <div className="whitespace-pre-wrap break-words">{part.content}</div>
                )}
              </div>
            );
          } else if (part.type === 'tool' && part.toolData) {
            return (
              <ToolUsage
                key={part.id}
                toolName={part.toolData.toolName}
                toolInput={part.toolData.toolInput}
                toolResult={part.toolData.toolResult}
                isError={part.toolData.isError}
                isExecuting={part.toolData.isExecuting}
              />
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Legacy fallback
  return (
    <div className="space-y-2">
      {/* Text content */}
      {message.content && (
        <div>
          {message.role === 'assistant' ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          )}
        </div>
      )}
      
      {/* Tool usage components */}
      {message.toolUsage && message.toolUsage.length > 0 && (
        <div className="space-y-2">
          {message.toolUsage.map((tool) => (
            <ToolUsage
              key={tool.id}
              toolName={tool.toolName}
              toolInput={tool.toolInput}
              toolResult={tool.toolResult}
              isError={tool.isError}
              isExecuting={tool.isExecuting}
            />
          ))}
        </div>
      )}
    </div>
  );
};