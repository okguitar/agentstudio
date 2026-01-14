import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Copy,
  BookOpen,
  RefreshCw,
  Loader2,
  CheckCircle,
  ArrowLeft,
  HelpCircle,
  XCircle
} from 'lucide-react';

interface BackendNotFoundStepProps {
  onRetry?: () => void;
  onAddRemote: (name: string, url: string) => Promise<boolean>;
  onBack?: () => void;
  showWarning?: boolean;
}

export const BackendNotFoundStep: React.FC<BackendNotFoundStepProps> = ({
  onRetry,
  onAddRemote,
  onBack,
  showWarning = true
}) => {
  const { t } = useTranslation('onboarding');
  const [serviceName, setServiceName] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);

  const installCommands = `git clone https://github.com/okguitar/agentstudio.git
cd agentstudio
pnpm install
pnpm run dev:backend`;

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(installCommands);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!serviceUrl) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const testUrl = `${serviceUrl}/api/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      setTestResult(response.ok ? 'success' : 'error');
    } catch (error) {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddService = async () => {
    if (!serviceName.trim() || !serviceUrl.trim()) return;

    const success = await onAddRemote(serviceName.trim(), serviceUrl.trim());
    if (success) {
      setServiceName('');
      setServiceUrl('');
      setTestResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button (optional) */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('backend.actions.back')}</span>
        </button>
      )}

      {/* Warning Banner (conditional) */}
      {showWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                {t('backend.notFound.title')}
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {t('backend.notFound.description')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Title */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          {t('backend.addService.title')}
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('backend.addService.description')}
        </p>
      </div>

      {/* Service Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('backend.addService.serviceName')}
          </label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder={t('backend.addService.serviceNamePlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('backend.addService.serviceUrl')}
          </label>
          <input
            type="url"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex space-x-3">
        <button
          onClick={handleTestConnection}
          disabled={!serviceUrl || isTesting}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('backend.addService.testing')}</span>
            </>
          ) : testResult === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{t('backend.addService.success')}</span>
            </>
          ) : testResult === 'error' ? (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span>{t('backend.addService.failed')}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>{t('backend.addService.testConnection')}</span>
            </>
          )}
        </button>
        <button
          onClick={handleAddService}
          disabled={!serviceName || !serviceUrl || testResult !== 'success'}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {t('backend.addService.addButton')}
        </button>
      </div>

      {/* Install Guide (Always Expanded) */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h5 className="font-medium text-gray-900 dark:text-white text-sm">
            {t('backend.addService.installGuide.title')}
          </h5>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('backend.addService.installGuide.description')}
        </p>

        {/* Install Commands */}
        <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-3 relative">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {installCommands}
          </pre>
          <button
            onClick={handleCopyCommands}
            className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title={t('backend.addService.installGuide.copyCommands')}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleCopyCommands}
            className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t('backend.addService.installGuide.copyCommands')}</span>
          </button>
          <a
            href="https://github.com/okguitar/agentstudio?tab=readme-ov-file#-quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('backend.addService.installGuide.viewDocs')}</span>
          </a>
        </div>
      </div>

      {/* Bottom Actions (Retry only if provided) */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('backend.addService.retry')}</span>
        </button>
      )}
    </div>
  );
};
