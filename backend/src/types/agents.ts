// Agent configuration types
import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk';

export interface AgentTool {
  name: string;
  enabled: boolean;
  permissions?: {
    requireConfirmation?: boolean;
    allowedPaths?: string[];
    blockedPaths?: string[];
  };
}

// 新的提示词结构定义
export interface PresetSystemPrompt {
  type: 'preset';
  preset: 'claude_code'; // 固定为 claude_code，用于兼容 Claude Code SDK
  append?: string;
}

export type SystemPrompt = string | PresetSystemPrompt;

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;

  // AI configuration
  systemPrompt: SystemPrompt;
  maxTurns: number;
  permissionMode: PermissionMode;  // 使用 SDK 类型
  model: string;
  
  // Available tools
  allowedTools: AgentTool[];
  
  // UI configuration
  ui: {
    icon: string;
    headerTitle: string;
    headerDescription: string;
    welcomeMessage?: string; // Custom welcome message instead of title + description
  };
  
  // File system integration
  workingDirectory?: string;
  dataDirectory?: string;
  fileTypes?: string[]; // Supported file extensions
  
  // Metadata
  author: string;
  homepage?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  
  // Enable/disable state
  enabled: boolean;
  
  // Project associations
  projects?: string[]; // Array of project paths associated with this agent
}

export interface AgentSession {
  id: string;
  agentId: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  messages: AgentMessage[];
  claudeVersionId?: string; // Claude version ID used for this session
  customData?: Record<string, unknown>;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: Array<{
    id: string;
    data: string;
    mediaType: string;
    filename?: string;
  }>;
  messageParts?: MessagePart[];
  agentId: string;
}

export interface MessagePart {
  id: string;
  type: 'text' | 'tool' | 'command' | 'compactSummary' | 'image' | 'thinking';
  content?: string;
  toolData?: {
    id: string;
    toolName: string;
    toolInput: any;  // 使用 any 以兼容所有工具类型
    toolResult?: string;
    toolUseResult?: any;  // 添加 toolUseResult 字段
    isExecuting: boolean;
    isError?: boolean;
    claudeId?: string; // Claude's tool use ID for matching with results
  };
  imageData?: {
    id: string;
    data: string;
    mediaType: string;
    filename?: string;
  };
  order: number;
  originalContent?: string; // For commands that need to preserve original content
}

// Built-in agents will be loaded from configuration files during initialization
// No hardcoded agents - all agent data should be stored in configuration files
// Example: ~/.claude-agent/agents/claude-code.json
export const BUILTIN_AGENTS: Partial<AgentConfig>[] = [];
