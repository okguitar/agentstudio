import React from 'react';
import { Code, Folder, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AgentPanelProps } from '../../types.js';

export const CodeExplorerPanel: React.FC<AgentPanelProps> = ({ projectPath }) => {
  const { t } = useTranslation('agents');

  // TODO: 实现代码浏览器功能
  // 这里先提供一个基础框架，后续可以扩展

  const handleOpenFile = () => {
    // TODO: 实现打开文件的逻辑
    console.log('Open file');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="px-5 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-1">
            <Code className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">{t('codeExplorer.title')}</h2>
          </div>
          <div className="text-sm text-gray-600">
            {projectPath ? t('codeExplorer.projectWithPath', { path: projectPath }) : t('codeExplorer.description')}
          </div>
        </div>
        
        <button
          onClick={handleOpenFile}
          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('codeExplorer.openFile')}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Folder className="w-12 h-12 text-gray-300 mb-4" />
          <div className="text-lg mb-2">{t('codeExplorer.featureTitle')}</div>
          <div className="text-sm text-center">
            {t('codeExplorer.comingSoon')}<br />
            {t('codeExplorer.chatManagement')}
          </div>
        </div>
      </div>
    </div>
  );
};
