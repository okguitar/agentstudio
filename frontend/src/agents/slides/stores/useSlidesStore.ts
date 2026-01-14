import { create } from 'zustand';
import type { Slide } from '../../../types/index.js';

interface SlidesState {
  // Slides业务状态
  slides: Slide[];
  currentSlideIndex: number | null;
  selectedSlides: number[];
  
  // Slides UI状态
  previewZoom: number;
  
  // Slides Actions
  setSlides: (slides: Slide[]) => void;
  setCurrentSlide: (index: number | null) => void;
  toggleSlideSelection: (index: number) => void;
  clearSlideSelection: () => void;
  
  // UI Actions
  setPreviewZoom: (zoom: number) => void;
  
  // Utility Actions
  reset: () => void;
}

export const useSlidesStore = create<SlidesState>((set) => ({
  // Initial state
  slides: [],
  currentSlideIndex: null,
  selectedSlides: [],
  previewZoom: 1.0,

  // Slides Actions
  setSlides: (slides) => set({ slides }),
  
  setCurrentSlide: (index) => set({ currentSlideIndex: index }),
  
  toggleSlideSelection: (index) => set((state) => ({
    selectedSlides: state.selectedSlides.includes(index)
      ? state.selectedSlides.filter(i => i !== index)
      : [...state.selectedSlides, index]
  })),
  
  clearSlideSelection: () => set({ selectedSlides: [] }),

  // UI Actions
  setPreviewZoom: (zoom) => set({ previewZoom: zoom }),

  // Utility Actions
  reset: () => set({
    slides: [],
    currentSlideIndex: null,
    selectedSlides: [],
    previewZoom: 1.0,
  }),
}));
