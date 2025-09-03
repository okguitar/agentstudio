import React, { useState, useEffect } from 'react';
import { 
  Save,
  Brain,
  Edit,
  FileText
} from 'lucide-react';

export const MemorySettingsPage: React.FC = () => {
  const [globalMemory, setGlobalMemory] = useState('');
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  // Load global memory
  useEffect(() => {
    loadGlobalMemory();
  }, []);

  const loadGlobalMemory = async () => {
    setIsLoadingMemory(true);
    try {
      const response = await fetch('/api/settings/global-memory');
      if (response.ok) {
        const data = await response.text();
        setGlobalMemory(data);
      }
    } catch (error) {
      console.error('Failed to load global memory:', error);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const saveGlobalMemory = async () => {
    try {
      const response = await fetch('/api/settings/global-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: globalMemory,
      });
      
      if (response.ok) {
        setIsEditingMemory(false);
        alert('全局记忆已保存');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save global memory:', error);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">全局记忆设置</h2>
        <p className="text-gray-600">全局记忆是所有AI助手共享的背景信息，包含您的工作偏好、项目信息等</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          <p className="text-sm text-gray-600">
            内容来自用户目录下的 <code className="bg-gray-100 px-1 rounded">~/.claude/CLAUDE.md</code> 文件。
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block font-medium text-gray-900">记忆内容</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditingMemory(!isEditingMemory)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  <span>{isEditingMemory ? '取消编辑' : '编辑'}</span>
                </button>
                <button
                  onClick={loadGlobalMemory}
                  disabled={isLoadingMemory}
                  className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isLoadingMemory ? '刷新中...' : '刷新'}</span>
                </button>
              </div>
            </div>
            
            {isEditingMemory ? (
              <div className="space-y-3">
                <textarea
                  value={globalMemory}
                  onChange={(e) => setGlobalMemory(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="在这里编写您的全局记忆内容..."
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsEditingMemory(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveGlobalMemory}
                    className="flex items-center space-x-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    <span>保存记忆</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[300px]">
                {isLoadingMemory ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">正在加载全局记忆...</div>
                  </div>
                ) : globalMemory ? (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {globalMemory}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>暂无全局记忆内容</p>
                      <p className="text-xs mt-1">点击"编辑"按钮开始添加</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• 全局记忆将在每次对话时自动加载，为AI提供背景信息</p>
              <p>• 建议包含：工作偏好、项目背景、个人信息等</p>
              <p>• 文件位置：<code className="bg-gray-100 px-1 rounded">~/.claude/CLAUDE.md</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};