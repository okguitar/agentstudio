import React, { useState } from 'react';
import { 
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap  // 使用闪电图标作为MCP工具的默认图标
} from 'lucide-react';
import { ToolInput, ToolOutput } from './BaseToolComponent';
import { McpToolDisplay, parseMcpToolName } from '../McpToolDisplay';
import type { ToolExecution } from './types';

interface McpToolProps {
  execution: ToolExecution;
}

/**
 * 获取MCP工具图标
 */
function getMcpToolIcon(serverName: string) {
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
      return <Zap className="w-4 h-4" />;
  }
}

/**
 * 获取MCP工具颜色
 */
function getMcpToolColor(serverName: string): string {
  switch (serverName.toLowerCase()) {
    case 'playwright':
      return 'text-green-600 bg-green-100';
    case 'supabase':
      return 'text-blue-600 bg-blue-100';
    case 'unsplash':
      return 'text-purple-600 bg-purple-100';
    case 'github':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-orange-600 bg-orange-100';
  }
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
  const [isExpanded, setIsExpanded] = useState(false);
  const toolInfo = parseMcpToolName(execution.toolName);
  
  if (!toolInfo) {
    // 如果解析失败，显示原始工具名
    return (
      <div className="border border-gray-200 rounded-lg bg-gray-50 max-w-full">
        <div className="flex items-start justify-between p-4">
          <div className="flex items-start space-x-2 flex-1">
            <div className="p-2 rounded-full text-gray-600 bg-gray-100">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800">{execution.toolName}</h4>
              <p className="text-xs text-gray-500">未知工具类型</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { serverName, toolName } = toolInfo;
  const toolIcon = getMcpToolIcon(serverName);
  const colorClass = getMcpToolColor(serverName);
  const formattedToolName = formatMcpToolName(toolName);

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 max-w-full">
      {/* MCP工具头部 */}
      <div 
        className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start space-x-2 flex-1 min-w-0">
          <div className={`p-2 rounded-full ${colorClass} mt-0.5`}>
            {execution.isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-lg">{toolIcon}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-800">{formattedToolName}</h4>
            <p className="text-xs text-gray-500 truncate">
              来自 {serverName} 服务器的 MCP 工具
            </p>
          </div>
        </div>
        <div className="flex items-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 可展开的工具内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-3 space-y-3">
            {/* MCP工具标识 */}
            <div className="mb-3">
              <McpToolDisplay 
                toolId={execution.toolName}
                showDetails={true}
                className="shadow-sm"
              />
            </div>

            {/* 工具输入参数 */}
            {Object.entries(execution.toolInput).map(([key, value]) => (
              <ToolInput 
                key={key}
                label={key}
                value={value}
                isCode={typeof value === 'object'}
              />
            ))}
            
            {/* 工具执行结果 */}
            {execution.toolResult && (
              <ToolOutput 
                result={execution.toolResult}
                isError={execution.isError}
              />
            )}
            
            {/* MCP工具特殊处理 */}
            {renderMcpSpecificContent(toolInfo, execution)}
          </div>
        </div>
      )}

      {/* 错误状态显示 */}
      {execution.isError && execution.toolResult && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {execution.toolResult}
        </div>
      )}
    </div>
  );
};

/**
 * 为特定MCP工具渲染特殊内容
 */
function renderMcpSpecificContent(toolInfo: ReturnType<typeof parseMcpToolName>, execution: ToolExecution) {
  if (!toolInfo) return null;

  const { serverName, toolName } = toolInfo;

  // Playwright 浏览器工具特殊处理
  if (serverName === 'playwright') {
    return renderPlaywrightToolContent(toolName, execution);
  }

  // Supabase 工具特殊处理
  if (serverName === 'supabase') {
    return renderSupabaseToolContent(toolName, execution);
  }

  // Unsplash 工具特殊处理
  if (serverName === 'unsplash') {
    return renderUnsplashToolContent(toolName, execution);
  }

  return null;
}

/**
 * Playwright 工具特殊内容渲染
 */
function renderPlaywrightToolContent(toolName: string, execution: ToolExecution) {
  if (toolName === 'browser_take_screenshot' && execution.toolResult) {
    try {
      const result = JSON.parse(execution.toolResult);
      if (result.screenshot || result.path) {
        return (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-sm font-medium text-green-800 mb-2">🎭 浏览器截图</h4>
            <p className="text-xs text-green-600">
              截图已保存: {result.path || '已生成'}
            </p>
          </div>
        );
      }
    } catch {
      // 忽略JSON解析错误
    }
  }

  if (toolName === 'browser_navigate' && execution.toolResult) {
    const url = execution.toolInput.url as string || '未知URL';
    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">🌐 页面导航</h4>
        <p className="text-xs text-blue-600">
          页面导航完成: {url}
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Supabase 工具特殊内容渲染
 */
function renderSupabaseToolContent(toolName: string, execution: ToolExecution) {
  if (toolName.includes('list_') && execution.toolResult) {
    try {
      const result = JSON.parse(execution.toolResult);
      if (Array.isArray(result)) {
        return (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">🗄️ Supabase 查询</h4>
            <p className="text-xs text-blue-600">
              返回 {result.length} 条记录
            </p>
          </div>
        );
      }
    } catch {
      // 忽略JSON解析错误
    }
  }

  if (toolName === 'execute_sql' && execution.toolResult) {
    return (
      <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="text-sm font-medium text-purple-800 mb-2">🔍 SQL 执行</h4>
        <p className="text-xs text-purple-600">
          SQL 查询已执行
        </p>
      </div>
    );
  }

  return null;
}

/**
 * Unsplash 工具特殊内容渲染
 */
function renderUnsplashToolContent(toolName: string, execution: ToolExecution) {
  if (toolName === 'search_photos' && execution.toolResult) {
    try {
      const result = JSON.parse(execution.toolResult);
      if (result.photos && Array.isArray(result.photos)) {
        return (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="text-sm font-medium text-purple-800 mb-2">📸 Unsplash 搜索</h4>
            <p className="text-xs text-purple-600">
              找到 {result.photos.length} 张图片
            </p>
            {result.photos.slice(0, 3).map((photo: any, index: number) => (
              <div key={index} className="text-xs text-purple-500 mt-1">
                • {photo.description || photo.alt_description || '无描述'}
              </div>
            ))}
          </div>
        );
      }
    } catch {
      // 忽略JSON解析错误
    }
  }

  return null;
}

export default McpTool;
