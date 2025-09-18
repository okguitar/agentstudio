import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import { DiffViewer } from '../DiffViewer';
import type { ToolExecution, MultiEditToolInput } from './types';

interface MultiEditToolProps {
  execution: ToolExecution;
}

export const MultiEditTool: React.FC<MultiEditToolProps> = ({ execution }) => {
  const input = execution.toolInput as MultiEditToolInput;

  return (
    <BaseToolComponent execution={execution} showResult={false}>
      <div>
        <ToolInput label="文件路径" value={input.file_path} />
        
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">
            批量编辑 ({input.edits.length} 个操作):
          </p>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {input.edits.map((edit, index) => (
              <div key={index} className="border border-gray-200 rounded-md bg-white">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-md">
                  <div className="text-xs font-medium text-gray-600">
                    操作 #{index + 1}
                    {edit.replace_all && (
                      <span className="ml-2 px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs">
                        全部替换
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-3">
                  <DiffViewer 
                    oldText={edit.old_string}
                    newText={edit.new_string}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </BaseToolComponent>
  );
};