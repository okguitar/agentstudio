import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, WebFetchToolInput } from './types';

interface WebFetchToolProps {
  execution: ToolExecution;
}

export const WebFetchTool: React.FC<WebFetchToolProps> = ({ execution }) => {
  const input = execution.toolInput as WebFetchToolInput;

  return (
    <BaseToolComponent execution={execution} hideToolName={true}>
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs font-medium text-gray-600">URL:</span>
          <a 
            href={input.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
          >
            {input.url}
          </a>
        </div>
        
        <ToolInput 
          label="分析提示" 
          value={input.prompt.length > 200 ? 
            input.prompt.substring(0, 200) + '\n...(已截断)' : 
            input.prompt
          } 
          isCode={true} 
        />
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">网页分析结果:</p>
          <div className="p-3 rounded-md border bg-teal-50 border-teal-200 text-sm whitespace-pre-wrap break-words text-teal-800">
            {execution.toolResult}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};