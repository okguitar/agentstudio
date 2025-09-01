import React from 'react';
import { useSlides } from '../hooks/useSlides';
import { SlidePreview } from './SlidePreview';
import type { AgentPanelProps } from '../../types.js';

export const SlidePreviewPanel: React.FC<AgentPanelProps> = () => {
  const { data: slidesData, isLoading, error } = useSlides();

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
      <div className="px-5 py-4 bg-white border-b border-gray-200">
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
      </div>

      {/* Slides List */}
      <div className="flex-1 overflow-y-auto">
        {slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-5">
            <div className="text-lg mb-2">还没有幻灯片</div>
            <div className="text-sm">与AI聊天来创建幻灯片</div>
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
