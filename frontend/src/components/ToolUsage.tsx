import React from 'react';
import { ToolRenderer, type ToolExecution } from './tools';

interface ToolUsageProps {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  toolUseResult?: Record<string, unknown>;
  isError?: boolean;
  isExecuting?: boolean;
  claudeId?: string; // Claude's tool use ID for matching with sub-agent messages
  // 用于 AskUserQuestion 工具的回调
  onAskUserQuestionSubmit?: (toolUseId: string, response: string) => void;
}

// 将旧格式转换为新的 ToolExecution 格式
const convertToToolExecution = (props: ToolUsageProps): ToolExecution => {
  return {
    id: `tool_${Date.now()}_${Math.random()}`,
    toolName: props.toolName,
    toolInput: props.toolInput,
    toolResult: props.toolResult,
    toolUseResult: props.toolUseResult,
    isExecuting: props.isExecuting || false,
    isError: props.isError || false,
    timestamp: new Date(),
    claudeId: props.claudeId, // Pass through claudeId
  } as ToolExecution & { claudeId?: string };
};

export const ToolUsage: React.FC<ToolUsageProps> = (props) => {
  const execution = convertToToolExecution(props);
  return <ToolRenderer execution={execution} onAskUserQuestionSubmit={props.onAskUserQuestionSubmit} />;
};