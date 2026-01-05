import React, { useState, memo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ToolUsage } from './ToolUsage';
import { ImagePreview } from './ImagePreview';
import { CompactSummary } from './CompactSummary';
import type { ChatMessage } from '../types/index';

interface ChatMessageRendererProps {
  message: ChatMessage;
  // 用于 AskUserQuestion 工具的回调
  onAskUserQuestionSubmit?: (toolUseId: string, response: string) => void;
}

const ChatMessageRendererComponent: React.FC<ChatMessageRendererProps> = ({ message, onAskUserQuestionSubmit }) => {
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Collect all image URLs from the message
  const getAllImageUrls = () => {
    const imageUrls: string[] = [];
    
    // From messageParts
    if (message.messageParts && message.messageParts.length > 0) {
      message.messageParts.forEach(part => {
        if (part.type === 'image' && part.imageData) {
          imageUrls.push(`data:${part.imageData.mediaType};base64,${part.imageData.data}`);
        }
      });
    }
    
    // From legacy images
    if (message.images && message.images.length > 0) {
      message.images.forEach(image => {
        imageUrls.push(`data:${image.mediaType};base64,${image.data}`);
      });
    }
    
    return imageUrls;
  };

  // Open image preview
  const openImagePreview = (clickedImageUrl: string) => {
    const allImages = getAllImageUrls();
    const clickedIndex = allImages.indexOf(clickedImageUrl);
    setPreviewImages(allImages);
    setPreviewIndex(clickedIndex >= 0 ? clickedIndex : 0);
  };

  // Close image preview
  const closeImagePreview = () => {
    setPreviewImages([]);
    setPreviewIndex(0);
  };

  // Use messageParts if available, otherwise fall back to legacy content + toolUsage
  if (message.messageParts && message.messageParts.length > 0) {
    const sortedParts = [...message.messageParts].sort((a, b) => a.order - b.order);
    
    return (
      <div className="space-y-3">
        {sortedParts.map((part) => {
          if (part.type === 'command' && part.content) {
            // 分离命令名和参数
            const commandContent = part.content.trim();
            const spaceIndex = commandContent.indexOf(' ');
            const commandName = spaceIndex > 0 ? commandContent.substring(0, spaceIndex) : commandContent;
            const commandArgs = spaceIndex > 0 ? commandContent.substring(spaceIndex + 1).trim() : '';
            
            return (
              <div key={part.id} className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 bg-gray-800 dark:bg-gray-900 text-emerald-400 dark:text-emerald-300 rounded-md text-sm font-mono font-medium">
                  {commandName}
                </span>
                {commandArgs && (
                  <span className="text-gray-100 text-sm">
                    {commandArgs}
                  </span>
                )}
              </div>
            );
          } else if (part.type === 'compactSummary' && part.content) {
            return (
              <div key={part.id}>
                <CompactSummary content={part.content} />
              </div>
            );
          } else if (part.type === 'text' && part.content) {
            return (
              <div key={part.id}>
                <MarkdownMessage content={part.content} isUserMessage={message.role === 'user'} />
              </div>
            );
          } else if (part.type === 'thinking' && part.content) {
            return (
              <details key={part.id} className="my-2">
                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none">
                  💭 思考过程...
                </summary>
                <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed italic">
                    {part.content}
                  </div>
                </div>
              </details>
            );
          } else if (part.type === 'tool' && part.toolData) {
            return (
              <ToolUsage
                key={part.id}
                toolName={part.toolData.toolName}
                toolInput={part.toolData.toolInput}
                toolResult={part.toolData.toolResult}
                toolUseResult={part.toolData.toolUseResult}
                isError={part.toolData.isError}
                isExecuting={part.toolData.isExecuting}
                claudeId={part.toolData.claudeId}
                onAskUserQuestionSubmit={onAskUserQuestionSubmit}
              />
            );
          } else if (part.type === 'image' && part.imageData) {
            const imageUrl = `data:${part.imageData.mediaType};base64,${part.imageData.data}`;
            return (
              <div key={part.id} className="inline-block">
                <img
                  src={imageUrl}
                  alt={part.imageData.filename || 'Image'}
                  className="max-w-32 max-h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openImagePreview(imageUrl)}
                  title={part.imageData.filename || 'Click to preview'}
                />
              </div>
            );
          } else if (part.type === 'text' && part.content && part.content.includes('unknown')) {
            // Handle legacy thinking content that was saved as "unknown" type
            // Check if the content contains thinking-related markers
            const isThinkingContent = part.content.includes('"type":"thinking"') || 
                                    part.content.includes('"thinking"') ||
                                    part.content.includes('thinking');
            
            if (isThinkingContent) {
              // Extract thinking content from the serialized data
              let thinkingText = part.content;
              
              // Try to parse if it looks like JSON and extract thinking content
              try {
                if (part.content.includes('"thinking":')) {
                  const match = part.content.match(/"thinking":"([^"]+)"/);
                  if (match && match[1]) {
                    thinkingText = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
                  }
                }
              } catch (e) {
                // If parsing fails, use the original content
                console.warn('Failed to parse thinking content:', e);
              }
              
              return (
                <details key={part.id} className="my-2">
                  <summary className="cursor-pointer text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none">
                    💭 思考过程... (历史消息)
                  </summary>
                  <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed italic">
                      {thinkingText}
                    </div>
                  </div>
                </details>
              );
            } else {
              // For other unknown types, render as text
              return (
                <div key={part.id}>
                  <MarkdownMessage content={part.content} isUserMessage={message.role === 'user'} />
                </div>
              );
            }
          }
          return null;
        })}
        
        <ImagePreview 
          images={previewImages} 
          initialIndex={previewIndex}
          onClose={closeImagePreview} 
        />
      </div>
    );
  }

  // Legacy fallback
  return (
    <div className="space-y-2">
      {/* Images */}
      {message.images && message.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.images.map((image) => {
            const imageUrl = `data:${image.mediaType};base64,${image.data}`;
            return (
              <img
                key={image.id}
                src={imageUrl}
                alt={image.filename || 'Image'}
                className="max-w-32 max-h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openImagePreview(imageUrl)}
                title={image.filename || 'Click to preview'}
              />
            );
          })}
        </div>
      )}
      
      {/* Text content */}
      {message.content && (
        <div>
          {(() => {
            // Check if this is a command message format
            const commandMatch = message.content.match(
              /<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/
            );
            
            if (commandMatch) {
              // 分离命令名和参数
              const commandContent = commandMatch[1].trim();
              const spaceIndex = commandContent.indexOf(' ');
              const commandName = spaceIndex > 0 ? commandContent.substring(0, spaceIndex) : commandContent;
              const commandArgs = spaceIndex > 0 ? commandContent.substring(spaceIndex + 1).trim() : '';
              
              // Render as command block
              return (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 bg-gray-800 dark:bg-gray-900 text-emerald-400 dark:text-emerald-300 rounded-md text-sm font-mono font-medium">
                    {commandName}
                  </span>
                  {commandArgs && (
                    <span className="text-gray-100 text-sm">
                      {commandArgs}
                    </span>
                  )}
                </div>
              );
            } else {
              // Regular text content - always use MarkdownMessage for consistent styling
              return (
                <MarkdownMessage content={message.content} isUserMessage={message.role === 'user'} />
              );
            }
          })()}
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
              toolUseResult={tool.toolUseResult}
              isError={tool.isError}
              isExecuting={tool.isExecuting}
              claudeId={(tool as any).claudeId}
              onAskUserQuestionSubmit={onAskUserQuestionSubmit}
            />
          ))}
        </div>
      )}
      
      <ImagePreview 
        images={previewImages} 
        initialIndex={previewIndex}
        onClose={closeImagePreview} 
      />
    </div>
  );
};

export const ChatMessageRenderer = memo(ChatMessageRendererComponent);