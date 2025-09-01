import React, { useState } from 'react';
import { 
  Server, 
  Plus, 
  Settings, 
  Trash2, 
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  timeout?: number;
  autoApprove?: string[];
  status?: 'active' | 'error' | 'validating';
  error?: string;
  tools?: string[];
}



export const McpPage: React.FC = () => {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    config: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load MCP configurations from backend
  const loadMcpConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agents/mcp-configs');
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

      const response = await fetch(`/api/agents/mcp-configs/${serverName}/validate`, {
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
                error: error.error || '验证失败',
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
              error: '网络错误或服务不可用',
              tools: undefined
            }
          : s
      ));
    }
  };

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                         server.command.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                         server.args.join(' ').toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    return matchesSearch;
  });



  const handleEditServer = (server: McpServerConfig) => {
    setEditingServer(server);
    const config = {
      command: server.command,
      args: server.args,
      ...(server.timeout && { timeout: server.timeout }),
      ...(server.autoApprove && { autoApprove: server.autoApprove })
    };
    setFormData({
      name: server.name,
      config: JSON.stringify(config, null, 2)
    });
    setShowAddModal(true);
  };

  const handleDeleteServer = async (serverName: string) => {
    if (window.confirm(`确定要删除 "${serverName}" 配置吗？`)) {
      try {
        const response = await fetch(`/api/agents/mcp-configs/${serverName}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setServers(prev => prev.filter(s => s.name !== serverName));
        } else {
          const error = await response.json();
          throw new Error(error.error || '删除配置失败');
        }
      } catch (error) {
        console.error('删除配置失败:', error);
        alert(`删除配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      config: ''
    });
    setEditingServer(null);
  };

  const validateConfig = (str: string): boolean => {
    if (!str.trim()) return false; // Required field
    try {
      const parsed = JSON.parse(str);
      // 检查必须的字段
      if (!parsed.command || !Array.isArray(parsed.args)) {
        return false;
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
      alert('请输入服务名称');
      return;
    }

    if (!validateConfig(formData.config)) {
      alert('配置格式不正确，请确保包含必需的 command 和 args 字段，并且格式正确');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const config = JSON.parse(formData.config);
      
      let response: Response;
      
      if (editingServer) {
        // Update existing server - only send config data, name comes from URL
        console.log('Updating existing MCP server:', editingServer.name, 'with config:', config);
        response = await fetch(`/api/agents/mcp-configs/${editingServer.name}`, {
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
        response = await fetch('/api/agents/mcp-configs', {
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
        throw new Error(error.error || '保存配置失败');
      }
      
    } catch (error) {
      console.error('Failed to save MCP config:', error);
      alert(`保存配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载MCP配置...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MCP服务</h1>
            <p className="text-gray-600 mt-2">管理和监控Model Context Protocol服务器</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索配置名称、命令或参数..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>添加服务</span>
          </button>
        </div>
      </div>

      {/* Servers List */}
      <div className="space-y-6">
        {filteredServers.map((server) => (
          <div key={server.name} className="bg-white rounded-lg border border-gray-200 p-6">
                          <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Server className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{server.name}</h3>
                      {/* Status Indicator */}
                      {server.status === 'active' && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">可用</span>
                        </div>
                      )}
                      {server.status === 'error' && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <XCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">错误</span>
                        </div>
                      )}
                      {server.status === 'validating' && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-medium">验证中</span>
                        </div>
                      )}
                      {!server.status && (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="text-sm font-medium">未验证</span>
                        </div>
                      )}
                    </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">命令:</span>
                      <code className="px-2 py-1 bg-gray-100 rounded text-xs">{server.command}</code>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-medium">参数:</span>
                      <div className="flex flex-wrap gap-1">
                        {server.args.map((arg, idx) => (
                          <code key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                            {arg}
                          </code>
                        ))}
                      </div>
                    </div>
                    {server.timeout && (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">超时:</span>
                        <span>{server.timeout}ms</span>
                      </div>
                    )}
                    {server.autoApprove && server.autoApprove.length > 0 && (
                      <div className="flex items-start space-x-2">
                        <span className="font-medium">自动批准:</span>
                        <div className="flex flex-wrap gap-1">
                          {server.autoApprove.map((item, idx) => (
                            <code key={idx} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                              {item}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {server.status === 'error' && server.error && (
                      <div className="flex items-start space-x-2 mt-3 p-3 bg-red-50 rounded-lg">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium text-red-800">配置错误:</span>
                          <span className="text-red-700 ml-1">{server.error}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Tools List */}
                    {server.status === 'active' && server.tools && server.tools.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-800">可用工具 ({server.tools.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {server.tools.map((tool, idx) => (
                            <code key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              {tool}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => validateMcpServer(server.name)}
                  disabled={server.status === 'validating'}
                  className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="重新验证"
                >
                  {server.status === 'validating' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleEditServer(server)}
                  className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                  title="编辑配置"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteServer(server.name)}
                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="删除配置"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServers.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">🖥️</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {debouncedSearchQuery ? '未找到匹配的配置' : '还没有MCP服务配置'}
          </h3>
          <p className="text-gray-600 mb-6">
            {debouncedSearchQuery ? '尝试调整搜索条件' : '添加你的第一个MCP服务配置'}
          </p>
          {!debouncedSearchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              添加服务
            </button>
          )}
        </div>
      )}

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingServer ? '编辑MCP服务配置' : '添加MCP服务配置'}
                </h2>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    form="mcp-config-form"
                    disabled={isSubmitting || !formData.name.trim() || !validateConfig(formData.config)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '保存中...' : editingServer ? '保存配置' : '添加配置'}
                  </button>
                </div>
              </div>
              
              <form id="mcp-config-form" onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Service Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      服务名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：playwright"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!!editingServer}
                    />
                    {editingServer && (
                      <p className="text-xs text-gray-500 mt-1">服务名称不可修改</p>
                    )}
                  </div>

                  {/* Configuration JSON */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      配置 * (JSON格式)
                    </label>
                    <textarea
                      value={formData.config}
                      onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                      placeholder={`{
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
}`}
                      rows={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      required
                    />
                    {formData.config && !validateConfig(formData.config) && (
                      <p className="text-xs text-red-600 mt-1">⚠️ 配置格式不正确，请确保包含必需的 command 和 args 字段</p>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      <p><strong>必需字段：</strong></p>
                      <ul className="list-disc ml-4 mt-1">
                        <li><code>command</code>: 字符串，执行命令（如 "npx", "uvx"）</li>
                        <li><code>args</code>: 数组，命令参数</li>
                      </ul>
                      <p className="mt-2"><strong>可选字段：</strong></p>
                      <ul className="list-disc ml-4 mt-1">
                        <li><code>timeout</code>: 数字，超时时间（毫秒）</li>
                        <li><code>autoApprove</code>: 数组，自动批准的操作</li>
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