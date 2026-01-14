import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Code, Check, Maximize2, ZoomIn, ZoomOut, X } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  isDark?: boolean;
}

// 全局计数器，用于生成唯一ID
let diagramCounter = 0;

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code, isDark = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagramId] = useState(() => `mermaid-diagram-${++diagramCounter}`);
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0); // 0 表示 "适应窗口" 模式

  // 复制源码到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 渲染图表的通用函数
  const renderDiagram = async (container: HTMLDivElement, id: string, isFullscreen = false, fitToContainer = false) => {
    try {
      // 初始化 Mermaid 配置
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'strict', // 安全模式，防止XSS攻击
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        suppressErrorRendering: true, // 禁止 Mermaid 自动渲染错误到页面
        themeVariables: {
          darkMode: isDark,
        },
      });

      // 清空容器
      container.innerHTML = '';

      // 渲染图表
      const { svg } = await mermaid.render(id, code);

      // 创建包装器并设置样式
      const wrapper = document.createElement('div');
      wrapper.className = 'flex justify-center items-start w-full h-full';
      wrapper.innerHTML = svg;

      // 清空容器并添加包装后的 SVG
      container.innerHTML = '';
      container.appendChild(wrapper);

      // 设置 SVG 样式，让它适应容器
      const svgElement = wrapper.querySelector('svg') as SVGSVGElement;
      if (svgElement) {
        // 获取 SVG 的原始尺寸（在移除属性之前保存）
        const viewBox = svgElement.getAttribute('viewBox');
        const widthAttr = svgElement.getAttribute('width');
        const heightAttr = svgElement.getAttribute('height');

        // 确保 viewBox 存在，这样 SVG 才能正确缩放
        if (!viewBox && widthAttr && heightAttr) {
          svgElement.setAttribute('viewBox', `0 0 ${widthAttr} ${heightAttr}`);
        }

        // 从 viewBox 获取原始尺寸（这才是真实的图表尺寸）
        let originalWidth = 0;
        let originalHeight = 0;

        // 优先使用 viewBox，如果没有则创建
        const finalViewBox = viewBox || (widthAttr && heightAttr ? `0 0 ${widthAttr} ${heightAttr}` : null);

        if (finalViewBox) {
          const vbParts = finalViewBox.split(/\s+/);
          if (vbParts.length === 4) {
            originalWidth = parseFloat(vbParts[2]);
            originalHeight = parseFloat(vbParts[3]);
          }
        }

        // 移除固定宽高
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');

        // 根据模式设置样式
        if (fitToContainer) {
          if (isFullscreen) {
            // 全屏适应模式：让图表真正适应容器
            svgElement.style.maxWidth = '100%';
            svgElement.style.maxHeight = '100%';
            svgElement.style.width = 'auto';
            svgElement.style.height = 'auto';
          } else {
            // 主视图模式
            svgElement.style.maxWidth = '100%';
            svgElement.style.maxHeight = '560px';
            svgElement.style.width = 'auto';
            svgElement.style.height = 'auto';
          }

          // 全屏适应模式不需要额外处理，基准就是当前显示状态
          if (isFullscreen && originalWidth && originalHeight) {
            console.log('适应模式：以当前显示为 100% 基准');
          }
        } else {
          // 原始大小模式（用于缩放）
          svgElement.style.maxWidth = 'none';
          svgElement.style.maxHeight = 'none';
          svgElement.style.width = 'auto';
          svgElement.style.height = 'auto';
        }
      }

      setError(null);
    } catch (err) {
      console.error('Mermaid 渲染错误:', err);
      setError(err instanceof Error ? err.message : '渲染图表时发生错误');

      // 清理 Mermaid 可能自动插入的错误元素
      setTimeout(() => {
        const errorElements = document.querySelectorAll('[id^="dmermaid"], .error-icon, .error-text');
        errorElements.forEach(el => el.remove());
      }, 100);
    }
  };

  // 渲染主图表
  useEffect(() => {
    if (containerRef.current) {
      renderDiagram(containerRef.current, diagramId, false, true);
    }
  }, [code, isDark, diagramId]);

  // 渲染全屏图表
  useEffect(() => {
    if (showFullscreen && fullscreenContainerRef.current) {
      // 保存当前滚动位置
      const scrollEl = fullscreenScrollRef.current;
      const savedScroll = scrollEl ? { x: scrollEl.scrollLeft, y: scrollEl.scrollTop } : null;

      // zoomLevel === 0 表示"适应窗口"模式
      const fitToContainer = zoomLevel === 0;
      renderDiagram(fullscreenContainerRef.current, `${diagramId}-fullscreen`, true, fitToContainer);

      // 延迟恢复滚动位置（等待 DOM 更新）
      if (savedScroll && scrollEl && zoomLevel !== 0) {
        setTimeout(() => {
          scrollEl.scrollLeft = savedScroll.x;
          scrollEl.scrollTop = savedScroll.y;
        }, 50);
      }
    }
  }, [showFullscreen, code, isDark, diagramId, zoomLevel]);

  // 处理缩放变化
  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
  };

  // 获取当前的基准缩放比例（用于 +/- 操作）
  const getBaseZoom = () => {
    // 适应模式是 100% 基准
    if (zoomLevel === 0) {
      return 100;
    }
    return zoomLevel;
  };

  // 处理放大
  const handleZoomIn = () => {
    const baseZoom = getBaseZoom();
    const newZoom = Math.min(200, baseZoom + 10);
    console.log('放大:', { baseZoom, newZoom, zoomLevel });
    handleZoomChange(newZoom);
  };

  // 处理缩小
  const handleZoomOut = () => {
    const baseZoom = getBaseZoom();
    const newZoom = Math.max(50, baseZoom - 10);
    console.log('缩小:', { baseZoom, newZoom, zoomLevel });
    handleZoomChange(newZoom);
  };

  if (error) {
    return (
      <div className="my-2 border border-red-300 dark:border-red-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* 紧凑的错误头部 */}
        <details className="group">
          <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors list-none">
            <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-800 dark:text-red-200 flex-1">
              Mermaid 图表语法错误
            </span>
            <svg
              className="w-4 h-4 text-red-600 dark:text-red-400 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>

          {/* 详细错误信息（默认收起） */}
          <div className="border-t border-red-200 dark:border-red-800">
            <div className="p-3 bg-red-50 dark:bg-red-900/10">
              {/* 错误消息 */}
              <div className="mb-3">
                <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">错误信息:</div>
                <div className="text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 p-2 rounded border border-red-200 dark:border-red-800 font-mono">
                  {error}
                </div>
              </div>

              {/* 原始代码 */}
              <div>
                <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">原始代码:</div>
                <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-red-200 dark:border-red-800 overflow-x-auto max-h-40 overflow-y-auto">
                  <code className="text-red-800 dark:text-red-200 font-mono">{code}</code>
                </pre>
              </div>
            </div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">Mermaid 图表</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* 全屏查看按钮 */}
          <button
            onClick={() => setShowFullscreen(true)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="全屏查看"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* 查看源码按钮 */}
          <button
            onClick={() => setShowSource(!showSource)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title={showSource ? "隐藏源码" : "查看源码"}
          >
            <Code className="w-4 h-4" />
          </button>

          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title="复制源码"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 图表渲染区域 - 添加最大高度限制，显示完整图表概览 */}
      <div
        ref={containerRef}
        className="flex items-center justify-center py-3 px-4"
        style={{ maxHeight: '600px', minHeight: '200px' }}
      />

      {/* 源码显示区域 */}
      {showSource && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-900 dark:bg-gray-950 p-4 rounded-b-lg overflow-x-auto">
            <pre className="text-sm text-gray-100 font-mono">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* 全屏查看弹窗 */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* 全屏工具栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="font-medium">Mermaid 图表</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* 缩放控制 */}
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={`缩小 (当前${getBaseZoom()}%)`}
                    disabled={getBaseZoom() <= 50}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[4rem] text-center">
                    {zoomLevel === 0 ? '适应' : `${zoomLevel}%`}
                  </span>

                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={`放大 (当前${getBaseZoom()}%)`}
                    disabled={getBaseZoom() >= 200}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleZoomChange(100)}
                    className="px-2 py-1 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                    title="100% 原始大小"
                  >
                    100%
                  </button>

                  <button
                    onClick={() => handleZoomChange(0)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      zoomLevel === 0
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                    title="适应窗口大小"
                  >
                    适应
                  </button>
                </div>

                {/* 关闭按钮 */}
                <button
                  onClick={() => {
                    setShowFullscreen(false);
                    setZoomLevel(0);
                  }}
                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 全屏图表区域 */}
            <div
              ref={fullscreenScrollRef}
              className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900"
            >
              <div
                ref={fullscreenContainerRef}
                className={
                  zoomLevel === 0
                    ? 'w-full h-full flex items-center justify-center'
                    : 'flex items-center justify-center min-h-full'
                }
                style={
                  zoomLevel === 0
                    ? {} // 适应窗口模式，不应用 transform
                    : (() => {
                        // 适应模式是 100%，其他缩放直接应用
                        const scale = zoomLevel / 100;
                        
                        console.log('应用变换:', { 
                          zoomLevel, 
                          scale,
                          message: '适应模式为100%基准，直接应用缩放'
                        });
                        
                        return {
                          transform: `scale(${scale})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.2s ease-in-out'
                        };
                      })()
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
