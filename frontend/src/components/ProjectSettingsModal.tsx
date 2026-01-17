import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Settings, Server, Bot } from 'lucide-react';
import { useClaudeVersions } from '../hooks/useClaudeVersions';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { showError, showSuccess } from '../utils/toast';

interface Project {
  id: string;
  name: string;
  path: string;
  defaultProviderId?: string;
  defaultModel?: string;
}

interface ProjectSettingsModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  project,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation('pages');
  const { data: claudeVersionsData } = useClaudeVersions();
  
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      setSelectedProviderId(project.defaultProviderId || '');
      setSelectedModel(project.defaultModel || '');
    }
  }, [project]);

  // Get available models based on selected provider
  const availableModels = useMemo(() => {
    if (!claudeVersionsData?.versions) return [];

    if (selectedProviderId) {
      const version = claudeVersionsData.versions.find(v => v.id === selectedProviderId);
      return version?.models || [];
    }

    // If no provider selected, show default version's models
    const defaultVersion = claudeVersionsData.versions.find(
      v => v.id === claudeVersionsData.defaultVersionId
    ) || claudeVersionsData.versions[0];
    return defaultVersion?.models || [];
  }, [claudeVersionsData, selectedProviderId]);

  // When provider changes, reset model if current model is not available
  useEffect(() => {
    if (availableModels.length > 0 && selectedModel) {
      const modelExists = availableModels.some(m => m.id === selectedModel);
      if (!modelExists) {
        setSelectedModel('');
      }
    }
  }, [availableModels, selectedModel]);

  const handleSave = async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      const response = await authFetch(`${API_BASE}/projects/${encodeURIComponent(project.path)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          defaultProviderId: selectedProviderId || '',
          defaultModel: selectedModel || '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存失败');
      }

      showSuccess('项目设置已保存');
      onSaved();
      onClose();
    } catch (error) {
      console.error('Failed to save project settings:', error);
      showError(error instanceof Error ? error.message : '保存项目设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                项目设置
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Server className="w-4 h-4" />
              默认供应商
            </label>
            <select
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">使用系统默认</option>
              {claudeVersionsData?.versions?.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name} {version.isDefault ? '(系统默认)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              设置此项目使用的 API 密钥和环境配置
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Bot className="w-4 h-4" />
              默认模型
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">使用供应商首选模型</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              设置此项目的默认 AI 模型（可在聊天时覆盖）
            </p>
          </div>

          {/* Priority Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              配置优先级
            </h4>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>1. 聊天时手动选择（最高优先级）</li>
              <li>2. 项目默认设置（此处配置）</li>
              <li>3. 供应商首选模型</li>
              <li>4. 系统默认配置</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};
