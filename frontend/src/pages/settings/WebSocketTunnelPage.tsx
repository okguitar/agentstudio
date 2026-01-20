import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
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
  ExternalLink,
  Cloud,
  Link as LinkIcon,
  ChevronRight,
  Trash2
} from 'lucide-react';

// Tunely (WebSocket) tunnel types
interface TunnelConfig {
  enabled: boolean;
  serverUrl: string;
  token: string;
  tunnelName?: string;
  domainSuffix?: string;
  protocol?: 'https' | 'http';
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

// Tunnel server info (from /api/info)
interface TunnelServerInfo {
  name: string;
  version: string;
  domain: {
    pattern: string;      // e.g., "{subdomain}.hitl.woa.com"
    customizable: string; // e.g., "subdomain"
    suffix: string;       // e.g., ".hitl.woa.com"
  };
  websocket: {
    url: string;          // e.g., "wss://hitl.woa.com/ws/tunnel"
  };
  protocols: string[];    // e.g., ["https", "http"]
}

type TunelyConfigStep = 'server' | 'domain' | 'connected' | 'edit';

// Cloudflare tunnel types
interface CloudflareConfig {
  hasApiToken: boolean;
  hasAccountId: boolean;
  activeTunnel: {
    tunnelId: string;
    tunnelName: string;
    publicUrl: string;
    createdAt: string;
    localPort: number;
  } | null;
}

interface CloudflareTunnelDetails {
  id: string;
  name: string;
  publicUrl: string;
  localUrl: string;
  createdAt: string;
  token: string;
  instructions: {
    cli: string;
    docker: string;
  };
}

type TunnelType = 'tunely' | 'cloudflare';
type CloudflareWizardStep = 'intro' | 'credentials' | 'create' | 'start' | 'done';

export const WebSocketTunnelPage: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TunnelType>('tunely');
  
  // Tunely state
  const [config, setConfig] = useState<TunnelConfig | null>(null);
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [serverUrl, setServerUrl] = useState('https://hitl.woa.com');
  const [tunnelName, setTunnelName] = useState('');
  const [protocol, setProtocol] = useState<'https' | 'http'>('https');
  const [autoConnect, setAutoConnect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ available: boolean; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  
  // Tunely server info state
  const [tunelyStep, setTunelyStep] = useState<TunelyConfigStep>('server');
  const [serverInfo, setServerInfo] = useState<TunnelServerInfo | null>(null);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  
  // Cloudflare state
  const [cfConfig, setCfConfig] = useState<CloudflareConfig | null>(null);
  const [cfApiToken, setCfApiToken] = useState('');
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfSubdomain, setCfSubdomain] = useState('');
  const [cfLocalPort, setCfLocalPort] = useState('4936');
  const [cfLoading, setCfLoading] = useState(false);
  const [cfSaving, setCfSaving] = useState(false);
  const [cfCreating, setCfCreating] = useState(false);
  const [cfError, setCfError] = useState<string | null>(null);
  const [cfSuccess, setCfSuccess] = useState<string | null>(null);
  const [cfCopiedUrl, setCfCopiedUrl] = useState(false);
  const [cfCopiedCommand, setCfCopiedCommand] = useState(false);
  const [cfTunnelDetails, setCfTunnelDetails] = useState<CloudflareTunnelDetails | null>(null);
  const [cfCurrentStep, setCfCurrentStep] = useState<CloudflareWizardStep>('intro');
  const [cfShowWizard, setCfShowWizard] = useState(true);

