import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Smile } from 'lucide-react';
import { useMobileContext } from '../contexts/MobileContext';

interface MobileChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  showVoiceRecord?: boolean;
  showEmojiPicker?: boolean;
  showFileUpload?: boolean;
}

export const MobileChatInput: React.FC<MobileChatInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  showVoiceRecord = true,
  showEmojiPicker = true,
  showFileUpload = true,
}) => {
  const { isMobile } = useMobileContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = isMobile ? 120 : 200;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [value, isMobile]);

  const handleSend = () => {
    if (!disabled && value.trim() && !isComposing) {
      onSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      // TODO: Implement voice recording logic
    } else {
      setIsRecording(true);
      // TODO: Implement voice recording logic
    }
  };

  const handleFileUpload = () => {
    // TODO: Implement file upload logic
  };

  const handleEmojiPicker = () => {
    // TODO: Implement emoji picker logic
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <div className="flex items-end space-x-2">
        {/* Left Side Actions */}
        <div className="flex space-x-1">
          {showFileUpload && (
            <button
              onClick={handleFileUpload}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}

          {showEmojiPicker && (
            <button
              onClick={handleEmojiPicker}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white"
            style={{
              minHeight: isMobile ? '40px' : '44px',
              maxHeight: isMobile ? '120px' : '200px',
            }}
          />
        </div>

        {/* Right Side Actions */}
        <div className="flex space-x-1">
          {showVoiceRecord && (
            <button
              onClick={handleVoiceRecord}
              className={`p-2 rounded-md transition-colors ${
                isRecording
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-w-[40px] flex items-center justify-center"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Voice Recording Indicator */}
      {isRecording && (
        <div className="mt-2 flex items-center space-x-2 text-red-500">
          <div className="flex space-x-1">
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse delay-150"></div>
          </div>
          <span className="text-sm">Recording...</span>
        </div>
      )}
    </div>
  );
};