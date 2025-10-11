import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { showError } from '../utils/toast';
import {
  Plus,
  Search,
  Folder,
  X
} from 'lucide-react';
import { ProjectTable } from '../components/ProjectTable';
import { useAgents } from '../hooks/useAgents';
import { FileBrowser } from '../components/FileBrowser';
import { ProjectMemoryModal } from '../components/ProjectMemoryModal';
import { ProjectCommandsModal } from '../components/ProjectCommandsModal';
import { ProjectSubAgentsModal } from '../components/ProjectSubAgentsModal';

interface Project {
  id: string;
  name: string;
  dirName: string;
  path: string;
  realPath?: string;
  agents: string[];
  defaultAgent: string;
  defaultAgentName: string;
  defaultAgentIcon: string;
  defaultAgentColor: string;
  createdAt: string;
  lastAccessed: string;
  description?: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { 
    name: string; 
    agentId: string; 
    directory: string; 
    description: string; 
  }) => void;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    ui: {
      icon: string;
    };
  }>;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  agents
}) => {
  const { t } = useTranslation('pages');
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    directory: '~/claude-code-projects',
    description: ''
  });
  const [showFileBrowser, setShowFileBrowser] = useState(false);


  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        name: '',
        agentId: agents.length > 0 ? agents[0].id : '',
        directory: '~/claude-code-projects',
        description: ''
      });
    }
  }, [isOpen, agents]);

  // Function to expand tilde in path for the file browser
  const getAbsolutePath = (path: string) => {
    if (path.startsWith('~/')) {
      // For the file browser, we need to use an absolute path
      // We'll pass undefined to let the backend handle the default
      return undefined;
    }
    return path;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.agentId) {
      onConfirm(formData);
    }
  };

  const selectedAgent = agents.find(agent => agent.id === formData.agentId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('projects.form.create')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('projects.form.nameRequired')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('projects.form.namePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('projects.form.agentType')}
              </label>
              <select
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              >
                {agents.filter(agent => agent.enabled).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.ui.icon} {agent.name}
                  </option>
                ))}
              </select>
              {selectedAgent && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{selectedAgent.ui.icon}</div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{selectedAgent.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{selectedAgent.description}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Project Directory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('projects.form.directory')}
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.directory}
                  onChange={(e) => setFormData({ ...formData, directory: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowFileBrowser(true)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  title={t('projects.form.directory')}
                >
                  <Folder className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('projects.form.directoryNote')}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('projects.form.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('projects.form.descriptionPlaceholder')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('projects.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={!formData.name || !formData.agentId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('projects.createButton')}
            </button>
          </div>
        </form>
      </div>
      
      {/* FileBrowser Modal */}
      {showFileBrowser && (
        <FileBrowser
          title={t('projects.form.directory')}
          initialPath={getAbsolutePath(formData.directory)}
          allowFiles={false}
          allowDirectories={true}
          allowNewDirectory={true}
          onSelect={(path, isDirectory) => {
            if (isDirectory) {
              setFormData({ ...formData, directory: path });
              setShowFileBrowser(false);
            }
          }}
          onClose={() => setShowFileBrowser(false)}
        />
      )}
    </div>
  );
};

export const ProjectsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { data: agentsData } = useAgents();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [memoryProject, setMemoryProject] = useState<Project | null>(null);
  const [commandsProject, setCommandsProject] = useState<Project | null>(null);
  const [subAgentsProject, setSubAgentsProject] = useState<Project | null>(null);
  const [agentSelectProject, setAgentSelectProject] = useState<Project | null>(null);

  const agents = agentsData?.agents || [];
  const enabledAgents = agents.filter(agent => agent.enabled);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`${API_BASE}/projects`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        } else {
          console.error('Failed to fetch projects:', response.status);
          setProjects([]);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.defaultAgentName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAgent = filterAgent === 'all' || project.defaultAgent === filterAgent;
    
    return matchesSearch && matchesAgent;
  }).sort((a, b) => {
    // 按最后访问时间倒序排列（最近访问的在前面）
    return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
  });

  const handleCreateProject = async (data: {
    name: string;
    agentId: string;
    directory: string;
    description: string;
  }) => {
    try {
      const response = await authFetch(`${API_BASE}/projects/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: data.agentId,
          projectName: data.name,
          parentDirectory: data.directory,
          description: data.description
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Add new project to the list
        setProjects(prev => [result.project, ...prev]);
        setShowCreateModal(false);

        // 创建完成后跳转到聊天界面
        const params = new URLSearchParams();
        params.set('project', result.project.path);
        const url = `/chat/${data.agentId}?${params.toString()}`;
        window.open(url, '_blank');
      } else {
        const error = await response.json();
        throw new Error(error.error || t('projects.errors.createFailed'));
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      showError(t('projects.errors.createFailed'), error instanceof Error ? error.message : t('errors:common.unknownError'));
    }
  };

  const handleOpenProject = async (project: Project) => {
    // Check if project has a default agent
    if (!project.defaultAgent || project.agents.length === 0) {
      // Show agent selection dialog
      setAgentSelectProject(project);
      return;
    }

    // Open project with default agent
    console.log('Opening project:', project.name, 'with agent:', project.defaultAgent);
    const params = new URLSearchParams();
    params.set('project', project.path);
    const url = `/chat/${project.defaultAgent}?${params.toString()}`;
    console.log('Generated URL:', url);
    window.open(url, '_blank');

    // Update last accessed time
    setProjects(prev => prev.map(p => 
      p.id === project.id 
        ? { ...p, lastAccessed: new Date().toISOString() }
        : p
    ));
  };

  const handleDeleteProject = async (project: Project) => {
    const confirmed = window.confirm(
      `${t('projects.deleteConfirm')}\n\n${t('projects.deleteNote')}`
    );

    if (confirmed) {
      try {
        const response = await authFetch(`${API_BASE}/projects/by-id/${project.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setProjects(prev => prev.filter(p => p.id !== project.id));
        } else {
          const error = await response.json();
          throw new Error(error.error || t('projects.errors.deleteFailed'));
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
        showError(t('projects.errors.deleteFailed'), error instanceof Error ? error.message : t('errors:common.unknownError'));
      }
    }
  };

  const handleMemoryManagement = (project: Project) => {
    setMemoryProject(project);
  };

  const handleCommandManagement = (project: Project) => {
    setCommandsProject(project);
  };

  const handleSubAgentManagement = (project: Project) => {
    setSubAgentsProject(project);
  };

  const handleAgentSelection = async (agentId: string) => {
    if (!agentSelectProject) return;

    try {
      // Call API to select agent for project
      const response = await authFetch(`${API_BASE}/projects/${agentSelectProject.dirName}/select-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId })
      });

      if (response.ok) {
        const data = await response.json();
        // Update projects list with new agent info
        setProjects(prev => prev.map(p =>
          p.id === agentSelectProject.id ? data.project : p
        ));

        // Close selection dialog
        setAgentSelectProject(null);

        // Open project with selected agent
        const params = new URLSearchParams();
        params.set('project', data.project.path);
        const url = `/chat/${agentId}?${params.toString()}`;
        window.open(url, '_blank');
      } else {
        const error = await response.json();
        showError(t('errors:agent.setFailed'), error.error || t('errors:common.unknownError'));
      }
    } catch (error) {
      console.error('Failed to select agent:', error);
      showError(t('errors:agent.setFailed'), error instanceof Error ? error.message : t('errors:common.unknownError'));
    }
  };



  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">{t('projects.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('projects.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('projects.subtitle')}</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={t('projects.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('projects.table.agent')}:</span>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('projects.filter.all')}</option>
                  {enabledAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.ui.icon} {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>{t('projects.createButton')}</span>
          </button>
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {t('projects.noProjects')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('projects.selectType')}
          </p>
          {!searchQuery && filterAgent === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('projects.createButton')}
            </button>
          )}
        </div>
      ) : (
        <ProjectTable
          projects={filteredProjects}
          onOpenProject={handleOpenProject}
          onMemoryManagement={handleMemoryManagement}
          onCommandManagement={handleCommandManagement}
          onSubAgentManagement={handleSubAgentManagement}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateProject}
        agents={enabledAgents}
      />

      {/* Memory Management Modal */}
      {memoryProject && (
        <ProjectMemoryModal
          project={memoryProject}
          onClose={() => setMemoryProject(null)}
        />
      )}

      {/* Commands Management Modal */}
      {commandsProject && (
        <ProjectCommandsModal
          project={commandsProject}
          onClose={() => setCommandsProject(null)}
        />
      )}

      {/* SubAgents Management Modal */}
      {subAgentsProject && (
        <ProjectSubAgentsModal
          project={subAgentsProject}
          onClose={() => setSubAgentsProject(null)}
        />
      )}

      {/* Agent Selection Modal */}
      {agentSelectProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('projects.selectType')}</h2>
              <button
                onClick={() => setAgentSelectProject(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('projects.selectType')}
                </p>
              </div>

              <div className="space-y-3">
                {enabledAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentSelection(agent.id)}
                    className="w-full p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{agent.ui.icon}</div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{agent.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{agent.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setAgentSelectProject(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('projects.form.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};