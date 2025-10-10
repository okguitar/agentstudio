import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Terminal,
  Package,
  Key,
  Rocket
} from 'lucide-react';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';

interface DetectResult {
  userInstalled: boolean;
  systemInstalled: boolean;
  userPath: string | null;
  systemPath: string | null;
  version: string | null;
  packageManager: string | null;
}

interface ClaudeVersionSetupWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const ClaudeVersionSetupWizard: React.FC<ClaudeVersionSetupWizardProps> = ({
  onComplete,
  onSkip
}) => {
  const { t } = useTranslation('components');
  const [step, setStep] = useState<'detecting' | 'selection' | 'config' | 'creating' | 'success'>('detecting');
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useUserInstalled, setUseUserInstalled] = useState(true);
  const [authToken, setAuthToken] = useState('');
  const [authMode, setAuthMode] = useState<'token' | 'pro' | 'skip'>('skip');

  // 检测 Claude CLI 安装
  useEffect(() => {
    const detectClaude = async () => {
      try {
        const response = await authFetch(`${API_BASE}/settings/claude-versions/detect`, {
          method: 'POST'
        });

        // 如果接口不存在（404），说明后端版本太老，直接跳过初始化
        if (response.status === 404) {
          console.log('Detect API not available, skipping setup wizard');
          if (onSkip) {
            onSkip();
          }
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to detect Claude CLI');
        }

        const result: DetectResult = await response.json();
        setDetectResult(result);

        // 自动选择默认选项
        if (result.userInstalled) {
          setUseUserInstalled(true);
        } else if (result.systemInstalled) {
          setUseUserInstalled(false);
        }

        setStep('selection');
      } catch (err) {
        // 如果是网络错误或其他错误，也跳过
        console.error('Failed to detect Claude CLI:', err);
        if (onSkip) {
          onSkip();
        }
      }
    };

    detectClaude();
  }, [onSkip]);

  // 创建系统版本
  const handleCreateVersion = async () => {
    setStep('creating');
    setError(null);

    try {
      const response = await authFetch(`${API_BASE}/settings/claude-versions/init-system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          useUserInstalled,
          authToken: authMode === 'token' ? authToken : undefined,
          skipAuthToken: authMode === 'skip' || authMode === 'pro'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create system version');
      }

      setStep('success');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('config');
    }
  };

  const renderDetecting = () => (
    <div className="text-center py-8">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('claudeVersionSetup.detecting.title')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {t('claudeVersionSetup.detecting.description')}
      </p>
    </div>
  );

  const renderSelection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {t('claudeVersionSetup.selection.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('claudeVersionSetup.selection.description')}
        </p>
      </div>

      {/* 检测结果 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-start space-x-3">
          {detectResult?.userInstalled ? (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('claudeVersionSetup.selection.userInstalled')}
            </h4>
            {detectResult?.userInstalled && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <p>{t('claudeVersionSetup.selection.path')}: {detectResult.userPath}</p>
                <p>{t('claudeVersionSetup.selection.version')}: {detectResult.version}</p>
                {detectResult.packageManager && (
                  <p>{t('claudeVersionSetup.selection.packageManager')}: {detectResult.packageManager}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-3">
          {detectResult?.systemInstalled ? (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-gray-400 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('claudeVersionSetup.selection.systemInstalled')}
            </h4>
            {detectResult?.systemInstalled && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <p>{t('claudeVersionSetup.selection.path')}: {detectResult.systemPath}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 选择项 */}
      {(detectResult?.userInstalled || detectResult?.systemInstalled) && (
        <div className="space-y-3">
          {detectResult.userInstalled && (
            <button
              onClick={() => setUseUserInstalled(true)}
              className={`w-full flex items-center space-x-4 p-4 rounded-lg border-2 transition-colors ${
                useUserInstalled
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Terminal className={`w-6 h-6 ${useUserInstalled ? 'text-blue-600' : 'text-gray-600'}`} />
              <div className="flex-1 text-left">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('claudeVersionSetup.selection.useUserInstalled')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('claudeVersionSetup.selection.useUserInstalledDesc')}
                </p>
              </div>
            </button>
          )}

          {detectResult.systemInstalled && (
            <button
              onClick={() => setUseUserInstalled(false)}
              className={`w-full flex items-center space-x-4 p-4 rounded-lg border-2 transition-colors ${
                !useUserInstalled
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Package className={`w-6 h-6 ${!useUserInstalled ? 'text-blue-600' : 'text-gray-600'}`} />
              <div className="flex-1 text-left">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('claudeVersionSetup.selection.useSystemPackage')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('claudeVersionSetup.selection.useSystemPackageDesc')}
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* 未检测到任何 Claude CLI */}
      {!detectResult?.userInstalled && !detectResult?.systemInstalled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                {t('claudeVersionSetup.selection.noClaudeFound')}
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {t('claudeVersionSetup.selection.noClaudeFoundDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('claudeVersionSetup.actions.skip')}
          </button>
        )}
        <button
          onClick={() => setStep('config')}
          disabled={!detectResult?.userInstalled && !detectResult?.systemInstalled}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {t('claudeVersionSetup.actions.next')}
        </button>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {t('claudeVersionSetup.config.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('claudeVersionSetup.config.description')}
        </p>
      </div>

      {/* 认证模式选择 */}
      <div className="space-y-3">
        <button
          onClick={() => setAuthMode('skip')}
          className={`w-full flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors ${
            authMode === 'skip'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex-1 text-left">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('claudeVersionSetup.config.skipToken')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('claudeVersionSetup.config.skipTokenDesc')}
            </p>
          </div>
        </button>

        <button
          onClick={() => setAuthMode('pro')}
          className={`w-full flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors ${
            authMode === 'pro'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex-1 text-left">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('claudeVersionSetup.config.claudePro')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('claudeVersionSetup.config.claudeProDesc')}
            </p>
          </div>
        </button>

        <button
          onClick={() => setAuthMode('token')}
          className={`w-full flex items-start space-x-4 p-4 rounded-lg border-2 transition-colors ${
            authMode === 'token'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex-1 text-left">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('claudeVersionSetup.config.enterToken')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('claudeVersionSetup.config.enterTokenDesc')}
            </p>
          </div>
        </button>
      </div>

      {/* Token 输入框 */}
      {authMode === 'token' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ANTHROPIC_AUTH_TOKEN
          </label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder={t('claudeVersionSetup.config.tokenPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={() => setStep('selection')}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t('claudeVersionSetup.actions.back')}
        </button>
        <button
          onClick={handleCreateVersion}
          disabled={authMode === 'token' && !authToken}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          <Rocket className="w-4 h-4" />
          <span>{t('claudeVersionSetup.actions.create')}</span>
        </button>
      </div>
    </div>
  );

  const renderCreating = () => (
    <div className="text-center py-8">
      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {t('claudeVersionSetup.creating.title')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {t('claudeVersionSetup.creating.description')}
      </p>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {t('claudeVersionSetup.success.title')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {t('claudeVersionSetup.success.description')}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {step === 'detecting' && renderDetecting()}
        {step === 'selection' && renderSelection()}
        {step === 'config' && renderConfig()}
        {step === 'creating' && renderCreating()}
        {step === 'success' && renderSuccess()}
      </div>
    </div>
  );
};
