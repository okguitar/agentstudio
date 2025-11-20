import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import type { AgentInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface TaskToolProps {
  execution: BaseToolExecution;
}

export const TaskTool: React.FC<TaskToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as AgentInput;

  // 显示任务描述作为副标题
  const getSubtitle = () => {
    if (!input.description) return undefined;
    return input.description.trim();
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div className="space-y-3">
        <ToolInput label={t('taskTool.taskDescriptionLabel')} value={input.description} />

        {/* 代理类型 */}
        <div>
          <span className="text-xs font-medium text-gray-600 block mb-1">
            {t('taskTool.agentType')}
          </span>
          <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {input.subagent_type}
          </span>
        </div>

        {/* 模型选择 */}
        {input.model && (
          <div>
            <span className="text-xs font-medium text-gray-600 block mb-1">
              {t('taskTool.model')}
            </span>
            <span className={`text-sm px-2 py-1 rounded ${
              input.model === 'sonnet' ? 'bg-orange-100 text-orange-800' :
              input.model === 'opus' ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'
            }`}>
              {input.model.charAt(0).toUpperCase() + input.model.slice(1)}
            </span>
          </div>
        )}

        {/* 恢复任务ID */}
        {input.resume && (
          <div>
            <span className="text-xs font-medium text-gray-600 block mb-1">
              {t('taskTool.resumeTask')}
            </span>
            <span className="text-sm px-2 py-1 bg-amber-100 text-amber-800 rounded">
              {t('taskTool.fromPreviousExecution')}
            </span>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              {input.resume}
            </div>
          </div>
        )}

        {/* 任务提示 */}
        <div>
          <ToolInput
            label={t('taskTool.taskPromptLabel')}
            value={input.prompt.length > 300 ?
              input.prompt.substring(0, 300) + '\n' + t('taskTool.truncated') :
              input.prompt
            }
            isCode={true}
          />
          {input.prompt.length > 300 && (
            <div className="text-xs text-gray-500 mt-1">
              {t('taskTool.totalLength', { length: input.prompt.length })}
            </div>
          )}
        </div>

        {/* 执行中状态显示 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">
              {input.model ?
                t('taskTool.executingWithModel', { model: input.model }) :
                t('taskTool.executing')
              }
            </span>
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};