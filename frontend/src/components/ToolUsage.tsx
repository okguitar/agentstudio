import React from 'react';
import { ToolRenderer, type ToolExecution } from './tools';

interface ToolUsageProps {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  toolUseResult?: Record<string, unknown>;
  isError?: boolean;
  isExecuting?: boolean;
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
    timestamp: new Date()
  };
};

export const ToolUsage: React.FC<ToolUsageProps> = (props) => {
  const execution = convertToToolExecution(props);
  return <ToolRenderer execution={execution} />;
};