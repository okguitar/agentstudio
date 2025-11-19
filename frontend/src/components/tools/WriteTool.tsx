import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import { FileContentViewer } from '../FileContentViewer';
import type { ToolExecution, WriteToolInput } from './types';

interface WriteToolProps {
  execution: ToolExecution;
}

export const WriteTool: React.FC<WriteToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as WriteToolInput;

  // 提取文件名作为副标题
  const getSubtitle = () => {
    if (!input.file_path) return undefined;
    const fileName = input.file_path.split('/').pop() || input.file_path;
    return fileName;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div>
        <ToolInput label={t('writeTool.filePath')} value={input.file_path} />

        <div className="mt-3">
          <FileContentViewer
            content={input.content}
            filePath={input.file_path}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t('writeTool.fileSize', { size: input.content?.length || 0 })}
          </div>
        </div>
      </div>

    </BaseToolComponent>
  );
};