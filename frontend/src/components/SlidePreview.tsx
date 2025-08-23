import React, { useEffect, useRef, useState } from 'react';
import { Eye, Code } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import type { Slide } from '../types/index.js';
import { useSlideContent } from '../hooks/useSlides';

interface SlidePreviewProps {
  slide: Slide;
  totalSlides: number;
}

export const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, totalSlides }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  
  const { data: slideContent } = useSlideContent(slide.index);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || viewMode !== 'preview') return;

    const handleLoad = () => {
      setIsLoading(false);
      setError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setError(true);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [viewMode]);

  // Highlight code when switching to code view or when content loads
  useEffect(() => {
    if (viewMode === 'code' && slideContent) {
      // Delay to ensure DOM is ready
      setTimeout(() => {
        Prism.highlightAll();
      }, 0);
    }
  }, [viewMode, slideContent]);

  // Calculate aspect ratio container dimensions
  const aspectRatio = 1280 / 720; // 16:9
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with tabs and page indicator */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* Tab buttons */}
          <div className="flex space-x-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'preview'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>预览</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'code'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>代码</span>
            </button>
          </div>
          
          {/* Page indicator */}
          <div className="text-sm text-gray-500 font-medium">
            {slide.index + 1}/{totalSlides}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === 'preview' ? (
          // Preview mode - iframe with 1280:720 aspect ratio
          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden" 
               style={{ aspectRatio: `${aspectRatio}` }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-sm text-gray-500">加载中...</div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-sm text-red-500">加载失败</div>
              </div>
            )}
            
            {slide.exists && (
              <iframe
                ref={iframeRef}
                src={`/slides/${slide.path.replace('slides/', '')}`}
                className="w-full h-full border-none"
                style={{ display: isLoading || error ? 'none' : 'block' }}
              />
            )}
            
            {!slide.exists && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-sm text-orange-500">文件不存在</div>
              </div>
            )}
          </div>
        ) : (
          // Code mode - show HTML source with syntax highlighting
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" 
               style={{ aspectRatio: `${aspectRatio}` }}>
            {slideContent ? (
              <div className="h-full overflow-y-auto">
                <pre className="language-html h-full m-0 p-4 text-sm" style={{ backgroundColor: '#2d3748' }}>
                  <code className="language-html text-gray-100">
                    {slideContent.content}
                  </code>
                </pre>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500">加载代码中...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};