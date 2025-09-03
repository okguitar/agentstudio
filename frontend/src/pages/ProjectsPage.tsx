import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar,
  User,
  ExternalLink,
  Trash2,
  Play,
  Folder,
  X
} from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import { FileBrowser } from '../components/FileBrowser';
import { formatRelativeTime } from '../utils';

interface Project {
  id: string;
  name: string;
  path: string;
  agentId: string;
  agentName: string;
  agentIcon: string;
  agentColor: string;
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
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">创建新项目</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入项目名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择助手类型 *
              </label>
              <select
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {agents.filter(agent => agent.enabled).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.ui.icon} {agent.name}
                  </option>
                ))}
              </select>
              {selectedAgent && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{selectedAgent.ui.icon}</div>
                    <div>
                      <div className="font-medium text-gray-900">{selectedAgent.name}</div>
                      <div className="text-sm text-gray-600">{selectedAgent.description}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Project Directory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目目录
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.directory}
                  onChange={(e) => setFormData({ ...formData, directory: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowFileBrowser(true)}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="选择目录"
                >
                  <Folder className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                项目将在此目录下创建一个新文件夹
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                项目描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简单描述这个项目的用途..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.name || !formData.agentId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建项目
            </button>
          </div>
        </form>
      </div>
      
      {/* FileBrowser Modal */}
      {showFileBrowser && (
        <FileBrowser
          title="选择项目目录"
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
  const { data: agentsData } = useAgents();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const agents = agentsData?.agents || [];
  const enabledAgents = agents.filter(agent => agent.enabled);

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/agents/projects');
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
                         project.agentName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAgent = filterAgent === 'all' || project.agentId === filterAgent;
    
    return matchesSearch && matchesAgent;
  });

  const handleCreateProject = async (data: {
    name: string;
    agentId: string;
    directory: string;
    description: string;
  }) => {
    try {
      const response = await fetch('/api/agents/projects/create', {
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
        throw new Error(error.error || '创建项目失败');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(`创建项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleOpenProject = (project: Project) => {
    const params = new URLSearchParams();
    params.set('project', project.path);
    const url = `/chat/${project.agentId}?${params.toString()}`;
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
      `确定要删除项目 "${project.name}" 吗？\n\n注意：这只会从列表中移除项目，不会删除实际的文件目录。`
    );
    
    if (confirmed) {
      try {
        const response = await fetch(`/api/agents/projects/${project.id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setProjects(prev => prev.filter(p => p.id !== project.id));
        } else {
          const error = await response.json();
          throw new Error(error.error || '删除项目失败');
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert(`删除项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
  };



  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载项目...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-600 mt-2">管理你的所有工作项目</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索项目..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">助手类型:</span>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">全部</option>
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
            <span>新建项目</span>
          </button>
        </div>
      </div>

      {/* Projects Table */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchQuery || filterAgent !== 'all' ? '未找到匹配的项目' : '还没有项目'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterAgent !== 'all' ? '尝试调整搜索条件或筛选器' : '创建你的第一个项目开始工作'}
          </p>
          {!searchQuery && filterAgent === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              新建项目
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    项目
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    助手类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    路径
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后访问
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project, index) => (
                  <tr 
                    key={project.id + '-' + index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-xl mr-3">{project.agentIcon}</div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {project.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: project.agentColor + '20',
                          color: project.agentColor
                        }}
                      >
                        {project.agentName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Folder className="w-4 h-4" />
                        <span className="truncate max-w-sm" title={project.path}>
                          {project.path}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(project.path)}
                          className="hover:text-gray-700 transition-colors"
                          title="复制路径"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatRelativeTime(project.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{formatRelativeTime(project.lastAccessed)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenProject(project)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white rounded-md hover:opacity-90 transition-colors"
                          style={{ backgroundColor: project.agentColor }}
                          title="打开项目"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          继续工作
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除项目"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateProject}
        agents={enabledAgents}
      />
    </div>
  );
};