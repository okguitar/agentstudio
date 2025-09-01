import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SplitLayoutProps {
  children: [React.ReactNode, React.ReactNode];
  defaultLeftWidth?: number; // 默认左侧宽度百分比
  minWidth?: number; // 最小宽度百分比
  maxWidth?: number; // 最大宽度百分比
}

export const SplitLayout: React.FC<SplitLayoutProps> = ({ 
  children,
  defaultLeftWidth = 35,
  minWidth = 20,
  maxWidth = 80
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
        style={{ width: `${leftPanelWidth}%` }}
      >
        {children[0]}
      </div>
      
      {/* 拖拽分隔条 */}
      <div
        className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors relative ${
          isDragging ? 'bg-blue-500' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* 视觉指示器 */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-400 opacity-50 hover:opacity-100" />
      </div>
      
      {/* 右侧面板 */}
      <div 
        className="flex flex-col border-l border-gray-200"
        style={{ width: `${100 - leftPanelWidth}%` }}
      >
        {children[1]}
      </div>
    </div>
  );
};
