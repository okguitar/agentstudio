import React from 'react';
import { FileText, Folder, X } from 'lucide-react';
import type { AgentConfig } from '../types/index.js';

interface RightPanelHeaderProps {
  agent: AgentConfig;
  hasCustomComponent: boolean;
  currentView: 'files' | 'custom';
  onViewChange: (view: 'files' | 'custom') => void;
  onHidePanel?: () => void;
}

export const RightPanelHeader: React.FC<RightPanelHeaderProps> = ({
  agent,
  hasCustomComponent,
  currentView,
  onViewChange,
  onHidePanel
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* 左侧标题区域 */}
      <div className="flex items-center space-x-2">
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {agent.ui.icon}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {hasCustomComponent ? (
            currentView === 'custom' ? 'Agent 界面' : '文件浏览器'
          ) : (
            '文件浏览器'
          )}
        </span>
      </div>

      {/* 右侧控制区域 */}
      <div className="flex items-center space-x-1">
        {hasCustomComponent ? (
          // 有自定义组件时显示视图切换标签
          <div className="flex items-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
            <button
              onClick={() => onViewChange('custom')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'custom'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              title="Agent 界面"
            >
              <FileText className="w-4 h-4" />
              <span>Agent</span>
            </button>
            <button
              onClick={() => onViewChange('files')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentView === 'files'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              title="文件浏览器"
            >
              <Folder className="w-4 h-4" />
              <span>文件</span>
            </button>
          </div>
        ) : (
          // 没有自定义组件时显示标题
          <div className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400">
            <Folder className="w-4 h-4" />
            <span className="text-sm font-medium">文件浏览器</span>
          </div>
        )}

        {/* 隐藏面板按钮 */}
        {onHidePanel && (
          <button
            onClick={onHidePanel}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="隐藏右侧面板"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};