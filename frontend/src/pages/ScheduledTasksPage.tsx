import React, { useState } from 'react';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  Settings,
  StopCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQueryClient } from '@tanstack/react-query';
import {
  useScheduledTasks,
  useDeleteScheduledTask,
  useToggleScheduledTask,
  useRunScheduledTask,
  useSchedulerStatus,
  useEnableScheduler,
  useDisableScheduler,
  useStopExecution,
  useRunningExecutions,
  scheduledTasksKeys,
} from '../hooks/useScheduledTasks';
import { useAgents } from '../hooks/useAgents';
import { ScheduledTaskEditor } from '../components/ScheduledTaskEditor';
import { TaskExecutionHistory } from '../components/TaskExecutionHistory';
import type { ScheduledTask } from '../types/scheduledTasks';
import { showSuccess, showError } from '../utils/toast';

export const ScheduledTasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: tasks = [], isLoading } = useScheduledTasks();
  const { data: agentsData } = useAgents(true);
  const { data: schedulerStatus } = useSchedulerStatus();
  const deleteTask = useDeleteScheduledTask();
  const toggleTask = useToggleScheduledTask();
  const runTask = useRunScheduledTask();
  const stopExecution = useStopExecution();
  const { data: runningExecutionsData } = useRunningExecutions();
  const enableScheduler = useEnableScheduler();
  const disableScheduler = useDisableScheduler();

  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);

  // Get running execution ID for a task
  const getRunningExecutionId = (taskId: string): string | null => {
    const exec = runningExecutionsData?.executions?.find(e => e.taskId === taskId);
    return exec?.executionId || null;
  };

  const agents = agentsData?.agents || [];

  // Get agent name by ID
  const getAgentName = (agentId: string): string => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  // Format schedule for display
  const formatSchedule = (task: ScheduledTask): string => {
    if (task.schedule.type === 'interval' && task.schedule.intervalMinutes) {
      const minutes = task.schedule.intervalMinutes;
      if (minutes < 60) {
        return `每 ${minutes} 分钟`;
      }
      const hours = Math.floor(minutes / 60);
      return `每 ${hours} 小时`;
    }
    if (task.schedule.type === 'cron' && task.schedule.cronExpression) {
      return task.schedule.cronExpression;
    }
    if (task.schedule.type === 'once' && task.schedule.executeAt) {
      return `一次性 @ ${new Date(task.schedule.executeAt).toLocaleString('zh-CN')}`;
    }
    return '-';
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // Handle toggle
  const handleToggle = async (task: ScheduledTask) => {
    try {
      await toggleTask.mutateAsync(task.id);
      showSuccess(task.enabled ? '任务已暂停' : '任务已启用');
    } catch {
      showError('操作失败');
    }
  };

  // Handle delete
  const handleDelete = async (task: ScheduledTask) => {
    if (!confirm(`确定要删除任务 "${task.name}" 吗？`)) {
      return;
    }
    try {
      await deleteTask.mutateAsync(task.id);
      showSuccess('任务已删除');
    } catch {
      showError('删除失败');
    }
  };

  // Handle manual run
  const handleRun = async (task: ScheduledTask) => {
    try {
      await runTask.mutateAsync(task.id);
      showSuccess('任务已开始执行');
      // Refresh task list to show running status
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
    } catch {
      showError('执行失败');
    }
  };

  // Handle stop execution
  const handleStop = async (task: ScheduledTask) => {
    const executionId = getRunningExecutionId(task.id);
    if (!executionId) {
      showError('找不到正在运行的执行');
      return;
    }
    try {
      await stopExecution.mutateAsync(executionId);
      showSuccess('任务已停止');
      // Refresh task list
      queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
    } catch {
      showError('停止失败');
    }
  };

  // Handle toggle scheduler
  const handleToggleScheduler = async () => {
    if (!schedulerStatus) return;

    try {
      if (schedulerStatus.enabled) {
        await disableScheduler.mutateAsync();
        showSuccess('调度器已禁用');
      } else {
        await enableScheduler.mutateAsync();
        showSuccess('调度器已启用');
      }
    } catch {
      showError('操作失败');
    }
  };

  // Handle edit
  const handleEdit = (task: ScheduledTask) => {
    setEditingTask(task);
    setShowEditorModal(true);
  };

  // Handle create
  const handleCreate = () => {
    setEditingTask(null);
    setShowEditorModal(true);
  };

  // Handle save complete
  const handleSaveComplete = () => {
    setEditingTask(null);
    setShowEditorModal(false);
    queryClient.invalidateQueries({ queryKey: scheduledTasksKeys.lists() });
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingTask(null);
    setShowEditorModal(false);
  };

  // Render status badge
  const renderStatusBadge = (task: ScheduledTask) => {
    if (task.lastRunStatus === 'running') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          运行中
        </span>
      );
    }
    if (task.lastRunStatus === 'success') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          成功
        </span>
      );
    }
    if (task.lastRunStatus === 'error') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          失败
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        未执行
      </span>
    );
  };

  // Show history if viewing
  if (showHistory) {
    const task = tasks.find(t => t.id === showHistory);
    return (
      <TaskExecutionHistory
        taskId={showHistory}
        taskName={task?.name || showHistory}
        agentId={task?.agentId}
        projectPath={task?.projectPath}
        onBack={() => setShowHistory(null)}
      />
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-8 h-8" />
              定时任务
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              配置 Agent 的自动执行计划
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          {/* Scheduler Status */}
          {schedulerStatus && (
            <div className="flex items-center gap-4 text-sm">
              {/* Scheduler Enabled Status (Clickable) */}
              <button
                onClick={handleToggleScheduler}
                disabled={enableScheduler.isPending || disableScheduler.isPending}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  schedulerStatus.enabled
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                } ${
                  enableScheduler.isPending || disableScheduler.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                title={schedulerStatus.enabled ? '点击禁用调度器' : '点击启用调度器'}
              >
                <Clock className={`w-4 h-4 ${enableScheduler.isPending || disableScheduler.isPending ? 'animate-pulse' : ''}`} />
                <span className="font-medium">
                  {schedulerStatus.enabled ? '调度器已启用' : '调度器已禁用'}
                </span>
              </button>

              {/* Task Count Status */}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Settings className="w-4 h-4" />
                <span>
                  活跃: {schedulerStatus.activeTaskCount} /
                  运行中: {schedulerStatus.runningTaskCount}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            新建任务
          </button>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            暂无定时任务
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            创建定时任务来让 Agent 自动执行工作
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            创建第一个任务
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">任务名称</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">调度规则</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">上次执行</TableHead>
                <TableHead className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">下次执行</TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* Enabled Toggle */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(task)}
                      className={`p-1 rounded-full transition-colors ${
                        task.enabled
                          ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title={task.enabled ? '点击暂停' : '点击启用'}
                    >
                      {task.enabled ? (
                        <Play className="w-5 h-5 fill-current" />
                      ) : (
                        <Pause className="w-5 h-5" />
                      )}
                    </button>
                  </TableCell>

                  {/* Task Name */}
                  <TableCell className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {task.name}
                      </div>
                      {task.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Agent */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {getAgentName(task.agentId)}
                    </span>
                  </TableCell>

                  {/* Schedule */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {formatSchedule(task)}
                    </span>
                  </TableCell>

                  {/* Last Run */}
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {renderStatusBadge(task)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(task.lastRunAt)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Next Run */}
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {task.enabled ? formatDate(task.nextRunAt) : '-'}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1">
                      {/* Run Now or Stop */}
                      {task.lastRunStatus === 'running' ? (
                        <button
                          onClick={() => handleStop(task)}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                          title="停止执行"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRun(task)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                          title="立即执行"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {/* History */}
                      <button
                        onClick={() => setShowHistory(task.id)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900 rounded-lg transition-colors"
                        title="执行历史"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(task)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(task)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Task Editor Modal */}
      {showEditorModal && (
        <ScheduledTaskEditor
          task={editingTask}
          agents={agents}
          onSave={handleSaveComplete}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default ScheduledTasksPage;
