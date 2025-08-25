import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import type { ToolExecution, ReadToolInput } from './types';

interface ReadToolProps {
  execution: ToolExecution;
}

export const ReadTool: React.FC<ReadToolProps> = ({ execution }) => {
  const input = execution.toolInput as ReadToolInput;
  
  // 提取文件名作为副标题
  const getSubtitle = () => {
    if (!input.file_path) return undefined;
    // 提取相对路径或文件名
    const fileName = input.file_path.split('/').pop() || input.file_path;
    return fileName;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="文件路径" value={input.file_path} />
        {input.offset && (
          <ToolInput label="起始行" value={input.offset} />
        )}
        {input.limit && (
          <ToolInput label="读取行数" value={input.limit} />
        )}
      </div>
      
      {execution.toolResult && !execution.isError && (
        <ToolOutput result={execution.toolResult} />
      )}
    </BaseToolComponent>
  );
};