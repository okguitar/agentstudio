import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, AlertCircle, Wrench, ChevronDown, ChevronRight } from 'lucide-react';

interface McpServer {
  name: string;
  command: string;
  args: string[];
  status?: 'active' | 'error' | 'validating';
  tools?: string[];
  error?: string;
  lastValidated?: string;
}

interface McpToolSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTools: string[];
  onToolsChange: (tools: string[]) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export const McpToolSelector: React.FC<McpToolSelectorProps> = ({
  isOpen,
  onClose,
  selectedTools,
  onToolsChange,
  enabled,
  onEnabledChange,
}) => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  
  // Add click outside to close functionality
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target && !target.closest('.mcp-selector-popup')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Fetch MCP servers from backend
  const fetchMcpServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agents/mcp-configs');
      if (!response.ok) {
        throw new Error('Failed to fetch MCP configurations');
      }
      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMcpServers();
    }
  }, [isOpen]);

  const toggleServer = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  const handleToolToggle = (toolName: string, serverName: string) => {
    const toolId = `mcp__${serverName}__${toolName}`;
    const newSelected = selectedTools.includes(toolId)
      ? selectedTools.filter(t => t !== toolId)
      : [...selectedTools, toolId];
    onToolsChange(newSelected);
  };

  const handleServerToggle = (serverName: string) => {
    const server = servers.find(s => s.name === serverName);
    if (!server || !server.tools) return;
    
    const serverTools = server.tools.map(tool => `mcp__${serverName}__${tool}`);
    const selectedServerTools = selectedTools.filter(t => serverTools.includes(t));
    
    let newSelected = [...selectedTools];
    
    if (selectedServerTools.length === server.tools.length) {
      // 当前所有工具都被选中，取消全部
      newSelected = selectedTools.filter(t => !serverTools.includes(t));
    } else {
      // 选择全部工具
      const toolsToAdd = serverTools.filter(t => !selectedTools.includes(t));
      newSelected = [...selectedTools, ...toolsToAdd];
    }
    
    onToolsChange(newSelected);
  };

  const isToolSelected = (toolName: string, serverName: string) => {
    const toolId = `mcp__${serverName}__${toolName}`;
    return selectedTools.includes(toolId);
  };

  const getServerSelectState = (serverName: string) => {
    const server = servers.find(s => s.name === serverName);
    if (!server || !server.tools) return 'none';
    
    const serverTools = server.tools.map(tool => `mcp__${serverName}__${tool}`);
    const selectedServerTools = selectedTools.filter(t => serverTools.includes(t));
    
    if (selectedServerTools.length === 0) return 'none';
    if (selectedServerTools.length === server.tools.length) return 'all';
    return 'partial';
  };

  // Calculate the actual number of tools represented by the selection
  const getActualToolCount = () => {
    // 现在只需要计算单个工具选择的数量
    return selectedTools.filter(t => t.startsWith('mcp__') && t.split('__').length === 3).length;
  };

  const handleValidate = async (serverName: string) => {
    try {
      setServers(prev => prev.map(s => 
        s.name === serverName ? { ...s, status: 'validating' } : s
      ));
      
      const response = await fetch(`/api/agents/mcp-configs/${serverName}/validate`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Refresh servers list to get updated status
        await fetchMcpServers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }
    } catch (err) {
      console.error('Validation error:', err);
      // Refresh to get current status
      await fetchMcpServers();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] overflow-hidden mcp-selector-popup">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Wrench className="w-4 h-4 mr-2" />
            选择 MCP 工具
          </h3>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onEnabledChange(e.target.checked)}
                className="w-3 h-3 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-1"
              />
              <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
                启用
              </span>
            </label>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 overflow-y-auto max-h-[50vh]">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">加载中...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded mb-3">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700 flex-1">{error}</span>
            <button
              onClick={fetchMcpServers}
              className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && servers.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Wrench className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">暂无可用的 MCP 服务器</p>
            <p className="text-xs text-gray-400">请先配置 MCP 服务器</p>
          </div>
        )}

        {!loading && !error && servers.length > 0 && (
          <div className="space-y-2">
            {servers.map((server) => (
              <div key={server.name} className="border border-gray-200 rounded">
                <div className="flex items-center p-2">
                  <button
                    onClick={() => toggleServer(server.name)}
                    className="flex items-center flex-1 text-left"
                  >
                    {expandedServers.has(server.name) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{server.name}</span>
                        {server.status === 'active' && (
                          <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                        {server.status === 'error' && (
                          <div className="ml-2 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                        {server.status === 'validating' && (
                          <RefreshCw className="ml-2 w-3 h-3 animate-spin text-blue-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {server.tools ? `${server.tools.length} 个工具` : '未验证'}
                      </div>
                    </div>
                  </button>
                  
                  {/* Server selection checkbox */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleServerToggle(server.name)}
                      className={`flex items-center justify-center w-4 h-4 border-2 rounded transition-colors ${
                        getServerSelectState(server.name) === 'all'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : getServerSelectState(server.name) === 'partial'
                          ? 'bg-blue-200 border-blue-400 text-blue-800'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {getServerSelectState(server.name) === 'all' && <Check className="w-2.5 h-2.5" />}
                      {getServerSelectState(server.name) === 'partial' && (
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm"></div>
                      )}
                    </button>
                    <span className="text-xs text-gray-600">全部</span>
                  </div>

                  {server.status !== 'validating' && (
                    <button
                      onClick={() => handleValidate(server.name)}
                      className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors"
                      title="验证服务器"
                    >
                      <RefreshCw className="w-3 h-3 text-gray-500" />
                    </button>
                  )}
                </div>

                {expandedServers.has(server.name) && (
                  <div className="border-t border-gray-200 p-2 bg-gray-50">
                    {server.status === 'error' && server.error && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {server.error}
                      </div>
                    )}
                    
                    {server.tools && server.tools.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-700">可用工具：</div>
                        <div className="grid grid-cols-1 gap-1">
                          {server.tools.map((tool) => {
                            const isToolSelectedState = isToolSelected(tool, server.name);
                            
                            return (
                              <label
                                key={tool}
                                className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded cursor-pointer"
                              >
                                <div
                                  className={`flex items-center justify-center w-3 h-3 border-2 rounded transition-colors ${
                                    isToolSelectedState
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  {isToolSelectedState && <Check className="w-2 h-2" />}
                                </div>
                                <span 
                                  className="text-xs text-gray-700 flex-1"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleToolToggle(tool, server.name);
                                  }}
                                >
                                  {tool}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        {server.status === 'active' ? '此服务器没有工具' : '请先验证服务器以查看可用工具'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          已选择 {getActualToolCount()} 个工具
          {getActualToolCount() > 0 && (
            <span className={`ml-2 ${enabled ? 'text-green-600' : 'text-orange-500'}`}>
              ({enabled ? '已启用' : '未启用'})
            </span>
          )}
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => onToolsChange([])}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
          >
            清空
          </button>
          <button
            onClick={onClose}
            className={`px-3 py-1 text-xs text-white rounded transition-colors ${
              enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
