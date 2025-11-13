import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Settings, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCreateSkill, useUpdateSkill, useSkill, useValidateSkillManifest } from '../../hooks/useSkills';
import { UnifiedToolSelector } from '../UnifiedToolSelector';
import type { CreateSkillRequest, UpdateSkillRequest, SkillListItem } from '../../types/skills';

interface CreateSkillModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editSkill?: SkillListItem; // 可选的编辑技能数据
}

type TabType = 'basic' | 'manifest' | 'files';

export const CreateSkillModal: React.FC<CreateSkillModalProps> = ({
  onClose,
  onSuccess,
  editSkill,
}) => {
  const { t } = useTranslation(['skills', 'common']);
  const isEditing = !!editSkill;
  
  const [currentTab, setCurrentTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    allowedTools: [] as string[],
    content: '',
    additionalFiles: [] as Array<{
      id: string;
      name: string;
      path: string;
      type: 'markdown' | 'text' | 'script' | 'template' | 'other';
      content: string;
    }>,
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [nameValidationError, setNameValidationError] = useState<string>('');
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedRegularTools, setSelectedRegularTools] = useState<string[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);

  const createSkillMutation = useCreateSkill();
  const updateSkillMutation = useUpdateSkill();
  const validateManifestMutation = useValidateSkillManifest();
  
  // 加载完整技能数据（仅编辑模式）
  const skillQuery = useSkill(
    editSkill?.id || '', 
    editSkill?.scope || 'user'
  );
  
  const fullSkill = isEditing ? skillQuery.data : null;
  const isLoadingSkill = isEditing ? skillQuery.isLoading : false;
  
  // Track last modification times
  const [lastBasicInfoChange, setLastBasicInfoChange] = useState<number>(0);
  const [lastContentChange, setLastContentChange] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update allowedTools from tool selectors and record modification time
  useEffect(() => {
    if (!isSyncing) {
      const allSelectedTools = [...selectedRegularTools];
      if (mcpToolsEnabled) {
        allSelectedTools.push(...selectedMcpTools);
      }
      setFormData(prev => ({ ...prev, allowedTools: allSelectedTools }));
      setLastBasicInfoChange(Date.now());
    }
  }, [selectedRegularTools, selectedMcpTools, mcpToolsEnabled, isSyncing]);

  // Track basic info changes
  useEffect(() => {
    if (!isSyncing && (formData.name || formData.description)) {
      setLastBasicInfoChange(Date.now());
    }
  }, [formData.name, formData.description, isSyncing]);

  // Track content changes
  useEffect(() => {
    if (!isSyncing && formData.content) {
      setLastContentChange(Date.now());
    }
  }, [formData.content, isSyncing]);

  // 初始化编辑数据
  useEffect(() => {
    if (isEditing && fullSkill) {
      setFormData({
        name: fullSkill.name,
        description: fullSkill.description,
        allowedTools: fullSkill.allowedTools || [],
        content: '', // 将通过API加载
        additionalFiles: (fullSkill.files || [])
          .filter(file => !file.path.endsWith('SKILL.md'))
          .map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            path: file.path,
            type: file.type,
            content: '', // 需要单独加载
          })),
      });

      // 初始化工具选择器
      const allTools = fullSkill.allowedTools || [];
      const regularTools = allTools.filter((tool: string) => !tool.startsWith('mcp__'));
      const mcpTools = allTools.filter((tool: string) => tool.startsWith('mcp__'));
      setSelectedRegularTools(regularTools);
      setSelectedMcpTools(mcpTools);
      setMcpToolsEnabled(mcpTools.length > 0);

      // 加载SKILL.md内容
      const loadSkillManifest = async () => {
        try {
          const response = await fetch(`/api/skills/${editSkill.id}/files/SKILL.md`);
          if (response.ok) {
            const data = await response.json();
            setFormData(prev => ({ ...prev, content: data.content }));
            setLastContentChange(Date.now());
          }
        } catch (error) {
          console.error('Failed to load skill manifest:', error);
        }
      };

      loadSkillManifest();
    }
  }, [isEditing, fullSkill, editSkill]);

  // Validate manifest when content changes
  useEffect(() => {
    if (formData.content) {
      const validateContent = async () => {
        try {
          const result = await validateManifestMutation.mutateAsync(formData.content);
          setValidationErrors(result.errors.map(err => err.message) || []);
        } catch {
          setValidationErrors(['Validation failed']);
        }
      };

      const timeoutId = setTimeout(validateContent, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.content, validateManifestMutation]);

  const handleSave = async () => {
    try {
      if (isEditing) {
        // 编辑模式
        const updateData: UpdateSkillRequest = {
          name: formData.name,
          description: formData.description,
          allowedTools: formData.allowedTools,
          content: formData.content,
          additionalFiles: formData.additionalFiles.map(file => ({
            name: file.name,
            path: file.path,
            type: file.type,
            content: file.content,
          })),
        };

        await updateSkillMutation.mutateAsync({
          skillId: editSkill!.id,
          updates: updateData,
        });
      } else {
        // 创建模式
        const skillData: CreateSkillRequest = {
          name: formData.name,
          description: formData.description,
          scope: 'user',
          allowedTools: formData.allowedTools,
          content: formData.content,
          additionalFiles: formData.additionalFiles.map(file => ({
            name: file.name,
            path: file.path,
            type: file.type,
            content: file.content,
          })),
        };

        await createSkillMutation.mutateAsync(skillData);
      }
      
      onSuccess();
    } catch (error) {
      console.error(isEditing ? 'Failed to update skill:' : 'Failed to create skill:', error);
      alert(isEditing ? t('errors.updateFailed') : t('errors.createFailed'));
    }
  };

  const handleAddFile = () => {
    const newFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New File',
      path: 'new-file.md',
      type: 'markdown' as const,
      content: '',
    };
    setFormData(prev => ({ ...prev, additionalFiles: [...prev.additionalFiles, newFile] }));
  };

  const handleRemoveFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      additionalFiles: prev.additionalFiles.filter(file => file.id !== fileId)
    }));
  };

  const handleFileChange = (fileId: string, updates: Partial<typeof formData.additionalFiles[0]>) => {
    setFormData(prev => ({
      ...prev,
      additionalFiles: prev.additionalFiles.map(file =>
        file.id === fileId ? { ...file, ...updates } : file
      )
    }));
  };

  const isFormValid = formData.name.trim() !== '' && 
                     !nameValidationError &&
                     formData.description.trim() !== '' && 
                     formData.content.trim() !== '' &&
                     validationErrors.length === 0;

  const canProceedToNext = () => {
    switch (currentTab) {
      case 'basic':
        return formData.name.trim() !== '' && 
               !nameValidationError &&
               formData.description.trim() !== '';
      case 'manifest':
        return formData.content.trim() !== '' && validationErrors.length === 0;
      case 'files':
        return true; // Files are optional
      default:
        return false;
    }
  };

  // Sync data based on last modification time
  const syncData = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    // Determine which data source is newer
    if (lastBasicInfoChange > lastContentChange) {
      // Basic info is newer, update content
      if (formData.name && formData.description) {
        const newContent = generateSkillContent(
          formData.name, 
          formData.description, 
          formData.allowedTools
        );
        setFormData(prev => ({ ...prev, content: newContent }));
        setLastContentChange(Date.now());
      }
    } else if (lastContentChange > lastBasicInfoChange) {
      // Content is newer, update basic info
      const parsed = parseSkillContent(formData.content);
      if (parsed) {
        const hasChanges = 
          (parsed.name && parsed.name !== formData.name) ||
          (parsed.description && parsed.description !== formData.description) ||
          (parsed.allowedTools && JSON.stringify(parsed.allowedTools) !== JSON.stringify(formData.allowedTools));
        
        if (hasChanges) {
          setFormData(prev => ({ 
            ...prev, 
            name: parsed.name || prev.name,
            description: parsed.description || prev.description,
            allowedTools: parsed.allowedTools || prev.allowedTools
          }));
          
          // Update tool selectors
          const regularTools = (parsed.allowedTools || []).filter((tool: string) => !tool.startsWith('mcp__'));
          const mcpTools = (parsed.allowedTools || []).filter((tool: string) => tool.startsWith('mcp__'));
          setSelectedRegularTools(regularTools);
          setSelectedMcpTools(mcpTools);
          setMcpToolsEnabled(mcpTools.length > 0);
          setLastBasicInfoChange(Date.now());
        }
      }
    } else if (!formData.content && formData.name && formData.description) {
      // Initial content generation
      const newContent = generateSkillContent(
        formData.name, 
        formData.description, 
        formData.allowedTools
      );
      setFormData(prev => ({ ...prev, content: newContent }));
      setLastContentChange(Date.now());
    }
    
    setTimeout(() => setIsSyncing(false), 100);
  };

  const goToNextTab = () => {
    syncData();
    if (currentTab === 'basic') setCurrentTab('manifest');
    else if (currentTab === 'manifest') setCurrentTab('files');
  };

  const switchToTab = (tabId: TabType) => {
    syncData();
    setCurrentTab(tabId);
  };

  const tabs = [
    { id: 'basic' as TabType, label: t('create.tabs.basic'), icon: Settings },
    { id: 'manifest' as TabType, label: t('create.tabs.manifest'), icon: FileText },
    { id: 'files' as TabType, label: t('create.tabs.files'), icon: Paperclip },
  ];

  // Validate skill name (slug format)
  const validateSkillName = (name: string): string => {
    if (!name) return '';
    if (name.length > 64) return '技能名称不能超过64个字符';
    if (!/^[a-z0-9-]+$/.test(name)) return '只能使用小写字母、数字和连字符';
    if (name.startsWith('-') || name.endsWith('-')) return '不能以连字符开始或结束';
    if (name.includes('--')) return '不能包含连续的连字符';
    return '';
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, name: value }));
    setNameValidationError(validateSkillName(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 如果是编辑模式且正在加载，显示加载状态
  if (isEditing && isLoadingSkill) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? `编辑技能 - ${editSkill?.name}` : t('create.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1 dark:text-gray-300">
              {isEditing ? '修改现有技能的配置和功能' : t('create.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {currentTab !== 'files' ? (
              <button
                onClick={goToNextTab}
                disabled={!canProceedToNext()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {t('common:actions.next')}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!isFormValid || createSkillMutation.isPending || updateSkillMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {(createSkillMutation.isPending || updateSkillMutation.isPending) 
                  ? t('common:status.saving') 
                  : isEditing 
                    ? t('common:actions.save')
                    : t('common:actions.create')
                }
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const isCompleted = 
              (tab.id === 'basic' && formData.name.trim() !== '' && formData.description.trim() !== '') ||
              (tab.id === 'manifest' && formData.content.trim() !== '' && validationErrors.length === 0) ||
              (tab.id === 'files'); // Files are always considered completed

            return (
              <button
                key={tab.id}
                onClick={() => switchToTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isCompleted && (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Basic Info Tab */}
          {currentTab === 'basic' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                  技能名称 (Slug)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isEditing}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400 font-mono ${
                    isEditing 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                      : nameValidationError 
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300'
                  }`}
                  placeholder="my-awesome-skill"
                />
                {nameValidationError ? (
                  <p className="text-xs text-red-500 mt-1 dark:text-red-400">
                    {nameValidationError}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    {isEditing 
                      ? '技能名称在编辑模式下不能修改' 
                      : '只能使用小写字母、数字和连字符，最多64个字符'
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                  {t('create.basic.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                  placeholder={t('create.basic.descriptionPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                  {t('create.basic.descriptionHint')}
                </p>
              </div>

              {/* Tools Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                  {t('create.basic.allowedTools')}
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowToolSelector(!showToolSelector)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    {t('create.basic.selectTools')}
                  </button>

                  {/* Display tool count details */}
                  {(selectedRegularTools.length > 0 || selectedMcpTools.length > 0) && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      常规工具 {selectedRegularTools.length} 个
                      {selectedMcpTools.length > 0 && `, MCP工具 ${selectedMcpTools.length} 个`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                  {t('create.basic.allowedToolsHint')}
                </p>
              </div>
            </div>
          )}

          {/* Manifest Tab */}
          {currentTab === 'manifest' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                  {t('create.content.skillManifest')}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400"
                />
                {validationErrors.length > 0 && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                    <h4 className="text-sm font-medium text-red-800 mb-1 dark:text-red-400">{t('editor.errors.validationErrors')}:</h4>
                    <ul className="text-sm text-red-700 space-y-1 dark:text-red-300">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files Tab */}
          {currentTab === 'files' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('create.content.additionalFiles')}
                </h3>
                <button
                  onClick={handleAddFile}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors dark:bg-green-500 dark:hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                  {t('create.content.addFile')}
                </button>
              </div>

              {formData.additionalFiles.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-300">{t('create.content.noFiles')}</p>
                  <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    {t('create.content.noFilesHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.additionalFiles.map((file) => (
                    <div key={file.id} className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="text"
                            value={file.name}
                            onChange={(e) => handleFileChange(file.id, { name: e.target.value })}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400"
                            placeholder={t('create.content.fileName')}
                          />
                          <input
                            type="text"
                            value={file.path}
                            onChange={(e) => handleFileChange(file.id, { path: e.target.value })}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400"
                            placeholder={t('create.content.filePath')}
                          />
                          <select
                            value={file.type}
                            onChange={(e) => handleFileChange(file.id, { 
                              type: e.target.value as 'markdown' | 'text' | 'script' | 'template' | 'other'
                            })}
                            className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400"
                          >
                            <option value="markdown">{t('create.content.fileType.markdown')}</option>
                            <option value="text">{t('create.content.fileType.text')}</option>
                            <option value="script">{t('create.content.fileType.script')}</option>
                            <option value="template">{t('create.content.fileType.template')}</option>
                            <option value="other">{t('create.content.fileType.other')}</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={file.content}
                        onChange={(e) => handleFileChange(file.id, { content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                        placeholder={t('create.content.fileContent')}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Tool Selector Modal */}
      <UnifiedToolSelector
        isOpen={showToolSelector}
        onClose={() => setShowToolSelector(false)}
        selectedRegularTools={selectedRegularTools}
        onRegularToolsChange={setSelectedRegularTools}
        selectedMcpTools={selectedMcpTools}
        onMcpToolsChange={setSelectedMcpTools}
        mcpToolsEnabled={mcpToolsEnabled}
        onMcpEnabledChange={setMcpToolsEnabled}
      />
    </div>
  );
};

function parseSkillContent(content: string): { name?: string; description?: string; allowedTools?: string[] } | null {
  try {
    // Extract YAML frontmatter
    const yamlMatch = content.match(/^---\s*\n(.*?)\n---/s);
    if (!yamlMatch) return null;
    
    const yamlContent = yamlMatch[1];
    const lines = yamlContent.split('\n');
    const parsed: { name?: string; description?: string; allowedTools?: string[] } = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('name:')) {
        parsed.name = trimmedLine.replace('name:', '').trim();
        // Keep slug format as is, don't convert to readable format
      } else if (trimmedLine.startsWith('description:')) {
        parsed.description = trimmedLine.replace('description:', '').trim();
      } else if (trimmedLine.startsWith('allowed-tools:')) {
        const toolsStr = trimmedLine.replace('allowed-tools:', '').trim();
        if (toolsStr.startsWith('[') && toolsStr.endsWith(']')) {
          const toolsArray = toolsStr.slice(1, -1).split(',').map(tool => 
            tool.trim().replace(/^"(.*)"$/, '$1')
          ).filter(tool => tool.length > 0);
          parsed.allowedTools = toolsArray;
        }
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to parse skill content:', error);
    return null;
  }
}

function generateSkillContent(name: string, description: string, allowedTools: string[]): string {
  const allowedToolsYaml = allowedTools.length > 0 
    ? `\nallowed-tools: [${allowedTools.map(tool => `"${tool}"`).join(', ')}]`
    : '';

  // Convert slug back to readable title for the markdown content
  const readableName = name.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return `---
name: ${name}
description: ${description}${allowedToolsYaml}
---

# ${readableName}

## Description
${description}

## Instructions
Provide clear, step-by-step guidance for Claude on how to use this skill.

## Examples
Show concrete examples of using this skill.
`;
}