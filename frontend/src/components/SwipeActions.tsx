import React, { useRef, useEffect } from 'react';
import { Brain, Command, Bot, Trash2, CheckCircle, Edit } from 'lucide-react';

interface ProjectSwipeActionsProps {
  children: React.ReactNode;
  onMemoryManagement: () => void;
  onCommandManagement: () => void;
  onSubAgentManagement: () => void;
  onDeleteProject: () => void;
  className?: string;
}

interface McpSwipeActionsProps {
  children: React.ReactNode;
  onValidate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export const SwipeActions: React.FC<ProjectSwipeActionsProps> = ({
  children,
  onMemoryManagement,
  onCommandManagement,
  onSubAgentManagement,
  onDeleteProject,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const actions = actionsRef.current;
    if (!container || !actions) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      isDragging.current = true;
      container.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;

      currentX.current = e.touches[0].clientX;
      const deltaX = currentX.current - startX.current;

      // Only allow left swipe (negative deltaX)
      if (deltaX < 0) {
        const maxSwipe = -200; // Maximum swipe distance (60% of container width)
        const translateX = Math.max(deltaX, maxSwipe);
        container.style.transform = `translateX(${translateX}px)`;

        // Show actions progressively
        const progress = Math.abs(deltaX) / Math.abs(maxSwipe);
        actions.style.opacity = progress.toString();
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      const deltaX = currentX.current - startX.current;
      const threshold = -100; // Threshold to snap to open state

      container.style.transition = 'transform 0.3s ease';

      if (deltaX < threshold) {
        // Snap to open state
        container.style.transform = 'translateX(-200px)';
        actions.style.opacity = '1';
      } else {
        // Snap to closed state
        container.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
      }
    };

    const handleMouseStart = (e: MouseEvent) => {
      startX.current = e.clientX;
      isDragging.current = true;
      container.style.transition = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      currentX.current = e.clientX;
      const deltaX = currentX.current - startX.current;

      // Only allow left swipe (negative deltaX)
      if (deltaX < 0) {
        const maxSwipe = -200; // Maximum swipe distance (60% of container width)
        const translateX = Math.max(deltaX, maxSwipe);
        container.style.transform = `translateX(${translateX}px)`;

        // Show actions progressively
        const progress = Math.abs(deltaX) / Math.abs(maxSwipe);
        actions.style.opacity = progress.toString();
      }
    };

    const handleMouseEnd = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      const deltaX = currentX.current - startX.current;
      const threshold = -100; // Threshold to snap to open state

      container.style.transition = 'transform 0.3s ease';

      if (deltaX < threshold) {
        // Snap to open state
        container.style.transform = 'translateX(-200px)';
        actions.style.opacity = '1';
      } else {
        // Snap to closed state
        container.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
      }
    };

    // Touch events for mobile
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse events for desktop testing
    container.addEventListener('mousedown', handleMouseStart);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseStart);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseEnd);
    };
  }, []);

  const closeActions = () => {
    const container = containerRef.current;
    const actions = actionsRef.current;
    if (container && actions) {
      container.style.transition = 'transform 0.3s ease';
      container.style.transform = 'translateX(0)';
      actions.style.opacity = '0';
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Hidden Actions */}
      <div
        ref={actionsRef}
        className="absolute right-0 top-0 bottom-0 flex items-center bg-gray-100 dark:bg-gray-700 opacity-0 transition-opacity duration-300"
        style={{ width: '200px' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMemoryManagement();
            closeActions();
          }}
          className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          title="记忆管理"
        >
          <Brain className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommandManagement();
            closeActions();
          }}
          className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          title="命令管理"
        >
          <Command className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSubAgentManagement();
            closeActions();
          }}
          className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          title="子Agent管理"
        >
          <Bot className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteProject();
            closeActions();
          }}
          className="p-3 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
          title="删除项目"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable Content */}
      <div
        ref={containerRef}
        className="transform transition-transform duration-300 ease cursor-grab active:cursor-grabbing"
        onClick={closeActions}
      >
        {children}
      </div>
    </div>
  );
};

export const McpSwipeActions: React.FC<McpSwipeActionsProps> = ({
  children,
  onValidate,
  onEdit,
  onDelete,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const actions = actionsRef.current;
    if (!container || !actions) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      isDragging.current = true;
      container.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;

      currentX.current = e.touches[0].clientX;
      const deltaX = currentX.current - startX.current;

      // Only allow left swipe (negative deltaX)
      if (deltaX < 0) {
        const maxSwipe = -200; // Maximum swipe distance (60% of container width)
        const translateX = Math.max(deltaX, maxSwipe);
        container.style.transform = `translateX(${translateX}px)`;

        // Show actions progressively
        const progress = Math.abs(deltaX) / Math.abs(maxSwipe);
        actions.style.opacity = progress.toString();
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      const deltaX = currentX.current - startX.current;
      const threshold = -100; // Threshold to snap to open state

      container.style.transition = 'transform 0.3s ease';

      if (deltaX < threshold) {
        // Snap to open state
        container.style.transform = 'translateX(-200px)';
        actions.style.opacity = '1';
      } else {
        // Snap to closed state
        container.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
      }
    };

    const handleMouseStart = (e: MouseEvent) => {
      startX.current = e.clientX;
      isDragging.current = true;
      container.style.transition = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      currentX.current = e.clientX;
      const deltaX = currentX.current - startX.current;

      // Only allow left swipe (negative deltaX)
      if (deltaX < 0) {
        const maxSwipe = -200; // Maximum swipe distance (60% of container width)
        const translateX = Math.max(deltaX, maxSwipe);
        container.style.transform = `translateX(${translateX}px)`;

        // Show actions progressively
        const progress = Math.abs(deltaX) / Math.abs(maxSwipe);
        actions.style.opacity = progress.toString();
      }
    };

    const handleMouseEnd = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      const deltaX = currentX.current - startX.current;
      const threshold = -100; // Threshold to snap to open state

      container.style.transition = 'transform 0.3s ease';

      if (deltaX < threshold) {
        // Snap to open state
        container.style.transform = 'translateX(-200px)';
        actions.style.opacity = '1';
      } else {
        // Snap to closed state
        container.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
      }
    };

    // Touch events for mobile
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse events for desktop testing
    container.addEventListener('mousedown', handleMouseStart);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseStart);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseEnd);
    };
  }, []);

  const closeActions = () => {
    const container = containerRef.current;
    const actions = actionsRef.current;
    if (container && actions) {
      container.style.transition = 'transform 0.3s ease';
      container.style.transform = 'translateX(0)';
      actions.style.opacity = '0';
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Hidden Actions */}
      <div
        ref={actionsRef}
        className="absolute right-0 top-0 bottom-0 flex items-center bg-gray-100 dark:bg-gray-700 opacity-0 transition-opacity duration-300"
        style={{ width: '200px' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onValidate();
            closeActions();
          }}
          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-600 rounded-md transition-colors"
          title="验证服务"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
            closeActions();
          }}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600 rounded-md transition-colors"
          title="编辑服务"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            closeActions();
          }}
          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"
          title="删除服务"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Swipeable Content */}
      <div
        ref={containerRef}
        className="transform transition-transform duration-300 ease cursor-grab active:cursor-grabbing"
        onClick={closeActions}
      >
        {children}
      </div>
    </div>
  );
};