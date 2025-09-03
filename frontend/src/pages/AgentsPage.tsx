import React, { useState } from 'react';
import { Plus, Eye, EyeOff, Search, Edit, Trash2, Save, X, Play, Settings, Wrench, Tag } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAgents, useUpdateAgent, useDeleteAgent, useCreateAgent } from '../hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectSelector } from '../components/ProjectSelector';
import { ToolSelector } from '../components/ui/ToolSelector';
import { formatRelativeTime } from '../utils';
import type { AgentConfig, AgentTool } from '../types/index.js';


export const AgentsPage: React.FC = () => {
  const { data: agentsData, isLoading } = useAgents();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const createAgent = useCreateAgent();
  const queryClient = useQueryClient();
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgentConfig>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedAgentForStart, setSelectedAgentForStart] = useState<AgentConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const agents = agentsData?.agents || [];
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'enabled' && agent.enabled) ||
                         (filter === 'disabled' && !agent.enabled);
    return matchesSearch && matchesFilter;
  });

  const handleProjectSelect = (projectPath: string) => {
    if (selectedAgentForStart) {
      const params = new URLSearchParams();
      params.set('project', projectPath);
      const url = `/chat/${selectedAgentForStart.id}?${params.toString()}`;
      window.open(url, '_blank');
    }
    setShowProjectSelector(false);
    setSelectedAgentForStart(null);
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

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setEditForm(agent);
    setIsCreating(false);
  };

  const handleCreate = () => {
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
        const dataToSave = {
          ...editForm,
          id: `custom-${Date.now()}`,
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
        if (!editingAgent) return;
        
        const dataToSave = {
          ...editForm,
          enabled: editingAgent.enabled
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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载智能助手...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Agent管理</h1>
            <p className="text-gray-600 mt-2">管理专门的 AI 代理</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索助手..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Filter Tabs */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { key: 'all', label: '全部', count: agents.length },
                  { key: 'enabled', label: '已启用', count: agents.filter(a => a.enabled).length },
                  { key: 'disabled', label: '已禁用', count: agents.filter(a => !a.enabled).length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filter === tab.key
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>创建助手</span>
          </button>
        </div>
      </div>

      {/* Agents Table */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchQuery ? '未找到匹配的助手' : '暂无助手'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery ? '尝试调整搜索条件' : '创建你的第一个智能助手'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建助手
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  智能助手
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  配置
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工具
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-gray-50 transition-colors">
                  {/* Agent */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`text-2xl mr-4 ${!agent.enabled ? 'opacity-50' : ''}`}>
                        {agent.ui.icon}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${
                          agent.enabled ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {agent.name}
                        </div>
                        <div className={`text-sm ${
                          agent.enabled ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {agent.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.ui.componentType === 'slides' ? 'bg-blue-100 text-blue-800' :
                      agent.ui.componentType === 'code' ? 'bg-green-100 text-green-800' :
                      agent.ui.componentType === 'documents' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.ui.componentType}
                    </span>
                  </TableCell>

                  {/* Configuration */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Settings className="w-3 h-3 mr-1 text-gray-400" />
                        <span>最大轮次: {agent.maxTurns || 25}</span>
                      </div>
                      <div className="flex items-center">
                        <Wrench className="w-3 h-3 mr-1 text-gray-400" />
                        <span>权限: {
                          agent.permissionMode === 'default' ? '默认' :
                          agent.permissionMode === 'acceptEdits' ? '自动接受编辑' :
                          agent.permissionMode === 'bypassPermissions' ? '绕过权限' :
                          agent.permissionMode === 'plan' ? '规划模式' : '默认'
                        }</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tools */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Tag className="w-3 h-3 mr-1 text-gray-400" />
                      <span>{agent.allowedTools?.length || 0} 个工具</span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.enabled ? '已启用' : '已禁用'}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {/* Start Using Button - Only show for enabled agents */}
                      {agent.enabled && (
                        <button
                          onClick={() => {
                            setSelectedAgentForStart(agent);
                            setShowProjectSelector(true);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 text-xs text-white rounded-md transition-colors hover:opacity-90"
                          style={{ backgroundColor: agent.ui.primaryColor }}
                          title="开始使用助手"
                        >
                          <Play className="w-3 h-3" />
                          <span>使用</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleToggleEnabled(agent)}
                        className={`p-1 rounded transition-colors ${
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
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑助手"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除助手"
                        disabled={agent.id === 'ppt-editor' || agent.id === 'code-assistant' || agent.id === 'document-writer'}
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
      )}

      {/* Agent Edit/Create Modal */}
      {(editingAgent || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-900">
                {isCreating ? '创建助手' : `编辑助手：${editingAgent?.name}`}
              </h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  disabled={updateAgent.isPending || createAgent.isPending}
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
                  }}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                  <span>取消</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
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
                    </div>

                    {/* Icon and Color */}
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
                <ToolSelector
                  selectedTools={editForm.allowedTools || []}
                  onChange={(tools) => setEditForm({ ...editForm, allowedTools: tools as AgentTool[] })}
                  useAgentTool={true}
                />

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
            </div>
          </div>
        </div>
      )}


      {/* Project Selection Modal */}
      {showProjectSelector && selectedAgentForStart && (
        <ProjectSelector
          agent={selectedAgentForStart}
          onProjectSelect={handleProjectSelect}
          onClose={() => {
            setShowProjectSelector(false);
            setSelectedAgentForStart(null);
          }}
        />
      )}
    </div>
  );
};