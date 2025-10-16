import React, { useState } from 'react';
import { FileExplorer } from './FileExplorer';
import { FloatingToggle } from './FloatingToggle';
import type { AgentConfig } from '../types/index.js';

interface RightPanelWrapperProps {
  agent: AgentConfig;
  projectPath?: string;
  CustomComponent?: React.ComponentType<{ agent: AgentConfig; projectPath?: string }>;
  onTogglePanel?: (hidden: boolean) => void; // 通知父组件隐藏/显示面板
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

  const hasCustomComponent = !!CustomComponent;

  return (
    <>
      {/* 主内容区域 - 移除标题栏，最大化利用空间 */}
      <div className="h-full bg-white dark:bg-gray-900 overflow-hidden">
        {hasCustomComponent ? (
          // 有自定义组件：保活两个视图，通过显示/隐藏控制
          <>
            {/* Agent自定义视图 */}
            <div className={`h-full ${currentView === 'custom' ? 'block' : 'hidden'}`}>
              <CustomComponent 
                agent={agent} 
                projectPath={projectPath} 
              />
            </div>
            
            {/* 文件浏览器视图 */}
            <div className={`h-full ${currentView === 'files' ? 'block' : 'hidden'}`}>
              <FileExplorer 
                projectPath={projectPath}
                onFileSelect={(filePath) => {
                  console.log('Selected file:', filePath);
                  // 可以在这里添加文件选择的处理逻辑，比如插入到聊天中
                }}
                className="h-full"
              />
            </div>
          </>
        ) : (
          // 无自定义组件：直接显示文件浏览器
          <FileExplorer 
            projectPath={projectPath}
            onFileSelect={(filePath) => {
              console.log('Selected file:', filePath);
              // 可以在这里添加文件选择的处理逻辑，比如插入到聊天中
            }}
            className="h-full"
          />
        )}
      </div>

      {/* 右下角浮动切换按钮 */}
      <FloatingToggle
        currentView={currentView}
        onViewChange={setCurrentView}
        hasCustomComponent={hasCustomComponent}
        className="floating-toggle"
      />
    </>
  );
};