  // Load config and status on mount
  useEffect(() => {
    loadConfig();
    loadStatus();
    loadCfConfig();
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
      setServerUrl(data.serverUrl || 'https://hitl.woa.com');
      setTunnelName(data.tunnelName || '');
      setProtocol(data.protocol || 'https');
      setAutoConnect(data.enabled || false);
      
      // Determine step based on config
      if (data.token && data.tunnelName) {
        setTunelyStep('connected');
      } else {
        setTunelyStep('server');
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  // Fetch tunnel server info via backend proxy (to avoid CORS issues)
  const fetchServerInfo = async (url: string, showFeedback = true) => {
    setFetchingInfo(true);
    if (showFeedback) {
      setError(null);
    }
    
    try {
      // Call backend proxy to fetch server info
      const response = await fetch('/api/tunnel/server-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({ serverUrl: url })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || `服务器返回错误: HTTP ${response.status}`);
      }
      
      const data = result.data;
      
      // Map API response to our interface
      const serverInfo: TunnelServerInfo = {
        name: data.name || 'Tunely Server',
        version: data.version || '1.0.0',
        domain: {
          pattern: data.domain?.pattern || '{subdomain}.tunnel',
          customizable: data.domain?.customizable || 'subdomain',
          suffix: data.domain?.suffix || '.tunnel'
        },
        websocket: {
          url: data.websocket?.url || url.replace(/\/+$/, '').replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/tunnel'
        },
        protocols: data.protocols || ['https', 'http']
      };
      
      setServerInfo(serverInfo);
      if (showFeedback) {
        setSuccess(`已连接到 ${serverInfo.name} v${serverInfo.version}`);
        setTimeout(() => setSuccess(null), 3000);
        setTunelyStep('domain');
      }
    } catch (err) {
      console.error('Error fetching server info:', err);
      // Only show error if showFeedback is true (user-initiated action)
      if (showFeedback) {
        setError(err instanceof Error ? err.message : '获取服务器信息失败');
      }
    } finally {
      setFetchingInfo(false);
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

  const checkNameAvailability = async () => {
    if (!tunnelName.trim()) {
      setCheckResult({ available: false, reason: '请输入隧道名称' });
      return;
    }

    setChecking(true);
    setCheckResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/tunnel/check-name?name=${encodeURIComponent(tunnelName.trim())}&serverUrl=${encodeURIComponent(serverUrl)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      const data = await response.json();
      setCheckResult(data);
    } catch (err) {
      setCheckResult({ available: false, reason: '检查失败，请重试' });
    } finally {
      setChecking(false);
    }
  };

  const saveConfig = async () => {
    if (!tunnelName.trim()) {
      setError('请输入隧道名称');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/tunnel/create-tunnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({
          name: tunnelName.trim(),
          serverUrl,
          autoConnect,
          protocol,
          websocketUrl: serverInfo?.websocket?.url,
          domainSuffix: serverInfo?.domain?.suffix,
        })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create tunnel');
      }

      setConfig(data.config);
      setStatus(data.status);
      setSuccess(`隧道 "${tunnelName}" 创建成功！域名: ${data.domain}`);
      setCheckResult(null);
      
      // Switch to connected step
      setTunelyStep('connected');

      // Refresh status after a moment
      setTimeout(loadStatus, 2000);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tunnel');
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

  // Get full domain with suffix
  const getFullDomain = () => {
    if (!config?.tunnelName) return null;
    const suffix = config.domainSuffix || serverInfo?.domain?.suffix || '.hitl.woa.com';
    return `${config.tunnelName}${suffix}`;
  };

  const copyDomain = () => {
    const fullDomain = getFullDomain();
    if (fullDomain) {
      navigator.clipboard.writeText(`${config?.protocol || 'https'}://${fullDomain}`);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  // Cloudflare functions
  const loadCfConfig = async () => {
    setCfLoading(true);
    try {
      const response = await fetch('/api/cloudflare-tunnel/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load Cloudflare configuration');

      const data = await response.json();
      setCfConfig(data);
      
      // Auto-determine current step based on config
      if (data.activeTunnel) {
        setCfCurrentStep('done');
        setCfShowWizard(false);
      } else if (data.hasApiToken && data.hasAccountId) {
        setCfCurrentStep('create');
      } else {
        setCfCurrentStep('credentials');
      }
    } catch (err) {
      console.error('Error loading Cloudflare config:', err);
    } finally {
      setCfLoading(false);
    }
  };

  const saveCfCredentials = async () => {
    if (!cfApiToken || !cfAccountId) {
      setCfError('请输入 API Token 和 Account ID');
      return;
    }

    setCfSaving(true);
    setCfError(null);
    setCfSuccess(null);

    try {
      const response = await fetch('/api/cloudflare-tunnel/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({ apiToken: cfApiToken, accountId: cfAccountId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save credentials');
      }

      setCfSuccess('凭证保存成功');
      await loadCfConfig();
      setCfCurrentStep('create');
      setCfApiToken('');
      setCfAccountId('');
    } catch (err) {
      setCfError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setCfSaving(false);
    }
  };

  const createCfTunnel = async () => {
    setCfCreating(true);
    setCfError(null);
    setCfSuccess(null);
    setCfTunnelDetails(null);

    try {
      const response = await fetch('/api/cloudflare-tunnel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({
          subdomain: cfSubdomain || undefined,
          localPort: parseInt(cfLocalPort)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create tunnel');
      }

      const data = await response.json();
      setCfTunnelDetails(data.tunnel);
      setCfSuccess('隧道创建成功');
      setCfCurrentStep('start');
      await loadCfConfig();
    } catch (err) {
      setCfError(err instanceof Error ? err.message : 'Failed to create tunnel');
    } finally {
      setCfCreating(false);
    }
  };

  const deleteCfTunnel = async (tunnelId: string) => {
    if (!confirm('确定要删除此隧道吗？')) return;

    setCfLoading(true);
    setCfError(null);

    try {
      const response = await fetch(`/api/cloudflare-tunnel/delete/${tunnelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete tunnel');
      }

      setCfSuccess('隧道已删除');
      setCfTunnelDetails(null);
      setCfCurrentStep('intro');
      setCfShowWizard(true);
      await loadCfConfig();
    } catch (err) {
      setCfError(err instanceof Error ? err.message : 'Failed to delete tunnel');
    } finally {
      setCfLoading(false);
    }
  };

  const copyCfToClipboard = async (text: string, type: 'url' | 'command') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCfCopiedUrl(true);
        setTimeout(() => setCfCopiedUrl(false), 2000);
      } else {
        setCfCopiedCommand(true);
        setTimeout(() => setCfCopiedCommand(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Tunely content renderer
  const renderTunelyContent = () => {
    // Step 1: Server URL configuration
    const renderServerStep = () => (
      <>
        {/* Security Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">安全提示</p>
              <p>隧道接入会将本地 Agent Studio 服务暴露到公网，存在一定的安全风险。请确保您了解相关风险后再进行配置。</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            配置隧道服务
          </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              隧道服务器地址
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://hitl.woa.com"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => fetchServerInfo(serverUrl)}
                disabled={fetchingInfo || !serverUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {fetchingInfo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                连接
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              输入隧道服务的地址，点击"连接"获取服务信息
            </p>
          </div>
        </div>
      </div>
      </>
    );

    // Step 2: Domain configuration (after server info is fetched)
    const renderDomainStep = () => (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            配置隧道域名
          </h2>
          <button
            onClick={() => {
              setServerInfo(null);
              setTunelyStep('server');
            }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            更换服务器
          </button>
        </div>
        
        {/* Server Info Banner */}
        {serverInfo && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>已连接到 <strong>{serverInfo.name}</strong> v{serverInfo.version}</span>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Domain Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              隧道域名
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center">
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as 'https' | 'http')}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-700 dark:text-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  {(serverInfo?.protocols || ['https', 'http']).map(p => (
                    <option key={p} value={p}>{p}://</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={tunnelName}
                  onChange={(e) => {
                    setTunnelName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setCheckResult(null);
                  }}
                  placeholder="my-agent"
                  className="flex-1 px-3 py-2 border-y border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                  {serverInfo?.domain.suffix || '.hitl.woa.com'}
                </span>
              </div>
              <button
                onClick={checkNameAvailability}
                disabled={checking || !tunnelName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 transition-colors"
              >
                {checking ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                检测
              </button>
            </div>
            
            {/* Check result */}
            {checkResult && (
              <div className={`mt-2 text-sm flex items-center gap-1 ${
                checkResult.available 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {checkResult.available ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>名称可用！完整域名: {protocol}://{tunnelName}{serverInfo?.domain.suffix}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>{checkResult.reason || '名称不可用'}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Auto Connect */}
          <div className="flex items-center justify-between py-3">
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

          {/* Create Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={saveConfig}
              disabled={saving || !tunnelName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              创建隧道
            </button>
          </div>
        </div>
      </div>
    );

    // Delete tunnel handler
    const handleDeleteTunnel = async () => {
      if (!window.confirm('确定要删除隧道配置吗？删除后需要重新配置隧道。')) {
        return;
      }

      setSaving(true);
      setError(null);
      try {
        const response = await fetch('/api/tunnel/config', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`
          }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete tunnel');
        }

        const data = await response.json();
        setConfig(data.config);
        setStatus(data.status);
        setTunnelName('');
        setServerInfo(null);
        setTunelyStep('server');
        setSuccess('隧道配置已删除');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete tunnel');
      } finally {
        setSaving(false);
      }
    };

    // Connected state: show status and controls
    const renderConnectedStep = () => (
      <>
        {/* Security Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">安全提示</p>
              <p>隧道功能会将本地服务暴露到公网，请注意以下事项：</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-600 dark:text-amber-400">
                <li>仅在需要时开启隧道连接</li>
                <li>为服务开启密码保护</li>
                <li>使用完毕后及时断开连接</li>
              </ul>
            </div>
          </div>
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
                {status?.connected && getFullDomain() && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {config?.protocol || 'https'}://{getFullDomain()}
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
                      href={`${config?.protocol || 'https'}://${getFullDomain()}`}
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
                <RefreshCw className="w-4 h-4" />
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
                  disabled={connecting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
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
        </div>

        {/* Current Config Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              隧道配置
            </h2>
            <button
              onClick={() => {
                setTunelyStep('edit');
              }}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              编辑配置
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">隧道名称</span>
              <p className="font-medium text-gray-900 dark:text-white">{config?.tunnelName}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">协议</span>
              <p className="font-medium text-gray-900 dark:text-white">{config?.protocol?.toUpperCase()}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">服务器</span>
              <p className="font-medium text-gray-900 dark:text-white">{config?.serverUrl}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">自动连接</span>
              <p className="font-medium text-gray-900 dark:text-white">{config?.enabled ? '是' : '否'}</p>
            </div>
          </div>

          {/* Delete Tunnel Button */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDeleteTunnel}
              disabled={saving}
              className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              删除隧道配置
            </button>
          </div>
        </div>
      </>
    );

    // Edit configuration step
    const renderEditStep = () => {
      const handleSaveConfig = async () => {
        setSaving(true);
        setError(null);
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
              protocol,
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save config');
          }

          const data = await response.json();
          setConfig(data.config);
          setSuccess('配置已保存');
          setTimeout(() => setSuccess(null), 3000);
          setTunelyStep('connected');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save config');
        } finally {
          setSaving(false);
        }
      };

      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              编辑隧道配置
            </h2>
            <button
              onClick={() => setTunelyStep('connected')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              取消
            </button>
          </div>

          <div className="space-y-4">
            {/* Tunnel Name (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                隧道名称 <span className="text-gray-400">(不可修改)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={config?.tunnelName || ''}
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 text-sm">
                  {config?.domainSuffix || serverInfo?.domain?.suffix || '.hitl.woa.com'}
                </span>
              </div>
            </div>

            {/* Server URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                服务器地址
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://hitl.woa.com"
              />
            </div>

            {/* Protocol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                访问协议
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as 'https' | 'http')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="https">HTTPS</option>
                <option value="http">HTTP</option>
              </select>
            </div>

            {/* Auto-connect */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  自动连接
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  启动时自动连接隧道
                </p>
              </div>
              <button
                onClick={() => setAutoConnect(!autoConnect)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoConnect ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoConnect ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setTunelyStep('connected')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存配置'
                )}
              </button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
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

        {/* Step-based content */}
        {tunelyStep === 'server' && renderServerStep()}
        {tunelyStep === 'domain' && renderDomainStep()}
        {tunelyStep === 'connected' && renderConnectedStep()}
        {tunelyStep === 'edit' && renderEditStep()}
      </div>
    );
  };

  // Cloudflare content renderer
  const renderCloudflareContent = () => {
    if (cfLoading && !cfConfig) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }

    const renderCfCredentialsStep = () => (
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-2">如何获取凭证</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>登录 Cloudflare 控制面板</li>
                <li>进入 API Tokens 页面创建 Token</li>
                <li>在账户首页获取 Account ID</li>
              </ol>
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-3 text-yellow-700 dark:text-yellow-300 hover:underline font-medium"
              >
                打开 Cloudflare 控制面板
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Token
            </label>
            <input
              type="password"
              value={cfApiToken}
              onChange={(e) => setCfApiToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="输入 Cloudflare API Token"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account ID
            </label>
            <input
              type="text"
              value={cfAccountId}
              onChange={(e) => setCfAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="输入 Cloudflare Account ID"
            />
          </div>

          <button
            onClick={saveCfCredentials}
            disabled={cfSaving || !cfApiToken || !cfAccountId}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {cfSaving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <span>保存并继续</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );

    const renderCfCreateStep = () => (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>配置你的隧道参数，然后点击创建。隧道将通过 Cloudflare 的全球网络进行加速。</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              子域名 (可选)
            </label>
            <input
              type="text"
              value={cfSubdomain}
              onChange={(e) => setCfSubdomain(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="my-tunnel"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              留空将自动生成随机子域名
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              本地端口
            </label>
            <input
              type="number"
              value={cfLocalPort}
              onChange={(e) => setCfLocalPort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="4936"
            />
          </div>

          <button
            onClick={createCfTunnel}
            disabled={cfCreating}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {cfCreating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>创建中...</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-5 h-5" />
                <span>创建隧道</span>
              </>
            )}
          </button>
        </div>
      </div>
    );

    const renderCfStartStep = () => {
      if (!cfTunnelDetails) return null;

      return (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">隧道创建成功！</p>
                <p className="mt-1">请启动 cloudflared 客户端来激活隧道。</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">
              你的公网地址
            </h4>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <a
                href={cfTunnelDetails.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm break-all"
              >
                {cfTunnelDetails.publicUrl}
              </a>
              <button
                onClick={() => copyCfToClipboard(cfTunnelDetails.publicUrl, 'url')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
              >
                {cfCopiedUrl ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              启动方式
            </h4>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Docker 方式 (推荐)
                </span>
                <button
                  onClick={() => copyCfToClipboard(cfTunnelDetails.instructions.docker, 'command')}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded flex items-center space-x-1"
                >
                  {cfCopiedCommand ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>
              <code className="block text-xs bg-white dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600 overflow-x-auto">
                {cfTunnelDetails.instructions.docker}
              </code>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CLI 方式
                </span>
              </div>
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <p>1. 安装 cloudflared</p>
                <code className="block bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">
                  brew install cloudflare/cloudflare/cloudflared
                </code>
                <p>2. 运行命令</p>
                <code className="block bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600 overflow-x-auto">
                  {cfTunnelDetails.instructions.cli}
                </code>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setCfCurrentStep('done');
              setCfShowWizard(false);
            }}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>完成设置</span>
          </button>
        </div>
      );
    };

    const renderCfDoneStep = () => {
      if (!cfConfig?.activeTunnel) return null;

      return (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
              隧道配置完成
            </h3>
            <p className="text-green-800 dark:text-green-200">
              你的 Agent Studio 已可通过公网访问
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                活动隧道
              </h4>
              <button
                onClick={() => deleteCfTunnel(cfConfig.activeTunnel!.tunnelId)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>删除隧道</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  公网地址:
                </span>
                <div className="flex items-center space-x-2 mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                  <a
                    href={cfConfig.activeTunnel.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm break-all"
                  >
                    {cfConfig.activeTunnel.publicUrl}
                  </a>
                  <button
                    onClick={() => copyCfToClipboard(cfConfig.activeTunnel!.publicUrl, 'url')}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    {cfCopiedUrl ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">隧道名称:</span>
                  <p className="font-mono text-gray-900 dark:text-white">{cfConfig.activeTunnel.tunnelName}</p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">本地端口:</span>
                  <p className="font-mono text-gray-900 dark:text-white">{cfConfig.activeTunnel.localPort}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                创建时间: {new Date(cfConfig.activeTunnel.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">提示</p>
                <p>请确保 cloudflared 客户端保持运行，否则隧道将无法访问。</p>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Error/Success Messages */}
        {cfError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{cfError}</p>
          </div>
        )}

        {cfSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-400">{cfSuccess}</p>
          </div>
        )}

        {/* Wizard */}
        {cfShowWizard && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {cfCurrentStep === 'intro' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    什么是 Cloudflare Tunnel?
                  </h3>
                  <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                    <p>Cloudflare Tunnel 可以安全地将你的本地服务暴露到互联网，无需公网 IP 或端口转发。</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>自动 HTTPS 加密</li>
                      <li>DDoS 防护</li>
                      <li>全球 CDN 加速</li>
                      <li>无需配置防火墙</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setCfCurrentStep('credentials')}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <span>开始配置</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            {cfCurrentStep === 'credentials' && renderCfCredentialsStep()}
            {cfCurrentStep === 'create' && renderCfCreateStep()}
            {cfCurrentStep === 'start' && renderCfStartStep()}
            {cfCurrentStep === 'done' && renderCfDoneStep()}
          </div>
        )}

        {/* Show wizard button when closed */}
        {!cfShowWizard && cfConfig?.activeTunnel && (
          <button
            onClick={() => setCfShowWizard(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center space-x-1"
          >
            <Info className="w-4 h-4" />
            <span>查看设置向导</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="w-7 h-7" />
          隧道接入
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          通过隧道让外部网络可以访问本地 Agent Studio
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tunely')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'tunely'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Wifi className="w-4 h-4" />
            Tunely (WebSocket)
          </button>
          <button
            onClick={() => setActiveTab('cloudflare')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'cloudflare'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Cloud className="w-4 h-4" />
            Cloudflare Tunnel
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tunely' && renderTunelyContent()}
      {activeTab === 'cloudflare' && renderCloudflareContent()}
    </div>
  );
};

export default WebSocketTunnelPage;
