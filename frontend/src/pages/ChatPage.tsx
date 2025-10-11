import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AgentChatPanel } from '../components/AgentChatPanel';
import { SplitLayout } from '../components/SplitLayout';
import { RightPanelWrapper } from '../components/RightPanelWrapper';
import { getAgentPlugin } from '../agents/registry';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgent } from '../hooks/useAgents';
import { ProjectSelector } from '../components/ProjectSelector';

export const ChatPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectPath = searchParams.get('project');
  const sessionId = searchParams.get('session');
  const { data: agentData, isLoading, error } = useAgent(agentId!);
  const { setCurrentAgent, setCurrentSessionId } = useAgentStore();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [hideRightPanel, setHideRightPanel] = useState(false);

  const agent = agentData?.agent;

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

  // 处理面板隐藏/显示
  const handleTogglePanel = (hidden: boolean) => {
    setHideRightPanel(hidden);
  };

  // 处理显示右侧面板
  const handleShowRightPanel = () => {
    setHideRightPanel(false);
  };

  // 处理移动端面板切换
  const handleMobilePanelToggle = () => {
    // This will be handled by the mobile context in SplitLayout
  };

  // Render layout based on plugin configuration
  const renderLayout = () => {
    // 始终使用分栏布局，右侧根据是否有自定义组件来决定显示内容
    return (
      <SplitLayout
        hideRightPanel={hideRightPanel}
        onShowRightPanel={handleShowRightPanel}
        mobileLayout="tabs"
      >
        <AgentChatPanel agent={agent} projectPath={projectPath || undefined} onSessionChange={handleSessionChange} />
        <RightPanelWrapper
          agent={agent}
          projectPath={projectPath || undefined}
          CustomComponent={RightPanelComponent}
          onTogglePanel={handleTogglePanel}
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