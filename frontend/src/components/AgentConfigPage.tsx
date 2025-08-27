import React, { useState } from 'react';
import { Settings, Plus, Edit3, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { useAgents, useUpdateAgent, useDeleteAgent, useCreateAgent } from '../hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import type { AgentConfig, AgentTool } from '../types/index.js';

// 可用工具列表 - 与后端Claude Code SDK工具名称保持一致
const AVAILABLE_TOOLS = [
  { name: 'Bash', label: '终端命令', description: '执行命令行操作' },
  { name: 'Edit', label: '文件编辑', description: '编辑文件内容' },
  { name: 'MultiEdit', label: '多文件编辑', description: '批量编辑多个文件' },
  { name: 'Read', label: '读取文件', description: '读取文件内容' },
  { name: 'Write', label: '写入文件', description: '创建或覆盖文件' },
  { name: 'LS', label: '目录列表', description: '列出目录内容' },
  { name: 'Glob', label: '文件搜索', description: '使用通配符搜索文件' },
  { name: 'Grep', label: '文本搜索', description: '在文件中搜索文本' },
  { name: 'NotebookRead', label: '笔记本读取', description: '读取Jupyter笔记本' },
  { name: 'NotebookEdit', label: '笔记本编辑', description: '编辑Jupyter笔记本' },
  { name: 'WebFetch', label: '网页获取', description: '获取网页内容' },
  { name: 'WebSearch', label: '网络搜索', description: '搜索网络信息' },
  { name: 'TodoWrite', label: '任务管理', description: '创建和管理待办事项' },
  { name: 'Task', label: '任务执行', description: '执行复杂任务' }
] as const;

interface AgentConfigPageProps {
  onClose: () => void;
  editingAgent?: AgentConfig | null;
  isCreating?: boolean;
}

export const AgentConfigPage: React.FC<AgentConfigPageProps> = ({ onClose, editingAgent: propEditingAgent, isCreating: propIsCreating }) => {
  const { data: agentsData, isLoading } = useAgents(); // Get all agents including disabled
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const createAgent = useCreateAgent();
  const queryClient = useQueryClient();
  
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(propEditingAgent || null);
  const [editForm, setEditForm] = useState<Partial<AgentConfig>>(() => {
    if (propIsCreating) {
      // 返回创建模式的默认值
      return {
        name: '',
        description: '',
        version: '1.0.0',
        systemPrompt: '',
        maxTurns: 25,
        permissionMode: 'default',
        allowedTools: [
          { name: 'Read', enabled: true },
          { name: 'Write', enabled: true },
          { name: 'Edit', enabled: true }
        ],
        ui: {
          icon: '🤖',
          primaryColor: '#3B82F6',
          headerTitle: '',
          headerDescription: '',
          componentType: 'chat'
        },
        author: 'User',
        tags: ['custom'],
        enabled: true
      };
    }
    return propEditingAgent || {};
  });
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedToolsToAdd, setSelectedToolsToAdd] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(propIsCreating || false);
  
  const agents = agentsData?.agents || [];

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setEditForm(agent);
    setIsCreating(false);
  };

  const handleCreate = () => {
    // 设置创建模式，并提供默认值
    const defaultAgent: Partial<AgentConfig> = {
      name: '',
      description: '',
      version: '1.0.0',
      systemPrompt: '',
      maxTurns: 25,
      permissionMode: 'default',
      allowedTools: [
        { name: 'Read', enabled: true },
        { name: 'Write', enabled: true },
        { name: 'Edit', enabled: true }
      ],
      ui: {
        icon: '🤖',
        primaryColor: '#3B82F6',
        headerTitle: '',
        headerDescription: '',
        componentType: 'chat'
      },
      author: 'User',
      tags: ['custom'],
      enabled: true
    };
    
    setEditingAgent(null);
    setEditForm(defaultAgent);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editForm || !editForm.name?.trim()) {
      alert('请填写助手名称');
      return;
    }
    
    try {
      if (isCreating) {
        // 创建新助手
        const dataToSave = {
          ...editForm,
          id: `custom-${Date.now()}`, // 生成唯一ID
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ui: {
            ...editForm.ui,
            headerTitle: editForm.ui?.headerTitle || editForm.name,
            headerDescription: editForm.ui?.headerDescription || editForm.description
          }
        } as Omit<AgentConfig, 'createdAt' | 'updatedAt'>;
        
        await createAgent.mutateAsync(dataToSave);
      } else {
        // 更新现有助手
        if (!editingAgent) return;
        
        const dataToSave = {
          ...editForm,
          enabled: editingAgent.enabled // Keep original enabled status
        };
        
        await updateAgent.mutateAsync({
          agentId: editingAgent.id,
          data: dataToSave
        });
      }
      
      setEditingAgent(null);
      setEditForm({});
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      
      // Close the modal after successful save
      onClose();
    } catch (error) {
      console.error('Failed to save agent:', error);
      alert(isCreating ? '创建失败，请重试。' : '保存失败，请重试。');
    }
  };

  const handleDelete = async (agent: AgentConfig) => {
    if (agent.id === 'ppt-editor' || agent.id === 'code-assistant' || agent.id === 'document-writer') {
      alert('内置助手无法删除，但可以禁用。');
      return;
    }
    
    const confirmed = window.confirm(`确定要删除助手"${agent.name}"吗？\n\n此操作无法撤销，相关的所有会话也会被删除。`);
    if (!confirmed) return;
    
    try {
      await deleteAgent.mutateAsync(agent.id);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error) {
      console.error('Failed to delete agent:', error);
      alert('删除失败，请重试。');
    }
  };

  const handleToggleEnabled = async (agent: AgentConfig) => {
    try {
      await updateAgent.mutateAsync({
        agentId: agent.id,
        data: { enabled: !agent.enabled }
      });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error) {
      console.error('Failed to toggle agent:', error);
      alert('操作失败，请重试。');
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              {isCreating ? '创建助手' : editingAgent ? `编辑助手：${editingAgent.name}` : '智能助手管理'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            {(editingAgent || isCreating) && (
              <>
                <button
                  onClick={handleSave}
                  disabled={updateAgent.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </button>
                <button
                  onClick={() => {
                    setEditingAgent(null);
                    setEditForm({});
                    setIsCreating(false);
                    onClose(); // Close the modal on cancel
                  }}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  <span>取消</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {(editingAgent || isCreating) ? (
            /* Edit Form */
            <div className="space-y-6">


              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">最大轮次</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editForm.maxTurns || 25}
                      onChange={(e) => setEditForm({ ...editForm, maxTurns: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">权限模式</label>
                    <select
                      value={editForm.permissionMode || 'default'}
                      onChange={(e) => setEditForm({ ...editForm, permissionMode: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="default">默认</option>
                      <option value="acceptEdits">自动接受编辑</option>
                      <option value="bypassPermissions">绕过权限检查</option>
                      <option value="plan">规划模式</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {editForm.permissionMode === 'default' && '询问用户确认操作'}
                      {editForm.permissionMode === 'acceptEdits' && '自动接受文件编辑操作'}
                      {editForm.permissionMode === 'bypassPermissions' && '绕过所有权限检查'}
                      {editForm.permissionMode === 'plan' && '仅制定计划，不执行操作'}
                    </p>
                  </div>

                  {/* Icon and Color in one row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                      <input
                        type="text"
                        value={editForm.ui?.icon || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          ui: { ...editForm.ui, icon: e.target.value } as any
                        })}
                        placeholder="🤖"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主题颜色</label>
                      <input
                        type="color"
                        value={editForm.ui?.primaryColor || '#3B82F6'}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          ui: { ...editForm.ui, primaryColor: e.target.value } as any
                        })}
                        className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Allowed Tools */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">启用的工具</label>
                <div className="min-h-[80px] border border-gray-300 rounded-lg p-3">
                  {/* Selected Tools Pills */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editForm.allowedTools?.map((tool: AgentTool) => {
                      const toolInfo = AVAILABLE_TOOLS.find(t => t.name === tool.name);
                      return (
                        <span
                          key={tool.name}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          <span>{toolInfo?.label || tool.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditForm({
                                ...editForm,
                                allowedTools: editForm.allowedTools?.filter((t: AgentTool) => t.name !== tool.name) || []
                              });
                            }}
                            className="ml-2 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                            title="移除工具"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    
                    {/* Add Tool Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const availableTools = AVAILABLE_TOOLS.filter(tool => 
                          !editForm.allowedTools?.some((t: AgentTool) => t.name === tool.name)
                        );
                        
                        if (availableTools.length === 0) {
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
                  
                  {/* Empty State */}
                  {(!editForm.allowedTools || editForm.allowedTools.length === 0) && (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">还未选择任何工具</p>
                      <p className="text-xs">点击"+ 添加工具"开始选择</p>
                    </div>
                  )}
                  
                  {/* Tools Count and Quick Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      已选择 {editForm.allowedTools?.length || 0} / {AVAILABLE_TOOLS.length} 个工具
                    </span>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allTools: AgentTool[] = AVAILABLE_TOOLS.map(tool => ({
                            name: tool.name,
                            enabled: true
                          }));
                          setEditForm({ ...editForm, allowedTools: allTools });
                        }}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        全选
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, allowedTools: [] })}
                        className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-50 rounded"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
                <textarea
                  value={editForm.systemPrompt || ''}
                  onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="输入助手的系统提示词..."
                />
              </div>
            </div>
          ) : (
            /* Agent List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-600">管理系统中的智能助手配置</p>
                <button
                  onClick={handleCreate}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  title="创建自定义助手"
                >
                  <Plus className="w-4 h-4" />
                  <span>创建助手</span>
                </button>
              </div>

              <div className="grid gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`border rounded-lg p-4 ${
                      agent.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">{agent.ui.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium ${
                              agent.enabled ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {agent.name}
                            </h3>
                            {!agent.enabled && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                已禁用
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mt-1 ${
                            agent.enabled ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {agent.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>组件类型: {agent.ui.componentType}</span>
                            <span>最大轮次: {agent.maxTurns}</span>
                            <span>权限模式: {
                              agent.permissionMode === 'default' ? '默认' :
                              agent.permissionMode === 'acceptEdits' ? '自动接受编辑' :
                              agent.permissionMode === 'bypassPermissions' ? '绕过权限检查' :
                              agent.permissionMode === 'plan' ? '规划模式' :
                              agent.permissionMode
                            }</span>
                            <span>工具数量: {agent.allowedTools?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleToggleEnabled(agent)}
                          className={`p-2 rounded-lg transition-colors ${
                            agent.enabled 
                              ? 'text-green-600 hover:bg-green-50' 
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={agent.enabled ? '禁用助手' : '启用助手'}
                        >
                          {agent.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleEdit(agent)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑助手"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDelete(agent)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除助手"
                          disabled={agent.id === 'ppt-editor' || agent.id === 'code-assistant' || agent.id === 'document-writer'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {agents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无助手配置</p>
                </div>
              )}
            </div>
          )}
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
                  const isCurrentlyEnabled = editForm.allowedTools?.some((t: AgentTool) => t.name === tool.name) || false;
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
                  onClick={() => {
                    if (selectedToolsToAdd.length > 0) {
                      const newTools: AgentTool[] = selectedToolsToAdd.map(name => ({
                        name,
                        enabled: true
                      }));
                      
                      setEditForm({
                        ...editForm,
                        allowedTools: [...(editForm.allowedTools || []), ...newTools]
                      });
                    }
                    setShowToolSelector(false);
                    setSelectedToolsToAdd([]);
                  }}
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
    </div>
  );
};