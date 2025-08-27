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
        return <AlertCircle className="w-3 h-3 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <BaseToolComponent execution={execution}>
      <div>
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">
            待办事项列表 ({input.todos.length} 项):
          </p>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {input.todos.map((todo) => (
              <div 
                key={todo.id} 
                className={`p-3 rounded-md border ${getStatusColor(todo.status)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    {getStatusIcon(todo.status)}
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {todo.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(todo.priority)}`}>
                          {todo.priority === 'high' ? '高' : 
                           todo.priority === 'medium' ? '中' : '低'}优先级
                        </span>
                        <span className="text-xs text-gray-500">
                          {todo.status === 'completed' ? '已完成' : 
                           todo.status === 'in_progress' ? '进行中' : '待处理'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 统计信息 */}
        <div className="flex gap-4 text-xs text-gray-600 bg-gray-100 p-2 rounded">
          <span>
            已完成: {input.todos.filter(t => t.status === 'completed').length}
          </span>
          <span>
            进行中: {input.todos.filter(t => t.status === 'in_progress').length}
          </span>
          <span>
            待处理: {input.todos.filter(t => t.status === 'pending').length}
          </span>
        </div>
      </div>
      
    </BaseToolComponent>
  );
};