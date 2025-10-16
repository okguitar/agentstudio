import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, ArrowRight, GripVertical, Folder } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting target element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'hover'; // 预期的用户动作
}

interface ChatGuideProps {
  onComplete: () => void;
  isOpen: boolean;
}

const GUIDE_KEY = 'agentstudio_chat_guide_completed';

export const ChatGuide: React.FC<ChatGuideProps> = ({ onComplete, isOpen }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const highlightRef = useRef<HTMLDivElement>(null);

  const guideSteps: GuideStep[] = [
    {
      id: 'welcome',
      title: '欢迎使用 AgentStudio',
      description: '这是一个简单的向导，帮助您了解界面布局和操作方式。点击"下一步"继续。',
      position: 'center'
    },
    {
      id: 'left-panel',
      title: '聊天界面',
      description: '这里是您与AI助手对话的主要区域。您可以在这里输入问题、查看对话历史。',
      target: '.panel-toggle-left',
      position: 'right',
      action: 'click'
    },
    {
      id: 'right-panel', 
      title: '可视化界面',
      description: '这里显示文件浏览器或Agent的自定义界面。您可以查看文件、预览内容或使用专用工具。',
      target: '.panel-toggle-right',
      position: 'left', 
      action: 'click'
    },
    {
      id: 'separator',
      title: '分隔条',
      description: '拖拽中间的灰色分隔条可以调整左右面板的大小比例，让界面更符合您的使用习惯。',
      target: '.resize-separator',
      position: 'bottom'
    },
    {
      id: 'panel-toggle',
      title: '面板切换',
      description: '点击面板边缘的半透明按钮可以隐藏/显示对应的面板，让您专注于当前工作。',
      target: '.panel-toggle-left, .panel-toggle-right',
      position: 'center'
    },
    {
      id: 'floating-toggle',
      title: '视图切换',
      description: '右下角的浮动按钮可以在文件浏览器和Agent界面之间快速切换（仅在有Agent界面时显示）。',
      target: '.floating-toggle',
      position: 'top'
    },
    {
      id: 'complete',
      title: '完成！',
      description: '您已经了解了基本操作。现在开始探索AgentStudio的强大功能吧！',
      position: 'center'
    }
  ];

  // 检查是否已完成向导
  useEffect(() => {
    if (isOpen) {
      const completed = localStorage.getItem(GUIDE_KEY);
      if (completed === 'true') {
        onComplete();
      }
    }
  }, [isOpen, onComplete]);

  // 更新高亮位置
  useEffect(() => {
    if (!isOpen || currentStep >= guideSteps.length) return;

    const step = guideSteps[currentStep];
    if (step.target) {
      updateHighlightPosition(step.target);
    }
  }, [currentStep, isOpen, guideSteps]);

  const updateHighlightPosition = (selector: string) => {
    const targetElement = document.querySelector(selector) as HTMLElement;
    if (targetElement && highlightRef.current) {
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      setHighlightPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height
      });
    }
  };

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(GUIDE_KEY, 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(GUIDE_KEY, 'true');
    onComplete();
  };

  if (!isOpen || currentStep >= guideSteps.length) {
    return null;
  }

  const step = guideSteps[currentStep];
  const isLastStep = currentStep === guideSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const getGuidePosition = () => {
    if (!step.target || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const basePosition = { ...highlightPosition };
    
    switch (step.position) {
      case 'top':
        return {
          top: `${basePosition.top - 120}px`,
          left: `${basePosition.left + basePosition.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: `${basePosition.top + basePosition.height + 20}px`,
          left: `${basePosition.left + basePosition.width / 2}px`,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          top: `${basePosition.top + basePosition.height / 2}px`,
          left: `${basePosition.left - 20}px`,
          transform: 'translateY(-50%) translateX(-100%)'
        };
      case 'right':
        return {
          top: `${basePosition.top + basePosition.height / 2}px`,
          left: `${basePosition.left + basePosition.width + 20}px`,
          transform: 'translateY(-50%)'
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  const guidePosition = getGuidePosition();

  return (
    <>
      {/* 高亮层 */}
      {step.target && (
        <div
          ref={highlightRef}
          className="fixed pointer-events-none z-50 transition-all duration-300"
          style={{
            top: highlightPosition.top,
            left: highlightPosition.left,
            width: highlightPosition.width,
            height: highlightPosition.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            border: '2px solid #3B82F6'
          }}
        />
      )}

      {/* 向导内容 */}
      <div
        className="fixed z-[60] bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm transition-all duration-300"
        style={guidePosition}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="跳过向导"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 图标 */}
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
          {step.id === 'left-panel' && <ArrowLeft className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          {step.id === 'right-panel' && <ArrowRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          {step.id === 'separator' && <GripVertical className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          {step.id === 'floating-toggle' && <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          {(step.id === 'welcome' || step.id === 'panel-toggle' || step.id === 'complete') && (
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {step.id === 'welcome' ? '1' : step.id === 'complete' ? '✓' : 'i'}
              </span>
            </div>
          )}
        </div>

        {/* 标题和描述 */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {step.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* 进度指示器 */}
        <div className="flex space-x-1 mb-6">
          {guideSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-blue-600'
                  : index < currentStep
                  ? 'bg-blue-300'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isFirstStep
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            上一步
          </button>
          
          <div className="flex space-x-2">
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                跳过
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              {isLastStep ? '开始使用' : '下一步'}
            </button>
          </div>
        </div>

        {/* 步骤计数 */}
        <div className="text-center mt-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentStep + 1} / {guideSteps.length}
          </span>
        </div>
      </div>
    </>
  );
};