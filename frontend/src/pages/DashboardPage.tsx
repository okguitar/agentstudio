import React, { useState } from 'react';
import {
  Bot,
  FolderOpen,
  Command,
  MessageSquare,
  Zap,
  ArrowRight,
  Plus,
  Server,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../hooks/useAgents';
import { SessionsDashboard } from '../components/SessionsDashboard';
import { RecentActivity } from '../components/RecentActivity';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useClaudeVersions } from '../hooks/useClaudeVersions';
import { ClaudeVersionSetupWizard } from '../components/ClaudeVersionSetupWizard';
import { useBackendServices } from '../hooks/useBackendServices';
import { getClaudeSetupStatus } from '../utils/onboardingStorage';
import { useMobileContext } from '../contexts/MobileContext';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { isMobile } = useMobileContext();
  const { data: agentsData } = useAgents();
  const { stats, isLoading } = useDashboardStats();
  const { data: versionsData, isLoading: versionsLoading, refetch: refetchVersions } = useClaudeVersions();
  const { currentServiceId } = useBackendServices();
  const [showClaudeSetup, setShowClaudeSetup] = useState(false);

  const agents = agentsData?.agents || [];
  const enabledAgents = agents.filter(agent => agent.enabled);

  // Check if Claude setup is needed
  const needsClaudeSetup = !versionsLoading && versionsData && (!versionsData.versions || versionsData.versions.length === 0);

  React.useEffect(() => {
    // Only show Claude wizard if backend needs setup (no versions)
    if (needsClaudeSetup && currentServiceId) {
      const alreadyCompleted = getClaudeSetupStatus(currentServiceId);
      if (!alreadyCompleted) {
        setShowClaudeSetup(true);
      }
    }
  }, [needsClaudeSetup, currentServiceId]);

  const handleClaudeSetupComplete = () => {
    setShowClaudeSetup(false);
    refetchVersions();
  };

  const handleClaudeSetupSkip = () => {
    setShowClaudeSetup(false);
  };

  const statCards = [
    {
      name: t('dashboard.stats.agentManagement'),
      value: stats.agents.enabled,
      total: stats.agents.total,
      icon: Bot,
      color: 'bg-blue-500',
      href: '/agents'
    },
    {
      name: t('dashboard.stats.workProjects'),
      value: stats.projects.total,
      icon: FolderOpen,
      color: 'bg-green-500',
      href: '/projects'
    },
    {
      name: t('dashboard.stats.slashCommands'),
      value: stats.commands.total,
      icon: Command,
      color: 'bg-orange-500',
      href: '/settings/commands'
    },
    {
      name: t('dashboard.stats.activeSessions'),
      value: stats.sessions.active,
      total: stats.sessions.total,
      icon: MessageSquare,
      color: 'bg-purple-500',
      href: '#sessions'
    }
  ];

  const recentAgents = enabledAgents.slice(0, 3);

  return (
<<<<<<< HEAD
    <div className="p-8">
      {/* Claude 版本初始化引导 */}
      {showClaudeSetup && (
=======
    <div className={`${isMobile ? 'p-4' : 'p-8'}`}>
      {/* Claude 版本初始化引导（模态窗口） */}
      {showSetupWizard && (
>>>>>>> 724e879 (feat: complete mobile adaptation for agentstudio)
        <ClaudeVersionSetupWizard
          onComplete={handleClaudeSetupComplete}
          onSkip={handleClaudeSetupSkip}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white`}>{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className={`grid gap-4 mb-8 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className={`${isMobile ? 'p-4' : 'p-6'} bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow`}
          >
            <div className={`${isMobile ? 'flex flex-col items-center text-center' : 'flex items-center'}`}>
              <div className={`p-3 rounded-lg ${stat.color} ${isMobile ? 'mb-3' : ''}`}>
                <stat.icon className={`w-6 h-6 text-white ${isMobile ? 'w-8 h-8' : ''}`} />
              </div>
              <div className={`${isMobile ? 'flex-1' : 'ml-4 flex-1'}`}>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600 dark:text-gray-400 ${isMobile ? 'mb-1' : ''}`}>{stat.name}</p>
                <div className={`${isMobile ? '' : 'flex items-center space-x-2'}`}>
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
                    {isLoading ? '...' : stat.value}
                    {stat.total !== undefined && !isLoading && (
                      <span className={`${isMobile ? 'text-xs font-normal' : 'text-sm font-normal'} text-gray-500 dark:text-gray-400 ${isMobile ? 'block' : ''}`}>
                        /{stat.total}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid - Responsive layout */}
      <div className={`gap-8 ${isMobile ? 'space-y-8' : 'grid grid-cols-1 lg:grid-cols-2'}`}>
        {/* Left Column - Sessions & Recent Activity */}
        <div className={`${isMobile ? 'space-y-8' : 'space-y-8'}`}>
          {/* Sessions Dashboard */}
          <div id="sessions">
            <SessionsDashboard />
          </div>

          {/* Recent Activity */}
          <RecentActivity />
        </div>

        {/* Right Column - Agents & Quick Actions */}
        <div className={`${isMobile ? 'space-y-8' : 'space-y-8'}`}>
        {/* Recent Agents */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 dark:text-white`}>{t('dashboard.recentAgents.title')}</h2>
            <Link
              to="/agents"
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 text-sm font-medium"
            >
              <span>{t('dashboard.recentAgents.viewAll')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentAgents.map((agent) => (
              <div key={agent.id} className={`${isMobile ? 'flex items-center space-x-3 p-3' : 'flex items-center space-x-4 p-4'} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>{agent.ui.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900 dark:text-white truncate`}>{agent.name}</h3>
                  <p className={`text-sm text-gray-500 dark:text-gray-400 truncate ${isMobile ? 'hidden' : ''}`}>{agent.description}</p>
                </div>
                <div className={`${isMobile ? 'flex flex-col items-end space-y-1' : 'flex items-center space-x-2'}`}>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    agent.ui.componentType === 'slides' ? 'bg-blue-100 text-blue-700' :
                    agent.ui.componentType === 'code' ? 'bg-green-100 text-green-700' :
                    agent.ui.componentType === 'documents' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {agent.ui.componentType === 'slides' ? t('dashboard.recentAgents.types.slides') :
                     agent.ui.componentType === 'code' ? t('dashboard.recentAgents.types.code') :
                     agent.ui.componentType === 'documents' ? t('dashboard.recentAgents.types.documents') :
                     agent.ui.componentType}
                  </span>
                  <Link
                    to={`/chat/${agent.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Zap className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}

            {recentAgents.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('dashboard.recentAgents.noAgents')}</p>
                <Link
                  to="/agents"
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  {t('dashboard.recentAgents.goEnable')}
                </Link>
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 dark:text-white mb-6`}>{t('dashboard.quickActions.title')}</h2>

          <div className={`${isMobile ? 'grid grid-cols-2 gap-3' : 'space-y-4'}`}>
            <Link
              to="/projects"
              className={`${isMobile ? 'flex flex-col items-center p-4 text-center' : 'flex items-center space-x-4 p-4'} rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors`}
            >
              <div className={`p-2 bg-green-100 dark:bg-green-900/30 rounded-lg ${isMobile ? 'mb-2' : ''}`}>
                <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className={isMobile ? 'text-center' : ''}>
                <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm mb-1' : ''}`}>{t('dashboard.quickActions.createProject.title')}</h3>
                <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs hidden' : 'text-sm'}`}>{t('dashboard.quickActions.createProject.description')}</p>
              </div>
              {!isMobile && <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-auto" />}
            </Link>

            <Link
              to="/agents"
              className={`${isMobile ? 'flex flex-col items-center p-4 text-center' : 'flex items-center space-x-4 p-4'} rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}
            >
              <div className={`p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg ${isMobile ? 'mb-2' : ''}`}>
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className={isMobile ? 'text-center' : ''}>
                <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm mb-1' : ''}`}>{t('dashboard.quickActions.createAgent.title')}</h3>
                <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs hidden' : 'text-sm'}`}>{t('dashboard.quickActions.createAgent.description')}</p>
              </div>
              {!isMobile && <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-auto" />}
            </Link>

            <Link
              to="/mcp"
              className={`${isMobile ? 'flex flex-col items-center p-4 text-center' : 'flex items-center space-x-4 p-4'} rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors`}
            >
              <div className={`p-2 bg-green-100 dark:bg-green-900/30 rounded-lg ${isMobile ? 'mb-2' : ''}`}>
                <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className={isMobile ? 'text-center' : ''}>
                <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm mb-1' : ''}`}>{t('dashboard.quickActions.addMcp.title')}</h3>
                <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs hidden' : 'text-sm'}`}>{t('dashboard.quickActions.addMcp.description')}</p>
              </div>
              {!isMobile && <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-auto" />}
            </Link>

            <Link
              to="/analytics"
              className={`${isMobile ? 'flex flex-col items-center p-4 text-center' : 'flex items-center space-x-4 p-4'} rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors`}
            >
              <div className={`p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg ${isMobile ? 'mb-2' : ''}`}>
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className={isMobile ? 'text-center' : ''}>
                <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-sm mb-1' : ''}`}>{t('dashboard.quickActions.viewAnalytics.title')}</h3>
                <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs hidden' : 'text-sm'}`}>{t('dashboard.quickActions.viewAnalytics.description')}</p>
              </div>
              {!isMobile && <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-auto" />}
            </Link>
          </div>
        </div>
        </div>
      </div>
      </div>

    </div>
  );
};