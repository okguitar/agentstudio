import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw, AlertCircle, Wrench, ChevronDown, ChevronRight, Minus, Plug2 } from 'lucide-react';
import { getAllToolsInfo, getToolDisplayName } from '../../shared/utils/toolMapping';

// 使用共享的工具信息
const AVAILABLE_REGULAR_TOOLS = getAllToolsInfo();

interface McpServer {
  name: string;
  command: string;
  args: string[];
  status?: 'active' | 'error' | 'validating';
  tools?: string[];
  error?: string;
  lastValidated?: string;
}

interface UnifiedToolSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRegularTools: string[];
  onRegularToolsChange: (tools: string[]) => void;
  selectedMcpTools: string[];
  onMcpToolsChange: (tools: string[]) => void;
  mcpToolsEnabled: boolean;
  onMcpEnabledChange: (enabled: boolean) => void;
}

export const UnifiedToolSelector: React.FC<UnifiedToolSelectorProps> = ({
  isOpen,
  onClose,
  selectedRegularTools,
  onRegularToolsChange,
  selectedMcpTools,
  onMcpToolsChange,
  mcpToolsEnabled,
  onMcpEnabledChange,
}) => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'regular' | 'mcp'>('regular');
  

  // Fetch MCP servers when component opens
  useEffect(() => {
    if (isOpen) {
      fetchMcpServers();
    }
  }, [isOpen]);


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
      console.error('Failed to fetch MCP servers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle regular tool toggle
  const handleRegularToolToggle = (toolName: string) => {
    if (selectedRegularTools.includes(toolName)) {
      onRegularToolsChange(selectedRegularTools.filter(t => t !== toolName));
    } else {
      onRegularToolsChange([...selectedRegularTools, toolName]);
    }
  };

  // Handle MCP tool toggle
  const handleMcpToolToggle = (toolId: string) => {
    if (selectedMcpTools.includes(toolId)) {
      onMcpToolsChange(selectedMcpTools.filter(id => id !== toolId));
    } else {
      onMcpToolsChange([...selectedMcpTools, toolId]);
    }
  };

  // Handle server expansion toggle
  const toggleServerExpansion = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  // Handle server tool selection (all tools)
  const handleServerToolsToggle = (serverName: string, allSelected: boolean) => {
    const server = servers.find(s => s.name === serverName);
    if (!server || !server.tools) return;

    if (allSelected) {
      // Remove all tools from this server
      const serverToolIds = server.tools.map(toolName => `mcp__${serverName}__${toolName}`);
      onMcpToolsChange(selectedMcpTools.filter(id => !serverToolIds.includes(id)));
    } else {
      // Add all tools from this server
      const serverToolIds = server.tools.map(toolName => `mcp__${serverName}__${toolName}`);
      const newSelected = [...selectedMcpTools];
      serverToolIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      onMcpToolsChange(newSelected);
    }
  };

  // Check if all tools from a server are selected
  const areAllServerToolsSelected = (serverName: string) => {
    const server = servers.find(s => s.name === serverName);
    if (!server || !server.tools) return false;
    
    const serverToolIds = server.tools.map(toolName => `mcp__${serverName}__${toolName}`);
    return serverToolIds.every(id => selectedMcpTools.includes(id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="unified-tool-selector-popup w-96 max-h-[500px] bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">工具选择</h3>
          <button type="button"
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-2 bg-gray-100 rounded-lg p-1">
          <button type="button"
            type="button"
            onClick={() => setActiveTab('regular')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'regular'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>常规工具</span>
            {selectedRegularTools.length > 0 && (
              <span className="bg-blue-100 text-blue-600 text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {selectedRegularTools.length}
              </span>
            )}
          </button>
          <button type="button"
            type="button"
            onClick={() => setActiveTab('mcp')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'mcp'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Plug2 className="w-4 h-4" />
            <span>MCP工具</span>
            {selectedMcpTools.length > 0 && (
              <span className="bg-green-100 text-green-600 text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {selectedMcpTools.filter(t => t.startsWith('mcp__') && t.split('__').length === 3).length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 overflow-y-auto flex-1">
        {activeTab === 'regular' ? (
          <div className="space-y-2">
            {/* 工具列表 */}
            <div className="space-y-2">
              {/* 全选控制 */}
              <div className="flex items-center justify-end p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 font-medium">全选</span>
                  <button type="button"
                    type="button"
                    onClick={() => {
                      if (selectedRegularTools.length === AVAILABLE_REGULAR_TOOLS.length) {
                        // 全部选中，清空选择
                        onRegularToolsChange([]);
                      } else {
                        // 选择全部
                        onRegularToolsChange(AVAILABLE_REGULAR_TOOLS.map(tool => tool.name));
                      }
                    }}
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                      selectedRegularTools.length === AVAILABLE_REGULAR_TOOLS.length
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : selectedRegularTools.length > 0
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {selectedRegularTools.length === AVAILABLE_REGULAR_TOOLS.length ? (
                      <Check className="w-3 h-3" />
                    ) : selectedRegularTools.length > 0 ? (
                      <Minus className="w-3 h-3" />
                    ) : null}
                  </button>
                </div>
              </div>
              {AVAILABLE_REGULAR_TOOLS.map((tool) => {
                const isSelected = selectedRegularTools.includes(tool.name);
                return (
                  <div
                    key={tool.name}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <button type="button"
                        onClick={() => handleRegularToolToggle(tool.name)}
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                      <span className="text-sm text-gray-700">{getToolDisplayName(tool.name)} ({tool.name})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end p-2">
              <label className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">启用MCP工具</span>
                <input
                  type="checkbox"
                  checked={mcpToolsEnabled}
                  onChange={(e) => onMcpEnabledChange(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
              </label>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin mr-2" />
                <span className="text-sm text-gray-500">加载中...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-4 text-red-600">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {!loading && !error && servers.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <span className="text-sm">没有可用的MCP服务器</span>
              </div>
            )}

            {!loading && !error && servers.map((server) => {
              const isExpanded = expandedServers.has(server.name);
              const isActive = server.status === 'active';
              const allSelected = areAllServerToolsSelected(server.name);
              const hasSelectedTools = server.tools?.some(toolName => 
                selectedMcpTools.includes(`mcp__${server.name}__${toolName}`)
              );

              return (
                <div key={server.name} className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between p-3">
                    <button type="button"
                      onClick={() => toggleServerExpansion(server.name)}
                      className="flex items-center space-x-2 flex-1 text-left hover:bg-gray-50 -m-1 p-1 rounded transition-colors"
                      disabled={!isActive}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className={`font-medium ${
                        isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {server.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {server.tools?.length || 0} 个工具
                      </span>
                    </button>
                    
                    {isActive && server.tools && server.tools.length > 0 && (
                      <button type="button"
                        onClick={() => handleServerToolsToggle(server.name, allSelected)}
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                          allSelected
                            ? 'bg-green-600 border-green-600 text-white'
                            : hasSelectedTools
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {allSelected ? (
                          <Check className="w-3 h-3" />
                        ) : hasSelectedTools ? (
                          <Minus className="w-3 h-3" />
                        ) : null}
                      </button>
                    )}
                  </div>
                  
                  {isExpanded && isActive && server.tools && (
                    <div className="border-t border-gray-200 p-3 space-y-2">
                      {server.tools.map((toolName) => {
                        const toolId = `mcp__${server.name}__${toolName}`;
                        const isSelected = selectedMcpTools.includes(toolId);
                        
                        return (
                          <div
                            key={toolName}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <button type="button"
                                onClick={() => handleMcpToolToggle(toolId)}
                                className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-green-600 border-green-600 text-white'
                                    : 'border-gray-300 hover:border-green-500'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </button>
                              <span className="text-sm text-gray-700">{toolName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!isActive && (
                    <div className="border-t border-gray-200 p-3">
                      <div className="flex items-center text-red-600">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {server.error || '服务器不可用'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};