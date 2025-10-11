import React, { useState, useEffect } from 'react';
import {
  Save,
  Server,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCurrentHost, setHost } from '../../lib/config.js';
import { showSuccess } from '../../utils/toast';
import { useMobileContext } from '../../contexts/MobileContext';

export const ApiSettingsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [apiHost, setApiHost] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState('');

  // Load current settings
  useEffect(() => {
    const currentHost = getCurrentHost();
    // 如果没有设置过host，则使用本地开发环境作为默认值
    if (!currentHost || currentHost === '') {
      setApiHost('http://127.0.0.1:4936');
    } else {
      setApiHost(currentHost);
    }
  }, []);

  const testConnection = async (host: string) => {
    setIsConnecting(true);
    setConnectionStatus('unknown');
    setErrorMessage('');

    try {
      const testUrl = `${host}/api/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
        setErrorMessage(t('settings.apiSettings.serverError', { status: response.status, statusText: response.statusText }));
      }
    } catch (error) {
      setConnectionStatus('error');
      if (error instanceof Error) {
        setErrorMessage(t('settings.apiSettings.connectionFailed', { message: error.message }));
      } else {
        setErrorMessage(t('settings.apiSettings.connectionUnknownError'));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!apiHost.trim()) {
      setErrorMessage(t('settings.apiSettings.enterApiHost'));
      return;
    }

    // Test connection first
    await testConnection(apiHost.trim());

    if (connectionStatus === 'success') {
      setHost(apiHost.trim());
      showSuccess(t('settings.apiSettings.settingsSavedRefresh'));
    }
  };

  const handleReset = () => {
    const defaultHost = 'http://127.0.0.1:4936'; // 默认使用本地开发服务器
    setApiHost(defaultHost);
    setConnectionStatus('unknown');
    setErrorMessage('');
  };

  const handleTest = () => {
    if (apiHost.trim()) {
      testConnection(apiHost.trim());
    }
  };

  const handleQuickSelect = (url: string) => {
    setApiHost(url);
    setConnectionStatus('unknown');
    setErrorMessage('');
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'success':
        return t('settings.apiSettings.status.success');
      case 'error':
        return t('settings.apiSettings.status.error');
      default:
        return t('settings.apiSettings.status.untested');
    }
  };

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-4' : 'p-6'} rounded-lg shadow-sm border border-gray-200 dark:border-gray-700`}>
        <div className={`flex items-center ${isMobile ? 'space-x-2 mb-4' : 'space-x-3 mb-6'}`}>
          <Server className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-500`} />
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white`}>{t('settings.apiSettings.title')}</h3>
        </div>

        <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
          <div>
            <label htmlFor="api-host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('settings.apiSettings.hostLabel')}
            </label>
            <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex space-x-2'}`}>
              <input
                id="api-host"
                type="url"
                value={apiHost}
                onChange={(e) => setApiHost(e.target.value)}
                placeholder={t('settings.apiSettings.hostPlaceholder')}
                className={`${isMobile ? 'flex-1' : 'flex-1'} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         focus:outline-none focus:ring-blue-500 focus:border-blue-500
                         dark:bg-gray-700 dark:text-white ${isMobile ? 'text-sm' : ''}`}
              />
              <button
                onClick={handleTest}
                disabled={isConnecting || !apiHost.trim()}
                className={`${isMobile ? 'w-full py-2.5 px-4' : 'px-4 py-2'} bg-blue-600 hover:bg-blue-700 text-white rounded-md
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${isMobile ? 'justify-center space-x-2' : 'space-x-2'} ${isMobile ? 'text-sm' : ''}`}
              >
                {isConnecting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Server className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
                )}
                <span>{t('settings.apiSettings.testConnection')}</span>
              </button>
            </div>
            
            {/* Quick Select Buttons */}
            <div className="mt-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('settings.apiSettings.quickSelect')}</p>
              <div className={`${isMobile ? 'grid grid-cols-1 gap-2' : 'flex flex-wrap gap-2'}`}>
                <button
                  onClick={() => handleQuickSelect('http://127.0.0.1:4936')}
                  className={`${isMobile ? 'px-4 py-2.5' : 'px-3 py-1.5'} ${isMobile ? 'text-sm' : 'text-xs'} bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-700 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-600
                           transition-colors duration-200 flex items-center ${isMobile ? 'justify-center space-x-2' : 'space-x-1'}`}
                >
                  <span>@</span>
                  <span>{isMobile ? '本地开发服务器' : 'http://127.0.0.1:4936'}</span>
                </button>
                <button
                  onClick={() => handleQuickSelect('https://srv.agentstudio.cc')}
                  className={`${isMobile ? 'px-4 py-2.5' : 'px-3 py-1.5'} ${isMobile ? 'text-sm' : 'text-xs'} bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-700 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-600
                           transition-colors duration-200 flex items-center ${isMobile ? 'justify-center space-x-2' : 'space-x-1'}`}
                >
                  <span>@</span>
                  <span>{isMobile ? '生产服务器' : 'https://srv.agentstudio.cc'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`text-sm ${
              connectionStatus === 'success' ? 'text-green-600 dark:text-green-400' :
              connectionStatus === 'error' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {t('settings.apiSettings.connectionStatus')}: {getStatusText()}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">{t('settings.apiSettings.usage.title')}</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• {t('settings.apiSettings.usage.localDev')} <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://localhost:4936</code></li>
              <li>• {t('settings.apiSettings.usage.production')} <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">https://your-domain.com</code></li>
              <li>• {t('settings.apiSettings.usage.cors')}</li>
              <li>• {t('settings.apiSettings.usage.refresh')}</li>
            </ul>
          </div>
        </div>

        <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex justify-between'} mt-6`}>
          <button
            onClick={handleReset}
            className={`${isMobile ? 'flex-1' : ''} flex items-center ${isMobile ? 'justify-center space-x-1' : 'space-x-2'} ${isMobile ? 'px-3 py-2.5' : 'px-4 py-2'} bg-gray-600 hover:bg-gray-700 text-white rounded-md ${isMobile ? 'text-sm' : ''}`}
          >
            <RotateCcw className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
            <span>{isMobile ? '重置' : t('settings.apiSettings.resetToDefault')}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isConnecting || connectionStatus === 'error'}
            className={`${isMobile ? 'flex-1' : ''} flex items-center ${isMobile ? 'justify-center space-x-1' : 'space-x-2'} ${isMobile ? 'px-3 py-2.5' : 'px-4 py-2'} bg-green-600 hover:bg-green-700 text-white rounded-md
                     disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'text-sm' : ''}`}
          >
            <Save className={`${isMobile ? 'w-4 h-4' : 'w-4 h-4'}`} />
            <span>{isMobile ? '保存' : t('settings.apiSettings.saveSettings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};