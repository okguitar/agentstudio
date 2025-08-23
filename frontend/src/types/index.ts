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

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatContext {
  currentSlide?: number;
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