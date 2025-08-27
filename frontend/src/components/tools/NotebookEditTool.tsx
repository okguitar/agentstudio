import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, NotebookEditToolInput } from './types';

interface NotebookEditToolProps {
  execution: ToolExecution;
}

export const NotebookEditTool: React.FC<NotebookEditToolProps> = ({ execution }) => {
  const input = execution.toolInput as NotebookEditToolInput;

  return (
    <BaseToolComponent execution={execution}>
      <div>
        <ToolInput label="Notebook 路径" value={input.notebook_path} />
        
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {input.edit_mode && (
            <span className={`px-2 py-1 text-xs rounded ${
              input.edit_mode === 'insert' ? 'bg-green-200 text-green-800' :
              input.edit_mode === 'delete' ? 'bg-red-200 text-red-800' :
              'bg-blue-200 text-blue-800'
            }`}>
              {input.edit_mode === 'insert' ? '插入' : 
               input.edit_mode === 'delete' ? '删除' : '替换'}
            </span>
          )}
          
          {input.cell_type && (
            <span className="px-2 py-1 bg-purple-200 text-purple-800 text-xs rounded">
              {input.cell_type === 'code' ? '代码' : 'Markdown'}
            </span>
          )}
        </div>
        
        {input.cell_id && (
          <ToolInput label="单元格 ID" value={input.cell_id} />
        )}
        
        {input.edit_mode !== 'delete' && (
          <ToolInput 
            label="新内容" 
            value={input.new_source.length > 300 ? 
              input.new_source.substring(0, 300) + '\n...(已截断)' : 
              input.new_source
            } 
            isCode={true} 
          />
        )}
      </div>
      
    </BaseToolComponent>
  );
};