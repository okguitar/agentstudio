import React from 'react';
import { NodeApi } from 'react-arborist';
import { FaFolder, FaFolderOpen } from 'react-icons/fa';
import { ICON_COLORS, ICON_COMPONENTS, FileTreeItem } from './fileTypes';

interface FileIconProps {
  node?: NodeApi<FileTreeItem>;
  fileName?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ node, fileName }) => {
  // 如果有 fileName 但没有 node，用于标签页显示
  if (!node && fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const IconComponent = ICON_COMPONENTS[extension as keyof typeof ICON_COMPONENTS] || ICON_COMPONENTS.default;
    const color = ICON_COLORS[extension as keyof typeof ICON_COLORS] || ICON_COLORS.default;
    return <IconComponent color={color} />;
  }

  if (node?.data.isDirectory) {
    // 如果目录已展开，就显示为打开状态，不管是否有子项
    // 这样空目录展开时也能正确显示为打开状态
    return node.isOpen ? 
      <FaFolderOpen color="#87b3d6" /> : 
      <FaFolder color="#87b3d6" />;
  }
  
  const extension = node?.data.name.split('.').pop()?.toLowerCase() || '';
  const IconComponent = ICON_COMPONENTS[extension as keyof typeof ICON_COMPONENTS] || ICON_COMPONENTS.default;
  const color = ICON_COLORS[extension as keyof typeof ICON_COLORS] || ICON_COLORS.default;
  return <IconComponent color={color} />;
};