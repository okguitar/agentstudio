import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import type { ToolExecution } from './types';

interface McpToolProps {
  execution: ToolExecution;
}

interface McpToolInfo {
  toolId: string;
  prefix: string;      // "mcp"
  serverName: string;  // "playwright", "supabase", etc.
  toolName: string;    // "browser_take_screenshot", "list_projects", etc.
  isExecuting?: boolean;
  hasResult?: boolean;
  isError?: boolean;
}


/**
 * 解析MCP工具名称格式：mcp__serverName__toolName
 */
export function parseMcpToolName(toolId: string): McpToolInfo | null {
  const parts = toolId.split('__');
  
  if (parts.length !== 3 || parts[0] !== 'mcp') {
    return null;
  }

  return {
    toolId,
    prefix: parts[0],
    serverName: parts[1],
    toolName: parts[2]
  };
}

/**
 * 格式化工具名显示
 */
function formatMcpToolName(toolName: string): string {
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * MCP工具专用显示组件
 */
export const McpTool: React.FC<McpToolProps> = ({ execution }) => {
  const toolInfo = parseMcpToolName(execution.toolName);
  
  if (!toolInfo) {
    // 如果解析失败，回退到基础组件
    return <BaseToolComponent execution={execution} />;
  }

  const { serverName, toolName } = toolInfo;
  const formattedToolName = formatMcpToolName(toolName);
  
  // 创建修改后的execution对象，只显示格式化的工具名
  const modifiedExecution = {
    ...execution,
    toolName: formattedToolName  // 只显示格式化的工具名，如 "Browser Navigate"
  };

  // 构建副标题显示服务器信息
  const subtitle = `来自 ${serverName} 服务器的 MCP 工具`;

  return (
    <BaseToolComponent 
      execution={modifiedExecution}
      subtitle={subtitle}
      showResult={false} // 我们自定义结果显示
      isMcpTool={true} // 标识为MCP工具
    >
      <div className="space-y-3">

        {/* 工具输入参数 - 直接显示JSON */}
        <ToolInput 
          label="参数"
          value={execution.toolInput}
          isCode={true}
        />
        
        {/* 工具执行结果 */}
        {execution.toolResult && (
          <ToolOutput 
            result={execution.toolResult}
            isError={execution.isError}
          />
        )}
      </div>
    </BaseToolComponent>
  );
};

export default McpTool;
