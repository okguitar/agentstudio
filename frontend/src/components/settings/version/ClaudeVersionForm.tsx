import React from 'react';
import { useTranslation } from 'react-i18next';
import { VERSION_TEMPLATES, type VersionTemplate } from '../../../types/versionTemplates';
import { ClaudeVersion, ClaudeVersionCreate, ModelConfig } from '../../../types/claude-versions';
import { Save, X, FolderOpen, Sparkles, Settings } from 'lucide-react';
import { ModelConfigSection } from './ModelConfigSection';
import { EnvironmentVariablesSection } from './EnvironmentVariablesSection';

interface ClaudeVersionFormProps {
  editingVersion: ClaudeVersion | null;
  isCreating: boolean;
  formData: Partial<ClaudeVersionCreate>;
  envVarInput: { key: string; value: string };
  modelInput: { id: string; name: string; isVision: boolean };
  currentTemplateTokenUrl: string | null;
  isSaving: boolean;
  onApplyTemplate: (template: VersionTemplate) => void;
  onCancel: () => void;
  onSave: () => void;
  onSelectExecutablePath: () => void;
  onFormDataChange: (data: Partial<ClaudeVersionCreate>) => void;
  onEnvVarInputChange: (input: { key: string; value: string }) => void;
  onModelInputChange: (input: { id: string; name: string; isVision: boolean }) => void;
  onAddEnvironmentVariable: () => void;
  onUpdateEnvironmentVariable: (key: string, value: string) => void;
  onRemoveEnvironmentVariable: (key: string) => void;
  onAddModel: () => void;
  onUpdateModel: (modelId: string, updates: Partial<ModelConfig>) => void;
  onRemoveModel: (modelId: string) => void;
}

export const ClaudeVersionForm: React.FC<ClaudeVersionFormProps> = ({
  editingVersion,
  isCreating,
  formData,
  envVarInput,
  modelInput,
  currentTemplateTokenUrl,
  isSaving,
  onApplyTemplate,
  onCancel,
  onSave,
  onSelectExecutablePath,
  onFormDataChange,
  onEnvVarInputChange,
  onModelInputChange,
  onAddEnvironmentVariable,
  onUpdateEnvironmentVariable,
  onRemoveEnvironmentVariable,
  onAddModel,
  onUpdateModel,
  onRemoveModel,
}) => {
  const { t } = useTranslation('pages');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingVersion ? t('settings.version.form.editTitle') : t('settings.version.form.createTitle')}
            </h3>
            {editingVersion?.isSystem && (
              <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                {t('settings.version.systemLabel')}
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* 系统版本提示 */}
            {editingVersion?.isSystem && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    系统版本编辑
                  </h4>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  系统版本是自动检测的 Claude Code 版本，某些字段（如可执行路径）无法修改，但您可以配置支持的模型。
                </p>
              </div>
            )}

            {/* 配置模板选择 - 只在新建时显示 */}
            {isCreating && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300">
                    {t('settings.version.templates.title')}
                  </h4>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-400 mb-3">
                  {t('settings.version.templates.description')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {VERSION_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => onApplyTemplate(template)}
                      className="p-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700
                               hover:border-purple-400 dark:hover:border-purple-500 rounded-md text-left
                               transition-all duration-200 group"
                    >
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          {template.logoUrl && (
                            <img
                              src={template.logoUrl}
                              alt={template.name}
                              className="w-6 h-6 flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                            {t(`settings.version.templates.providers.${template.id}.name`)}
                          </h5>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t(`settings.version.templates.providers.${template.id}.description`)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.version.form.versionName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('settings.version.form.versionNamePlaceholder')}
                  disabled={editingVersion?.isSystem}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.version.form.alias')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.alias || ''}
                  onChange={(e) => onFormDataChange({ ...formData, alias: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('settings.version.form.aliasPlaceholder')}
                  disabled={editingVersion?.isSystem}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.version.form.description')}
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('settings.version.form.descriptionPlaceholder')}
                disabled={editingVersion?.isSystem}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('settings.version.form.executablePath')}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.executablePath || ''}
                  onChange={(e) => onFormDataChange({ ...formData, executablePath: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('settings.version.form.executablePathPlaceholder')}
                  disabled={editingVersion?.isSystem}
                />
                <button
                  onClick={onSelectExecutablePath}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  title={t('settings.version.form.browseFile')}
                  disabled={editingVersion?.isSystem}
                >
                  <FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* 模型配置 */}
            <ModelConfigSection
              models={formData.models || []}
              modelInput={modelInput}
              onAddModel={onAddModel}
              onUpdateModel={onUpdateModel}
              onRemoveModel={onRemoveModel}
              onModelInputChange={onModelInputChange}
            />

            {/* 环境变量 */}
            <EnvironmentVariablesSection
              environmentVariables={formData.environmentVariables || {}}
              envVarInput={envVarInput}
              currentTemplateTokenUrl={currentTemplateTokenUrl}
              onAddEnvironmentVariable={onAddEnvironmentVariable}
              onUpdateEnvironmentVariable={onUpdateEnvironmentVariable}
              onRemoveEnvironmentVariable={onRemoveEnvironmentVariable}
              onEnvVarInputChange={onEnvVarInputChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            {t('settings.version.form.cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving
                ? t('settings.version.form.saving')
                : editingVersion
                ? t('settings.version.form.update')
                : t('settings.version.form.create')
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};