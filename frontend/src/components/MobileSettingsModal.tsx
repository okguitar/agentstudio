import React from 'react';
import { X, Zap, Terminal, Cpu, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions';
  onPermissionModeChange: (mode: 'default' | 'acceptEdits' | 'bypassPermissions') => void;
  selectedClaudeVersion: string | undefined;
  onClaudeVersionChange: (version: string | undefined) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableModels: Array<{ id: string; name: string; description?: string; isVision?: boolean }>;
  claudeVersionsData?: { versions: Array<{ id: string; name: string; isSystem?: boolean }>; defaultVersionId: string | null };
  isVersionLocked: boolean;
  isAiTyping: boolean;
}

export const MobileSettingsModal: React.FC<MobileSettingsModalProps> = ({
  isOpen,
  onClose,
  permissionMode,
  onPermissionModeChange,
  selectedClaudeVersion,
  onClaudeVersionChange,
  selectedModel,
  onModelChange,
  availableModels,
  claudeVersionsData,
  isVersionLocked,
  isAiTyping
}) => {
  const { t } = useTranslation('components');

  if (!isOpen) return null;

  const hasClaudeVersions = claudeVersionsData?.versions && claudeVersionsData.versions.length > 1;
  const hasMultipleModels = availableModels.length >= 2;

  const handlePermissionModeChange = (mode: 'default' | 'acceptEdits' | 'bypassPermissions') => {
    onPermissionModeChange(mode);
  };

  const handleClaudeVersionChange = (version: string | undefined) => {
    onClaudeVersionChange(version);
  };

  const handleModelChange = (model: string) => {
    onModelChange(model);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('agentChat.settings.title')}
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
        
        {/* Permission Mode Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">
            {t('agentChat.settings.permissionMode')}
          </h3>
          <div className="space-y-2">
            {[
              { value: 'default', label: t('agentChat.permissionMode.default') },
              { value: 'acceptEdits', label: t('agentChat.permissionMode.acceptEdits') },
              { value: 'bypassPermissions', label: t('agentChat.permissionMode.bypassPermissions') },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handlePermissionModeChange(option.value as any)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  permissionMode === option.value 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={isAiTyping}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    permissionMode === option.value 
                      ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${
                    permissionMode === option.value 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {option.label}
                  </span>
                  {permissionMode === option.value && (
                    <div className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Claude Version Section */}
        {hasClaudeVersions && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">
              {t('agentChat.settings.claudeVersion')}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleClaudeVersionChange(undefined)}
                disabled={isVersionLocked}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  !selectedClaudeVersion 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${isVersionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    !selectedClaudeVersion 
                      ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <Terminal className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${
                    !selectedClaudeVersion 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {claudeVersionsData?.defaultVersionId 
                      ? claudeVersionsData.versions.find(v => v.id === claudeVersionsData.defaultVersionId)?.name || t('agentChat.claudeVersion.default')
                      : t('agentChat.claudeVersion.default')
                    }
                  </span>
                  {!selectedClaudeVersion && (
                    <div className="ml-auto w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
              
              {claudeVersionsData && claudeVersionsData.versions
                .filter(version => claudeVersionsData.defaultVersionId && version.id !== claudeVersionsData.defaultVersionId)
                .map(version => (
                  <button
                    key={version.id}
                    onClick={() => handleClaudeVersionChange(version.id)}
                    disabled={isVersionLocked}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedClaudeVersion === version.id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${isVersionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedClaudeVersion === version.id
                          ? 'bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium ${
                          selectedClaudeVersion === version.id
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {version.name}
                        </span>
                      </div>
                      {selectedClaudeVersion === version.id && (
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* Model Section */}
        {hasMultipleModels && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">
              {t('agentChat.settings.model')}
            </h3>
            <div className="space-y-2">
              {availableModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedModel === model.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={model.description}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      selectedModel === model.id
                        ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center space-x-2">
                      <span className={`font-medium ${
                        selectedModel === model.id
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {model.name}
                      </span>
                      {model.isVision && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          👁️ Vision
                        </span>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No settings available message */}
        {!hasClaudeVersions && !hasMultipleModels && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Settings className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {t('agentChat.settings.noSettings')}
            </p>
          </div>
        )}

        {/* Bottom safe area for mobile scrolling */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};