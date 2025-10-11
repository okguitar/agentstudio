import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  Folder,
  Calendar,
  User,
  Brain,
  Command,
  Bot,
  Trash2
} from 'lucide-react';
import { formatRelativeTime } from '../utils';

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
  defaultAgentColor: string;
  createdAt: string;
  lastAccessed: string;
  description?: string;
}

interface ProjectTableProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onMemoryManagement: (project: Project) => void;
  onCommandManagement: (project: Project) => void;
  onSubAgentManagement: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  className?: string;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onOpenProject,
  onMemoryManagement,
  onCommandManagement,
  onSubAgentManagement,
  onDeleteProject,
  className = '',
}) => {
  const { t } = useTranslation('pages');

  // 渲染项目名称和图标
  const renderProjectName = (project: Project, isCard: boolean = false) => (
    <div className={`${isCard ? 'flex items-start space-x-3' : 'flex items-center'}`}>
      <div className={`flex-shrink-0 ${isCard ? 'text-2xl' : 'text-xl'}`}>{project.defaultAgentIcon || '❓'}</div>
      <div className={`min-w-0 flex-1 ${isCard ? '' : ''}`}>
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
    </div>
  );

  // 渲染助手信息
  const renderAssistant = (project: Project) => (
    project.defaultAgentName ? (
      <span
        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
        style={{
          backgroundColor: project.defaultAgentColor + '20',
          color: project.defaultAgentColor
        }}
      >
        {project.defaultAgentName}
      </span>
    ) : (
      <span className="text-xs text-gray-400 italic">{t('projects.status.never')}</span>
    )
  );

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
              {renderProjectName(project, true)}
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
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('projects.table.project')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('projects.table.agent')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common:path')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common:createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('projects.table.lastActive')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('projects.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map((project, index) => (
              <tr
                key={project.id + '-' + index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderProjectName(project)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderAssistant(project)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {renderPath(project)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {renderTime(project.createdAt, <Calendar className="w-4 h-4" />)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {renderTime(project.lastAccessed, <User className="w-4 h-4" />)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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