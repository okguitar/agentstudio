import React, { useState } from 'react';
import {
  Clock,
  MessageCircle,
  X,
  RefreshCw,
  CheckCircle,
  Loader,
  Bot,
  Trash2,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { useSessions, cleanupSession, SessionInfo } from '../hooks/useSessions';
import { useQueryClient } from '@tanstack/react-query';
import { useAgents } from '../hooks/useAgents';
import { smartNavigate, showNavigationNotification } from '../utils/smartNavigation';
import { useTranslation } from 'react-i18next';
import { showError } from '../utils/toast';

export const SessionsDashboard: React.FC = () => {
  const { t } = useTranslation('components');
  const { data: sessionsData, isLoading, error, refetch } = useSessions();
  const { data: agentsData } = useAgents();
  const queryClient = useQueryClient();
  const [cleanupLoading, setCleanupLoading] = useState<string | null>(null);


  const handleCleanupSession = async (agentId: string, sessionId: string) => {
    try {
      setCleanupLoading(sessionId);
      await cleanupSession(agentId, sessionId);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (error) {
      console.error('Failed to cleanup session:', error);
      showError(t('sessionsDashboard.errors.cleanupFailed'));
    } finally {
      setCleanupLoading(null);
    }
  };

  const handleOpenChat = async (session: SessionInfo) => {
    const url = `/chat/${session.agentId}?session=${session.sessionId}${session.projectPath ? `&project=${encodeURIComponent(session.projectPath)}` : ''}`;
    
    try {
      const result = await smartNavigate(url, session.agentId, session.sessionId);
      
      // 显示操作结果
      showNavigationNotification(result);
      
      // 记录详细日志
      console.log(`🎯 Navigation result:`, result);
      
    } catch (error) {
      console.error('Navigation failed:', error);
      // 降级：直接打开链接
      window.open(url);
      showNavigationNotification({
        action: 'failed',
        success: false,
        message: t('sessionsDashboard.errors.navigationFailed')
      });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatIdleTime = (idleTimeMs: number) => {
    const seconds = Math.floor(idleTimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return t('sessionsDashboard.time.hoursMinutes', { hours, minutes: minutes % 60 });
    } else if (minutes > 0) {
      return t('sessionsDashboard.time.minutesSeconds', { minutes, seconds: seconds % 60 });
    } else {
      return t('sessionsDashboard.time.seconds', { seconds });
    }
  };

  const formatHeartbeatTime = (lastHeartbeat: number | null) => {
    if (!lastHeartbeat) {
      return t('sessionsDashboard.heartbeat.none');
    }
    const now = Date.now();
    const diff = now - lastHeartbeat;
    return formatIdleTime(diff);
  };

  const getAgentInfo = (agentId: string) => {
    const agents = agentsData?.agents || [];
    return agents.find(agent => agent.id === agentId);
  };

  const getStatusColor = (session: SessionInfo) => {
    if (session.status === 'pending') {
      return 'text-yellow-600 bg-yellow-100';
    }
    return session.isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (session: SessionInfo) => {
    if (session.status === 'pending') {
      return <Loader className="w-3 h-3 animate-spin" />;
    }
    return session.isActive ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500 dark:text-gray-400">{t('sessionsDashboard.loadingMessage')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <X className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-600 dark:text-red-400 mb-3">{t('sessionsDashboard.errors.loadFailed')}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {t('common:actions.refresh')}
          </button>
        </div>
      </div>
    );
  }

  const sessions = sessionsData?.sessions || [];
  const activeSessionCount = sessionsData?.activeSessionCount || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('sessionsDashboard.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('sessionsDashboard.activeCount', { count: activeSessionCount })}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={t('common:actions.refresh')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{t('sessionsDashboard.empty.noSessions')}</p>
          <p className="text-sm mt-1">{t('sessionsDashboard.empty.startChatHint')}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.map((session) => {
            const agent = getAgentInfo(session.agentId);
            return (
              <div
                key={session.sessionId}
                className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
              >
                {/* Agent Icon & Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="text-xl">
                    {agent?.ui?.icon || <Bot className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {agent?.name || session.agentId}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(session)}`}>
                        {getStatusIcon(session)}
                        <span className="ml-1">
                          {session.status === 'pending' ? t('sessionsDashboard.status.pending') :
                           session.isActive ? t('sessionsDashboard.status.active') : t('sessionsDashboard.status.idle')}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col space-y-1 mt-1">
                      {/* 第一行：会话ID和Agent ID */}
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t('sessionsDashboard.labels.session')}:</span> {session.sessionId}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t('sessionsDashboard.labels.agent')}:</span> {session.agentId}
                        </span>
                      </div>

                      {/* 第二行：项目路径（如果存在）*/}
                      {session.projectPath && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t('sessionsDashboard.labels.project')}:</span>
                          <span className="ml-1 font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-gray-600 dark:text-gray-400">
                            {session.projectPath}
                          </span>
                        </div>
                      )}

                      {/* 第三行：时间和心跳信息 */}
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t('sessionsDashboard.labels.activity')}:</span> {formatTime(session.lastActivity)}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Heart className={`w-3 h-3 ${session.lastHeartbeat ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
                          <span className={session.lastHeartbeat ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}>
                            {formatHeartbeatTime(session.lastHeartbeat)}
                          </span>
                        </div>
                        {session.heartbeatTimedOut && (
                          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{t('sessionsDashboard.heartbeat.timeout')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenChat(session)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title={t('sessionsDashboard.actions.openChat')}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCleanupSession(session.agentId, session.sessionId)}
                    disabled={cleanupLoading === session.sessionId}
                    className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title={t('sessionsDashboard.actions.cleanup')}
                  >
                    {cleanupLoading === session.sessionId ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};