import React, { useCallback } from 'react';
import { Image, X } from 'lucide-react';
import { AgentChatInput } from './AgentChatInput';
import { AgentChatMobileInput } from './AgentChatMobileInput';
import { AgentCommandSelector } from './AgentCommandSelector';
import { UnifiedToolSelector } from '../UnifiedToolSelector';
import { ImagePreview } from '../ImagePreview';
import { ConfirmDialog } from '../ConfirmDialog';
import { McpStatusModal } from '../McpStatusModal';
import { useTranslation } from 'react-i18next';
import {
  isCommandTrigger,
  extractCommandSearch,
  type CommandType
} from '../../utils/commandFormatter';

export interface AgentInputAreaProps {
  // Basic state
  inputMessage: string;
  selectedImages: Array<{ id: string; file: File; preview: string }>;
  isAiTyping: boolean;
  isStopping: boolean;
  isMobile: boolean;
  
  // Tool state
  showToolSelector: boolean;
  selectedRegularTools: string[];
  selectedMcpTools: string[];
  mcpToolsEnabled: boolean;
  
  // Command state
  showCommandSelector: boolean;
  showFileBrowser: boolean;
  commandSearch: string;
  selectedCommand: CommandType | null;
  selectedCommandIndex: number;
  atSymbolPosition: number | null;
  commandWarning: string;
  
  // Settings state
  permissionMode: string;
  selectedModel: string;
  selectedClaudeVersion: string;
  showPermissionDropdown: boolean;
  showModelDropdown: boolean;
  showVersionDropdown: boolean;
  showMobileSettings: boolean;
  isCompactMode: boolean;
  isVersionLocked: boolean;
  
  // UI state
  isDragOver: boolean;
  previewImage: string | null;
  showConfirmDialog: boolean;
  confirmMessage: string;
  showMcpStatusModal: boolean;
  
  // Data
  availableModels: any[];
  claudeVersionsData: any;
  agent: any;
  projectPath?: string;
  mcpStatus?: any;
  
  // Refs
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Event handlers
  onSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageRemove: (id: string) => void;
  handleImagePreview: (preview: string) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleStopGeneration: () => void;
  
  // Setters
  onSetInputMessage: (message: string) => void;
  onSetShowToolSelector: (show: boolean) => void;
  onSetSelectedRegularTools: (tools: string[]) => void;
  onSetSelectedMcpTools: (tools: string[]) => void;
  onSetMcpToolsEnabled: (enabled: boolean) => void;
  onSetPermissionMode: (mode: any) => void;
  onSetSelectedModel: (model: string) => void;
  onSetSelectedClaudeVersion: (version: string) => void;
  onSetShowPermissionDropdown: (show: boolean) => void;
  onSetShowModelDropdown: (show: boolean) => void;
  onSetShowVersionDropdown: (show: boolean) => void;
  onSetShowMobileSettings: (show: boolean) => void;
  onSetPreviewImage: (image: string | null) => void;
  onSetShowConfirmDialog: (show: boolean) => void;
  onSetShowMcpStatusModal: (show: boolean) => void;
  
  // Command handlers
  onCommandSelect: (command: CommandType) => void;
  onSetShowCommandSelector: (show: boolean) => void;
  onSetSelectedCommandIndex: (index: number) => void;
  onSetShowFileBrowser: (show: boolean) => void;
  onSetAtSymbolPosition: (position: number | null) => void;
  onSetCommandWarning: (warning: string | null) => void;
  
  // Confirm dialog handlers
  handleConfirmDialog: () => void;
  handleCancelDialog: () => void;
  
  // Utility functions
  isSendDisabled: () => boolean;
}

