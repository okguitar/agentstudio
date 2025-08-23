import { create } from 'zustand';
import type { Slide, ChatMessage } from '../types/index.js';

interface AppState {
  // Slides state
  slides: Slide[];
  currentSlideIndex: number | null;
  selectedSlides: number[];
  
  // Chat state
  messages: ChatMessage[];
  isAiTyping: boolean;
  
  // UI state
  sidebarCollapsed: boolean;
  previewZoom: number;
  
  // Actions
  setSlides: (slides: Slide[]) => void;
  setCurrentSlide: (index: number | null) => void;
  toggleSlideSelection: (index: number) => void;
  clearSlideSelection: () => void;
  
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setAiTyping: (typing: boolean) => void;
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
      timestamp: new Date()
    }
  ],
  isAiTyping: false,
  
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
        id: Date.now().toString(),
        timestamp: new Date()
      }
    ]
  })),
  
  setAiTyping: (typing) => set({ isAiTyping: typing }),
  
  clearMessages: () => set({ 
    messages: [get().messages[0]] // Keep welcome message
  }),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  setPreviewZoom: (zoom) => set({ previewZoom: zoom })
}));