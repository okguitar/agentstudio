import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import Editor from '@monaco-editor/react';
import { 
  FaFolder, FaFolderOpen, FaFile, FaCss3Alt, FaHtml5, FaJsSquare, 
  FaReact, FaMarkdown, FaImage, FaPython, FaJava, FaFilePdf, FaFileWord
} from 'react-icons/fa';
import { VscJson, VscCode } from 'react-icons/vsc';
import { SiTypescript } from 'react-icons/si';
import { useFileTree, useFileContent, type FileSystemItem } from '../hooks/useFileSystem';
import { Loader2, ChevronRight, RefreshCw } from 'lucide-react';

// 将 FileSystemItem 转换为 react-arborist 需要的格式
interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  modified: string;
  isHidden: boolean;
  children?: FileTreeItem[];
}

interface FileExplorerProps {
  projectPath?: string;
  onFileSelect?: (filePath: string) => void;
  className?: string;
  height?: string;
}

// 图标映射表
const ICON_MAP = new Map([
  ['js', <FaJsSquare color="#f7df1e" key="js" />],
  ['jsx', <FaReact color="#61dafb" key="jsx" />],
  ['ts', <SiTypescript color="#3178c6" key="ts" />],
  ['tsx', <SiTypescript color="#3178c6" key="tsx" />],
  ['css', <FaCss3Alt color="#1572b6" key="css" />],
  ['html', <FaHtml5 color="#e34f26" key="html" />],
  ['htm', <FaHtml5 color="#e34f26" key="htm" />],
  ['json', <VscJson color="#f9d71c" key="json" />],
  ['md', <FaMarkdown color="#083fa1" key="md" />],
  ['pdf', <FaFilePdf color="#d63031" key="pdf" />],
  ['ppt', <FaFileWord color="#d63031" key="ppt" />],
  ['pptx', <FaFileWord color="#d63031" key="pptx" />],
  ['ico', <FaImage color="#a9a9a9" key="ico" />],
  ['png', <FaImage color="#a9a9a9" key="png" />],
  ['jpg', <FaImage color="#a9a9a9" key="jpg" />],
  ['jpeg', <FaImage color="#a9a9a9" key="jpeg" />],
  ['gif', <FaImage color="#a9a9a9" key="gif" />],
  ['svg', <FaImage color="#a9a9a9" key="svg" />],
  ['webp', <FaImage color="#a9a9a9" key="webp" />],
  ['py', <FaPython color="#3776ab" key="py" />],
  ['java', <FaJava color="#007396" key="java" />],
]);

const FileIcon: React.FC<{ node: NodeApi<FileTreeItem> }> = ({ node }) => {
  if (node.data.isDirectory) {
    return node.isOpen ? 
      <FaFolderOpen color="#87b3d6" /> : 
      <FaFolder color="#87b3d6" />;
  }
  
  const extension = node.data.name.split('.').pop()?.toLowerCase() || '';
  return ICON_MAP.get(extension) || <FaFile color="#6d8a9f" />;
};

// 获取语言类型
const getLanguageForFile = (fileName: string = ''): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  switch (extension) {
    case 'js': case 'jsx': return 'javascript';
    case 'ts': case 'tsx': return 'typescript';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'html': case 'htm': return 'html';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'xml': return 'xml';
    case 'yaml': case 'yml': return 'yaml';
    default: return 'plaintext';
  }
};

// 简单的图片预览组件
const SimpleImagePreview: React.FC<{ imageUrl: string; fileName: string }> = ({ imageUrl, fileName }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex items-center justify-center h-full p-4">
      {hasError ? (
        <div className="text-center text-gray-500">
          <FaImage className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>图片加载失败</p>
          <p className="text-sm mt-2">{fileName}</p>
        </div>
      ) : (
        <div className="relative max-w-full max-h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
          <img 
            src={imageUrl} 
            alt={fileName}
            className="max-w-full max-h-full object-contain bg-white rounded shadow-lg"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            style={{ display: hasError ? 'none' : 'block' }}
          />
        </div>
      )}
    </div>
  );
};

