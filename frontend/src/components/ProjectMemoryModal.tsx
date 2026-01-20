import React, { useState, useEffect } from 'react';
import { X, Save, FileText, AlertCircle } from 'lucide-react';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface ProjectMemoryModalProps {
  project: Project;
  onClose: () => void;
}

export const ProjectMemoryModal: React.FC<ProjectMemoryModalProps> = ({
  project,
  onClose
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClaudeFile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authFetch(`${API_BASE}/projects/claude-md?path=${encodeURIComponent(project.path)}`);

        if (response.ok) {
          const data = await response.json();
          setContent(data.content || '');
        } else if (response.status === 404) {
          // File doesn't exist yet, start with empty content
          setContent('');
        } else {
          throw new Error('加载 CLAUDE.md 文件失败');
        }
      } catch (error) {
        console.error('Failed to load CLAUDE.md:', error);
        setError(error instanceof Error ? error.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    loadClaudeFile();
  }, [project.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await authFetch(`${API_BASE}/projects/claude-md?path=${encodeURIComponent(project.path)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('保存 CLAUDE.md 文件失败');
      }

      // Success feedback
      const saveButton = document.getElementById('save-button');
      if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = '已保存';
        setTimeout(() => {
          if (saveButton.textContent === '已保存') {
            saveButton.textContent = originalText;
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to save CLAUDE.md:', error);
      setError(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">项目记忆管理</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <div className="text-gray-600 dark:text-gray-400">正在加载 CLAUDE.md...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">加载失败</h3>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                编辑项目的记忆文件 (CLAUDE.md)，用于存储项目相关的上下文信息和指导。
              </div>

              <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# 项目记忆

此文件用于存储项目相关的上下文信息、开发指导和重要注意事项。

## 项目概述
描述项目的主要功能和目标...

## 开发规范
记录代码规范、架构决策等...

## 重要注意事项
记录需要特别注意的地方..."
                  className="w-full h-full p-4 border-0 resize-none focus:outline-none font-mono text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            <button
              id="save-button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? '保存中...' : '保存'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};