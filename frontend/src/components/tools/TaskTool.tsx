import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import type { ToolExecution, TaskToolInput } from './types';

interface TaskToolProps {
  execution: ToolExecution;
}

export const TaskTool: React.FC<TaskToolProps> = ({ execution }) => {
  const input = execution.toolInput as TaskToolInput;

  // 显示任务描述作为副标题
  const getSubtitle = () => {
    if (!input.description) return undefined;
    return input.description.trim();
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="任务描述" value={input.description} />
        <ToolInput 
          label="任务提示" 
          value={input.prompt.length > 300 ? 
            input.prompt.substring(0, 300) + '\n...(已截断)' : 
            input.prompt
          } 
          isCode={true} 
        />
        {input.prompt.length > 300 && (
          <div className="text-xs text-gray-500 mt-1">
            总长度: {input.prompt.length} 字符
          </div>
        )}
      </div>
      
    </BaseToolComponent>
  );
};