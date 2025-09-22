import React from 'react';
import { 
  Clock, 
  MessageCircle, 
  X, 
  RefreshCw,
  CheckCircle,
  Loader,
  Bot
} from 'lucide-react';
import { useSessions, closeSession, SessionInfo } from '../hooks/useSessions';
import { useQueryClient } from '@tanstack/react-query';
import { useAgents } from '../hooks/useAgents';
import { Link } from 'react-router-dom';

export const SessionsDashboard: React.FC = () => {
  const { data: sessionsData, isLoading, error, refetch } = useSessions();
  const { data: agentsData } = useAgents();
  const queryClient = useQueryClient();

  const handleCloseSession = async (sessionId: string) => {
    try {
      await closeSession(sessionId);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (error) {
      console.error('Failed to close session:', error);
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
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500">加载会话信息...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <X className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-600 mb-3">加载会话信息失败</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const sessions = sessionsData?.sessions || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">活跃会话</h2>
            <p className="text-sm text-gray-500">
              当前活跃: {sessionsData?.activeSessionCount || 0} 个会话
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无活跃会话</p>
          <p className="text-sm mt-1">开始与助手对话即可创建会话</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.map((session) => {
            const agent = getAgentInfo(session.agentId);
            return (
              <div
                key={session.sessionId}
                className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                {/* Agent Icon & Info */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="text-xl">
                    {agent?.ui?.icon || <Bot className="w-5 h-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {agent?.name || session.agentId}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(session)}`}>
                        {getStatusIcon(session)}
                        <span className="ml-1">
                          {session.status === 'pending' ? '等待中' : 
                           session.isActive ? '活跃' : '空闲'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                      <span>ID: {session.sessionId.substring(0, 8)}...</span>
                      <span>最后活动: {formatTime(session.lastActivity)}</span>
                      <span>空闲: {formatIdleTime(session.idleTimeMs)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/chat/${session.agentId}?sessionId=${session.sessionId}`}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="打开聊天窗口"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleCloseSession(session.sessionId)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="关闭会话"
                  >
                    <X className="w-4 h-4" />
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