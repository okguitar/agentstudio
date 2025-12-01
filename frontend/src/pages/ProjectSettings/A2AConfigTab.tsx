import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Power,
  Eye,
  EyeOff,
  Network
} from 'lucide-react';
import {
  useA2AConfig,
  useUpdateA2AConfig,
  useAddAllowedAgent,
  useRemoveAllowedAgent,
  useToggleAllowedAgent,
  type AllowedAgent
} from '../../hooks/useA2AConfig';

interface A2AConfigTabProps {
  projectId: string;
}

/**
 * A2A Configuration Tab Component
 *
 * Provides UI for managing project-level A2A configuration:
 * - View/add/remove allowed external agents
 * - Configure task timeout and max concurrent tasks
 * - Enable/disable agents
 * - Display API keys (masked)
 */
export const A2AConfigTab: React.FC<A2AConfigTabProps> = ({ projectId }) => {
  const { t } = useTranslation();

  // React Query hooks
  const { data: config, isLoading, error } = useA2AConfig(projectId);
  const updateConfig = useUpdateA2AConfig();
  const addAgent = useAddAllowedAgent();
  const removeAgent = useRemoveAllowedAgent();
  const toggleAgent = useToggleAllowedAgent();

  // Local state
  const [taskTimeout, setTaskTimeout] = useState<number>(300000);
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState<number>(5);
  const [showAddAgentForm, setShowAddAgentForm] = useState(false);
  const [newAgent, setNewAgent] = useState<Partial<AllowedAgent>>({
    name: '',
    url: '',
    apiKey: '',
    description: '',
    enabled: true
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  // Update local state when config loads
  React.useEffect(() => {
    if (config) {
      setTaskTimeout(config.taskTimeout);
      setMaxConcurrentTasks(config.maxConcurrentTasks);
    }
  }, [config]);

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!config) return;

    try {
      await updateConfig.mutateAsync({
        projectId,
        config: {
          ...config,
          taskTimeout,
          maxConcurrentTasks
        }
      });
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Handle add agent
  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.url || !newAgent.apiKey) {
      return;
    }

    try {
      await addAgent.mutateAsync({
        projectId,
        agent: newAgent as AllowedAgent
      });

      // Reset form
      setNewAgent({
        name: '',
        url: '',
        apiKey: '',
        description: '',
        enabled: true
      });
      setShowAddAgentForm(false);
    } catch (err) {
      console.error('Failed to add agent:', err);
    }
  };

  // Handle remove agent
  const handleRemoveAgent = async (agentUrl: string) => {
    try {
      await removeAgent.mutateAsync({
        projectId,
        agentUrl
      });
    } catch (err) {
      console.error('Failed to remove agent:', err);
    }
  };

  // Handle toggle agent
  const handleToggleAgent = async (agentUrl: string, enabled: boolean) => {
    try {
      await toggleAgent.mutateAsync({
        projectId,
        agentUrl,
        enabled
      });
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (agentUrl: string) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [agentUrl]: !prev[agentUrl]
    }));
  };

  // Mask API key
  const maskApiKey = (apiKey: string): string => {
    if (apiKey.length <= 12) {
      return '***...***';
    }

    const start = apiKey.substring(0, 8);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
              {t('a2aConfig.errorLoading', 'Failed to load A2A configuration')}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Network className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t('a2aConfig.title', 'A2A Configuration')}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t(
              'a2aConfig.description',
              'Manage external agents and A2A protocol settings for this project'
            )}
          </p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('a2aConfig.settings', 'General Settings')}
        </h3>

        <div className="space-y-4">
          {/* Task Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('a2aConfig.taskTimeout', 'Task Timeout (ms)')}
            </label>
            <input
              type="number"
              value={taskTimeout}
              onChange={(e) => setTaskTimeout(parseInt(e.target.value, 10))}
              min={1000}
              max={1800000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t(
                'a2aConfig.taskTimeoutHelp',
                'Maximum time for task execution (1 second to 30 minutes)'
              )}
            </p>
          </div>

          {/* Max Concurrent Tasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('a2aConfig.maxConcurrentTasks', 'Max Concurrent Tasks')}
            </label>
            <input
              type="number"
              value={maxConcurrentTasks}
              onChange={(e) => setMaxConcurrentTasks(parseInt(e.target.value, 10))}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('a2aConfig.maxConcurrentTasksHelp', 'Maximum number of tasks running simultaneously (1-50)')}
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={updateConfig.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {t('a2aConfig.saveSettings', 'Save Settings')}
          </button>

          {updateConfig.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              {t('a2aConfig.saved', 'Settings saved successfully')}
            </div>
          )}
        </div>
      </div>

      {/* Allowed Agents Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('a2aConfig.allowedAgents', 'Allowed External Agents')}
          </h3>
          <button
            onClick={() => setShowAddAgentForm(!showAddAgentForm)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            {t('a2aConfig.addAgent', 'Add Agent')}
          </button>
        </div>

        {/* Add Agent Form */}
        {showAddAgentForm && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {t('a2aConfig.newAgent', 'New External Agent')}
            </h4>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('a2aConfig.agentName', 'Agent Name')}
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />

              <input
                type="url"
                placeholder={t('a2aConfig.agentUrl', 'Agent URL (https://...)')}
                value={newAgent.url}
                onChange={(e) => setNewAgent({ ...newAgent, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />

              <input
                type="password"
                placeholder={t('a2aConfig.apiKey', 'API Key')}
                value={newAgent.apiKey}
                onChange={(e) => setNewAgent({ ...newAgent, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />

              <input
                type="text"
                placeholder={t('a2aConfig.description', 'Description (optional)')}
                value={newAgent.description}
                onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddAgentForm(false);
                    setNewAgent({
                      name: '',
                      url: '',
                      apiKey: '',
                      description: '',
                      enabled: true
                    });
                  }}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  {t('a2aConfig.cancel', 'Cancel')}
                </button>

                <button
                  onClick={handleAddAgent}
                  disabled={!newAgent.name || !newAgent.url || !newAgent.apiKey || addAgent.isPending}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {addAgent.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('a2aConfig.add', 'Add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent List */}
        {config?.allowedAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {t('a2aConfig.noAgents', 'No external agents configured. Add one to get started.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {config?.allowedAgents.map((agent) => (
              <div
                key={agent.url}
                className={`p-4 rounded-lg border ${
                  agent.enabled
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-600 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {agent.name}
                      </h4>
                      {agent.enabled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <Power className="w-3 h-3" />
                          {t('a2aConfig.enabled', 'Enabled')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <Power className="w-3 h-3" />
                          {t('a2aConfig.disabled', 'Disabled')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                      <ExternalLink className="w-3 h-3" />
                      <span className="font-mono truncate">{agent.url}</span>
                    </div>

                    {agent.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {agent.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('a2aConfig.apiKey', 'API Key')}:
                      </span>
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-300">
                        {showApiKeys[agent.url] ? agent.apiKey : maskApiKey(agent.apiKey)}
                      </code>
                      <button
                        onClick={() => toggleApiKeyVisibility(agent.url)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        aria-label={
                          showApiKeys[agent.url]
                            ? t('a2aConfig.hideKey', 'Hide key')
                            : t('a2aConfig.showKey', 'Show key')
                        }
                      >
                        {showApiKeys[agent.url] ? (
                          <EyeOff className="w-3 h-3 text-gray-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleAgent(agent.url, !agent.enabled)}
                      disabled={toggleAgent.isPending}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label={
                        agent.enabled
                          ? t('a2aConfig.disable', 'Disable agent')
                          : t('a2aConfig.enable', 'Enable agent')
                      }
                    >
                      <Power
                        className={`w-4 h-4 ${
                          agent.enabled ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => handleRemoveAgent(agent.url)}
                      disabled={removeAgent.isPending}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      aria-label={t('a2aConfig.remove', 'Remove agent')}
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default A2AConfigTab;
