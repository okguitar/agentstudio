import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PanelToggleProps {
  isPanelVisible: boolean;
  onToggle: () => void;
  position: 'left' | 'right';
  className?: string;
}

export const PanelToggle: React.FC<PanelToggleProps> = ({
  isPanelVisible,
  onToggle,
  position,
  className = ''
}) => {
  // 根据位置和面板状态确定箭头方向
  const getArrowDirection = () => {
    if (position === 'left') {
      return isPanelVisible ? 'left' : 'right';
    } else {
      return isPanelVisible ? 'right' : 'left';
    }
  };

  const arrowDirection = getArrowDirection();
  const ArrowIcon = arrowDirection === 'left' ? ChevronLeft : ChevronRight;

  // 根据位置确定样式
  const getPositionClasses = () => {
    const baseClasses = 'absolute top-1/2 transform -translate-y-1/2 z-20';
    
    if (position === 'left') {
      // 左侧面板的按钮：位于面板左边缘
      return `${baseClasses} left-2`;
    } else {
      // 右侧面板的按钮：位于面板右边缘
      return `${baseClasses} right-2`;
    }
  };

  return (
    <button
      onClick={onToggle}
      className={`
        ${getPositionClasses()}
        w-8 h-8 rounded-full 
        bg-gray-500/10 dark:bg-gray-400/10 
        border border-gray-500/20 dark:border-gray-400/20
        text-gray-600 dark:text-gray-300
        hover:bg-gray-500/20 dark:hover:bg-gray-400/20
        hover:scale-110 hover:border-gray-500/40 dark:hover:border-gray-400/40
        hover:text-gray-800 dark:hover:text-white
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        backdrop-blur-sm
        shadow-sm hover:shadow-md
        ${className}
      `}
      title={position === 'left' 
        ? (isPanelVisible ? '隐藏聊天界面' : '显示聊天界面')
        : (isPanelVisible ? '隐藏可视化界面' : '显示可视化界面')
      }
    >
      <ArrowIcon className="w-4 h-4" />
    </button>
  );
};