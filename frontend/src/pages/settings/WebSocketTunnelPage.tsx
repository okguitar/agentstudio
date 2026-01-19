import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Link as LinkIcon,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Play,
  Square,
  Settings,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface TunnelConfig {
  enabled: boolean;
  serverUrl: string;
  token: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface TunnelStatus {
  enabled: boolean;
  connected: boolean;
  domain: string | null;
  lastError: string | null;
  connectedAt: string | null;
  reconnectCount: number;
  configSource: 'port-specific' | 'default' | 'none';
  localPort: number;
}

export const WebSocketTunnelPage: React.FC = () => {
  const { t } = useTranslation('pages');

  const [config, setConfig] = useState<TunnelConfig | null>(null);
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [serverUrl, setServerUrl] = useState('wss://hitl.woa.com/ws/tunnel');
  const [token, setToken] = useState('');
  const [autoConnect, setAutoConnect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Load config and status on mount
  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  // Poll status while connected
  useEffect(() => {
    if (!status?.connected) return;
    
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [status?.connected]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/tunnel/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load configuration');

      const data = await response.json();
      setConfig(data);
      setServerUrl(data.serverUrl || 'wss://hitl.woa.com/ws/tunnel');
      setAutoConnect(data.enabled || false);
      // Don't set token from response (it's masked)
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/tunnel/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load status');

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error loading status:', err);
    }
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/tunnel/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({
          enabled: autoConnect,
          serverUrl,
          token: token || undefined, // Only send token if provided
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save configuration');
      }

      const data = await response.json();
      setConfig(data.config);
      setStatus(data.status);
      setSuccess('配置已保存');
      setToken(''); // Clear token input after saving

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/tunnel/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect');
      }

      const data = await response.json();
      setStatus(data.status);
      setSuccess('隧道连接中...');
      
      // Wait a moment and refresh status
      setTimeout(loadStatus, 2000);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/tunnel/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }

      const data = await response.json();
      setStatus(data.status);
      setSuccess('已断开隧道连接');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setConnecting(false);
    }
  };

  const copyDomain = () => {
    if (status?.domain) {
      navigator.clipboard.writeText(`https://${status.domain}`);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-7 h-7" />
          WebSocket 隧道
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          连接到隧道服务器，让外部网络可以访问本地 Agent Studio
        </p>
      </div>

      {/* Status Card */}
      <div className={`rounded-lg border p-4 ${
        status?.connected 
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
          : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <Wifi className="w-6 h-6 text-green-500" />
            ) : (
              <WifiOff className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {status?.connected ? '已连接' : '未连接'}
              </div>
              {status?.connected && status.domain && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    https://{status.domain}
                  </span>
                  <button
                    onClick={copyDomain}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="复制"
                  >
                    {copiedDomain ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={`https://${status.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="在新窗口打开"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
              {status?.lastError && (
                <div className="text-sm text-red-500 mt-1">
                  {status.lastError}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStatus}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="刷新状态"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {status?.connected ? (
              <button
                onClick={handleDisconnect}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                断开
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting || !config?.token}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                title={!config?.token ? '请先配置 Token' : undefined}
              >
                <Play className="w-4 h-4" />
                {connecting ? '连接中...' : '连接'}
              </button>
            )}
          </div>
        </div>
        {status?.connected && status.connectedAt && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            连接时间: {new Date(status.connectedAt).toLocaleString()}
          </div>
        )}
        {status && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>本地端口: {status.localPort}</span>
            <span>•</span>
            <span>
              配置来源: {
                status.configSource === 'port-specific' 
                  ? `端口专属 (${status.localPort})` 
                  : status.configSource === 'default' 
                    ? '默认配置' 
                    : '未配置'
              }
            </span>
          </div>
        )}
        
        {/* Info for default config */}
        {status?.configSource === 'default' && config?.token && !status.connected && (
          <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">当前使用默认配置</p>
                <p className="mt-1 text-xs">
                  尝试连接时，如果 Token 已被其他服务占用，请在下方输入新 Token 创建此端口的专属配置。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              {status?.configSource === 'default' && (
                <p className="mt-1 text-red-500 dark:text-red-300 text-xs">
                  隧道 Token 已被其他服务占用。请在企微群发送 <code className="bg-red-100 dark:bg-red-800 px-1 rounded">/tunnel create</code> 创建新 Token。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 border border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          配置
        </h2>

        <div className="space-y-4">
          {/* Server URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              服务器地址
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="wss://hitl.woa.com/ws/tunnel"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              隧道 Token
              {status?.configSource === 'default' && !status.connected && (
                <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                  (输入新 Token 将为此端口创建专属配置)
                </span>
              )}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={config?.token ? '••••••••（已配置）' : '输入 Token...'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              在企微群发送 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/tunnel create my-name</code> 获取新 Token
            </p>
          </div>

          {/* Auto Connect */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                启动时自动连接
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Agent Studio 启动时自动建立隧道连接
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoConnect}
                onChange={(e) => setAutoConnect(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              保存配置
            </button>
          </div>
        </div>
      </div>

      {/* Help Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-2">使用说明</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>在企微群发送 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/tunnel create my-dev</code> 创建隧道，获取 Token</li>
              <li>将 Token 填入上方配置并保存</li>
              <li>点击"连接"按钮建立隧道</li>
              <li>使用分配的域名访问本地 Agent Studio</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketTunnelPage;
