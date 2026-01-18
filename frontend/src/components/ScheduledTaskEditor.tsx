import React, { useState, useEffect, useMemo } from 'react';
import { Save, Clock, Bot, FolderOpen, MessageSquare, Calendar, Play, Cpu, ChevronDown } from 'lucide-react';
import { useCreateScheduledTask, useUpdateScheduledTask, useRunScheduledTask } from '../hooks/useScheduledTasks';
import { useProjects } from '../hooks/useProjects';
import { useClaudeVersions } from '../hooks/useClaudeVersions';
import type {
  ScheduledTask,
  CreateScheduledTaskRequest,
  TaskSchedule,
  ModelOverride,
} from '../types/scheduledTasks';
import type { AgentConfig } from '../types/index';
import { CRON_PRESETS } from '../types/scheduledTasks';
import { showSuccess, showError } from '../utils/toast';

// Helper function to format date for datetime-local input
const formatDateTimeLocal = (isoString?: string): string => {
  if (!isoString) {
    // Default to 1 hour from now
    const date = new Date();
    date.setHours(date.getHours() + 1);
    date.setMinutes(0);
    date.setSeconds(0);
    return date.toISOString().slice(0, 16);
  }
  return new Date(isoString).toISOString().slice(0, 16);
};

// Helper function to parse datetime-local input to ISO string
const parseDateTimeLocal = (value: string): string => {
  return new Date(value).toISOString();
};

interface ScheduledTaskEditorProps {
  task: ScheduledTask | null; // null for creating new
  agents: AgentConfig[];
  onSave: () => void;
  onCancel: () => void;
}

