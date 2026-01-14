import React from 'react';
import type { BaseToolExecution } from './sdk-types';
import { useTranslation } from 'react-i18next';

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
import { ListMcpResourcesTool } from './ListMcpResourcesTool';
import { ReadMcpResourceTool } from './ReadMcpResourceTool';
import { TimeMachineTool } from './TimeMachineTool';
import { AskUserQuestionTool } from './AskUserQuestionTool';
import { WebFetchTool } from './WebFetchTool';
import { TodoWriteTool } from './TodoWriteTool';
import { WebSearchTool } from './WebSearchTool';
import { McpTool } from './McpTool';
import { A2ACallTool } from './A2ACallTool';
import { SkillTool } from './SkillTool';
import { parseMcpToolName } from './mcpUtils';
import { BaseToolComponent } from './BaseToolComponent';
import { CUSTOM_MCP_TOOLS } from './customMcpTools';

interface ToolRendererProps {
  execution: BaseToolExecution;
  // 用于 AskUserQuestion 工具的回调
  onAskUserQuestionSubmit?: (toolUseId: string, response: string) => void;
}

/**
 * 根据工具名称渲染对应的工具组件
 */
export const ToolRenderer: React.FC<ToolRendererProps> = ({ execution, onAskUserQuestionSubmit }) => {
  const { t } = useTranslation('components');
  // 首先检查是否是MCP工具
  const mcpToolInfo = parseMcpToolName(execution.toolName);
  if (mcpToolInfo) {
    // 特殊处理：MCP 版本的 ask_user_question 使用 AskUserQuestionTool 组件
    if (mcpToolInfo.serverName === 'ask-user-question' && mcpToolInfo.toolName === 'ask_user_question') {
      return <AskUserQuestionTool execution={execution} onSubmit={onAskUserQuestionSubmit} />;
    }
    
    // 检查是否有自定义组件
    const customToolKey = `${mcpToolInfo.serverName}__${mcpToolInfo.toolName}`;
    const CustomComponent = CUSTOM_MCP_TOOLS[customToolKey];

    if (CustomComponent) {
      return <CustomComponent execution={execution} />;
    }

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

    case 'ListMcpResources':
      return <ListMcpResourcesTool execution={execution} />;

    case 'ReadMcpResource':
      return <ReadMcpResourceTool execution={execution} />;

    case 'TimeMachine':
      return <TimeMachineTool execution={execution} />;

    case 'AskUserQuestion':
      return <AskUserQuestionTool execution={execution} onSubmit={onAskUserQuestionSubmit} />;

    case 'WebFetch':
      return <WebFetchTool execution={execution} />;

    case 'TodoWrite':
      return <TodoWriteTool execution={execution} />;

    case 'WebSearch':
      return <WebSearchTool execution={execution} />;

    case 'call_external_agent':
      return <A2ACallTool execution={execution} />;

    case 'Skill':
      return <SkillTool execution={execution} />;

    default:
      // 对于未知工具，使用基础组件显示
      return (
        <BaseToolComponent execution={execution}>
          <div>
            <p className="text-sm text-gray-600 mb-2">{t('toolRenderer.unknownToolType')}</p>
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono">
              {JSON.stringify(execution.toolInput, null, 2)}
            </div>
          </div>
        </BaseToolComponent>
      );
  }
};