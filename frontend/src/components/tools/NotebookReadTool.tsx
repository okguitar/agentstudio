import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { BaseToolExecution, NotebookReadToolInput } from './sdk-types';

interface NotebookReadToolProps {
  execution: BaseToolExecution;
}

export const NotebookReadTool: React.FC<NotebookReadToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as NotebookReadToolInput;

  return (
    <BaseToolComponent execution={execution} hideToolName={false}>
      <div>
        <ToolInput label={t('notebookReadTool.notebookPath')} value={input.notebook_path} />
        {input.cell_id && (
          <ToolInput label={t('notebookReadTool.cellId')} value={input.cell_id} />
        )}
      </div>
      
    </BaseToolComponent>
  );
};