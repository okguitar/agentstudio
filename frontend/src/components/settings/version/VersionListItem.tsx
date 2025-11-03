import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClaudeVersion } from '../../../types/claude-versions';
import { Copy, Edit, Star, Trash2, Eye } from 'lucide-react';

interface VersionListItemProps {
  version: ClaudeVersion;
  isDefault: boolean;
  onCopyCommand: (version: ClaudeVersion) => void;
  onSetDefault: (version: ClaudeVersion) => void;
  onEdit: (version: ClaudeVersion) => void;
  onDelete: (version: ClaudeVersion) => void;
}

export const VersionListItem: React.FC<VersionListItemProps> = ({
  version,
  isDefault,
  onCopyCommand,
  onSetDefault,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation('pages');

  return (
    <div
      className={`p-4 border rounded-lg ${
        isDefault
          ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <span>{version.name}</span>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({version.alias})</span>
              {version.isSystem && (
                <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                  {t('settings.version.systemLabel')}
                </span>
              )}
              {isDefault && (
                <span className="px-2 py-1 text-xs bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-200 rounded flex items-center space-x-1">
                  <Star className="w-3 h-3" />
                  <span>{t('settings.version.defaultLabel')}</span>
                </span>
              )}
            </h4>
          </div>
          {version.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{version.description}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-medium">{t('settings.version.pathLabel')}:</span> {version.executablePath}
          </p>
          {version.environmentVariables && Object.keys(version.environmentVariables).length > 0 && (
            <div className="mt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.version.envVarsLabel')}:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(version.environmentVariables).map(([key, value]) => (
                  <span
                    key={key}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {key}={value}
                  </span>
                ))}
              </div>
            </div>
          )}
          {version.models && version.models.length > 0 && (
            <div className="mt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.version.modelsLabel')}:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {version.models.map(model => (
                  <span
                    key={model.id}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded flex items-center space-x-1"
                  >
                    <span>{model.name}</span>
                    {model.isVision && (
                      <Eye className="w-3 h-3" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onCopyCommand(version)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title={t('settings.version.copyCommand')}
          >
            <Copy className="w-4 h-4" />
          </button>
          {!isDefault && (
            <button
              onClick={() => onSetDefault(version)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
              title={t('settings.version.setAsDefault')}
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(version)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title={t('settings.version.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          {!version.isSystem && (
            <button
              onClick={() => onDelete(version)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title={t('settings.version.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};