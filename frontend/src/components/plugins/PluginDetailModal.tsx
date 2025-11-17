import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileText, Code, Zap, Bot, Webhook, Server, Eye, FolderOpen } from 'lucide-react';
import { usePluginDetail, useFileContent } from '../../hooks/usePlugins';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { FileExplorer } from '../FileExplorer';
import { PluginComponent } from '../../types/plugins';

interface PluginDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketplaceName: string;
  pluginName: string;
}

type ViewMode = 'overview' | 'file' | 'directory';

export const PluginDetailModal: React.FC<PluginDetailModalProps> = ({
  isOpen,
  onClose,
  marketplaceName,
  pluginName,
}) => {
  const { t } = useTranslation('pages');
  const { data: pluginDetail, isLoading } = usePluginDetail(
    isOpen ? marketplaceName : null,
    isOpen ? pluginName : null
  );
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  // Debug: log the plugin detail structure
  React.useEffect(() => {
    if (pluginDetail) {
      console.log('Plugin Detail Data:', pluginDetail);
    }
  }, [pluginDetail]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  
  const { data: fileContentData } = useFileContent(
    selectedFile ? marketplaceName : null,
    selectedFile ? pluginName : null,
    selectedFile
  );

  const handleViewFile = (component: PluginComponent) => {
    setSelectedFile(component.relativePath);
    setViewMode('file');
  };

  const handleViewDirectory = (component: PluginComponent) => {
    // For skills, the directory is the parent of SKILL.md
    const dirPath = component.relativePath.includes('/')
      ? component.relativePath.substring(0, component.relativePath.lastIndexOf('/'))
      : '';
    setSelectedDirectory(dirPath);
    setViewMode('directory');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedFile(null);
    setSelectedDirectory(null);
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'command':
        return <Code className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'agent':
        return <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'skill':
        return <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'hook':
        return <Webhook className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'mcp':
        return <Server className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getComponentTypeName = (type: string) => {
    const typeKey = `plugins.detail.componentTypes.${type}`;
    return t(typeKey, { defaultValue: type });
  };

  if (!isOpen) return null;

  // Collect all components into a single list
  const allComponents: Array<PluginComponent & { typeLabel: string }> = [];
  if (pluginDetail?.components) {
    pluginDetail.components.commands?.forEach(c => allComponents.push({ ...c, typeLabel: 'command' }));
    pluginDetail.components.agents?.forEach(c => allComponents.push({ ...c, typeLabel: 'agent' }));
    pluginDetail.components.skills?.forEach(c => allComponents.push({ ...c, typeLabel: 'skill' }));
    pluginDetail.components.hooks?.forEach(c => allComponents.push({ ...c, typeLabel: 'hook' }));
    pluginDetail.components.mcpServers?.forEach(c => allComponents.push({ ...c, typeLabel: 'mcp' }));
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] w-full h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {viewMode === 'overview' && (pluginDetail?.manifest?.name || pluginName)}
              {viewMode === 'file' && (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
                    ← {t('plugins.detail.back')}
                  </Button>
                  <span className="text-base">{selectedFile}</span>
                </div>
              )}
              {viewMode === 'directory' && (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
                    ← {t('plugins.detail.back')}
                  </Button>
                  <span className="text-base">{selectedDirectory || t('plugins.detail.root')}</span>
                </div>
              )}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : pluginDetail ? (
          <div className="flex-1 overflow-hidden min-h-0">
            {/* Overview Mode */}
            {viewMode === 'overview' && (
              <div className="h-full overflow-y-auto p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {pluginDetail?.manifest?.name || pluginName}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {pluginDetail?.manifest?.description || pluginDetail?.plugin?.manifest?.description || t('plugins.detail.noDescription')}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('plugins.detail.version')}</h4>
                      <p className="text-gray-900 dark:text-white">
                        {pluginDetail?.manifest?.version || pluginDetail?.plugin?.manifest?.version || '-'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('plugins.detail.author')}</h4>
                      <p className="text-gray-900 dark:text-white">
                        {(() => {
                          const author = pluginDetail?.manifest?.author || pluginDetail?.plugin?.manifest?.author;
                          if (!author) return '-';
                          return typeof author === 'string' ? author : author.name;
                        })()}
                      </p>
                    </div>
                    {(pluginDetail?.manifest?.license || pluginDetail?.plugin?.manifest?.license) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('plugins.detail.license')}</h4>
                        <p className="text-gray-900 dark:text-white">
                          {pluginDetail?.manifest?.license || pluginDetail?.plugin?.manifest?.license}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Components Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('plugins.detail.components')} ({allComponents.length})
                  </h3>
                  {allComponents.length > 0 ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('plugins.detail.type')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('plugins.detail.name')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('plugins.detail.description')}
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {t('plugins.detail.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {allComponents.map((component, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {getComponentIcon(component.type)}
                                  <span className="text-sm text-gray-900 dark:text-white">
                                    {getComponentTypeName(component.type)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-gray-900 dark:text-white">
                                  {component.name}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {component.description || '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewFile(component)}
                                  title={t('plugins.detail.viewEntryFile')}
                                  className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {component.type === 'skill' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewDirectory(component)}
                                    title={t('plugins.detail.browseDirectory')}
                                    className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {t('plugins.detail.noComponents')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File View Mode */}
            {viewMode === 'file' && (
              <div className="h-full overflow-y-auto p-6">
                {fileContentData ? (
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 rounded-lg font-mono">
                    {fileContentData.content}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            )}

            {/* Directory View Mode */}
            {viewMode === 'directory' && pluginDetail?.plugin?.installPath && (
              <FileExplorer
                projectPath={
                  selectedDirectory
                    ? `${pluginDetail.plugin.installPath}/${selectedDirectory}`
                    : pluginDetail.plugin.installPath
                }
                onFileSelect={(filePath) => {
                  console.log('Selected file:', filePath);
                }}
                className="h-full"
              />
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {t('plugins.detail.loadFailed')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};




