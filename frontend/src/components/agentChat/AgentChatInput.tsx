import React, { ChangeEvent } from 'react';
import { Send, Square, Image, Wrench } from 'lucide-react';
import { UnifiedToolSelector } from '../UnifiedToolSelector';
import { SettingsDropdown } from '../SettingsDropdown';
import { useTranslation } from 'react-i18next';

export interface AgentChatInputProps {
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
  envVars: Record<string, string>;
  setEnvVars: (envVars: Record<string, string>) => void;
  onSend: () => void;
  onStopGeneration: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const AgentChatInput: React.FC<AgentChatInputProps> = ({
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
  envVars,
  setEnvVars,
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
      className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''
        }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag Over Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-blue-600 dark:text-blue-300 text-lg font-medium flex items-center space-x-2">
            <Image className="w-6 h-6" />
            <span>{t('agentChat.dropImageHere')}</span>
          </div>
        </div>
      )}

      {/* Text Input Area */}
      <div className="p-4 pb-2">
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={setInputMessage}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={
            selectedImages.length > 0
              ? t('agentChat.addDescription')
              : t('agentChat.inputPlaceholder')
          }
          rows={1}
          className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          style={{
            '--focus-ring-color': 'hsl(var(--primary))',
            minHeight: '44px',
            maxHeight: '120px'
          } as React.CSSProperties}
          disabled={isAiTyping}
        />
      </div>

      {/* Toolbar */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={onImageSelect}
              className="hidden"
            />

            {/* Tool selector button */}
            <div className="relative">
              <button
                onClick={() => setShowToolSelector(!showToolSelector)}
                className={`p-2 transition-colors rounded-lg ${showToolSelector || (selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0))
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                title={t('agentChat.toolSelection')}
                disabled={isAiTyping}
              >
                <Wrench className="w-4 h-4" />
              </button>

              {/* Display tool count indicator */}
              {(selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0)) && (
                <span className="absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center bg-blue-600 dark:bg-blue-500">
                  {selectedRegularTools.length + (mcpToolsEnabled ? selectedMcpTools.filter(t => t.startsWith('mcp__') && t.split('__').length === 3).length : 0)}
                </span>
              )}

              {/* Tool selector - using new UnifiedToolSelector */}
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
                className={`p-2 transition-colors rounded-lg ${selectedImages.length > 0
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                title={selectedImages.length > 0 ? t('agentChat.imageSelection') + ` (${t('agentChat.selectedCount', { count: selectedImages.length })})` : t('agentChat.imageSelection')}
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

          <div className="flex items-center space-x-2">
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
              envVars={envVars}
              onEnvVarsChange={setEnvVars}
            />

            {isAiTyping ? (
              <button
                onClick={onStopGeneration}
                className={`flex items-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium shadow-sm`}
                style={{ backgroundColor: 'rgb(239, 68, 68)' }}
                title={t('agentChatPanel.stopGeneration')}
              >
                <Square className="w-4 h-4" />
                <span>{t('agentChatPanel.stop')}</span>
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={isSendDisabled}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm"
                style={{ backgroundColor: !isSendDisabled ? 'hsl(var(--primary))' : undefined }}
                title={
                  isAiTyping ? t('agentChatPanel.aiTyping') :
                    !inputMessage.trim() && selectedImages.length === 0 ? t('agentChatPanel.noContentToSend') :
                      t('agentChatPanel.sendMessage')
                }
              >
                <Send className="w-4 h-4" />
                <span>{t('agentChatPanel.send')}</span>
              </button>
            )}
          </div>
        </div >
      </div >
    </div >
  );
};