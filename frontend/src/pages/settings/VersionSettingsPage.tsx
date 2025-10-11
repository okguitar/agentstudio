import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../../lib/config';
import { authFetch } from '../../lib/authFetch';
import { showError, showSuccess } from '../../utils/toast';
import {
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Terminal,
  Plus,
  Edit,
  Trash2,
  Star,
  StarOff,
  Settings,
  Save,
  X,
  FolderOpen,
  Sparkles,
  ExternalLink,
  Copy,
  Eye,
  Rocket
} from 'lucide-react';
import { useClaudeVersions, useCreateClaudeVersion, useUpdateClaudeVersion, useDeleteClaudeVersion, useSetDefaultClaudeVersion } from '../../hooks/useClaudeVersions';
import { ClaudeVersion, ClaudeVersionCreate, ClaudeVersionUpdate, ModelConfig } from '@agentstudio/shared/types/claude-versions';
import { FileBrowser } from '../../components/FileBrowser';
import { VERSION_TEMPLATES, type VersionTemplate } from '../../types/versionTemplates';
import { generateClaudeCommand, copyToClipboard } from '../../utils/commandGenerator';
import { useBackendServices } from '../../hooks/useBackendServices';
import { resetClaudeSetup } from '../../utils/onboardingStorage';

export const VersionSettingsPage: React.FC = () => {
  const { t } = useTranslation('pages');
  const { currentServiceId } = useBackendServices();
  // 系统版本检查相关状态
  const [versions, setVersions] = useState<any>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isUpdatingClaude, setIsUpdatingClaude] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  
  // Claude版本管理相关状态
  const [isCreating, setIsCreating] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ClaudeVersion | null>(null);
  const [formData, setFormData] = useState<Partial<ClaudeVersionCreate>>({
    name: '',
    alias: '',
    description: '',
    executablePath: '',
    environmentVariables: {},
    models: []
  });
  const [envVarInput, setEnvVarInput] = useState({ key: '', value: '' });
  const [modelInput, setModelInput] = useState({ id: '', name: '', isVision: false });
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [currentTemplateTokenUrl, setCurrentTemplateTokenUrl] = useState<string | null>(null);
  
  // Claude版本数据和操作
  const { data: claudeVersionsData, isLoading: isLoadingClaudeVersions } = useClaudeVersions();
  const createClaudeVersion = useCreateClaudeVersion();
  const updateClaudeVersion = useUpdateClaudeVersion();
  const deleteClaudeVersion = useDeleteClaudeVersion();
  const setDefaultClaudeVersion = useSetDefaultClaudeVersion();

  // Load versions on component mount
  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setIsLoadingVersions(true);
    setUpdateResult(null);
    try {
      const response = await authFetch(`${API_BASE}/settings/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      } else {
        throw new Error('Failed to load versions');
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      setVersions({
        nodejs: 'Error',
        npm: 'Error',
        claudeCode: 'Error',
        lastChecked: new Date().toISOString()
      });
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const updateClaudeCode = async () => {
    setIsUpdatingClaude(true);
    setUpdateResult(null);
    try {
      const response = await authFetch(`${API_BASE}/settings/update-claude`, {
        method: 'POST'
      });
      const result = await response.json();

      setUpdateResult(result);

      // Reload versions after update
      if (result.success) {
        setTimeout(() => {
          loadVersions();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to update Claude Code:', error);
      setUpdateResult({
        success: false,
        error: 'Network error',
        message: 'Failed to connect to server'
      });
    } finally {
      setIsUpdatingClaude(false);
    }
  };

  // Claude版本管理处理函数
  const resetForm = () => {
    setFormData({
      name: '',
      alias: '',
      description: '',
      executablePath: '',
      environmentVariables: {},
      models: []
    });
    setEnvVarInput({ key: '', value: '' });
    setModelInput({ id: '', name: '', isVision: false });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingVersion(null);
    resetForm();
  };

  const handleQuickCreateWithTemplate = (template: VersionTemplate) => {
    // 先打开创建表单
    setIsCreating(true);
    setEditingVersion(null);
    resetForm();

    // 然后应用模板
    setTimeout(() => {
      handleApplyTemplate(template);
    }, 0);
  };

  const handleApplyTemplate = (template: VersionTemplate) => {
    // 自动填充所有字段
    const envVars: Record<string, string> = {};
    template.envVars.forEach(envVar => {
      // 所有环境变量都添加，包括空值的必填字段
      envVars[envVar.key] = envVar.value;
    });

    // 使用i18n获取翻译后的名称和描述
    const translatedName = t(`settings.version.templates.providers.${template.id}.name`);
    const translatedDescription = t(`settings.version.templates.providers.${template.id}.description`);

    setFormData(prev => ({
      ...prev,
      name: translatedName,
      alias: template.alias,
      description: translatedDescription,
      environmentVariables: envVars,
      models: template.models || [] // 应用模板的模型配置
    }));

    // 保存模板的 token URL
    setCurrentTemplateTokenUrl(template.apiTokenUrl || null);
  };

  const handleEdit = (version: ClaudeVersion) => {
    setEditingVersion(version);
    setIsCreating(false);
    setFormData({
      name: version.name,
      alias: version.alias,
      description: version.description || '',
      executablePath: version.executablePath,
      environmentVariables: version.environmentVariables || {},
      models: version.models || []
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingVersion(null);
    resetForm();
  };

  const handleReinitializeSetup = () => {
    if (currentServiceId) {
      resetClaudeSetup(currentServiceId);
      showSuccess(t('settings.version.reinitializeSuccess'));
      // Reload page to trigger the setup wizard
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const addEnvironmentVariable = () => {
    if (envVarInput.key && envVarInput.value) {
      setFormData(prev => ({
        ...prev,
        environmentVariables: {
          ...prev.environmentVariables,
          [envVarInput.key]: envVarInput.value
        }
      }));
      setEnvVarInput({ key: '', value: '' });
    }
  };

  // 模型管理函数
  const addModel = () => {
    if (modelInput.id && modelInput.name) {
      setFormData(prev => ({
        ...prev,
        models: [
          ...(prev.models || []),
          {
            id: modelInput.id,
            name: modelInput.name,
            isVision: modelInput.isVision,
            description: modelInput.name // 使用名称作为默认描述
          }
        ]
      }));
      setModelInput({ id: '', name: '', isVision: false });
    }
  };

  const removeModel = (modelId: string) => {
    setFormData(prev => ({
      ...prev,
      models: (prev.models || []).filter(model => model.id !== modelId)
    }));
  };

  const updateModel = (modelId: string, updates: Partial<ModelConfig>) => {
    setFormData(prev => ({
      ...prev,
      models: (prev.models || []).map(model =>
        model.id === modelId ? { ...model, ...updates } : model
      )
    }));
  };

  const removeEnvironmentVariable = (key: string) => {
    setFormData(prev => {
      if (!prev.environmentVariables) {
        return prev;
      }

      const newEnvVars = { ...prev.environmentVariables };
      delete newEnvVars[key];

      return {
        ...prev,
        environmentVariables: newEnvVars
      };
    });
  };

  const selectExecutablePath = () => {
    setShowFileBrowser(true);
  };

  const handleFileSelect = (path: string, isDirectory: boolean) => {
    if (!isDirectory) {
      setFormData(prev => ({
        ...prev,
        executablePath: path
      }));
    }
    setShowFileBrowser(false);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.alias) {
        showError(t('settings.version.errors.requiredFields'));
        return;
      }

      // 将空字符串转换为 undefined，以便正确删除字段
      const dataToSave: ClaudeVersionUpdate | ClaudeVersionCreate = {
        ...formData,
        executablePath: formData.executablePath?.trim() || undefined,
        description: formData.description?.trim() || undefined,
      };

      if (editingVersion) {
        // 更新现有版本
        await updateClaudeVersion.mutateAsync({
          id: editingVersion.id,
          data: dataToSave as ClaudeVersionUpdate
        });
        showSuccess(t('settings.version.success.updateVersion'));
      } else {
        // 创建新版本
        await createClaudeVersion.mutateAsync(dataToSave as ClaudeVersionCreate);
        showSuccess(t('settings.version.success.createVersion'));
      }

      handleCancel();
    } catch (error) {
      console.error('Error saving version:', error);
      showError(t('settings.version.errors.saveFailed'), error instanceof Error ? error.message : undefined);
    }
  };

  const handleDelete = async (version: ClaudeVersion) => {
    if (version.isSystem) {
      showError(t('settings.version.errors.cannotDeleteSystem'));
      return;
    }

    if (confirm(t('settings.version.confirmDelete', { alias: version.alias }))) {
      try {
        await deleteClaudeVersion.mutateAsync(version.id);
        showSuccess(t('settings.version.success.deleteVersion'));
      } catch (error) {
        console.error('Error deleting version:', error);
        showError(t('settings.version.errors.deleteFailed'), error instanceof Error ? error.message : undefined);
      }
    }
  };

  const handleSetDefault = async (version: ClaudeVersion) => {
    try {
      await setDefaultClaudeVersion.mutateAsync(version.id);
      showSuccess(t('settings.version.success.setDefault', { alias: version.alias }));
    } catch (error) {
      console.error('Error setting default version:', error);
      showError(t('settings.version.errors.setDefaultFailed'), error instanceof Error ? error.message : undefined);
    }
  };

  const handleCopyCommand = async (version: ClaudeVersion) => {
    try {
      const command = generateClaudeCommand(version);
      const success = await copyToClipboard(command);

      if (success) {
        showSuccess(t('settings.version.success.copyCommand'));
      } else {
        // 如果复制失败，显示命令让用户手动复制
        showError(t('settings.version.errors.copyFailed'), command);
      }
    } catch (error) {
      console.error('Error copying command:', error);
      showError(t('settings.version.errors.copyFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('settings.version.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400">{t('settings.version.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* 快捷模板按钮 */}
          {VERSION_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => handleQuickCreateWithTemplate(template)}
              className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                       hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200 group"
              title={t(`settings.version.templates.providers.${template.id}.description`)}
            >
              {template.logoUrl && (
                <img
                  src={template.logoUrl}
                  alt={template.name}
                  className="w-5 h-5 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="text-sm font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400">
                {t(`settings.version.templates.providers.${template.id}.name`)}
              </span>
            </button>
          ))}

          {/* 添加版本按钮 */}
          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('settings.version.addVersion')}</span>
          </button>

          {/* 重新初始化按钮 */}
          <button
            onClick={handleReinitializeSetup}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            title={t('settings.version.reinitializeTitle')}
          >
            <Rocket className="w-4 h-4" />
            <span>{t('settings.version.reinitialize')}</span>
          </button>
        </div>
      </div>

      {/* 隐藏原有的当前版本功能 */}
      {false && (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* Header with refresh button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('settings.version.currentVersion.title')}</h3>
            <div className="flex space-x-2">
              <button
                onClick={loadVersions}
                disabled={isLoadingVersions}
                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingVersions ? 'animate-spin' : ''}`} />
                <span>{isLoadingVersions ? t('settings.version.currentVersion.checking') : t('settings.version.currentVersion.checkVersion')}</span>
              </button>
            </div>
          </div>

          {/* Version display */}
          {versions ? (
            <div className="space-y-4">
              {/* Claude Code */}
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Terminal className="w-8 h-8 text-blue-600" />
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Claude Code</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.version.currentVersion.claudeDesc')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {versions.claudeCode === 'Not installed' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <span className="font-mono text-sm">{versions.claudeCode}</span>
                  </div>
                  {versions.claudeCode !== 'Not installed' && versions.claudeCode !== 'Error' && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={updateClaudeCode}
                        disabled={isUpdatingClaude || !versions.preferredManager}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Download className={`w-3 h-3 ${isUpdatingClaude ? 'animate-spin' : ''}`} />
                        <span>{isUpdatingClaude ? t('settings.version.currentVersion.updating') : t('settings.version.currentVersion.update')}</span>
                      </button>
                      {versions.preferredManager && (
                        <div className="text-xs text-gray-500">
                          {t('settings.version.currentVersion.willUse')} <span className="font-mono">{versions.preferredManager}</span> {t('settings.version.currentVersion.toUpdate')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Node.js */}
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">JS</span>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Node.js</h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.version.currentVersion.nodejsDesc')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {versions.nodejs === 'Not found' || versions.nodejs === 'Error' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <span className="font-mono text-sm">{versions.nodejs}</span>
                  </div>
                </div>
              </div>

              {/* Package Managers */}
              {versions.packageManagers && Object.entries(versions.packageManagers).map(([manager, version]) => {
                const isInstalled = version !== 'Not installed' && version !== 'Error';
                const isPreferred = versions.preferredManager === manager;
                
                const getManagerIcon = (mgr: string) => {
                  switch (mgr) {
                    case 'npm':
                      return { bg: 'bg-red-100', text: 'text-red-600', label: 'npm' };
                    case 'pnpm':
                      return { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'pnpm' };
                    case 'yarn':
                      return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'yarn' };
                    default:
                      return { bg: 'bg-gray-100', text: 'text-gray-600', label: mgr };
                  }
                };

                const icon = getManagerIcon(manager);

                return (
                  <div key={manager} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${icon.bg} rounded-lg flex items-center justify-center`}>
                        <span className={`${icon.text} font-bold text-xs`}>{icon.label}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900 dark:text-white">{manager}</h5>
                          {isPreferred && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                              {t('settings.version.currentVersion.preferred')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.version.currentVersion.packageManager')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {isInstalled ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-mono text-sm">{version as string}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Last checked */}
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('settings.version.currentVersion.lastChecked')}: {new Date(versions.lastChecked).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Terminal className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>{t('settings.version.currentVersion.clickToCheck')}</p>
              </div>
            </div>
          )}

          {/* Update result */}
          {updateResult && (
            <div className={`p-4 rounded-lg ${updateResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start space-x-2">
                {updateResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h6 className={`font-medium ${updateResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {updateResult.success ? t('settings.version.currentVersion.updateSuccess') : t('settings.version.currentVersion.updateFailed')}
                  </h6>
                  <p className={`text-sm mt-1 ${updateResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {updateResult.message}
                  </p>
                  {updateResult.output && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-auto max-h-32">
                      {updateResult.output}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• {t('settings.version.currentVersion.info1')}</p>
            <p>• {t('settings.version.currentVersion.info2')}</p>
            <p>• {t('settings.version.currentVersion.info3')}</p>
            <p>• {t('settings.version.currentVersion.info4')}</p>
            <p>• {t('settings.version.currentVersion.info5')}</p>
          </div>
        </div>
      </div>
      )}

      {/* Claude版本管理 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">

          {/* 版本列表 */}
          {isLoadingClaudeVersions ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : claudeVersionsData?.versions && claudeVersionsData.versions.length > 0 ? (
            <div className="space-y-3">
              {claudeVersionsData.versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg ${
                    version.id === claudeVersionsData.defaultVersionId
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                          <span>{version.name}</span>
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({version.alias})</span>
                          {version.isSystem && (
                            <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">{t('settings.version.systemLabel')}</span>
                          )}
                          {version.id === claudeVersionsData.defaultVersionId && (
                            <span className="px-2 py-1 text-xs bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-200 rounded flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>{t('settings.version.defaultLabel')}</span>
                            </span>
                          )}
                        </h4>
                      </div>
                      {version.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{version.description}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-medium">{t('settings.version.pathLabel')}:</span> {version.executablePath}
                      </p>
                      {version.environmentVariables && Object.keys(version.environmentVariables).length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.version.envVarsLabel')}:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(version.environmentVariables).map(([key, value]) => (
                              <span
                                key={key}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {key}={value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {version.models && version.models.length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.version.modelsLabel')}:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {version.models.map(model => (
                              <span
                                key={model.id}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded flex items-center space-x-1"
                              >
                                <span>{model.name}</span>
                                {model.isVision && (
                                  <Eye className="w-3 h-3" />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyCommand(version)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        title={t('settings.version.copyCommand')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {version.id !== claudeVersionsData.defaultVersionId && (
                        <button
                          onClick={() => handleSetDefault(version)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                          title={t('settings.version.setAsDefault')}
                        >
                          <StarOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(version)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title={t('settings.version.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!version.isSystem && (
                        <button
                          onClick={() => handleDelete(version)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title={t('settings.version.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>{t('settings.version.noVersions')}</p>
              <p className="text-sm">{t('settings.version.clickToAddFirst')}</p>
            </div>
          )}

        </div>
      </div>

      {/* 创建/编辑版本模态窗口 */}
      {(isCreating || editingVersion) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingVersion ? t('settings.version.form.editTitle') : t('settings.version.form.createTitle')}
                </h3>
                {editingVersion?.isSystem && (
                  <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                    {t('settings.version.systemLabel')}
                  </span>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* 系统版本提示 */}
                {editingVersion?.isSystem && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        系统版本编辑
                      </h4>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                      系统版本是自动检测的 Claude Code 版本，某些字段（如可执行路径）无法修改，但您可以配置支持的模型。
                    </p>
                  </div>
                )}

                {/* 配置模板选择 - 只在新建时显示 */}
                {isCreating && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300">
                        {t('settings.version.templates.title')}
                      </h4>
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-400 mb-3">
                      {t('settings.version.templates.description')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {VERSION_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleApplyTemplate(template)}
                          className="p-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700
                                   hover:border-purple-400 dark:hover:border-purple-500 rounded-md text-left
                                   transition-all duration-200 group"
                        >
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                              {template.logoUrl && (
                                <img
                                  src={template.logoUrl}
                                  alt={template.name}
                                  className="w-6 h-6 flex-shrink-0"
                                  onError={(e) => {
                                    // Fallback to Sparkles icon if logo fails to load
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <h5 className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                {t(`settings.version.templates.providers.${template.id}.name`)}
                              </h5>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {t(`settings.version.templates.providers.${template.id}.description`)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.version.form.versionName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('settings.version.form.versionNamePlaceholder')}
                      disabled={editingVersion?.isSystem}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.version.form.alias')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.alias || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('settings.version.form.aliasPlaceholder')}
                      disabled={editingVersion?.isSystem}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.version.form.description')}</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('settings.version.form.descriptionPlaceholder')}
                    disabled={editingVersion?.isSystem}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.version.form.executablePath')}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.executablePath || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, executablePath: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('settings.version.form.executablePathPlaceholder')}
                      disabled={editingVersion?.isSystem}
                    />
                    <button
                      onClick={selectExecutablePath}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      title={t('settings.version.form.browseFile')}
                      disabled={editingVersion?.isSystem}
                    >
                      <FolderOpen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* 模型配置 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.version.form.models')}</label>
                  <div className="space-y-3">
                    {/* 现有模型 */}
                    {formData.models && formData.models.length > 0 && (
                      <div className="space-y-2">
                        {formData.models.map(model => (
                          <div key={model.id} className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={model.id}
                                onChange={(e) => updateModel(model.id, { id: e.target.value })}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('settings.version.form.modelId')}
                              />
                              <input
                                type="text"
                                value={model.name}
                                onChange={(e) => updateModel(model.id, { name: e.target.value })}
                                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={t('settings.version.form.modelName')}
                              />
                              <div className="flex items-center space-x-2">
                                <label className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={model.isVision}
                                    onChange={(e) => updateModel(model.id, { isVision: e.target.checked })}
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{t('settings.version.form.visionModel')}</span>
                                </label>
                                {model.isVision && (
                                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeModel(model.id)}
                              className="p-1 text-red-500 hover:text-red-700 rounded flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 添加新模型 */}
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={modelInput.id}
                        onChange={(e) => setModelInput(prev => ({ ...prev, id: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('settings.version.form.modelId')}
                      />
                      <input
                        type="text"
                        value={modelInput.name}
                        onChange={(e) => setModelInput(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('settings.version.form.modelName')}
                      />
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-1 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={modelInput.isVision}
                            onChange={(e) => setModelInput(prev => ({ ...prev, isVision: e.target.checked }))}
                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{t('settings.version.form.visionModel')}</span>
                        </label>
                        <button
                          onClick={addModel}
                          disabled={!modelInput.id || !modelInput.name}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{t('settings.version.form.addModel')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 环境变量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.version.form.envVars')}</label>
                  <div className="space-y-3">
                    {/* 现有环境变量 */}
                    {formData.environmentVariables && Object.keys(formData.environmentVariables).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(formData.environmentVariables).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex-1 flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                {key} =
                              </span>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => {
                                  const newValue = e.target.value;
                                  setFormData(prev => ({
                                    ...prev,
                                    environmentVariables: {
                                      ...prev.environmentVariables,
                                      [key]: newValue
                                    }
                                  }));
                                }}
                                placeholder={t('settings.version.form.emptyValue')}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              {key === 'ANTHROPIC_AUTH_TOKEN' && currentTemplateTokenUrl && !value && (
                                <a
                                  href={currentTemplateTokenUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{t('settings.version.form.getApiKey')}</span>
                                </a>
                              )}
                            </div>
                            <button
                              onClick={() => removeEnvironmentVariable(key)}
                              className="p-1 text-red-500 hover:text-red-700 rounded flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 添加新环境变量 */}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={envVarInput.key}
                        onChange={(e) => setEnvVarInput(prev => ({ ...prev, key: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('settings.version.form.varName')}
                      />
                      <input
                        type="text"
                        value={envVarInput.value}
                        onChange={(e) => setEnvVarInput(prev => ({ ...prev, value: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={t('settings.version.form.varValue')}
                      />
                      <button
                        onClick={addEnvironmentVariable}
                        disabled={!envVarInput.key || !envVarInput.value}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {t('settings.version.form.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={createClaudeVersion.isPending || updateClaudeVersion.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {createClaudeVersion.isPending || updateClaudeVersion.isPending
                    ? t('settings.version.form.saving')
                    : editingVersion
                    ? t('settings.version.form.update')
                    : t('settings.version.form.create')
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FileBrowser 组件 */}
      {showFileBrowser && (
        <FileBrowser
          title={t('settings.version.form.selectExecutable')}
          allowFiles={true}
          allowDirectories={false}
          onSelect={handleFileSelect}
          onClose={() => setShowFileBrowser(false)}
        />
      )}
    </div>
  );
};