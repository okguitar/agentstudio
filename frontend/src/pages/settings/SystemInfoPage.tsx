import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Info,
  Package,
  Server,
  ExternalLink,
  RefreshCw,
  Check,
  ArrowUpCircle,
  Github,
  FileText,
} from 'lucide-react';
import { useVersionCheck, useSystemInfo } from '../../hooks/useVersionCheck';

export const SystemInfoPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const {
    currentVersion,
    latestVersion,
    hasUpdate,
    forceCheck,
    isChecking,
    dismissUpdate,
    showUpdateNotification,
  } = useVersionCheck();
  const { systemInfo, refetch } = useSystemInfo();

  const handleCheckUpdate = () => {
    forceCheck();
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Info className="w-6 h-6 mr-2" />
            {t('settings.systemInfo.title')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('settings.systemInfo.subtitle')}
          </p>
        </div>
        <button
          onClick={handleCheckUpdate}
          disabled={isChecking}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {t('settings.systemInfo.checkUpdate')}
        </button>
      </div>

      {/* Update Available Banner */}
      {showUpdateNotification && latestVersion && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                <ArrowUpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {t('settings.systemInfo.updateAvailable')}
                </h2>
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  {t('version.newVersionAvailable', { version: latestVersion })}
                </p>
                <div className="mt-4 flex space-x-3">
                  <a
                    href="https://github.com/okguitar/agentstudio/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('settings.systemInfo.viewReleases')}
                  </a>
                  <button
                    onClick={dismissUpdate}
                    className="inline-flex items-center px-4 py-2 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {t('version.dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Package className="w-5 h-5 mr-2" />
            {t('settings.systemInfo.versionInfo')}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.appName')}
                </label>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {systemInfo?.app.name || 'AgentStudio'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.currentVersion')}
                </label>
                <div className="mt-1 flex items-center">
                  <span className="text-lg font-mono text-gray-900 dark:text-white">
                    v{currentVersion || systemInfo?.app.version || '-'}
                  </span>
                  {!hasUpdate && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="w-3 h-3 mr-1" />
                      {t('settings.systemInfo.upToDate')}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.latestVersion')}
                </label>
                <p className="mt-1 text-lg font-mono text-gray-900 dark:text-white">
                  {latestVersion ? `v${latestVersion}` : '-'}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Node.js {t('settings.systemInfo.version')}
                </label>
                <p className="mt-1 font-mono text-gray-900 dark:text-white">
                  {systemInfo?.runtime.nodeVersion || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.platform')}
                </label>
                <p className="mt-1 text-gray-900 dark:text-white capitalize">
                  {systemInfo?.runtime.platform || '-'} ({systemInfo?.runtime.arch || '-'})
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Runtime Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Server className="w-5 h-5 mr-2" />
            {t('settings.systemInfo.runtimeInfo')}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Node.js</p>
              <p className="mt-1 font-mono text-gray-900 dark:text-white">
                {systemInfo?.runtime.nodeVersion || '-'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.systemInfo.platform')}</p>
              <p className="mt-1 text-gray-900 dark:text-white capitalize">
                {systemInfo?.runtime.platform || '-'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.systemInfo.architecture')}</p>
              <p className="mt-1 text-gray-900 dark:text-white">
                {systemInfo?.runtime.arch || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Links Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <ExternalLink className="w-5 h-5 mr-2" />
            {t('settings.systemInfo.links')}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href={systemInfo?.links.github || 'https://github.com/okguitar/agentstudio'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Github className="w-6 h-6 text-gray-700 dark:text-gray-300 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">GitHub</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.viewSource')}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
            <a
              href={systemInfo?.links.releases || 'https://github.com/okguitar/agentstudio/releases'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Package className="w-6 h-6 text-gray-700 dark:text-gray-300 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Releases</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.viewReleases')}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
            <a
              href={systemInfo?.links.changelog || 'https://github.com/okguitar/agentstudio/blob/main/CHANGELOG.md'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-6 h-6 text-gray-700 dark:text-gray-300 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Changelog</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.viewChangelog')}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
            <a
              href={systemInfo?.links.npm || 'https://www.npmjs.com/package/agentstudio'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Package className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">npm</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.systemInfo.viewNpm')}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
