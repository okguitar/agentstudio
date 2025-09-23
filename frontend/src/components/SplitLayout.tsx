import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SplitLayoutProps {
  children: [React.ReactNode, React.ReactNode];
  defaultLeftWidth?: number; // 默认左侧宽度百分比
  minWidth?: number; // 最小宽度百分比
  maxWidth?: number; // 最大宽度百分比
  hideRightPanel?: boolean; // 是否隐藏右侧面板
  onShowRightPanel?: () => void; // 显示右侧面板的回调
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({ 
  children,
  defaultLeftWidth = 35,
  minWidth = 20,
  maxWidth = 80,
  hideRightPanel = false,
  onShowRightPanel
}) => {
  const [leftPanelWidth, setLeftPanelWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // 处理鼠标移动事件
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // 限制在最小和最大宽度之间
    const clampedWidth = Math.min(Math.max(newWidthPercent, minWidth), maxWidth);
    setLeftPanelWidth(clampedWidth);
  }, [isDragging, minWidth, maxWidth]);

  // 处理鼠标释放事件
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 鼠标事件监听器
  useEffect(() => {
    if (isDragging) {
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
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
