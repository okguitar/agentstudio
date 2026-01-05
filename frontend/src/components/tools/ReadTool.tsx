import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import type { FileReadInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface ReadToolProps {
  execution: BaseToolExecution;
}

export const ReadTool: React.FC<ReadToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as FileReadInput;

  // 提取文件名作为副标题
  const getSubtitle = () => {
    if (!input.file_path) return undefined;
    // 提取相对路径或文件名
    const fileName = input.file_path.split('/').pop() || input.file_path;
    return fileName;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false} hideToolName={false}>
      <div>
        <ToolInput label={t('readTool.readFile')} value={input.file_path} />
        {input.offset && (
          <ToolInput label={t('readTool.startLine')} value={input.offset} />
        )}
        {input.limit && (
          <ToolInput label={t('readTool.readLines')} value={input.limit} />
        )}
      </div>

    </BaseToolComponent>
  );
};