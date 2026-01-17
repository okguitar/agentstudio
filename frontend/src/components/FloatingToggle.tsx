import React from 'react';
import { FileText, Folder } from 'lucide-react';

interface FloatingToggleProps {
  currentView: 'files' | 'lavs';
  onViewChange: (view: 'files' | 'lavs') => void;
  hasCustomComponent: boolean; // Kept for backward compatibility, but not used
  hasLAVS?: boolean;
  className?: string;
}

export const FloatingToggle: React.FC<FloatingToggleProps> = ({
  currentView,
  onViewChange,
  hasLAVS = false,
  className = ''
}) => {
  // 如果没有 LAVS，不显示切换按钮 (LAVS replaces custom view)
  if (!hasLAVS) {
    return null;
  }

  const toggleView = () => {
    // Toggle between files and LAVS
    console.log('[FloatingToggle] Current view:', currentView, 'hasLAVS:', hasLAVS);

    if (currentView === 'files') {
      console.log('[FloatingToggle] Switching files -> LAVS');
      onViewChange('lavs');
    } else {
      console.log('[FloatingToggle] Switching LAVS -> files');
      onViewChange('files');
    }
  };

  // Determine the icon and next view text based on current state
  const getViewInfo = () => {
    // Simple toggle between LAVS and files
    return currentView === 'files'
      ? { icon: FileText, text: 'LAVS 界面' }
      : { icon: Folder, text: '文件浏览器' };
  };

  const { icon: CurrentIcon, text: nextViewText } = getViewInfo();

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