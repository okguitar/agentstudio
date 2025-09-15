import React from 'react';
import { BaseToolComponent } from './BaseToolComponent';
import type { ToolExecution, KillBashToolInput } from './types';
import { Square, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface KillBashToolProps {
  execution: ToolExecution;
}

export const KillBashTool: React.FC<KillBashToolProps> = ({ execution }) => {
  const input = execution.toolInput as KillBashToolInput;

  // 解析执行结果
  const parseResult = () => {
    if (!execution.toolResult) return null;
    
    try {
      return JSON.parse(execution.toolResult);
    } catch {
      return { message: execution.toolResult };
    }
  };

  const result = parseResult();

  // 显示shell_id和进程名作为副标题
  const getSubtitle = () => {
    if (!input.shell_id) return undefined;
    // 从结果中提取进程名
    const processName = result?.message?.match(/\(([^)]+)\)/)?.[1] || '';
    return processName 
      ? `终止 Shell ${input.shell_id} (${processName})`
      : `终止 Shell ${input.shell_id}`;
  };

  // 判断是否成功终止
  const isSuccess = () => {
    if (execution.isError) return false;
    if (result?.success === true) return true;
    if (result?.message?.includes('killed') || result?.message?.includes('Successfully')) return true;
    return false;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div className="space-y-3">
        {/* 操作状态指示器 */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${
            execution.isExecuting 
              ? 'bg-yellow-100' 
              : isSuccess()
              ? 'bg-green-100'
              : execution.isError
              ? 'bg-red-100'
              : 'bg-gray-100'
          }`}>
            {execution.isExecuting ? (
              <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
            ) : isSuccess() ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : execution.isError ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-600" />
            )}
          </div>
          
          <div>
            <div className={`font-medium ${
              execution.isExecuting 
                ? 'text-yellow-800' 
                : isSuccess()
                ? 'text-green-800'
                : execution.isError
                ? 'text-red-800'
                : 'text-gray-800'
            }`}>
              {execution.isExecuting 
                ? '正在终止进程...' 
                : isSuccess()
                ? '进程已成功终止'
                : execution.isError
                ? '终止进程失败'
                : '准备终止进程'
              }
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Shell ID: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{input.shell_id}</code>
            </div>
          </div>
        </div>
        
        {/* 结果消息 */}
        {result && result.message && (
          <div className={`p-3 rounded-md text-sm font-mono ${
            isSuccess()
              ? 'bg-green-100 text-green-800 border border-green-200'
              : execution.isError
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            {result.message}
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};