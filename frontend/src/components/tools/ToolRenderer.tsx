import React from 'react';
import type { ToolExecution } from './types';

// 导入所有工具组件
import { TaskTool } from './TaskTool';
import { BashTool } from './BashTool';
import { BashOutputTool } from './BashOutputTool';
import { KillBashTool } from './KillBashTool';
import { GlobTool } from './GlobTool';
import { GrepTool } from './GrepTool';
import { LSTool } from './LSTool';
import { ExitPlanModeTool } from './ExitPlanModeTool';
import { ReadTool } from './ReadTool';
import { EditTool } from './EditTool';
import { MultiEditTool } from './MultiEditTool';
import { WriteTool } from './WriteTool';
import { NotebookReadTool } from './NotebookReadTool';
import { NotebookEditTool } from './NotebookEditTool';
import { WebFetchTool } from './WebFetchTool';
import { TodoWriteTool } from './TodoWriteTool';
import { WebSearchTool } from './WebSearchTool';
import { McpTool } from './McpTool';
import { parseMcpToolName } from './mcpUtils';
import { BaseToolComponent } from './BaseToolComponent';

interface ToolRendererProps {
  execution: ToolExecution;
}

/**
 * 根据工具名称渲染对应的工具组件
 */
export const ToolRenderer: React.FC<ToolRendererProps> = ({ execution }) => {
  // 首先检查是否是MCP工具
  const mcpToolInfo = parseMcpToolName(execution.toolName);
  if (mcpToolInfo) {
    return <McpTool execution={execution} />;
  }

  switch (execution.toolName) {
    case 'Task':
      return <TaskTool execution={execution} />;
    
    case 'Bash':
      return <BashTool execution={execution} />;
    
    case 'BashOutput':
      return <BashOutputTool execution={execution} />;
    
    case 'KillBash':
      return <KillBashTool execution={execution} />;
    
    case 'Glob':
      return <GlobTool execution={execution} />;
    
    case 'Grep':
      return <GrepTool execution={execution} />;
    
    case 'LS':
      return <LSTool execution={execution} />;
    
    case 'exit_plan_mode':
      return <ExitPlanModeTool execution={execution} />;
    
    case 'Read':
      return <ReadTool execution={execution} />;
    
    case 'Edit':
      return <EditTool execution={execution} />;
    
    case 'MultiEdit':
      return <MultiEditTool execution={execution} />;
    
    case 'Write':
      return <WriteTool execution={execution} />;
    
    case 'NotebookRead':
      return <NotebookReadTool execution={execution} />;
    
    case 'NotebookEdit':
      return <NotebookEditTool execution={execution} />;
    
    case 'WebFetch':
      return <WebFetchTool execution={execution} />;
    
    case 'TodoWrite':
      return <TodoWriteTool execution={execution} />;
    
    case 'WebSearch':
      return <WebSearchTool execution={execution} />;
    
    default:
      // 对于未知工具，使用基础组件显示
      return (
        <BaseToolComponent execution={execution}>
          <div>
            <p className="text-sm text-gray-600 mb-2">未知工具类型</p>
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono">
              {JSON.stringify(execution.toolInput, null, 2)}
            </div>
          </div>
        </BaseToolComponent>
      );
  }
};