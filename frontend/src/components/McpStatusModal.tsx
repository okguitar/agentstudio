import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff, ChevronDown, ChevronRight, Copy } from 'lucide-react';

interface McpServer {
  name: string;
  status: string;
  error?: string;
}

interface McpStatusData {
  hasError: boolean;
  connectedServers?: McpServer[];
  connectionErrors?: McpServer[];
  lastError?: string | null;
  lastErrorDetails?: string;
  lastUpdated?: number;
}

interface McpStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcpStatus: McpStatusData;
}

export const McpStatusModal: React.FC<McpStatusModalProps> = ({
  isOpen,
  onClose,
  mcpStatus
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '未知';
    return new Date(timestamp).toLocaleString();
  };

  const hasAnyServers = (mcpStatus.connectedServers?.length || 0) > 0 || (mcpStatus.connectionErrors?.length || 0) > 0;

  const toggleErrorExpansion = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const copyErrorToClipboard = async (errorText: string, index: number) => {
    try {
      await navigator.clipboard.writeText(errorText);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy error text:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {mcpStatus.hasError ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              MCP 工具状态
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Overall Status */}
          <div className={`p-3 rounded-lg ${
            mcpStatus.hasError 
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center space-x-2">
              {mcpStatus.hasError ? (
                <WifiOff className="w-4 h-4 text-red-500" />
              ) : (
                <Wifi className="w-4 h-4 text-green-500" />
              )}
              <span className={`font-medium ${
                mcpStatus.hasError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
              }`}>
                {mcpStatus.hasError ? 'MCP 工具存在问题' : 'MCP 工具运行正常'}
              </span>
            </div>
          </div>

          {/* Last Updated */}
          {mcpStatus.lastUpdated && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>最后更新: {formatTimestamp(mcpStatus.lastUpdated)}</span>
            </div>
          )}

          {/* Connected Servers */}
          {mcpStatus.connectedServers && mcpStatus.connectedServers.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                ✅ 已连接的服务器 ({mcpStatus.connectedServers.length})
              </h4>
              <div className="space-y-2">
                {mcpStatus.connectedServers.map((server, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                      {server.name}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ({server.status})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Errors */}
          {mcpStatus.connectionErrors && mcpStatus.connectionErrors.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                ❌ 连接失败的服务器 ({mcpStatus.connectionErrors.length})
              </h4>
              <div className="space-y-2">
                {mcpStatus.connectionErrors.map((server, index) => {
                  const isExpanded = expandedErrors.has(index);
                  const hasDetailedError = server.error && server.error.length > 50;
                  const isCopied = copiedIndex === index;
                  
                  return (
                    <div
                      key={index}
                      className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                          {server.name}
                        </span>
                        <span className="text-xs text-red-600 dark:text-red-400">
                          ({server.status})
                        </span>
                        {hasDetailedError && (
                          <button
                            onClick={() => toggleErrorExpansion(index)}
                            className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded"
                            title={isExpanded ? "收起详细错误" : "展开详细错误"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-red-500" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-red-500" />
                            )}
                          </button>
                        )}
                      </div>
                      {server.error && (
                        <div className="ml-6">
                          {hasDetailedError ? (
                            <div>
                              <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                                {isExpanded ? server.error : `${server.error.substring(0, 50)}...`}
                              </p>
                              {isExpanded && (
                                <div className="flex items-center justify-between mt-2">
                                  <button
                                    onClick={() => copyErrorToClipboard(server.error!, index)}
                                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 rounded transition-colors"
                                    title="复制错误信息"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>{isCopied ? '已复制' : '复制错误'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {server.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Last Error */}
          {mcpStatus.lastError && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  🚨 最近的错误
                </h4>
                <button
                  onClick={() => copyErrorToClipboard(
                    `${mcpStatus.lastError}${mcpStatus.lastErrorDetails ? '\n详情: ' + mcpStatus.lastErrorDetails : ''}`, 
                    -1
                  )}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 rounded transition-colors"
                  title="复制错误信息"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedIndex === -1 ? '已复制' : '复制'}</span>
                </button>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300 mb-1 font-mono">
                  {mcpStatus.lastError}
                </p>
                {mcpStatus.lastErrorDetails && (
                  <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700">
                    <p className="text-xs text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap">
                      <span className="font-semibold">详情:</span><br />
                      {mcpStatus.lastErrorDetails}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Servers Message */}
          {!hasAnyServers && (
            <div className="text-center py-8">
              <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                暂无 MCP 服务器信息
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                当使用 MCP 工具时，状态信息将显示在这里
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            MCP (Model Context Protocol) 工具允许 AI 与外部系统交互。
            如果遇到连接问题，请检查 MCP 服务器配置。
          </p>
        </div>
      </div>
    </div>
  );
};