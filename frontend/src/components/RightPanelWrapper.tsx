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
  CustomComponent
}) => {
  // Check if agent has LAVS
  const { hasLAVS, loading: lavsLoading } = useAgentLAVS(agent.id);

  // Determine what views are available
  const hasCustomComponent = !!CustomComponent;
  const hasLAVSView = hasLAVS && !lavsLoading;

  // If has LAVS, prioritize it over custom component, otherwise use custom or files
  const defaultView = hasLAVSView ? 'lavs' : hasCustomComponent ? 'custom' : 'files';

  // 如果有自定义组件或 LAVS，默认显示它们，否则显示文件视图
  const [currentView, setCurrentView] = useState<'files' | 'custom' | 'lavs'>(defaultView);

  // Update view when LAVS status changes
  React.useEffect(() => {
    if (hasLAVSView && currentView === 'files' && !hasCustomComponent) {
      setCurrentView('lavs');
    }
  }, [hasLAVSView, hasCustomComponent, currentView]);

  return (
    <>
      {/* 主内容区域 - 移除标题栏，最大化利用空间 */}
      <div className="h-full bg-white dark:bg-gray-900 overflow-hidden">
        {hasLAVSView ? (
          // Has LAVS: Show LAVS, custom, and files views
          <>
            {/* LAVS View */}
            <div className={`h-full ${currentView === 'lavs' ? 'block' : 'hidden'}`}>
              <LAVSViewContainer
                agent={agent}
                projectPath={projectPath}
              />
            </div>

            {/* Agent自定义视图 (if exists) */}
            {hasCustomComponent && (
              <div className={`h-full ${currentView === 'custom' ? 'block' : 'hidden'}`}>
                <CustomComponent
                  agent={agent}
                  projectPath={projectPath}
                />
              </div>
            )}

            {/* 文件浏览器视图 */}
            <div className={`h-full ${currentView === 'files' ? 'block' : 'hidden'}`}>
              <FileExplorer
                projectPath={projectPath}
                onFileSelect={(filePath) => {
                  console.log('Selected file:', filePath);
                }}
                className="h-full"
              />
            </div>
          </>
        ) : hasCustomComponent ? (
          // No LAVS, but has custom component: Show custom and files
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
                }}
                className="h-full"
              />
            </div>
          </>
        ) : (
          // No LAVS, no custom component: Just show files
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
        hasCustomComponent={hasCustomComponent || hasLAVSView}
        className="floating-toggle"
      />
    </>
  );
};
