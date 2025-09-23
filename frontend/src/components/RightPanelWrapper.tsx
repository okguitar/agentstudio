import React, { useState } from 'react';
import { FileText, Folder } from 'lucide-react';
import { FileExplorer } from './FileExplorer';
import type { AgentConfig } from '../types/index.js';

interface RightPanelWrapperProps {
  agent: AgentConfig;
  projectPath?: string;
  CustomComponent?: React.ComponentType<{ agent: AgentConfig; projectPath?: string }>;
}

export const RightPanelWrapper: React.FC<RightPanelWrapperProps> = ({ 
  agent, 
  projectPath, 
  CustomComponent 
}) => {
  // 如果有自定义组件，默认显示自定义视图，否则显示文件视图
  const [currentView, setCurrentView] = useState<'files' | 'custom'>(
    CustomComponent ? 'custom' : 'files'
  );

  return (
    <div className="h-full bg-white relative">
      {/* 悬浮的视图切换按钮 - 只有自定义组件时才显示 */}
      {CustomComponent && (
        <div className="absolute top-4 right-4 z-10 flex bg-white shadow-md rounded-lg border border-gray-200">
          <button
            onClick={() => setCurrentView('custom')}
            className={`p-2 rounded-l-lg transition-colors ${
              currentView === 'custom'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="Agent 视图"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentView('files')}
            className={`p-2 rounded-r-lg transition-colors ${
              currentView === 'files'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="文件浏览器"
          >
            <Folder className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 内容区域 */}
      <div className="h-full overflow-hidden">
        {currentView === 'files' ? (
          <FileExplorer 
            projectPath={projectPath}
            onFileSelect={(filePath) => {
              console.log('Selected file:', filePath);
              // 可以在这里添加文件选择的处理逻辑，比如插入到聊天中
            }}
            className="h-full"
          />
        ) : (
          CustomComponent && (
            <CustomComponent 
              agent={agent} 
              projectPath={projectPath} 
            />
          )
        )}
      </div>
    </div>
  );
};
