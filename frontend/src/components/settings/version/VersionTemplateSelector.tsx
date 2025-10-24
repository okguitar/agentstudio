import React from 'react';
import { useTranslation } from 'react-i18next';
import { VERSION_TEMPLATES, type VersionTemplate } from '../../../types/versionTemplates';
import { Plus } from 'lucide-react';

interface VersionTemplateSelectorProps {
  onQuickCreateWithTemplate: (template: VersionTemplate) => void;
  onAddVersion: () => void;
}

export const VersionTemplateSelector: React.FC<VersionTemplateSelectorProps> = ({
  onQuickCreateWithTemplate,
  onAddVersion,
}) => {
  const { t } = useTranslation('pages');

  return (
    <div className="flex items-center space-x-3">
      {VERSION_TEMPLATES.map(template => (
        <button
          key={template.id}
          onClick={() => onQuickCreateWithTemplate(template)}
          className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                   text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                   hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200 group"
          title={t(`settings.version.templates.providers.${template.id}.description`)}
        >
          {template.logoUrl && (
            <img
              src={template.logoUrl}
              alt={template.name}
              className="w-5 h-5 flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span className="text-sm font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400">
            {t(`settings.version.templates.providers.${template.id}.name`)}
          </span>
        </button>
      ))}

      <button
        onClick={onAddVersion}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>{t('settings.version.addVersion')}</span>
      </button>
    </div>
  );
};