export const AgentInputArea: React.FC<AgentInputAreaProps> = (props) => {
  const { t } = useTranslation('components');
  
  const {
    inputMessage,
    selectedImages,
    isAiTyping,
    // isStopping,
    isMobile,
    showToolSelector,
    selectedRegularTools,
    selectedMcpTools,
    mcpToolsEnabled,
    showCommandSelector,
    showFileBrowser,
    commandSearch,
    selectedCommand,
    selectedCommandIndex,
    atSymbolPosition,
    commandWarning,
    permissionMode,
    selectedModel,
    selectedClaudeVersion,
    showPermissionDropdown,
    showModelDropdown,
    showVersionDropdown,
    showMobileSettings,
    isCompactMode,
    isVersionLocked,
    isDragOver,
    previewImage,
    showConfirmDialog,
    confirmMessage,
    showMcpStatusModal,
    availableModels,
    claudeVersionsData,
    agent,
    projectPath,
    mcpStatus,
    textareaRef,
    fileInputRef,
    onSend,
    handleKeyDown,
    handleImageSelect,
    handleImageRemove,
    handleImagePreview,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleStopGeneration,
    onSetInputMessage,
    onSetShowToolSelector,
    onSetSelectedRegularTools,
    onSetSelectedMcpTools,
    onSetMcpToolsEnabled,
    onSetPermissionMode,
    onSetSelectedModel,
    onSetSelectedClaudeVersion,
    onSetShowPermissionDropdown,
    onSetShowModelDropdown,
    onSetShowVersionDropdown,
    onSetShowMobileSettings,
    onSetPreviewImage,
    // onSetShowConfirmDialog,
    onSetShowMcpStatusModal,
    onCommandSelect,
    onSetShowCommandSelector,
    onSetSelectedCommandIndex,
    onSetShowFileBrowser,
    onSetAtSymbolPosition,
    onSetCommandWarning,
    handleConfirmDialog,
    handleCancelDialog,
    isSendDisabled
  } = props;

  // Handle input changes with command and file selection logic
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onSetInputMessage(value);
    
    // Clear command warning when input changes
    if (commandWarning) {
      onSetCommandWarning(null);
    }
    
    // Check for @ symbol trigger immediately
    if (value.length > 0 && value[value.length - 1] === '@') {
      // Check if @ is at start of line or preceded by whitespace
      const textBeforeAt = value.substring(0, value.length - 1);
      
      if (textBeforeAt.length === 0 || /\s$/.test(textBeforeAt)) {
        onSetAtSymbolPosition(value.length - 1);
        onSetShowFileBrowser(true);
        // Blur the textarea to prevent further input
        textareaRef.current?.blur();
        return;
      }
    }
    
    // Check if we should show command selector
    if (isCommandTrigger(value)) {
      // Extract command search for potential future use
      extractCommandSearch(value);
      // Note: Command search update should be handled by the parent hook
      if (!showCommandSelector) {
        onSetShowCommandSelector(true);
      }
    } else {
      if (showCommandSelector) {
        onSetShowCommandSelector(false);
        onSetSelectedCommandIndex(0);
      }
    }
  }, [
    commandWarning,
    commandSearch,
    showCommandSelector,
    onSetInputMessage,
    onSetAtSymbolPosition,
    onSetShowFileBrowser,
    onSetShowCommandSelector,
    onSetCommandWarning,
    onSetSelectedCommandIndex,
    textareaRef
  ]);

  // Mobile input area rendering
  if (isMobile) {
    return (
      <>
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* Command Warning */}
          {commandWarning && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2 flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-red-800 dark:text-red-300">{commandWarning}</p>
              </div>
            </div>
          )}

          {/* Mobile Chat Toolbar */}
          <AgentChatMobileInput
            inputMessage={inputMessage}
            setInputMessage={handleInputChange}
            selectedImages={selectedImages}
            isDragOver={isDragOver}
            isAiTyping={isAiTyping}
            isSendDisabled={isSendDisabled()}
            showToolSelector={showToolSelector}
            setShowToolSelector={onSetShowToolSelector}
            selectedRegularTools={selectedRegularTools}
            setSelectedRegularTools={onSetSelectedRegularTools}
            selectedMcpTools={selectedMcpTools}
            setSelectedMcpTools={onSetSelectedMcpTools}
            mcpToolsEnabled={mcpToolsEnabled}
            setMcpToolsEnabled={onSetMcpToolsEnabled}
            permissionMode={permissionMode}
            setPermissionMode={onSetPermissionMode}
            selectedModel={selectedModel}
            setSelectedModel={onSetSelectedModel}
            selectedClaudeVersion={selectedClaudeVersion}
            setSelectedClaudeVersion={onSetSelectedClaudeVersion}
            availableModels={availableModels}
            claudeVersionsData={claudeVersionsData}
            isVersionLocked={isVersionLocked}
            agent={agent}
            textareaRef={textareaRef}
            fileInputRef={fileInputRef}
            onSend={onSend}
            onStopGeneration={handleStopGeneration}
            onKeyDown={handleKeyDown}
            onImageSelect={handleImageSelect}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          {/* Tool Selector */}
          <UnifiedToolSelector
            isOpen={showToolSelector}
            onClose={() => onSetShowToolSelector(false)}
            selectedRegularTools={selectedRegularTools}
            onRegularToolsChange={onSetSelectedRegularTools}
            selectedMcpTools={selectedMcpTools}
            onMcpToolsChange={onSetSelectedMcpTools}
            mcpToolsEnabled={mcpToolsEnabled}
            onMcpEnabledChange={onSetMcpToolsEnabled}
            presetTools={agent.allowedTools}
          />
        </div>

        {/* Mobile Settings Modal */}
        {showMobileSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 m-4 max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('agentChat.settings')}
                </h3>
                <button
                  onClick={() => onSetShowMobileSettings(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Permission Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('agentChat.permissionMode')}
                  </label>
                  <select
                    value={permissionMode}
                    onChange={(e) => onSetPermissionMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="default">{t('agentChat.default')}</option>
                    <option value="acceptEdits">{t('agentChat.acceptEdits')}</option>
                    <option value="bypassPermissions">{t('agentChat.bypassPermissions')}</option>
                  </select>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('agentChat.model')}
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => onSetSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </div>

                {/* Version Selection */}
                {!isVersionLocked && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('agentChat.version')}
                    </label>
                    <select
                      value={selectedClaudeVersion}
                      onChange={(e) => onSetSelectedClaudeVersion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {claudeVersionsData?.availableVersions?.map((version: any) => (
                        <option key={version.id} value={version.id}>{version.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Command Selector and other shared components */}
        <AgentCommandSelector
          showCommandSelector={showCommandSelector}
          showFileBrowser={showFileBrowser}
          commandSearch={commandSearch}
          selectedCommand={selectedCommand}
          selectedCommandIndex={selectedCommandIndex}
          atSymbolPosition={atSymbolPosition}
          projectPath={projectPath}
          textareaRef={textareaRef}
          inputMessage={inputMessage}
          onCommandSelect={onCommandSelect}
          onSetInputMessage={onSetInputMessage}
          onSetShowCommandSelector={onSetShowCommandSelector}
          onSetSelectedCommandIndex={onSetSelectedCommandIndex}
          onSetShowFileBrowser={onSetShowFileBrowser}
          onSetAtSymbolPosition={onSetAtSymbolPosition}
        />
        
        <ConfirmDialog
          isOpen={showConfirmDialog}
          message={confirmMessage}
          onConfirm={handleConfirmDialog}
          onCancel={handleCancelDialog}
        />
        
        <ImagePreview
          images={previewImage ? [previewImage] : []}
          onClose={() => onSetPreviewImage(null)}
        />

        <McpStatusModal
          isOpen={showMcpStatusModal}
          onClose={() => onSetShowMcpStatusModal(false)}
          mcpStatus={mcpStatus}
        />
      </>
    );
  }

  // Desktop input area rendering
  return (
    <>
      <div
        className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700 ${isDragOver ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
                    onClick={() => handleImagePreview(img.preview)}
                  />
                  <button
                    onClick={() => handleImageRemove(img.id)}
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

        {/* Drag Over Indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 bg-opacity-75 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-blue-600 dark:text-blue-300 text-lg font-medium flex items-center space-x-2">
              <Image className="w-6 h-6" />
              <span>{t('agentChat.dropImageHere')}</span>
            </div>
          </div>
        )}

        {/* Command Warning */}
        {commandWarning && (
          <div className="px-4 pt-3 pb-2">
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start space-x-2">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-300">{commandWarning}</p>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Chat Input */}
        <AgentChatInput
          inputMessage={inputMessage}
          setInputMessage={handleInputChange}
          selectedImages={selectedImages}
          isDragOver={isDragOver}
          isAiTyping={isAiTyping}
          isSendDisabled={isSendDisabled()}
          showToolSelector={showToolSelector}
          setShowToolSelector={onSetShowToolSelector}
          selectedRegularTools={selectedRegularTools}
          setSelectedRegularTools={onSetSelectedRegularTools}
          selectedMcpTools={selectedMcpTools}
          setSelectedMcpTools={onSetSelectedMcpTools}
          mcpToolsEnabled={mcpToolsEnabled}
          setMcpToolsEnabled={onSetMcpToolsEnabled}
          permissionMode={permissionMode}
          setPermissionMode={onSetPermissionMode}
          selectedModel={selectedModel}
          setSelectedModel={onSetSelectedModel}
          selectedClaudeVersion={selectedClaudeVersion}
          setSelectedClaudeVersion={onSetSelectedClaudeVersion}
          showPermissionDropdown={showPermissionDropdown}
          setShowPermissionDropdown={onSetShowPermissionDropdown}
          showModelDropdown={showModelDropdown}
          setShowModelDropdown={onSetShowModelDropdown}
          showVersionDropdown={showVersionDropdown}
          setShowVersionDropdown={onSetShowVersionDropdown}
          availableModels={availableModels}
          claudeVersionsData={claudeVersionsData}
          isVersionLocked={isVersionLocked}
          isCompactMode={isCompactMode}
          agent={agent}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
          onSend={onSend}
          onStopGeneration={handleStopGeneration}
          onKeyDown={handleKeyDown}
          onImageSelect={handleImageSelect}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </div>

      {/* Command Selector and other shared components */}
      <AgentCommandSelector
        showCommandSelector={showCommandSelector}
        showFileBrowser={showFileBrowser}
        commandSearch={commandSearch}
        selectedCommand={selectedCommand}
        selectedCommandIndex={selectedCommandIndex}
        atSymbolPosition={atSymbolPosition}
        projectPath={projectPath}
        textareaRef={textareaRef}
        inputMessage={inputMessage}
        onCommandSelect={onCommandSelect}
        onSetInputMessage={onSetInputMessage}
        onSetShowCommandSelector={onSetShowCommandSelector}
        onSetSelectedCommandIndex={onSetSelectedCommandIndex}
        onSetShowFileBrowser={onSetShowFileBrowser}
        onSetAtSymbolPosition={onSetAtSymbolPosition}
      />
      
      <ConfirmDialog
        isOpen={showConfirmDialog}
        message={confirmMessage}
        onConfirm={handleConfirmDialog}
        onCancel={handleCancelDialog}
      />
      
      <ImagePreview
        images={previewImage ? [previewImage] : []}
        onClose={() => onSetPreviewImage(null)}
      />

      <McpStatusModal
        isOpen={showMcpStatusModal}
        onClose={() => onSetShowMcpStatusModal(false)}
        mcpStatus={mcpStatus}
      />
    </>
  );
};