import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import type { ToolExecution, NotebookReadToolInput } from './types';

interface NotebookReadToolProps {
  execution: ToolExecution;
}

export const NotebookReadTool: React.FC<NotebookReadToolProps> = ({ execution }) => {
  const input = execution.toolInput as NotebookReadToolInput;

  return (
    <BaseToolComponent execution={execution}>
      <div>
        <ToolInput label="Notebook 路径" value={input.notebook_path} />
        {input.cell_id && (
          <ToolInput label="单元格 ID" value={input.cell_id} />
        )}
      </div>
      
    </BaseToolComponent>
  );
};