import React, { useState, memo } from 'react';
import { MarkdownMessage } from './MarkdownMessage';
import { ToolUsage } from './ToolUsage';
import { ImagePreview } from './ImagePreview';
import { CompactSummary } from './CompactSummary';
import type { ChatMessage } from '../types/index';

interface ChatMessageRendererProps {
  message: ChatMessage;
}

const ChatMessageRendererComponent: React.FC<ChatMessageRendererProps> = ({ message }) => {
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
            return (
              <div key={part.id} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm font-mono">
                {part.content}
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
                toolUseResult={part.toolData.toolUseResult}
                isError={part.toolData.isError}
                isExecuting={part.toolData.isExecuting}
              />
            );
          } else if (part.type === 'image' && part.imageData) {
            const imageUrl = `data:${part.imageData.mediaType};base64,${part.imageData.data}`;
            return (
              <div key={part.id} className="inline-block">
                <img
                  src={imageUrl}
                  alt={part.imageData.filename || 'Image'}
                  className="max-w-32 max-h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openImagePreview(imageUrl)}
                  title={part.imageData.filename || 'Click to preview'}
                />
              </div>
            );
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
                className="max-w-32 max-h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
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
          {message.role === 'assistant' ? (
            <MarkdownMessage content={message.content} />
          ) : (
            (() => {
              // Check if this is a command message format
              const commandMatch = message.content.match(
                /<command-message>.*?<\/command-message>\s*<command-name>(.+?)<\/command-name>/
              );
              
              if (commandMatch) {
                // Render as command block
                return (
                  <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm font-mono">
                    {commandMatch[1]}
                  </div>
                );
              } else {
                // Regular text content
                return (
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                );
              }
            })()
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
              toolUseResult={tool.toolUseResult}
              isError={tool.isError}
              isExecuting={tool.isExecuting}
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