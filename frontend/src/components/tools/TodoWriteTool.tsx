import React from 'react';
import { BaseToolComponent } from './BaseToolComponent';
import type { BaseToolExecution } from './sdk-types';
import type { TodoWriteInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TodoWriteToolProps {
  execution: BaseToolExecution;
}

export const TodoWriteTool: React.FC<TodoWriteToolProps> = ({ execution }) => {
  const { t } = useTranslation('components');
  const input = execution.toolInput as unknown as TodoWriteInput;

  // 防御性检查：确保 todos 存在且是数组
  const todos = Array.isArray(input?.todos) ? input.todos : [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />;
      case 'in_progress':
        return <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-400 dark:text-gray-500" />;
    }
  };

  // Calculate progress
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const totalCount = todos.length;
  const currentTask = todos.find(todo => todo.status === 'in_progress')?.content;
  
  // Generate subtitle based on status
  const getSubtitle = () => {
    if (completedCount === totalCount && totalCount > 0) {
      return t('todoWriteTool.allTasksCompleted');
    }
    if (currentTask) {
      return t('todoWriteTool.currentTaskProgress', { completed: completedCount + 1, total: totalCount, task: currentTask });
    }
    return t('todoWriteTool.pendingTasks', { completed: completedCount, total: totalCount });
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div className="space-y-1">
        {todos.map((todo, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm py-1"
          >
            {getStatusIcon(todo.status)}
            <span className={`flex-1 ${
              todo.status === 'completed' ? 'text-gray-500 dark:text-gray-400 line-through' :
              todo.status === 'in_progress' ? 'text-blue-700 dark:text-blue-300 font-medium' :
              'text-gray-700 dark:text-gray-200'
            }`}>
              {todo.content}
            </span>
          </div>
        ))}

        {/* Compact statistics */}
        <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
          <span>{t('todoWriteTool.completedCount', { count: todos.filter(t => t.status === 'completed').length })}</span>
          <span>{t('todoWriteTool.inProgressCount', { count: todos.filter(t => t.status === 'in_progress').length })}</span>
          <span>{t('todoWriteTool.pendingCount', { count: todos.filter(t => t.status === 'pending').length })}</span>
        </div>
      </div>
    </BaseToolComponent>
  );
};