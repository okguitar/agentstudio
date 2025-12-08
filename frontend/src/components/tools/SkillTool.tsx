import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import { Sparkles } from 'lucide-react';

interface SkillToolProps {
  execution: BaseToolExecution;
}

interface SkillInput {
  skill?: string;
}

/**
 * Skill 工具专用显示组件
 * 用于展示技能(Skill)的调用情况
 */
export const SkillTool: React.FC<SkillToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as SkillInput;
  
  // 获取技能名称
  const skillName = input?.skill || t('skillTool.unknownSkill');
  
  // 从 toolUseResult 中获取命令名（如果有）
  const toolUseResult = execution.toolUseResult as { success?: boolean; commandName?: string } | undefined;
  const commandName = toolUseResult?.commandName;
  
  // 显示技能名作为副标题
  const getSubtitle = () => {
    if (commandName && commandName !== skillName) {
      return `${skillName} → ${commandName}`;
    }
    return skillName;
  };

  // 自定义 Skill 工具的图标
  const customIcon = <Sparkles className="w-4 h-4" />;

  return (
    <BaseToolComponent 
      execution={execution} 
      subtitle={getSubtitle()}
      customIcon={customIcon}
      overrideToolName={t('skillTool.toolName')}
    >
      <div className="space-y-3">
        {/* 技能名称 */}
        <div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
            {t('skillTool.skillName')}
          </span>
          <span className="text-sm px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-800 dark:text-purple-300 rounded font-medium">
            {skillName}
          </span>
        </div>

        {/* 命令名（如果不同于技能名） */}
        {commandName && commandName !== skillName && (
          <div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
              {t('skillTool.commandName')}
            </span>
            <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded font-mono">
              {commandName}
            </span>
          </div>
        )}

        {/* 执行状态 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
            <div className="w-4 h-4 border-2 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">{t('skillTool.loading')}</span>
          </div>
        )}

        {/* 成功状态 */}
        {!execution.isExecuting && toolUseResult?.success && (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">{t('skillTool.launched')}</span>
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};

