import React from 'react';
import { useTranslation } from 'react-i18next';
import { BaseToolComponent, ToolInput } from './BaseToolComponent';
import type { ToolExecution } from './types';
import { parseMcpToolName } from './mcpUtils';

interface McpToolProps {
  execution: ToolExecution;
}

// MCP结果内容类型
interface McpTextContent {
  type: 'text';
  text: string;
}

interface McpImageContent {
  type: 'image';
  data: string; // base64 encoded image data
  mimeType: string; // image/png, image/jpeg, etc.
}

interface McpResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  };
}

type McpContent = McpTextContent | McpImageContent | McpResourceContent | { type: string; [key: string]: unknown };

// MCP工具结果类型
interface McpResult {
  content?: McpContent | McpContent[];
  isError?: boolean;
  _meta?: {
    progress?: number;
    progressTotal?: number;
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
 * 尝试解析MCP结果结构
 */
function parseMcpResult(result: string): McpResult | null {
  try {
    const parsed = JSON.parse(result);
    
    // 如果结果是数组，可能是MCP内容数组
    if (Array.isArray(parsed)) {
      return { content: parsed };
    }
    
    // 如果结果有content字段，可能是MCP结果
    if (parsed && typeof parsed === 'object' && ('content' in parsed || 'isError' in parsed)) {
      return parsed as McpResult;
    }
    
    // 否则当作文本内容处理
    return { content: { type: 'text', text: result } };
  } catch {
    // JSON解析失败，当作纯文本处理
    return { content: { type: 'text', text: result } };
  }
}

/**
 * 渲染单个MCP内容
 */
const McpContentRenderer: React.FC<{ content: McpContent }> = ({ content }) => {
  switch (content.type) {
    case 'text':
      return (
        <div className="p-3 rounded-md border bg-green-50 border-green-200">
          <pre className="text-sm font-mono text-green-700 whitespace-pre-wrap break-words">
            {(content as McpTextContent).text}
          </pre>
        </div>
      );
      
    case 'image': {
      const { t } = useTranslation('components');
      const imageContent = content as McpImageContent;
      return (
        <div className="p-3 rounded-md border bg-blue-50 border-blue-200">
          <div className="text-xs font-medium text-blue-600 mb-2">
            {t('mcpTool.image', { mimeType: imageContent.mimeType })}
          </div>
          <img
            src={`data:${imageContent.mimeType};base64,${imageContent.data}`}
            alt="MCP Tool Result"
            className="max-w-full h-auto rounded border shadow-sm"
            style={{ maxHeight: '400px' }}
          />
        </div>
      );
    }
      
    case 'resource': {
      const { t } = useTranslation('components');
      const resourceContent = content as McpResourceContent;
      return (
        <div className="p-3 rounded-md border bg-purple-50 border-purple-200">
          <div className="text-xs font-medium text-purple-600 mb-2">{t('mcpTool.resource')}</div>
          <div className="text-sm text-purple-700 space-y-1">
            <div><span className="font-medium">{t('mcpTool.uri')}:</span> {resourceContent.resource.uri}</div>
            {resourceContent.resource.name && (
              <div><span className="font-medium">{t('mcpTool.name')}:</span> {resourceContent.resource.name}</div>
            )}
            {resourceContent.resource.description && (
              <div><span className="font-medium">{t('mcpTool.description')}:</span> {resourceContent.resource.description}</div>
            )}
            {resourceContent.resource.mimeType && (
              <div><span className="font-medium">{t('mcpTool.type')}:</span> {resourceContent.resource.mimeType}</div>
            )}
          </div>
        </div>
      );
    }
      
    default:
      // 未知类型，显示为JSON
      const { t } = useTranslation('components');
      return (
        <div className="p-3 rounded-md border bg-gray-50 border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-2">
            {t('mcpTool.unknownType', { type: content.type })}
          </div>
          <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap break-words">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      );
  }
};

/**
 * MCP结果渲染组件
 */
const McpResultRenderer: React.FC<{ result: string; isError?: boolean }> = ({ result, isError }) => {
  const { t } = useTranslation('components');

  if (!result) return null;

  if (isError) {
    return (
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-600 mb-2">{t('mcpTool.errorMessage')}</p>
        <div className="p-3 rounded-md border bg-red-50 border-red-200 text-red-700 text-sm font-mono whitespace-pre-wrap break-words">
          {result}
        </div>
      </div>
    );
  }

  const mcpResult = parseMcpResult(result);
  if (!mcpResult || !mcpResult.content) {
    // 降级到原始文本显示
    return (
      <div className="mt-3">
        <p className="text-xs font-medium text-gray-600 mb-2">{t('mcpTool.executionResult')}</p>
        <div className="p-3 rounded-md border bg-green-50 border-green-200 text-green-700 text-sm font-mono whitespace-pre-wrap break-words">
          {result}
        </div>
      </div>
    );
  }

  const content = Array.isArray(mcpResult.content) ? mcpResult.content : [mcpResult.content];

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-gray-600 mb-2">{t('mcpTool.executionResult')}</p>

      {/* 进度信息 */}
      {mcpResult._meta?.progress !== undefined && mcpResult._meta?.progressTotal && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="text-blue-700 mb-1">
            {t('mcpTool.progress', { current: mcpResult._meta.progress, total: mcpResult._meta.progressTotal })}
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(mcpResult._meta.progress / mcpResult._meta.progressTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 内容渲染 */}
      <div className="space-y-3">
        {content.map((item, index) => (
          <McpContentRenderer key={index} content={item} />
        ))}
      </div>
    </div>
  );
};

/**
 * MCP工具专用显示组件
 */
export const McpTool: React.FC<McpToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
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
  const subtitle = t('mcpTool.subtitle', { toolName, serverName });

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
          label={t('mcpTool.parameters')}
          value={execution.toolInput}
          isCode={true}
        />

        {/* 工具执行结果 - 使用MCP专用渲染器 */}
        {execution.toolResult && (
          <McpResultRenderer
            result={execution.toolResult}
            isError={execution.isError}
          />
        )}
      </div>
    </BaseToolComponent>
  );
};

export default McpTool;
