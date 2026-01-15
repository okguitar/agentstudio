import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Folder, 
  ChevronDown, 
  Code, 
  FileText, 
  FolderSync,
  FileSearch,
  CloudSun,
  Sparkles,
  Plus,
  Loader2,
  FolderOpen,
  Settings,
  CalendarClock,
  Bot,
  X,
  Trash2,
  AlertCircle,
  ArrowUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjects, Project } from '../hooks/useProjects';
import { useAgents, useCreateProject } from '../hooks/useAgents';
import { useSessions, closeSession, clearAllSessions } from '../hooks/useSessions';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '../utils/toast';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
  const { data: agentsData } = useAgents(true);
  const { data: sessionsData, refetch: refetchSessions } = useSessions();
  const createProjectMutation = useCreateProject();
  
  const [inputMessage, setInputMessage] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);

  const projects = projectsData?.projects || [];
  const agents = agentsData?.agents || [];
  const sessions = sessionsData?.sessions || [];

  // 自动选择第一个项目
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  // 获取项目对应的 Agent
  const getProjectAgent = (project: Project | null) => {
    if (!project) return agents[0];
    // 优先使用项目配置的默认 Agent
    if (project.defaultAgent) {
      const projectAgent = agents.find(a => a.id === project.defaultAgent);
      if (projectAgent) return projectAgent;
    }
    // 回退到第一个可用的 Agent
    return agents[0];
  };

  // 一键创建默认项目
  const handleCreateDefaultProject = async () => {
    const defaultAgent = agents.find(a => a.id === 'claude-code') || agents[0];
    if (!defaultAgent) return;

    setIsCreatingProject(true);
    try {
      const projectName = 'default-workspace';
      
      const result = await createProjectMutation.mutateAsync({
        agentId: defaultAgent.id,
        projectName
      });
      
      // 刷新项目列表
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // 选中新创建的项目
      setSelectedProject(result.project);
      
      // 显示成功提示
      showSuccess(
        t('dashboard.projectCreated.title', { defaultValue: '项目创建成功' }),
        t('dashboard.projectCreated.message', { 
          defaultValue: '已经为您创建项目：{{name}}，你现在可以开始与 Agent 工作了。',
          name: projectName 
        })
      );
    } catch (error) {
      console.error('Failed to create default project:', error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  // 处理提交 - 在新标签页打开聊天页面
  const handleSubmit = () => {
    const targetAgent = getProjectAgent(selectedProject);
    if (!inputMessage.trim() || !selectedProject || !targetAgent) return;
    
    // 在新标签页打开聊天页面，带上消息参数
    const encodedMessage = encodeURIComponent(inputMessage);
    const url = `/chat/${targetAgent.id}?project=${encodeURIComponent(selectedProject.path)}&message=${encodedMessage}`;
    window.open(url, '_blank');
  };

  // 关闭单个会话
  const handleCloseSession = async (sessionId: string) => {
    setClosingSessionId(sessionId);
    try {
      await closeSession(sessionId);
      await refetchSessions();
      showSuccess(
        t('dashboard.sessions.closed', { defaultValue: '会话已关闭' }),
        t('dashboard.sessions.closedMessage', { defaultValue: '会话已成功关闭' })
      );
    } catch (error) {
      console.error('Failed to close session:', error);
      showError(
        t('dashboard.sessions.closeFailed', { defaultValue: '关闭失败' }),
        error instanceof Error ? error.message : t('dashboard.sessions.closeError', { defaultValue: '无法关闭会话' })
      );
    } finally {
      setClosingSessionId(null);
    }
  };

  // 清除所有会话
  const handleClearAllSessions = async () => {
    if (sessions.length === 0) return;
    
    setIsClearingAll(true);
    try {
      const result = await clearAllSessions();
      await refetchSessions();
      showSuccess(
        t('dashboard.sessions.allCleared', { defaultValue: '全部清除' }),
        t('dashboard.sessions.allClearedMessage', { 
          defaultValue: '已清除 {{count}} 个会话',
          count: result.clearedCount 
        })
      );
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
      showError(
        t('dashboard.sessions.clearFailed', { defaultValue: '清除失败' }),
        error instanceof Error ? error.message : t('dashboard.sessions.clearError', { defaultValue: '无法清除会话' })
      );
    } finally {
      setIsClearingAll(false);
    }
  };

  // 快捷模板 - 实用的 AI 任务快捷方式
  const quickTemplates = [
    { 
      icon: FolderSync, 
      label: t('dashboard.templates.organizeFiles', { defaultValue: '整理文件' }), 
      prompt: '帮我整理一下当前目录下的文件。请先分析目录结构，然后提出整理方案让我确认，最后再执行。' 
    },
    { 
      icon: FileSearch, 
      label: t('dashboard.templates.analyzeFiles', { defaultValue: '文件分析' }), 
      prompt: '帮我分析一下当前项目的文件结构和代码情况，给出概要报告。' 
    },
    { 
      icon: FileText, 
      label: t('dashboard.templates.writeDoc', { defaultValue: '写一份文档' }), 
      prompt: '帮我为这个项目写一份 README 文档，包含项目介绍、安装步骤和使用说明。' 
    },
    { 
      icon: Code, 
      label: t('dashboard.templates.codeReview', { defaultValue: '代码审查' }), 
      prompt: '帮我审查一下这个项目的代码质量，包括代码风格、潜在问题和改进建议。' 
    },
    { 
      icon: CloudSun, 
      label: t('dashboard.templates.checkWeather', { defaultValue: '查深圳天气' }), 
      prompt: '查一下深圳现在的天气情况。' 
    },
    { 
      icon: Sparkles, 
      label: t('dashboard.templates.quickTask', { defaultValue: '自由提问' }), 
      prompt: '' 
    },
  ];

  // 快捷入口
  const quickLinks = [
    { 
      icon: FolderOpen, 
      label: t('dashboard.quickLinks.projects', { defaultValue: '项目管理' }), 
      path: '/projects',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30'
    },
    { 
      icon: Settings, 
      label: t('dashboard.quickLinks.modelSettings', { defaultValue: '模型供应商' }), 
      path: '/settings/suppliers',
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30'
    },
    { 
      icon: CalendarClock, 
      label: t('dashboard.quickLinks.scheduledTasks', { defaultValue: '定时任务' }), 
      path: '/scheduled-tasks',
      color: 'text-green-500 bg-green-50 dark:bg-green-900/30'
    },
    { 
      icon: Bot, 
      label: t('dashboard.quickLinks.customAgents', { defaultValue: '自定义 Agent' }), 
      path: '/agents',
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30'
    },
  ];

  const handleTemplateClick = (prompt: string) => {
    if (prompt) {
      // 如果有prompt内容且已选择项目，在新标签页打开对话界面
      const targetAgent = getProjectAgent(selectedProject);
      if (selectedProject && targetAgent) {
        const encodedMessage = encodeURIComponent(prompt);
        const url = `/chat/${targetAgent.id}?project=${encodeURIComponent(selectedProject.path)}&message=${encodedMessage}`;
        window.open(url, '_blank');
      } else {
        // 没有项目时，填充到输入框
        setInputMessage(prompt);
      }
    }
  };

  // 判断是否没有项目
  const hasNoProjects = !isLoadingProjects && projects.length === 0;

  // 格式化空闲时间
  const formatIdleTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-auto">
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.welcome.title', { defaultValue: '让我们开始工作吧' })}
          </h1>
        </div>

        {/* 输入框区域 */}
        <div className="w-full max-w-2xl">
          {/* 无项目提示 */}
          {hasNoProjects && (
            <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-center">
              <Folder className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">
                {t('dashboard.noProjectsHint.title', { defaultValue: '还没有项目' })}
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-300 mb-4">
                {t('dashboard.noProjectsHint.description', { defaultValue: '创建一个项目来开始与 AI 协作' })}
              </p>
              <button
                onClick={handleCreateDefaultProject}
                disabled={isCreatingProject || agents.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl font-medium transition-colors"
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('dashboard.noProjectsHint.creating', { defaultValue: '创建中...' })}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{t('dashboard.noProjectsHint.createButton', { defaultValue: '一键创建默认项目' })}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 快捷模板 - 放在输入框上方，参考截图风格 */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleTemplateClick(template.prompt)}
                className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md text-left transition-all group"
              >
                <div className="flex-shrink-0 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <template.icon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {template.label}
                </span>
              </button>
            ))}
          </div>

          {/* 输入框 */}
          <div className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={t('dashboard.inputPlaceholder', { defaultValue: '描述你想要完成的任务...' })}
                className="w-full px-5 py-4 text-base bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
              />
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                {/* 项目选择器 - 移到左下角 */}
                <div className="relative">
                  <button
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                  >
                    <Folder className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 max-w-[150px] truncate">
                      {selectedProject?.name || t('dashboard.selectProject', { defaultValue: '选择项目' })}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {showProjectDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowProjectDropdown(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 max-h-64 overflow-y-auto">
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setSelectedProject(project);
                              setShowProjectDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl ${
                              selectedProject?.id === project.id 
                                ? 'bg-blue-50 dark:bg-blue-900/20' 
                                : ''
                            }`}
                          >
                            <Folder className={`w-4 h-4 flex-shrink-0 ${
                              selectedProject?.id === project.id 
                                ? 'text-blue-500' 
                                : 'text-gray-400'
                            }`} />
                            <span className={`text-sm truncate ${
                              selectedProject?.id === project.id 
                                ? 'text-blue-600 dark:text-blue-400 font-medium' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>{project.name}</span>
                          </button>
                        ))}
                        {projects.length === 0 && (
                          <div className="px-4 py-6 text-center text-gray-500 text-sm">
                            {t('dashboard.noProjects', { defaultValue: '暂无项目' })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!inputMessage.trim() || !selectedProject || !getProjectAgent(selectedProject)}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl font-medium transition-colors disabled:cursor-not-allowed"
                >
                  <span>{t('dashboard.startChat', { defaultValue: '开始对话' })}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* 提示文字 - 箭头指向项目选择器 */}
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-400 dark:text-gray-500">
              <ArrowUp className="w-4 h-4 animate-bounce" />
              <span>{t('dashboard.welcome.subtitle', { defaultValue: '选择一个项目，开始与 AI 协作完成任务' })}</span>
            </div>
          </div>

          {/* 快捷入口卡片 */}
          <div className="mt-10">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 text-center">
              {t('dashboard.quickLinks.title', { defaultValue: '快捷入口' })}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickLinks.map((link, index) => (
                <button
                  key={index}
                  onClick={() => navigate(link.path)}
                  className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all group"
                >
                  <div className={`p-2.5 rounded-lg ${link.color}`}>
                    <link.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {link.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 活跃会话 */}
          {sessions.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('dashboard.sessions.title', { defaultValue: '活跃会话' })} ({sessions.length})
                </h3>
                <button
                  onClick={handleClearAllSessions}
                  disabled={isClearingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isClearingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{t('dashboard.sessions.clearAll', { defaultValue: '清除全部' })}</span>
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {sessions.map((session) => {
                  // 从 projectPath 提取项目名
                  const projectName = session.projectPath 
                    ? session.projectPath.split('/').pop() || session.projectPath 
                    : '-';
                  
                  // 会话标题：优先使用 sessionTitle，否则用 sessionId 的前8位
                  const sessionTitle = session.sessionTitle || `${t('dashboard.sessions.session', { defaultValue: '会话' })} ${session.sessionId.slice(0, 8)}`;
                  
                  return (
                    <div 
                      key={session.sessionId}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          session.status === 'confirmed' 
                            ? 'bg-green-500' 
                            : 'bg-amber-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                            {sessionTitle}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span className="truncate max-w-[120px]" title={projectName}>
                              {projectName}
                            </span>
                            <span>•</span>
                            <span>{session.agentId}</span>
                            {session.modelId && (
                              <>
                                <span>•</span>
                                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                  {session.modelId.replace('claude-', '').replace(/-\d{8}$/, '')}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span>{formatIdleTime(session.idleTimeMs)}</span>
                            {session.heartbeatTimedOut && (
                              <span className="text-amber-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCloseSession(session.sessionId)}
                        disabled={closingSessionId === session.sessionId}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title={t('dashboard.sessions.close', { defaultValue: '关闭会话' })}
                      >
                        {closingSessionId === session.sessionId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
