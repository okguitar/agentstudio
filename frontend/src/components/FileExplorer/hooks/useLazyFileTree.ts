import { useState, useCallback, useRef, useEffect } from 'react';
import { useFileTree, type FileSystemItem } from '../../../hooks/useFileSystem';
import { API_BASE } from '../../../lib/config';
import { authFetch } from '../../../lib/authFetch';
import { FileTreeItem } from '../fileTypes';
import { DEBOUNCE_TIME } from '../constants';

interface UseLazyFileTreeOptions {
  projectPath?: string;
  showHiddenFiles?: boolean;
}

export const useLazyFileTree = ({ projectPath, showHiddenFiles }: UseLazyFileTreeOptions = {}) => {
  // 懒加载相关状态
  const [loadedDirectories, setLoadedDirectories] = useState<Set<string>>(new Set());
  const [dynamicTreeData, setDynamicTreeData] = useState<FileTreeItem[]>([]);
  const [loadingDirectories, setLoadingDirectories] = useState<Set<string>>(new Set());
  
  // 防抖状态 - 防止双重触发
  const [lastToggleTime, setLastToggleTime] = useState<Record<string, number>>({});
  
  const treeApiRef = useRef<any>(null);

  // 使用文件树 hook，懒加载根目录
  const { 
    data: fileTreeData, 
    isLoading: isTreeLoading, 
    error: treeError,
    refetch: refetchTree
  } = useFileTree(projectPath, showHiddenFiles);

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
      if (showHiddenFiles) {
        searchParams.append('showHiddenFiles', 'true');
      }

      const response = await authFetch(`${API_BASE}/files/browse?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to browse directory');
      }
      
      const data = await response.json();
      const childItems: FileSystemItem[] = [];

      for (const item of data.items) {
        // 后端已经处理了隐藏文件过滤，这里不再需要手动过滤
        
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
      // 但是如果当前目录为空，不要关闭它，让用户看到空目录状态
      if (treeApiRef.current && childItems.length > 0) {
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
  }, [loadedDirectories, loadingDirectories, showHiddenFiles]);

  // 刷新文件树的统一方法
  const refreshFileTree = useCallback(() => {
    console.log('Refreshing file tree...');
    // 重置懒加载状态
    setLoadedDirectories(new Set());
    setLoadingDirectories(new Set());
    // 重新获取根目录数据
    refetchTree();
  }, [refetchTree]);

  // 处理目录展开/收起
  const handleDirectoryToggle = useCallback((node: any) => {
    // 防抖处理 - 防止短时间内重复触发
    const currentTime = Date.now();
    const lastTime = lastToggleTime[node.data.path] || 0;
    if (currentTime - lastTime < DEBOUNCE_TIME) {
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

  // 创建初始展开状态 - 明确设置所有目录为关闭状态
  const initialOpenState = (() => {
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
  })();

  return {
    // 数据
    treeData: dynamicTreeData,
    isTreeLoading,
    treeError,
    loadingDirectories,
    
    // 状态
    loadedDirectories,
    
    // 方法
    refreshFileTree,
    handleDirectoryToggle,
    
    // 工具
    setTreeApi: (api: any) => { treeApiRef.current = api; },
    initialOpenState
  };
};