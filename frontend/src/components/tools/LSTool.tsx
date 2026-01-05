import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { BaseToolExecution, LSToolInput } from './sdk-types';

interface LSToolProps {
  execution: BaseToolExecution;
}

export const LSTool: React.FC<LSToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as LSToolInput;

  // 提取相对路径作为副标题
  const getSubtitle = () => {
    if (!input.path) return undefined;
    // 简化路径显示，如果是绝对路径则尝试显示相对部分
    const path = input.path;
    return path.split('/').slice(-2).join('/') || path;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} hideToolName={false}>
      <div>
        <ToolInput label={t('lsTool.directoryPath')} value={input.path} />
        {input.ignore && input.ignore.length > 0 && (
          <ToolInput label={t('lsTool.ignorePatterns')} value={input.ignore.join(', ')} />
        )}
      </div>

      {execution.toolResult && !execution.isError && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-600 mb-2">{t('lsTool.directoryStructure')}</p>
          <div className="p-3 rounded-md border bg-yellow-50 border-yellow-200 text-sm font-mono whitespace-pre-wrap break-words text-yellow-800">
            {execution.toolResult}
          </div>
        </div>
      )}
    </BaseToolComponent>
  );
};