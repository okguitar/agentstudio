import React, { useState } from 'react';
import type { SystemPrompt, PresetSystemPrompt } from '../types/agents';

interface SystemPromptEditorProps {
  value: SystemPrompt;
  onChange: (prompt: SystemPrompt) => void;
  disabled?: boolean;
}


export const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({ 
  value, 
  onChange, 
  disabled = false 
}) => {
  const [promptType, setPromptType] = useState<'custom' | 'preset'>(
    typeof value === 'string' ? 'custom' : 'preset'
  );

  const handleTypeChange = (newType: 'custom' | 'preset') => {
    setPromptType(newType);
    if (newType === 'custom') {
      onChange(''); // 重置为空字符串
    } else {
      onChange({ type: 'preset', preset: 'claude_code' }); // 使用默认预设
    }
  };

  
  const handleAppendChange = (append: string) => {
    const currentPrompt = value as PresetSystemPrompt;
    onChange({ type: 'preset', preset: currentPrompt?.preset || 'claude_code', append });
  };

  const handleCustomPromptChange = (customPrompt: string) => {
    onChange(customPrompt);
  };

  return (
    <div className="space-y-3">
      {/* 提示词类型选择 */}
      <div className="flex items-center space-x-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          提示词类型:
        </label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleTypeChange('custom')}
            disabled={disabled}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              promptType === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            自定义
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('preset')}
            disabled={disabled}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              promptType === 'preset'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            预设
          </button>
        </div>
      </div>

      {/* 自定义提示词输入 */}
      {promptType === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            系统提示词
          </label>
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => handleCustomPromptChange(e.target.value)}
            disabled={disabled}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm dark:bg-gray-700 dark:text-white"
            placeholder="输入助手的系统提示词..."
          />
        </div>
      )}

      {/* 预设提示词配置 */}
      {promptType === 'preset' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              预设类型
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm dark:text-white">
              Claude Code 预设 (使用 Claude Code SDK 的默认提示词)
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              所有预设都基于 Claude Code SDK 的默认提示词，通过追加内容来定制不同用途
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              追加提示词 (可选)
            </label>
            <textarea
              value={(value as PresetSystemPrompt)?.append || ''}
              onChange={(e) => handleAppendChange(e.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm dark:bg-gray-700 dark:text-white"
              placeholder="在预设提示词后追加自定义内容..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              这段内容将追加到 Claude Code 默认提示词的后面
            </p>
          </div>
        </div>
      )}
    </div>
  );
};