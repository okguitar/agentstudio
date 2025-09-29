import React, { useState } from 'react';
import { Folder, FolderPlus, X, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { AgentConfig } from '../types/index.js';
import { useCreateProject, useAgentProjects } from '../hooks/useAgents.js';
import { FileBrowser } from './FileBrowser.js';

interface ProjectSelectorProps {
  agent: AgentConfig;
  onProjectSelect: (projectPath: string) => void;
  onClose: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  agent,
  onProjectSelect,
  onClose
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showNewProjectBrowser, setShowNewProjectBrowser] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>('');
  const [showProjectNameDialog, setShowProjectNameDialog] = useState(false);
  const createProject = useCreateProject();
  const queryClient = useQueryClient();
  
  // Get projects for this specific agent
  const { data: agentProjectsData, isLoading: projectsLoading } = useAgentProjects(agent.id);
  const agentProjects = agentProjectsData?.projects || [];

  const handleNewProject = async () => {
    // Quick create with default settings
    setIsCreatingProject(true);
    try {
      // Generate new project directory with English name
      const agentNameEn = agent.id.replace(/[-_]/g, '-');
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const projectName = `${agentNameEn}-project-${timestamp}`;
      
      const result = await createProject.mutateAsync({
        agentId: agent.id,
        projectName
      });
      
      // Refresh agent projects data to show the new project in recent projects
      await queryClient.invalidateQueries({ queryKey: ['agent-projects', agent.id] });
      
      onProjectSelect(result.project.path);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(`创建项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsCreatingProject(false);
    }
  };
  
  const handleNewProjectWithCustomLocation = () => {
    setShowNewProjectBrowser(true);
  };
  
  const handleNewProjectDirectory = (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      setSelectedDirectory(path);
      setShowNewProjectBrowser(false);
      setShowProjectNameDialog(true);
    }
  };

  const handleCreateProject = async (projectName: string) => {
    setIsCreatingProject(true);
    try {
      // Create project in selected directory or default location
      let finalProjectName = projectName;
      
      const result = await createProject.mutateAsync({
        agentId: agent.id,
        projectName: finalProjectName,
        parentDirectory: selectedDirectory || undefined
      });
      
      // Refresh agent projects data to show the new project in recent projects
      await queryClient.invalidateQueries({ queryKey: ['agent-projects', agent.id] });
      
      onProjectSelect(result.project.path);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(`创建项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsCreatingProject(false);
      setShowProjectNameDialog(false);
      setSelectedDirectory('');
    }
  };

  const handleBrowseProject = () => {
    setShowFileBrowser(true);
  };

  const handleFileSelect = async (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      // Normalize paths for comparison
      const normalizedPath = path.replace(/\/$/, ''); // Remove trailing slash
      const normalizedProjects = agentProjects.map((p: any) => p.path.replace(/\/$/, ''));
      
      // Check if this directory is already in agent's projects
      let isExistingProject = normalizedProjects.includes(normalizedPath);
      
      // If not found in agent.projects, check if the directory has agent sessions
      if (!isExistingProject) {
        try {
          const response = await fetch(`/api/files/browse?path=${encodeURIComponent(path)}/.cc-sessions`);
          if (response.ok) {
            const data = await response.json();
            // Check if agent's session directory exists
            const hasAgentSessions = data.items?.some((item: any) => 
              item.isDirectory && item.name === agent.id
            );
            if (hasAgentSessions) {
              isExistingProject = true;
            }
          }
        } catch (error) {
          // Ignore error, just use projects array result
        }
      }
      
      console.log('Path comparison:', {
        selectedPath: normalizedPath,
        agentProjects: normalizedProjects,
        isExisting: isExistingProject
      });
      
      if (isExistingProject) {
        // Directory is already a project, select it directly
        onProjectSelect(path);
        setShowFileBrowser(false);
      } else {
        // Directory is not a project yet, ask user if they want to import it
        const confirmed = window.confirm(
          `该目录尚未作为 ${agent.name} 的项目。\n\n是否要将此目录导入作为新项目？\n\n路径: ${path}`
        );
        
        if (confirmed) {
          // Add this directory to agent's projects and select it
          onProjectSelect(path);
          setShowFileBrowser(false);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{agent.ui.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-500">选择项目目录</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Main Content - Left Right Layout */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Left Panel - Action Buttons */}
          <div className="w-full md:w-1/2 p-6 md:border-r border-gray-200">
            <h4 className="text-base font-medium text-gray-900 mb-4">项目操作</h4>
            <div className="space-y-3">
              <button
                onClick={handleNewProject}
                disabled={isCreatingProject}
                className="w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: agent.ui.primaryColor + '40', backgroundColor: agent.ui.primaryColor + '08' }}
              >
                <div className="flex-shrink-0">
                  <FolderPlus className={`w-6 h-6 ${isCreatingProject ? 'text-gray-400' : ''}`} style={{ color: isCreatingProject ? undefined : agent.ui.primaryColor }} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900">
                    {isCreatingProject ? '正在创建项目...' : '快速新建项目'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    在 ~/claude-code-projects 中自动创建
                  </div>
                </div>
              </button>
              
              <button
                onClick={handleNewProjectWithCustomLocation}
                disabled={isCreatingProject}
                className="w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0">
                  <FolderPlus className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900">自定义位置新建</div>
                  <div className="text-sm text-gray-500 mt-1">选择目录和项目名称</div>
                </div>
              </button>
              
              <button
                onClick={handleBrowseProject}
                className="w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Search className="w-6 h-6 text-gray-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900">浏览选择项目</div>
                  <div className="text-sm text-gray-500 mt-1">通过文件浏览器选择项目目录</div>
                </div>
              </button>
            </div>
          </div>

          {/* Right Panel - Recent Projects */}
          <div className="w-full md:w-1/2 p-6 flex flex-col min-h-[300px] md:min-h-0">
            <h4 className="text-base font-medium text-gray-900 mb-4">最近使用的项目</h4>
            
            {projectsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
                  <p className="text-sm">正在加载项目...</p>
                </div>
              </div>
            ) : agentProjects.length > 0 ? (
              <div className="flex-1 overflow-hidden">
                <div className="space-y-2 max-h-full overflow-y-auto">
                  {agentProjects.map((project: any, index: number) => (
                    <button
                      key={project.id || index}
                      onClick={() => onProjectSelect(project.path)}
                      className="w-full flex items-center space-x-3 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div 
                        className="w-5 h-5 flex-shrink-0 text-xl"
                        style={{ color: project.defaultAgentColor || '#3B82F6' }}
                      >
                        {project.defaultAgentIcon || '📁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate mt-1">
                          {project.path}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          最后访问: {new Date(project.lastAccessed).toLocaleString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Folder className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-base font-medium">暂无最近使用的项目</p>
                  <p className="text-sm text-gray-400 mt-1">创建新项目开始使用</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
      
      {/* File Browser Modal for Browsing Projects */}
      {showFileBrowser && (
        <FileBrowser
          title="选择项目目录"
          allowFiles={false}
          allowDirectories={true}
          onSelect={handleFileSelect}
          onClose={() => setShowFileBrowser(false)}
        />
      )}
      
      {/* File Browser Modal for New Project Directory */}
      {showNewProjectBrowser && (
        <FileBrowser
          title="选择新项目的父目录"
          allowFiles={false}
          allowDirectories={true}
          allowNewDirectory={true}
          onSelect={handleNewProjectDirectory}
          onClose={() => setShowNewProjectBrowser(false)}
        />
      )}
      
      {/* Project Name Dialog */}
      {showProjectNameDialog && (
        <ProjectNameDialog
          parentDirectory={selectedDirectory}
          onConfirm={handleCreateProject}
          onCancel={() => {
            setShowProjectNameDialog(false);
            setSelectedDirectory('');
          }}
        />
      )}
    </div>
  );
};

interface ProjectNameDialogProps {
  parentDirectory: string;
  onConfirm: (projectName: string) => void;
  onCancel: () => void;
}

const ProjectNameDialog: React.FC<ProjectNameDialogProps> = ({ parentDirectory, onConfirm, onCancel }) => {
  const [projectName, setProjectName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onConfirm(projectName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">创建新项目</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            项目将在以下目录中创建：
          </p>
          <div className="p-2 bg-gray-100 rounded text-sm font-mono text-gray-800 break-all">
            {parentDirectory}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              项目名称
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="输入项目名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!projectName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};