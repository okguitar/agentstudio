import React, { useState } from 'react';
import { ChevronDown, Settings, Plus, Folder, FolderPlus } from 'lucide-react';
import type { AgentConfig } from '../types/index.js';
import { useCreateProject } from '../hooks/useAgents.js';

interface AgentSelectorProps {
  currentAgent: AgentConfig | null;
  agents: AgentConfig[];
  onAgentChange: (agent: AgentConfig, projectPath?: string) => void;
  onConfigureAgents?: () => void;
  onCreateAgent?: () => void;
}

interface ProjectOption {
  id: string;
  path: string;
  name: string;
  lastUsed?: Date;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  currentAgent,
  agents,
  onAgentChange,
  onConfigureAgents,
  onCreateAgent
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const enabledAgents = agents.filter(agent => agent.enabled);
  const createProject = useCreateProject();

  const handleAgentClick = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setShowProjectSelection(true);
    setIsOpen(false);
  };

  const handleProjectSelection = async (projectPath: string) => {
    if (selectedAgent) {
      onAgentChange(selectedAgent, projectPath);
      setShowProjectSelection(false);
      setSelectedAgent(null);
    }
  };

  const handleNewProject = async () => {
    if (selectedAgent) {
      try {
        // Generate new project directory
        const projectName = `${selectedAgent.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
        const result = await createProject.mutateAsync({
          agentId: selectedAgent.id,
          projectName
        });
        
        onAgentChange(selectedAgent, result.projectPath);
        setShowProjectSelection(false);
        setSelectedAgent(null);
      } catch (error) {
        console.error('Failed to create project:', error);
        alert('创建项目失败，请重试');
      }
    }
  };

  const handleOpenProject = async () => {
    // This would trigger a file picker dialog
    // For now, using current directory as fallback
    if (selectedAgent) {
      onAgentChange(selectedAgent, process.cwd());
      setShowProjectSelection(false);
      setSelectedAgent(null);
    }
  };

  return (
    <div className="relative">
      {/* Current Agent Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 w-full p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="text-2xl">{currentAgent?.ui.icon || '🤖'}</div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            {currentAgent?.name || '选择智能助手'}
          </div>
          <div className="text-sm text-gray-500">
            {currentAgent?.description || '请选择一个智能助手开始使用'}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="max-h-64 overflow-y-auto">
            {enabledAgents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-2xl mb-2">🤖</div>
                <div className="text-sm">暂无可用的智能助手</div>
                <div className="text-xs text-gray-400 mt-1">请联系管理员配置助手</div>
              </div>
            ) : (
              enabledAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentClick(agent)}
                  className={`w-full flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors first:rounded-t-lg border-b border-gray-100 last:border-b-0 ${
                    currentAgent?.id === agent.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="text-2xl">{agent.ui.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{agent.name}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{agent.description}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        agent.ui.componentType === 'slides' ? 'bg-blue-100 text-blue-700' :
                        agent.ui.componentType === 'code' ? 'bg-green-100 text-green-700' :
                        agent.ui.componentType === 'documents' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {agent.ui.componentType === 'slides' ? '演示文稿' :
                         agent.ui.componentType === 'code' ? '代码开发' :
                         agent.ui.componentType === 'documents' ? '文档写作' :
                         agent.ui.componentType}
                      </span>
                      {agent.tags.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  {currentAgent?.id === agent.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              ))
            )}
          </div>
          
          {/* Management Actions */}
          {(onConfigureAgents || onCreateAgent) && (
            <div className="border-t border-gray-100 p-2">
              <div className="flex space-x-1">
                {onCreateAgent && (
                  <button
                    onClick={() => {
                      onCreateAgent();
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>创建助手</span>
                  </button>
                )}
                {onConfigureAgents && (
                  <button
                    onClick={() => {
                      onConfigureAgents();
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>管理助手</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Project Selection Modal */}
      {showProjectSelection && selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">{selectedAgent.ui.icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedAgent.name}</h3>
                <p className="text-sm text-gray-500">选择项目目录</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={handleOpenProject}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Folder className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">打开现有项目</div>
                  <div className="text-sm text-gray-500">选择已存在的项目目录</div>
                </div>
              </button>
              
              <button
                onClick={handleNewProject}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FolderPlus className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">新建项目</div>
                  <div className="text-sm text-gray-500">在 ~/claude-code-projects 中创建新项目</div>
                </div>
              </button>
            </div>
            
            {/* Recent Projects */}
            {selectedAgent.projects && selectedAgent.projects.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">最近使用的项目</h4>
                <div className="space-y-2">
                  {selectedAgent.projects.slice(0, 3).map((project, index) => (
                    <button
                      key={index}
                      onClick={() => handleProjectSelection(project)}
                      className="w-full flex items-center space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <Folder className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {project.split('/').pop() || 'Untitled Project'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{project}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowProjectSelection(false);
                  setSelectedAgent(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};