import React from 'react';
import { BaseToolComponent, ToolInput, ToolOutput } from './BaseToolComponent';
import { McpToolDisplay, parseMcpToolName } from '../McpToolDisplay';
import type { ToolExecution } from './types';

interface McpToolProps {
  execution: ToolExecution;
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
    >
      <div className="space-y-3">
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
    </BaseToolComponent>
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
