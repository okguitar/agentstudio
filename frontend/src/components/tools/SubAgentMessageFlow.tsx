import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { MarkdownMessage } from '../MarkdownMessage';
import { ToolRenderer } from './ToolRenderer';
import type { SubAgentMessage, SubAgentMessagePart } from './types';
import type { BaseToolExecution } from './sdk-types';

interface SubAgentMessageFlowProps {
  /** 任务输入提示词 */
  taskPrompt: string;
  /** 子Agent消息流 */
  messageFlow: SubAgentMessage[];
  /** 是否默认展开 */
  defaultExpanded?: boolean;
}

// 截断文本组件
const TruncatedText: React.FC<{
  text: string;
  maxLength?: number;
}> = ({ text, maxLength = 300 }) => {
  const { t } = useTranslation('components');
  const [isExpanded, setIsExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  
  const displayText = isExpanded || !needsTruncation 
    ? text 
    : text.substring(0, maxLength) + '...';

  return (
    <div>
      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
        {displayText}
      </div>
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          {isExpanded ? t('subAgentMessageFlow.collapse') : t('subAgentMessageFlow.expand')}
        </button>
      )}
    </div>
  );
};

// 将消息部分转换为工具执行格式
const convertToToolExecution = (part: SubAgentMessagePart): BaseToolExecution => {
  return {
    id: part.toolData?.id || part.id,
    toolName: part.toolData?.toolName || 'Unknown',
    toolInput: part.toolData?.toolInput || {},
    toolResult: part.toolData?.toolResult,
    isExecuting: false,
    isError: part.toolData?.isError,
    timestamp: new Date()
  };
};

// 思考过程折叠组件
const ThinkingBlock: React.FC<{
  content: string;
}> = ({ content }) => {
  const { t } = useTranslation('components');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <details 
      className="my-2"
      open={isExpanded}
      onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors select-none">
        💭 {t('subAgentMessageFlow.thinking')}
      </summary>
      <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
        <div className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed italic">
          {content}
        </div>
      </div>
    </details>
  );
};

// 将所有消息展平为单独的部分
const flattenMessageParts = (messageFlow: SubAgentMessage[]): SubAgentMessagePart[] => {
  return messageFlow
    .flatMap(msg => msg.messageParts)
    .sort((a, b) => a.order - b.order);
};

export const SubAgentMessageFlow: React.FC<SubAgentMessageFlowProps> = ({
  taskPrompt,
  messageFlow,
  defaultExpanded = false
}) => {
  const { t } = useTranslation('components');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // 计算统计信息
  const toolCount = messageFlow.reduce((count, msg) => 
    count + msg.messageParts.filter(p => p.type === 'tool').length, 0
  );

  // 展平所有消息部分
  const allParts = flattenMessageParts(messageFlow);

  return (
    <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
      {/* 折叠标题栏 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors w-full"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
        <span className="font-medium">
          {t('subAgentMessageFlow.title')}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          ({t('subAgentMessageFlow.messageCount', { count: messageFlow.length })}, {t('subAgentMessageFlow.toolCount', { count: toolCount })})
        </span>
      </button>

      {/* 展开的消息流内容 */}
      {isExpanded && (
        <div className="mt-3 pl-3 border-l-2 border-purple-200 dark:border-purple-800 space-y-3">
          {/* 任务输入 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                {t('subAgentMessageFlow.taskInput')}
              </span>
            </div>
            <TruncatedText text={taskPrompt} maxLength={300} />
          </div>

          {/* 直接平铺显示所有内容：文本、思考、工具 */}
          {allParts.map((part) => {
            if (part.type === 'text' && part.content) {
              return (
                <div key={part.id} className="text-sm text-gray-700 dark:text-gray-300">
                  <MarkdownMessage content={part.content} isUserMessage={false} />
                </div>
              );
            }
            
            if (part.type === 'thinking' && part.content) {
              return <ThinkingBlock key={part.id} content={part.content} />;
            }
            
            if (part.type === 'tool' && part.toolData) {
              return (
                <div key={part.id}>
                  <ToolRenderer execution={convertToToolExecution(part)} />
                </div>
              );
            }
            
            return null;
          })}
        </div>
      )}
    </div>
  );
};

