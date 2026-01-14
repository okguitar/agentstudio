import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FileTab } from './fileTypes';
import { FileIcon } from './FileIcon';

interface TabDropdownProps {
  tabs: FileTab[];
  showDropdown: boolean;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onDropdownClose: () => void;
}

export const TabDropdown: React.FC<TabDropdownProps> = ({
  tabs,
  showDropdown,
  onTabClick,
  onTabClose,
  onDropdownClose
}) => {
  const { t } = useTranslation('components');

  if (!showDropdown) return null;

  return (
    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-48 max-h-64 overflow-y-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 group ${
            tab.isActive ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
          } ${!tab.isPinned ? 'italic' : ''}`}
          onClick={() => {
            onTabClick(tab.id);
            onDropdownClose();
          }}
          title={`${tab.path} ${tab.isPinned ? '(固定)' : '(临时)'}`}
        >
          <FileIcon fileName={tab.name} />
          <span className="ml-2 truncate flex-1">{tab.name}</span>
          {!tab.isPinned && (
            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">•</span>
          )}
          <button
            className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity flex-shrink-0"
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
  );
};