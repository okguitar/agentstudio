import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Server, 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Shield,
  Wrench,
  Eye,
  EyeOff,
  HelpCircle,
  Edit3,
  Power,
  PowerOff
} from 'lucide-react';
import { showError, showSuccess } from '../../utils/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../../lib/config';

interface AdminApiKey {
  id: string;
  description: string;
  permissions: string[];
  allowedTools?: string[];
  enabled: boolean;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  maskedKey: string | null;
  fullKey: string | null;
  isRevoked: boolean;
}

interface McpAdminStatus {
  enabled: boolean;
  version: string;
  endpoint: string;
  toolCount: number;
  activeKeyCount: number;
  totalKeyCount: number;
}

interface McpAdminTool {
  name: string;
  description: string;
  requiredPermissions: string[];
  inputSchema?: {
    type: string;
    properties?: Record<string, {
      type: string;
      description?: string;
    }>;
    required?: string[];
  };
}

// API functions
async function fetchStatus(): Promise<McpAdminStatus> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
}

async function fetchKeys(): Promise<{ keys: AdminApiKey[] }> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch keys');
  return response.json();
}

async function fetchTools(): Promise<{ tools: McpAdminTool[] }> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/tools`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch tools');
  return response.json();
}

async function createKey(data: { description: string; permissions: string[]; allowedTools?: string[] }): Promise<{ key: string; id: string }> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create key');
  return response.json();
}

async function revokeKey(keyId: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/keys/${keyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to revoke key');
}

async function updateKey(keyId: string, data: { description?: string; allowedTools?: string[] }): Promise<void> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/keys/${keyId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update key');
}

async function toggleKey(keyId: string, enabled: boolean): Promise<void> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/keys/${keyId}/toggle`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) throw new Error('Failed to toggle key');
}

