import React, { useState } from 'react';
import { Settings, Play, Plus, Eye, EyeOff } from 'lucide-react';
import { useAgents, useUpdateAgent } from '../hooks/useAgents';
import { useQueryClient } from '@tanstack/react-query';
import { ProjectSelector } from '../components/ProjectSelector';
import type { AgentConfig } from '../types/index.js';
import { useTranslation } from 'react-i18next';

export const HomePage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { data: agentsData, isLoading } = useAgents(); // 获取所有agent，包括禁用的
  const updateAgent = useUpdateAgent();
  const queryClient = useQueryClient();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [selectedAgentForStart, setSelectedAgentForStart] = useState<AgentConfig | null>(null);

  const agents = agentsData?.agents || [];
  const enabledAgents = agents.filter(agent => agent.enabled);
  const disabledAgents = agents.filter(agent => !agent.enabled);

  const handleProjectSelect = (projectPath: string) => {
    if (selectedAgentForStart) {
      // Open chat page with project path as URL parameter
      const params = new URLSearchParams();
      params.set('project', projectPath);
      const url = `/chat/${selectedAgentForStart.id}?${params.toString()}`;
      window.open(url, '_blank');
    }
    setShowProjectSelector(false);
    setSelectedAgentForStart(null);
  };

  const handleToggleEnabled = async (agent: AgentConfig) => {
    try {
      await updateAgent.mutateAsync({
        agentId: agent.id,
        data: { enabled: !agent.enabled }
      });
      // Refresh agents list
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    } catch (error) {
      console.error('Failed to toggle agent:', error);
      alert(t('home.errors.toggleFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">{t('home.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('home.title')}</h1>
              <p className="text-gray-600 mt-2">{t('home.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Enabled Agents */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">{t('home.availableAgents')}</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => alert(t('home.customAgentComingSoon'))}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('home.createCustomAgent')}</span>
              </button>
              <span className="text-sm text-gray-500">{t('home.agentCount', { count: enabledAgents.length })}</span>
            </div>
          </div>
          
          {enabledAgents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">{t('home.noAgentsTitle')}</h3>
              <p className="text-gray-600 mb-6">{t('home.noAgentsDescription')}</p>
              <button
                onClick={() => window.location.href = '/agents'}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('home.manageAgents')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enabledAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{agent.ui.icon}</div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => window.location.href = '/agents'}
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                        title={t('home.editAgent')}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleEnabled(agent)}
                        className="text-green-600 hover:bg-green-50 p-1 rounded"
                        title={t('home.disableAgent')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{agent.description}</p>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      agent.ui.componentType === 'slides' ? 'bg-blue-100 text-blue-700' :
                      agent.ui.componentType === 'code' ? 'bg-green-100 text-green-700' :
                      agent.ui.componentType === 'documents' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {t(`home.componentTypes.${agent.ui.componentType}`, agent.ui.componentType)}
                    </span>
                    {agent.tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedAgentForStart(agent);
                      setShowProjectSelector(true);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{ backgroundColor: agent.ui.primaryColor }}
                  >
                    <Play className="w-4 h-4" />
                    <span>{t('home.startUsing')}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disabled Agents */}
        {disabledAgents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-700">{t('home.disabledAgents')}</h2>
              <span className="text-sm text-gray-500">{t('home.agentCount', { count: disabledAgents.length })}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {disabledAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-6 opacity-75"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl opacity-50">{agent.ui.icon}</div>
                    <button
                      onClick={() => handleToggleEnabled(agent)}
                      className="text-gray-400 hover:bg-gray-100 p-1 rounded"
                      title={t('home.enableAgent')}
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-600 mb-2">{agent.name}</h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{agent.description}</p>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                      {t('home.disabledStatus')}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleEnabled(agent)}
                    className="w-full px-4 py-3 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {t('home.enableAgentButton')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>


      {/* Project Selection Modal */}
      {showProjectSelector && selectedAgentForStart && (
        <ProjectSelector
          agent={selectedAgentForStart}
          onProjectSelect={handleProjectSelect}
          onClose={() => {
            setShowProjectSelector(false);
            setSelectedAgentForStart(null);
          }}
        />
      )}
    </div>
  );
};