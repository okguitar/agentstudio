import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Tree, NodeApi, TreeApi } from 'react-arborist';
import Editor from '@monaco-editor/react';
import { 
  FaFolder, FaFolderOpen, FaFile, FaCss3Alt, FaHtml5, FaJsSquare, 
  FaReact, FaMarkdown, FaImage, FaPython, FaJava, FaFilePdf, FaFileWord
} from 'react-icons/fa';
import { VscJson, VscCode } from 'react-icons/vsc';
import { SiTypescript } from 'react-icons/si';
import { useFileTree, useFileContent, type FileSystemItem } from '../hooks/useFileSystem';
import { Loader2, ChevronRight, RefreshCw, X, ChevronDown, MoreHorizontal } from 'lucide-react';

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

// 标签页接口
interface FileTab {
  id: string;
  name: string;
  path: string;
  isPinned: boolean; // 是否固定标签
  isActive: boolean; // 是否当前活跃
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
    // 检查是否有子项来决定是否显示为打开状态
    // 只有当目录真正展开且有子项时才显示为打开状态
    const hasLoadedChildren = node.data.children && node.data.children.length > 0;
    return (node.isOpen && hasLoadedChildren) ? 
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
const Node: React.FC<{ 
  node: NodeApi<FileTreeItem>; 
  style: React.CSSProperties; 
  dragHandle?: (el: HTMLDivElement | null) => void;
  isLoading?: boolean;
  onDirectoryToggle?: (node: NodeApi<FileTreeItem>) => void;
  onFileSelect?: (node: NodeApi<FileTreeItem>) => void;
}> = ({ 
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
      className={`flex items-center cursor-pointer px-2 py-1 hover:bg-gray-100 ${
        node.isSelected ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
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
              node.isOpen && node.data.children && node.data.children.length > 0 ? 'rotate-90' : ''
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
        <span className="text-xs text-gray-400 ml-2">
          {(node.data.size / 1024).toFixed(1)}KB
        </span>
      )}
    </div>
  );
};

// 常量定义
const MAX_VISIBLE_TABS = 5; // 最多显示的标签数量

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  projectPath, 
  onFileSelect,
  className = '',
  height = '100vh'
}) => {
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [temporaryTabId, setTemporaryTabId] = useState<string | null>(null); // 临时标签ID
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [showTabDropdown, setShowTabDropdown] = useState<boolean>(false);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const tabDropdownRef = useRef<HTMLDivElement>(null);
  const treeApiRef = useRef<TreeApi<FileTreeItem> | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedPath, setLastClickedPath] = useState<string>('');
  
  // 懒加载相关状态
  const [loadedDirectories, setLoadedDirectories] = useState<Set<string>>(new Set());
  const [dynamicTreeData, setDynamicTreeData] = useState<FileTreeItem[]>([]);
  const [loadingDirectories, setLoadingDirectories] = useState<Set<string>>(new Set());

  // 获取项目ID用于媒体文件访问（暂时注释掉，未使用）
  // const { data: projectData } = useProjectId(projectPath);
  
  // 使用新的文件树 hook，懒加载根目录
  const { 
    data: fileTreeData, 
    isLoading: isTreeLoading, 
    error: treeError,
    refetch: refetchTree
  } = useFileTree(projectPath);
  
  // 获取当前活跃的标签
  const activeTab = useMemo(() => {
    return tabs.find(tab => tab.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  // 读取当前活跃标签的文件内容
  const { 
    data: fileContentData, 
    isLoading: isContentLoading,
    error: contentError
  } = useFileContent(
    activeTab ? activeTab.path : undefined,
    projectPath
  );


  // 初始化动态树数据
  useEffect(() => {
    if (fileTreeData) {
      const convertToTreeData = (items: FileSystemItem[]): FileTreeItem[] => {
        return items.map(item => {
          const treeItem = {
            id: item.path,
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            size: item.size,
            modified: item.modified,
            isHidden: item.isHidden,
            children: item.children ? convertToTreeData(item.children) : undefined,
          };
          
          
          return treeItem;
        });
      };
      
      // 收集所有已经有子项的目录路径，标记为已加载
      const collectLoadedDirectories = (items: FileSystemItem[], loaded: Set<string> = new Set()): Set<string> => {
        items.forEach(item => {
          if (item.isDirectory && item.children && item.children.length > 0) {
            loaded.add(item.path);
            collectLoadedDirectories(item.children, loaded);
          }
        });
        return loaded;
      };

      const loadedDirs = collectLoadedDirectories(fileTreeData);
      setLoadedDirectories(loadedDirs);
      setDynamicTreeData(convertToTreeData(fileTreeData));
    }
  }, [fileTreeData]);

  // 懒加载目录子项的函数
  const loadDirectoryChildren = useCallback(async (dirPath: string): Promise<void> => {
    if (loadedDirectories.has(dirPath) || loadingDirectories.has(dirPath)) {
      console.log('Directory already loaded or loading:', dirPath);
      return; // 已加载或正在加载
    }

    console.log('Starting to load directory:', dirPath);
    setLoadingDirectories(prev => new Set(prev).add(dirPath));

    try {
      const searchParams = new URLSearchParams();
      searchParams.append('path', dirPath);
      
      const response = await fetch(`/api/files/browse?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to browse directory');
      }
      
      const data = await response.json();
      const childItems: FileSystemItem[] = [];

      for (const item of data.items) {
        if (item.isHidden) continue; // 跳过隐藏文件
        
        if (item.isDirectory) {
          childItems.push({
            ...item,
            children: [] // 空数组表示尚未加载
          });
        } else {
          childItems.push(item);
        }
      }

      console.log('Loaded', childItems.length, 'items for directory:', dirPath);

      // 更新动态树数据
      setDynamicTreeData(prevData => {
        const updateChildren = (items: FileTreeItem[]): FileTreeItem[] => {
          return items.map(item => {
            if (item.path === dirPath) {
              const updatedItem = {
                ...item,
                children: childItems.map(child => {
                  const treeChild = {
                    id: child.path,
                    name: child.name,
                    path: child.path,
                    isDirectory: child.isDirectory,
                    size: child.size,
                    modified: child.modified,
                    isHidden: child.isHidden,
                    children: child.isDirectory ? [] : undefined, // 只有目录才有 children 数组
                  };
                  
                  
                  return treeChild;
                })
              };
              return updatedItem;
            } else if (item.children) {
              return {
                ...item,
                children: updateChildren(item.children)
              };
            }
            return item;
          });
        };
        
        return updateChildren(prevData);
      });

      setLoadedDirectories(prev => new Set(prev).add(dirPath));
      console.log('Successfully loaded directory:', dirPath);
      
      // 使用 TreeApi 关闭新加载的子目录，确保它们显示为折叠状态
      if (treeApiRef.current) {
        childItems.forEach(child => {
          if (child.isDirectory) {
            // 确保新加载的子目录都是关闭状态
            treeApiRef.current?.close(child.path);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load directory children:', error);
      throw error; // 重新抛出错误，让调用者可以处理
    } finally {
      setLoadingDirectories(prev => {
        const newSet = new Set(prev);
        newSet.delete(dirPath);
        return newSet;
      });
    }
  }, [loadedDirectories, loadingDirectories]);

  // 移除面包屑导航相关代码，因为我们现在使用树形结构

  // 计算容器高度
  useEffect(() => {
    const updateHeight = () => {
      if (treeContainerRef.current) {
        const containerRect = treeContainerRef.current.getBoundingClientRect();
        // 使用实际容器高度，如果获取不到则使用默认值
        const newHeight = containerRect.height > 0 ? containerRect.height : 600;
        setContainerHeight(newHeight);
      }
    };

    // 使用 ResizeObserver 监听容器大小变化
    let resizeObserver: ResizeObserver | null = null;
    
    if (treeContainerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { height } = entry.contentRect;
          if (height > 0) {
            setContainerHeight(height);
          }
        }
      });
      resizeObserver.observe(treeContainerRef.current);
    }

    // 延迟执行初始计算
    const timer = setTimeout(updateHeight, 100);
    window.addEventListener('resize', updateHeight);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [fileTreeData]); // 当数据变化时重新计算

  // 处理点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false);
      }
    };

    if (showTabDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTabDropdown]);

  // 使用动态树数据，它会在需要时懒加载
  const treeData = dynamicTreeData;

  // 创建初始展开状态 - 明确设置所有目录为关闭状态
  const initialOpenState = useMemo(() => {
    const openState: Record<string, boolean> = {};
    
    const setDirectoriesClosed = (items: FileTreeItem[]) => {
      items.forEach(item => {
        if (item.isDirectory) {
          openState[item.id] = false; // 明确设置为关闭
          if (item.children) {
            setDirectoriesClosed(item.children);
          }
        }
      });
    };
    
    if (dynamicTreeData && dynamicTreeData.length > 0) {
      setDirectoriesClosed(dynamicTreeData);
    }
    
    return openState;
  }, [dynamicTreeData]);

  // 创建新标签页
  const createTab = useCallback((file: FileTreeItem, isPinned: boolean = false): FileTab => {
    return {
      id: `tab-${file.path}`,
      name: file.name,
      path: file.path,
      isPinned,
      isActive: false
    };
  }, []);

  // 添加或激活标签页
  const addOrActivateTab = useCallback((file: FileTreeItem, isPinned: boolean = false) => {
    setTabs(prevTabs => {
      const existingTabIndex = prevTabs.findIndex(tab => tab.path === file.path);
      
      if (existingTabIndex !== -1) {
        // 标签已存在，激活它
        const updatedTabs = prevTabs.map((tab, index) => ({
          ...tab,
          isActive: index === existingTabIndex,
          isPinned: isPinned || tab.isPinned // 如果要求固定，则固定
        }));
        setActiveTabId(updatedTabs[existingTabIndex].id);
        return updatedTabs;
      } else {
        // 创建新标签
        const newTab = createTab(file, isPinned);
        
        if (!isPinned && temporaryTabId) {
          // 如果是临时标签且已有临时标签，替换临时标签
          const updatedTabs = prevTabs.map(tab => 
            tab.id === temporaryTabId ? { ...newTab, isActive: true } : { ...tab, isActive: false }
          );
          setActiveTabId(newTab.id);
          setTemporaryTabId(newTab.id);
          return updatedTabs;
        } else {
          // 添加新标签
          const updatedTabs = [
            ...prevTabs.map(tab => ({ ...tab, isActive: false })),
            { ...newTab, isActive: true }
          ];
          setActiveTabId(newTab.id);
          if (!isPinned) {
            setTemporaryTabId(newTab.id);
          }
          return updatedTabs;
        }
      }
    });
    
    onFileSelect?.(file.path);
  }, [createTab, temporaryTabId, onFileSelect]);

  // 关闭标签页
  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(tab => tab.id === tabId);
      if (tabIndex === -1) return prevTabs;
      
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      // 如果关闭的是当前活跃标签，需要激活另一个标签
      if (activeTabId === tabId) {
        if (newTabs.length > 0) {
          // 优先激活相邻的标签
          const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          const newActiveTab = newTabs[newActiveIndex];
          setActiveTabId(newActiveTab.id);
          newTabs[newActiveIndex] = { ...newActiveTab, isActive: true };
        } else {
          setActiveTabId(null);
        }
      }
      
      // 如果关闭的是临时标签，清除临时标签ID
      if (temporaryTabId === tabId) {
        setTemporaryTabId(null);
      }
      
      return newTabs;
    });
  }, [activeTabId, temporaryTabId]);

  // 激活标签页
  const activateTab = useCallback((tabId: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => ({
        ...tab,
        isActive: tab.id === tabId
      }))
    );
    setActiveTabId(tabId);
  }, []);

  // 防抖状态 - 防止双重触发
  const [lastToggleTime, setLastToggleTime] = useState<Record<string, number>>({});

  // 处理目录展开/收起
  const handleDirectoryToggle = useCallback((node: NodeApi<FileTreeItem>) => {
    // 防抖处理 - 防止短时间内重复触发
    const currentTime = Date.now();
    const lastTime = lastToggleTime[node.data.path] || 0;
    if (currentTime - lastTime < 300) {
      console.log('Debounce: ignoring rapid click for', node.data.path);
      return;
    }
    
    setLastToggleTime(prev => ({
      ...prev,
      [node.data.path]: currentTime
    }));

    // 处理目录的展开/收起
    const wasOpen = node.isOpen;
    const hasLoadedChildren = node.data.children && node.data.children.length > 0;
    const hasBeenLoaded = loadedDirectories.has(node.data.path);
    
    if (wasOpen) {
      // 如果目录已经展开，直接收起
      node.close();
    } else {
      // 目录已关闭，需要展开
      if (!hasLoadedChildren && !hasBeenLoaded) {
        // 需要加载子项的情况：先展开目录（显示加载状态），然后加载数据
        node.open(); // 立即展开以显示加载状态
        loadDirectoryChildren(node.data.path).catch(error => {
          console.error('Failed to load directory children:', error);
          // 如果加载失败，关闭目录
          node.close();
        });
      } else {
        // 已经加载过子项但目录是关闭的，直接展开
        node.open();
      }
    }
  }, [lastToggleTime, loadedDirectories, loadDirectoryChildren]);

  // 处理文件选择
  const handleFileSelect = useCallback((node: NodeApi<FileTreeItem>) => {
    // 先选中节点以显示高亮状态
    node.select();
    
    // 检测双击
    const currentTime = Date.now();
    const isDoubleClick = currentTime - lastClickTime < 300 && lastClickedPath === node.data.path;
    
    setLastClickTime(currentTime);
    setLastClickedPath(node.data.path);
    
    if (isDoubleClick) {
      // 双击：打开固定标签
      addOrActivateTab(node.data, true);
    } else {
      // 单击：打开临时标签
      setTimeout(() => {
        // 延迟执行，避免双击时触发单击逻辑
        if (Date.now() - currentTime >= 300) {
          addOrActivateTab(node.data, false);
        }
      }, 300);
    }
  }, [addOrActivateTab, lastClickTime, lastClickedPath]);

  // 渲染文件内容预览
  const renderFilePreview = () => {
    if (!activeTab) {
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
              {activeTab.path}
            </p>
          </div>
        </div>
      );
    }

    const fileType = getFileType(activeTab.name);

    switch (fileType) {
      case 'image':
        // 创建一个专门用于二进制文件的URL
        const imageParams = new URLSearchParams();
        imageParams.append('path', activeTab.path);
        if (projectPath) {
          imageParams.append('projectPath', projectPath);
        }
        // 添加binary标记，告诉后端这是二进制文件
        imageParams.append('binary', 'true');
        const imageUrl = `/api/files/read?${imageParams.toString()}`;
        
        return <SimpleImagePreview imageUrl={imageUrl} fileName={activeTab.name} />;

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
            language={getLanguageForFile(activeTab.name)} 
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
              <p className="text-sm mt-2">文件: {activeTab.name}</p>
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
    <div className={`flex h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        {/* 文件树侧边栏 */}
      <div className="w-80 border-r border-gray-200 flex flex-col h-full">
        {/* 工具栏 - 统一高度 */}
        <div className="h-12 px-3 border-b border-gray-200 bg-gray-50 flex items-center flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-sm font-medium text-gray-700">文件浏览器</h3>
            <button
              onClick={() => {
                console.log('Refreshing file tree...');
                // 重置懒加载状态
                setLoadedDirectories(new Set());
                setLoadingDirectories(new Set());
                // 不要在这里清空动态树数据，让refetchTree触发后再更新
                // setDynamicTreeData([]);
                // 重新获取根目录数据
                refetchTree();
              }}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
              title="刷新"
              disabled={isTreeLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isTreeLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 文件树 */}
        <div ref={treeContainerRef} className="flex-1 min-h-0">
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
              width={320}
              height={containerHeight}
              indent={16}
              rowHeight={32}
              initialOpenState={initialOpenState}
              ref={treeApiRef}
            >
              {(props) => (
                <Node 
                  {...props} 
                  isLoading={loadingDirectories.has(props.node.data.path)}
                  onDirectoryToggle={handleDirectoryToggle}
                  onFileSelect={handleFileSelect}
                />
              )}
            </Tree>
          )}
        </div>
      </div>

      {/* 文件预览区域 */}
      <div className="flex-1 flex flex-col h-full">
        {/* 标签栏 - 统一高度 */}
        <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center flex-shrink-0">
          {tabs.length > 0 ? (
            <div className="flex items-center h-full w-full">
              {/* 显示可见的标签 */}
              <div className="flex items-center h-full flex-1">
                {tabs.slice(0, Math.min(MAX_VISIBLE_TABS, tabs.length)).map((tab) => (
                  <div
                    key={tab.id}
                    className={`group relative flex items-center h-full px-3 border-r border-gray-200 cursor-pointer transition-colors ${
                      tab.isActive
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    } ${!tab.isPinned ? 'italic' : ''}`}
                    onClick={() => activateTab(tab.id)}
                    title={`${tab.path} ${tab.isPinned ? '(固定)' : '(临时)'}`}
                    style={{ minWidth: '120px', maxWidth: '180px' }}
                  >
                    <FileIcon node={{ data: { name: tab.name, isDirectory: false } as FileTreeItem, isOpen: false } as NodeApi<FileTreeItem>} />
                    <span className="ml-2 text-sm truncate flex-1">{tab.name}</span>
                    {!tab.isPinned && (
                      <span className="ml-1 text-xs text-gray-400 flex-shrink-0">•</span>
                    )}
                    <button
                      className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      title="关闭标签"
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
                    className="flex items-center h-full px-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors border-l border-gray-200"
                    onClick={() => setShowTabDropdown(!showTabDropdown)}
                    title={`还有 ${tabs.length - MAX_VISIBLE_TABS} 个标签`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>

                  {/* 下拉菜单 */}
                  {showTabDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48 max-h-64 overflow-y-auto">
                      {tabs.slice(MAX_VISIBLE_TABS).map((tab) => (
                        <div
                          key={tab.id}
                          className={`flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                            tab.isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-700'
                          } ${!tab.isPinned ? 'italic' : ''}`}
                          onClick={() => {
                            activateTab(tab.id);
                            setShowTabDropdown(false);
                          }}
                          title={`${tab.path} ${tab.isPinned ? '(固定)' : '(临时)'}`}
                        >
                          <FileIcon node={{ data: { name: tab.name, isDirectory: false } as FileTreeItem, isOpen: false } as NodeApi<FileTreeItem>} />
                          <span className="ml-2 truncate flex-1">{tab.name}</span>
                          {!tab.isPinned && (
                            <span className="ml-1 text-xs text-gray-400 flex-shrink-0">•</span>
                          )}
                          <button
                            className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            title="关闭标签"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-500">
              <span className="text-sm">暂无打开的文件</span>
            </div>
          )}
        </div>

        {/* 预览内容 */}
        <div className="flex-1 bg-white min-h-0">
          {renderFilePreview()}
        </div>
      </div>
    </div>
  );
};