async function fetchConfigSnippet(apiKey: string): Promise<{ cursor: { configString: string; configPath: string }; claudeDesktop: { configString: string; configPath: string } }> {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/mcp-admin-management/config-snippet?apiKey=${encodeURIComponent(apiKey)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch config');
  return response.json();
}

export const McpAdminSettingsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [configSnippet, setConfigSnippet] = useState<{ cursor: { configString: string; configPath: string }; claudeDesktop: { configString: string; configPath: string } } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'cursor' | 'claude-desktop'>('cursor');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [viewingConfigKey, setViewingConfigKey] = useState<string | null>(null);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [limitTools, setLimitTools] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<AdminApiKey | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editSelectedTools, setEditSelectedTools] = useState<Set<string>>(new Set());
  const [editLimitTools, setEditLimitTools] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<McpAdminTool | null>(null);

  // Queries
  const { data: status, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['mcpAdminStatus'],
    queryFn: fetchStatus,
  });

  const { data: keysData, isLoading: isLoadingKeys, refetch: refetchKeys } = useQuery({
    queryKey: ['mcpAdminKeys'],
    queryFn: fetchKeys,
  });

  const { data: toolsData, isLoading: isLoadingTools } = useQuery({
    queryKey: ['mcpAdminTools'],
    queryFn: fetchTools,
  });

  // Mutations
  const createKeyMutation = useMutation({
    mutationFn: createKey,
    onSuccess: async (data) => {
      setNewlyCreatedKey(data.key);
      setShowCreateModal(false);
      setNewKeyDescription('');
      setSelectedTools(new Set());
      setLimitTools(false);
      queryClient.invalidateQueries({ queryKey: ['mcpAdminKeys'] });
      queryClient.invalidateQueries({ queryKey: ['mcpAdminStatus'] });
      
      // Fetch config snippet
      try {
        const config = await fetchConfigSnippet(data.key);
        setConfigSnippet(config);
        setShowConfigModal(true);
      } catch (error) {
        showError(t('settings.mcpAdmin.errors.configFetch'));
      }
    },
    onError: (error) => {
      showError(t('settings.mcpAdmin.errors.createFailed'), error instanceof Error ? error.message : undefined);
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: revokeKey,
    onSuccess: () => {
      showSuccess(t('settings.mcpAdmin.success.keyRevoked'));
      queryClient.invalidateQueries({ queryKey: ['mcpAdminKeys'] });
      queryClient.invalidateQueries({ queryKey: ['mcpAdminStatus'] });
    },
    onError: (error) => {
      showError(t('settings.mcpAdmin.errors.revokeFailed'), error instanceof Error ? error.message : undefined);
    },
  });

  const updateKeyMutation = useMutation({
    mutationFn: ({ keyId, data }: { keyId: string; data: { description?: string; allowedTools?: string[] } }) =>
      updateKey(keyId, data),
    onSuccess: () => {
      showSuccess(t('settings.mcpAdmin.success.keyUpdated'));
      setShowEditModal(false);
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ['mcpAdminKeys'] });
    },
    onError: (error) => {
      showError(t('settings.mcpAdmin.errors.updateFailed'), error instanceof Error ? error.message : undefined);
    },
  });

  const toggleKeyMutation = useMutation({
    mutationFn: ({ keyId, enabled }: { keyId: string; enabled: boolean }) => toggleKey(keyId, enabled),
    onSuccess: (_, variables) => {
      showSuccess(variables.enabled ? t('settings.mcpAdmin.success.keyEnabled') : t('settings.mcpAdmin.success.keyDisabled'));
      queryClient.invalidateQueries({ queryKey: ['mcpAdminKeys'] });
      queryClient.invalidateQueries({ queryKey: ['mcpAdminStatus'] });
    },
    onError: (error) => {
      showError(t('settings.mcpAdmin.errors.toggleFailed'), error instanceof Error ? error.message : undefined);
    },
  });

  const handleCreateKey = () => {
    if (!newKeyDescription.trim()) {
      showError(t('settings.mcpAdmin.errors.descriptionRequired'));
      return;
    }
    createKeyMutation.mutate({
      description: newKeyDescription.trim(),
      permissions: ['admin:*'],
      allowedTools: limitTools && selectedTools.size > 0 ? Array.from(selectedTools) : undefined,
    });
  };

  const toggleToolSelection = (toolName: string) => {
    setSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  const selectAllTools = () => {
    setSelectedTools(new Set(tools.map(t => t.name)));
  };

  const deselectAllTools = () => {
    setSelectedTools(new Set());
  };

  const handleEditKey = (key: AdminApiKey) => {
    setEditingKey(key);
    setEditDescription(key.description);
    if (key.allowedTools && key.allowedTools.length > 0) {
      setEditLimitTools(true);
      setEditSelectedTools(new Set(key.allowedTools));
    } else {
      setEditLimitTools(false);
      setEditSelectedTools(new Set());
    }
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingKey) return;
    updateKeyMutation.mutate({
      keyId: editingKey.id,
      data: {
        description: editDescription.trim() || undefined,
        allowedTools: editLimitTools && editSelectedTools.size > 0 ? Array.from(editSelectedTools) : [],
      },
    });
  };

  const toggleEditToolSelection = (toolName: string) => {
    setEditSelectedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolName)) {
        newSet.delete(toolName);
      } else {
        newSet.add(toolName);
      }
      return newSet;
    });
  };

  const handleToggleKey = (key: AdminApiKey) => {
    toggleKeyMutation.mutate({ keyId: key.id, enabled: !key.enabled });
  };

  const handleRevokeKey = (keyId: string) => {
    if (confirm(t('settings.mcpAdmin.confirmRevoke'))) {
      revokeKeyMutation.mutate(keyId);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(t('settings.mcpAdmin.success.copied'));
    } catch {
      showError(t('settings.mcpAdmin.errors.copyFailed'));
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handleViewConfig = async (key: AdminApiKey) => {
    if (!key.fullKey) return;
    try {
      const config = await fetchConfigSnippet(key.fullKey);
      setConfigSnippet(config);
      setViewingConfigKey(key.fullKey);
      setShowConfigModal(true);
    } catch (error) {
      showError(t('settings.mcpAdmin.errors.configFetch'));
    }
  };

  const keys = keysData?.keys || [];
  const tools = toolsData?.tools || [];

  // Tool tooltip renderer - position can be 'left' or 'right'
  const renderToolTooltip = (tool: McpAdminTool, position: 'left' | 'right' = 'right') => {
    const params = tool.inputSchema?.properties || {};
    const required = tool.inputSchema?.required || [];
    const paramList = Object.entries(params);

    const positionClasses = position === 'right'
      ? 'left-full ml-2'
      : 'right-full mr-2';

    return (
      <div className={`absolute z-50 ${positionClasses} top-0 w-72 bg-gray-900 text-white rounded-lg shadow-xl p-3 text-sm`}>
        <div className="font-medium text-blue-300 mb-1">{tool.name}</div>
        <p className="text-gray-300 text-xs mb-2">{tool.description}</p>
        {paramList.length > 0 && (
          <div className="border-t border-gray-700 pt-2">
            <div className="text-xs text-gray-400 mb-1">{t('settings.mcpAdmin.toolParams')}:</div>
            <div className="space-y-1">
              {paramList.map(([name, schema]) => (
                <div key={name} className="text-xs">
                  <span className="font-mono text-green-400">{name}</span>
                  {required.includes(name) && <span className="text-red-400 ml-1">*</span>}
                  <span className="text-gray-500 ml-1">({schema.type})</span>
                  {schema.description && (
                    <p className="text-gray-400 ml-2 mt-0.5">{schema.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {paramList.length === 0 && (
          <div className="text-xs text-gray-500 italic">{t('settings.mcpAdmin.noParams')}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('settings.mcpAdmin.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('settings.mcpAdmin.subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t('settings.mcpAdmin.help.button')}</span>
          </button>
          <button
            onClick={() => { refetchStatus(); refetchKeys(); }}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('settings.mcpAdmin.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Server className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('settings.mcpAdmin.serverStatus')}
          </h3>
        </div>

        {isLoadingStatus ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ) : status ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.mcpAdmin.status.status')}</p>
                <p className="font-medium text-gray-900 dark:text-white">{t('settings.mcpAdmin.status.active')}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.mcpAdmin.status.version')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{status.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.mcpAdmin.status.tools')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{status.toolCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.mcpAdmin.status.activeKeys')}</p>
              <p className="font-medium text-gray-900 dark:text-white">{status.activeKeyCount}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span>{t('settings.mcpAdmin.status.unavailable')}</span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings.mcpAdmin.endpoint')}: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">{API_BASE}/mcp-admin</code>
          </p>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Key className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('settings.mcpAdmin.apiKeys')}
            </h3>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('settings.mcpAdmin.createKey')}</span>
          </button>
        </div>

        {isLoadingKeys ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('settings.mcpAdmin.noKeys')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('settings.mcpAdmin.noKeysHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className={`p-4 rounded-lg border ${
                  key.isRevoked
                    ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
                    : !key.enabled
                    ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-70'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {key.description}
                      </p>
                      {key.isRevoked && (
                        <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                          {t('settings.mcpAdmin.revoked')}
                        </span>
                      )}
                      {!key.isRevoked && !key.enabled && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                          {t('settings.mcpAdmin.disabled')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <code className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {visibleKeys.has(key.id) && key.fullKey ? key.fullKey : key.maskedKey}
                      </code>
                      {!key.isRevoked && key.fullKey && (
                        <>
                          <button
                            onClick={() => toggleKeyVisibility(key.id)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title={visibleKeys.has(key.id) ? t('settings.mcpAdmin.hideKey') : t('settings.mcpAdmin.showKey')}
                          >
                            {visibleKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(key.fullKey!)}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title={t('settings.mcpAdmin.copyKey')}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
                      <span>{t('settings.mcpAdmin.createdAt')}: {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>{t('settings.mcpAdmin.lastUsed')}: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      {key.allowedTools && key.allowedTools.length > 0 ? (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          🔒 {t('settings.mcpAdmin.limitedTools', { count: key.allowedTools.length })}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {t('settings.mcpAdmin.allToolsAccess')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!key.isRevoked && (
                      <>
                        <button
                          onClick={() => handleToggleKey(key)}
                          className={`p-2 rounded-lg transition-colors ${
                            key.enabled
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={key.enabled ? t('settings.mcpAdmin.disableKey') : t('settings.mcpAdmin.enableKey')}
                        >
                          {key.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEditKey(key)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('settings.mcpAdmin.editKey')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {key.fullKey && (
                          <button
                            onClick={() => handleViewConfig(key)}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title={t('settings.mcpAdmin.viewConfig')}
                          >
                            {t('settings.mcpAdmin.viewConfig')}
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('settings.mcpAdmin.revokeKey')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Tools Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Wrench className="w-6 h-6 text-purple-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('settings.mcpAdmin.availableTools')}
          </h3>
        </div>

        {isLoadingTools ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tools.map((tool, index) => {
              // In 2-column layout, odd indices (1, 3, 5...) are in the second column
              const isSecondColumn = index % 2 === 1;
              return (
                <div
                  key={tool.name}
                  className="relative flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-help hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onMouseEnter={() => setHoveredTool(tool)}
                  onMouseLeave={() => setHoveredTool(null)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{tool.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {tool.description}
                    </p>
                  </div>
                  {hoveredTool?.name === tool.name && renderToolTooltip(tool, isSecondColumn ? 'left' : 'right')}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('settings.mcpAdmin.createKeyTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.mcpAdmin.keyDescription')}
                </label>
                <input
                  type="text"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder={t('settings.mcpAdmin.keyDescriptionPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Tool Access Control */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={limitTools}
                      onChange={(e) => setLimitTools(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.mcpAdmin.limitTools')}
                    </span>
                  </label>
                  {limitTools && (
                    <div className="flex items-center space-x-2 text-sm">
                      <button
                        onClick={selectAllTools}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {t('settings.mcpAdmin.selectAll')}
                      </button>
                      <span className="text-gray-400">|</span>
                      <button
                        onClick={deselectAllTools}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {t('settings.mcpAdmin.deselectAll')}
                      </button>
                    </div>
                  )}
                </div>
                
                {limitTools && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {tools.map((tool) => {
                        const params = Object.entries(tool.inputSchema?.properties || {});
                        const paramStr = params.length > 0
                          ? `\n${t('settings.mcpAdmin.toolParams')}: ${params.map(([k, v]) => `${k}(${(v as {type: string}).type})`).join(', ')}`
                          : '';
                        const tooltipText = `${tool.description}${paramStr}`;
                        return (
                          <label
                            key={tool.name}
                            title={tooltipText}
                            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedTools.has(tool.name)
                                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedTools.has(tool.name)}
                              onChange={() => toggleToolSelection(tool.name)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{tool.name}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedTools.size > 0 && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.mcpAdmin.selectedToolsCount', { count: selectedTools.size })}
                      </p>
                    )}
                  </div>
                )}
                
                {!limitTools && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>{t('settings.mcpAdmin.fullPermissions')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setNewKeyDescription(''); setSelectedTools(new Set()); setLimitTools(false); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t('settings.mcpAdmin.cancel')}
              </button>
              <button
                onClick={handleCreateKey}
                disabled={createKeyMutation.isPending || (limitTools && selectedTools.size === 0)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {createKeyMutation.isPending ? t('settings.mcpAdmin.creating') : t('settings.mcpAdmin.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && configSnippet && (newlyCreatedKey || viewingConfigKey) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {newlyCreatedKey ? t('settings.mcpAdmin.keyCreated') : t('settings.mcpAdmin.configTitle')}
            </h3>
            
            {/* Warning (only for newly created keys) */}
            {newlyCreatedKey && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  ⚠️ {t('settings.mcpAdmin.saveKeyWarning')}
                </p>
              </div>
            )}

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.mcpAdmin.yourApiKey')}
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg font-mono text-sm break-all">
                  {newlyCreatedKey || viewingConfigKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey || viewingConfigKey || '')}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Platform Tabs */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setSelectedPlatform('cursor')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlatform === 'cursor'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Cursor
              </button>
              <button
                onClick={() => setSelectedPlatform('claude-desktop')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlatform === 'claude-desktop'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Claude Desktop
              </button>
            </div>

            {/* Config */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('settings.mcpAdmin.configFile')}:
                  <code className="ml-2 text-xs text-gray-500">{
                    selectedPlatform === 'cursor' 
                      ? configSnippet.cursor.configPath 
                      : configSnippet.claudeDesktop.configPath
                  }</code>
                </label>
                <button
                  onClick={() => copyToClipboard(
                    selectedPlatform === 'cursor'
                      ? configSnippet.cursor.configString
                      : configSnippet.claudeDesktop.configString
                  )}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Copy className="w-4 h-4" />
                  <span>{t('settings.mcpAdmin.copyConfig')}</span>
                </button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                {selectedPlatform === 'cursor'
                  ? configSnippet.cursor.configString
                  : configSnippet.claudeDesktop.configString}
              </pre>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setShowConfigModal(false); setNewlyCreatedKey(null); setViewingConfigKey(null); setConfigSnippet(null); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {t('settings.mcpAdmin.done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Key Modal */}
      {showEditModal && editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('settings.mcpAdmin.editKeyTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('settings.mcpAdmin.keyDescription')}
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('settings.mcpAdmin.keyDescriptionPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Tool Access Control */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editLimitTools}
                      onChange={(e) => setEditLimitTools(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('settings.mcpAdmin.limitTools')}
                    </span>
                  </label>
                  {editLimitTools && (
                    <div className="flex items-center space-x-2 text-sm">
                      <button
                        onClick={() => setEditSelectedTools(new Set(tools.map(t => t.name)))}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {t('settings.mcpAdmin.selectAll')}
                      </button>
                      <span className="text-gray-400">|</span>
                      <button
                        onClick={() => setEditSelectedTools(new Set())}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {t('settings.mcpAdmin.deselectAll')}
                      </button>
                    </div>
                  )}
                </div>
                
                {editLimitTools && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {tools.map((tool) => {
                        const params = Object.entries(tool.inputSchema?.properties || {});
                        const paramStr = params.length > 0
                          ? `\n${t('settings.mcpAdmin.toolParams')}: ${params.map(([k, v]) => `${k}(${(v as {type: string}).type})`).join(', ')}`
                          : '';
                        const tooltipText = `${tool.description}${paramStr}`;
                        return (
                          <label
                            key={tool.name}
                            title={tooltipText}
                            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              editSelectedTools.has(tool.name)
                                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={editSelectedTools.has(tool.name)}
                              onChange={() => toggleEditToolSelection(tool.name)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-mono text-gray-900 dark:text-white truncate">{tool.name}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {editSelectedTools.size > 0 && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.mcpAdmin.selectedToolsCount', { count: editSelectedTools.size })}
                      </p>
                    )}
                  </div>
                )}
                
                {!editLimitTools && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>{t('settings.mcpAdmin.fullPermissions')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => { setShowEditModal(false); setEditingKey(null); }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t('settings.mcpAdmin.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateKeyMutation.isPending || (editLimitTools && editSelectedTools.size === 0)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {updateKeyMutation.isPending ? t('settings.mcpAdmin.saving') : t('settings.mcpAdmin.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('settings.mcpAdmin.help.title')}
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mt-4 mb-2">
                {t('settings.mcpAdmin.help.whatIs')}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('settings.mcpAdmin.help.whatIsDesc')}
              </p>

              <h4 className="text-base font-medium text-gray-900 dark:text-white mt-4 mb-2">
                {t('settings.mcpAdmin.help.howToUse')}
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 mb-4">
                <li>{t('settings.mcpAdmin.help.step1')}</li>
                <li>{t('settings.mcpAdmin.help.step2')}</li>
                <li>{t('settings.mcpAdmin.help.step3')}</li>
                <li>{t('settings.mcpAdmin.help.step4')}</li>
              </ol>

              <h4 className="text-base font-medium text-gray-900 dark:text-white mt-4 mb-2">
                {t('settings.mcpAdmin.help.availableTools')}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mb-4">
                <li><strong>list_projects</strong> - {t('settings.mcpAdmin.help.toolListProjects')}</li>
                <li><strong>get_project</strong> - {t('settings.mcpAdmin.help.toolGetProject')}</li>
                <li><strong>list_agents</strong> - {t('settings.mcpAdmin.help.toolListAgents')}</li>
                <li><strong>get_agent</strong> - {t('settings.mcpAdmin.help.toolGetAgent')}</li>
                <li><strong>health_check</strong> - {t('settings.mcpAdmin.help.toolHealthCheck')}</li>
              </ul>

              <h4 className="text-base font-medium text-gray-900 dark:text-white mt-4 mb-2">
                {t('settings.mcpAdmin.help.examples')}
              </h4>
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('settings.mcpAdmin.help.examplePrompt')}</p>
                <code className="text-sm text-purple-600 dark:text-purple-400">
                  "请帮我列出 AgentStudio 中所有的项目"
                </code>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {t('settings.mcpAdmin.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
