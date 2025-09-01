import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AgentChatPanel } from '../components/AgentChatPanel';
import { SplitLayout } from '../components/SplitLayout';
import { getAgentPlugin } from '../agents/registry';
import { useAgentStore } from '../stores/useAgentStore';
import { useAgent } from '../hooks/useAgents';

export const ChatPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get('project');
  const { data: agentData, isLoading, error } = useAgent(agentId!);
  const { setCurrentAgent } = useAgentStore();

  const agent = agentData?.agent;

  // Set current agent when data loads
  useEffect(() => {
    if (agent) {
      setCurrentAgent(agent);
    }
  }, [agent, setCurrentAgent]);

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
    </div>
  );
};