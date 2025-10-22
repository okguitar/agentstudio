import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Terminal,
  FileSearch,
  Search,
  FolderOpen,
  CheckCircle,
  FileText,
  Edit3,
  FileEdit,
  FilePlus,
  BookOpen,
  BookMarked,
  Globe,
  CheckSquare,
  Workflow,
  Loader2,
  ChevronDown,
  ChevronRight,
  Activity,  // 用于BashOutput，表示活动/输出监控
  Square,  // 用于KillBash，表示终止/停止操作
  Plug,  // 用于MCP工具
  AlertCircle  // 用于中断状态
} from 'lucide-react';
import type { ToolExecution } from './types';

// 工具图标映射
const TOOL_ICONS = {
  Task: Workflow,
  Bash: Terminal,
  BashOutput: Activity,
  KillBash: Square,
  Glob: FileSearch,
  Grep: Search,
  LS: FolderOpen,
  exit_plan_mode: CheckCircle,
  Read: FileText,
  Edit: Edit3,
  MultiEdit: FileEdit,
  Write: FilePlus,
  NotebookRead: BookOpen,
  NotebookEdit: BookMarked,
  WebFetch: Globe,
  TodoWrite: CheckSquare,
  WebSearch: Globe
};

// 工具颜色映射
const TOOL_COLORS = {
  Task: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  Bash: 'text-gray-800 dark:text-gray-300 bg-gray-100 dark:bg-gray-700',
  BashOutput: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
  KillBash: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
  Glob: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  Grep: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  LS: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  exit_plan_mode: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  Read: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  Edit: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  MultiEdit: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  Write: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30',
  NotebookRead: 'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30',
  NotebookEdit: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
  WebFetch: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
  TodoWrite: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
  WebSearch: 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30'
};

interface BaseToolProps {
  execution: ToolExecution;
  children?: React.ReactNode;
  subtitle?: string; // 显示关键信息的副标题
  showResult?: boolean; // 是否显示工具结果，默认true
  isMcpTool?: boolean; // 标识是否为MCP工具
  hideToolName?: boolean; // 是否隐藏工具名称，仅显示图标和副标题
}

export const BaseToolComponent: React.FC<BaseToolProps> = ({ execution, children, subtitle, showResult = true, isMcpTool = false, hideToolName = true }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 为MCP工具使用不同的图标和颜色
  const Icon = isMcpTool 
    ? Plug 
    : TOOL_ICONS[execution.toolName as keyof typeof TOOL_ICONS] || Terminal;
  
  const colorClass = isMcpTool
    ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30'
    : TOOL_COLORS[execution.toolName as keyof typeof TOOL_COLORS] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';


  // 清理错误信息，移除 <tool_use_error> 标签
  // const cleanErrorMessage = (message: string) => {
  //   return message.replace(/<\/?tool_use_error>/g, '').trim();
  // };


  return (
    <>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 max-w-full">
        {/* 可点击的工具头部 */}
        <div
          className={`flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            hideToolName ? 'p-2' : 'p-4'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className={`flex items-center space-x-2 flex-1 min-w-0`}>
            <div className={`${hideToolName ? 'p-1.5' : 'p-2'} rounded-full ${
              execution.isInterrupted
                ? 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30'
                : colorClass
            }`}>
              {execution.isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : execution.isInterrupted ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {!hideToolName && (
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{execution.toolName}</h4>
              )}
              {subtitle && (
                <p className={`text-xs truncate ${
                  execution.isInterrupted
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {execution.isInterrupted ? t('baseToolComponent.interrupted') : subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>

        {/* 可展开的工具内容 */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
            <div className="pt-3">
              {children}
              
              {/* 显示工具结果 */}
              {showResult && execution.toolResult && !execution.isError && (
                <ToolOutput result={execution.toolResult} />
              )}
            </div>
          </div>
        )}
      </div>

    </>
  );
};

// 输入参数显示组件
export const ToolInput: React.FC<{ 
  label: string; 
  value: unknown; 
  className?: string;
  isCode?: boolean;
}> = ({ label, value, className = '', isCode = false }) => {
  if (value === undefined || value === null || value === '') return null;
  
  const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  
  return (
    <div className={`mb-2 ${className}`}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}:</span>
      <div className={`mt-1 ${isCode ? 'font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm text-gray-800 dark:text-gray-200' : 'text-sm text-gray-800 dark:text-gray-200'}`}>
        {isCode ? (
          <pre className="whitespace-pre-wrap break-words">{displayValue}</pre>
        ) : (
          <span className="break-words">{displayValue}</span>
        )}
      </div>
    </div>
  );
};

// 输出结果显示组件
export const ToolOutput: React.FC<{
  result: string;
  isError?: boolean;
  className?: string;
}> = ({ result, isError = false, className = '' }) => {
  const { t } = useTranslation('components');
  if (!result) return null;

  return (
    <div className={`mt-3 ${className}`}>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">{t('baseToolComponent.executionResult')}</p>
      <div className={`p-3 rounded-md border text-sm font-mono whitespace-pre-wrap break-words ${
        isError
          ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
      }`}>
        {result}
      </div>
    </div>
  );
};