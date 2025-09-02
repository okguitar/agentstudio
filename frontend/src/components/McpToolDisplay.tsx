import React from 'react';
import { Wrench, ExternalLink, Info } from 'lucide-react';

interface McpToolInfo {
  toolId: string;
  prefix: string;      // "mcp"
  serverName: string;  // "playwright", "supabase", etc.
  toolName: string;    // "browser_take_screenshot", "list_projects", etc.
  isExecuting?: boolean;
  hasResult?: boolean;
  isError?: boolean;
}

interface McpToolDisplayProps {
  toolId: string;
  className?: string;
  showDetails?: boolean;
  onClick?: () => void;
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
 * 获取服务器图标
 */
function getServerIcon(serverName: string): React.ReactNode {
  switch (serverName.toLowerCase()) {
    case 'playwright':
      return '🎭';
    case 'supabase':
      return '🗄️';
    case 'unsplash':
      return '📸';
    case 'github':
      return '🐙';
    default:
      return <Wrench className="w-4 h-4" />;
  }
}

/**
 * 获取工具类型颜色
 */
function getServerColor(serverName: string): string {
  switch (serverName.toLowerCase()) {
    case 'playwright':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'supabase':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'unsplash':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'github':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-orange-100 text-orange-800 border-orange-200';
  }
}

/**
 * 格式化工具名称显示
 */
function formatToolName(toolName: string): string {
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * MCP工具显示组件
 */
export const McpToolDisplay: React.FC<McpToolDisplayProps> = ({
  toolId,
  className = '',
  showDetails = true,
  onClick
}) => {
  const toolInfo = parseMcpToolName(toolId);

  if (!toolInfo) {
    // 如果不是MCP工具格式，显示原始工具名
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gray-100 text-gray-700 border ${className}`}>
        <Wrench className="w-4 h-4" />
        <span className="text-sm font-medium">{toolId}</span>
      </div>
    );
  }

  const { serverName, toolName } = toolInfo;
  const serverColor = getServerColor(serverName);
  const serverIcon = getServerIcon(serverName);

  if (!showDetails) {
    // 简化显示模式
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${serverColor} border text-xs cursor-pointer hover:opacity-80 ${className}`}
        onClick={onClick}
        title={`${serverName}: ${formatToolName(toolName)}`}
      >
        <span>{serverIcon}</span>
        <span className="font-medium">{serverName}</span>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${serverColor} border hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* 服务器图标和名称 */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{serverIcon}</span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide">{serverName}</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </div>
          <span className="text-sm font-medium">{formatToolName(toolName)}</span>
        </div>
      </div>

      {/* 详细信息按钮 */}
      {onClick && (
        <Info className="w-4 h-4 opacity-60 hover:opacity-80" />
      )}
    </div>
  );
};

/**
 * MCP工具列表显示组件
 */
interface McpToolListProps {
  tools: string[];
  className?: string;
  showDetails?: boolean;
  onToolClick?: (toolId: string) => void;
}

export const McpToolList: React.FC<McpToolListProps> = ({
  tools,
  className = '',
  showDetails = true,
  onToolClick
}) => {
  // 按服务器分组
  const groupedTools = tools.reduce((groups, toolId) => {
    const toolInfo = parseMcpToolName(toolId);
    const serverName = toolInfo?.serverName || 'unknown';
    
    if (!groups[serverName]) {
      groups[serverName] = [];
    }
    groups[serverName].push(toolId);
    
    return groups;
  }, {} as Record<string, string[]>);

  return (
    <div className={`space-y-4 ${className}`}>
      {Object.entries(groupedTools).map(([serverName, serverTools]) => (
        <div key={serverName} className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span>{getServerIcon(serverName)}</span>
            <span className="uppercase tracking-wide">{serverName}</span>
            <span className="text-xs text-gray-500">({serverTools.length} 个工具)</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {serverTools.map(toolId => (
              <McpToolDisplay
                key={toolId}
                toolId={toolId}
                showDetails={showDetails}
                onClick={() => onToolClick?.(toolId)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default McpToolDisplay;
