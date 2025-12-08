import { useState, useEffect } from 'react';
import type { AgentTool } from '../../types/index.js';

export interface UseToolSelectorProps {
  agent: any;
}

export const useToolSelector = ({ agent }: UseToolSelectorProps) => {
  // Tool selector state
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [selectedRegularTools, setSelectedRegularTools] = useState<string[]>([]);
  const [selectedMcpTools, setSelectedMcpTools] = useState<string[]>([]);
  const [mcpToolsEnabled, setMcpToolsEnabled] = useState(false);
  const [permissionMode, setPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('bypassPermissions');
  const [selectedModel, setSelectedModel] = useState<string>('sonnet');
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedClaudeVersion, setSelectedClaudeVersion] = useState<string | undefined>(undefined);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [isVersionLocked, setIsVersionLocked] = useState(false);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

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
        } else if (tool.name.startsWith('mcp__')) {
          // Already formatted MCP tool
          mcpTools.push(tool.name);
        } else {
          // Regular tool
          regularTools.push(tool.name);
        }
      });

      setSelectedRegularTools(regularTools);
      setSelectedMcpTools(mcpTools);
      setMcpToolsEnabled(mcpTools.length > 0);
    }
  }, [agent?.allowedTools]);

  return {
    // State values
    showToolSelector,
    selectedRegularTools,
    selectedMcpTools,
    mcpToolsEnabled,
    permissionMode,
    selectedModel,
    showPermissionDropdown,
    showModelDropdown,
    selectedClaudeVersion,
    showVersionDropdown,
    isVersionLocked,

    // State setters
    setShowToolSelector,
    setSelectedRegularTools,
    setSelectedMcpTools,
    setMcpToolsEnabled,
    setPermissionMode,
    setSelectedModel,
    setShowPermissionDropdown,
    setShowModelDropdown,
    setSelectedClaudeVersion,
    setShowVersionDropdown,
    setIsVersionLocked,
    envVars,
    setEnvVars,
  };
};