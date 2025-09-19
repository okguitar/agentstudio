export interface Slide {
  path: string;
  title: string;
  exists: boolean;
  index: number;
}

export interface SlidesResponse {
  slides: Slide[];
  total: number;
  title: string;
}

export interface SlideContent {
  content: string;
  path: string;
  index: number;
}

export interface ToolUsageData {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  toolUseResult?: Record<string, unknown>; // 包含 structuredPatch 等详细信息
  isError?: boolean;
  isExecuting?: boolean;
  claudeId?: string; // Claude's tool use ID for matching with results
}

export interface ImageData {
  id: string;
  data: string; // base64 encoded image data
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  filename?: string;
}

export interface MessagePart {
  id: string;
  type: 'text' | 'tool' | 'image' | 'command';
  content?: string;
  toolData?: ToolUsageData;
  imageData?: ImageData;
  order: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  images?: ImageData[];
  toolUsage?: ToolUsageData[];
  messageParts?: MessagePart[];
}

export interface ChatContext {
}

export interface AIProvider {
  provider: string;
  models: string[];
}

export interface AIModelsResponse {
  models: AIProvider[];
  available: boolean;
}

// Agent types (re-exported)
export interface AgentTool {
  name: string;
  enabled: boolean;
  permissions?: {
    requireConfirmation?: boolean;
    allowedPaths?: string[];
    blockedPaths?: string[];
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  systemPrompt: string;
  maxTurns: number;
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
  allowedTools: AgentTool[];
  ui: {
    icon: string;
    primaryColor: string;
    headerTitle: string;
    headerDescription: string;
    welcomeMessage?: string; // Custom welcome message instead of title + description
    componentType: 'slides' | 'chat' | 'documents' | 'code' | 'custom';
    customComponent?: string;
  };
  workingDirectory?: string;
  dataDirectory?: string;
  fileTypes?: string[];
  author: string;
  homepage?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  projects?: string[]; // List of working directories where this agent has been used
  enabled: boolean;
}

export interface AgentSession {
  id: string;
  agentId: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  messages: AgentMessage[];
  claudeSessionId?: string | null;
  customData?: Record<string, unknown>;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  images?: ImageData[];
  messageParts?: MessagePart[];
  agentId: string;
}

// Re-export for compatibility
export type { Slide as SlideType, ChatMessage as ChatMessageType };