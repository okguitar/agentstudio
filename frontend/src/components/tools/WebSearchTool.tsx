import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, WebSearchToolInput } from './types';

interface WebSearchToolProps {
  execution: ToolExecution;
}

export const WebSearchTool: React.FC<WebSearchToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as WebSearchToolInput;

  // 防御性检查：确保域名列表是数组
  const allowedDomains = Array.isArray(input?.allowed_domains) ? input.allowed_domains : [];
  const blockedDomains = Array.isArray(input?.blocked_domains) ? input.blocked_domains : [];

  // 显示搜索查询作为副标题
  const getSubtitle = () => {
    if (!input.query) return undefined;
    return `${input.query}`;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div>
        <ToolInput label={t('webSearchTool.searchQueryLabel')} value={input.query} />
        
        {(allowedDomains.length > 0 || blockedDomains.length > 0) && (
          <div className="mt-2 space-y-1">
            {allowedDomains.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-green-600">{t('webSearchTool.allowedDomains')}</span>
                {allowedDomains.map((domain, index) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    {domain}
                  </span>
                ))}
              </div>
            )}

            {blockedDomains.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-red-600">{t('webSearchTool.blockedDomains')}</span>
                {blockedDomains.map((domain, index) => (
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
          <p className="text-xs font-medium text-gray-600 mb-2">{t('webSearchTool.searchResults')}</p>
          <div className="p-3 rounded-md border bg-sky-50 border-sky-200 text-sm whitespace-pre-wrap break-words text-sky-800">
            {execution.toolResult}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};