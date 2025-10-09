import React, { useState, useEffect } from 'react';
import {
  Save,
  Server,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCurrentHost, setHost } from '../lib/config';
import { showSuccess } from '../utils/toast';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('components');
  const [apiHost, setApiHost] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState('');

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentHost = getCurrentHost();
      if (!currentHost || currentHost === '') {
        setApiHost('http://127.0.0.1:4936');
      } else {
        setApiHost(currentHost);
      }
      setConnectionStatus('unknown');
      setErrorMessage('');
    }
  }, [isOpen]);

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
        setErrorMessage(t('apiSettingsModal.errors.serverError', { status: response.status, statusText: response.statusText }));
      }
    } catch (error) {
      setConnectionStatus('error');
      if (error instanceof Error) {
        setErrorMessage(t('apiSettingsModal.errors.connectionFailed', { message: error.message }));
      } else {
        setErrorMessage(t('apiSettingsModal.errors.connectionFailedUnknown'));
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!apiHost.trim()) {
      setErrorMessage(t('apiSettingsModal.errors.enterAddress'));
      return;
    }

    // Test connection first
    await testConnection(apiHost.trim());

    if (connectionStatus === 'success') {
      setHost(apiHost.trim());
      showSuccess(t('apiSettingsModal.saveSuccess'));
      window.location.reload();
    }
  };

  const handleReset = () => {
    const defaultHost = 'http://127.0.0.1:4936';
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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'success':
        return t('apiSettingsModal.status.success');
      case 'error':
        return t('apiSettingsModal.status.error');
      default:
        return t('apiSettingsModal.status.untested');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Server className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('apiSettingsModal.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="api-host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('apiSettingsModal.fields.address')}
            </label>
            <div className="flex space-x-2">
              <input
                id="api-host"
                type="url"
                value={apiHost}
                onChange={(e) => setApiHost(e.target.value)}
                placeholder={t('apiSettingsModal.fields.addressPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
                         focus:outline-none focus:ring-blue-500 focus:border-blue-500
                         dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={handleTest}
                disabled={isConnecting || !apiHost.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 text-sm"
              >
                {isConnecting ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Server className="w-3 h-3" />
                )}
                <span>{t('apiSettingsModal.actions.test')}</span>
              </button>
            </div>
            
            {/* Quick Select Buttons */}
            <div className="mt-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{t('apiSettingsModal.quickSelect.title')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickSelect('http://127.0.0.1:4936')}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600
                           transition-colors duration-200"
                >
                  {t('apiSettingsModal.quickSelect.localDev')}
                </button>
                <button
                  onClick={() => handleQuickSelect('https://srv.agentstudio.cc')}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                           text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600
                           transition-colors duration-200"
                >
                  {t('apiSettingsModal.quickSelect.officialServer')}
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
              {t('apiSettingsModal.status.label')}: {getStatusText()}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">{t('apiSettingsModal.instructions.title')}</h4>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• {t('apiSettingsModal.instructions.localDev')} <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://localhost:4936</code></li>
              <li>• {t('apiSettingsModal.instructions.production')}</li>
              <li>• {t('apiSettingsModal.instructions.cors')}</li>
              <li>• {t('apiSettingsModal.instructions.refresh')}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('apiSettingsModal.actions.reset')}</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md text-sm"
            >
              {t('apiSettingsModal.actions.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isConnecting || connectionStatus === 'error'}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md
                       disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Save className="w-4 h-4" />
              <span>{t('apiSettingsModal.actions.save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
