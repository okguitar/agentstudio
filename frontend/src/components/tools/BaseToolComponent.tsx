import React, { useState } from 'react';
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
  Plug  // 用于MCP工具
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
  Task: 'text-purple-600 bg-purple-100',
  Bash: 'text-gray-800 bg-gray-100',
  BashOutput: 'text-blue-700 bg-blue-50',
  KillBash: 'text-red-700 bg-red-50',
  Glob: 'text-blue-600 bg-blue-100',
  Grep: 'text-green-600 bg-green-100',
  LS: 'text-yellow-600 bg-yellow-100',
  exit_plan_mode: 'text-emerald-600 bg-emerald-100',
  Read: 'text-indigo-600 bg-indigo-100',
  Edit: 'text-orange-600 bg-orange-100',
  MultiEdit: 'text-red-600 bg-red-100',
  Write: 'text-cyan-600 bg-cyan-100',
  NotebookRead: 'text-pink-600 bg-pink-100',
  NotebookEdit: 'text-rose-600 bg-rose-100',
  WebFetch: 'text-teal-600 bg-teal-100',
  TodoWrite: 'text-violet-600 bg-violet-100',
  WebSearch: 'text-sky-600 bg-sky-100'
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
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 为MCP工具使用不同的图标和颜色
  const Icon = isMcpTool 
    ? Plug 
    : TOOL_ICONS[execution.toolName as keyof typeof TOOL_ICONS] || Terminal;
  
  const colorClass = isMcpTool 
    ? 'text-blue-600 bg-blue-100' 
    : TOOL_COLORS[execution.toolName as keyof typeof TOOL_COLORS] || 'text-gray-600 bg-gray-100';


  // 清理错误信息，移除 <tool_use_error> 标签
  const cleanErrorMessage = (message: string) => {
    return message.replace(/<\/?tool_use_error>/g, '').trim();
  };


  return (
    <>
      <div className="border border-gray-200 rounded-lg bg-gray-50 max-w-full">
        {/* 可点击的工具头部 */}
        <div 
          className={`flex items-start justify-between cursor-pointer hover:bg-gray-100 transition-colors ${
            hideToolName ? 'p-2' : 'p-4'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className={`flex space-x-2 flex-1 min-w-0 ${hideToolName ? 'items-center' : 'items-start'}`}>
            <div className={`${hideToolName ? 'p-1.5' : 'p-2'} rounded-full ${colorClass} ${hideToolName ? '' : 'mt-0.5'}`}>
              {execution.isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {!hideToolName && (
                <h4 className="text-sm font-semibold text-gray-800">{execution.toolName}</h4>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
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
      <span className="text-xs font-medium text-gray-600">{label}:</span>
      <div className={`mt-1 ${isCode ? 'font-mono bg-gray-100 p-2 rounded text-sm' : 'text-sm text-gray-800'}`}>
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
  if (!result) return null;

  return (
    <div className={`mt-3 ${className}`}>
      <p className="text-xs font-medium text-gray-600 mb-2">执行结果:</p>
      <div className={`p-3 rounded-md border text-sm font-mono whitespace-pre-wrap break-words ${
        isError 
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-green-50 border-green-200 text-green-700'
      }`}>
        {result}
      </div>
    </div>
  );
};