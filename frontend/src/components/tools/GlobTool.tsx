import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution, GlobToolInput } from './types';

interface GlobToolProps {
  execution: ToolExecution;
}

export const GlobTool: React.FC<GlobToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as GlobToolInput;

  // 显示模式作为副标题
  const getSubtitle = () => {
    if (!input.pattern) return undefined;
    return input.pattern;
  };

  // 处理输出结果，按行分割并显示文件数量
  const formatGlobResult = (result: string) => {
    if (!result || !result.trim()) return t('globTool.noFilesFound');

    const files = result.trim().split('\n').filter(line => line.trim());
    if (files.length === 0) return result;

    return result;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} hideToolName={true} showResult={false}>
      <div>
        <ToolInput label={t('globTool.patternLabel')} value={input.pattern} isCode={true} />
        {input.path && (
          <ToolInput label={t('globTool.pathLabel')} value={input.path} />
        )}
      </div>
      
      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('globTool.matchingResults')}</p>
          <div className="p-3 rounded-md border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-sm font-mono whitespace-pre-wrap break-words text-blue-700 dark:text-blue-300">
            {formatGlobResult(execution.toolResult)}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};