import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModelConfig } from '../../../types/claude-versions';
import { Eye, Plus, X } from 'lucide-react';

interface ModelConfigSectionProps {
  models: ModelConfig[];
  modelInput: { id: string; name: string; isVision: boolean };
  onAddModel: () => void;
  onUpdateModel: (modelId: string, updates: Partial<ModelConfig>) => void;
  onRemoveModel: (modelId: string) => void;
  onModelInputChange: (input: { id: string; name: string; isVision: boolean }) => void;
}

export const ModelConfigSection: React.FC<ModelConfigSectionProps> = ({
  models,
  modelInput,
  onAddModel,
  onUpdateModel,
  onRemoveModel,
  onModelInputChange,
}) => {
  const { t } = useTranslation('pages');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('settings.version.form.models')}
      </label>
      <div className="space-y-3">
        {/* 现有模型 */}
        {models.length > 0 && (
          <div className="space-y-2">
            {models.map(model => (
              <div key={model.id} className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={model.id}
                    onChange={(e) => onUpdateModel(model.id, { id: e.target.value })}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('settings.version.form.modelId')}
                  />
                  <input
                    type="text"
                    value={model.name}
                    onChange={(e) => onUpdateModel(model.id, { name: e.target.value })}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('settings.version.form.modelName')}
                  />
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={model.isVision}
                        onChange={(e) => onUpdateModel(model.id, { isVision: e.target.checked })}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{t('settings.version.form.visionModel')}</span>
                    </label>
                    {model.isVision && (
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveModel(model.id)}
                  className="p-1 text-red-500 hover:text-red-700 rounded flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 添加新模型 */}
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={modelInput.id}
            onChange={(e) => onModelInputChange({ ...modelInput, id: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('settings.version.form.modelId')}
          />
          <input
            type="text"
            value={modelInput.name}
            onChange={(e) => onModelInputChange({ ...modelInput, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('settings.version.form.modelName')}
          />
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={modelInput.isVision}
                onChange={(e) => onModelInputChange({ ...modelInput, isVision: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span>{t('settings.version.form.visionModel')}</span>
            </label>
            <button
              onClick={onAddModel}
              disabled={!modelInput.id || !modelInput.name}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{t('settings.version.form.addModel')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};