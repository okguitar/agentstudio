import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, GlobToolInput } from './types';

interface GlobToolProps {
  execution: ToolExecution;
}

export const GlobTool: React.FC<GlobToolProps> = ({ execution }) => {
  const input = execution.toolInput as GlobToolInput;

  // 显示模式作为副标题
  const getSubtitle = () => {
    if (!input.pattern) return undefined;
    return input.pattern;
  };

  // 处理输出结果，按行分割并显示文件数量
  const formatGlobResult = (result: string) => {
    if (!result || !result.trim()) return '没有找到匹配的文件';
    
    const files = result.trim().split('\n').filter(line => line.trim());
    if (files.length === 0) return result;
    
    return `找到 ${files.length} 个匹配的文件:\n\n${result}`;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="匹配模式" value={input.pattern} isCode={true} />
        {input.path && (
          <ToolInput label="搜索路径" value={input.path} />
        )}
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">匹配结果:</p>
          <div className="p-3 rounded-md border bg-blue-50 border-blue-200 text-sm font-mono whitespace-pre-wrap break-words text-blue-700">
            {formatGlobResult(execution.toolResult)}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};