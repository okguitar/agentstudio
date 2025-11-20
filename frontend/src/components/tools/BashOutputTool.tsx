import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import type { BaseToolExecution, BashOutputToolResult } from './sdk-types';
import type { BashOutputInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import { Terminal, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface BashOutputToolProps {
  execution: BaseToolExecution;
}

export const BashOutputTool: React.FC<BashOutputToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as BashOutputInput;

  // Debug logging
  console.log('🐚 [BashOutputTool] Rendering with execution:', {
    isExecuting: execution.isExecuting,
    hasToolUseResult: !!execution.toolUseResult,
    toolUseResultType: typeof execution.toolUseResult,
    toolUseResult: execution.toolUseResult,
    input
  });

  // 解析工具结果
  const parseToolResult = (): BashOutputToolResult | null => {
    if (!execution.toolUseResult) {
      console.log('🐚 [BashOutputTool] No toolUseResult, returning null');
      return null;
    }
    
    // 如果toolUseResult是对象，直接使用
    if (typeof execution.toolUseResult === 'object') {
      return execution.toolUseResult as BashOutputToolResult;
    }
    
    // 如果是字符串，尝试解析
    if (typeof execution.toolUseResult === 'string') {
      try {
        return JSON.parse(execution.toolUseResult) as BashOutputToolResult;
      } catch {
        // 如果解析失败，可能是简单的状态文本
        const statusText = execution.toolUseResult.trim();
        const status = statusText.includes('running') ? 'running' :
                      statusText.includes('completed') ? 'completed' :
                      statusText.includes('killed') ? 'killed' :
                      statusText.includes('failed') ? 'failed' : 'running';
        return {
          shellId: input.bash_id,
          command: '',
          status,
          exitCode: null,
          stdout: '',
          stderr: '',
          stdoutLines: 0,
          stderrLines: 0,
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return null;
  };

  const result = parseToolResult();

  // 显示bash_id和状态作为副标题
  const getSubtitle = () => {
    // 优先使用result中的shellId，然后是input中的bash_id
    const shellId = result?.shellId || input.bash_id;
    if (!shellId) return undefined;

    let subtitle = `${t('bashOutputTool.shellPrefix')} ${shellId}`;
    if (result?.status) {
      subtitle += ` • ${result.status}`;
    }
    return subtitle;
  };

  // 获取状态图标和样式
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'running':
        return {
          icon: <Terminal className="w-4 h-4" />,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          text: t('bashOutputTool.status.running')
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          className: 'bg-green-100 text-green-800 border-green-200',
          text: t('bashOutputTool.status.completed')
        };
      case 'killed':
        return {
          icon: <XCircle className="w-4 h-4" />,
          className: 'bg-red-100 text-red-800 border-red-200',
          text: t('bashOutputTool.status.killed')
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          text: t('bashOutputTool.status.failed')
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          text: status
        };
    }
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div className="space-y-4">
        {result && (
          <>
            {/* 状态和命令信息 */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              {/* 执行状态 - 左对齐，去掉label */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusDisplay(result.status || 'unknown').className}`}>
                {getStatusDisplay(result.status || 'unknown').icon}
                {getStatusDisplay(result.status || 'unknown').text}
              </div>
              
              {/* 执行命令 - 使用 > 前缀样式 */}
              {result.command && (
                <div className="bg-white border rounded px-3 py-2 text-sm font-mono text-gray-800">
                  <span className="text-gray-500 mr-2">&gt;</span>
                  <span className="break-all">{result.command}</span>
                </div>
              )}
              
              {/* 过滤信息 */}
              {(result.filterPattern || input.filter) && (
                <div className="bg-white border rounded px-3 py-2 text-sm font-mono text-gray-800">
                  <span className="text-gray-500 mr-2">filter:</span>
                  <span className="break-all">{result.filterPattern || input.filter}</span>
                </div>
              )}
              
              {/* 简化的统计信息 - 只保留退出码和时间 */}
              <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                {result.exitCode !== undefined && result.exitCode !== null && (
                  <span>{t('bashOutputTool.exitCode')}: {result.exitCode}</span>
                )}
                {result.timestamp && (
                  <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            
            {/* 标准输出 */}
            {result.stdout && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Terminal className="w-4 h-4" />
                  {t('bashOutputTool.stdout')}
                </div>
                <pre className="bg-gray-900 text-green-400 rounded-lg px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap border">
                  {result.stdout.trim()}
                </pre>
              </div>
            )}

            {/* 错误输出 */}
            {result.stderr && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  {t('bashOutputTool.stderr')}
                </div>
                <pre className="bg-red-50 text-red-800 border border-red-200 rounded-lg px-3 py-2 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                  {result.stderr.trim()}
                </pre>
              </div>
            )}
          </>
        )}
        
        {/* 如果没有结果，显示请求信息 */}
        {!result && (
          <div className="text-sm text-gray-600">
            {t('bashOutputTool.fetchingOutput', { shellId: input.bash_id })}
            {input.filter && (
              <div className="mt-1 text-xs text-gray-500">
                {t('bashOutputTool.filterCondition')}: <code className="bg-gray-100 px-1 rounded">{input.filter}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};