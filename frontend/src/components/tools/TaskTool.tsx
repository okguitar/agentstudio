import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import { SubAgentMessageFlow } from './SubAgentMessageFlow';
import { useSubAgentStore } from '../../stores/useSubAgentStore';
import type { BaseToolExecution } from './sdk-types';
import type { AgentInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type { TaskToolResult, SubAgentMessage } from './types';
import { Clock, Zap, Hash, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TaskToolProps {
  execution: BaseToolExecution;
}

// 格式化时间
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

// 任务统计信息组件
const TaskStats: React.FC<{
  result: TaskToolResult;
}> = ({ result }) => {
  const { t } = useTranslation('components');

  return (
    <div className="flex flex-wrap gap-3 mt-3 text-xs">
      {result.status && (
        <div className={`flex items-center space-x-1 px-2 py-1 rounded ${
          result.status === 'completed' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
            : result.status === 'failed'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        }`}>
          {result.status === 'completed' ? (
            <CheckCircle className="w-3 h-3" />
          ) : result.status === 'failed' ? (
            <XCircle className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          <span>{t(`taskTool.status.${result.status}`)}</span>
        </div>
      )}

      {result.totalDurationMs !== undefined && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(result.totalDurationMs)}</span>
        </div>
      )}

      {result.totalToolUseCount !== undefined && result.totalToolUseCount > 0 && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
          <Zap className="w-3 h-3" />
          <span>{t('taskTool.toolCallCount', { count: result.totalToolUseCount })}</span>
        </div>
      )}

      {result.totalTokens !== undefined && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
          <Hash className="w-3 h-3" />
          <span>{result.totalTokens.toLocaleString()} tokens</span>
        </div>
      )}
    </div>
  );
};

export const TaskTool: React.FC<TaskToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as AgentInput;
  const toolUseResult = execution.toolUseResult as TaskToolResult | undefined;
  
  // 获取Task工具的Claude ID（用于关联子Agent消息）
  // claudeId存储在toolData中（由useAIStreamHandler设置）
  const taskToolClaudeId = (execution as any).claudeId || (execution as any).toolData?.claudeId;
  
  // 调试日志
  console.log('🎯 [TaskTool] claudeId:', taskToolClaudeId, 'isExecuting:', execution.isExecuting);
  
  // 订阅实时的子Agent消息流（通过parentToolUseId关联）
  const activeTasks = useSubAgentStore((state) => state.activeTasks);
  const activeTask = taskToolClaudeId ? activeTasks.get(taskToolClaudeId) : undefined;
  
  // 调试日志
  if (taskToolClaudeId) {
    console.log('🎯 [TaskTool] activeTask:', activeTask ? `found with ${activeTask.messageFlow.length} messages` : 'not found');
  }
  
  // 合并历史消息流和实时消息流
  const subAgentMessageFlow = useMemo((): SubAgentMessage[] => {
    // 如果任务完成，使用历史消息流
    if (!execution.isExecuting && toolUseResult?.subAgentMessageFlow) {
      return toolUseResult.subAgentMessageFlow;
    }
    // 如果任务正在执行，使用实时消息流
    if (activeTask?.messageFlow && activeTask.messageFlow.length > 0) {
      return activeTask.messageFlow;
    }
    // 默认返回历史消息流（如果有）
    return toolUseResult?.subAgentMessageFlow || [];
  }, [execution.isExecuting, toolUseResult?.subAgentMessageFlow, activeTask?.messageFlow]);

  // 显示任务描述作为副标题
  const getSubtitle = () => {
    if (!input.description) return undefined;
    return input.description.trim();
  };
  
  // 获取任务提示词
  const taskPrompt = input.prompt || toolUseResult?.prompt || '';

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false} hideToolName={false}>
      <div className="space-y-3">
        <ToolInput label={t('taskTool.taskDescriptionLabel')} value={input.description} />

        {/* 代理类型 */}
        <div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
            {t('taskTool.agentType')}
          </span>
          <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
            {input.subagent_type}
          </span>
        </div>

        {/* 模型选择 */}
        {input.model && (
          <div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
              {t('taskTool.model')}
            </span>
            <span className={`text-sm px-2 py-1 rounded ${
              input.model === 'sonnet' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
              input.model === 'opus' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            }`}>
              {input.model.charAt(0).toUpperCase() + input.model.slice(1)}
            </span>
          </div>
        )}

        {/* 恢复任务ID */}
        {input.resume && (
          <div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
              {t('taskTool.resumeTask')}
            </span>
            <span className="text-sm px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded">
              {t('taskTool.fromPreviousExecution')}
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              {input.resume}
            </div>
          </div>
        )}

        {/* 执行中状态显示 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {input.model ?
                t('taskTool.executingWithModel', { model: input.model }) :
                t('taskTool.executing')
              }
            </span>
            {activeTask && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({activeTask.messageFlow.reduce((sum, m) => sum + m.messageParts.length, 0)} {t('taskTool.partsReceived')})
              </span>
            )}
          </div>
        )}

        {/* 任务完成后显示统计信息 */}
        {!execution.isExecuting && toolUseResult && (
          <TaskStats result={toolUseResult} />
        )}

        {/* 子Agent消息流 - 执行中或完成后都可以显示 */}
        {subAgentMessageFlow.length > 0 && taskPrompt && (
          <SubAgentMessageFlow
            taskPrompt={taskPrompt}
            messageFlow={subAgentMessageFlow}
            defaultExpanded={execution.isExecuting}
          />
        )}
      </div>
    </BaseToolComponent>
  );
};
