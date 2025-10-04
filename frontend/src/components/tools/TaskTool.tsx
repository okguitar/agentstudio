import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, TaskToolInput } from './types';

interface TaskToolProps {
  execution: ToolExecution;
}

export const TaskTool: React.FC<TaskToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as TaskToolInput;

  // 显示任务描述作为副标题
  const getSubtitle = () => {
    if (!input.description) return undefined;
    return input.description.trim();
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label={t('taskTool.taskDescriptionLabel')} value={input.description} />
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
      
    </BaseToolComponent>
  );
};