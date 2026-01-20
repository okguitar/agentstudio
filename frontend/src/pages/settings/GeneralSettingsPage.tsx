import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Moon,
  Sun,
  Monitor,
  Globe,
  Settings,
  Info,
  Package,
  Server,
  ExternalLink,
  RefreshCw,
  Check,
  ArrowUpCircle,
  Github,
  FileText,
  BarChart3,
  ShieldCheck,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { useMobileContext } from '../../contexts/MobileContext';
import { useVersionCheck, useSystemInfo } from '../../hooks/useVersionCheck';
import { isTelemetryEnabled, setTelemetryEnabled } from '../../components/TelemetryProvider';

export const GeneralSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  
  // Theme and language state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'auto');
  const [language, setLanguage] = useState(i18n.language);

  // Version check state
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

  // Telemetry state
  const [isTelemetryOn, setIsTelemetryOn] = useState(isTelemetryEnabled());

  // Sync language state with i18n
  useEffect(() => {
    setLanguage(i18n.language);
  }, [i18n.language]);

  // Apply theme changes
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

  const handleCheckUpdate = () => {
    forceCheck();
    refetch();
  };

  const handleTelemetryToggle = () => {
    const newValue = !isTelemetryOn;
    setTelemetryEnabled(newValue);
    setIsTelemetryOn(newValue);
  };

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      {/* Header */}
      <div>
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2`}>
          <Settings className="w-6 h-6" />
          {t('settings.general.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.general.description')}</p>
      </div>

      {/* Update Available Banner */}
      {showUpdateNotification && latestVersion && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                <ArrowUpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  {t('settings.systemInfo.updateAvailable')}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {t('version.newVersionAvailable', { version: latestVersion })}
                </p>
                <div className="mt-3 flex space-x-2">
                  <a
                    href="https://github.com/okguitar/agentstudio/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {t('settings.systemInfo.viewReleases')}
                  </a>
                  <button
                    onClick={dismissUpdate}
                    className="px-3 py-1.5 text-blue-700 dark:text-blue-300 text-sm bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-lg"
                  >
                    {t('version.dismiss')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Settings Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4' : 'p-6'}`}>
        <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2`}>
          <Monitor className="w-5 h-5" />
          {t('settings.general.interfaceSettings')}
        </h2>
        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* Theme Selection */}
          <div>
            <label className="block font-medium text-gray-900 dark:text-white mb-2">{t('settings.general.theme.label')}</label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('settings.general.theme.description')}</p>
            <div className={`${isMobile ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-3 gap-3'}`}>
              {[
                { value: 'auto', label: t('settings.general.theme.auto'), icon: Monitor },
                { value: 'light', label: t('settings.general.theme.light'), icon: Sun },
                { value: 'dark', label: t('settings.general.theme.dark'), icon: Moon }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`${isMobile ? 'p-3' : 'p-4'} border-2 rounded-lg flex items-center ${isMobile ? 'flex-row space-x-3' : 'flex-col space-y-2'} transition-all ${
                    theme === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <option.icon className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
              <Globe className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span>{t('settings.general.language.label')}</span>
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('settings.general.language.description')}</p>
            <div className={`${isMobile ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-3'}`}>
              {[
                { value: 'zh-CN', label: '中文简体', flag: '🇨🇳' },
                { value: 'en-US', label: 'English', flag: '🇺🇸' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleLanguageChange(option.value)}
                  className={`${isMobile ? 'p-3' : 'p-4'} border-2 rounded-lg flex items-center space-x-3 transition-all ${
                    language === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{option.flag}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Info Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white flex items-center gap-2`}>
            <Info className="w-5 h-5" />
            {t('settings.systemInfo.title')}
          </h2>
          <button
            onClick={handleCheckUpdate}
            disabled={isChecking}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            {t('settings.systemInfo.checkUpdate')}
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Version Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Package className="w-4 h-4" />
                {t('settings.systemInfo.currentVersion')}
              </div>
              <div className="flex items-center">
                <span className="font-mono text-gray-900 dark:text-white">
                  v{currentVersion || systemInfo?.app.version || '-'}
                </span>
                {!hasUpdate && currentVersion && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="w-3 h-3 mr-1" />
                    {t('settings.systemInfo.upToDate')}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Server className="w-4 h-4" />
                Node.js
              </div>
              <p className="font-mono text-gray-900 dark:text-white">
                {systemInfo?.runtime.nodeVersion || '-'}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t('settings.systemInfo.platform')}
              </div>
              <p className="text-gray-900 dark:text-white capitalize">
                {systemInfo?.runtime.platform || '-'} ({systemInfo?.runtime.arch || '-'})
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <a
              href={systemInfo?.links.github || 'https://github.com/okguitar/agentstudio'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Github className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">GitHub</span>
            </a>
            <a
              href={systemInfo?.links.releases || 'https://github.com/okguitar/agentstudio/releases'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Package className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Releases</span>
            </a>
            <a
              href={systemInfo?.links.changelog || 'https://github.com/okguitar/agentstudio/blob/main/CHANGELOG.md'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <FileText className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-gray-900 dark:text-white">Changelog</span>
            </a>
            <a
              href={systemInfo?.links.npm || 'https://www.npmjs.com/package/agentstudio'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <Package className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-gray-900 dark:text-white">npm</span>
            </a>
          </div>
        </div>
      </div>

      {/* Telemetry Card */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}>
        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2`}>
            <BarChart3 className="w-5 h-5" />
            {t('settings.telemetry.title', 'Telemetry & Analytics')}
          </h2>
          
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isTelemetryOn ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <BarChart3 className={`w-5 h-5 ${isTelemetryOn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {t('settings.telemetry.enableTelemetry', 'Enable Anonymous Telemetry')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.telemetry.enableDescription', 'Help improve AgentStudio by sharing anonymous usage data')}
                </p>
              </div>
            </div>
            <button
              onClick={handleTelemetryToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isTelemetryOn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isTelemetryOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`px-4 py-2 border-t ${
          isTelemetryOn 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {isTelemetryOn ? (
              <>
                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-green-700 dark:text-green-400">
                  {t('settings.telemetry.statusEnabled', 'Telemetry is enabled. Thank you for helping improve AgentStudio!')}
                </span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {t('settings.telemetry.statusDisabled', 'Telemetry is disabled. No data is being collected.')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Privacy Details (Collapsible) */}
        <details className="border-t border-gray-200 dark:border-gray-700">
          <summary className="px-4 py-3 cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {t('settings.telemetry.privacyDetails', 'Privacy & Data Collection Details')}
          </summary>
          <div className="px-4 pb-4 space-y-4">
            {/* What We Collect */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                {t('settings.telemetry.whatWeCollect', 'What We Collect')}
              </h4>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('settings.telemetry.collect.installId', 'Anonymous Installation ID')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('settings.telemetry.collect.version', 'App Version & OS')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('settings.telemetry.collect.features', 'Feature Usage')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {t('settings.telemetry.collect.errors', 'Error Reports')}
                </li>
              </ul>
            </div>

            {/* What We Never Collect */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500" />
                {t('settings.telemetry.whatWeNeverCollect', 'What We Never Collect')}
              </h4>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  {t('settings.telemetry.neverCollect.files', 'File contents, code, or project data')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  {t('settings.telemetry.neverCollect.keys', 'API keys, passwords, or credentials')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  {t('settings.telemetry.neverCollect.pii', 'Personal identifying information')}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  {t('settings.telemetry.neverCollect.conversations', 'Chat conversations or AI responses')}
                </li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
