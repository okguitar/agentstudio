import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, GrepToolInput } from './types';

interface GrepToolProps {
  execution: ToolExecution;
}

export const GrepTool: React.FC<GrepToolProps> = ({ execution }) => {
  const input = execution.toolInput as GrepToolInput;

  // 显示搜索模式作为副标题
  const getSubtitle = () => {
    if (!input.pattern) return undefined;
    return `"${input.pattern}"`;
  };

  // 格式化搜索结果
  const formatGrepResult = (result: string) => {
    if (!result.trim()) return '没有找到匹配项';
    
    const lines = result.trim().split('\n');
    const mode = input.output_mode || 'files_with_matches';
    
    if (mode === 'files_with_matches') {
      return `找到 ${lines.length} 个匹配的文件:\n\n${result}`;
    } else if (mode === 'count') {
      return `匹配统计:\n\n${result}`;
    } else {
      return result;
    }
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div>
        <ToolInput label="搜索模式" value={input.pattern} isCode={true} />
        {input.path && (
          <ToolInput label="搜索路径" value={input.path} />
        )}
        {input.glob && (
          <ToolInput label="文件过滤" value={input.glob} />
        )}
        {input.type && (
          <ToolInput label="文件类型" value={input.type} />
        )}
        {input.output_mode && (
          <ToolInput label="输出模式" value={input.output_mode} />
        )}
        
        {/* 显示搜索选项 */}
        <div className="flex flex-wrap gap-2 mt-2">
          {input['-i'] && (
            <span className="px-2 py-1 bg-gray-200 text-xs rounded">忽略大小写</span>
          )}
          {input['-n'] && (
            <span className="px-2 py-1 bg-gray-200 text-xs rounded">显示行号</span>
          )}
          {input['-A'] && (
            <span className="px-2 py-1 bg-gray-200 text-xs rounded">后 {input['-A']} 行</span>
          )}
          {input['-B'] && (
            <span className="px-2 py-1 bg-gray-200 text-xs rounded">前 {input['-B']} 行</span>
          )}
          {input['-C'] && (
            <span className="px-2 py-1 bg-gray-200 text-xs rounded">上下 {input['-C']} 行</span>
          )}
          {input.multiline && (
            <span className="px-2 py-1 bg-gray-200 text-xs rounded">多行模式</span>
          )}
        </div>
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">搜索结果:</p>
          <div className="p-3 rounded-md border bg-green-50 border-green-200 text-sm font-mono whitespace-pre-wrap break-words text-green-700">
            {formatGrepResult(execution.toolResult)}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};