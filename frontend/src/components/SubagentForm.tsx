import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, HelpCircle, Plus, Minus, Info, Code, Edit3, Bot } from 'lucide-react';
import { 
  Subagent, 
  SubagentCreate, 
  SubagentUpdate,
  SUBAGENT_SCOPES,
  COMMON_TOOLS
} from '../types/subagents';
import { useCreateSubagent, useUpdateSubagent } from '../hooks/useSubagents';

interface SubagentFormProps {
  subagent?: Subagent | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubagentForm: React.FC<SubagentFormProps> = ({
  subagent,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SubagentCreate>({
    name: '',
    description: '',
    content: '',
    scope: 'user',
    tools: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToolInput, setShowToolInput] = useState(false);
  const [newTool, setNewTool] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [rawContent, setRawContent] = useState('');

  const createSubagent = useCreateSubagent();
  const updateSubagent = useUpdateSubagent();

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

  const handleAddTool = () => {
    if (newTool.trim() && !formData.tools?.includes(newTool.trim())) {
      setFormData(prev => ({
        ...prev,
        tools: [...(prev.tools || []), newTool.trim()]
      }));
      setNewTool('');
      setShowToolInput(false);
    }
  };

  const handleRemoveTool = (toolToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools?.filter(tool => tool !== toolToRemove) || []
    }));
  };

  const addCommonTool = (tool: string) => {
    if (!formData.tools?.includes(tool)) {
      setFormData(prev => ({
        ...prev,
        tools: [...(prev.tools || []), tool]
      }));
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? '编辑 Subagent' : '创建 Subagent'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleModeToggle}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {isCodeMode ? <Edit3 className="h-4 w-4" /> : <Code className="h-4 w-4" />}
              <span>{isCodeMode ? '表单模式' : '代码模式'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
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
                      onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as 'user' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled
                    >
                      {SUBAGENT_SCOPES.map(scope => (
                        <option key={scope.value} value={scope.value}>
                          {scope.label}
                        </option>
                      ))}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    允许的工具
                    <HelpCircle className="inline h-4 w-4 ml-1 text-gray-400" title="如果为空，则继承所有可用工具" />
                  </label>
                  
                  {/* Selected tools */}
                  <div className="mb-3">
                    {formData.tools && formData.tools.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.tools.map((tool, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {tool}
                            <button
                              type="button"
                              onClick={() => handleRemoveTool(tool)}
                              className="ml-2 hover:text-blue-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">继承所有可用工具</p>
                    )}
                  </div>

                  {/* Common tools */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">常用工具：</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_TOOLS.map(tool => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => addCommonTool(tool)}
                          disabled={formData.tools?.includes(tool)}
                          className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                            formData.tools?.includes(tool)
                              ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add custom tool */}
                  {showToolInput ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTool}
                        onChange={(e) => setNewTool(e.target.value)}
                        placeholder="输入工具名称"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTool();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddTool}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        添加
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowToolInput(false);
                          setNewTool('');
                        }}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowToolInput(true)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>添加自定义工具</span>
                    </button>
                  )}
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

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEditing ? '更新' : '创建'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
