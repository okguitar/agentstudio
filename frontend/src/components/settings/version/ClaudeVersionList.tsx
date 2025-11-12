import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClaudeVersion } from '../../../types/claude-versions';
import { Settings } from 'lucide-react';
import { VersionListItem } from './VersionListItem';

interface ClaudeVersionListProps {
  versions: ClaudeVersion[];
  defaultVersionId: string;
  isLoading: boolean;
  onCopyCommand: (version: ClaudeVersion) => void;
  onSetDefault: (version: ClaudeVersion) => void;
  onEdit: (version: ClaudeVersion) => void;
  onDelete: (version: ClaudeVersion) => void;
}

export const ClaudeVersionList: React.FC<ClaudeVersionListProps> = ({
  versions,
  defaultVersionId,
  isLoading,
  onCopyCommand,
  onSetDefault,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation('pages');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p>{t('settings.supplier.noSuppliers')}</p>
        <p className="text-sm">{t('settings.supplier.clickToAddFirst')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <VersionListItem
          key={version.id}
          version={version}
          isDefault={version.id === defaultVersionId}
          onCopyCommand={onCopyCommand}
          onSetDefault={onSetDefault}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};