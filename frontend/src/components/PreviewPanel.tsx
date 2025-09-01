import React from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../stores/useAppStore';
import { useSlides } from '../hooks/useSlides';
import { SlidePreview } from './SlidePreview';

/**
 * @deprecated 此组件已被插件架构替代
 * 现在由 agents/slides/components/SlidePreviewPanel.tsx 提供幻灯片预览功能
 * 保留此文件是为了向后兼容性，将来可能会移除
 */
export const PreviewPanel: React.FC = () => {
  const { addMessage } = useAppStore();
  const { data: slidesData, isLoading, error } = useSlides();

  const handleCreateSlide = () => {
    addMessage({
      content: '我想创建一张新的幻灯片',
      role: 'user'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">加载失败，请刷新页面重试</div>
      </div>
    );
  }

  const slides = slidesData?.slides || [];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header - matching height with left panel */}
      <div className="px-5 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-1">
            <h2 className="text-lg font-semibold text-gray-800">幻灯片预览</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {slidesData?.title || 'Presentation'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            共 {slides.length} 张幻灯片
          </div>
        </div>
        
        <button
          onClick={handleCreateSlide}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>新建</span>
        </button>
      </div>

      {/* Slides List */}
      <div className="flex-1 overflow-y-auto">
        {slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-5">
            <div className="text-lg mb-2">还没有幻灯片</div>
            <div className="text-sm mb-4">点击"新建"按钮或与AI聊天来创建第一张幻灯片</div>
            <button
              onClick={handleCreateSlide}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>创建第一张幻灯片</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {slides.map((slide) => (
              <SlidePreview
                key={slide.index}
                slide={slide}
                totalSlides={slides.length}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};