import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import { Server, List } from 'lucide-react';
import type { BaseToolExecution } from './sdk-types';
import type { ListMcpResourcesInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface ListMcpResourcesToolProps {
  execution: BaseToolExecution;
}

export const ListMcpResourcesTool: React.FC<ListMcpResourcesToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as ListMcpResourcesInput;

  // 显示服务器名称作为副标题
  const getSubtitle = () => {
    if (!input.server) return t('listMcpResourcesTool.allServers');
    return `${t('listMcpResourcesTool.server')}: ${input.server}`;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} hideToolName={false}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-blue-500" />
          <h4 className="text-sm font-medium text-gray-700">
            {t('listMcpResourcesTool.title')}
          </h4>
        </div>

        {/* 服务器信息 */}
        {input.server && (
          <ToolInput
            label={t('listMcpResourcesTool.serverName')}
            value={input.server}
          />
        )}

        {/* 执行结果 */}
        {execution.toolResult && (
          <div className="mt-3">
            <div className="flex items-center space-x-2 mb-2">
              <List className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('listMcpResourcesTool.resources')}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                {execution.toolResult}
              </pre>
            </div>
          </div>
        )}

        {/* 执行中状态 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-blue-600">
            <Server className="w-4 h-4 animate-pulse" />
            <span className="text-sm">
              {t('listMcpResourcesTool.loading')}
            </span>
          </div>
        )}

        {/* 错误状态 */}
        {execution.isError && (
          <div className="flex items-center space-x-2 text-red-600">
            <Server className="w-4 h-4" />
            <span className="text-sm">
              {t('listMcpResourcesTool.error')}
            </span>
          </div>
        )}

        {/* 工具描述 */}
        <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
          {t('listMcpResourcesTool.description')}
        </div>
      </div>
    </BaseToolComponent>
  );
};