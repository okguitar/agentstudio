import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import { Database, Download, Eye, Link } from 'lucide-react';
import type { BaseToolExecution } from './sdk-types';
import type { ReadMcpResourceInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface ReadMcpResourceToolProps {
  execution: BaseToolExecution;
}

export const ReadMcpResourceTool: React.FC<ReadMcpResourceToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as ReadMcpResourceInput;

  // 显示服务器和资源作为副标题
  const getSubtitle = () => {
    return `${input.server}: ${input.uri.split('/').pop() || input.uri}`;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div className="space-y-3">
        {/* 工具标题和图标 */}
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-indigo-500" />
          <h4 className="text-sm font-medium text-gray-700">
            {t('readMcpResourceTool.title')}
          </h4>
        </div>

        {/* MCP 服务器信息 */}
        <div className="flex items-center space-x-2 p-2 bg-indigo-50 rounded border border-indigo-200">
          <Database className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-800">
            {input.server}
          </span>
        </div>

        {/* 资源 URI */}
        <div>
          <div className="flex items-center space-x-1 mb-1">
            <Link className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">
              {t('readMcpResourceTool.resourceUri')}
            </span>
          </div>
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <code className="text-xs text-gray-700 font-mono break-all">
              {input.uri}
            </code>
          </div>
        </div>

        {/* 执行结果 */}
        {execution.toolResult && (
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('readMcpResourceTool.content')}
              </span>
            </div>
            <div className="bg-white p-3 rounded-md border border-gray-200 max-h-96 overflow-y-auto">
              {/* 检查是否是 JSON */}
              {(() => {
                try {
                  const parsed = JSON.parse(execution.toolResult!);
                  return (
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {JSON.stringify(parsed, null, 2)}
                    </pre>
                  );
                } catch {
                  // 不是 JSON，直接显示内容
                  return (
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {execution.toolResult}
                    </pre>
                  );
                }
              })()}
            </div>
          </div>
        )}

        {/* 执行中状态 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-indigo-600">
            <Download className="w-4 h-4 animate-bounce" />
            <span className="text-sm">
              {t('readMcpResourceTool.loading')}
            </span>
          </div>
        )}

        {/* 错误状态 */}
        {execution.isError && (
          <div className="flex items-center space-x-2 text-red-600">
            <Database className="w-4 h-4" />
            <span className="text-sm">
              {t('readMcpResourceTool.error')}
            </span>
          </div>
        )}

        {/* 工具描述 */}
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          <div className="flex items-start space-x-1">
            <Database className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{t('readMcpResourceTool.description')}</span>
          </div>
        </div>

        {/* 内容大小信息 */}
        {execution.toolResult && (
          <div className="text-xs text-gray-400 text-right">
            {t('readMcpResourceTool.contentSize', {
              size: new Blob([execution.toolResult]).size
            })}
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};