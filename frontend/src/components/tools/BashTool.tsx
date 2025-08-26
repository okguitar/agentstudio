import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
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

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        {input.description && (
          <ToolInput label="描述" value={input.description} />
        )}
        <ToolInput label="命令" value={input.command} isCode={true} />
        {input.timeout && (
          <ToolInput label="超时时间" value={`${input.timeout}ms`} />
        )}
      </div>
      
    </BaseToolComponent>
  );
};