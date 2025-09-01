import React from 'react';
import { FileText, Plus } from 'lucide-react';
import type { AgentPanelProps } from '../../types.js';

export const DocumentOutlinePanel: React.FC<AgentPanelProps> = () => {
  // TODO: 实现文档大纲功能
  // 这里先提供一个基础框架，后续可以扩展

  const handleCreateSection = () => {
    // TODO: 实现创建新章节的逻辑
    console.log('Create new section');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="px-5 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-1">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-800">文档大纲</h2>
          </div>
          <div className="text-sm text-gray-600">
            文档结构和章节管理
          </div>
        </div>
        
        <button
          onClick={handleCreateSection}
          className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>新建章节</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mb-4" />
          <div className="text-lg mb-2">文档大纲功能</div>
          <div className="text-sm text-center">
            即将推出...<br />
            您可以通过聊天来管理文档内容
          </div>
        </div>
      </div>
    </div>
  );
};
