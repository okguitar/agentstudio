import { useState, useCallback } from 'react';
import { FileTab, FileTreeItem } from '../fileTypes';

interface UseFileTabsOptions {
  onFileSelect?: (filePath: string) => void;
}

export const useFileTabs = ({ onFileSelect }: UseFileTabsOptions = {}) => {
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [temporaryTabId, setTemporaryTabId] = useState<string | null>(null);

  // 获取当前活跃的标签
  const activeTab = tabs.find(tab => tab.id === activeTabId) || null;

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

  return {
    tabs,
    activeTab,
    activeTabId,
    addOrActivateTab,
    closeTab,
    activateTab
  };
};