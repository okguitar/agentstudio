import React from 'react';
import { BaseToolComponent } from './BaseToolComponent';
import type { ToolExecution, BashToolInput } from './types';

interface BashToolProps {
  execution: ToolExecution;
}

export const BashTool: React.FC<BashToolProps> = ({ execution }) => {
  const input = execution.toolInput as BashToolInput;

  // 显示命令作为副标题
  const getSubtitle = () => {
    if (!input.command) return undefined;
    return input.command.trim();
  };

  // 解析执行结果
  const getExecutionResult = () => {
    if (execution.isExecuting) {
      return "执行中...";
    }
    if (execution.isError) {
      return execution.toolResult || "执行出错";
    }
    return execution.toolResult || "";
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div className="space-y-3">
        {/* 描述信息（如果有） */}
        {input.description && (
          <div className="text-sm text-gray-600 mb-2">
            {input.description}
          </div>
        )}
        
        {/* 终端样式的命令执行区域 */}
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
          {/* 命令行提示符和命令 */}
          <div className="flex items-start">
            <span className="text-green-400 mr-2 select-none">$</span>
            <span className="text-white break-all flex-1">{input.command}</span>
          </div>
          
          {/* 执行结果 */}
          {!execution.isExecuting && execution.toolResult && (
            <div className="mt-2">
              <pre className={`whitespace-pre-wrap break-words ${
                execution.isError 
                  ? 'text-red-400' 
                  : 'text-gray-300'
              }`}>
                {getExecutionResult()}
              </pre>
            </div>
          )}
          
          {/* 执行中状态 */}
          {execution.isExecuting && (
            <div className="mt-2">
              <span className="text-yellow-400 animate-pulse">执行中...</span>
            </div>
          )}
        </div>
        
        {/* 额外信息 */}
        {input.timeout && (
          <div className="text-xs text-gray-500">
            超时时间: {input.timeout}ms
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};