import React, { useState } from 'react';
import { Folder, FolderPlus, X, Search, FolderOpen } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { AgentConfig } from '../types/index.js';
import { useCreateProject, useImportProject, useAgentProjects } from '../hooks/useAgents.js';
import { FileBrowser } from './FileBrowser.js';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { showError } from '../utils/toast';

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
  const { t } = useTranslation('components');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showNewProjectBrowser, setShowNewProjectBrowser] = useState(false);
  const [showImportBrowser, setShowImportBrowser] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<string>('');
  const [showProjectNameDialog, setShowProjectNameDialog] = useState(false);
  const createProject = useCreateProject();
  const importProject = useImportProject();
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
      showError(
        t('projectSelector.createProjectFailed', { error: '' }),
        error instanceof Error ? error.message : t('projectSelector.unknownError')
      );
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
      const finalProjectName = projectName;
      
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
      showError(
        t('projectSelector.createProjectFailed', { error: '' }),
        error instanceof Error ? error.message : t('projectSelector.unknownError')
      );
    } finally {
      setIsCreatingProject(false);
      setShowProjectNameDialog(false);
      setSelectedDirectory('');
    }
  };

  const handleBrowseProject = () => {
    setShowFileBrowser(true);
  };

  const handleImportProject = () => {
    setShowImportBrowser(true);
  };

  const handleImportFileSelect = async (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      // Normalize paths for comparison
      const normalizedPath = path.replace(/\/$/, ''); // Remove trailing slash
      const normalizedProjects = agentProjects.map((p: any) => p.path.replace(/\/$/, ''));
      
      // Check if this directory is already in agent's projects
      let isExistingProject = normalizedProjects.includes(normalizedPath);
      
      // If not found in agent.projects, check if the directory has agent sessions
      if (!isExistingProject) {
        try {
          const response = await authFetch(`${API_BASE}/files/browse?path=${encodeURIComponent(path)}/.cc-sessions`);
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
      
      console.log('Import path comparison:', {
        selectedPath: normalizedPath,
        agentProjects: normalizedProjects,
        isExisting: isExistingProject
      });
      
      if (isExistingProject) {
        // Directory is already a project, select it directly
        onProjectSelect(path);
        setShowImportBrowser(false);
      } else {
        // Directory is not a project yet, ask user if they want to import it
        const confirmed = window.confirm(
          t('projectSelector.importConfirmation', { agentName: agent.name, path })
        );

        if (confirmed) {
          try {
            // Import the project via API
            await importProject.mutateAsync({
              agentId: agent.id,
              projectPath: path
            });
            
            // Refresh agent projects data to show the imported project
            await queryClient.invalidateQueries({ queryKey: ['agent-projects', agent.id] });
            
            onProjectSelect(path);
            setShowImportBrowser(false);
          } catch (error) {
            console.error('Failed to import project:', error);
            showError(
              t('projectSelector.importProjectFailed', { error: '' }),
              error instanceof Error ? error.message : t('projectSelector.unknownError')
            );
          }
        }
      }
    }
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
          const response = await authFetch(`${API_BASE}/files/browse?path=${encodeURIComponent(path)}/.cc-sessions`);
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
          t('projectSelector.importConfirmation', { agentName: agent.name, path })
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
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{agent.ui.icon}</div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('projectSelector.selectProjectDirectory')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content - Left Right Layout */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Left Panel - Action Buttons */}
          <div className="w-full md:w-1/2 p-6 md:border-r border-gray-200 dark:border-gray-700">
            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">{t('projectSelector.projectActions')}</h4>
            <div className="space-y-3">
              <button
                onClick={handleNewProject}
                disabled={isCreatingProject}
                className="w-full flex items-center space-x-4 p-4 border border-primary/40 dark:border-primary/60 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0">
                  <FolderPlus className={`w-6 h-6 ${isCreatingProject ? 'text-gray-400 dark:text-gray-500' : 'text-primary'}`} />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {isCreatingProject ? t('projectSelector.creatingProject') : t('projectSelector.quickCreateProject')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('projectSelector.quickCreateDescription')}
                  </div>
                </div>
              </button>

              <button
                onClick={handleNewProjectWithCustomLocation}
                disabled={isCreatingProject}
                className="w-full flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0">
                  <FolderPlus className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('projectSelector.customLocationCreate')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('projectSelector.customLocationDescription')}</div>
                </div>
              </button>

              <button
                onClick={handleBrowseProject}
                className="w-full flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Search className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{t('projectSelector.browseProject')}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('projectSelector.browseDescription')}</div>
                </div>
              </button>
                </div>
              </button>
            </div>
          </div>

          {/* Right Panel - Recent Projects */}
          <div className="w-full md:w-1/2 p-6 flex flex-col min-h-[300px] md:min-h-0">
            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">{t('projectSelector.recentProjects')}</h4>

            {projectsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-500 rounded-full mx-auto mb-3"></div>
                  <p className="text-sm">{t('projectSelector.loadingProjects')}</p>
                </div>
              </div>
            ) : agentProjects.length > 0 ? (
              <div className="flex-1 overflow-hidden">
                <div className="space-y-2 max-h-full overflow-y-auto">
                  {agentProjects.map((project: any, index: number) => (
                    <button
                      key={project.id || index}
                      onClick={() => onProjectSelect(project.path)}
                      className="w-full flex items-center space-x-3 p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div
                        className="w-5 h-5 flex-shrink-0 text-xl text-primary"
                      >
                        {project.defaultAgentIcon || '📁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {project.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {project.path}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {t('projectSelector.lastAccessed', {
                            date: new Date(project.lastAccessed).toLocaleString()
                          })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Folder className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-base font-medium">{t('projectSelector.noRecentProjects')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('projectSelector.createProjectToStart')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            {t('projectSelector.cancel')}
          </button>
        </div>
      </div>
      
      {/* File Browser Modal for Browsing Projects */}
      {showFileBrowser && (
        <FileBrowser
          title={t('projectSelector.selectProjectDirectory')}
          allowFiles={false}
          allowDirectories={true}
          onSelect={handleFileSelect}
          onClose={() => setShowFileBrowser(false)}
        />
      )}

      {/* File Browser Modal for New Project Directory */}
      {showNewProjectBrowser && (
        <FileBrowser
          title={t('projectSelector.selectParentDirectory')}
          allowFiles={false}
          allowDirectories={true}
          allowNewDirectory={true}
          onSelect={handleNewProjectDirectory}
          onClose={() => setShowNewProjectBrowser(false)}
        />
      )}

      {/* File Browser Modal for Importing Projects */}
      {showImportBrowser && (
        <FileBrowser
          title={t('projectSelector.importProject')}
          allowFiles={false}
          allowDirectories={true}
          onSelect={handleImportFileSelect}
          onClose={() => setShowImportBrowser(false)}
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
  const { t } = useTranslation('components');
  const [projectName, setProjectName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onConfirm(projectName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('projectSelector.dialog.createNewProject')}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('projectSelector.dialog.projectWillBeCreatedAt')}
          </p>
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
            {parentDirectory}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('projectSelector.dialog.projectName')}
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('projectSelector.dialog.projectNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {t('projectSelector.dialog.cancel')}
            </button>
            <button
              type="submit"
              disabled={!projectName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('projectSelector.dialog.createProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};