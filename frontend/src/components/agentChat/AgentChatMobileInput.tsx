import React, { ChangeEvent } from 'react';
import { Send, Square, Image, Wrench } from 'lucide-react';
import { UnifiedToolSelector } from '../UnifiedToolSelector';
import { SettingsDropdown } from '../SettingsDropdown';
import { useTranslation } from 'react-i18next';

export interface AgentChatMobileInputProps {
  inputMessage: string;
  setInputMessage: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  selectedImages: Array<{ id: string; file: File; preview: string }>;
  isDragOver: boolean;
  isAiTyping: boolean;
  isSendDisabled: boolean;
  showToolSelector: boolean;
  setShowToolSelector: (show: boolean) => void;
  selectedRegularTools: string[];
  setSelectedRegularTools: (tools: string[]) => void;
  selectedMcpTools: string[];
  setSelectedMcpTools: (tools: string[]) => void;
  mcpToolsEnabled: boolean;
  setMcpToolsEnabled: (enabled: boolean) => void;
  permissionMode: string;
  setPermissionMode: (mode: any) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedClaudeVersion: string;
  setSelectedClaudeVersion: (version: string) => void;
  availableModels: any[];
  claudeVersionsData: any;
  isVersionLocked: boolean;
  agent: any;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSend: () => void;
  onStopGeneration: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const AgentChatMobileInput: React.FC<AgentChatMobileInputProps> = ({
  inputMessage,
  setInputMessage,
  selectedImages,
  isDragOver,
  isAiTyping,
  isSendDisabled,
  showToolSelector,
  setShowToolSelector,
  selectedRegularTools,
  setSelectedRegularTools,
  selectedMcpTools,
  setSelectedMcpTools,
  mcpToolsEnabled,
  setMcpToolsEnabled,
  permissionMode,
  setPermissionMode,
  selectedModel,
  setSelectedModel,
  selectedClaudeVersion,
  setSelectedClaudeVersion,
  availableModels,
  claudeVersionsData,
  isVersionLocked,
  agent,
  textareaRef,
  fileInputRef,
  onSend,
  onStopGeneration,
  onKeyDown,
  onImageSelect,
  onPaste,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  const { t } = useTranslation('components');

  return (
    <div
      className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="p-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt={t('agentChat.imagePreview')}
                  className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {/* handle preview */}}
                />
                <button
                  onClick={() => {/* handle remove */}}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                  title={t('agentChat.deleteImage')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag Over Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-blue-600 dark:text-blue-300 text-sm font-medium flex items-center space-x-2">
            <Image className="w-5 h-5" />
            <span>{t('agentChat.dropImageHere')}</span>
          </div>
        </div>
      )}

      {/* Mobile Chat Input */}
      <div className="p-3">
        {/* Top row: Settings and Tools */}
        <div className="flex items-center justify-between mb-3">
          {/* Left: Tool selector and Image upload */}
          <div className="flex space-x-2">
            {/* Tool selector button */}
            <div className="relative">
              <button
                onClick={() => setShowToolSelector(!showToolSelector)}
                className={`p-2 transition-colors rounded-lg ${
                  selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={
                  selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)
                    ? t('agentChat.toolSelection') + ` (${t('agentChat.selectedCount', { count: selectedRegularTools.length + (mcpToolsEnabled ? selectedMcpTools.length : 0) })})`
                    : t('agentChat.toolSelection')
                }
                disabled={isAiTyping}
              >
                <Wrench className="w-4 h-4" />
              </button>

              {/* Tool count badge */}
              {(selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)) && (
                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600 dark:bg-blue-500">
                  {selectedRegularTools.length + (mcpToolsEnabled ? selectedMcpTools.filter(t => t.startsWith('mcp__') && t.split('__').length === 3).length : 0)}
                </span>
              )}

              {/* Tool selector dropdown */}
              <UnifiedToolSelector
                isOpen={showToolSelector}
                onClose={() => setShowToolSelector(false)}
                selectedRegularTools={selectedRegularTools}
                onRegularToolsChange={setSelectedRegularTools}
                selectedMcpTools={selectedMcpTools}
                onMcpToolsChange={setSelectedMcpTools}
                mcpToolsEnabled={mcpToolsEnabled}
                onMcpEnabledChange={setMcpToolsEnabled}
                presetTools={agent.allowedTools}
              />
            </div>

            {/* Image upload button */}
            <div className="relative">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 transition-colors rounded-lg ${
                  selectedImages.length > 0
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={selectedImages.length > 0 ? t('agentChat.imageSelection') + ` (${selectedImages.length})` : t('agentChat.imageSelection')}
                disabled={isAiTyping}
              >
                <Image className="w-4 h-4" />
              </button>
              {selectedImages.length > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600 dark:bg-blue-500">
                  {selectedImages.length}
                </span>
              )}
            </div>
          </div>

          {/* Right: Settings */}
          <SettingsDropdown
            permissionMode={permissionMode as "default" | "acceptEdits" | "bypassPermissions"}
            onPermissionModeChange={setPermissionMode}
            selectedClaudeVersion={selectedClaudeVersion}
            onClaudeVersionChange={(version: string | undefined) => setSelectedClaudeVersion(version || '')}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            availableModels={availableModels}
            claudeVersionsData={claudeVersionsData}
            isVersionLocked={isVersionLocked}
            isAiTyping={isAiTyping}
          />
        </div>

        {/* Bottom row: Text input and Send button */}
        <div className="flex items-end space-x-2">
          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={setInputMessage}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={t('agentChat.inputPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={inputMessage.split('\n').length}
              style={{ minHeight: '40px', maxHeight: '120px' }}
              disabled={isAiTyping}
            />
          </div>

          {/* Send/Stop button */}
          {isAiTyping ? (
            <button
              onClick={onStopGeneration}
              className="px-3 py-2 rounded-lg font-medium transition-all duration-200 bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-sm"
              title={t('agentChat.stop')}
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={isSendDisabled}
              className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isSendDisabled
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm'
              }`}
              title={t('agentChat.send')}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onImageSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};