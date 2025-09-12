import React from 'react';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, WebSearchToolInput } from './types';

interface WebSearchToolProps {
  execution: ToolExecution;
}

export const WebSearchTool: React.FC<WebSearchToolProps> = ({ execution }) => {
  const input = execution.toolInput as WebSearchToolInput;

  // 显示搜索查询作为副标题
  const getSubtitle = () => {
    if (!input.query) return undefined;
    return `"${input.query}"`;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div>
        <ToolInput label="搜索查询" value={input.query} />
        
        {(input.allowed_domains || input.blocked_domains) && (
          <div className="mt-2 space-y-1">
            {input.allowed_domains && input.allowed_domains.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-green-600">允许域名:</span>
                {input.allowed_domains.map((domain, index) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    {domain}
                  </span>
                ))}
              </div>
            )}
            
            {input.blocked_domains && input.blocked_domains.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-red-600">屏蔽域名:</span>
                {input.blocked_domains.map((domain, index) => (
                  <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    {domain}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">搜索结果:</p>
          <div className="p-3 rounded-md border bg-sky-50 border-sky-200 text-sm whitespace-pre-wrap break-words text-sky-800">
            {execution.toolResult}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};