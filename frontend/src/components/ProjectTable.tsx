import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  Folder,
  Calendar,
  User,
  Brain,
  Command,
  Bot,
  Trash2,
  ChevronDown,
  Shield,
  Settings
} from 'lucide-react';
import { formatRelativeTime } from '../utils';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { showError, showSuccess } from '../utils/toast';

interface Project {
  id: string;
  name: string;
  dirName: string;
  path: string;
  realPath?: string;
  agents: string[];
  defaultAgent: string;
  defaultAgentName: string;
  defaultAgentIcon: string;
  createdAt: string;
  lastAccessed: string;
  description?: string;
  defaultProviderId?: string;
  defaultModel?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  ui: {
    icon: string;
  };
}

interface ProjectTableProps {
  projects: Project[];
  agents: Agent[];
  onOpenProject: (project: Project) => void;
  onMemoryManagement: (project: Project) => void;
  onCommandManagement: (project: Project) => void;
  onSubAgentManagement: (project: Project) => void;
  onA2AManagement: (project: Project) => void;
  onSettings: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onAgentChanged?: (projectId: string, newAgent: Agent) => void;
  className?: string;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  agents,
  onOpenProject,
  onMemoryManagement,
  onCommandManagement,
  onSubAgentManagement,
  onA2AManagement,
  onSettings,
  onDeleteProject,
  onAgentChanged,
  className = '',
}) => {
  const { t } = useTranslation('pages');
  const [changingAgent, setChangingAgent] = useState<string | null>(null);

  // 切换项目助手
  const handleAgentChange = async (project: Project, newAgentId: string) => {
    if (newAgentId === project.defaultAgent) return;

    try {
      setChangingAgent(project.id);
      
      // 调用API更新项目的默认助手
      const response = await authFetch(`${API_BASE}/projects/${encodeURIComponent(project.path)}/default-agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: newAgentId })
      });

      if (response.ok) {
        const newAgent = agents.find(a => a.id === newAgentId);
        if (newAgent && onAgentChanged) {
          onAgentChanged(project.id, newAgent);
        }
        showSuccess('助手切换成功');
      } else {
        const error = await response.json();
        throw new Error(error.error || '切换助手失败');
      }
    } catch (error) {
      console.error('Failed to change agent:', error);
      showError('切换助手失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setChangingAgent(null);
    }
  };

  // 渲染项目名称（不包含图标）
  const renderProjectName = (project: Project, isCard: boolean = false) => (
    <div className={`min-w-0 flex-1`}>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onOpenProject(project)}
          className={`text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer text-left truncate ${isCard ? 'text-base' : ''}`}
        >
          {project.name}
        </button>
        <button
          onClick={() => onOpenProject(project)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          title={t('projects.actions.open')}
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      {project.description && (
        <div className={`text-gray-500 dark:text-gray-400 truncate ${isCard ? 'text-sm mt-1' : 'text-sm max-w-xs'}`}>
          {project.description}
        </div>
      )}
    </div>
  );

  // 渲染助手选择器（包含图标和下拉选择）
  const renderAssistant = (project: Project) => {
    const enabledAgents = agents.filter(agent => agent.enabled);
    const isChanging = changingAgent === project.id;
    
    return (
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <select
          value={project.defaultAgent}
          onChange={(e) => handleAgentChange(project, e.target.value)}
          disabled={isChanging}
          className="appearance-none bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md px-3 py-1.5 pr-8 text-xs font-medium cursor-pointer border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="切换助手"
        >
          {enabledAgents.map((agent) => (
            <option key={agent.id} value={agent.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              {agent.ui.icon} {agent.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-300 pointer-events-none" />
      </div>
    );
  };

  // 渲染路径
  const renderPath = (project: Project) => (
    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
      <Folder className="w-4 h-4" />
      <span className="truncate" title={project.path}>
        {project.path}
      </span>
    </div>
  );

  // 渲染时间
  const renderTime = (time: string, icon: React.ReactNode) => (
    <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
      {icon}
      <span>{formatRelativeTime(time)}</span>
    </div>
  );

  // 渲染操作按钮
  const renderActions = (project: Project) => (
    <div className="flex items-center justify-end space-x-1">
      <button
        onClick={() => onMemoryManagement(project)}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title={t('components:projectMemory.title')}
      >
        <Brain className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onCommandManagement(project)}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title={t('components:projectCommands.title')}
      >
        <Command className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onSubAgentManagement(project)}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title={t('components:projectSubAgents.title')}
      >
        <Bot className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onA2AManagement(project)}
        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
        title="A2A Protocol 管理"
      >
        <Shield className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onSettings(project)}
        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-md transition-colors"
        title="项目设置"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDeleteProject(project)}
        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md transition-colors"
        title={t('projects.actions.delete')}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 移动端卡片视图 */}
      <div className="md:hidden space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            {/* 可点击的项目标题区域 */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => onOpenProject(project)}
            >
              <div className="flex items-start space-x-3">
                {renderProjectName(project, true)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm mb-3 px-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('projects.table.agent')}:
                </span>
                <div>{renderAssistant(project)}</div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('projects.table.lastActive')}:
                </span>
                <div className="text-right">
                  {renderTime(project.lastAccessed, <User className="w-4 h-4" />)}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">
                  {t('common:path')}:
                </span>
                <div className="text-right text-xs truncate ml-2 max-w-[200px]">
                  {project.path}
                </div>
              </div>
            </div>

            {/* 直接显示操作按钮 */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('projects.table.actions')}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onMemoryManagement(project)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title={t('components:projectMemory.title')}
                  >
                    <Brain className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCommandManagement(project)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title={t('components:projectCommands.title')}
                  >
                    <Command className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSubAgentManagement(project)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title={t('components:projectSubAgents.title')}
                  >
                    <Bot className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onA2AManagement(project)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                    title="A2A Protocol 管理"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSettings(project)}
                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-md transition-colors"
                    title="项目设置"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteProject(project)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md transition-colors"
                    title={t('projects.actions.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 桌面端表格视图 */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-white dark:bg-gray-800 z-10 w-64">
                {t('projects.table.project')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                {t('projects.table.agent')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('common:path')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                {t('common:createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                {t('projects.table.lastActive')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky right-0 bg-white dark:bg-gray-800 z-10 w-32">
                {t('projects.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project, index) => (
              <tr
                key={project.id + '-' + index}
                className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-10 w-64 max-w-[256px]">
                  <div className="truncate">
                    {renderProjectName(project)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-32">
                  {renderAssistant(project)}
                </td>
                <td className="px-6 py-4 max-w-xs truncate">
                  {renderPath(project)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 w-32">
                  {renderTime(project.createdAt, <Calendar className="w-4 h-4" />)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 w-32">
                  {renderTime(project.lastAccessed, <User className="w-4 h-4" />)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50 z-10 w-32">
                  {renderActions(project)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};