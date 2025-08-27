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
  isError?: boolean;
  isExecuting?: boolean;
  claudeId?: string; // Claude's tool use ID for matching with results
}

export interface MessagePart {
  id: string;
  type: 'text' | 'tool';
  content?: string;
  toolData?: ToolUsageData;
  order: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  toolUsage?: ToolUsageData[];
  messageParts?: MessagePart[];
}

export interface ChatContext {
  currentSlide?: number | null;
  slideContent?: string;
  allSlides?: Slide[];
  // Generic context for other agent types
  currentItem?: unknown;
  allItems?: unknown[];
  customContext?: Record<string, unknown>;
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
  permissionMode: 'ask' | 'acceptEdits' | 'acceptAll';
  allowedTools: AgentTool[];
  ui: {
    icon: string;
    primaryColor: string;
    headerTitle: string;
    headerDescription: string;
    componentType: 'slides' | 'chat' | 'documents' | 'code' | 'custom';
    customComponent?: string;
  };
  workingDirectory?: string;
  dataDirectory?: string;
  fileTypes?: string[];
  contextBuilders?: {
    currentItem?: (state: unknown) => unknown;
    allItems?: (state: unknown) => unknown[];
    customContext?: (state: unknown) => Record<string, unknown>;
  };
  author: string;
  homepage?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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
  messageParts?: MessagePart[];
  agentId: string;
}

// Re-export for compatibility
export type { Slide as SlideType, ChatMessage as ChatMessageType };