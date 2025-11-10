import { useState, useEffect, useMemo } from 'react';
import { useClaudeVersions } from '../useClaudeVersions';
import type { AgentConfig, AgentTool } from '../../types/index.js';

export interface UseChatToolbarProps {
  agent: AgentConfig;
}

export const useChatToolbar = ({ agent }: UseChatToolbarProps) => {
  // Tool selection state
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedRegularTools, setSelectedRegularTools] = useState<string[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);

  // Settings state
  const [permissionMode, setPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('bypassPermissions');
  const [selectedModel, setSelectedModel] = useState<string>('sonnet');
  const [selectedClaudeVersion, setSelectedClaudeVersion] = useState<string | undefined>(undefined);

  // Dropdown states
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMcpStatusModal, setShowMcpStatusModal] = useState(false);

  // Version lock state
  const [isVersionLocked, setIsVersionLocked] = useState(false);

  // Claude versions data
  const { data: claudeVersionsData } = useClaudeVersions();

  // 根据选择的版本获取可用模型
  const availableModels = useMemo(() => {
    if (!claudeVersionsData?.versions) return [];

    // 如果选择了版本，返回该版本的模型
    if (selectedClaudeVersion) {
      const version = claudeVersionsData.versions.find(v => v.id === selectedClaudeVersion);
      return version?.models || [];
    }

    // 如果没有选择版本，使用默认版本的模型
    const defaultVersion = claudeVersionsData.versions.find(
      v => v.id === claudeVersionsData.defaultVersionId
    ) || claudeVersionsData.versions[0];

    return defaultVersion?.models || [];
  }, [claudeVersionsData, selectedClaudeVersion]);

  // 当可用模型变化时，确保当前选择的模型仍然有效
  useEffect(() => {
    if (availableModels.length > 0) {
      const currentModelValid = availableModels.some(m => m.id === selectedModel);
      if (!currentModelValid) {
        // 当前选择的模型不在可用列表中，切换到第一个可用模型
        setSelectedModel(availableModels[0].id);
      }
    }
  }, [availableModels, selectedModel]);

  // Initialize tool selector with agent's preset tools
  useEffect(() => {
    if (agent?.allowedTools?.length > 0) {
      const enabledTools = agent.allowedTools.filter((tool: AgentTool) => tool.enabled);

      // Separate regular tools and MCP tools
      const regularTools: string[] = [];
      const mcpTools: string[] = [];

      enabledTools.forEach((tool: AgentTool) => {
        if (tool.name.includes('.') && !tool.name.startsWith('mcp__')) {
          // MCP tool format: serverName.toolName -> mcp__serverName__toolName
          const [serverName, toolName] = tool.name.split('.');
          const mcpToolId = `mcp__${serverName}__${toolName}`;
          mcpTools.push(mcpToolId);
        } else if (!tool.name.startsWith('mcp__')) {
          // Regular tool
          regularTools.push(tool.name);
        } else {
          // Already in mcp__ format
          mcpTools.push(tool.name);
        }
      });

      // Initialize selected tools with agent's preset tools
      setSelectedRegularTools(prev => {
        const newTools = [...new Set([...prev, ...regularTools])];
        return newTools;
      });

      if (mcpTools.length > 0) {
        setMcpToolsEnabled(true);
        setSelectedMcpTools(prev => {
          const newTools = [...new Set([...prev, ...mcpTools])];
          return newTools;
        });
      }
    }
  }, [agent?.allowedTools]);

  // Get all selected tools
  const getAllSelectedTools = () => {
    return [
      ...selectedRegularTools,
      ...(mcpToolsEnabled ? selectedMcpTools : [])
    ];
  };

  return {
    // Tool selection
    showToolSelector,
    selectedRegularTools,
    selectedMcpTools,
    mcpToolsEnabled,
    setShowToolSelector,
    setSelectedRegularTools,
    setSelectedMcpTools,
    setMcpToolsEnabled,

    // Settings
    permissionMode,
    selectedModel,
    selectedClaudeVersion,
    setPermissionMode,
    setSelectedModel,
    setSelectedClaudeVersion,

    // Dropdowns
    showPermissionDropdown,
    showModelDropdown,
    showVersionDropdown,
    showMobileSettings,
    showMcpStatusModal,
    setShowPermissionDropdown,
    setShowModelDropdown,
    setShowVersionDropdown,
    setShowMobileSettings,
    setShowMcpStatusModal,

    // Version lock
    isVersionLocked,
    setIsVersionLocked,

    // Claude versions
    claudeVersionsData,
    availableModels,

    // Helpers
    getAllSelectedTools
  };
};
