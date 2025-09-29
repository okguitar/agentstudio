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
import { getCurrentHost, setHost } from '../lib/config.js';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiHost, setApiHost] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState('');

  // Load current settings
  useEffect(() => {
    if (isOpen) {
      const currentHost = getCurrentHost();
      // 如果没有设置过host，则使用本地开发环境作为默认值
      if (!currentHost || currentHost === '') {
        setApiHost('http://127.0.0.1:4936');
      } else {
        setApiHost(currentHost);
      }
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
        setErrorMessage(`服务器响应错误: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setConnectionStatus('error');
      if (error instanceof Error) {
        setErrorMessage(`连接失败: ${error.message}`);
      } else {
        setErrorMessage('连接失败: 未知错误');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!apiHost.trim()) {
      setErrorMessage('请输入API服务器地址');
      return;
    }

    // Test connection first
    await testConnection(apiHost.trim());
    
    if (connectionStatus === 'success') {
      setHost(apiHost.trim());
      alert('设置已保存，页面将刷新以应用新设置');
      onClose();
      window.location.reload();
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
        return '连接成功';
      case 'error':
        return '连接失败';
      default:
        return '未测试';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Server className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">API服务器设置</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="api-host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API服务器地址
              </label>
              <div className="flex space-x-2">
                <input
                  id="api-host"
                  type="url"
                  value={apiHost}
                  onChange={(e) => setApiHost(e.target.value)}
                  placeholder="http://localhost:4936 或 https://your-domain.com"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm 
                           focus:outline-none focus:ring-blue-500 focus:border-blue-500 
                           dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleTest}
                  disabled={isConnecting || !apiHost.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md 
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isConnecting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Server className="w-4 h-4" />
                  )}
                  <span>测试连接</span>
                </button>
              </div>
              
              {/* Quick Select Buttons */}
              <div className="mt-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">快捷选择：</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleQuickSelect('http://127.0.0.1:4936')}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 
                             text-gray-700 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-600 
                             transition-colors duration-200 flex items-center space-x-1"
                  >
                    <span>@</span>
                    <span>http://127.0.0.1:4936</span>
                  </button>
                  <button
                    onClick={() => handleQuickSelect('https://srv.agentstudio.cc')}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 
                             text-gray-700 dark:text-gray-300 rounded-md border border-gray-300 dark:border-gray-600 
                             transition-colors duration-200 flex items-center space-x-1"
                  >
                    <span>@</span>
                    <span>https://srv.agentstudio.cc</span>
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
                连接状态: {getStatusText()}
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">使用说明：</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• 在本地开发时，使用 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://localhost:4936</code></li>
                <li>• 在生产环境中，使用您的服务器域名，如 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">https://your-domain.com</code></li>
                <li>• 确保服务器支持CORS访问，允许前端域名访问</li>
                <li>• 修改后需要刷新页面才能生效</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置为默认</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isConnecting || connectionStatus === 'error'}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md 
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>保存设置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
