import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import type { ToolExecution, MultiEditToolInput } from './types';

interface MultiEditToolProps {
  execution: ToolExecution;
}

export const MultiEditTool: React.FC<MultiEditToolProps> = ({ execution }) => {
  const input = execution.toolInput as MultiEditToolInput;

  return (
    <BaseToolComponent execution={execution}>
      <div>
        <ToolInput label="文件路径" value={input.file_path} />
        
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">
            批量编辑 ({input.edits.length} 个操作):
          </p>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {input.edits.map((edit, index) => (
              <div key={index} className="border border-gray-300 rounded-md p-3 bg-white">
                <div className="text-xs font-medium text-gray-600 mb-2">
                  操作 #{index + 1}
                  {edit.replace_all && (
                    <span className="ml-2 px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs">
                      全部替换
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">原文本:</p>
                    <div className="font-mono bg-red-50 p-2 rounded text-xs whitespace-pre-wrap break-words border border-red-200">
                      {edit.old_string.length > 150 ? 
                        edit.old_string.substring(0, 150) + '\n...(已截断)' : 
                        edit.old_string
                      }
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">新文本:</p>
                    <div className="font-mono bg-green-50 p-2 rounded text-xs whitespace-pre-wrap break-words border border-green-200">
                      {edit.new_string.length > 150 ? 
                        edit.new_string.substring(0, 150) + '\n...(已截断)' : 
                        edit.new_string
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {execution.toolResult && !execution.isError && (
        <ToolOutput result={execution.toolResult} />
      )}
    </BaseToolComponent>
  );
};