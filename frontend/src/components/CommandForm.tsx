import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Code, Edit3 } from 'lucide-react';
import {
  SlashCommand,
  SlashCommandCreate,
  SlashCommandUpdate} from '../types/commands';
import { useCreateCommand, useUpdateCommand, useCreateProjectCommand, useUpdateProjectCommand } from '../hooks/useCommands';
import { UnifiedToolSelector } from './UnifiedToolSelector';
import { useTranslation } from 'react-i18next';

interface CommandFormProps {
  command?: SlashCommand | null;
  projectId?: string; // Optional project ID for project-specific commands
  onClose: () => void;
  onSuccess: () => void;
}

export const CommandForm: React.FC<CommandFormProps> = ({
  command,
  projectId,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation('components');
  const { t: tc } = useTranslation('common');

  const [formData, setFormData] = useState<SlashCommandCreate>({
    name: command ? '' : 'optimize',
    description: command ? '' : t('commandForm.exampleDescription'),
    content: command ? '' : t('commandForm.exampleContent'),
    scope: projectId ? 'project' : 'user',
    namespace: command ? '' : 'frontend',
    argumentHint: command ? '' : '[filename] [options]',
    allowedTools: [],
    model: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [rawContent, setRawContent] = useState('');
  const [useInheritModel, setUseInheritModel] = useState(true);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedRegularTools, setSelectedRegularTools] = useState<string[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);

  const createCommand = projectId ? useCreateProjectCommand(projectId) : useCreateCommand();
  const updateCommand = projectId ? useUpdateProjectCommand(projectId) : useUpdateCommand();

  const isEditing = !!command;

  // Generate markdown content from form data
  const generateMarkdownContent = (data: SlashCommandCreate): string => {
    const frontmatter: string[] = [];
    
    if (data.description) {
      frontmatter.push(`description: ${data.description}`);
    }
    if (data.argumentHint) {
      frontmatter.push(`argument-hint: ${data.argumentHint}`);
    }
    if (data.namespace) {
      frontmatter.push(`namespace: ${data.namespace}`);
    }
    if (data.allowedTools && data.allowedTools.length > 0) {
      frontmatter.push(`allowed-tools: ${data.allowedTools.join(', ')}`);
    }
    if (data.model) {
      frontmatter.push(`model: ${data.model}`);
    }

    if (frontmatter.length > 0) {
      return `---\n${frontmatter.join('\n')}\n---\n\n${data.content}`;
    }
    return data.content;
  };

  // Parse markdown content to form data
  const parseMarkdownContent = (content: string): Partial<SlashCommandCreate> => {
    const frontmatterMatch = content.match(/^---\n(.*?)\n---\n\n?(.*)/s);
    
    if (!frontmatterMatch) {
      return { content };
    }

    const [, frontmatterStr, bodyContent] = frontmatterMatch;
    const result: Partial<SlashCommandCreate> = { content: bodyContent };

    frontmatterStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'description':
          result.description = value;
          break;
        case 'argument-hint':
          result.argumentHint = value;
          break;
        case 'namespace':
          result.namespace = value;
          break;
        case 'allowed-tools':
          result.allowedTools = value.split(',').map(tool => tool.trim()).filter(Boolean);
          break;
        case 'model':
          result.model = value;
          break;
      }
    });

    return result;
  };

  useEffect(() => {
    if (command) {
      const data = {
        name: command.name,
        description: command.description,
        content: command.content,
        scope: command.scope,
        namespace: command.namespace || '',
        argumentHint: command.argumentHint || '',
        allowedTools: command.allowedTools || [],
        model: command.model || '',
      };
      setFormData(data);
      setUseInheritModel(!data.model);
      setRawContent(generateMarkdownContent(data));
      
      // 从现有命令的 allowedTools 中分离常规工具和 MCP 工具
      if (command.allowedTools) {
        const regular = command.allowedTools.filter(tool => !tool.startsWith('mcp__'));
        const mcp = command.allowedTools.filter(tool => tool.startsWith('mcp__'));
        setSelectedRegularTools(regular);
        setSelectedMcpTools(mcp);
        setMcpToolsEnabled(mcp.length > 0);
      }
    } else {
      // Initialize empty rawContent for new commands
      setRawContent(generateMarkdownContent(formData));
    }
  }, [command]);

  // Update rawContent when formData changes (in form mode)
  useEffect(() => {
    if (!isCodeMode) {
      setRawContent(generateMarkdownContent(formData));
    }
  }, [formData, isCodeMode]);

  // Handle mode switching
  const handleModeSwitch = (newMode: boolean) => {
    if (newMode) {
      // Switching to code mode - generate markdown from form
      setRawContent(generateMarkdownContent(formData));
    } else {
      // Switching to form mode - parse markdown to form
      const parsed = parseMarkdownContent(rawContent);
      setFormData({
        ...formData,
        ...parsed
      });
      // Update useInheritModel based on model field
      setUseInheritModel(!parsed.model);
    }
    setIsCodeMode(newMode);
  };

  // Handle raw content change
  const handleRawContentChange = (content: string) => {
    setRawContent(content);
    // Real-time sync to form data
    const parsed = parseMarkdownContent(content);
    setFormData({
      ...formData,
      ...parsed
    });
    // Update useInheritModel based on model field
    setUseInheritModel(!parsed.model);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('commandForm.errors.nameRequired');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = t('commandForm.errors.nameFormat');
    }

    if (!formData.content.trim()) {
      newErrors.content = t('commandForm.errors.contentRequired');
    }

    if (!formData.scope) {
      newErrors.scope = t('commandForm.errors.scopeRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submit triggered'); // 调试日志

    if (!validateForm()) {
      console.log('Form validation failed'); // 调试日志
      return;
    }

    try {
      const submitData = {
        ...formData,
        namespace: (formData.namespace || '').trim() || undefined,
        argumentHint: (formData.argumentHint || '').trim() || undefined,
        allowedTools: formData.allowedTools && formData.allowedTools.length > 0 ? formData.allowedTools : undefined,
        model: (formData.model || '').trim() || undefined,
      };

      console.log('Submit data:', submitData); // 调试日志
      console.log('Is editing:', isEditing); // 调试日志

      if (isEditing) {
        const updateData: SlashCommandUpdate = {
          description: submitData.description,
          content: submitData.content,
          argumentHint: submitData.argumentHint,
          allowedTools: submitData.allowedTools,
          model: submitData.model,
        };
        console.log('Calling updateCommand with:', { id: command.id, updates: updateData }); // 调试日志
        await updateCommand.mutateAsync({ id: command.id, updates: updateData });
      } else {
        console.log('Calling createCommand with:', submitData); // 调试日志
        await createCommand.mutateAsync(submitData);
      }

      console.log('Command operation successful'); // 调试日志
      onSuccess();
    } catch (error: any) {
      console.log('Command operation failed:', error); // 调试日志
      setErrors({ submit: error.message || t('commandForm.errors.saveFailed') });
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? t('commandForm.editTitle') : t('commandForm.createTitle')}
            </h2>
            {/* Mode Switch */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => handleModeSwitch(false)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  !isCodeMode
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>{t('commandForm.formMode')}</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch(true)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isCodeMode
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>{t('commandForm.codeMode')}</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {tc('actions.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createCommand.isPending || updateCommand.isPending}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>
                {createCommand.isPending || updateCommand.isPending
                  ? tc('status.saving')
                  : isEditing
                  ? t('commandForm.saveChanges')
                  : t('commandForm.createCommand')}
              </span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form id="command-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {isCodeMode ? (
              /* Code Mode */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('commandForm.markdownSource')}
                  </label>
                  <textarea
                    value={rawContent}
                    onChange={(e) => handleRawContentChange(e.target.value)}
                    placeholder={t('commandForm.markdownPlaceholder')}
                    rows={25}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <p><strong>{t('commandForm.frontmatterSupported')}</strong></p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">description</code> - {t('commandForm.frontmatterFields.description')}</li>
                      <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">argument-hint</code> - {t('commandForm.frontmatterFields.argumentHint')}</li>
                      <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">namespace</code> - {t('commandForm.frontmatterFields.namespace')}</li>
                      <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">allowed-tools</code> - {t('commandForm.frontmatterFields.allowedTools')}</li>
                      <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">model</code> - {t('commandForm.frontmatterFields.model')}</li>
                    </ul>
                  </div>
                </div>
              </>
            ) : (
              /* Form Mode */
              <>
            {/* Error Message */}
            {errors.submit && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                <span className="text-red-700 dark:text-red-400">{errors.submit}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Command Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('commandForm.nameLabel')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isEditing}
                  placeholder="optimize"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('commandForm.nameHint')}
                </p>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('commandForm.modelLabel')}
                </label>
                <div className="flex items-center space-x-3">
                  {/* Inherit Option */}
                  <div className="flex items-center">
                    <input
                      id="inherit-model"
                      type="checkbox"
                      checked={useInheritModel}
                      onChange={(e) => {
                        setUseInheritModel(e.target.checked);
                        if (e.target.checked) {
                          setFormData({ ...formData, model: '' });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <label htmlFor="inherit-model" className="ml-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {t('commandForm.inheritModel')}
                    </label>
                  </div>

                  {/* Custom Model Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="sonnet"
                      disabled={useInheritModel}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('commandForm.modelHint')}
                </p>
              </div>

              {/* Namespace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('commandForm.namespaceLabel')}
                </label>
                <input
                  type="text"
                  value={formData.namespace}
                  onChange={(e) => setFormData({ ...formData, namespace: e.target.value })}
                  placeholder="frontend"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('commandForm.namespaceHint')}
                </p>
              </div>

              {/* Argument Hint */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('commandForm.argumentHintLabel')}
                </label>
                <input
                  type="text"
                  value={formData.argumentHint}
                  onChange={(e) => setFormData({ ...formData, argumentHint: e.target.value })}
                  placeholder="[filename] [options]"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('commandForm.argumentHintHint')}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('commandForm.descriptionLabel')}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('commandForm.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('commandForm.descriptionHint')}
              </p>
            </div>

            {/* Allowed Tools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('commandForm.allowedToolsLabel')}
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowToolSelector(!showToolSelector)}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                >
                  {t('commandForm.selectTools')}
                </button>

                {/* 显示工具数量详情 */}
                {(selectedRegularTools.length > 0 || selectedMcpTools.length > 0) && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('commandForm.regularToolsCount', { count: selectedRegularTools.length })}
                    {selectedMcpTools.length > 0 && `, ${t('commandForm.mcpToolsCount', { count: selectedMcpTools.length })}`}
                  </span>
                )}
                
                <UnifiedToolSelector
                  isOpen={showToolSelector}
                  onClose={() => setShowToolSelector(false)}
                  selectedRegularTools={selectedRegularTools}
                  selectedMcpTools={selectedMcpTools}
                  mcpToolsEnabled={mcpToolsEnabled}
                  onRegularToolsChange={(tools) => {
                    setSelectedRegularTools(tools);
                    const allTools = mcpToolsEnabled ? [...tools, ...selectedMcpTools] : tools;
                    setFormData({ ...formData, allowedTools: allTools });
                  }}
                  onMcpToolsChange={(tools) => {
                    setSelectedMcpTools(tools);
                    const allTools = [...selectedRegularTools, ...tools];
                    setFormData({ ...formData, allowedTools: allTools });
                  }}
                  onMcpEnabledChange={(enabled) => {
                    setMcpToolsEnabled(enabled);
                    if (!enabled) {
                      setSelectedMcpTools([]);
                      setFormData({ ...formData, allowedTools: selectedRegularTools });
                    } else {
                      const allTools = [...selectedRegularTools, ...selectedMcpTools];
                      setFormData({ ...formData, allowedTools: allTools });
                    }
                  }}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('commandForm.allowedToolsHint')}
              </p>
            </div>

            {/* Command Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('commandForm.contentLabel')} *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('commandForm.contentPlaceholder')}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content}</p>
              )}
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                <p><strong>{t('commandForm.supportedFeatures')}</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">$ARGUMENTS</code> - {t('commandForm.features.arguments')}</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">$1, $2, ...</code> - {t('commandForm.features.positionArgs')}</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">@filepath</code> - {t('commandForm.features.fileRef')}</li>
                  <li><code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">!`command`</code> - {t('commandForm.features.bashCommand')}</li>
                </ul>
              </div>
            </div>
              </>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};