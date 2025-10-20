import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Zap, Terminal, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePermissionModeChange = (mode: 'default' | 'acceptEdits' | 'bypassPermissions') => {
    onPermissionModeChange(mode);
    setIsOpen(false);
  };

  const handleClaudeVersionChange = (version: string | undefined) => {
    onClaudeVersionChange(version);
    setIsOpen(false);
  };

  const handleModelChange = (model: string) => {
    onModelChange(model);
    setIsOpen(false);
  };

  const hasClaudeVersions = claudeVersionsData?.versions && claudeVersionsData.versions.length > 1;
  const hasMultipleModels = availableModels.length >= 2;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
          permissionMode !== 'default' || selectedClaudeVersion || selectedModel !== 'sonnet'
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50'
            : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
        disabled={isAiTyping}
        title={t('agentChat.settings.title')}
      >
        <Settings className="w-4 h-4" />
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">

          {/* Permission Mode Section */}
          <div className="border-b border-gray-100 dark:border-gray-700">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('agentChat.settings.permissionMode')}
            </div>
            {[
              { value: 'default', label: t('agentChat.permissionMode.default') },
              { value: 'acceptEdits', label: t('agentChat.permissionMode.acceptEdits') },
              { value: 'bypassPermissions', label: t('agentChat.permissionMode.bypassPermissions') },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handlePermissionModeChange(option.value as any)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  permissionMode === option.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>{option.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Claude Version Section */}
          {hasClaudeVersions && (
            <div className="border-b border-gray-100 dark:border-gray-700">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('agentChat.settings.claudeVersion')}
              </div>
              <button
                onClick={() => handleClaudeVersionChange(undefined)}
                disabled={isVersionLocked}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  !selectedClaudeVersion ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                } ${isVersionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <span>
                    {claudeVersionsData?.defaultVersionId 
                      ? claudeVersionsData.versions.find(v => v.id === claudeVersionsData.defaultVersionId)?.name || t('agentChat.claudeVersion.default')
                      : t('agentChat.claudeVersion.default')
                    }
                  </span>
                </div>
              </button>
              {claudeVersionsData.versions
                .filter(version => claudeVersionsData.defaultVersionId && version.id !== claudeVersionsData.defaultVersionId)
                .map(version => (
                  <button
                    key={version.id}
                    onClick={() => handleClaudeVersionChange(version.id)}
                    disabled={isVersionLocked}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedClaudeVersion === version.id
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'text-gray-700 dark:text-gray-300'
                    } ${isVersionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4" />
                      <div className="flex-1">
                        <span>{version.name}</span>
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          )}

          {/* Model Section */}
          {hasMultipleModels && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('agentChat.settings.model')}
              </div>
              {availableModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedModel === model.id
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  title={model.description}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <Cpu className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{model.name}</span>
                    </div>
                    {model.isVision && (
                      <span className="text-xs text-gray-400 flex-shrink-0">👁️</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No settings available message */}
          {!hasClaudeVersions && !hasMultipleModels && (
            <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('agentChat.settings.noSettings')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};