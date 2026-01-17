import React, { useState } from 'react';
import { FileExplorer } from './FileExplorer';
import { FloatingToggle } from './FloatingToggle';
import { LAVSViewContainer } from './LAVSViewContainer';
import { useAgentLAVS } from '../hooks/useAgentLAVS';
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
}) => {
  // Check if agent has LAVS
  const { hasLAVS, loading: lavsLoading } = useAgentLAVS(agent.id);

  // LAVS view replaces custom view
  const hasLAVSView = hasLAVS && !lavsLoading;

  // View type: 'lavs' or 'files'
  const [currentView, setCurrentView] = useState<'files' | 'lavs'>('files');

  // Switch to LAVS view when it becomes available
  React.useEffect(() => {
    if (hasLAVSView && currentView === 'files') {
      console.log('[RightPanel] LAVS loaded, switching to LAVS view');
      setCurrentView('lavs');
    }
  }, [hasLAVSView]);

  // Debug logging
  React.useEffect(() => {
    console.log('[RightPanel] State:', { hasLAVSView, currentView, lavsLoading });
  }, [hasLAVSView, currentView, lavsLoading]);

  return (
    <>
      {/* 主内容区域 - 移除标题栏,最大化利用空间 */}
      <div className="h-full bg-white dark:bg-gray-900 overflow-hidden">
        {hasLAVSView ? (
          // Has LAVS: Show LAVS and files views
          <>
            {/* LAVS View */}
            {currentView === 'lavs' && (
              <div className="h-full">
                <LAVSViewContainer
                  agent={agent}
                  projectPath={projectPath}
                />
              </div>
            )}

            {/* 文件浏览器视图 */}
            {currentView === 'files' && (
              <div className="h-full">
                <FileExplorer
                  projectPath={projectPath}
                  onFileSelect={(filePath) => {
                    console.log('Selected file:', filePath);
                  }}
                  className="h-full"
                />
              </div>
            )}
          </>
        ) : (
          // No LAVS: Just show files
          <FileExplorer
            projectPath={projectPath}
            onFileSelect={(filePath) => {
              console.log('Selected file:', filePath);
            }}
            className="h-full"
          />
        )}
      </div>

      {/* 右下角浮动切换按钮 */}
      <FloatingToggle
        currentView={currentView}
        onViewChange={setCurrentView}
        hasCustomComponent={false} // LAVS replaces custom
        hasLAVS={hasLAVSView}
        className="floating-toggle"
      />
    </>
  );
};
