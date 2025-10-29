import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Plus, X, Eye, EyeOff } from 'lucide-react';

interface EnvironmentVariablesSectionProps {
  environmentVariables: Record<string, string>;
  envVarInput: { key: string; value: string };
  currentTemplateTokenUrl: string | null;
  onAddEnvironmentVariable: () => void;
  onUpdateEnvironmentVariable: (key: string, value: string) => void;
  onRemoveEnvironmentVariable: (key: string) => void;
  onEnvVarInputChange: (input: { key: string; value: string }) => void;
  onAuthTokenChange?: (changed: boolean) => void; // 新增：标记ANTHROPIC_AUTH_TOKEN是否被修改
}

export const EnvironmentVariablesSection: React.FC<EnvironmentVariablesSectionProps> = ({
  environmentVariables,
  envVarInput,
  currentTemplateTokenUrl,
  onAddEnvironmentVariable,
  onUpdateEnvironmentVariable,
  onRemoveEnvironmentVariable,
  onEnvVarInputChange,
  onAuthTokenChange,
}) => {
  const { t } = useTranslation('pages');
  const [showAuthToken, setShowAuthToken] = React.useState(false);
  const [authTokenValue, setAuthTokenValue] = React.useState<string>('');

  // 检测是否为隐藏的token（格式：前4位***后4位）
  const isHiddenToken = (value: string): boolean => {
    return /^[a-zA-Z0-9]{4}\*\*\*[a-zA-Z0-9]{4}$/.test(value) || value === '***';
  };

  // 初始化authToken值
  React.useEffect(() => {
    const token = environmentVariables['ANTHROPIC_AUTH_TOKEN'] || '';
    if (isHiddenToken(token)) {
      // 如果是隐藏的token，清空输入框
      setAuthTokenValue('');
    } else {
      // 如果不是隐藏的（新建或未修改），保持原值
      setAuthTokenValue(token);
    }
  }, [environmentVariables]);

  // 处理ANTHROPIC_AUTH_TOKEN的修改
  const handleAuthTokenChange = (newValue: string) => {
    setAuthTokenValue(newValue);
    
    const token = environmentVariables['ANTHROPIC_AUTH_TOKEN'] || '';
    const isHidden = isHiddenToken(token);
    
    // 如果原本是隐藏的，现在有输入，则标记为已修改
    // 如果原本不是隐藏的，现在值改变了，也标记为已修改
    const changed = isHidden ? newValue.length > 0 : newValue !== token;
    
    if (onAuthTokenChange) {
      onAuthTokenChange(changed);
    }
    
    // 更新环境变量
    onUpdateEnvironmentVariable('ANTHROPIC_AUTH_TOKEN', newValue);
  };

  // 切换显示/隐藏token
  const toggleShowAuthToken = () => {
    setShowAuthToken(!showAuthToken);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('settings.version.form.envVars')}
      </label>
      <div className="space-y-3">
        {/* 现有环境变量 */}
        {Object.keys(environmentVariables).length > 0 && (
          <div className="space-y-2">
            {Object.entries(environmentVariables).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex-1 flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {key} =
                  </span>
                  
                  {/* ANTHROPIC_AUTH_TOKEN 的特殊处理 */}
                  {key === 'ANTHROPIC_AUTH_TOKEN' ? (
                    <div className="flex-1 relative flex items-center">
                      <input
                        type={showAuthToken ? 'text' : 'password'}
                        value={authTokenValue}
                        onChange={(e) => handleAuthTokenChange(e.target.value)}
                        placeholder={isHiddenToken(value) ? '点击输入新的API密钥' : t('settings.version.form.emptyValue')}
                        className="flex-1 px-2 py-1 pr-20 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="absolute right-2 flex items-center space-x-1">
                        {isHiddenToken(value) && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">
                            已隐藏
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={toggleShowAuthToken}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title={showAuthToken ? '隐藏' : '显示'}
                        >
                          {showAuthToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      {currentTemplateTokenUrl && (isHiddenToken(value) || !value) && (
                        <a
                          href={currentTemplateTokenUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{t('settings.version.form.getApiKey')}</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    /* 其他环境变量的正常显示 */
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onUpdateEnvironmentVariable(key, e.target.value)}
                      placeholder={t('settings.version.form.emptyValue')}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
                <button
                  onClick={() => onRemoveEnvironmentVariable(key)}
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
            onChange={(e) => onEnvVarInputChange({ ...envVarInput, key: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('settings.version.form.varName')}
          />
          <input
            type="text"
            value={envVarInput.value}
            onChange={(e) => onEnvVarInputChange({ ...envVarInput, value: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('settings.version.form.varValue')}
          />
          <button
            onClick={onAddEnvironmentVariable}
            disabled={!envVarInput.key || !envVarInput.value}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};