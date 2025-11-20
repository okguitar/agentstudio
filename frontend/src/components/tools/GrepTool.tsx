import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import type { GrepInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface GrepToolProps {
  execution: BaseToolExecution;
}

export const GrepTool: React.FC<GrepToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as GrepInput;

  // 显示搜索模式作为副标题
  const getSubtitle = () => {
    if (!input.pattern) return undefined;
    return `"${input.pattern}"`;
  };

  // 格式化搜索结果
  const formatGrepResult = (result: string) => {
    if (!result.trim()) return t('grepTool.noMatchesFound');

    // const lines = result.trim().split('\n');
    const mode = input.output_mode || 'files_with_matches';

    if (mode === 'files_with_matches') {
      return result;
    } else if (mode === 'count') {
      return `${t('grepTool.matchStatistics')}:\n\n${result}`;
    } else {
      return result;
    }
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div>
        <ToolInput label={t('grepTool.patternLabel')} value={input.pattern} isCode={true} />
        {input.path && (
          <ToolInput label={t('grepTool.pathLabel')} value={input.path} />
        )}
        {input.glob && (
          <ToolInput label={t('grepTool.globLabel')} value={input.glob} />
        )}
        {input.type && (
          <ToolInput label={t('grepTool.typeLabel')} value={input.type} />
        )}
        {input.output_mode && (
          <ToolInput label={t('grepTool.outputModeLabel')} value={input.output_mode} />
        )}
        
        {/* 显示搜索选项 */}
        <div className="flex flex-wrap gap-2 mt-2">
          {input['-i'] && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{t('grepTool.ignoreCase')}</span>
          )}
          {input['-n'] && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{t('grepTool.showLineNumbers')}</span>
          )}
          {input['-A'] && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{t('grepTool.afterLines', { count: input['-A'] })}</span>
          )}
          {input['-B'] && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{t('grepTool.beforeLines', { count: input['-B'] })}</span>
          )}
          {input['-C'] && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{t('grepTool.contextLines', { count: input['-C'] })}</span>
          )}
          {input.multiline && (
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">{t('grepTool.multilineMode')}</span>
          )}
        </div>
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('grepTool.searchResults')}</p>
          <div className="p-3 rounded-md border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-sm font-mono whitespace-pre-wrap break-words text-green-700 dark:text-green-300">
            {formatGrepResult(execution.toolResult)}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};