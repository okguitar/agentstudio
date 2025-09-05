import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  ArrowUp, 
  Home, 
  X, 
  Eye, 
  EyeOff,
  ChevronRight,
  FolderPlus 
} from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  modified: string;
  isHidden: boolean;
}

interface FileBrowserData {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
}

interface FileBrowserProps {
  title?: string;
  initialPath?: string;
  allowFiles?: boolean;
  allowDirectories?: boolean;
  allowNewDirectory?: boolean;
  onSelect: (path: string, isDirectory: boolean) => void;
  onClose: () => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  title = '选择文件或目录',
  initialPath,
  allowFiles = true,
  allowDirectories = true,
  allowNewDirectory = false,
  onSelect,
  onClose
}) => {
  const [data, setData] = useState<FileBrowserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fetchDirectory = async (path?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/agents/filesystem/browse', window.location.origin);
      if (path) {
        url.searchParams.set('path', path);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to browse directory');
      }
      
      const result: FileBrowserData = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch directory:', error);
      setError(error instanceof Error ? error.message : '加载目录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory(initialPath);
  }, [initialPath]);

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      fetchDirectory(item.path);
    } else {
      setSelectedPath(item.path);
    }
  };

  const handleItemSelect = (item: FileItem) => {
    if ((item.isDirectory && allowDirectories) || (!item.isDirectory && allowFiles)) {
      onSelect(item.path, item.isDirectory);
    }
  };

  const goToParent = () => {
    if (data?.parentPath) {
      fetchDirectory(data.parentPath);
    }
  };

  const goToHome = () => {
    fetchDirectory();
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim() || !data?.currentPath) return;
    
    setCreatingFolder(true);
    try {
      const response = await fetch('/api/agents/filesystem/create-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentPath: data.currentPath,
          directoryName: newFolderName.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建目录失败');
      }
      
      // Refresh current directory to show new folder
      await fetchDirectory(data.currentPath);
      
      // Reset dialog state
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Failed to create directory:', error);
      alert(error instanceof Error ? error.message : '创建目录失败');
    } finally {
      setCreatingFolder(false);
    }
  };

  const filteredItems = data?.items.filter(item => showHidden || !item.isHidden) || [];

  const formatSize = (size: number | null) => {
    if (size === null) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-2 p-4 border-b border-gray-100">
          <button
            onClick={goToHome}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="主目录"
          >
            <Home className="w-4 h-4" />
          </button>
          
          <button
            onClick={goToParent}
            disabled={!data?.parentPath}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="上级目录"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          
          <div className="flex-1 px-3 py-2 bg-gray-50 rounded text-sm text-gray-600 font-mono">
            {data?.currentPath || '加载中...'}
          </div>
          
          {allowNewDirectory && (
            <button
              onClick={() => setShowNewFolderDialog(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="新建目录"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={() => setShowHidden(!showHidden)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={showHidden ? '隐藏隐藏文件' : '显示隐藏文件'}
          >
            {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              <p>错误: {error}</p>
            </div>
          ) : (
            <div 
              className="flex-1 overflow-y-auto"
              onWheel={(e) => {
                // 防止滚动事件穿透到底层页面
                e.stopPropagation();
              }}
            >
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">修改时间</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item, index) => (
                    <tr 
                      key={index}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedPath === item.path ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 flex items-center space-x-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {item.isDirectory ? (
                            <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <File className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => handleItemClick(item)}
                            className={`text-left truncate hover:text-blue-600 ${
                              item.isHidden ? 'text-gray-400' : 'text-gray-900'
                            }`}
                          >
                            {item.name}
                          </button>
                          {item.isDirectory && (
                            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatSize(item.size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(item.modified).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleItemSelect(item)}
                          disabled={
                            (item.isDirectory && !allowDirectories) || 
                            (!item.isDirectory && !allowFiles)
                          }
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          选择
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>此目录为空</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredItems.length > 0 && (
              <span>{filteredItems.length} 个项目</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
      
      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">新建目录</h3>
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                在以下位置创建新目录：
              </p>
              <div className="p-2 bg-gray-100 rounded text-sm font-mono text-gray-800 break-all">
                {data?.currentPath}
              </div>
            </div>
            
            <div className="mb-6">
              <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                目录名称
              </label>
              <input
                id="folderName"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="输入目录名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim() && !creatingFolder) {
                    handleCreateNewFolder();
                  }
                }}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                disabled={creatingFolder}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateNewFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creatingFolder ? '创建中...' : '创建目录'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};