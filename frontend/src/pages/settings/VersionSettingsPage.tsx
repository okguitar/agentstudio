import React, { useState, useEffect } from 'react';
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
  FolderOpen
} from 'lucide-react';
import { useClaudeVersions, useCreateClaudeVersion, useUpdateClaudeVersion, useDeleteClaudeVersion, useSetDefaultClaudeVersion } from '../../hooks/useClaudeVersions';
import { ClaudeVersion, ClaudeVersionCreate, ClaudeVersionUpdate } from '../../../../shared/types/claude-versions';
import { FileBrowser } from '../../components/FileBrowser';

export const VersionSettingsPage: React.FC = () => {
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
    environmentVariables: {}
  });
  const [envVarInput, setEnvVarInput] = useState({ key: '', value: '' });
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  
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
      const response = await fetch('/api/settings/versions');
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
      const response = await fetch('/api/settings/update-claude', {
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
      environmentVariables: {}
    });
    setEnvVarInput({ key: '', value: '' });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingVersion(null);
    resetForm();
  };

  const handleEdit = (version: ClaudeVersion) => {
    setEditingVersion(version);
    setIsCreating(false);
    setFormData({
      name: version.name,
      alias: version.alias,
      description: version.description || '',
      executablePath: version.executablePath,
      environmentVariables: version.environmentVariables || {}
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingVersion(null);
    resetForm();
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

  const removeEnvironmentVariable = (key: string) => {
    setFormData(prev => ({
      ...prev,
      environmentVariables: {
        ...prev.environmentVariables
      }
    }));
    // Remove the key
    if (formData.environmentVariables) {
      const newEnvVars = { ...formData.environmentVariables };
      delete newEnvVars[key];
      setFormData(prev => ({
        ...prev,
        environmentVariables: newEnvVars
      }));
    }
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
      if (!formData.name || !formData.alias || !formData.executablePath) {
        alert('请填写所有必填字段');
        return;
      }

      if (editingVersion) {
        // 更新现有版本
        await updateClaudeVersion.mutateAsync({
          id: editingVersion.id,
          data: formData as ClaudeVersionUpdate
        });
        alert('版本更新成功');
      } else {
        // 创建新版本
        await createClaudeVersion.mutateAsync(formData as ClaudeVersionCreate);
        alert('版本创建成功');
      }
      
      handleCancel();
    } catch (error) {
      console.error('Error saving version:', error);
      alert(error instanceof Error ? error.message : '保存失败');
    }
  };

  const handleDelete = async (version: ClaudeVersion) => {
    if (version.isSystem) {
      alert('不能删除系统版本');
      return;
    }

    if (confirm(`确定要删除版本 "${version.alias}" 吗？`)) {
      try {
        await deleteClaudeVersion.mutateAsync(version.id);
        alert('版本删除成功');
      } catch (error) {
        console.error('Error deleting version:', error);
        alert(error instanceof Error ? error.message : '删除失败');
      }
    }
  };

  const handleSetDefault = async (version: ClaudeVersion) => {
    try {
      await setDefaultClaudeVersion.mutateAsync(version.id);
      alert(`已将 "${version.alias}" 设置为默认版本`);
    } catch (error) {
      console.error('Error setting default version:', error);
      alert(error instanceof Error ? error.message : '设置默认版本失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">版本管理</h2>
          <p className="text-gray-600">管理多个 Claude Code 版本，指定可执行路径、别名和环境变量</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>添加版本</span>
        </button>
      </div>

      {/* 隐藏原有的当前版本功能 */}
      {false && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Header with refresh button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">当前版本</h3>
            <div className="flex space-x-2">
              <button
                onClick={loadVersions}
                disabled={isLoadingVersions}
                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingVersions ? 'animate-spin' : ''}`} />
                <span>{isLoadingVersions ? '检查中...' : '检查版本'}</span>
              </button>
            </div>
          </div>

          {/* Version display */}
          {versions ? (
            <div className="space-y-4">
              {/* Claude Code */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Terminal className="w-8 h-8 text-blue-600" />
                  <div>
                    <h5 className="font-medium text-gray-900">Claude Code</h5>
                    <p className="text-sm text-gray-500">AI编程助手</p>
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
                        <span>{isUpdatingClaude ? '更新中...' : '更新'}</span>
                      </button>
                      {versions.preferredManager && (
                        <div className="text-xs text-gray-500">
                          将使用 <span className="font-mono">{versions.preferredManager}</span> 更新
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Node.js */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xs">JS</span>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900">Node.js</h5>
                    <p className="text-sm text-gray-500">JavaScript运行环境</p>
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
                  <div key={manager} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${icon.bg} rounded-lg flex items-center justify-center`}>
                        <span className={`${icon.text} font-bold text-xs`}>{icon.label}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">{manager}</h5>
                          {isPreferred && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                              推荐
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">包管理器</p>
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
              <div className="text-xs text-gray-500 text-center">
                最后检查时间: {new Date(versions.lastChecked).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <Terminal className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>点击"检查版本"获取版本信息</p>
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
                    {updateResult.success ? '更新成功' : '更新失败'}
                  </h6>
                  <p className={`text-sm mt-1 ${updateResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {updateResult.message}
                  </p>
                  {updateResult.output && (
                    <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                      {updateResult.output}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <p>• Claude Code 是 AI 编程助手，支持代码生成、编辑和项目管理</p>
            <p>• Node.js 是系统运行的基础环境</p>
            <p>• 支持多种包管理器：npm、pnpm、yarn（优先级：pnpm &gt; yarn &gt; npm）</p>
            <p>• 系统会自动选择推荐的包管理器进行更新操作</p>
            <p>• 建议保持 Claude Code 为最新版本以获得最佳体验</p>
          </div>
        </div>
      </div>
      )}

      {/* Claude版本管理 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                          <span>{version.name}</span>
                          <span className="text-sm font-normal text-gray-500">({version.alias})</span>
                          {version.isSystem && (
                            <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">系统</span>
                          )}
                          {version.id === claudeVersionsData.defaultVersionId && (
                            <span className="px-2 py-1 text-xs bg-blue-200 text-blue-700 rounded flex items-center space-x-1">
                              <Star className="w-3 h-3" />
                              <span>默认</span>
                            </span>
                          )}
                        </h4>
                      </div>
                      {version.description && (
                        <p className="text-sm text-gray-600 mt-1">{version.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium">路径:</span> {version.executablePath}
                      </p>
                      {version.environmentVariables && Object.keys(version.environmentVariables).length > 0 && (
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">环境变量:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {Object.entries(version.environmentVariables).map(([key, value]) => (
                              <span
                                key={key}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {key}={value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {version.id !== claudeVersionsData.defaultVersionId && (
                        <button
                          onClick={() => handleSetDefault(version)}
                          className="p-2 text-gray-500 hover:text-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors"
                          title="设为默认"
                        >
                          <StarOff className="w-4 h-4" />
                        </button>
                      )}
                      {!version.isSystem && (
                        <>
                          <button
                            onClick={() => handleEdit(version)}
                            className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(version)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>还没有配置 Claude 版本</p>
              <p className="text-sm">点击"添加版本"来配置第一个 Claude 版本</p>
            </div>
          )}

        </div>
      </div>

      {/* 创建/编辑版本模态窗口 */}
      {(isCreating || editingVersion) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingVersion ? '编辑版本' : '添加新版本'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      版本名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: Claude Code v1.2.3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      别名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.alias || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: claude-1.2.3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="版本描述（可选）"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    可执行文件路径 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.executablePath || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, executablePath: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例如: /usr/local/bin/claude"
                    />
                    <button
                      onClick={selectExecutablePath}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="浏览文件"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 环境变量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">环境变量</label>
                  <div className="space-y-3">
                    {/* 现有环境变量 */}
                    {formData.environmentVariables && Object.keys(formData.environmentVariables).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(formData.environmentVariables).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            <span className="flex-1 text-sm">
                              <span className="font-medium">{key}</span> = {value}
                            </span>
                            <button
                              onClick={() => removeEnvironmentVariable(key)}
                              className="p-1 text-red-500 hover:text-red-700 rounded"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="变量名"
                      />
                      <input
                        type="text"
                        value={envVarInput.value}
                        onChange={(e) => setEnvVarInput(prev => ({ ...prev, value: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="变量值"
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
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={createClaudeVersion.isPending || updateClaudeVersion.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {createClaudeVersion.isPending || updateClaudeVersion.isPending
                    ? '保存中...'
                    : editingVersion
                    ? '更新'
                    : '创建'
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
          title="选择Claude可执行文件"
          allowFiles={true}
          allowDirectories={false}
          onSelect={handleFileSelect}
          onClose={() => setShowFileBrowser(false)}
        />
      )}
    </div>
  );
};