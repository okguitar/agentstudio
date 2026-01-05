import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import type { NotebookEditInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import { useTranslation } from 'react-i18next';

interface NotebookEditToolProps {
  execution: BaseToolExecution;
}

export const NotebookEditTool: React.FC<NotebookEditToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as NotebookEditInput;

  return (
    <BaseToolComponent execution={execution} hideToolName={false}>
      <div>
        <ToolInput label={t('notebookEditTool.notebookPath')} value={input.notebook_path} />
        
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {input.edit_mode && (
            <span className={`px-2 py-1 text-xs rounded ${
              input.edit_mode === 'insert' ? 'bg-green-200 text-green-800' :
              input.edit_mode === 'delete' ? 'bg-red-200 text-red-800' :
              'bg-blue-200 text-blue-800'
            }`}>
              {input.edit_mode === 'insert' ? t('notebookEditTool.insert') :
               input.edit_mode === 'delete' ? t('notebookEditTool.delete') : t('notebookEditTool.replace')}
            </span>
          )}
          
          {input.cell_type && (
            <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
              {input.cell_type === 'code' ? t('notebookEditTool.code') : t('notebookEditTool.markdown')}
            </span>
          )}
        </div>
        
        {input.cell_id && (
          <ToolInput label={t('notebookEditTool.cellId')} value={input.cell_id} />
        )}

        {input.edit_mode !== 'delete' && (
          <ToolInput
            label={t('notebookEditTool.newContent')}
            value={input.new_source && input.new_source.length > 300 ?
              input.new_source.substring(0, 300) + '\n' + t('notebookEditTool.truncated') :
              input.new_source || ''
            }
            isCode={true}
          />
        )}
      </div>
      
    </BaseToolComponent>
  );
};