import React, { useState, useEffect } from 'react';
import { 
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Terminal
} from 'lucide-react';

export const VersionSettingsPage: React.FC = () => {
  const [versions, setVersions] = useState<any>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isUpdatingClaude, setIsUpdatingClaude] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">版本管理</h2>
        <p className="text-gray-600">管理系统依赖的版本信息，包括 Claude Code、Node.js 和 npm</p>
      </div>

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
    </div>
  );
};