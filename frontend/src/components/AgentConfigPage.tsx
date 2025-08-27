import React, { useState } from 'react';
import { Settings, Plus, Edit3, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';
import { useAgents, useUpdateAgent, useDeleteAgent } from '../hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import type { AgentConfig, AgentTool } from '../types/index.js';

// 可用工具列表
const AVAILABLE_TOOLS = [
  { name: 'bash', label: '终端命令', description: '执行命令行操作' },
  { name: 'edit', label: '文件编辑', description: '编辑文件内容' },
  { name: 'multi_edit', label: '多文件编辑', description: '批量编辑多个文件' },
  { name: 'read_file', label: '读取文件', description: '读取文件内容' },
  { name: 'write', label: '写入文件', description: '创建或覆盖文件' },
  { name: 'list_dir', label: '目录列表', description: '列出目录内容' },
  { name: 'glob_file_search', label: '文件搜索', description: '使用通配符搜索文件' },
  { name: 'grep', label: '文本搜索', description: '在文件中搜索文本' },
  { name: 'notebook_read', label: '笔记本读取', description: '读取Jupyter笔记本' },
  { name: 'notebook_edit', label: '笔记本编辑', description: '编辑Jupyter笔记本' },
  { name: 'web_fetch', label: '网页获取', description: '获取网页内容' },
  { name: 'web_search', label: '网络搜索', description: '搜索网络信息' },
  { name: 'todo_write', label: '任务管理', description: '创建和管理待办事项' },
  { name: 'task', label: '任务执行', description: '执行复杂任务' }
] as const;

interface AgentConfigPageProps {
  onClose: () => void;
  editingAgent?: AgentConfig | null;
}

export const AgentConfigPage: React.FC<AgentConfigPageProps> = ({ onClose, editingAgent: propEditingAgent }) => {
  const { data: agentsData, isLoading } = useAgents(); // Get all agents including disabled
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const queryClient = useQueryClient();
  
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(propEditingAgent || null);
  const [editForm, setEditForm] = useState<Partial<AgentConfig>>(propEditingAgent || {});
  
  const agents = agentsData?.agents || [];

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setEditForm(agent);
  };

  const handleSave = async () => {
    if (!editingAgent || !editForm) return;
    
    try {
      await updateAgent.mutateAsync({
        agentId: editingAgent.id,
        data: editForm
      });
      
      setEditingAgent(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error) {
      console.error('Failed to update agent:', error);
      alert('保存失败，请重试。');
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
            <h1 className="text-xl font-semibold text-gray-900">智能助手管理</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {editingAgent ? (
            /* Edit Form */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">编辑助手：{editingAgent.name}</h2>
                <div className="flex space-x-2">
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
                    }}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <X className="w-4 h-4" />
                    <span>取消</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">基本信息</h3>
                  
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
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

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
                    <label className="block text-sm font-medium text-gray-700 mb-1">启用状态</label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.enabled || false}
                        onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">启用此助手</span>
                    </label>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">高级设置</h3>
                  
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

              {/* Allowed Tools */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">启用的工具</label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AVAILABLE_TOOLS.map((tool) => {
                      const isEnabled = editForm.allowedTools?.some((t: AgentTool) => t.name === tool.name) || false;
                      return (
                        <label key={tool.name} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              const allowedTools = editForm.allowedTools || [];
                              if (e.target.checked) {
                                // Add tool
                                const newTool: AgentTool = {
                                  name: tool.name,
                                  enabled: true
                                };
                                setEditForm({
                                  ...editForm,
                                  allowedTools: [...allowedTools, newTool]
                                });
                              } else {
                                // Remove tool
                                setEditForm({
                                  ...editForm,
                                  allowedTools: allowedTools.filter((t: AgentTool) => t.name !== tool.name)
                                });
                              }
                            }}
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{tool.label}</div>
                            <div className="text-xs text-gray-500">{tool.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
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
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={true}
                  title="创建自定义助手功能即将推出"
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
    </div>
  );
};