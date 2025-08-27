import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AgentChatPanel } from '../components/AgentChatPanel';
import { PreviewPanel } from '../components/PreviewPanel';

import { useAgentStore } from '../stores/useAgentStore';
import { useAppStore } from '../stores/useAppStore'; // For PPT data
import { useAgent } from '../hooks/useAgents';
import { useSlides } from '../hooks/useSlides';

export const ChatPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [searchParams] = useSearchParams();
  const projectPath = searchParams.get('project');
  const { data: agentData, isLoading, error } = useAgent(agentId!);
  const { data: slidesData } = useSlides(); // For PPT agent

  
  // Resizable panels state
  const [leftPanelWidth, setLeftPanelWidth] = useState(35); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    setCurrentAgent,
    setCurrentItem,
    setAllItems,
  } = useAgentStore();
  
  // PPT-specific state (for backward compatibility)
  const { 
    currentSlideIndex,
    setSlides: setPPTSlides,
    setCurrentSlide: setPPTCurrentSlide
  } = useAppStore();

  const agent = agentData?.agent;

  // Set current agent when data loads
  useEffect(() => {
    if (agent) {
      setCurrentAgent(agent);
    }
  }, [agent, setCurrentAgent]);

  // Sync PPT data to agent store when PPT agent is active
  useEffect(() => {
    if (agent?.ui.componentType === 'slides') {
      if (slidesData) {
        setPPTSlides(slidesData.slides);
        setAllItems(slidesData.slides);
      }
      setCurrentItem(currentSlideIndex);
    }
  }, [agent, slidesData, currentSlideIndex, setPPTSlides, setAllItems, setCurrentItem]);

  // Sync agent state changes back to PPT store (for backward compatibility)
  useEffect(() => {
    if (agent?.ui.componentType === 'slides') {
      const agentState = useAgentStore.getState();
      if (typeof agentState.currentItem === 'number') {
        setPPTCurrentSlide(agentState.currentItem);
      }
    }
  }, [agent, setPPTCurrentSlide]);

  // Handle dragging for resizable panels
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit between 20% and 80%
    const clampedWidth = Math.min(Math.max(newWidthPercent, 20), 80);
    setLeftPanelWidth(clampedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">正在加载智能助手...</div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">助手未找到</h1>
          <p className="text-gray-600 mb-6">
            无法找到指定的智能助手，可能已被删除或禁用。
          </p>
          <button
            onClick={() => window.close()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            关闭页面
          </button>
        </div>
      </div>
    );
  }

  if (!agent.enabled) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-50">{agent.ui.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">助手已禁用</h1>
          <p className="text-gray-600 mb-6">
            智能助手 "{agent.name}" 目前已被禁用，无法使用。
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => window.close()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              关闭页面
            </button>

          </div>
        </div>
      </div>
    );
  }

  // Render agent-specific layout
  const renderAgentLayout = () => {
    switch (agent.ui.componentType) {
      case 'slides':
        return (
          <div ref={containerRef} className="flex h-full bg-gray-100">
            {/* Chat Panel */}
            <div 
              className="flex flex-col"
              style={{ width: `${leftPanelWidth}%` }}
            >
              <AgentChatPanel agent={agent} projectPath={projectPath || undefined} />
            </div>
            
            {/* Resize Handle */}
            <div
              className={`w-1 bg-gray-300 hover:bg-blue-400 cursor-col-resize transition-colors relative ${
                isDragging ? 'bg-blue-500' : ''
              }`}
              onMouseDown={handleMouseDown}
            >
              {/* Visual indicator for drag handle */}
              <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-400 opacity-50 hover:opacity-100" />
            </div>
            
            {/* Preview Panel */}
            <div 
              className="flex flex-col border-l border-gray-200"
              style={{ width: `${100 - leftPanelWidth}%` }}
            >
              <PreviewPanel />
            </div>
          </div>
        );
      
      case 'chat':
      case 'documents':  
      case 'code':
      default:
        return (
          <div className="h-full bg-gray-100">
            <AgentChatPanel agent={agent} projectPath={projectPath || undefined} />
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-100">
      {renderAgentLayout()}

    </div>
  );
};