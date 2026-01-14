import React, { useCallback } from 'react';
import { NodeApi } from 'react-arborist';
import { ChevronRight, Loader2 } from 'lucide-react';
import { FileTreeItem } from './fileTypes';
import { FileIcon } from './FileIcon';

interface TreeNodeProps {
  node: NodeApi<FileTreeItem>; 
  style: React.CSSProperties; 
  dragHandle?: (el: HTMLDivElement | null) => void;
  isLoading?: boolean;
  onDirectoryToggle?: (node: NodeApi<FileTreeItem>) => void;
  onFileSelect?: (node: NodeApi<FileTreeItem>) => void;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  style, 
  dragHandle,
  isLoading = false,
  onDirectoryToggle,
  onFileSelect
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // 阻止默认行为
    e.stopPropagation(); // 阻止事件冒泡
    
    if (node.data.isDirectory) {
      onDirectoryToggle?.(node);
    } else {
      onFileSelect?.(node);
    }
  }, [node, onDirectoryToggle, onFileSelect]);

  return (
    <div
      style={style}
      ref={dragHandle}
      className={`flex items-center cursor-pointer px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 ${
        node.isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
      }`}
      onClick={handleClick}
    >
      {/* 展开/收起箭头 - 只对文件夹显示 */}
      {node.data.isDirectory && (
        <span className="mr-1 flex items-center">
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
          ) : (
            <ChevronRight className={`w-3 h-3 transition-transform text-gray-400 ${
              node.isOpen ? 'rotate-90' : ''
            }`} />
          )}
        </span>
      )}
      
      {/* 文件/文件夹图标 */}
      <span className="mr-2 flex items-center">
        <FileIcon node={node} />
      </span>
      
      {/* 文件/文件夹名称 */}
      <span className="text-sm truncate flex-1">{node.data.name}</span>

      {/* 文件大小信息 - 只对文件显示 */}
      {!node.data.isDirectory && node.data.size && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
          {(node.data.size / 1024).toFixed(1)}KB
        </span>
      )}
    </div>
  );
};