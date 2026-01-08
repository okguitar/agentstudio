import { useState, useEffect, useMemo } from 'react';
import { useClaudeVersions } from '../useClaudeVersions';

export interface UseClaudeVersionManagerProps {
  initialModel?: string;
  initialVersion?: string;
}

export const useClaudeVersionManager = ({
  initialModel = 'sonnet',
  initialVersion
}: UseClaudeVersionManagerProps) => {
  // Claude版本数据
  const { data: claudeVersionsData } = useClaudeVersions();
  
  // Version state
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [selectedClaudeVersion, setSelectedClaudeVersion] = useState<string | undefined>(initialVersion);
  const [isVersionLocked, setIsVersionLocked] = useState(false);

  // 根据选择的版本获取可用模型
  const availableModels = useMemo(() => {
    if (!claudeVersionsData?.versions) return [];

    // 如果选择了版本，返回该版本的模型
    if (selectedClaudeVersion) {
      const version = claudeVersionsData.versions.find(v => v.id === selectedClaudeVersion);
      const models = version?.models || [];
      console.log(`📦 availableModels computed: selectedClaudeVersion=${selectedClaudeVersion}, found version=${version?.name}, models=`, models.map(m => m.id));
      return models;
    }

    // 如果没有选择版本，使用默认版本的模型
    const defaultVersion = claudeVersionsData.versions.find(
      v => v.id === claudeVersionsData.defaultVersionId
    ) || claudeVersionsData.versions[0];

    const models = defaultVersion?.models || [];
    console.log(`📦 availableModels computed (using default): defaultVersion=${defaultVersion?.name}, models=`, models.map(m => m.id));
    return models;
  }, [claudeVersionsData, selectedClaudeVersion]);

  // 当可用模型变化时，确保当前选择的模型仍然有效
  useEffect(() => {
    if (availableModels.length > 0) {
      const currentModelValid = availableModels.some(m => m.id === selectedModel);
      if (!currentModelValid) {
        // 当前选择的模型不在可用列表中，切换到第一个可用模型
        console.log(`🔄 Model validation: selectedModel=${selectedModel} is not in availableModels:`, 
          availableModels.map(m => m.id), 
          `selectedClaudeVersion=${selectedClaudeVersion}, resetting to ${availableModels[0].id}`);
        setSelectedModel(availableModels[0].id);
      }
    }
  }, [availableModels, selectedModel, selectedClaudeVersion]);

  // Version change handler
  const handleVersionChange = (versionId: string) => {
    setSelectedClaudeVersion(versionId);
    // Reset model to first available in new version
    const version = claudeVersionsData?.versions.find(v => v.id === versionId);
    if (version && version.models && version.models.length > 0) {
      setSelectedModel(version.models[0].id);
    }
  };

  // Model change handler
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  // Reset to default
  const resetToDefaults = () => {
    setSelectedClaudeVersion(undefined);
    setSelectedModel(initialModel);
    setIsVersionLocked(false);
  };

  return {
    // Data
    claudeVersionsData,
    availableModels,
    
    // State
    selectedModel,
    selectedClaudeVersion,
    isVersionLocked,
    
    // State setters
    setSelectedModel,
    setSelectedClaudeVersion,
    setIsVersionLocked,
    
    // Actions
    handleVersionChange,
    handleModelChange,
    resetToDefaults,
  };
};