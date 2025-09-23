import React, { useState, useRef, useEffect } from 'react';
import { FileText, Folder, GripVertical, X, Eye, EyeOff } from 'lucide-react';
import { FileExplorer } from './FileExplorer';
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
  CustomComponent,
  onTogglePanel
}) => {
  // 如果有自定义组件，默认显示自定义视图，否则显示文件视图
  const [currentView, setCurrentView] = useState<'files' | 'custom'>(
    CustomComponent ? 'custom' : 'files'
  );
  
  // 拖拽相关状态 - 使用固定位置相对于视口
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化位置到屏幕右下角的固定位置
  useEffect(() => {
    const setInitialPosition = () => {
      if (dragRef.current) {
        const dragElement = dragRef.current.getBoundingClientRect();
        // 固定在距离屏幕右下角的位置
        setPosition({
          x: window.innerWidth - dragElement.width - 16, // 距离右边16px
          y: window.innerHeight - dragElement.height - 16 // 距离底部16px
        });
      }
    };

    // 延迟设置初始位置，确保DOM已渲染
    const timer = setTimeout(setInitialPosition, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []); // 只在组件挂载时执行一次

  // 监听窗口大小变化并调整位置到屏幕边界内
  useEffect(() => {
    const handleWindowResize = () => {
      if (dragRef.current) {
        const dragElement = dragRef.current.getBoundingClientRect();
        
        setPosition(prevPosition => {
          // 确保按钮在屏幕范围内
          const maxX = window.innerWidth - dragElement.width - 16;
          const maxY = window.innerHeight - dragElement.height - 16;
          
          const newX = Math.min(Math.max(16, prevPosition.x), maxX);
          const newY = Math.min(Math.max(16, prevPosition.y), maxY);
          
          // 只有当位置需要调整时才更新
          if (newX !== prevPosition.x || newY !== prevPosition.y) {
            return { x: newX, y: newY };
          }
          return prevPosition;
        });
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []); // 只监听窗口大小变化

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  // 处理拖拽移动 - 基于屏幕坐标
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;

      const dragElement = dragRef.current.getBoundingClientRect();
      
      // 基于屏幕坐标计算新位置
      const newX = Math.max(16, Math.min(
        window.innerWidth - dragElement.width - 16,
        e.clientX - dragStart.x
      ));
      const newY = Math.max(16, Math.min(
        window.innerHeight - dragElement.height - 16,
        e.clientY - dragStart.y
      ));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div ref={containerRef} className="h-full bg-white relative">
      {/* 可拖拽的控制按钮 - 固定定位到屏幕 */}
      <div 
        ref={dragRef}
        className={`fixed z-50 flex bg-white shadow-lg rounded-lg border border-gray-200 transition-shadow ${
          isDragging ? 'shadow-xl' : 'shadow-lg'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* 拖拽手柄 */}
        <div 
          className="flex items-center px-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing border-r border-gray-200"
          onMouseDown={handleMouseDown}
          title="拖拽移动"
        >
          <GripVertical className="w-3 h-3" />
        </div>
        
        {CustomComponent ? (
          // 有自定义组件：显示视图切换按钮
          <>
            <button
              onClick={() => setCurrentView('custom')}
              className={`p-2 transition-colors ${
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
          </>
        ) : (
          // 无自定义组件：显示面板隐藏按钮
          <button
            onClick={() => {
              onTogglePanel?.(true); // 通知父组件隐藏整个右侧面板
            }}
            className="p-2 rounded-r-lg transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            title="隐藏文件浏览器"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="h-full overflow-hidden">
        {CustomComponent ? (
          // 有自定义组件：根据currentView显示对应内容
          currentView === 'files' ? (
            <FileExplorer 
              projectPath={projectPath}
              onFileSelect={(filePath) => {
                console.log('Selected file:', filePath);
                // 可以在这里添加文件选择的处理逻辑，比如插入到聊天中
              }}
              className="h-full"
            />
          ) : (
            <CustomComponent 
              agent={agent} 
              projectPath={projectPath} 
            />
          )
        ) : (
          // 无自定义组件：直接显示文件浏览器（因为隐藏按钮会隐藏整个面板）
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
    </div>
  );
};
