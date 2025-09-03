import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, HelpCircle, Info, Code, Edit3 } from 'lucide-react';
import { 
  Subagent, 
  SubagentCreate, 
  SubagentUpdate,
  SUBAGENT_SCOPES} from '../types/subagents';
import { useCreateSubagent, useUpdateSubagent, useCreateProjectSubagent, useUpdateProjectSubagent } from '../hooks/useSubagents';
import { ToolSelector } from './ui/ToolSelector';

interface SubagentFormProps {
  subagent?: Subagent | null;
  projectId?: string; // Optional project ID for project-specific subagents
  onClose: () => void;
  onSuccess: () => void;
}

export const SubagentForm: React.FC<SubagentFormProps> = ({
  subagent,
  projectId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SubagentCreate>({
    name: '',
    description: '',
    content: '',
    scope: projectId ? 'project' : 'user',
    tools: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [rawContent, setRawContent] = useState('');

  const createSubagent = projectId ? useCreateProjectSubagent(projectId) : useCreateSubagent();
  const updateSubagent = projectId ? useUpdateProjectSubagent(projectId) : useUpdateSubagent();

  const isEditing = !!subagent;

  // Generate markdown content from form data
  const generateMarkdownContent = (data: SubagentCreate): string => {
    const frontmatter: string[] = [];
    
    frontmatter.push(`name: ${data.name}`);
    if (data.description) {
      frontmatter.push(`description: ${data.description}`);
    }
    if (data.tools && data.tools.length > 0) {
      frontmatter.push(`tools: ${data.tools.join(', ')}`);
    }

    if (frontmatter.length > 0) {
      return `---\n${frontmatter.join('\n')}\n---\n\n${data.content}`;
    }
    return data.content;
  };

  // Parse markdown content to form data
  const parseMarkdownContent = (content: string): Partial<SubagentCreate> => {
    const frontmatterMatch = content.match(/^---\n(.*?)\n---\n\n?(.*)/s);
    
    if (!frontmatterMatch) {
      return { content };
    }

    const [, frontmatterStr, bodyContent] = frontmatterMatch;
    const result: Partial<SubagentCreate> = { content: bodyContent };

    frontmatterStr.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'name':
          result.name = value;
          break;
        case 'description':
          result.description = value;
          break;
        case 'tools':
          result.tools = value.split(',').map(t => t.trim()).filter(Boolean);
          break;
      }
    });

    return result;
  };

  useEffect(() => {
    if (subagent) {
      setFormData({
        name: subagent.name,
        description: subagent.description,
        content: subagent.content,
        scope: subagent.scope,
        tools: subagent.tools || [],
      });
      setRawContent(generateMarkdownContent({
        name: subagent.name,
        description: subagent.description,
        content: subagent.content,
        scope: subagent.scope,
        tools: subagent.tools || [],
      }));
    }
  }, [subagent]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '名称不能为空';
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = '名称只能包含小写字母、数字和连字符';
    }

    if (!formData.description.trim()) {
      newErrors.description = '描述不能为空';
    }

    if (!formData.content.trim()) {
      newErrors.content = '系统提示词不能为空';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let dataToSubmit = formData;

    if (isCodeMode) {
      // Parse raw content
      const parsed = parseMarkdownContent(rawContent);
      dataToSubmit = {
        ...formData,
        ...parsed,
      };
    }

    if (!validateForm()) return;

    try {
      if (isEditing && subagent) {
        const updateData: SubagentUpdate = {
          description: dataToSubmit.description,
          content: dataToSubmit.content,
          tools: dataToSubmit.tools,
        };
        await updateSubagent.mutateAsync({ id: subagent.id, ...updateData });
      } else {
        await createSubagent.mutateAsync(dataToSubmit);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving subagent:', error);
      setErrors({ submit: error instanceof Error ? error.message : '保存失败' });
    }
  };


  const handleModeToggle = () => {
    if (isCodeMode) {
      // Switching from code mode to form mode
      const parsed = parseMarkdownContent(rawContent);
      setFormData(prev => ({
        ...prev,
        ...parsed,
      }));
    } else {
      // Switching from form mode to code mode
      setRawContent(generateMarkdownContent(formData));
    }
    setIsCodeMode(!isCodeMode);
  };

  const isLoading = createSubagent.isPending || updateSubagent.isPending;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? '编辑 Subagent' : '创建 Subagent'}
            </h2>
            {/* Mode Switch */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => !isCodeMode || handleModeToggle()}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  !isCodeMode 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>表单</span>
              </button>
              <button
                type="button"
                onClick={() => isCodeMode || handleModeToggle()}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isCodeMode 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>代码</span>
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="subagent-form"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>
                {isLoading
                  ? '保存中...'
                  : isEditing
                  ? '保存更改'
                  : '创建 Subagent'}
              </span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form id="subagent-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {isCodeMode ? (
              /* Code Mode */
              <div className="space-y-4">
                <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">代码模式</p>
                    <p>在此模式下，你可以直接编辑 Markdown 格式的 subagent 文件，包括 YAML frontmatter 和系统提示词内容。</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subagent 文件内容
                  </label>
                  <textarea
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="---
name: my-subagent
description: 专门处理特定任务的subagent
tools: read_file, write, search_replace
---

你是一个专门处理...的AI助手。

你的任务是..."
                  />
                </div>
              </div>
            ) : (
              /* Form Mode */
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名称 *
                      <HelpCircle className="inline h-4 w-4 ml-1 text-gray-400" title="只能包含小写字母、数字和连字符" />
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="my-subagent"
                      disabled={isEditing}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      作用域
                    </label>
                    <select
                      value={formData.scope}
                      onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as 'user' | 'project' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                      disabled
                    >
                      {projectId ? (
                        <option value="project">项目 Subagent</option>
                      ) : (
                        SUBAGENT_SCOPES.map(scope => (
                          <option key={scope.value} value={scope.value}>
                            {scope.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述 *
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="描述这个subagent的用途和应该在什么时候被调用"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Tools */}
                <div>
                  <ToolSelector
                    selectedTools={formData.tools || []}
                    onChange={(tools) => setFormData(prev => ({ ...prev, tools: tools as string[] }))}
                    label="允许的工具"
                    emptyText="继承所有可用工具"
                    useAgentTool={false}
                  />
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    系统提示词 *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className={`w-full h-48 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                      errors.content ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="你是一个专门处理...的AI助手。

你的任务是...

请确保...

当遇到...时，你应该..."
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.content}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Submit error */}
            {errors.submit && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {errors.submit}
                </p>
              </div>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
