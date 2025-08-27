import { create } from 'zustand';
import type { AgentConfig, AgentMessage, ToolUsageData } from '../types/index.js';

interface AgentState {
  // Current agent
  currentAgent: AgentConfig | null;
  
  // Agent-specific state
  currentItem: unknown;
  allItems: unknown[];
  customContext: Record<string, unknown>;
  
  // Chat state
  messages: AgentMessage[];
  isAiTyping: boolean;
  currentSessionId: string | null;
  
  // UI state
  sidebarCollapsed: boolean;
  previewZoom: number;
  
  // Actions
  setCurrentAgent: (agent: AgentConfig | null) => void;
  setCurrentItem: (item: unknown) => void;
  setAllItems: (items: unknown[]) => void;
  setCustomContext: (context: Record<string, unknown>) => void;
  
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp' | 'agentId'>) => void;
  updateMessage: (messageId: string, updates: Partial<AgentMessage>) => void;
  addTextPartToMessage: (messageId: string, text: string) => void;
  addToolPartToMessage: (messageId: string, tool: Omit<ToolUsageData, 'id'>) => void;
  updateToolPartInMessage: (messageId: string, toolId: string, updates: Partial<ToolUsageData>) => void;
  setAiTyping: (typing: boolean) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  clearMessages: () => void;
  loadSessionMessages: (messages: AgentMessage[]) => void;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPreviewZoom: (zoom: number) => void;
  
  // Context builders
  buildContext: () => Record<string, unknown>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  currentAgent: null,
  currentItem: null,
  allItems: [],
  customContext: {},
  
  messages: [],
  isAiTyping: false,
  currentSessionId: null,
  
  sidebarCollapsed: false,
  previewZoom: 1,
  
  // Actions
  setCurrentAgent: (agent) => set({ 
    currentAgent: agent,
    // Clear state when switching agents
    messages: [],
    currentSessionId: null,
    currentItem: null,
    allItems: [],
    customContext: {}
  }),
  
  setCurrentItem: (item) => set({ currentItem: item }),
  setAllItems: (items) => set({ allItems: items }),
  setCustomContext: (context) => set({ customContext: context }),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        agentId: state.currentAgent?.id || 'unknown',
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
            messageParts: msg.messageParts?.map((part: any) =>
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
  
  setAiTyping: (typing) => set({ isAiTyping: typing }),
  
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  
  clearMessages: () => set({ messages: [] }),
  
  loadSessionMessages: (messages) => set({ messages }),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  setPreviewZoom: (zoom) => set({ previewZoom: zoom }),
  
  // Context builders
  buildContext: () => {
    const state = get();
    const agent = state.currentAgent;
    
    if (!agent) return {};
    
    const baseContext = {
      currentItem: state.currentItem,
      allItems: state.allItems,
      customContext: state.customContext
    };
    
    // Agent-specific context building
    if (agent.ui.componentType === 'slides') {
      return {
        ...baseContext,
        currentSlide: typeof state.currentItem === 'number' ? state.currentItem : null,
        allSlides: Array.isArray(state.allItems) ? state.allItems : []
      };
    }
    
    return baseContext;
  }
}));