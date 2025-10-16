import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AgentChatPanel } from '../components/AgentChatPanel';
import { SplitLayout } from '../components/SplitLayout';
import { RightPanelWrapper } from '../components/RightPanelWrapper';
import { getAgentPlugin } from '../agents/registry';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgent } from '../hooks/useAgents';
import { ProjectSelector } from '../components/ProjectSelector';
import { useTabNotification, type TabNotificationStatus } from '../hooks/useTabNotification';

export const ChatPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectPath = searchParams.get('project');
  const sessionId = searchParams.get('session');
  const { data: agentData, isLoading, error } = useAgent(agentId!);
  const { setCurrentAgent, setCurrentSessionId, isAiTyping } = useAgentStore();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [hideLeftPanel, setHideLeftPanel] = useState(false);
  const [hideRightPanel, setHideRightPanel] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [hasSeenCompletion, setHasSeenCompletion] = useState(false);
  const wasAiTypingRef = React.useRef(false);

  const agent = agentData?.agent;

  // Track AI typing state changes
  useEffect(() => {
    if (isAiTyping) {
      wasAiTypingRef.current = true;
      setHasSeenCompletion(false); // Reset when AI starts working
    } else if (wasAiTypingRef.current) {
      // AI just finished typing
      // If page is currently visible, mark as seen immediately
      if (!document.hidden) {
        setHasSeenCompletion(true);
        wasAiTypingRef.current = false;
      }
      // If page is hidden, wasAiTypingRef stays true until user comes back
    }
  }, [isAiTyping]);

  // Reset completion flag when user views the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isAiTyping && wasAiTypingRef.current) {
        // User came back to the page and AI is done
        setHasSeenCompletion(true);
        wasAiTypingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAiTyping]);

  // Determine tab notification status based on AI state
  const tabStatus: TabNotificationStatus = useMemo(() => {
    if (lastError) return 'error';
    if (isAiTyping) return 'working';
    // Only show completed if AI just finished AND user hasn't seen it yet
    if (!isAiTyping && wasAiTypingRef.current && !hasSeenCompletion) {
      return 'completed';
    }
    return 'idle';
  }, [isAiTyping, lastError, hasSeenCompletion]);

  // Use tab notification
  useTabNotification({
    status: tabStatus,
    originalTitle: agent ? `${agent.ui.icon} ${agent.name} - AgentStudio` : 'AgentStudio',
    workingText: t('chat.tabNotification.working'),
    completedText: t('chat.tabNotification.completed'),
    errorText: t('chat.tabNotification.error'),
  });

  // Track errors
  useEffect(() => {
    if (error) {
      setLastError(error as Error);
      // Clear error after 5 seconds
      const timer = setTimeout(() => setLastError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Set current agent when data loads, then set session ID
  useEffect(() => {
    console.log('🎯 ChatPage agent/session effect:', {
      hasAgent: !!agent,
      agentId: agent?.id,
      sessionId,
      urlSessionId: searchParams.get('session')
    });
    
    if (agent) {
      console.log('🎯 Setting current agent:', agent.id);
      setCurrentAgent(agent);
      // Set session ID after agent is set to prevent it from being cleared
      if (sessionId) {
        console.log('🎯 Setting session ID:', sessionId);
        setCurrentSessionId(sessionId);
      }
    }
  }, [agent, sessionId, setCurrentAgent, setCurrentSessionId]);

  // Show project selector if no project path is provided and agent is loaded
  useEffect(() => {
    if (agent && !projectPath) {
      setShowProjectSelector(true);
    }
  }, [agent, projectPath]);

  // Handle project selection - update URL instead of opening new window
  const handleProjectSelect = (selectedProjectPath: string) => {
    const params = new URLSearchParams();
    params.set('project', selectedProjectPath);
    if (sessionId) {
      params.set('session', sessionId);
    }
    navigate(`/chat/${agentId}?${params.toString()}`, { replace: true });
    setShowProjectSelector(false);
  };

  // Handle session change - update URL
  const handleSessionChange = (newSessionId: string | null) => {
    const params = new URLSearchParams();
    if (projectPath) {
      params.set('project', projectPath);
    }
    if (newSessionId) {
      params.set('session', newSessionId);
    }
    navigate(`/chat/${agentId}?${params.toString()}`, { replace: true });
  };

  const handleProjectSelectorClose = () => {
    setShowProjectSelector(false);
    // If user closes without selecting a project, redirect back to agents page
    navigate('/agents');
  };

  // Get agent plugin configuration
  const agentPlugin = agent ? getAgentPlugin(agent.ui.componentType) : undefined;
  const RightPanelComponent = agentPlugin?.rightPanelComponent;

  // Handle plugin lifecycle
  useEffect(() => {
    if (agent && agentPlugin?.onMount) {
      agentPlugin.onMount(agent.id);
    }

    return () => {
      if (agent && agentPlugin?.onUnmount) {
        agentPlugin.onUnmount(agent.id);
      }
    };
  }, [agent, agentPlugin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">{t('chat.loading')}</div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('chat.agentNotFound')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('chat.agentNotFoundDesc')}
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('chat.closePage')}
          </button>
        </div>
      </div>
    );
  }

  if (!agent.enabled) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-50">{agent.ui.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('chat.agentDisabled')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('chat.agentDisabledDesc', { name: agent.name })}
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {t('chat.closePage')}
            </button>

          </div>
        </div>
      </div>
    );
  }

  // 处理左侧面板切换
  const handleToggleLeftPanel = () => {
    const newHideLeft = !hideLeftPanel;
    setHideLeftPanel(newHideLeft);
    
    // 如果左面板要隐藏，但右面板也是隐藏的，则显示右面板
    if (newHideLeft && hideRightPanel) {
      setHideRightPanel(false);
    }
  };

  // 处理右侧面板切换
  const handleToggleRightPanel = () => {
    const newHideRight = !hideRightPanel;
    setHideRightPanel(newHideRight);
    
    // 如果右面板要隐藏，但左面板也是隐藏的，则显示左面板
    if (newHideRight && hideLeftPanel) {
      setHideLeftPanel(false);
    }
  };

  // Render layout based on plugin configuration
  const renderLayout = () => {
    // 始终使用分栏布局，右侧根据是否有自定义组件来决定显示内容
    return (
      <SplitLayout
        hideLeftPanel={hideLeftPanel}
        hideRightPanel={hideRightPanel}
        onToggleLeftPanel={handleToggleLeftPanel}
        onToggleRightPanel={handleToggleRightPanel}
        mobileLayout="tabs"
      >
        <AgentChatPanel agent={agent} projectPath={projectPath || undefined} onSessionChange={handleSessionChange} />
        <RightPanelWrapper
          agent={agent}
          projectPath={projectPath || undefined}
          CustomComponent={RightPanelComponent}
        />
      </SplitLayout>
    );
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900">
      {renderLayout()}

      {/* Project Selection Modal - Only show when no project is selected */}
      {showProjectSelector && agent && (
        <ProjectSelector
          agent={agent}
          onProjectSelect={handleProjectSelect}
          onClose={handleProjectSelectorClose}
        />
      )}
    </div>
  );
};