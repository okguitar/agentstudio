import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import { Clock, History, ArrowLeft, RefreshCw } from 'lucide-react';
import type { BaseToolExecution } from './sdk-types';
import type { TimeMachineInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface TimeMachineToolProps {
  execution: BaseToolExecution;
}

export const TimeMachineTool: React.FC<TimeMachineToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as TimeMachineInput;

  // 显示目标消息前缀作为副标题
  const getSubtitle = () => {
    const prefix = input.message_prefix;
    if (prefix.length > 30) {
      return `${prefix.substring(0, 30)}...`;
    }
    return prefix;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div className="space-y-4">
        {/* 时间机器图标和标题 */}
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-purple-500" />
          <h4 className="text-sm font-medium text-gray-700">
            {t('timeMachineTool.title')}
          </h4>
        </div>

        {/* 时间机器说明 */}
        <div className="text-xs text-purple-600 bg-purple-50 p-3 rounded-md border border-purple-200">
          <div className="flex items-start space-x-1">
            <History className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{t('timeMachineTool.description')}</span>
          </div>
        </div>

        {/* 消息前缀 */}
        <div>
          <div className="flex items-center space-x-1 mb-1">
            <ArrowLeft className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">
              {t('timeMachineTool.targetMessage')}
            </span>
          </div>
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <p className="text-sm text-gray-700 italic">
              "{input.message_prefix}"
            </p>
          </div>
        </div>

        {/* 修正指令 */}
        <div>
          <div className="flex items-center space-x-1 mb-1">
            <RefreshCw className="w-3 h-3 text-green-500" />
            <span className="text-xs font-medium text-gray-600">
              {t('timeMachineTool.correction')}
            </span>
          </div>
          <div className="bg-green-50 p-2 rounded border border-green-200">
            <p className="text-sm text-gray-700">
              "{input.course_correction}"
            </p>
          </div>
        </div>

        {/* 恢复代码选项 */}
        {input.restore_code !== undefined && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600">
              {t('timeMachineTool.restoreCode')}:
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              input.restore_code
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {input.restore_code ? t('common.enabled') : t('common.disabled')}
            </span>
          </div>
        )}

        {/* 执行结果 */}
        {execution.toolResult && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 mb-1">
              {t('timeMachineTool.result')}
            </div>
            <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {execution.toolResult}
              </pre>
            </div>
          </div>
        )}

        {/* 执行中状态 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-purple-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {t('timeMachineTool.rewinding')}
            </span>
          </div>
        )}

        {/* 错误状态 */}
        {execution.isError && (
          <div className="flex items-center space-x-2 text-red-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              {t('timeMachineTool.error')}
            </span>
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};