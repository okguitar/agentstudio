import React from 'react';
import { Code, Folder, Plus } from 'lucide-react';
import type { AgentPanelProps } from '../../types.js';

export const CodeExplorerPanel: React.FC<AgentPanelProps> = ({ projectPath }) => {
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
            <h2 className="text-lg font-semibold text-gray-800">代码浏览器</h2>
          </div>
          <div className="text-sm text-gray-600">
            {projectPath ? `项目: ${projectPath}` : '代码文件和结构管理'}
          </div>
        </div>
        
        <button
          onClick={handleOpenFile}
          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>打开文件</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Folder className="w-12 h-12 text-gray-300 mb-4" />
          <div className="text-lg mb-2">代码浏览器功能</div>
          <div className="text-sm text-center">
            即将推出...<br />
            您可以通过聊天来管理代码文件
          </div>
        </div>
      </div>
    </div>
  );
};
