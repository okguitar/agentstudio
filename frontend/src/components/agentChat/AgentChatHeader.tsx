import React from 'react';
import { Plus, Clock, RefreshCw } from 'lucide-react';
import { SessionsDropdown } from '../SessionsDropdown';
import { useTranslation } from 'react-i18next';

export interface AgentChatHeaderProps {
  agent: any;
  currentServiceName: string;
  projectPath?: string;
  currentSessionId: string | null;
  sessionsData?: any;
  isLoadingMessages: boolean;
  searchTerm: string;
  showSessions: boolean;
  onNewSession: () => void;
  onToggleSessions: () => void;
  onSwitchSession: (sessionId: string) => void;
  onSearchChange: (value: string) => void;
  onRefreshMessages: () => void;
}

export const AgentChatHeader: React.FC<AgentChatHeaderProps> = ({
  agent,
  currentServiceName,
  projectPath,
  currentSessionId,
  sessionsData,
  isLoadingMessages,
  searchTerm,
  showSessions,
  onNewSession,
  onToggleSessions,
  onSwitchSession,
  onSearchChange,
  onRefreshMessages
}) => {
  const { t } = useTranslation('components');

  return (
    <div className="flex-shrink-0 h-12 px-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold flex items-center space-x-2 text-gray-900 dark:text-white">
            <span className="text-lg flex-shrink-0">{agent.ui.icon}</span>
            <span className="truncate">[{currentServiceName}]</span>
            {projectPath && (
              <span className="text-sm opacity-75 font-normal truncate flex-shrink-0" title={projectPath}>
                {projectPath.split('/').pop() || projectPath}
              </span>
            )}
            {currentSessionId && (
              <>
                <span className="text-sm opacity-75">-</span>
                <span className="text-sm opacity-75 truncate">
                  {sessionsData?.sessions?.find((s: any) => s.id === currentSessionId)?.title || t('agentChat.currentSession')}
                </span>
              </>
            )}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-1 flex-shrink-0 ml-2">
          <button
            onClick={onNewSession}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300"
            title={t('agentChat.newSession')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={onToggleSessions}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300"
              title={t('agentChat.sessionHistory')}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Sessions Dropdown */}
            <SessionsDropdown
              isOpen={showSessions}
              onToggle={onToggleSessions}
              sessions={sessionsData?.sessions || []}
              currentSessionId={currentSessionId}
              onSwitchSession={onSwitchSession}
              isLoading={false}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
            />
          </div>
          <button
            onClick={onRefreshMessages}
            disabled={!currentSessionId || isLoadingMessages}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('agentChat.refreshMessages')}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};