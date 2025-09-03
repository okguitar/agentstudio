import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { AgentTool } from '../../types/index.js';
import { getAllToolsInfo, getToolDisplayName } from '../../../shared/utils/toolMapping';

// 使用共享的工具信息
const AVAILABLE_TOOLS = getAllToolsInfo();

interface ToolSelectorProps {
  selectedTools: AgentTool[] | string[];
  onChange: (tools: AgentTool[] | string[]) => void;
  label?: string;
  emptyText?: string;
  className?: string;
  /** 是否使用 AgentTool 格式（{name, enabled}），否则使用字符串数组 */
  useAgentTool?: boolean;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  selectedTools,
  onChange,
  label = "启用的工具",
  emptyText = "还未选择任何工具",
  className = "",
  useAgentTool = true
}) => {
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedToolsToAdd, setSelectedToolsToAdd] = useState<string[]>([]);

  // 归一化工具数据，统一处理 AgentTool 和 string[] 两种格式
  const normalizedSelectedTools: string[] = useAgentTool
    ? (selectedTools as AgentTool[]).map(tool => tool.name)
    : selectedTools as string[];

  const handleAddTools = () => {
    if (selectedToolsToAdd.length > 0) {
      const newTools = useAgentTool
        ? selectedToolsToAdd.map(name => ({ name, enabled: true } as AgentTool))
        : selectedToolsToAdd;
      
      const updatedTools = useAgentTool
        ? [...(selectedTools as AgentTool[]), ...newTools as AgentTool[]]
        : [...(selectedTools as string[]), ...newTools as string[]];
      
      onChange(updatedTools);
    }
    setShowToolSelector(false);
    setSelectedToolsToAdd([]);
  };

  const handleRemoveTool = (toolName: string) => {
    if (useAgentTool) {
      const updatedTools = (selectedTools as AgentTool[]).filter(tool => tool.name !== toolName);
      onChange(updatedTools);
    } else {
      const updatedTools = (selectedTools as string[]).filter(tool => tool !== toolName);
      onChange(updatedTools);
    }
  };

  const handleSelectAll = () => {
    const allTools = useAgentTool
      ? AVAILABLE_TOOLS.map(tool => ({ name: tool.name, enabled: true } as AgentTool))
      : AVAILABLE_TOOLS.map(tool => tool.name);
    
    onChange(allTools);
  };

  const handleClearAll = () => {
    onChange(useAgentTool ? [] as AgentTool[] : [] as string[]);
  };

  const availableToolsToAdd = AVAILABLE_TOOLS.filter(tool => 
    !normalizedSelectedTools.includes(tool.name)
  );

  return (
    <>
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="min-h-[80px] border border-gray-300 rounded-lg p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {normalizedSelectedTools.map((toolName) => {
              const displayName = getToolDisplayName(toolName);
              return (
                <span
                  key={toolName}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  <span>{displayName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTool(toolName)}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    title="移除工具"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            
            <button
              type="button"
              onClick={() => {
                if (availableToolsToAdd.length === 0) {
                  alert('所有工具都已添加');
                  return;
                }
                setSelectedToolsToAdd([]);
                setShowToolSelector(true);
              }}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm border-2 border-dashed border-gray-300 text-gray-600 bg-white hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" />
              <span>添加工具</span>
            </button>
          </div>
          
          {normalizedSelectedTools.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">{emptyText}</p>
              <p className="text-xs">点击"+ 添加工具"开始选择</p>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              已选择 {normalizedSelectedTools.length} / {AVAILABLE_TOOLS.length} 个工具
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                全选
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tool Selector Modal */}
      {showToolSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">选择要添加的工具</h3>
              <button
                onClick={() => setShowToolSelector(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {AVAILABLE_TOOLS.map((tool) => {
                  const isCurrentlyEnabled = normalizedSelectedTools.includes(tool.name);
                  const isSelectedToAdd = selectedToolsToAdd.includes(tool.name);
                  const isChecked = isCurrentlyEnabled || isSelectedToAdd;
                  
                  return (
                    <label key={tool.name} className={`flex items-start space-x-3 cursor-pointer ${isCurrentlyEnabled ? 'opacity-60' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isCurrentlyEnabled}
                        onChange={(e) => {
                          if (!isCurrentlyEnabled) {
                            if (e.target.checked) {
                              setSelectedToolsToAdd([...selectedToolsToAdd, tool.name]);
                            } else {
                              setSelectedToolsToAdd(selectedToolsToAdd.filter(name => name !== tool.name));
                            }
                          }
                        }}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isCurrentlyEnabled ? 'text-gray-500' : 'text-gray-900'}`}>
                          {tool.label}
                          {isCurrentlyEnabled && <span className="ml-2 text-xs text-blue-600">(已添加)</span>}
                        </div>
                        <div className="text-xs text-gray-500">{tool.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                已选择 {selectedToolsToAdd.length} 个工具
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowToolSelector(false)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddTools}
                  disabled={selectedToolsToAdd.length === 0}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加 ({selectedToolsToAdd.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { AVAILABLE_TOOLS };