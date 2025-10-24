import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Plus, X } from 'lucide-react';

interface EnvironmentVariablesSectionProps {
  environmentVariables: Record<string, string>;
  envVarInput: { key: string; value: string };
  currentTemplateTokenUrl: string | null;
  onAddEnvironmentVariable: () => void;
  onUpdateEnvironmentVariable: (key: string, value: string) => void;
  onRemoveEnvironmentVariable: (key: string) => void;
  onEnvVarInputChange: (input: { key: string; value: string }) => void;
}

export const EnvironmentVariablesSection: React.FC<EnvironmentVariablesSectionProps> = ({
  environmentVariables,
  envVarInput,
  currentTemplateTokenUrl,
  onAddEnvironmentVariable,
  onUpdateEnvironmentVariable,
  onRemoveEnvironmentVariable,
  onEnvVarInputChange,
}) => {
  const { t } = useTranslation('pages');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('settings.version.form.envVars')}
      </label>
      <div className="space-y-3">
        {/* 现有环境变量 */}
        {Object.keys(environmentVariables).length > 0 && (
          <div className="space-y-2">
            {Object.entries(environmentVariables).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex-1 flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {key} =
                  </span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onUpdateEnvironmentVariable(key, e.target.value)}
                    placeholder={t('settings.version.form.emptyValue')}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {key === 'ANTHROPIC_AUTH_TOKEN' && currentTemplateTokenUrl && !value && (
                    <a
                      href={currentTemplateTokenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{t('settings.version.form.getApiKey')}</span>
                    </a>
                  )}
                </div>
                <button
                  onClick={() => onRemoveEnvironmentVariable(key)}
                  className="p-1 text-red-500 hover:text-red-700 rounded flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 添加新环境变量 */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={envVarInput.key}
            onChange={(e) => onEnvVarInputChange({ ...envVarInput, key: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('settings.version.form.varName')}
          />
          <input
            type="text"
            value={envVarInput.value}
            onChange={(e) => onEnvVarInputChange({ ...envVarInput, value: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('settings.version.form.varValue')}
          />
          <button
            onClick={onAddEnvironmentVariable}
            disabled={!envVarInput.key || !envVarInput.value}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};