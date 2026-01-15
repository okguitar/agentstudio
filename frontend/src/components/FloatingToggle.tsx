import React from 'react';
import { FileText, Folder } from 'lucide-react';

interface FloatingToggleProps {
  currentView: 'files' | 'custom' | 'lavs';
  onViewChange: (view: 'files' | 'custom' | 'lavs') => void;
  hasCustomComponent: boolean;
  className?: string;
}

export const FloatingToggle: React.FC<FloatingToggleProps> = ({
  currentView,
  onViewChange,
  hasCustomComponent,
  className = ''
}) => {
  // 如果没有自定义组件，不显示切换按钮
  if (!hasCustomComponent) {
    return null;
  }

  const toggleView = () => {
    // Cycle through views: files -> custom/lavs -> files
    if (currentView === 'files') {
      onViewChange('custom');
    } else if (currentView === 'custom' || currentView === 'lavs') {
      onViewChange('files');
    }
  };

  const CurrentIcon = currentView === 'files' ? Folder : FileText;
  const nextViewText = currentView === 'files' ? 'Agent 界面' : '文件浏览器';

  return (
    <button
      onClick={toggleView}
      className={`
        fixed bottom-6 right-6 z-30
        w-12 h-12 rounded-full
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-600
        shadow-lg hover:shadow-xl
        text-gray-600 dark:text-gray-300
        hover:text-blue-600 dark:hover:text-blue-400
        hover:bg-blue-50 dark:hover:bg-blue-900/20
        hover:border-blue-200 dark:hover:border-blue-700
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        group
        backdrop-blur-sm
        ${className}
      `}
      title={`切换到${nextViewText}`}
    >
      <CurrentIcon className="w-5 h-5" />
      
      {/* 悬浮时显示的提示文本 */}
      <div className={`
        absolute bottom-full right-0 mb-2 px-2 py-1
        bg-gray-900 dark:bg-gray-700
        text-white text-xs rounded
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        pointer-events-none
        whitespace-nowrap
      `}>
        {nextViewText}
      </div>
    </button>
  );
};