export const ScheduledTaskEditor: React.FC<ScheduledTaskEditorProps> = ({
  task,
  agents,
  onSave,
  onCancel,
}) => {
  const isEditing = !!task;
  const createTask = useCreateScheduledTask();
  const updateTask = useUpdateScheduledTask();
  const runTask = useRunScheduledTask();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.projects || [];
  const { data: claudeVersionsData } = useClaudeVersions();

  // Form state
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [agentId, setAgentId] = useState(task?.agentId || '');
  const [projectPath, setProjectPath] = useState(task?.projectPath || '');
  const [scheduleType, setScheduleType] = useState<'interval' | 'cron' | 'once'>(
    task?.schedule.type || 'interval'
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    task?.schedule.intervalMinutes || 30
  );
  const [cronExpression, setCronExpression] = useState(
    task?.schedule.cronExpression || '*/30 * * * *'
  );
  const [executeAt, setExecuteAt] = useState(
    formatDateTimeLocal(task?.schedule.executeAt)
  );
  const [triggerMessage, setTriggerMessage] = useState(task?.triggerMessage || '');
  const [enabled, setEnabled] = useState(task?.enabled ?? true);
  
  // Model override state
  const [overrideModel, setOverrideModel] = useState(!!task?.modelOverride?.modelId);
  const [selectedVersionId, setSelectedVersionId] = useState(task?.modelOverride?.versionId || '');
  const [selectedModelId, setSelectedModelId] = useState(task?.modelOverride?.modelId || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Get available models based on selected version
  const availableModels = useMemo(() => {
    if (!claudeVersionsData?.versions) return [];

    // If a specific version is selected, use its models
    if (selectedVersionId) {
      const version = claudeVersionsData.versions.find(v => v.id === selectedVersionId);
      return version?.models || [];
    }

    // Otherwise use default version's models
    const defaultVersion = claudeVersionsData.versions.find(
      v => v.id === claudeVersionsData.defaultVersionId
    ) || claudeVersionsData.versions[0];

    return defaultVersion?.models || [];
  }, [claudeVersionsData, selectedVersionId]);

  // Validate version ID when data is loaded - reset to default if invalid
  useEffect(() => {
    if (overrideModel && claudeVersionsData?.versions && selectedVersionId) {
      const versionExists = claudeVersionsData.versions.some(v => v.id === selectedVersionId);
      if (!versionExists) {
        // Selected version doesn't exist, reset to default
        setSelectedVersionId(claudeVersionsData.defaultVersionId || '');
        setSelectedModelId('');
      }
    }
  }, [claudeVersionsData, selectedVersionId, overrideModel]);

  // When version changes, reset model to first available
  useEffect(() => {
    if (overrideModel && availableModels.length > 0) {
      const currentModelValid = availableModels.some(m => m.id === selectedModelId);
      if (!currentModelValid) {
        setSelectedModelId(availableModels[0].id);
      }
    }
  }, [availableModels, selectedModelId, overrideModel]);

  // Set default agent if not set
  useEffect(() => {
    if (!agentId && agents.length > 0) {
      setAgentId(agents[0].id);
    }
  }, [agentId, agents]);

  // Set default project if not set
  useEffect(() => {
    if (!projectPath && projects.length > 0) {
      setProjectPath(projects[0].path);
    }
  }, [projectPath, projects]);

  // Build schedule object
  const buildSchedule = (): TaskSchedule => {
    if (scheduleType === 'interval') {
      return { type: 'interval', intervalMinutes };
    }
    if (scheduleType === 'once') {
      return { type: 'once', executeAt: parseDateTimeLocal(executeAt) };
    }
    return { type: 'cron', cronExpression };
  };

  // Build model override object
  const buildModelOverride = (): ModelOverride | undefined => {
    if (!overrideModel || !selectedModelId) {
      return undefined;
    }
    return {
      versionId: selectedVersionId || undefined,
      modelId: selectedModelId,
    };
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      showError('请输入任务名称');
      return;
    }
    if (!agentId) {
      showError('请选择 Agent');
      return;
    }
    if (!projectPath) {
      showError('请选择项目路径');
      return;
    }
    if (!triggerMessage.trim()) {
      showError('请输入触发消息');
      return;
    }
    if (scheduleType === 'interval' && (!intervalMinutes || intervalMinutes < 1)) {
      showError('间隔时间必须大于 0');
      return;
    }
    if (scheduleType === 'cron' && !cronExpression.trim()) {
      showError('请输入 Cron 表达式');
      return;
    }
    if (scheduleType === 'once') {
      const executeTime = new Date(executeAt).getTime();
      if (isNaN(executeTime)) {
        showError('请选择有效的执行时间');
        return;
      }
      if (executeTime <= Date.now()) {
        showError('执行时间必须在未来');
        return;
      }
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        await updateTask.mutateAsync({
          taskId: task.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            agentId,
            projectPath,
            schedule: buildSchedule(),
            triggerMessage: triggerMessage.trim(),
            enabled,
            modelOverride: buildModelOverride(),
          },
        });
        showSuccess('任务已更新');
      } else {
        const data: CreateScheduledTaskRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          agentId,
          projectPath,
          schedule: buildSchedule(),
          triggerMessage: triggerMessage.trim(),
          enabled,
          modelOverride: buildModelOverride(),
        };
        await createTask.mutateAsync(data);
        showSuccess('任务已创建');
      }
      onSave();
    } catch (error) {
      showError(isEditing ? '更新失败' : '创建失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save and run
  const handleSaveAndRun = async () => {
    // Validation
    if (!name.trim()) {
      showError('请输入任务名称');
      return;
    }
    if (!agentId) {
      showError('请选择 Agent');
      return;
    }
    if (!projectPath) {
      showError('请选择项目路径');
      return;
    }
    if (!triggerMessage.trim()) {
      showError('请输入触发消息');
      return;
    }

    setIsRunning(true);

    try {
      let taskId: string;

      if (isEditing) {
        await updateTask.mutateAsync({
          taskId: task.id,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            agentId,
            projectPath,
            schedule: buildSchedule(),
            triggerMessage: triggerMessage.trim(),
            enabled,
            modelOverride: buildModelOverride(),
          },
        });
        taskId = task.id;
        showSuccess('任务已更新');
      } else {
        const data: CreateScheduledTaskRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          agentId,
          projectPath,
          schedule: buildSchedule(),
          triggerMessage: triggerMessage.trim(),
          enabled,
          modelOverride: buildModelOverride(),
        };
        const newTask = await createTask.mutateAsync(data);
        taskId = newTask.id;
        showSuccess('任务已创建');
      }

      // Now run the task
      await runTask.mutateAsync(taskId);
      showSuccess('任务已开始执行，请在执行历史中查看结果');
      onSave();
    } catch (error) {
      showError('操作失败');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? '编辑定时任务' : '创建定时任务'}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              配置 Agent 的自动执行计划
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            基本信息
          </h3>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              任务名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：每日代码检查"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              描述
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选的任务描述"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Agent & Project */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5" />
            执行配置
          </h3>

          {/* Agent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              执行 Agent *
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.ui?.icon || '🤖'} {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              项目路径 *
            </label>
            <select
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {projects.map((project) => (
                <option key={project.path} value={project.path}>
                  {project.name || project.path}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Agent 将在此项目目录下执行
            </p>
          </div>

          {/* Model Override */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  覆盖模型配置
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModel(!overrideModel)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  overrideModel ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    overrideModel ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {overrideModel && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  可以为定时任务指定不同于 Agent 默认的模型
                </p>

                {/* Version/Supplier Selection */}
                {claudeVersionsData?.versions && claudeVersionsData.versions.length > 1 && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      供应商
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        className="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">
                          {claudeVersionsData.defaultVersionId
                            ? `默认 (${claudeVersionsData.versions.find(v => v.id === claudeVersionsData.defaultVersionId)?.name})`
                            : '默认'
                          }
                        </option>
                        {claudeVersionsData.versions
                          .filter(v => v.id !== claudeVersionsData.defaultVersionId)
                          .map(version => (
                            <option key={version.id} value={version.id}>
                              {version.name}
                            </option>
                          ))
                        }
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Model Selection */}
                {availableModels.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      模型
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableModels.map(model => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setSelectedModelId(model.id)}
                          className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all ${
                            selectedModelId === model.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Cpu className="w-4 h-4 opacity-70" />
                            <span className="font-medium">{model.name}</span>
                          </div>
                          {model.isVision && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">
                              Vision
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            调度规则
          </h3>

          {/* Schedule Type */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="scheduleType"
                value="interval"
                checked={scheduleType === 'interval'}
                onChange={() => setScheduleType('interval')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">间隔执行</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="scheduleType"
                value="cron"
                checked={scheduleType === 'cron'}
                onChange={() => setScheduleType('cron')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">Cron 表达式</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="scheduleType"
                value="once"
                checked={scheduleType === 'once'}
                onChange={() => setScheduleType('once')}
                className="mr-2"
              />
              <span className="text-gray-700 dark:text-gray-300">仅执行一次</span>
            </label>
          </div>

          {/* Interval Input */}
          {scheduleType === 'interval' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                间隔时间（分钟）
              </label>
              <input
                type="number"
                min={1}
                max={10080}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                每隔 {intervalMinutes} 分钟执行一次
              </p>
            </div>
          )}

          {/* Cron Input */}
          {scheduleType === 'cron' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cron 表达式
              </label>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="*/30 * * * *"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {/* Presets */}
              <div className="mt-2 flex flex-wrap gap-2">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCronExpression(preset.value)}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      cronExpression === preset.value
                        ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* One-time execution Input */}
          {scheduleType === 'once' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                执行时间
              </label>
              <input
                type="datetime-local"
                value={executeAt}
                onChange={(e) => setExecuteAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                任务将在指定时间执行一次后自动禁用
              </p>
            </div>
          )}
        </div>

        {/* Trigger Message */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            触发消息
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              发送给 Agent 的消息 *
            </label>
            <textarea
              value={triggerMessage}
              onChange={(e) => setTriggerMessage(e.target.value)}
              placeholder="请检查代码质量并生成报告..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              定时触发时，这条消息会发送给选定的 Agent
            </p>
          </div>
        </div>

        {/* Enabled */}
        <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              启用任务
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              创建后立即开始调度
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                取消
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveAndRun}
                  disabled={isSaving || isRunning}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  title="保存任务并立即执行一次"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? '执行中...' : '保存并执行'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isRunning}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduledTaskEditor;
