import React from 'react';
import {
  Bot,
  Server,
  Activity,
  TrendingUp,
  Zap,
  ArrowRight,
  Plus,
  FolderOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAgents } from '../hooks/useAgents';
import { SessionsDashboard } from '../components/SessionsDashboard';

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { data: agentsData } = useAgents();
  const agents = agentsData?.agents || [];
  const enabledAgents = agents.filter(agent => agent.enabled);

  const stats = [
    {
      name: t('dashboard.stats.agentManagement'),
      value: enabledAgents.length,
      total: agents.length,
      icon: Bot,
      color: 'bg-blue-500',
      href: '/agents'
    },
    {
      name: t('dashboard.stats.workProjects'),
      value: 4,
      change: '+2',
      icon: FolderOpen,
      color: 'bg-green-500',
      href: '/projects'
    },
    {
      name: t('dashboard.stats.todayCalls'),
      value: 1247,
      change: '+12%',
      icon: Activity,
      color: 'bg-orange-500',
      href: '/analytics'
    },
    {
      name: t('dashboard.stats.mcpServices'),
      value: 3,
      total: 5,
      icon: Server,
      color: 'bg-purple-500',
      href: '/mcp'
    }
  ];

  const recentAgents = enabledAgents.slice(0, 3);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-2">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                    {stat.total && (
                      <span className="text-sm font-normal text-gray-500">
                        /{stat.total}
                      </span>
                    )}
                  </p>
                  {stat.change && (
                    <span className="text-sm text-green-600 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {stat.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sessions Dashboard */}
        <div className="lg:col-span-2">
          <SessionsDashboard />
        </div>
        
        {/* Recent Agents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('dashboard.recentAgents.title')}</h2>
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
              <div key={agent.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="text-2xl">{agent.ui.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{agent.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{agent.description}</p>
                </div>
                <div className="flex items-center space-x-2">
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
              <div className="text-center py-8 text-gray-500">
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('dashboard.quickActions.title')}</h2>

          <div className="space-y-4">
            <Link
              to="/projects"
              className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{t('dashboard.quickActions.createProject.title')}</h3>
                <p className="text-sm text-gray-500">{t('dashboard.quickActions.createProject.description')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
            </Link>

            <Link
              to="/agents"
              className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{t('dashboard.quickActions.createAgent.title')}</h3>
                <p className="text-sm text-gray-500">{t('dashboard.quickActions.createAgent.description')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
            </Link>

            <Link
              to="/mcp"
              className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Server className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{t('dashboard.quickActions.addMcp.title')}</h3>
                <p className="text-sm text-gray-500">{t('dashboard.quickActions.addMcp.description')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
            </Link>

            <Link
              to="/analytics"
              className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{t('dashboard.quickActions.viewAnalytics.title')}</h3>
                <p className="text-sm text-gray-500">{t('dashboard.quickActions.viewAnalytics.description')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
            </Link>
          </div>
          </div>
        </div>
      </div>

    </div>
  );
};