// 判断文件类型
const getFileType = (fileName: string): 'text' | 'image' | 'binary' => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const textExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'htm', 'json', 'md', 'txt', 
    'py', 'java', 'xml', 'yaml', 'yml', 'sh', 'bat', 'php', 'rb', 'go',
    'rs', 'cpp', 'c', 'h', 'hpp', 'cs', 'swift', 'kt', 'scala', 'clj',
    'sql', 'dockerfile', 'gitignore', 'env'
  ];
  
  const imageExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'
  ];
  
  if (textExtensions.includes(extension)) return 'text';
  if (imageExtensions.includes(extension)) return 'image';
  return 'binary';
};

// 自定义节点渲染组件
const Node: React.FC<{ node: NodeApi<FileTreeItem>; style: React.CSSProperties; dragHandle?: (el: HTMLDivElement | null) => void }> = ({ 
  node, 
  style, 
  dragHandle 
}) => {
  return (
    <div 
      style={style} 
      ref={dragHandle} 
      className={`flex items-center cursor-pointer px-2 py-1 hover:bg-gray-100 ${
        node.isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
      }`}
      onClick={() => {
        // 文件夹点击时切换展开/收起状态
        if (node.data.isDirectory) {
          node.toggle();
        } else {
          // 文件点击时选择
          node.select();
        }
      }}
    >
      {/* 展开/收起箭头 - 只对文件夹显示 */}
      {node.data.isDirectory && (
        <span className="mr-1 flex items-center">
          <ChevronRight className={`w-3 h-3 transition-transform text-gray-400 ${node.isOpen ? 'rotate-90' : ''}`} />
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
        <span className="text-xs text-gray-400 ml-2">
          {(node.data.size / 1024).toFixed(1)}KB
        </span>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  projectPath, 
  onFileSelect,
  className = '',
  height = '100vh'
}) => {
  const [selectedFile, setSelectedFile] = useState<FileTreeItem | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // 获取项目ID用于媒体文件访问（暂时注释掉，未使用）
  // const { data: projectData } = useProjectId(projectPath);
  
  // 使用新的文件树 hook，递归加载整个项目目录
  const { 
    data: fileTreeData, 
    isLoading: isTreeLoading, 
    error: treeError,
    refetch: refetchTree
  } = useFileTree(projectPath);
  
  // 读取选中文件的内容
  const { 
    data: fileContentData, 
    isLoading: isContentLoading,
    error: contentError
  } = useFileContent(
    selectedFile && !selectedFile.isDirectory ? selectedFile.path : undefined,
    projectPath
  );

  // 调试信息
  console.log('FileExplorer Debug:', {
    selectedFile: selectedFile?.name,
    isContentLoading,
    fileContentData,
    contentError
  });

  // 移除面包屑导航相关代码，因为我们现在使用树形结构

  // 计算容器高度
  useEffect(() => {
    const updateHeight = () => {
      if (treeContainerRef.current) {
        const containerRect = treeContainerRef.current.getBoundingClientRect();
        const newHeight = Math.max(400, containerRect.height - 20); // 减去padding，最小高度400px
        setContainerHeight(newHeight);
      }
    };

    // 延迟执行以确保DOM已经渲染
    const timer = setTimeout(updateHeight, 100);
    window.addEventListener('resize', updateHeight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
    };
  }, [fileTreeData]); // 当数据变化时重新计算

  // 转换文件树数据为 react-arborist 需要的格式
  const treeData = useMemo((): FileTreeItem[] => {
    if (!fileTreeData) return [];

    const convertToTreeData = (items: FileSystemItem[]): FileTreeItem[] => {
      return items.map(item => ({
        id: item.path,
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
        size: item.size,
        modified: item.modified,
        isHidden: item.isHidden,
        children: item.children ? convertToTreeData(item.children) : undefined,
      }));
    };

    return convertToTreeData(fileTreeData);
  }, [fileTreeData]);

  // 创建初始展开状态 - 只展开根目录下的第一层目录
  const initialOpenState = useMemo(() => {
    if (!fileTreeData || !projectPath) return {};
    
    const openState: Record<string, boolean> = {};
    
    // 只展开根目录下的直接子目录，不展开更深层的目录
    fileTreeData.forEach(item => {
      if (item.isDirectory) {
        openState[item.path] = true;
        // 确保子目录不被展开
        if (item.children) {
          const markChildrenClosed = (children: FileSystemItem[]) => {
            children.forEach(child => {
              if (child.isDirectory) {
                openState[child.path] = false;
                if (child.children) {
                  markChildrenClosed(child.children);
                }
              }
            });
          };
          markChildrenClosed(item.children);
        }
      }
    });
    
    return openState;
  }, [fileTreeData, projectPath]);

  // 处理文件选择
  const handleNodeSelect = useCallback((nodes: NodeApi<FileTreeItem>[]) => {
    const node = nodes[0];
    if (!node?.data) return;

    if (!node.data.isDirectory) {
      // 文件：选择文件进行预览
      setSelectedFile(node.data);
      onFileSelect?.(node.data.path);
    }
    // 目录不需要特殊处理，react-arborist 会自动处理折叠/展开
  }, [onFileSelect]);

  // 渲染文件内容预览
  const renderFilePreview = () => {
    if (!selectedFile) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <FaFile className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>选择一个文件进行预览</p>
          </div>
        </div>
      );
    }

    if (isContentLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      );
    }

    if (contentError) {
      return (
        <div className="flex items-center justify-center h-full text-red-500">
          <div className="text-center">
            <p className="font-medium">加载文件失败</p>
            <p className="text-sm mt-2 bg-red-50 px-3 py-2 rounded border border-red-200">
              {(contentError as Error).message}
            </p>
            <p className="text-xs mt-2 text-gray-500">
              {selectedFile.path}
            </p>
          </div>
        </div>
      );
    }

    const fileType = getFileType(selectedFile.name);

    switch (fileType) {
      case 'image':
        // 创建一个专门用于二进制文件的URL
        const imageParams = new URLSearchParams();
        imageParams.append('path', selectedFile.path);
        if (projectPath) {
          imageParams.append('projectPath', projectPath);
        }
        // 添加binary标记，告诉后端这是二进制文件
        imageParams.append('binary', 'true');
        const imageUrl = `/api/files/read?${imageParams.toString()}`;
        
        return <SimpleImagePreview imageUrl={imageUrl} fileName={selectedFile.name} />;

      case 'text':
        if (!fileContentData) {
          return (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>无法获取文件内容</p>
            </div>
          );
        }
        return (
          <Editor 
            height="100%" 
            theme="vs-light" 
            language={getLanguageForFile(selectedFile.name)} 
            value={fileContentData.content} 
            options={{ 
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }} 
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <VscCode className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>不支持预览此文件类型</p>
              <p className="text-sm mt-2">大小: {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '未知'}</p>
            </div>
          </div>
        );
    }
  };

  if (treeError) {
    return (
      <div className={`flex items-center justify-center h-full text-red-500 ${className}`} style={{ height }}>
        <div className="text-center">
          <p className="font-medium">加载项目文件失败</p>
          <p className="text-sm mt-2 bg-red-50 px-3 py-2 rounded border border-red-200">
            {(treeError as Error).message}
          </p>
          <p className="text-xs mt-2 text-gray-500">项目路径: {projectPath}</p>
          <button 
            onClick={() => refetchTree()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`} style={{ height }}>
      {/* 文件树侧边栏 */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* 工具栏 */}
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">文件浏览器</h3>
            <button
              onClick={() => refetchTree()}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
              title="刷新"
              disabled={isTreeLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isTreeLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 文件树 */}
        <div ref={treeContainerRef} className="flex-1 overflow-hidden">
          {isTreeLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载项目文件...</span>
              </div>
            </div>
          ) : treeData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p className="text-sm">项目目录为空</p>
            </div>
          ) : (
            <Tree 
              data={treeData}
              onSelect={handleNodeSelect}
              width={320}
              height={containerHeight}
              indent={16}
              rowHeight={32}
              initialOpenState={initialOpenState}
            >
              {Node}
            </Tree>
          )}
        </div>
      </div>

      {/* 文件预览区域 */}
      <div className="flex-1 flex flex-col">
        {/* 预览工具栏 */}
        {selectedFile && (
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <FileIcon node={{ data: selectedFile, isOpen: false } as NodeApi<FileTreeItem>} />
              <h4 className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</h4>
              <span className="text-xs text-gray-500">
                {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate" title={selectedFile.path}>
              {selectedFile.path}
            </p>
          </div>
        )}

        {/* 预览内容 */}
        <div className="flex-1 bg-white">
          {renderFilePreview()}
        </div>
      </div>
    </div>
  );
};