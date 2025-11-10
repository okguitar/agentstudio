import React, { ChangeEvent } from 'react';
import { Send, Square, Image, Wrench, Zap, Cpu, ChevronDown, Terminal } from 'lucide-react';
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
  showPermissionDropdown: boolean;
  setShowPermissionDropdown: (show: boolean) => void;
  showModelDropdown: boolean;
  setShowModelDropdown: (show: boolean) => void;
  showVersionDropdown: boolean;
  setShowVersionDropdown: (show: boolean) => void;
  availableModels: any[];
  claudeVersionsData: any;
  isVersionLocked: boolean;
  isCompactMode: boolean;
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
  showPermissionDropdown,
  setShowPermissionDropdown,
  showModelDropdown,
  setShowModelDropdown,
  showVersionDropdown,
  setShowVersionDropdown,
  availableModels,
  claudeVersionsData,
  isVersionLocked,
  isCompactMode,
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
        <div className="p-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {selectedImages.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt={t('agentChat.imagePreview')}
                  className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {/* handle preview */}}
                />
                <button
                  onClick={() => {/* handle remove */}}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
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
                className={`p-2 transition-colors rounded-lg ${
                  showToolSelector || (selectedRegularTools.length > 0 || (mcpToolsEnabled && selectedMcpTools.length > 0))
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
                className={`p-2 transition-colors rounded-lg ${
                  selectedImages.length > 0
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
              {/* Settings - only show in compact mode or as dropdown */}
              {isCompactMode ? (
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
              ) : (
                <>
                  {/* Permission mode dropdown */}
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                      className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        permissionMode !== 'default'
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      disabled={isAiTyping}
                    >
                      <Zap className="w-4 h-4" />
                      <span className="text-xs">{t(`agentChat.permissionMode.${permissionMode}`)}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showPermissionDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                        {[
                          { value: 'default', label: t('agentChat.permissionMode.default') },
                          { value: 'acceptEdits', label: t('agentChat.permissionMode.acceptEdits') },
                          { value: 'bypassPermissions', label: t('agentChat.permissionMode.bypassPermissions') },
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setPermissionMode(option.value as any);
                              setShowPermissionDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                              permissionMode === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Claude version selection dropdown - only show if available */}
                  {claudeVersionsData?.versions && claudeVersionsData.versions.length > 1 && (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => !isVersionLocked && setShowVersionDropdown(!showVersionDropdown)}
                        className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                          isVersionLocked
                            ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                            : selectedClaudeVersion
                            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        disabled={isAiTyping || isVersionLocked}
                        title={
                          isVersionLocked
                            ? t('agentChat.claudeVersion.locked')
                            : t('agentChat.claudeVersion.title')
                        }
                      >
                        <Terminal className="w-4 h-4" />
                        <span className="text-xs">
                          {(() => {
                            // If user selected a specific version, show that version name
                            if (selectedClaudeVersion && claudeVersionsData?.versions) {
                              const version = claudeVersionsData.versions.find((v: any) => v.id === selectedClaudeVersion);
                              return version?.name || t('agentChat.claudeVersion.custom');
                            }
                            
                            // If no specific version selected, try to show default version name
                            if (claudeVersionsData?.versions && claudeVersionsData.versions.length > 0) {
                              // First try to find by defaultVersionId
                              if (claudeVersionsData.defaultVersionId) {
                                const defaultVersion = claudeVersionsData.versions.find((v: any) => v.id === claudeVersionsData.defaultVersionId);
                                if (defaultVersion?.name) {
                                  return defaultVersion.name;
                                }
                              }
                              
                              // If not found, try to find version marked as default
                              const defaultByFlag = claudeVersionsData.versions.find((v: any) => v.isDefault);
                              if (defaultByFlag?.name) {
                                return defaultByFlag.name;
                              }
                              
                              // Try to find first non-system version
                              const firstNonSystem = claudeVersionsData.versions.find((v: any) => !v.isSystem);
                              if (firstNonSystem?.name) {
                                return firstNonSystem.name;
                              }
                              
                              // Finally show first version
                              if (claudeVersionsData.versions[0]?.name) {
                                return claudeVersionsData.versions[0].name;
                              }
                            }
                            
                            // Fallback to translation text
                            return t('agentChat.claudeVersion.default');
                          })()}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showVersionDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          {/* Default version option */}
                          <button
                            onClick={() => {
                              setSelectedClaudeVersion('');
                              setShowVersionDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg ${
                              !selectedClaudeVersion ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {(() => {
                              // Try to show actual default version name
                              if (claudeVersionsData?.versions && claudeVersionsData.versions.length > 0) {
                                // First try to find by defaultVersionId
                                if (claudeVersionsData.defaultVersionId) {
                                  const defaultVersion = claudeVersionsData.versions.find((v: any) => v.id === claudeVersionsData.defaultVersionId);
                                  if (defaultVersion?.name) {
                                    return defaultVersion.name;
                                  }
                                }
                                
                                // If not found, try to find version marked as default
                                const defaultByFlag = claudeVersionsData.versions.find((v: any) => v.isDefault);
                                if (defaultByFlag?.name) {
                                  return defaultByFlag.name;
                                }
                                
                                // Try to find first non-system version
                                const firstNonSystem = claudeVersionsData.versions.find((v: any) => !v.isSystem);
                                if (firstNonSystem?.name) {
                                  return firstNonSystem.name;
                                }
                                
                                // Finally show first version
                                if (claudeVersionsData.versions[0]?.name) {
                                  return claudeVersionsData.versions[0].name;
                                }
                              }
                              
                              // Fallback to translation text
                              return t('agentChat.claudeVersion.default');
                            })()}
                          </button>

                          {/* Other version options */}
                          {claudeVersionsData.versions
                            .filter((version: any) => version.id !== claudeVersionsData.defaultVersionId)
                            .map((version: any) => (
                              <button
                                key={version.id}
                                onClick={() => {
                                  setSelectedClaudeVersion(version.id);
                                  setShowVersionDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 last:rounded-b-lg ${
                                  selectedClaudeVersion === version.id
                                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span>{version.name}</span>
                                </div>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model selection - only if available models >= 2 */}
                  {availableModels.length >= 2 && (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                          selectedModel === 'opus'
                            ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        disabled={isAiTyping}
                      >
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]" title={availableModels.find(m => m.id === selectedModel)?.name || selectedModel}>
                          {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {showModelDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 min-w-[160px] max-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          {availableModels.map(model => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model.id);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                                selectedModel === model.id
                                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              title={model.description}
                            >
                              <div className="flex items-center justify-between">
                                <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 pr-2" title={model.name}>{model.name}</span>
                                {model.isVision && (
                                  <span className="text-xs text-gray-400 flex-shrink-0">👁️</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

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
          </div>
        </div>
      </div>
  );
};