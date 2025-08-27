import React, { useState } from 'react';
import { Folder, FolderPlus, X, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { AgentConfig } from '../types/index.js';
import { useCreateProject } from '../hooks/useAgents.js';
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
      
      // Refresh agents data to show the new project in recent projects
      await queryClient.invalidateQueries({ queryKey: ['agents'] });
      await queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
      
      onProjectSelect(result.projectPath);
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
      let parentDir = selectedDirectory;
      
      const result = await createProject.mutateAsync({
        agentId: agent.id,
        projectName: finalProjectName,
        parentDirectory: selectedDirectory || undefined
      });
      
      // Refresh agents data to show the new project in recent projects
      await queryClient.invalidateQueries({ queryKey: ['agents'] });
      await queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
      
      onProjectSelect(result.projectPath);
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
      const normalizedProjects = (agent.projects || []).map(p => p.replace(/\/$/, ''));
      
      // Check if this directory is already in agent's projects
      let isExistingProject = normalizedProjects.includes(normalizedPath);
      
      // If not found in agent.projects, check if the directory has agent sessions
      if (!isExistingProject) {
        try {
          const response = await fetch(`/api/agents/filesystem/browse?path=${encodeURIComponent(path)}/.cc-sessions`);
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{agent.ui.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-500">选择项目目录</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Recent Projects */}
        {agent.projects && agent.projects.length > 0 ? (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">最近使用的项目</h4>
            <div className={`space-y-2 ${agent.projects.length > 6 ? 'max-h-80 overflow-y-auto' : ''}`}>
              {agent.projects.map((project, index) => (
                <button
                  key={index}
                  onClick={() => onProjectSelect(project)}
                  className="w-full flex items-center space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
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
        ) : (
          <div className="mb-6 text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">暂无最近使用的项目</p>
            <p className="text-xs text-gray-400">创建新项目开始使用</p>
          </div>
        )}

        {/* Project Options */}
        <div className="space-y-2 mb-4">
          <button
            onClick={handleNewProject}
            disabled={isCreatingProject}
            className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: agent.ui.primaryColor + '40', backgroundColor: agent.ui.primaryColor + '08' }}
          >
            <FolderPlus className={`w-5 h-5 ${isCreatingProject ? 'text-gray-400' : ''}`} style={{ color: isCreatingProject ? undefined : agent.ui.primaryColor }} />
            <div className="text-left">
              <div className="font-medium text-gray-900">
                {isCreatingProject ? '正在创建项目...' : '快速新建项目'}
              </div>
              <div className="text-sm text-gray-500">
                在 ~/claude-code-projects 中自动创建
              </div>
            </div>
          </button>
          
          <button
            onClick={handleNewProjectWithCustomLocation}
            disabled={isCreatingProject}
            className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderPlus className="w-5 h-5 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">自定义位置新建</div>
              <div className="text-sm text-gray-500">选择目录和项目名称</div>
            </div>
          </button>
          
          <button
            onClick={handleBrowseProject}
            className="w-full flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-600" />
            <div className="text-left">
              <div className="font-medium text-gray-900">浏览选择项目</div>
              <div className="text-sm text-gray-500">通过文件浏览器选择项目目录</div>
            </div>
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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