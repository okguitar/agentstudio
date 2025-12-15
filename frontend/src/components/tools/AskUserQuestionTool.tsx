import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent } from './BaseToolComponent';
import { MessageSquare, CheckCircle, Circle, Send, Check, PenLine } from 'lucide-react';
import type { BaseToolExecution } from './sdk-types';
import type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import { useAgentStore } from '../../stores/useAgentStore';

// 特殊标记：表示用户选择了"Type something"
const TYPE_SOMETHING_MARKER = '__TYPE_SOMETHING__';

interface AskUserQuestionToolProps {
  execution: BaseToolExecution;
  // 回调：当用户提交回答时调用
  onSubmit?: (toolUseId: string, response: string) => void;
}

export const AskUserQuestionTool: React.FC<AskUserQuestionToolProps> = ({ execution, onSubmit }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as AskUserQuestionInput;
  const pendingUserQuestion = useAgentStore(state => state.pendingUserQuestion);
  
  // 每个问题的选择状态
  // Map<questionIndex, selectedOptionLabels[]>
  const [selections, setSelections] = useState<Map<number, string[]>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 自定义输入状态
  // Map<questionIndex, customInputText>
  const [customInputs, setCustomInputs] = useState<Map<number, string>>(new Map());
  
  // 输入框引用，用于自动聚焦
  const inputRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());

  // 检查这个工具是否是当前待回答的问题
  const isPendingQuestion = useMemo(() => {
    if (!pendingUserQuestion) return false;
    if (!execution.toolInput) return false;
    
    // 由于后端 MCP 工具生成的 toolUseId 与 Claude SDK 流中的 claudeId 不同，
    // 我们使用更宽松的匹配策略：
    // 1. 检查工具正在执行（没有结果）
    // 2. 检查 questions 内容匹配
    // 这样在同一时间只有一个 AskUserQuestion 工具等待时，可以正确匹配
    
    const inputQuestions = (execution.toolInput as any).questions;
    const pendingQuestions = pendingUserQuestion.questions;
    
    // 如果 questions 数组长度相同，认为是匹配的
    if (inputQuestions && pendingQuestions && inputQuestions.length === pendingQuestions.length) {
      // 进一步检查第一个问题的 question 内容是否匹配
      if (inputQuestions[0]?.question === pendingQuestions[0]?.question) {
        return true;
      }
    }
    
    return false;
  }, [pendingUserQuestion, execution]);

  // 检查是否可以交互（只有待回答的问题才能交互）
  const isInteractive = isPendingQuestion && !execution.toolResult && !isSubmitting;

  // 解析已提交的用户回答（从 toolResult）
  const submittedAnswer = useMemo(() => {
    if (!execution.toolResult) return null;
    
    const result = String(execution.toolResult);
    // 解析 "User response: xxx" 或 "Q1: xxx\nQ2: yyy" 格式
    const match = result.match(/^User response:\s*(.+)$/s);
    if (match) {
      return match[1].trim();
    }
    // 如果没有前缀，直接返回内容
    return result.trim();
  }, [execution.toolResult]);

  // 处理选项点击
  const handleOptionClick = useCallback((questionIndex: number, optionLabel: string, multiSelect: boolean) => {
    if (!isInteractive) return;

    setSelections(prev => {
      const newSelections = new Map(prev);
      const currentSelections = newSelections.get(questionIndex) || [];

      if (multiSelect) {
        // 多选：切换选中状态
        if (currentSelections.includes(optionLabel)) {
          newSelections.set(
            questionIndex,
            currentSelections.filter(label => label !== optionLabel)
          );
        } else {
          // 如果选择了普通选项，移除 TYPE_SOMETHING_MARKER
          const filteredSelections = currentSelections.filter(label => label !== TYPE_SOMETHING_MARKER);
          newSelections.set(questionIndex, [...filteredSelections, optionLabel]);
        }
      } else {
        // 单选：替换选择
        newSelections.set(questionIndex, [optionLabel]);
      }

      return newSelections;
    });
    
    // 如果选择的不是 "Type something"，清空自定义输入
    if (optionLabel !== TYPE_SOMETHING_MARKER) {
      setCustomInputs(prev => {
        const newInputs = new Map(prev);
        newInputs.delete(questionIndex);
        return newInputs;
      });
    }
  }, [isInteractive]);

  // 处理 "Type something" 选项点击
  const handleTypeSomethingClick = useCallback((questionIndex: number, multiSelect: boolean) => {
    if (!isInteractive) return;

    setSelections(prev => {
      const newSelections = new Map(prev);
      const currentSelections = newSelections.get(questionIndex) || [];

      if (multiSelect) {
        // 多选：切换 TYPE_SOMETHING_MARKER
        if (currentSelections.includes(TYPE_SOMETHING_MARKER)) {
          newSelections.set(
            questionIndex,
            currentSelections.filter(label => label !== TYPE_SOMETHING_MARKER)
          );
        } else {
          newSelections.set(questionIndex, [...currentSelections, TYPE_SOMETHING_MARKER]);
        }
      } else {
        // 单选：只保留 TYPE_SOMETHING_MARKER
        newSelections.set(questionIndex, [TYPE_SOMETHING_MARKER]);
      }

      return newSelections;
    });

    // 延迟聚焦输入框
    setTimeout(() => {
      const inputRef = inputRefs.current.get(questionIndex);
      if (inputRef) {
        inputRef.focus();
      }
    }, 100);
  }, [isInteractive]);

  // 处理自定义输入变化
  const handleCustomInputChange = useCallback((questionIndex: number, value: string) => {
    setCustomInputs(prev => {
      const newInputs = new Map(prev);
      newInputs.set(questionIndex, value);
      return newInputs;
    });
  }, []);

  // 检查是否所有必填问题都已回答
  const canSubmit = useMemo(() => {
    if (!isInteractive) return false;
    
    // 每个问题至少要选择一个选项（或有有效的自定义输入）
    for (let i = 0; i < input.questions.length; i++) {
      const questionSelections = selections.get(i) || [];
      if (questionSelections.length === 0) return false;
      
      // 如果选择了 "Type something"，检查是否有输入内容
      if (questionSelections.includes(TYPE_SOMETHING_MARKER)) {
        const customInput = customInputs.get(i) || '';
        // 如果只选了 TYPE_SOMETHING_MARKER 且没有输入内容，不能提交
        if (questionSelections.length === 1 && !customInput.trim()) {
          return false;
        }
      }
    }
    return true;
  }, [isInteractive, input.questions.length, selections, customInputs]);

  // 格式化响应内容
  const formatResponse = useCallback((): string => {
    const responses: string[] = [];
    
    input.questions.forEach((_question, index) => {
      const selectedOptions = selections.get(index) || [];
      if (selectedOptions.length > 0) {
        // 构建回答内容
        const answerParts: string[] = [];
        
        selectedOptions.forEach(option => {
          if (option === TYPE_SOMETHING_MARKER) {
            // 使用自定义输入的内容
            const customInput = customInputs.get(index) || '';
            if (customInput.trim()) {
              answerParts.push(customInput.trim());
            }
          } else {
            answerParts.push(option);
          }
        });
        
        if (answerParts.length > 0) {
          if (input.questions.length === 1) {
            // 单个问题，直接返回选项
            responses.push(answerParts.join(', '));
          } else {
            // 多个问题，带上问题标识
            responses.push(`Q${index + 1}: ${answerParts.join(', ')}`);
          }
        }
      }
    });

    return responses.join('\n');
  }, [input.questions, selections, customInputs]);

  // 提交回答
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !onSubmit || !pendingUserQuestion) return;

    setIsSubmitting(true);
    
    try {
      const response = formatResponse();
      console.log('🎤 [AskUserQuestion] Submitting response:', response);
      await onSubmit(pendingUserQuestion.toolUseId, response);
    } catch (error) {
      console.error('🎤 [AskUserQuestion] Failed to submit response:', error);
    } finally {
      // 无论成功或失败，都重置提交状态
      setIsSubmitting(false);
    }
  }, [canSubmit, onSubmit, pendingUserQuestion, formatResponse]);

  // 显示副标题：如果只有1个问题显示问题标题，多个问题显示第一个问题标题(+N)
  const getSubtitle = () => {
    const questions = input.questions;
    const questionCount = questions.length;
    
    // 获取第一个问题的标题（优先使用 header，否则使用 question 的前30个字符）
    const firstQuestion = questions[0];
    const firstQuestionTitle = firstQuestion.header || 
      (firstQuestion.question.length > 30 
        ? firstQuestion.question.substring(0, 30) + '...' 
        : firstQuestion.question);
    
    if (questionCount === 1) {
      // 只有一个问题时，显示问题标题
      return firstQuestionTitle;
    } else {
      // 多个问题时，显示第一个问题标题 (+N)
      return `${firstQuestionTitle} (+${questionCount - 1})`;
    }
  };

  return (
    <BaseToolComponent 
      execution={execution} 
      subtitle={getSubtitle()}
      defaultExpanded={true}
      showResult={false}
      hideToolName={false}
      overrideToolName={t('askUserQuestionTool.title')}
      customIcon={<MessageSquare className="w-4 h-4 text-blue-500" />}
    >
      <div className="space-y-4">

        {/* 问题列表 */}
        <div className="space-y-4">
          {input.questions.map((question, questionIndex) => {
            const selectedOptions = selections.get(questionIndex) || [];
            
            return (
              <div key={questionIndex} className="border border-gray-200 rounded-lg p-3 bg-white">
                {/* 问题头部 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      Q{questionIndex + 1}
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
                  {question.options.map((option, optionIndex) => {
                    const isSelected = selectedOptions.includes(option.label);
                    const canClick = isInteractive;
                    
                    return (
                      <div
                        key={optionIndex}
                        onClick={() => handleOptionClick(questionIndex, option.label, question.multiSelect || false)}
                        className={`
                          flex items-start space-x-2 p-2 rounded border transition-all
                          ${canClick ? 'cursor-pointer' : 'cursor-default'}
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                            : 'border-gray-100 hover:bg-gray-50'
                          }
                          ${!canClick && !isSelected ? 'opacity-60' : ''}
                        `}
                      >
                        {/* 选择框 */}
                        {question.multiSelect ? (
                          <CheckSquare 
                            className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}
                            checked={isSelected}
                          />
                        ) : (
                          isSelected ? (
                            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                          ) : (
                            <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                          )
                        )}

                        {/* 选项内容 */}
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* "Type something" 选项 或 已提交的自定义回答 */}
                  {(() => {
                    const isTypeSomethingSelected = selectedOptions.includes(TYPE_SOMETHING_MARKER);
                    const canClick = isInteractive;
                    const customInputValue = customInputs.get(questionIndex) || '';
                    
                    // 检查是否有已提交的自定义回答（不是预设选项之一）
                    const isCustomAnswer = submittedAnswer && !question.options.some(opt => opt.label === submittedAnswer);
                    
                    // 如果工具已完成且回答是自定义输入，直接在选项里显示内容
                    if (execution.toolResult && isCustomAnswer) {
                      return (
                        <div className="flex items-start space-x-2 p-2 rounded border border-green-500 bg-green-50 ring-1 ring-green-500">
                          <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                          {/* 选项内容：将标签和用户输入显示在同一行 */}
                          <div className="flex-1 flex items-center space-x-2">
                            <PenLine className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              {t('askUserQuestionTool.typeSomething')} {submittedAnswer}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        <div
                          onClick={() => handleTypeSomethingClick(questionIndex, question.multiSelect || false)}
                          className={`
                            flex items-start space-x-2 p-2 rounded border transition-all
                            ${canClick ? 'cursor-pointer' : 'cursor-default'}
                            ${isTypeSomethingSelected 
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                              : 'border-gray-100 border-dashed hover:bg-gray-50'
                            }
                            ${!canClick && !isTypeSomethingSelected ? 'opacity-60' : ''}
                          `}
                        >
                          {/* 选择框 */}
                          {question.multiSelect ? (
                            <CheckSquare 
                              className={`w-4 h-4 mt-0.5 ${isTypeSomethingSelected ? 'text-blue-500' : 'text-gray-400'}`}
                              checked={isTypeSomethingSelected}
                            />
                          ) : (
                            isTypeSomethingSelected ? (
                              <CheckCircle className="w-4 h-4 mt-0.5 text-blue-500" />
                            ) : (
                              <Circle className="w-4 h-4 mt-0.5 text-gray-400" />
                            )
                          )}

                          {/* 选项内容 */}
                          <div className="flex-1 flex items-center space-x-2">
                            <PenLine className={`w-4 h-4 ${isTypeSomethingSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                            <div className={`text-sm font-medium ${isTypeSomethingSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                              {t('askUserQuestionTool.typeSomething')}
                            </div>
                          </div>
                        </div>
                        
                        {/* 自定义输入框（仅在选中时显示） */}
                        {isTypeSomethingSelected && isInteractive && (
                          <div className="ml-6">
                            <input
                              ref={(el) => { inputRefs.current.set(questionIndex, el); }}
                              type="text"
                              value={customInputValue}
                              onChange={(e) => handleCustomInputChange(questionIndex, e.target.value)}
                              placeholder={t('askUserQuestionTool.typeSomethingPlaceholder')}
                              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                              onKeyDown={(e) => {
                                // 按 Enter 提交（如果可以提交）
                                if (e.key === 'Enter' && canSubmit) {
                                  e.preventDefault();
                                  handleSubmit();
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* 提交按钮（仅在可交互时显示） */}
        {isInteractive && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${canSubmit && !isSubmitting
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('askUserQuestionTool.submitting')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('askUserQuestionTool.submit')}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 已完成状态 */}
        {execution.toolResult && (
          <div className="flex items-center space-x-2 text-green-600 py-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t('askUserQuestionTool.completed')}
            </span>
          </div>
        )}

        {/* 等待状态（非待回答问题时的执行中状态） */}
        {execution.isExecuting && !isPendingQuestion && (
          <div className="flex items-center space-x-2 text-blue-600 py-2">
            <MessageSquare className="w-4 h-4 animate-pulse" />
            <span className="text-sm">
              {t('askUserQuestionTool.waitingForResponse')}
            </span>
          </div>
        )}

        {/* 错误状态 */}
        {execution.isError && (
          <div className="flex items-center space-x-2 text-red-600 py-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">
              {t('askUserQuestionTool.error')}
            </span>
          </div>
        )}
      </div>
    </BaseToolComponent>
  );
};

// CheckSquare 组件用于多选框
const CheckSquare = ({ className, checked }: { className?: string; checked?: boolean }) => (
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
    {checked && (
      <path
        d="M9 12l2 2 4-4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);
