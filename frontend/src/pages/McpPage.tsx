import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { showError, showSuccess, showInfo } from '../utils/toast';
import {
  Plus,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Edit,
  Tag,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMobileContext } from '../contexts/MobileContext';
// import { SwipeActions, McpSwipeActions } from '../components/SwipeActions';

interface McpServerConfig {
  name: string;
  type: 'stdio' | 'http';
  // For stdio type
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For http type
  url?: string;
  // Common fields
  timeout?: number;
  autoApprove?: string[];
  status?: 'active' | 'error' | 'validating';
  error?: string;
  tools?: string[];
  // Allow any additional fields
  [key: string]: any;
}



export const McpPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'stdio' as 'stdio' | 'http',
    config: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // Load MCP configurations from backend
  const loadMcpConfigs = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE}/mcp`);
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      } else {
        console.error('Failed to load MCP configs:', response.status);
        setServers([]);
      }
    } catch (error) {
      console.error('Failed to load MCP configs:', error);
      setServers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load configs on component mount
  React.useEffect(() => {
    loadMcpConfigs();
  }, []);

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Validate MCP server by testing connection
  const validateMcpServer = async (serverName: string): Promise<void> => {
    try {
      console.log('Validating MCP server:', serverName);
      
      // Update server status to validating
      setServers(prev => prev.map(s => 
        s.name === serverName 
          ? { ...s, status: 'validating' as const }
          : s
      ));

      const response = await authFetch(`${API_BASE}/mcp/${serverName}/validate`, {
        method: 'POST'
      });
      
      console.log('Validation response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        // Update server with validation results
        setServers(prev => prev.map(s => 
          s.name === serverName 
            ? { 
                ...s, 
                status: 'active' as const, 
                tools: result.tools || [],
                error: undefined
              }
            : s
        ));
      } else {
        const error = await response.json();
        // Update server with error status
        setServers(prev => prev.map(s => 
          s.name === serverName 
            ? { 
                ...s, 
                status: 'error' as const, 
                error: error.error || t('mcp.errors.validationFailed'),
                tools: undefined
              }
            : s
        ));
      }
    } catch (error) {
      console.error('MCP server validation failed:', error);
      // Update server with error status
      setServers(prev => prev.map(s => 
        s.name === serverName 
          ? { 
              ...s, 
              status: 'error' as const, 
              error: t('mcp.errors.networkError'),
              tools: undefined
            }
          : s
      ));
    }
  };

  const filteredServers = servers.filter(server => {
    const searchLower = debouncedSearchQuery.toLowerCase();
    const matchesName = server.name.toLowerCase().includes(searchLower);
    const matchesCommand = server.command?.toLowerCase().includes(searchLower) || false;
    const matchesArgs = server.args?.join(' ').toLowerCase().includes(searchLower) || false;
    const matchesUrl = server.url?.toLowerCase().includes(searchLower) || false;

    return matchesName || matchesCommand || matchesArgs || matchesUrl;
  });



  const handleEditServer = (server: McpServerConfig) => {
    setEditingServer(server);
    // Create config object excluding name and UI-only fields (status, error, tools, lastValidated)
    const { name, status, error, tools, lastValidated, ...config } = server;

    setFormData({
      name: server.name,
      type: server.type,
      config: JSON.stringify(config, null, 2)
    });
    setShowAddModal(true);
  };

  const handleCopyCommand = (server: McpServerConfig) => {
    let commandText = '';
    if (server.type === 'stdio') {
      commandText = `${server.command} ${server.args?.join(' ') || ''}`.trim();
    } else {
      commandText = server.url || '';
    }

    navigator.clipboard.writeText(commandText).then(() => {
      showSuccess(t('mcp.commandCopied'));
    }).catch(() => {
      showError(t('mcp.errors.copyFailed'));
    });
  };

  const handleDeleteServer = async (serverName: string) => {
    if (window.confirm(t('mcp.confirmDelete', { name: serverName }))) {
      try {
        const response = await authFetch(`${API_BASE}/mcp/${serverName}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setServers(prev => prev.filter(s => s.name !== serverName));
        } else {
          const error = await response.json();
          throw new Error(error.error || t('mcp.errors.deleteFailed'));
        }
      } catch (error) {
        console.error('Delete config failed:', error);
        showError(t('mcp.errors.deleteFailed'), error instanceof Error ? error.message : t('errors:common.unknownError'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'stdio',
      config: ''
    });
    setEditingServer(null);
  };

  const handleImportFromClaudeCode = async () => {
    try {
      setIsImporting(true);
      const response = await authFetch(`${API_BASE}/mcp/claude-code`);

      if (response.ok) {
        const result = await response.json();
        const claudeCodeServers = result.servers || [];

        if (claudeCodeServers.length === 0) {
          showInfo(t('mcp.import.noConfigFound'));
          return;
        }

        // Import each server that doesn't already exist
        let importedCount = 0;
        let skippedCount = 0;

        for (const claudeServer of claudeCodeServers) {
          // Check if server already exists
          const existingServer = servers.find(s => s.name === claudeServer.name);
          if (existingServer) {
            skippedCount++;
            continue;
          }

          // Import the server, preserving all fields
          const importData: any = {
            ...claudeServer
          };

          const importResponse = await authFetch(`${API_BASE}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(importData)
          });

          if (importResponse.ok) {
            const importResult = await importResponse.json();
            setServers(prev => [importResult.server, ...prev]);
            importedCount++;
          }
        }

        if (importedCount > 0) {
          showSuccess(t('mcp.import.success', { imported: importedCount, skipped: skippedCount }));
        } else {
          showInfo(t('mcp.import.allExist'));
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || t('mcp.errors.importFailed'));
      }
    } catch (error) {
      console.error('Failed to import from Claude Code:', error);
      showError(t('mcp.errors.importFailed'), error instanceof Error ? error.message : t('errors:common.unknownError'));
    } finally {
      setIsImporting(false);
    }
  };

  const validateConfig = (str: string, type: 'stdio' | 'http'): boolean => {
    if (!str.trim()) return false; // Required field
    try {
      const parsed = JSON.parse(str);

      // 检查type字段
      if (!parsed.type || parsed.type !== type) {
        return false;
      }

      // 根据类型检查必须的字段
      if (type === 'stdio') {
        if (!parsed.command || !Array.isArray(parsed.args)) {
          return false;
        }
      } else if (type === 'http') {
        if (!parsed.url || typeof parsed.url !== 'string') {
          return false;
        }
      }

      // 检查可选字段的类型
      if (parsed.timeout && typeof parsed.timeout !== 'number') {
        return false;
      }
      if (parsed.autoApprove && !Array.isArray(parsed.autoApprove)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError(t('mcp.form.nameRequired'));
      return;
    }

    if (!validateConfig(formData.config, formData.type)) {
      showError(t('mcp.form.configInvalid', {
        fields: formData.type === 'stdio'
          ? t('mcp.form.requiredFieldsStdio')
          : t('mcp.form.requiredFieldsHttp')
      }));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const config = JSON.parse(formData.config);
      
      let response: Response;
      
      if (editingServer) {
        // Update existing server - only send config data, name comes from URL
        console.log('Updating existing MCP server:', editingServer.name, 'with config:', config);
        response = await authFetch(`${API_BASE}/mcp/${editingServer.name}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config)
        });
      } else {
        // Add new server - include name in request body
        const requestData = {
          name: formData.name,
          ...config
        };
        response = await authFetch(`${API_BASE}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        if (editingServer) {
          // Update existing server in list
          setServers(prev => prev.map(s => 
            s.name === editingServer.name ? result.server : s
          ));
        } else {
          // Add new server to list
          setServers(prev => [result.server, ...prev]);
        }
        
        // Reset form and close modal
        resetForm();
        setShowAddModal(false);
        
        // Validate the MCP server after successful save
        const serverName = result.server.name;
        await validateMcpServer(serverName);
      } else {
        const error = await response.json();
        throw new Error(error.error || t('mcp.errors.saveFailed'));
      }

    } catch (error) {
      console.error('Failed to save MCP config:', error);
      showError(t('mcp.errors.saveFailed'), error instanceof Error ? error.message : t('errors:common.unknownError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center min-h-[60vh]`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">{t('mcp.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
      {/* Header */}
      <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
        <div className={`flex items-center ${isMobile ? 'mb-4' : 'justify-between mb-6'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>{t('mcp.title')}</h1>
            <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mt-1' : 'mt-2'}`}>{t('mcp.subtitle')}</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className={`${isMobile ? 'space-y-3' : 'flex items-center space-x-4'}`}>
          {/* Search */}
          <div className={`${isMobile ? '' : 'flex-1'} relative`}>
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <input
              type="text"
              placeholder={t('mcp.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-11 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 transition-all ${isMobile ? 'text-sm' : ''}`}
            />
          </div>

          {/* Action Buttons */}
          <div className={`${isMobile ? 'flex space-x-2' : 'flex items-center space-x-3'}`}>
            <button
              onClick={handleImportFromClaudeCode}
              disabled={isImporting}
              className={`${isMobile ? 'flex-1 px-3 py-2 text-sm' : 'px-5 py-3'} bg-green-600 text-white rounded-lg hover:bg-green-700 hover:shadow-md active:scale-95 transition-all whitespace-nowrap font-medium flex items-center ${isMobile ? 'justify-center' : 'space-x-2'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isImporting && <Loader2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />}
              <span>{isImporting ? t('mcp.import.importing') : t('mcp.import.button')}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className={`${isMobile ? 'flex-1 px-3 py-2 text-sm' : 'px-6 py-3'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md active:scale-95 transition-all whitespace-nowrap flex items-center ${isMobile ? 'justify-center' : 'space-x-2'} font-medium`}
            >
              <Plus className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span>{t('mcp.addServer')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Servers Table */}
      {filteredServers.length === 0 ? (
        <div className={`text-center ${isMobile ? 'py-8' : 'py-16'} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700`}>
          <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>🖥️</div>
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-medium text-gray-900 dark:text-white mb-2`}>
            {debouncedSearchQuery ? t('mcp.noResults') : t('mcp.noServers')}
          </h3>
          <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            {debouncedSearchQuery ? t('mcp.adjustSearch') : t('mcp.addFirstServer')}
          </p>
          {!debouncedSearchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className={`${isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
            >
              {t('mcp.addServer')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredServers.map((server, index) => (
              <div
                key={server.name + '-' + index}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden"
              >
                <div className="p-4">
                  {/* Server Header */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="text-2xl">
                      {server.type === 'http' ? '🌐' : '🖥️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                        {server.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                        {server.type === 'stdio'
                          ? `${server.command} ${server.args?.join(' ') || ''}`.trim()
                          : server.url
                        }
                      </p>
                    </div>
                  </div>

                  {/* Server Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block mb-1">
                        {t('mcp.table.type')}:
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        server.type === 'http'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {server.type === 'http' ? 'HTTP' : 'Stdio'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block mb-1">
                        {t('mcp.table.status')}:
                      </span>
                      {server.status === 'active' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('mcp.status.active')}
                        </span>
                      )}
                      {server.status === 'error' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          {t('mcp.status.error')}
                        </span>
                      )}
                      {server.status === 'validating' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {t('mcp.status.validating')}
                        </span>
                      )}
                      {!server.status && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('mcp.status.unvalidated')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tools Section */}
                  {server.status === 'active' && server.tools && server.tools.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setExpandedTools(prev => ({ ...prev, [server.name]: !prev[server.name] }))}
                        className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2 w-full"
                      >
                        <Tag className="w-4 h-4" />
                        <span className="font-medium">{server.tools.length} {t('mcp.table.tools')}</span>
                        {expandedTools[server.name] ? (
                          <ChevronUp className="w-4 h-4 ml-auto text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                        )}
                      </button>
                      {expandedTools[server.name] && (
                        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                          {server.tools.map((tool, idx) => (
                            <code
                              key={idx}
                              className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs font-mono border border-green-200 dark:border-green-800"
                              title={tool}
                            >
                              {tool}
                            </code>
                          ))}
                        </div>
                      )}
                      {!expandedTools[server.name] && (
                        <div className="flex flex-wrap gap-1">
                          {server.tools.slice(0, 3).map((tool, idx) => (
                            <code
                              key={idx}
                              className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-mono"
                              title={tool}
                            >
                              {tool}
                            </code>
                          ))}
                          {server.tools.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                              +{server.tools.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Display */}
                  {server.status === 'error' && server.error && (
                    <div className="text-sm text-red-600 dark:text-red-400 mb-3">
                      {server.error}
                    </div>
                  )}
                </div>

                {/* 直接显示操作按钮 */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t('mcp.table.actions')}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => validateMcpServer(server.name)}
                        disabled={server.status === 'validating'}
                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-md transition-colors disabled:opacity-50"
                        title={t('mcp.actions.validate')}
                      >
                        {server.status === 'validating' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyCommand(server)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-md transition-colors"
                        title={t('mcp.actions.copyCommand')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditServer(server)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                        title={t('mcp.actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteServer(server.name)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md transition-colors"
                        title={t('mcp.actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('mcp.table.server')}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('mcp.table.type')}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('mcp.table.status')}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('mcp.table.tools')}
                  </TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {t('mcp.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServers.map((server, index) => (
                  <TableRow
                    key={server.name + '-' + index}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-xl mr-3">{server.type === 'http' ? '🌐' : '🖥️'}</div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {server.name}
                          </div>
                          {server.status === 'error' && server.error && (
                            <div className="text-xs text-red-600 dark:text-red-400 truncate max-w-xs mt-1">
                              {server.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        server.type === 'http'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {server.type === 'http' ? 'HTTP' : 'Stdio'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {server.status === 'active' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('mcp.status.active')}
                        </span>
                      )}
                      {server.status === 'error' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          {t('mcp.status.error')}
                        </span>
                      )}
                      {server.status === 'validating' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {t('mcp.status.validating')}
                        </span>
                      )}
                      {!server.status && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('mcp.status.unvalidated')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {server.status === 'active' && server.tools && server.tools.length > 0 ? (
                        <div>
                          <button
                            onClick={() => setExpandedTools(prev => ({ ...prev, [server.name]: !prev[server.name] }))}
                            className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2 group"
                          >
                            <Tag className="w-4 h-4" />
                            <span className="font-medium">{server.tools.length} {t('mcp.table.tools')}</span>
                            {expandedTools[server.name] ? (
                              <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            )}
                          </button>
                          {expandedTools[server.name] && (
                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-2">
                              {server.tools.map((tool, idx) => (
                                <code
                                  key={idx}
                                  className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs font-mono border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                  title={tool}
                                >
                                  {tool}
                                </code>
                              ))}
                            </div>
                          )}
                          {!expandedTools[server.name] && (
                            <div className="flex flex-wrap gap-1">
                              {server.tools.slice(0, 5).map((tool, idx) => (
                                <code
                                  key={idx}
                                  className="inline-block bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs font-mono"
                                  title={tool}
                                >
                                  {tool}
                                </code>
                              ))}
                              {server.tools.length > 5 && (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                                  +{server.tools.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {server.status === 'active' ? t('mcp.table.noTools') : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => validateMcpServer(server.name)}
                          disabled={server.status === 'validating'}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/50 rounded-md hover:bg-green-100 dark:hover:bg-green-900/70 transition-colors disabled:opacity-50"
                          title={t('mcp.actions.validate')}
                        >
                          {server.status === 'validating' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopyCommand(server)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-900/50 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors"
                          title={t('mcp.actions.copyCommand')}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEditServer(server)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/50 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/70 transition-colors"
                          title={t('mcp.actions.edit')}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          {t('mcp.actions.edit')}
                        </button>
                        <button
                          onClick={() => handleDeleteServer(server.name)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                          title={t('mcp.actions.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${isMobile ? 'max-w-full' : 'max-w-2xl'} mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className={`flex items-center ${isMobile ? 'flex-col space-y-3' : 'justify-between'} mb-4`}>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 dark:text-white`}>
                  {editingServer ? t('mcp.modal.editTitle') : t('mcp.modal.addTitle')}
                </h2>
                <div className={`flex ${isMobile ? 'w-full space-x-2' : 'space-x-3'}`}>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className={`${isMobile ? 'flex-1 px-3 py-2 text-sm' : 'px-4 py-2'} text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50`}
                  >
                    {t('common:actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    form="mcp-config-form"
                    disabled={isSubmitting || !formData.name.trim() || !validateConfig(formData.config, formData.type)}
                    className={`${isMobile ? 'flex-1 px-3 py-2 text-sm' : 'px-4 py-2'} bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSubmitting ? t('mcp.modal.saving') : editingServer ? t('mcp.modal.saveConfig') : t('mcp.modal.addConfig')}
                  </button>
                </div>
              </div>
              
              <form id="mcp-config-form" onSubmit={handleSubmit}>
                <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
                  {/* Service Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('mcp.form.serverName')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('mcp.form.serverNamePlaceholder')}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${isMobile ? 'text-sm' : ''}`}
                      required
                      disabled={!!editingServer}
                    />
                    {editingServer && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('mcp.form.nameNotEditable')}</p>
                    )}
                  </div>

                  {/* MCP Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('mcp.form.mcpType')}
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'stdio' | 'http';
                        setFormData({
                          ...formData,
                          type: newType,
                          config: newType === 'stdio'
                            ? `{
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--extension"
  ],
  "timeout": 6000,
  "autoApprove": [
    "interactive_feedback"
  ]
}`
                            : `{
  "type": "http",
  "url": "http://127.0.0.1:3845/mcp",
  "timeout": 6000,
  "autoApprove": [
    "interactive_feedback"
  ]
}`
                        });
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${isMobile ? 'text-sm' : ''}`}
                      required
                    >
                      <option value="stdio">{t('mcp.form.stdioOption')}</option>
                      <option value="http">{t('mcp.form.httpOption')}</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('mcp.form.selectConnectionType')}
                    </p>
                  </div>

                  {/* Configuration JSON */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('mcp.form.configuration')}
                    </label>
                    <textarea
                      value={formData.config}
                      onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                      placeholder={formData.type === 'stdio'
                        ? `{
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@playwright/mcp@latest",
    "--extension"
  ],
  "timeout": 6000,
  "autoApprove": [
    "interactive_feedback"
  ]
}`
                        : `{
  "type": "http",
  "url": "http://127.0.0.1:3845/mcp",
  "timeout": 6000,
  "autoApprove": [
    "interactive_feedback"
  ]
}`}
                      rows={isMobile ? 10 : 15}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm dark:bg-gray-700 dark:text-white ${isMobile ? 'text-xs' : ''}`}
                      required
                    />
                    {formData.config && !validateConfig(formData.config, formData.type) && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {t('mcp.form.configFormatError', {
                          fields: formData.type === 'stdio'
                            ? t('mcp.form.requiredFieldsStdio')
                            : t('mcp.form.requiredFieldsHttp')
                        })}
                      </p>
                    )}
                    <div className={`mt-2 text-xs text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : ''}`}>
                      <p><strong>{t('mcp.form.requiredFields')}</strong></p>
                      <ul className="list-disc ml-4 mt-1">
                        <li><code>type</code>: {t('mcp.form.typeField')}</li>
                        {formData.type === 'stdio' ? (
                          <>
                            <li><code>command</code>: {t('mcp.form.commandField')}</li>
                            <li><code>args</code>: {t('mcp.form.argsField')}</li>
                          </>
                        ) : (
                          <li><code>url</code>: {t('mcp.form.urlField')}</li>
                        )}
                      </ul>
                      <p className="mt-2"><strong>{t('mcp.form.optionalFields')}</strong></p>
                      <ul className="list-disc ml-4 mt-1">
                        <li><code>timeout</code>: {t('mcp.form.timeoutField')}</li>
                        <li><code>autoApprove</code>: {t('mcp.form.autoApproveField')}</li>
                      </ul>
                    </div>
                  </div>

                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};