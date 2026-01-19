import React from 'react';
import { ArrowUpCircle, X, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVersionCheck } from '../hooks/useVersionCheck';

interface UpdateNotificationProps {
  compact?: boolean;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ compact = false }) => {
  const { t } = useTranslation('pages');
  const {
    currentVersion,
    latestVersion,
    showUpdateNotification,
    dismissUpdate,
    isLoading,
  } = useVersionCheck();

  if (isLoading || !showUpdateNotification) {
    return null;
  }

  const handleViewUpdate = () => {
    window.open('https://github.com/okguitar/agentstudio/releases', '_blank');
  };

  if (compact) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ArrowUpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {t('version.newVersionAvailable', { version: latestVersion })}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleViewUpdate}
              className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
              title={t('version.viewUpdate')}
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={dismissUpdate}
              className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
              title={t('version.dismiss')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
          {t('version.currentVersion')}: {currentVersion}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <ArrowUpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t('version.updateAvailableTitle')}
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              {t('version.newVersionAvailable', { version: latestVersion })}
            </p>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              {t('version.currentVersion')}: {currentVersion}
            </p>
          </div>
        </div>
        <button
          onClick={dismissUpdate}
          className="p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-3 flex space-x-3">
        <button
          onClick={handleViewUpdate}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          {t('version.viewUpdate')}
        </button>
        <button
          onClick={dismissUpdate}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-md transition-colors"
        >
          {t('version.remindLater')}
        </button>
      </div>
    </div>
  );
};
