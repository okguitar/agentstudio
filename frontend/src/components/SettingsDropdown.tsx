import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Zap, Cpu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EnvVarsConfig } from './EnvVarsConfig';

interface SettingsDropdownProps {
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
  envVars: Record<string, string>;
  onEnvVarsChange: (envVars: Record<string, string>) => void;
  className?: string;
}

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  permissionMode,
  onPermissionModeChange,
  selectedClaudeVersion,
  onClaudeVersionChange,
  selectedModel,
  onModelChange,
  availableModels,
  claudeVersionsData,
  isVersionLocked,
  isAiTyping,
  envVars,
  onEnvVarsChange,
  className = ''
}) => {
  const { t } = useTranslation('components');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePermissionModeChange = (mode: 'default' | 'acceptEdits' | 'bypassPermissions') => {
    onPermissionModeChange(mode);
  };

  const handleClaudeVersionChange = (version: string | undefined) => {
    onClaudeVersionChange(version);
  };

  const handleModelChange = (model: string) => {
    onModelChange(model);
  };

  const hasClaudeVersions = claudeVersionsData?.versions && claudeVersionsData.versions.length > 1;
  const hasMultipleModels = availableModels.length >= 2;

  // Get current model name
  const currentModelName = availableModels.find(m => m.id === selectedModel)?.name || selectedModel;

  // Get permission mode label
  const permissionModeLabel = {
    default: t('agentChat.permissionMode.default'),
    acceptEdits: t('agentChat.permissionMode.acceptEdits'),
    bypassPermissions: t('agentChat.permissionMode.bypassPermissions')
  }[permissionMode];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors border ${isOpen
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        disabled={isAiTyping}
        title={t('agentChat.settings.title')}
      >
        <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <span className="font-medium">{currentModelName}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-gray-500 dark:text-gray-400">{permissionModeLabel}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[400px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-[80vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('agentChat.settings.title', 'Chat Configuration')}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto p-4 space-y-6">

            {/* Model & Version Section */}
            {(hasMultipleModels || hasClaudeVersions) && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('agentChat.settings.modelAndVersion', 'Supplier & Model')}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Claude Version (Supplier) Selection */}
                  {hasClaudeVersions && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        {t('agentChat.settings.claudeVersion')}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedClaudeVersion || ''}
                          onChange={(e) => handleClaudeVersionChange(e.target.value || undefined)}
                          disabled={isVersionLocked}
                          className={`w-full appearance-none px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${isVersionLocked
                            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                          <option value="">
                            {claudeVersionsData?.defaultVersionId
                              ? `${t('agentChat.claudeVersion.default')} (${claudeVersionsData.versions.find(v => v.id === claudeVersionsData.defaultVersionId)?.name})`
                              : t('agentChat.claudeVersion.default')
                            }
                          </option>
                          {claudeVersionsData.versions
                            .filter(version => claudeVersionsData.defaultVersionId && version.id !== claudeVersionsData.defaultVersionId)
                            .map(version => (
                              <option key={version.id} value={version.id}>
                                {version.name}
                              </option>
                            ))
                          }
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Model Selection */}
                  {hasMultipleModels && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        {t('agentChat.settings.model')}
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {availableModels.map(model => (
                          <button
                            key={model.id}
                            onClick={() => handleModelChange(model.id)}
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all ${selectedModel === model.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                          >
                            <div className="flex items-center space-x-2">
                              <Cpu className="w-4 h-4 opacity-70" />
                              <span className="font-medium">{model.name}</span>
                            </div>
                            {model.isVision && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">Vision</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="h-px bg-gray-100 dark:bg-gray-700" />

            {/* Permission Mode Section */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('agentChat.settings.permissionMode')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'default', label: t('agentChat.permissionMode.default'), icon: Zap },
                  { value: 'acceptEdits', label: t('agentChat.permissionMode.acceptEdits'), icon: Zap },
                  { value: 'bypassPermissions', label: t('agentChat.permissionMode.bypassPermissions'), icon: Zap },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => handlePermissionModeChange(option.value as any)}
                    className={`flex flex-col items-center justify-center p-2 text-xs rounded-lg border transition-all text-center gap-1.5 h-full ${permissionMode === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <option.icon className={`w-4 h-4 ${permissionMode === option.value ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="leading-tight">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-gray-700" />

            {/* Environment Variables Section */}
            <div>
              <EnvVarsConfig envVars={envVars} onChange={onEnvVarsChange} />
            </div>

          </div>
        </div>
      )}
    </div>
  );
};