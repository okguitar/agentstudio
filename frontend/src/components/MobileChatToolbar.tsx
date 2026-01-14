import React, { useRef } from 'react';
import { Image, Wrench, X, Settings, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileChatToolbarProps {
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  selectedImages: Array<{ id: string; preview: string }>;
  onImageRemove: (id: string) => void;
  onImageSelect: (files: FileList | null) => void;
  isAiTyping: boolean;
  disabled?: boolean;
  showToolSelector: boolean;
  onToolSelectorToggle: () => void;
  hasSelectedTools: boolean;
  onStopAi: () => void;
  onSettingsOpen: () => void;
  className?: string;
}

export const MobileChatToolbar: React.FC<MobileChatToolbarProps> = ({
  inputMessage,
  onInputChange,
  onSend,
  selectedImages,
  onImageRemove,
  onImageSelect,
  isAiTyping,
  disabled = false,
  showToolSelector,
  onToolSelectorToggle,
  hasSelectedTools,
  onStopAi,
  onSettingsOpen,
  className = ""
}) => {
  const { t } = useTranslation('components');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isAiTyping && inputMessage.trim()) {
        onSend();
      }
    }
  };


  return (
    <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="p-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt={t('agentChat.imagePreview')}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                />
                <button
                  onClick={() => onImageRemove(img.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                  title={t('agentChat.deleteImage')}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="p-3">
        <div className="flex items-center space-x-2">
          {/* Left Side Tools */}
          <div className="flex space-x-1">
            {/* Tool Selector */}
            <button
              onClick={onToolSelectorToggle}
              className={`p-2 transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center relative ${
                showToolSelector || hasSelectedTools
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={t('agentChat.toolSelection')}
              disabled={isAiTyping}
            >
              <Wrench className="w-5 h-5" />
              {hasSelectedTools && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>

            {/* Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={(e) => onImageSelect(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center ${
                selectedImages.length > 0
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={t('agentChat.imageSelection')}
              disabled={isAiTyping}
            >
              <Image className="w-5 h-5" />
            </button>
          </div>

          {/* Text Input - Takes remaining space */}
          <div className="flex-1 min-w-0">
            <textarea
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('agentChat.inputPlaceholderMobile')}
              disabled={disabled || isAiTyping}
              rows={1}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white text-sm"
              style={{
                minHeight: '44px',
                maxHeight: '120px',
              }}
            />
          </div>

          {/* Right Side Action - Settings or Stop */}
          <div className="flex-shrink-0">
            {isAiTyping ? (
              <button
                onClick={onStopAi}
                className="p-2 transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                title={t('agentChat.stopAi')}
              >
                <Square className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onSettingsOpen}
                className="p-2 transition-colors rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={t('agentChat.settings.title')}
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};