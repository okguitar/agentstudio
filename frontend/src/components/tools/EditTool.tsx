import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, EditToolInput } from './types';

interface EditToolProps {
  execution: ToolExecution;
}

export const EditTool: React.FC<EditToolProps> = ({ execution }) => {
  const input = execution.toolInput as EditToolInput;

  // 提取文件名作为副标题
  const getSubtitle = () => {
    if (!input.file_path) return undefined;
    const fileName = input.file_path.split('/').pop() || input.file_path;
    return fileName;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="文件路径" value={input.file_path} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <ToolInput 
              label="原文本" 
              value={input.old_string.length > 200 ? 
                input.old_string.substring(0, 200) + '\n...(已截断)' : 
                input.old_string
              } 
              isCode={true}
              className="mb-0"
            />
          </div>
          <div>
            <ToolInput 
              label="新文本" 
              value={input.new_string.length > 200 ? 
                input.new_string.substring(0, 200) + '\n...(已截断)' : 
                input.new_string
              } 
              isCode={true}
              className="mb-0"
            />
          </div>
        </div>
        
        {input.replace_all && (
          <ToolInput label="全部替换" value="是" />
        )}
      </div>
      
    </BaseToolComponent>
  );
};