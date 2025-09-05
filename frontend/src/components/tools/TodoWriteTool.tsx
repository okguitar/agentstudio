import React from 'react';
import { BaseToolComponent } from './BaseToolComponent';
import type { ToolExecution, TodoWriteToolInput } from './types';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TodoWriteToolProps {
  execution: ToolExecution;
}

export const TodoWriteTool: React.FC<TodoWriteToolProps> = ({ execution }) => {
  const input = execution.toolInput as TodoWriteToolInput;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-3 h-3 text-blue-600" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-400" />;
    }
  };

  // Calculate progress
  const completedCount = input.todos.filter(t => t.status === 'completed').length;
  const totalCount = input.todos.length;
  const currentTask = input.todos.find(todo => todo.status === 'in_progress')?.content;
  
  // Generate subtitle based on status
  const getSubtitle = () => {
    if (completedCount === totalCount && totalCount > 0) {
      return '所有任务已完成';
    }
    if (currentTask) {
      return `${completedCount + 1}/${totalCount} ${currentTask}`;
    }
    return `${completedCount}/${totalCount} 待办任务`;
  };

  return (
    <BaseToolComponent execution={execution} subtitle={getSubtitle()} showResult={false}>
      <div className="space-y-1">
        {input.todos.map((todo, index) => (
          <div 
            key={index}
            className="flex items-center gap-2 text-sm py-1"
          >
            {getStatusIcon(todo.status)}
            <span className={`flex-1 ${
              todo.status === 'completed' ? 'text-gray-500 line-through' : 
              todo.status === 'in_progress' ? 'text-blue-700 font-medium' : 
              'text-gray-700'
            }`}>
              {todo.content}
            </span>
          </div>
        ))}
        
        {/* Compact statistics */}
        <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-gray-200 mt-2">
          <span>已完成: {input.todos.filter(t => t.status === 'completed').length}</span>
          <span>进行中: {input.todos.filter(t => t.status === 'in_progress').length}</span>
          <span>待处理: {input.todos.filter(t => t.status === 'pending').length}</span>
        </div>
      </div>
    </BaseToolComponent>
  );
};