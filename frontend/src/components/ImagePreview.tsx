import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImagePreviewProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!images || images.length === 0) return 0;
    return Math.min(initialIndex, images.length - 1);
  });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate fit-to-window scale
  const calculateFitScale = () => {
    if (!imageRef.current || !containerRef.current) return 1;
    
    const image = imageRef.current;
    const container = containerRef.current;
    
    // Get actual image dimensions
    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;
    
    // Get container dimensions (subtract toolbar and instruction heights)
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight - 120; // Account for toolbar (80px) + instructions (40px)
    
    // Calculate scale to fit
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    
    // Use the smaller scale to ensure the image fits completely
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up if image is smaller than container
    
    return fitScale;
  };

  // Auto-fit image when loaded
  const handleImageLoad = () => {
    setIsImageLoaded(true);
    const fitScale = calculateFitScale();
    setScale(fitScale);
    setPosition({ x: 0, y: 0 }); // Center the image
  };

  // Get current image URL
  const currentImageUrl = images && images.length > 0 ? images[currentIndex] : null;

  // Navigation functions
  const goToPrevious = () => {
    if (images && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (images && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Update currentIndex when images or initialIndex changes
  useEffect(() => {
    if (images && images.length > 0) {
      const safeIndex = Math.min(initialIndex, images.length - 1);
      setCurrentIndex(safeIndex);
    }
  }, [images, initialIndex]);

  // Reset preview state when changing image
  useEffect(() => {
    if (currentImageUrl) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
      setIsImageLoaded(false);
    }
  }, [currentImageUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentImageUrl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowDown':
          e.preventDefault();
          goToNext();
          break;
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoom('in');
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoom('out');
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleReset();
          }
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRotate();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageUrl, currentIndex, images?.length]);

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      const newScale = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.1, Math.min(5, newScale));
    });
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === imageRef.current) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 'out' : 'in';
    handleZoom(delta);
  };

  // Handle download
  const handleDownload = () => {
    if (currentImageUrl) {
      const link = document.createElement('a');
      link.href = currentImageUrl;
      link.download = `image-${currentIndex + 1}.jpg`;
      link.click();
    }
  };

  // Reset image to center and fit
  const handleReset = () => {
    const fitScale = calculateFitScale();
    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  if (!images || images.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onClose();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black bg-opacity-50 rounded-lg px-4 py-2 z-10">
        {/* Image counter */}
        {images.length > 1 && (
          <>
            <span className="text-white text-sm">
              {currentIndex + 1} / {images.length}
            </span>
            <div className="w-px h-6 bg-gray-500"></div>
          </>
        )}
        <button
          onClick={() => handleZoom('out')}
          className="text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="缩小 (Ctrl + -)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        
        <span className="text-white text-sm min-w-16 text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <button
          onClick={() => handleZoom('in')}
          className="text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="放大 (Ctrl + +)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        
        <div className="w-px h-6 bg-gray-500"></div>
        
        <button
          onClick={handleRotate}
          className="text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="旋转 90°"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        
        <button
          onClick={handleReset}
          className="text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-sm"
          title="适应窗口大小"
        >
          适应
        </button>
        
        <button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setRotation(0);
          }}
          className="text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-sm"
          title="显示原始大小"
        >
          1:1
        </button>
        
        <button
          onClick={handleDownload}
          className="text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="下载图片"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          {/* Left arrow */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-white p-3 rounded-full transition-all z-10 ${
              currentIndex === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:text-gray-300 hover:bg-white hover:bg-opacity-20'
            }`}
            title="上一张 (←)"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          {/* Right arrow */}
          <button
            onClick={goToNext}
            disabled={currentIndex === images.length - 1}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-white p-3 rounded-full transition-all z-10 ${
              currentIndex === images.length - 1 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:text-gray-300 hover:bg-white hover:bg-opacity-20'
            }`}
            title="下一张 (→)"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors z-10"
        title="关闭预览 (ESC)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image */}
      <img
        ref={imageRef}
        src={currentImageUrl}
        alt={`图片预览 ${currentIndex + 1}/${images.length}`}
        className={`max-w-none transition-transform ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          maxHeight: 'none',
          maxWidth: 'none',
          opacity: isImageLoaded ? 1 : 0
        }}
        onLoad={handleImageLoad}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleReset}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 rounded px-3 py-1">
        {images.length > 1 
          ? '方向键切换 • 鼠标拖拽移动 • 滚轮缩放 • 双击适应窗口 • ESC关闭'
          : '鼠标拖拽移动 • 滚轮缩放 • 双击适应窗口 • ESC关闭'
        }
      </div>
    </div>
  );
};
