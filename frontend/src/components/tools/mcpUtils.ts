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