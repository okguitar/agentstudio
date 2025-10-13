import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMobileContext } from '../contexts/MobileContext';

interface SplitLayoutProps {
  children: [React.ReactNode, React.ReactNode];
  defaultLeftWidth?: number; // 默认左侧宽度百分比
  minWidth?: number; // 最小宽度百分比
  maxWidth?: number; // 最大宽度百分比
  hideRightPanel?: boolean; // 是否隐藏右侧面板
  onShowRightPanel?: () => void; // 显示右侧面板的回调
  mobileLayout?: 'stack' | 'tabs'; // 移动端布局方式
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({
  children,
  defaultLeftWidth = 35,
  minWidth = 20,
  maxWidth = 80,
  hideRightPanel = false,
  onShowRightPanel,
  mobileLayout = 'stack'
}) => {
  const { isMobile, rightPanelOpen, setRightPanelOpen } = useMobileContext();
  const [leftPanelWidth, setLeftPanelWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理鼠标按下事件 - 只在桌面端启用
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
  };

  // 处理鼠标移动事件 - 只在桌面端启用
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current || isMobile) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // 限制在最小和最大宽度之间
    const clampedWidth = Math.min(Math.max(newWidthPercent, minWidth), maxWidth);
    setLeftPanelWidth(clampedWidth);
  }, [isDragging, minWidth, maxWidth, isMobile]);

  // 处理鼠标释放事件
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 鼠标事件监听器 - 只在桌面端启用
  useEffect(() => {
    if (isDragging && !isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, isMobile]);

  // 移动端布局渲染
  if (isMobile) {
    if (mobileLayout === 'tabs') {
      // 只有当右侧面板存在且未隐藏时才显示 tabs
      const shouldShowTabs = !hideRightPanel;

      return (
        <div className="flex flex-col h-full bg-gray-100">
          {/* Tab Navigation - 只在必要时显示 */}
          {shouldShowTabs && (
            <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
              <button
                onClick={() => {
                  setActiveTab('left');
                  setRightPanelOpen(false);
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'left' && !rightPanelOpen
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  setActiveTab('right');
                  setRightPanelOpen(true);
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'right' || rightPanelOpen
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Preview
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {(!hideRightPanel && shouldShowTabs && (activeTab === 'right' || rightPanelOpen)) ? (
              <div className="h-full">
                {children[1]}
              </div>
            ) : (
              <div className="h-full">
                {children[0]}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Stack layout (default)
    return (
      <div className="flex flex-col h-full bg-gray-100">
        {/* Main Panel - Always visible */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children[0]}
        </div>

        {/* Right Panel - Modal/Overlay when open */}
        {!hideRightPanel && rightPanelOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={() => setRightPanelOpen(false)}
            />

            {/* Panel Content */}
            <div className="absolute inset-4 bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100%-73px)]">
                {children[1]}
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Button to open right panel */}
        {!hideRightPanel && !rightPanelOpen && onShowRightPanel && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors lg:hidden"
            title="Open Preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // 桌面端布局
  return (
    <div ref={containerRef} className="flex h-full bg-gray-100">
      {/* 左侧面板 */}
      <div
        className="flex flex-col"
        style={{ width: hideRightPanel ? '100%' : `${leftPanelWidth}%` }}
      >
        {children[0]}
      </div>

      {/* 拖拽分隔条 - 只在右侧面板显示时显示 */}
      {!hideRightPanel && (
        <div
          className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors relative ${
            isDragging ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* 视觉指示器 */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-400 opacity-50 hover:opacity-100" />
        </div>
      )}

      {/* 右侧面板 - 只在不隐藏时显示 */}
      {!hideRightPanel && (
        <div
          className="flex flex-col border-l border-gray-200"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {children[1]}
        </div>
      )}

      {/* 右侧展示条 - 只在面板隐藏时显示 */}
      {hideRightPanel && onShowRightPanel && (
        <div
          className="fixed top-0 right-0 h-full w-2 bg-blue-500 opacity-60 hover:opacity-90 hover:w-4 hover:bg-blue-600 transition-all duration-300 cursor-pointer z-50 group"
          onClick={onShowRightPanel}
          title="点击显示右侧面板"
        >
          {/* 悬浮时显示的中心指示器 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-white opacity-0 group-hover:opacity-70 transition-opacity duration-300 rounded-full" />
        </div>
      )}
    </div>
  );
};
