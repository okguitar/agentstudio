import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTaskExecutionHistory } from '../hooks/useScheduledTasks';
import type { TaskExecution, ExecutionLogEntry } from '../types/scheduledTasks';

interface TaskExecutionHistoryProps {
  taskId: string;
  taskName: string;
  agentId?: string;
  projectPath?: string;
  onBack: () => void;
}

export const TaskExecutionHistory: React.FC<TaskExecutionHistoryProps> = ({
  taskId,
  taskName,
  agentId,
  projectPath,
  onBack,
}) => {
  const { data: executions = [], isLoading } = useTaskExecutionHistory(taskId);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleRow = (executionId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(executionId)) {
        next.delete(executionId);
      } else {
        next.add(executionId);
      }
      return next;
    });
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // Format log timestamp
  const formatLogTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  // Calculate duration
  const calculateDuration = (execution: TaskExecution): string => {
    if (!execution.completedAt) return '-';
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(execution.completedAt).getTime();
    const durationMs = end - start;

    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
  };

  // Render status icon
  const renderStatusIcon = (status: TaskExecution['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Render status text
  const renderStatusText = (status: TaskExecution['status']) => {
    switch (status) {
      case 'running':
        return <span className="text-blue-600 dark:text-blue-400">运行中</span>;
      case 'success':
        return <span className="text-green-600 dark:text-green-400">成功</span>;
      case 'error':
        return <span className="text-red-600 dark:text-red-400">失败</span>;
      default:
        return <span className="text-gray-500">未知</span>;
    }
  };

  // Get log level color
  const getLogLevelColor = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'debug':
        return 'text-gray-500 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Get log type badge color
  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      case 'assistant':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      case 'tool_use':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      case 'result':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      case 'error':
        return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Build chat URL for continuing conversation
  const buildChatUrl = (execution: TaskExecution): string | null => {
    const execAgentId = execution.agentId || agentId;
    const execProjectPath = execution.projectPath || projectPath;
    
    if (!execAgentId || !execution.sessionId) return null;
    
    let url = `/chat/${encodeURIComponent(execAgentId)}?session=${encodeURIComponent(execution.sessionId)}`;
    if (execProjectPath) {
      url += `&project=${encodeURIComponent(execProjectPath)}`;
    }
    return url;
  };

  // Handle continue chat button click
  const handleContinueChat = (execution: TaskExecution, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion toggle
    const url = buildChatUrl(execution);
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Render execution logs
  const renderLogs = (logs?: ExecutionLogEntry[]) => {
    if (!logs || logs.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          暂无执行日志
        </div>
      );
    }

    return (
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 px-3 py-1.5 rounded text-sm font-mono ${getLogLevelColor(log.level)}`}
          >
            <span className="text-gray-400 dark:text-gray-500 shrink-0 w-24">
              {formatLogTime(log.timestamp)}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${getLogTypeBadge(log.type)}`}>
              {log.type}
            </span>
            <span className="flex-1 break-all whitespace-pre-wrap">
              {log.message}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            执行历史
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            任务：{taskName}
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : executions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无执行记录
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            任务尚未执行过
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>完成时间</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>结果摘要</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <React.Fragment key={execution.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => toggleRow(execution.id)}
                  >
                    {/* Expand Toggle */}
                    <TableCell className="p-2">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        {expandedRows.has(execution.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStatusIcon(execution.status)}
                        {renderStatusText(execution.status)}
                      </div>
                    </TableCell>

                    {/* Started At */}
                    <TableCell>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(execution.startedAt)}
                      </span>
                    </TableCell>

                    {/* Completed At */}
                    <TableCell>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(execution.completedAt)}
                      </span>
                    </TableCell>

                    {/* Duration */}
                    <TableCell>
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {calculateDuration(execution)}
                      </span>
                    </TableCell>

                    {/* Summary / Error */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {execution.logs && execution.logs.length > 0 && (
                          <span title="有详细日志">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          </span>
                        )}
                        {execution.error ? (
                          <div className="text-sm text-red-600 dark:text-red-400 max-w-md truncate">
                            {execution.error}
                          </div>
                        ) : execution.responseSummary ? (
                          <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md truncate">
                            {execution.responseSummary}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      {execution.sessionId && buildChatUrl(execution) && (
                        <button
                          onClick={(e) => handleContinueChat(execution, e)}
                          className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="在新窗口继续会话"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Log Details */}
                  {expandedRows.has(execution.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-800/50 p-4">
                        <div className="space-y-3">
                          {/* Error Stack */}
                          {execution.errorStack && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                              <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                                错误堆栈
                              </h4>
                              <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto">
                                {execution.errorStack}
                              </pre>
                            </div>
                          )}

                          {/* Execution Logs */}
                          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              执行日志
                              {execution.logs && (
                                <span className="text-xs text-gray-400">
                                  ({execution.logs.length} 条)
                                </span>
                              )}
                            </h4>
                            {renderLogs(execution.logs)}
                          </div>

                          {/* Session ID */}
                          {execution.sessionId && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Session ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{execution.sessionId}</code>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default TaskExecutionHistory;
