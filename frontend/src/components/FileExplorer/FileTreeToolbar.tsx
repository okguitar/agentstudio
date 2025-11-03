import React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

interface FileTreeToolbarProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export const FileTreeToolbar: React.FC<FileTreeToolbarProps> = ({ isLoading, onRefresh }) => {
  const { t } = useTranslation('components');

  return (
    <div className="h-12 px-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center flex-shrink-0">
      <div className="flex items-center justify-between w-full">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('fileExplorer.title')}
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title={t('common:actions.refresh')}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};