import React from 'react';
import { Clock, FolderOpen, Command, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProjects } from '../hooks/useProjects';
import { useCommands } from '../hooks/useCommands';
import { useSessions } from '../hooks/useSessions';
import { Link } from 'react-router-dom';

interface Activity {
  id: string;
  type: 'project' | 'command' | 'session';
  title: string;
  subtitle?: string;
  timestamp: string;
  icon: React.ReactNode;
  href?: string;
}

export const RecentActivity: React.FC = () => {
  const { t } = useTranslation('components');
  const { data: projectsData } = useProjects();
  const { data: commandsData } = useCommands();
  const { data: sessionsData } = useSessions();

  const projects = projectsData?.projects || [];
  const commands = commandsData || [];
  const sessions = sessionsData?.sessions || [];

  // Combine and sort activities - filter out items without valid timestamps
  const activities: Activity[] = [
    ...projects.slice(0, 3).map(p => ({
      id: `project-${p.id}`,
      type: 'project' as const,
      title: p.name,
      subtitle: p.description,
      timestamp: p.lastAccessed || p.createdAt || new Date().toISOString(),
      icon: <FolderOpen className="w-4 h-4 text-green-600" />,
      href: `/projects`,
    })),
    ...commands.slice(0, 3).map(c => ({
      id: `command-${c.id}`,
      type: 'command' as const,
      title: `/${c.name}`,
      subtitle: c.description,
      timestamp: c.createdAt || new Date().toISOString(),
      icon: <Command className="w-4 h-4 text-blue-600" />,
      href: `/settings/commands`,
    })),
    ...sessions.slice(0, 3).map(s => ({
      id: `session-${s.sessionId}`,
      type: 'session' as const,
      title: s.agentId,
      subtitle: s.projectPath,
      timestamp: new Date(s.lastActivity).toISOString(),
      icon: <MessageSquare className="w-4 h-4 text-purple-600" />,
    })),
  ]
    .filter(activity => activity.timestamp && !isNaN(new Date(activity.timestamp).getTime()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  const formatRelativeTime = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('recentActivity.time.justNow');
    if (minutes < 60) return t('recentActivity.time.minutesAgo', { count: minutes });
    if (hours < 24) return t('recentActivity.time.hoursAgo', { count: hours });
    return t('recentActivity.time.daysAgo', { count: days });
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('recentActivity.title')}
          </h2>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('recentActivity.empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('recentActivity.title')}
        </h2>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const content = (
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {activity.title}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
                {activity.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                    {activity.subtitle}
                  </p>
                )}
              </div>
            </div>
          );

          if (activity.href) {
            return (
              <Link key={activity.id} to={activity.href}>
                {content}
              </Link>
            );
          }

          return <div key={activity.id}>{content}</div>;
        })}
      </div>
    </div>
  );
};
