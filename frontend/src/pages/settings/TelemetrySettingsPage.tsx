/**
 * TelemetrySettingsPage
 * 
 * Settings page for managing telemetry preferences.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, ShieldCheck, Shield, AlertCircle } from 'lucide-react';
import { isTelemetryEnabled, setTelemetryEnabled } from '../../components/TelemetryProvider';

export const TelemetrySettingsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const [isEnabled, setIsEnabled] = React.useState(isTelemetryEnabled());

  const handleToggle = () => {
    const newValue = !isEnabled;
    setTelemetryEnabled(newValue);
    setIsEnabled(newValue);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('settings.telemetry.title', 'Telemetry & Analytics')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {t('settings.telemetry.description', 'Manage anonymous usage data collection')}
        </p>
      </div>

      {/* Main Toggle Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isEnabled ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <BarChart3 className={`w-6 h-6 ${isEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('settings.telemetry.enableTelemetry', 'Enable Anonymous Telemetry')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.telemetry.enableDescription', 'Help improve AgentStudio by sharing anonymous usage data')}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`px-6 py-3 border-t ${
          isEnabled 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {isEnabled ? (
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
      </div>

      {/* What We Collect */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-500" />
          {t('settings.telemetry.whatWeCollect', 'What We Collect')}
        </h3>
        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-start gap-3">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>{t('settings.telemetry.collect.installId', 'Anonymous Installation ID')}</strong>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.telemetry.collect.installIdDesc', 'A random UUID to distinguish installations, not linked to your identity')}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>{t('settings.telemetry.collect.version', 'App Version & OS')}</strong>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.telemetry.collect.versionDesc', 'Helps us understand which versions and platforms are most used')}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>{t('settings.telemetry.collect.features', 'Feature Usage')}</strong>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.telemetry.collect.featuresDesc', 'Which features are used (without content or personal data)')}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>{t('settings.telemetry.collect.errors', 'Error Reports')}</strong>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                {t('settings.telemetry.collect.errorsDesc', 'Sanitized error messages and stack traces (file paths removed)')}
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* What We Never Collect */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          {t('settings.telemetry.whatWeNeverCollect', 'What We Never Collect')}
        </h3>
        <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-start gap-3">
            <span className="text-red-500 mt-0.5">✗</span>
            <span>{t('settings.telemetry.neverCollect.files', 'File contents, code, or project data')}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red-500 mt-0.5">✗</span>
            <span>{t('settings.telemetry.neverCollect.keys', 'API keys, passwords, or credentials')}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red-500 mt-0.5">✗</span>
            <span>{t('settings.telemetry.neverCollect.pii', 'Personal identifying information (name, email, IP)')}</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red-500 mt-0.5">✗</span>
            <span>{t('settings.telemetry.neverCollect.conversations', 'Chat conversations or AI responses')}</span>
          </li>
        </ul>
      </div>

      {/* Privacy Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>{t('settings.telemetry.privacyNote', 'Privacy First')}:</strong>{' '}
          {t('settings.telemetry.privacyNoteDesc', 'All telemetry data is anonymized and aggregated. We cannot identify individual users. You can disable telemetry at any time.')}
        </p>
      </div>
    </div>
  );
};

export default TelemetrySettingsPage;
