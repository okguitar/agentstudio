import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, LSToolInput } from './types';

interface LSToolProps {
  execution: ToolExecution;
}

export const LSTool: React.FC<LSToolProps> = ({ execution }) => {
  const input = execution.toolInput as LSToolInput;

  // 提取相对路径作为副标题
  const getSubtitle = () => {
    if (!input.path) return undefined;
    // 简化路径显示，如果是绝对路径则尝试显示相对部分
    const path = input.path;
    if (path.includes('slides/ai-editor/')) {
      return path.split('slides/ai-editor/')[1] || path;
    }
    return path.split('/').slice(-2).join('/') || path;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="目录路径" value={input.path} />
        {input.ignore && input.ignore.length > 0 && (
          <ToolInput label="忽略模式" value={input.ignore.join(', ')} />
        )}
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">目录结构:</p>
          <div className="p-3 rounded-md border bg-yellow-50 border-yellow-200 text-sm font-mono whitespace-pre-wrap break-words text-yellow-800">
            {execution.toolResult}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};