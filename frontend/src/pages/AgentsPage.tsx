import React, { useState } from 'react';
import { Plus, Eye, EyeOff, Search, Edit, Trash2, Save, X, Play, Settings, Wrench } from 'lucide-react';
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
import { UnifiedToolSelector } from '../components/UnifiedToolSelector';
import type { AgentConfig, AgentTool } from '../types/index.js';
import { useTranslation } from 'react-i18next';
import { showError } from '../utils/toast';
import { useMobileContext } from '../contexts/MobileContext';
import { SystemPromptEditor } from '../components/SystemPromptEditor';
import { ToolsList } from '../components/ToolsList';


export const AgentsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const { data: agentsData, isLoading } = useAgents();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const createAgent = useCreateAgent();
  const queryClient = useQueryClient();
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgentConfig>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedAgentForStart, setSelectedAgentForStart] = useState<AgentConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedRegularTools, setSelectedRegularTools] = useState<string[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const agents = agentsData?.agents || [];

  // 🎯 显示所有已启用的 Agent，用户可以管理所有 Agent
  const userAgents = agents;

  const filteredAgents = userAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
      showError(t('agents.errors.toggleFailed'));
    }
  };

  const handleEdit = (agent: AgentConfig) => {
    setEditingAgent(agent);
    setEditForm(agent);
    setIsCreating(false);
    
    // 初始化工具选择{t('agents.table.status')} - 正确分离常规工具和MCP工具
    const allEnabledTools = agent.allowedTools?.filter((tool: AgentTool) => tool.enabled).map((tool: AgentTool) => tool.name) || [];
    const regularTools = allEnabledTools.filter((tool: string) => !tool.startsWith('mcp__'));
    const mcpTools = allEnabledTools.filter((tool: string) => tool.startsWith('mcp__'));
    
    setSelectedRegularTools(regularTools);
    setSelectedMcpTools(mcpTools);
    setMcpToolsEnabled(mcpTools.length > 0);
  };

  const handleCreate = () => {
    // 🎯 降级方案：基于 general-chat 模板创建新 Agent
    const generalChatTemplate = agents.find(a => a.id === 'general-chat');

    const defaultAgent: Partial<AgentConfig> = {
      id: `agent-${Date.now()}`, // 提供默认 ID，用户可以修改
      name: '',
      description: '',
      version: '1.0.0',
      // 使用 general-chat 的系统提示词作为默认值
      systemPrompt: generalChatTemplate?.systemPrompt || `You are a general-purpose AI assistant. You can help with:
- General questions and conversations
- Problem-solving and brainstorming
- Information and explanations
- Creative tasks and writing
- Analysis and research
- File operations when needed

You are helpful, harmless, and honest. Always strive to provide accurate and useful information.
Please respond in Chinese unless the user specifically requests another language.`,
      maxTurns: generalChatTemplate?.maxTurns || undefined,
      permissionMode: generalChatTemplate?.permissionMode || 'bypassPermissions',
      // 使用 general-chat 的工具配置
      allowedTools: generalChatTemplate?.allowedTools || [
        { name: 'Write', enabled: true },
        { name: 'Read', enabled: true },
        { name: 'Edit', enabled: true },
        { name: 'Glob', enabled: true },
        { name: 'MultiEdit', enabled: true },
        { name: 'Bash', enabled: true },
        { name: 'Task', enabled: true },
        { name: 'WebFetch', enabled: true },
        { name: 'WebSearch', enabled: true }
      ],
      ui: {
        icon: '🤖',
        headerTitle: '',
        headerDescription: ''
      },
      author: 'User',
      tags: ['custom'],
      enabled: true
    };
    
    setEditingAgent(null);
    setEditForm(defaultAgent);
    setIsCreating(true);
    
    // 初始化工具选择{t('agents.table.status')}
    const regularTools = defaultAgent.allowedTools?.filter((tool: AgentTool) => tool.enabled).map((tool: AgentTool) => tool.name) || [];
    setSelectedRegularTools(regularTools);
    setSelectedMcpTools([]);
    setMcpToolsEnabled(false);
  };

  // 更新工具选择
  const updateToolsFromSelector = () => {
    const allSelectedTools = [...selectedRegularTools];
    if (mcpToolsEnabled) {
      allSelectedTools.push(...selectedMcpTools);
    }
    
    const agentTools: AgentTool[] = allSelectedTools.map(toolName => ({
      name: toolName,
      enabled: true
    }));
    
    return agentTools;
  };

  const handleSave = async () => {
    if (!editForm || !editForm.name?.trim()) {
      setSaveError(t('agents.form.nameRequired'));
      return;
    }

    // 验证最大轮次
    if (editForm.maxTurns !== undefined && (editForm.maxTurns < 1 || editForm.maxTurns > 100)) {
      setSaveError(t('agents.form.maxTurnsError'));
      return;
    }
    
    setSaveError(null);
    
    try {
      // 更新工具选择到表单
      const allowedTools = updateToolsFromSelector();
      
      if (isCreating) {
        // 验证 ID 字段
        if (!editForm.id || editForm.id.trim() === '') {
          setSaveError('请输入 Agent ID');
          return;
        }
        
        // 简单的 ID 验证：只允许字母、数字、连字符和下划线
        const idRegex = /^[a-zA-Z0-9_-]+$/;
        if (!idRegex.test(editForm.id)) {
          setSaveError('ID 只能包含字母、数字、连字符和下划线');
          return;
        }
        
        const dataToSave = {
          ...editForm,
          allowedTools,
          maxTurns: editForm.maxTurns,
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
        
        const dataToSave: any = {
          ...editForm,
          allowedTools,
          // 使用 null 明确表示"不限制"，而不是 undefined（后端会将其转换为 undefined）
          maxTurns: editForm.maxTurns !== undefined ? editForm.maxTurns : null,
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
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error: any) {
      console.error('Failed to save agent:', error);
      
      // 解析后端错误信息
      let errorMessage = isCreating ? t('agents.errors.createFailed') : t('agents.errors.saveFailed');
      if (error?.response?.data?.details?.issues?.length > 0) {
        const issue = error.response.data.details.issues[0];
        if (issue.path.includes('maxTurns') && issue.code === 'too_big') {
          errorMessage = t('agents.form.maxTurnsExceeded', { maximum: issue.maximum });
        } else {
          errorMessage = issue.message || errorMessage;
        }
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setSaveError(errorMessage);
    }
  };

  const handleDelete = async (agent: AgentConfig) => {
    console.log(`🗑️ [FRONTEND DEBUG] Attempting to delete agent:`, {
      id: agent.id,
      name: agent.name,
      author: agent.author
    });

    // System agents (author: 'System') cannot be deleted
    if (agent.author === 'System') {
      console.log(`🛑 [FRONTEND DEBUG] Blocked deletion of system agent: ${agent.id}`);
      showError('System agents cannot be deleted');
      return;
    }

    const confirmed = window.confirm(t('agents.confirmDelete', { name: agent.name }));
    if (!confirmed) {
      console.log('❌ [FRONTEND DEBUG] User cancelled deletion');
      return;
    }

    console.log('✅ [FRONTEND DEBUG] User confirmed deletion, calling API...');
    try {
      await deleteAgent.mutateAsync(agent.id);
      console.log('✅ [FRONTEND DEBUG] Delete API call successful');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      console.log('🔄 [FRONTEND DEBUG] Invalidated agents query');
    } catch (error) {
      console.error('❌ [FRONTEND DEBUG] Failed to delete agent:', error);
      showError(t('agents.errors.deleteFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">{t('agents.loading')}</div>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('agents.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('agents.subtitle')}</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('agents.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>{t('agents.createButton')}</span>
          </button>
        </div>
      </div>

      {/* Agents Table */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? t('agents.noAgentsSearch') : t('agents.noAgents')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery ? t('agents.adjustSearch') : t('agents.createFirst')}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('agents.createButton')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          {isMobile && (
            <div className="space-y-4">
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  {/* Agent Header */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className={`text-2xl ${!agent.enabled ? 'opacity-50' : ''}`}>
                      {agent.ui.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-medium ${agent.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'} truncate`}>
                        {agent.name}
                      </h3>
                      <p className={`text-sm ${agent.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'} truncate mt-1`}>
                        {agent.description}
                      </p>
                    </div>
                  </div>

                  {/* Agent Details */}
                  <div className="space-y-2 text-sm mb-4">
                    {/* Tools */}
                    <div className="mb-3">
                      <div className="flex items-start text-sm">
                        <span className="text-gray-500 dark:text-gray-400 mr-2 mt-1">工具:</span>
                        <div className="flex-1">
                          <ToolsList
                            tools={(agent.allowedTools?.filter((tool: AgentTool) => tool.enabled).map((tool: AgentTool) => tool.name) || [])}
                            id={agent.id}
                            expandedTools={expandedTools}
                            setExpandedTools={setExpandedTools}
                            isMobile={true}
                            emptyMessage="未启用工具"
                          />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                    {agent.enabled && (
                      <button
                        onClick={() => {
                          setSelectedAgentForStart(agent);
                          setShowProjectSelector(true);
                        }}
                        className="flex items-center space-x-1 px-3 py-1 text-xs text-primary-foreground bg-primary rounded-md"
                      >
                        <Play className="w-3 h-3" />
                        <span>使用</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(agent)}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded"
                      title="编辑助手"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded"
                      title="删除助手"
                      disabled={agent.author === 'System'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Desktop Table View */}
          {!isMobile && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      {t('agents.table.agent')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      {t('agents.table.config')}
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-96">
                      工具
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      {t('agents.table.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgents.map((agent) => (
                    <TableRow key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {/* Agent */}
                      <TableCell className="px-6 py-4 whitespace-nowrap w-48">
                        <div className="flex items-center">
                          <div className={`text-2xl mr-4 ${!agent.enabled ? 'opacity-50' : ''}`}>
                            {agent.ui.icon}
                          </div>
                          <div className="min-w-0">
                            <div className={`text-sm font-medium ${
                              agent.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                            } truncate`}>
                              {agent.name}
                            </div>
                            <div className={`text-sm ${
                              agent.enabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'
                            } truncate`}>
                              {agent.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Configuration */}
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white w-48">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Settings className="w-3 h-3 mr-1 text-gray-400" />
                            <span>最大轮次: {agent.maxTurns !== undefined ? agent.maxTurns : '不限制'}</span>
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
                      <TableCell className="px-6 py-4 w-96">
                        <ToolsList
                          tools={(agent.allowedTools?.filter((tool: AgentTool) => tool.enabled).map((tool: AgentTool) => tool.name) || [])}
                          id={agent.id}
                          expandedTools={expandedTools}
                          setExpandedTools={setExpandedTools}
                          isMobile={false}
                          emptyMessage="未启用工具"
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium w-48">
                        <div className="flex items-center space-x-2">
                          {/* Start Using Button - Only show for enabled agents */}
                          {agent.enabled && (
                            <button
                              onClick={() => {
                                setSelectedAgentForStart(agent);
                                setShowProjectSelector(true);
                              }}
                              className="flex items-center space-x-1 px-3 py-1 text-xs text-primary-foreground bg-primary rounded-md transition-colors hover:opacity-90"
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
                                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title={agent.enabled ? '禁用助手' : '启用助手'}
                          >
                            {agent.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEdit(agent)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded transition-colors"
                            title="编辑助手"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(agent)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded transition-colors"
                            title="删除助手"
                            disabled={agent.author === 'System'}
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
        </>
      )}

      {/* Agent Edit/Create Modal */}
      {(editingAgent || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
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
                    setSaveError(null);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4" />
                  <span>取消</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/50 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID</label>
                      <input
                        type="text"
                        value={editForm.id || ''}
                        onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                        disabled={!isCreating}
                        placeholder={isCreating ? "例如: my-custom-agent" : "ID 在编辑模式下不可修改"}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                          !isCreating 
                            ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {isCreating && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          ID 用于唯一标识这个助手，只能包含字母、数字和连字符
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">最大轮次</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editForm.maxTurns !== undefined ? editForm.maxTurns : ''}
                        placeholder="不限制"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setEditForm({ ...editForm, maxTurns: undefined });
                          } else {
                            const parsed = parseInt(value);
                            if (!isNaN(parsed)) {
                              setEditForm({ ...editForm, maxTurns: parsed });
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 dark:bg-gray-700 dark:text-white ${
                          editForm.maxTurns !== undefined && (editForm.maxTurns < 1 || editForm.maxTurns > 100)
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                        }`}
                      />
                      {editForm.maxTurns !== undefined && (editForm.maxTurns < 1 || editForm.maxTurns > 100) && (
                        <p className="text-red-500 dark:text-red-400 text-sm mt-1">最大轮次必须在1-100之间</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">权限模式</label>
                      <select
                        value={editForm.permissionMode || 'default'}
                        onChange={(e) => setEditForm({ ...editForm, permissionMode: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
                        <input
                          type="text"
                          value={editForm.ui?.icon || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            ui: { ...editForm.ui, icon: e.target.value } as any
                          })}
                          placeholder="🤖"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 工具选择 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">启用的工具</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowToolSelector(!showToolSelector)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                    >
                      选择工具
                    </button>

                    {/* 显示工具数量详情 */}
                    {(selectedRegularTools.length > 0 || selectedMcpTools.length > 0) && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        常规工具 {selectedRegularTools.length} 个
                        {selectedMcpTools.length > 0 && `, MCP工具 ${selectedMcpTools.length} 个`}
                      </span>
                    )}

                    {/* 工具选择器弹窗 */}
                    <UnifiedToolSelector
                      isOpen={showToolSelector}
                      onClose={() => setShowToolSelector(false)}
                      selectedRegularTools={selectedRegularTools}
                      onRegularToolsChange={setSelectedRegularTools}
                      selectedMcpTools={selectedMcpTools}
                      onMcpToolsChange={setSelectedMcpTools}
                      mcpToolsEnabled={mcpToolsEnabled}
                      onMcpEnabledChange={setMcpToolsEnabled}
                    />
                  </div>
                </div>

                {/* System Prompt */}
                <div>
                  <SystemPromptEditor
                    value={editForm.systemPrompt || ''}
                    onChange={(systemPrompt) => setEditForm({ ...editForm, systemPrompt })}
                    disabled={editingAgent?.id === 'claude-code'}
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