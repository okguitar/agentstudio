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
}

export interface AIProvider {
  provider: string;
  models: string[];
}

export interface AIModelsResponse {
  models: AIProvider[];
  available: boolean;
}

// Re-export for compatibility
export type { Slide as SlideType, ChatMessage as ChatMessageType };