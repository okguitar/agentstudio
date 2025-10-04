import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, NotebookReadToolInput } from './types';

interface NotebookReadToolProps {
  execution: ToolExecution;
}

export const NotebookReadTool: React.FC<NotebookReadToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as NotebookReadToolInput;

  return (
    <BaseToolComponent execution={execution}>
      <div>
        <ToolInput label={t('notebookReadTool.notebookPath')} value={input.notebook_path} />
        {input.cell_id && (
          <ToolInput label={t('notebookReadTool.cellId')} value={input.cell_id} />
        )}
      </div>
      
    </BaseToolComponent>
  );
};