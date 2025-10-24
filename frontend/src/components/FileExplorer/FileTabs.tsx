import React, { useRef, useEffect } from 'react';
import { X, MoreHorizontal, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FileTab } from './fileTypes';
import { FileIcon } from './FileIcon';
import { TabDropdown } from './TabDropdown';
import { MAX_VISIBLE_TABS } from './constants';

interface FileTabsProps {
  tabs: FileTab[];
  onTabActivate: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export const FileTabs: React.FC<FileTabsProps> = ({ tabs, onTabActivate, onTabClose }) => {
  const { t } = useTranslation('components');
  const [showDropdown, setShowDropdown] = React.useState(false);
  const tabDropdownRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  if (tabs.length === 0) {
    return (
      <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center flex-shrink-0">
        <div className="flex items-center justify-center w-full h-full text-gray-500 dark:text-gray-400">
          <span className="text-sm">{t('fileExplorer.noFiles')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center flex-shrink-0">
      <div className="flex items-center h-full w-full">
        {/* 显示可见的标签 */}
        <div className="flex items-center h-full flex-1">
          {tabs.slice(0, Math.min(MAX_VISIBLE_TABS, tabs.length)).map((tab) => (
            <div
              key={tab.id}
              className={`group relative flex items-center h-full px-3 border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                tab.isActive
                  ? 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              } ${!tab.isPinned ? 'italic' : ''}`}
              onClick={() => onTabActivate(tab.id)}
              title={`${tab.path} ${tab.isPinned ? '(固定)' : '(临时)'}`}
              style={{ minWidth: '120px', maxWidth: '180px' }}
            >
              <FileIcon fileName={tab.name} />
              <span className="ml-2 text-sm truncate flex-1">{tab.name}</span>
              {!tab.isPinned && (
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">•</span>
              )}
              <button
                className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                title={t('common:actions.close')}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* 下拉菜单按钮 (当标签数量超过显示限制时) */}
        {tabs.length > MAX_VISIBLE_TABS && (
          <div className="relative" ref={tabDropdownRef}>
            <button
              className="flex items-center h-full px-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors border-l border-gray-200 dark:border-gray-700"
              onClick={() => setShowDropdown(!showDropdown)}
              title={`${tabs.length - MAX_VISIBLE_TABS} more tabs`}
            >
              <MoreHorizontal className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            <TabDropdown
              tabs={tabs.slice(MAX_VISIBLE_TABS)}
              showDropdown={showDropdown}
              onTabClick={onTabActivate}
              onTabClose={onTabClose}
              onDropdownClose={() => setShowDropdown(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};