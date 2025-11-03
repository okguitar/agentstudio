import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { Check, X, RefreshCw, AlertCircle, Wrench, ChevronDown, ChevronRight, Minus, Plug2, Lock } from 'lucide-react';
import { getAllToolsInfo, getToolDisplayName } from '../utils/toolMapping';
import type { AgentTool } from '../types/index';

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
  // Agent预设工具配置（不可取消选择）
  presetTools?: AgentTool[];
  // 是否为只读模式（禁用所有交互）
  readonly?: boolean;
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
  presetTools = [],
  readonly = false,
}) => {
  const { t } = useTranslation('components');
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
      const response = await authFetch(`${API_BASE}/mcp`);
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

  // 检查工具是否是Agent预设工具
  const isPresetTool = (toolName: string) => {
    return presetTools.some(tool => tool.name === toolName && tool.enabled);
  };

  // 检查MCP工具是否是Agent预设工具
  const isPresetMcpTool = (toolId: string) => {
    // 直接检查工具ID是否在预设工具中（mcp__serverName__toolName格式）
    if (presetTools.some(tool => tool.name === toolId && tool.enabled)) {
      return true;
    }
    
    // MCP工具ID格式：mcp__serverName__toolName
    const parts = toolId.split('__');
    if (parts.length === 3 && parts[0] === 'mcp') {
      // 检查 serverName.toolName 格式
      const mcpToolName = `${parts[1]}.${parts[2]}`;
      if (presetTools.some(tool => tool.name === mcpToolName && tool.enabled)) {
        return true;
      }
      
      // 检查 mcp__serverName__toolName 格式（完整格式）
      const fullMcpName = `mcp__${parts[1]}__${parts[2]}`;
      if (presetTools.some(tool => tool.name === fullMcpName && tool.enabled)) {
        return true;
      }
    }
    return false;
  };

  // Handle regular tool toggle
  const handleRegularToolToggle = (toolName: string) => {
    // 如果是预设工具，不允许取消选择
    if (isPresetTool(toolName) && selectedRegularTools.includes(toolName)) {
      return;
    }
    
    if (selectedRegularTools.includes(toolName)) {
      onRegularToolsChange(selectedRegularTools.filter(t => t !== toolName));
    } else {
      onRegularToolsChange([...selectedRegularTools, toolName]);
    }
  };

  // Handle MCP tool toggle
  const handleMcpToolToggle = (toolId: string) => {
    // 如果是预设MCP工具，不允许取消选择
    if (isPresetMcpTool(toolId) && selectedMcpTools.includes(toolId)) {
      return;
    }
    
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

  // Check if server has preset tools
  const serverHasPresetTools = (serverName: string) => {
    const server = servers.find(s => s.name === serverName);
    if (!server || !server.tools) return false;
    
    return server.tools.some(toolName => {
      const toolId = `mcp__${serverName}__${toolName}`;
      return isPresetMcpTool(toolId);
    });
  };

  // Handle server tool selection (all tools)
  const handleServerToolsToggle = (serverName: string, allSelected: boolean) => {
    const server = servers.find(s => s.name === serverName);
    if (!server || !server.tools) return;

    const serverToolIds = server.tools.map(toolName => `mcp__${serverName}__${toolName}`);
    const hasPresetTools = serverHasPresetTools(serverName);

    if (allSelected) {
      if (hasPresetTools) {
        // 如果有预设工具，只移除非预设工具，保留预设工具
        const toolsToRemove = serverToolIds.filter(id => !isPresetMcpTool(id));
        onMcpToolsChange(selectedMcpTools.filter(id => !toolsToRemove.includes(id)));
      } else {
        // 没有预设工具，可以移除所有工具
        onMcpToolsChange(selectedMcpTools.filter(id => !serverToolIds.includes(id)));
      }
    } else {
      // Add all tools from this server
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

  // Check if server has only preset tools selected (partial selection)
  // const isServerPartiallySelected = (serverName: string) => {
  //   const server = servers.find(s => s.name === serverName);
  //   if (!server || !server.tools) return false;
  //   
  //   const serverToolIds = server.tools.map(toolName => `mcp__${serverName}__${toolName}`);
  //   const selectedServerTools = serverToolIds.filter(id => selectedMcpTools.includes(id));
  //   const presetServerTools = serverToolIds.filter(id => isPresetMcpTool(id));
  //   
  //   // 如果有预设工具且当前选择的工具数量大于0但小于全部工具数量
  //   if (presetServerTools.length > 0 && selectedServerTools.length > 0 && selectedServerTools.length < serverToolIds.length) {
  //     return true;
  //   }
  //   
  //   return false;
  // };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="unified-tool-selector-popup w-96 max-h-[500px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('unifiedToolSelector.title')}</h3>
          <button type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button type="button"
            onClick={() => setActiveTab('regular')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'regular'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{t('unifiedToolSelector.tabs.regular')}</span>
            {selectedRegularTools.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {selectedRegularTools.length}
              </span>
            )}
          </button>
          <button type="button"
            onClick={() => setActiveTab('mcp')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'mcp'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Plug2 className="w-4 h-4" />
            <span>{t('unifiedToolSelector.tabs.mcp')}</span>
            {selectedMcpTools.length > 0 && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
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
              <div className="flex items-center justify-end p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('unifiedToolSelector.selectAll')}</span>
                  <button type="button"
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
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
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
                const isPreset = isPresetTool(tool.name);
                const isDisabled = readonly || (isPreset && isSelected);
                
                return (
                  <div
                    key={tool.name}
                    className={`flex items-center justify-between p-2 rounded ${
                      isDisabled ? 'bg-gray-50 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <button type="button"
                        onClick={() => handleRegularToolToggle(tool.name)}
                        disabled={isDisabled}
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                          isSelected
                            ? isPreset
                              ? 'bg-orange-500 border-orange-500 text-white cursor-not-allowed'
                              : 'bg-blue-600 border-blue-600 text-white'
                            : isDisabled
                            ? 'border-gray-200 dark:border-gray-600 cursor-not-allowed'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                        }`}
                      >
                        {isSelected && (
                          isPreset ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />
                        )}
                      </button>
                      <span className={`text-sm ${
                        isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {getToolDisplayName(tool.name)} ({tool.name})
                        {isPreset && <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">[{t('unifiedToolSelector.preset')}]</span>}
                      </span>
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('unifiedToolSelector.enableMcpTools')}</span>
                <input
                  type="checkbox"
                  checked={mcpToolsEnabled}
                  onChange={(e) => onMcpEnabledChange(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500"
                />
              </label>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('unifiedToolSelector.loading')}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-4 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {!loading && !error && servers.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <span className="text-sm">{t('unifiedToolSelector.noMcpServers')}</span>
              </div>
            )}

            {!loading && !error && servers.map((server) => {
              const isExpanded = expandedServers.has(server.name);
              const isActive = server.status === 'active';
              const allSelected = areAllServerToolsSelected(server.name);
              const hasSelectedTools = server.tools?.some(toolName => 
                selectedMcpTools.includes(`mcp__${server.name}__${toolName}`)
              );
              const hasPresetTools = serverHasPresetTools(server.name);
              // const isPartiallySelected = isServerPartiallySelected(server.name);

              return (
                <div key={server.name} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between p-3">
                    <button type="button"
                      onClick={() => toggleServerExpansion(server.name)}
                      className="flex items-center space-x-2 flex-1 text-left hover:bg-gray-50 dark:hover:bg-gray-700 -m-1 p-1 rounded transition-colors"
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
                        isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {server.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('unifiedToolSelector.toolsCount', { count: server.tools?.length || 0 })}
                      </span>
                    </button>
                    
                    {isActive && server.tools && server.tools.length > 0 && (
                      <button type="button"
                        onClick={() => handleServerToolsToggle(server.name, allSelected)}
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                          allSelected
                            ? hasPresetTools
                              ? 'bg-orange-500 border-orange-500 text-white' // 有预设工具的全选状态
                              : 'bg-green-600 border-green-600 text-white'   // 无预设工具的全选状态
                            : hasSelectedTools
                            ? hasPresetTools
                              ? 'bg-orange-400 border-orange-400 text-white' // 有预设工具的部分选择状态
                              : 'bg-blue-600 border-blue-600 text-white'     // 无预设工具的部分选择状态
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                        }`}
                      >
                        {allSelected ? (
                          hasPresetTools ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />
                        ) : hasSelectedTools ? (
                          <Minus className="w-3 h-3" />
                        ) : null}
                      </button>
                    )}
                  </div>

                  {isExpanded && isActive && server.tools && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
                      {server.tools.map((toolName) => {
                        const toolId = `mcp__${server.name}__${toolName}`;
                        const isSelected = selectedMcpTools.includes(toolId);
                        const isPreset = isPresetMcpTool(toolId);
                        const isDisabled = readonly || (isPreset && isSelected);

                        return (
                          <div
                            key={toolName}
                            className={`flex items-center justify-between p-2 rounded ${
                              isDisabled ? 'bg-gray-50 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <button type="button"
                                onClick={() => handleMcpToolToggle(toolId)}
                                disabled={isDisabled}
                                className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? isPreset
                                      ? 'bg-orange-500 border-orange-500 text-white cursor-not-allowed'
                                      : 'bg-green-600 border-green-600 text-white'
                                    : isDisabled
                                    ? 'border-gray-200 dark:border-gray-600 cursor-not-allowed'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                                }`}
                              >
                                {isSelected && (
                                  isPreset ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />
                                )}
                              </button>
                              <span className={`text-sm ${
                                isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {toolName}
                                {isPreset && <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">[{t('unifiedToolSelector.preset')}]</span>}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isActive && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        <span className="text-sm">
                          {server.error || t('unifiedToolSelector.serverUnavailable')}
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