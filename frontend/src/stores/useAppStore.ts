import { create } from 'zustand';
import type { Slide, ChatMessage, ToolUsageData } from '../types/index.js';

interface AppState {
  // Slides state
  slides: Slide[];
  currentSlideIndex: number | null;
  selectedSlides: number[];
  
  // Chat state
  messages: ChatMessage[];
  isAiTyping: boolean;
  currentSessionId: string | null;
  
  // UI state
  sidebarCollapsed: boolean;
  previewZoom: number;
  
  // Actions
  setSlides: (slides: Slide[]) => void;
  setCurrentSlide: (index: number | null) => void;
  toggleSlideSelection: (index: number) => void;
  clearSlideSelection: () => void;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  addTextPartToMessage: (messageId: string, text: string) => void;
  addToolPartToMessage: (messageId: string, tool: Omit<ToolUsageData, 'id'>) => void;
  updateToolPartInMessage: (messageId: string, toolId: string, updates: Partial<ToolUsageData>) => void;
  addToolToMessage: (messageId: string, tool: Omit<ToolUsageData, 'id'>) => void;
  updateToolInMessage: (messageId: string, toolId: string, updates: Partial<ToolUsageData>) => void;
  setAiTyping: (typing: boolean) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  clearMessages: () => void;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPreviewZoom: (zoom: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  slides: [],
  currentSlideIndex: null,
  selectedSlides: [],
  
  messages: [
    {
      id: 'welcome',
      content: '你好！我是AI助手，可以帮助你编辑演示文稿。我可以帮你修改内容、调整样式、生成新的幻灯片等。有什么需要帮助的吗？',
      role: 'assistant',
      timestamp: new Date(),
      messageParts: []
    }
  ],
  isAiTyping: false,
  currentSessionId: null,
  
  sidebarCollapsed: false,
  previewZoom: 1,
  
  // Actions
  setSlides: (slides) => set({ slides }),
  
  setCurrentSlide: (index) => set({ currentSlideIndex: index }),
  
  toggleSlideSelection: (index) => set((state) => {
    const isSelected = state.selectedSlides.includes(index);
    const selectedSlides = isSelected
      ? state.selectedSlides.filter(i => i !== index)
      : [...state.selectedSlides, index];
    return { selectedSlides };
  }),
  
  clearSlideSelection: () => set({ selectedSlides: [] }),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        messageParts: []
      }
    ]
  })),
  
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
  })),
  
  addTextPartToMessage: (messageId, text) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId 
        ? {
            ...msg,
            messageParts: [
              ...(msg.messageParts || []),
              {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'text' as const,
                content: text,
                order: (msg.messageParts || []).length
              }
            ]
          }
        : msg
    )
  })),
  
  addToolPartToMessage: (messageId, tool) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId 
        ? {
            ...msg,
            messageParts: [
              ...(msg.messageParts || []),
              {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'tool' as const,
                toolData: {
                  ...tool,
                  id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                },
                order: (msg.messageParts || []).length
              }
            ]
          }
        : msg
    )
  })),
  
  updateToolPartInMessage: (messageId, toolId, updates) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId 
        ? {
            ...msg,
            messageParts: msg.messageParts?.map((part) =>
              part.type === 'tool' && part.toolData?.id === toolId
                ? {
                    ...part,
                    toolData: part.toolData ? { ...part.toolData, ...updates } : undefined
                  }
                : part
            )
          }
        : msg
    )
  })),
  
  addToolToMessage: (messageId, tool) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId 
        ? { 
            ...msg, 
            toolUsage: [
              ...(msg.toolUsage || []),
              {
                ...tool,
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              }
            ]
          } 
        : msg
    )
  })),
  
  updateToolInMessage: (messageId, toolId, updates) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId 
        ? {
            ...msg,
            toolUsage: msg.toolUsage?.map((tool) =>
              tool.id === toolId ? { ...tool, ...updates } : tool
            )
          }
        : msg
    )
  })),
  
  setAiTyping: (typing) => set({ isAiTyping: typing }),
  
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  
  clearMessages: () => set({ 
    messages: [get().messages[0]], // Keep welcome message
    currentSessionId: null // Reset session ID
  }),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  setPreviewZoom: (zoom) => set({ previewZoom: zoom })
}));