import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AgentChatPanel } from '../components/AgentChatPanel';
import { SplitLayout } from '../components/SplitLayout';
import { getAgentPlugin } from '../agents/registry';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgent } from '../hooks/useAgents';
import { ProjectSelector } from '../components/ProjectSelector';

export const ChatPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectPath = searchParams.get('project');
  const { data: agentData, isLoading, error } = useAgent(agentId!);
  const { setCurrentAgent } = useAgentStore();
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  const agent = agentData?.agent;

  // Set current agent when data loads
  useEffect(() => {
    if (agent) {
      setCurrentAgent(agent);
    }
  }, [agent, setCurrentAgent]);

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
    navigate(`/chat/${agentId}?${params.toString()}`, { replace: true });
    setShowProjectSelector(false);
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载智能助手...</div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">助手未找到</h1>
          <p className="text-gray-600 mb-6">
            无法找到指定的智能助手，可能已被删除或禁用。
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            关闭页面
          </button>
        </div>
      </div>
    );
  }

  if (!agent.enabled) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-50">{agent.ui.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">助手已禁用</h1>
          <p className="text-gray-600 mb-6">
            智能助手 "{agent.name}" 目前已被禁用，无法使用。
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              关闭页面
            </button>

          </div>
        </div>
      </div>
    );
  }

  // Render layout based on plugin configuration
  const renderLayout = () => {
    if (!RightPanelComponent) {
      // Single layout - only chat panel
      return (
        <div className="h-full bg-gray-100">
          <AgentChatPanel agent={agent} projectPath={projectPath || undefined} />
        </div>
      );
    }

    // Split layout - chat panel + right panel
    return (
      <SplitLayout>
        <AgentChatPanel agent={agent} projectPath={projectPath || undefined} />
        <RightPanelComponent agent={agent} projectPath={projectPath || undefined} />
      </SplitLayout>
    );
  };

  return (
    <div className="h-screen bg-gray-100">
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