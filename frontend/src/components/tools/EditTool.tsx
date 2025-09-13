import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import { DiffViewer } from '../DiffViewer';
import type { ToolExecution, EditToolInput, EditToolResult } from './types';

interface EditToolProps {
  execution: ToolExecution;
}

export const EditTool: React.FC<EditToolProps> = ({ execution }) => {
  const input = execution.toolInput as EditToolInput;
  const result = execution.toolUseResult as EditToolResult;

  // 提取文件名作为副标题
  const getSubtitle = () => {
    if (!input.file_path) return undefined;
    const fileName = input.file_path.split('/').pop() || input.file_path;
    return fileName;
  };

  // 从 toolUseResult.structuredPatch 中获取起始行号
  const getStartLineNumbers = () => {
    // 从 toolUseResult 的 structuredPatch 获取
    if (result?.structuredPatch && result.structuredPatch.length > 0) {
      const firstPatch = result.structuredPatch[0];
      return {
        oldStartLine: firstPatch.oldStart,
        newStartLine: firstPatch.newStart
      };
    }
    
    return { oldStartLine: 1, newStartLine: 1 };
  };

  const { oldStartLine, newStartLine } = getStartLineNumbers();

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div>
        <ToolInput label="文件路径" value={input.file_path} />
        
        {input.replace_all && (
          <ToolInput label="全部替换" value="是" />
        )}
        
        <div className="mt-3">
          <DiffViewer 
            oldText={input.old_string}
            newText={input.new_string}
            oldStartLine={oldStartLine}
            newStartLine={newStartLine}
          />
        </div>
      </div>
    </BaseToolComponent>
  );
};