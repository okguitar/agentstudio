import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import { MessageSquare, CheckCircle, Circle, HelpCircle } from 'lucide-react';
import type { BaseToolExecution } from './sdk-types';
import type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';

interface AskUserQuestionToolProps {
  execution: BaseToolExecution;
}

export const AskUserQuestionTool: React.FC<AskUserQuestionToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as AskUserQuestionInput;

  // 显示问题数量作为副标题
  const getSubtitle = () => {
    const questionCount = input.questions.length;
    return t('askUserQuestionTool.questionCount', { count: questionCount });
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()}>
      <div className="space-y-4">
        {/* 工具标题和图标 */}
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <h4 className="text-sm font-medium text-gray-700">
            {t('askUserQuestionTool.title')}
          </h4>
        </div>

        {/* 问题说明 */}
        <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200">
          <div className="flex items-start space-x-1">
            <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{t('askUserQuestionTool.description')}</span>
          </div>
        </div>

        {/* 问题列表 */}
        <div className="space-y-4">
          {input.questions.map((question, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
              {/* 问题头部 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    Q{index + 1}
                  </span>
                  {question.header && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {question.header}
                    </span>
                  )}
                  {question.multiSelect && (
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                      {t('askUserQuestionTool.multiSelect')}
                    </span>
                  )}
                </div>
              </div>

              {/* 问题内容 */}
              <div className="mb-3">
                <p className="text-sm text-gray-800 font-medium">
                  {question.question}
                </p>
              </div>

              {/* 选项列表 */}
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className="flex items-start space-x-2 p-2 rounded border border-gray-100 hover:bg-gray-50"
                  >
                    {/* 选择框 */}
                    {question.multiSelect ? (
                      <CheckSquare className="w-4 h-4 mt-0.5 text-gray-400" />
                    ) : (
                      <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                    )}

                    {/* 选项内容 */}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 执行结果 */}
        {execution.toolResult && (
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('askUserQuestionTool.userResponse')}
              </span>
            </div>
            <div className="bg-green-50 p-3 rounded-md border border-green-200">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {execution.toolResult}
              </pre>
            </div>
          </div>
        )}

        {/* 执行中状态 */}
        {execution.isExecuting && (
          <div className="flex items-center space-x-2 text-blue-600">
            <MessageSquare className="w-4 h-4 animate-pulse" />
            <span className="text-sm">
              {t('askUserQuestionTool.waitingForResponse')}
            </span>
          </div>
        )}

        {/* 错误状态 */}
        {execution.isError && (
          <div className="flex items-center space-x-2 text-red-600">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">
              {t('askUserQuestionTool.error')}
            </span>
          </div>
        )}

        {/* 交互提示 */}
        <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded">
          {t('askUserQuestionTool.interactionHint')}
        </div>
      </div>
    </BaseToolComponent>
  );
};

// CheckSquare 组件用于多选框
const CheckSquare = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      ry="2"
      strokeWidth="2"
    />
  </svg>
);