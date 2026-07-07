import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AppTheme } from '@/types';

interface UIState {
  theme: AppTheme;
  resolvedTheme: 'dark' | 'light';
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  boqPanelOpen: boolean;
  aiChatOpen: boolean;
  shortcutsOpen: boolean;
  activeStage: number;
  selectedDesignId: string | null;
  hasSeenTour: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  toggleBoqPanel: () => void;
  toggleAiChat: () => void;
  toggleShortcutsHelp: () => void;
  setActiveStage: (stage: number) => void;
  setSelectedDesignId: (id: string | null) => void;
  setHasSeenTour: (seen: boolean) => void;
}

function resolveTheme(theme: AppTheme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyThemeClass(theme: 'dark' | 'light') {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export const useUIStore = create<UIState>()(
  immer(
    persist(
      (set) => ({
        theme: 'dark',
        resolvedTheme: 'dark',
        sidebarOpen: true,
        propertiesPanelOpen: true,
        boqPanelOpen: true,
        aiChatOpen: false,
        shortcutsOpen: false,
        activeStage: 1,
        selectedDesignId: null,
        hasSeenTour: false,

        setTheme: (theme) => {
          const resolved = resolveTheme(theme);
          applyThemeClass(resolved);
          set((s) => {
            s.theme = theme;
            s.resolvedTheme = resolved;
          });
        },

        toggleSidebar: () =>
          set((s) => {
            s.sidebarOpen = !s.sidebarOpen;
          }),
        togglePropertiesPanel: () =>
          set((s) => {
            s.propertiesPanelOpen = !s.propertiesPanelOpen;
          }),
        toggleBoqPanel: () =>
          set((s) => {
            s.boqPanelOpen = !s.boqPanelOpen;
          }),
        toggleAiChat: () =>
          set((s) => {
            s.aiChatOpen = !s.aiChatOpen;
          }),
        toggleShortcutsHelp: () =>
          set((s) => {
            s.shortcutsOpen = !s.shortcutsOpen;
          }),
        setActiveStage: (stage) =>
          set((s) => {
            s.activeStage = stage;
          }),
        setSelectedDesignId: (id) =>
          set((s) => {
            s.selectedDesignId = id;
          }),
        setHasSeenTour: (seen) =>
          set((s) => {
            s.hasSeenTour = seen;
          }),
      }),
      {
        name: 'budget-engineer-ui-state',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ theme: state.theme, hasSeenTour: state.hasSeenTour }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          const resolved = resolveTheme(state.theme);
          applyThemeClass(resolved);
          state.resolvedTheme = resolved;
        },
      }
    )
  )
);
