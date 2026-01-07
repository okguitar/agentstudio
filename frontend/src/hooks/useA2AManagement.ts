import { useState, useEffect } from 'react';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/authFetch';
import { showError, showSuccess } from '../utils/toast';

export interface ApiKey {
  id: string;
  key: string | null;
  projectId: string;
  description: string;
  createdAt: string;
  lastUsed?: string;
  usageCount?: number;
}

export interface ExternalAgent {
  name: string;
  url: string;
  apiKey: string;
  description?: string;
  enabled: boolean;
}

export interface A2AConfig {
  allowedAgents: ExternalAgent[];
  taskTimeout: number;
  maxConcurrentTasks: number;
}

export interface AgentMapping {
  a2aAgentId: string;
  projectId: string;
  agentType: string;
  workingDirectory: string;
  createdAt: string;
}

export interface A2ATask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  input: any;
  output?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export const useA2AManagement = (project: { id: string; path: string }) => {
  const [loading, setLoading] = useState({
    mapping: true,
    card: true,
    keys: true,
    config: true,
    tasks: true
  });

  const [agentMapping, setAgentMapping] = useState<AgentMapping | null>(null);
  const [agentCard, setAgentCard] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [config, setConfig] = useState<A2AConfig | null>(null);
  const [tasks, setTasks] = useState<A2ATask[]>([]);

  // Fetch A2A agent mapping
  const fetchAgentMapping = async () => {
    try {
      setLoading(prev => ({ ...prev, mapping: true }));
      const response = await authFetch(`${API_BASE}/a2a/mapping/${encodeURIComponent(project.path)}`);
      if (response.ok) {
        const data = await response.json();
        setAgentMapping(data);
        return data;
      } else {
        console.error('Failed to fetch agent mapping');
        return null;
      }
    } catch (error) {
      console.error('Error fetching agent mapping:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, mapping: false }));
    }
  };

  // Fetch agent card
  const fetchAgentCard = async () => {
    try {
      setLoading(prev => ({ ...prev, card: true }));
      const response = await authFetch(`${API_BASE}/a2a/agent-card/${encodeURIComponent(project.path)}`);
      if (response.ok) {
        const data = await response.json();
        setAgentCard(data);
        return data;
      } else {
        console.error('Failed to fetch agent card');
        return null;
      }
    } catch (error) {
      console.error('Error fetching agent card:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, card: false }));
    }
  };

  // Initialize agent mapping and card
  useEffect(() => {
    const initializeAgent = async () => {
      const mapping = await fetchAgentMapping();
      if (mapping) {
        await fetchAgentCard();
      } else {
        setAgentCard(null);
      }
    };

    initializeAgent();
  }, [project.path]);

  // Fetch API keys
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        setLoading(prev => ({ ...prev, keys: true }));
        const response = await authFetch(`${API_BASE}/a2a/api-keys/${encodeURIComponent(project.path)}`);
        if (response.ok) {
          const data = await response.json();
          setApiKeys(data.apiKeys || []);
        } else {
          console.error('Failed to fetch API keys');
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
      } finally {
        setLoading(prev => ({ ...prev, keys: false }));
      }
    };

    fetchApiKeys();
  }, [project.id]);

  // Fetch A2A config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(prev => ({ ...prev, config: true }));
        const response = await authFetch(`${API_BASE}/a2a/config/${encodeURIComponent(project.path)}`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else if (response.status === 404) {
          // Config doesn't exist yet, create default
          const defaultConfig = {
            allowedAgents: [],
            taskTimeout: 300000,
            maxConcurrentTasks: 5
          };
          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setLoading(prev => ({ ...prev, config: false }));
      }
    };

    fetchConfig();
  }, [project.id]);

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(prev => ({ ...prev, tasks: true }));
        if (!agentMapping) return;

        const response = await authFetch(`${API_BASE}/a2a/tasks/${encodeURIComponent(project.path)}`);
        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(prev => ({ ...prev, tasks: false }));
      }
    };

    fetchTasks();
  }, [agentMapping]);

  // Create API key
  const createApiKey = async (description: string): Promise<ApiKey | null> => {
    try {
      const response = await authFetch(`${API_BASE}/a2a/api-keys/${encodeURIComponent(project.path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(prev => [data, ...prev]);
        showSuccess('API密钥创建成功');
        return data;
      } else {
        const error = await response.json();
        throw new Error(error.error || '创建失败');
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      showError('创建API密钥失败', error instanceof Error ? error.message : '未知错误');
      return null;
    }
  };

  // Delete API key
  const deleteApiKey = async (keyId: string): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/a2a/api-keys/${encodeURIComponent(project.path)}/${keyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
        showSuccess('API密钥删除成功');
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      showError('删除API密钥失败', error instanceof Error ? error.message : '未知错误');
      return false;
    }
  };

  // Update A2A config
  const updateConfig = async (newConfig: A2AConfig): Promise<boolean> => {
    try {
      const response = await authFetch(`${API_BASE}/a2a/config/${encodeURIComponent(project.path)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      if (response.ok) {
        setConfig(newConfig);
        showSuccess('A2A配置更新成功');
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error || '更新失败');
      }
    } catch (error) {
      console.error('Failed to update config:', error);
      showError('更新A2A配置失败', error instanceof Error ? error.message : '未知错误');
      return false;
    }
  };

  // Add external agent
  const addExternalAgent = async (agent: ExternalAgent): Promise<boolean> => {
    if (!config) return false;

    const newConfig = {
      ...config,
      allowedAgents: [...config.allowedAgents, agent]
    };

    return await updateConfig(newConfig);
  };

  // Remove external agent
  const removeExternalAgent = async (index: number): Promise<boolean> => {
    if (!config) return false;

    const newConfig = {
      ...config,
      allowedAgents: config.allowedAgents.filter((_, i) => i !== index)
    };

    return await updateConfig(newConfig);
  };

  // Update external agent
  const updateExternalAgent = async (index: number, agent: ExternalAgent): Promise<boolean> => {
    if (!config) return false;

    const newConfig = {
      ...config,
      allowedAgents: config.allowedAgents.map((a, i) => i === index ? agent : a)
    };

    return await updateConfig(newConfig);
  };

  // Toggle external agent status
  const toggleExternalAgent = async (index: number): Promise<boolean> => {
    if (!config) return false;

    const agent = config.allowedAgents[index];
    return await updateExternalAgent(index, { ...agent, enabled: !agent.enabled });
  };

  // Cancel task
  const cancelTask = async (taskId: string): Promise<boolean> => {
    if (!agentMapping) return false;

    try {
      const response = await authFetch(`${API_BASE}/a2a/tasks/${encodeURIComponent(project.path)}/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTasks(prev => prev.map(task =>
          task.id === taskId
            ? { ...task, status: 'canceled', completedAt: new Date().toISOString() }
            : task
        ));
        showSuccess('任务已取消');
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error || '取消失败');
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
      showError('取消任务失败', error instanceof Error ? error.message : '未知错误');
      return false;
    }
  };

  // Refresh tasks
  const refreshTasks = async () => {
    if (!agentMapping) return;

    try {
      setLoading(prev => ({ ...prev, tasks: true }));
      const response = await authFetch(`${API_BASE}/a2a/tasks/${encodeURIComponent(project.path)}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }));
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('已复制到剪贴板');
      return true;
    } catch (error) {
      showError('复制失败');
      return false;
    }
  };

  // Validate external agent URL
  const validateAgentUrl = (url: string): { valid: boolean; error?: string } => {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL必须使用HTTP或HTTPS协议' };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: '无效的URL格式' };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // Import projects as external agents
  const importProjects = async (projectPaths: string[]): Promise<{
    successfulImports: Array<{ projectPath: string; agentName: string }>;
    failedImports: Array<{ projectPath: string; error: string }>;
    totalRequested: number;
    totalSuccess: number;
    totalFailed: number;
  } | null> => {
    try {
      const response = await authFetch(`${API_BASE}/a2a/import-projects/${encodeURIComponent(project.path)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPaths })
      });

      if (response.ok) {
        const result = await response.json();

        // Refresh config to show newly imported agents
        const configResponse = await authFetch(`${API_BASE}/a2a/config/${encodeURIComponent(project.path)}`);
        if (configResponse.ok) {
          const data = await configResponse.json();
          setConfig(data);
        }

        if (result.totalSuccess > 0) {
          showSuccess(`成功导入 ${result.totalSuccess} 个项目`);
        }
        if (result.totalFailed > 0) {
          showError(`${result.totalFailed} 个项目导入失败`);
        }

        return result;
      } else {
        const error = await response.json();
        throw new Error(error.error || '导入失败');
      }
    } catch (error) {
      console.error('Failed to import projects:', error);
      showError('导入项目失败', error instanceof Error ? error.message : '未知错误');
      return null;
    }
  };

  return {
    // State
    loading,
    agentMapping,
    agentCard,
    apiKeys,
    config,
    tasks,

    // Actions
    fetchAgentMapping,
    fetchAgentCard,
    createApiKey,
    deleteApiKey,
    updateConfig,
    addExternalAgent,
    removeExternalAgent,
    updateExternalAgent,
    toggleExternalAgent,
    cancelTask,
    refreshTasks,
    copyToClipboard,
    importProjects,

    // Utilities
    validateAgentUrl,
    formatDate
  };
};