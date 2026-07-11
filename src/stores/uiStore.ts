import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AppTheme } from '@/types';
import type { StageId } from '@/lib/studio/stageRegistry';

export type ActiveView = number | StageId | 'history' | 'governance' | 'snapshots' | 'properties';

/** Converts numeric stage (1-6) to semantic StageId for the ARCH discipline order */
const NUM_TO_STAGE_ID: StageId[] = ['brief', 'concept', 'design', 'engineering', 'docs-bim', 'cost-deliver'];

function numericToStageId(n: number): StageId {
  return NUM_TO_STAGE_ID[n - 1] ?? 'brief';
}

interface UIState {
  theme: AppTheme;
  resolvedTheme: 'dark' | 'light';
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  boqPanelOpen: boolean;
  aiChatOpen: boolean;
  shortcutsOpen: boolean;
  /** @deprecated Use activeStageId instead */
  activeStage: number;
  activeStageId: StageId;
  activeView: ActiveView;
  journeyGuideOpen: boolean;
  selectedDesignId: string | null;
  hasSeenTour: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleSidebar: () => void;
  togglePropertiesPanel: () => void;
  toggleBoqPanel: () => void;
  toggleAiChat: () => void;
  toggleShortcutsHelp: () => void;
  /** Accepts number (legacy) or StageId (preferred) */
  setActiveStage: (stage: number | StageId) => void;
  setActiveView: (view: ActiveView) => void;
  toggleJourneyGuide: () => void;
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
        activeStageId: 'brief' as StageId,
        activeView: 1,
        journeyGuideOpen: false,
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
            if (typeof stage === 'number') {
              s.activeStage = stage;
              s.activeStageId = numericToStageId(stage);
            } else {
              s.activeStageId = stage;
              s.activeStage = NUM_TO_STAGE_ID.indexOf(stage) + 1 || 1;
            }
          }),
        setActiveView: (view) =>
          set((s) => {
            s.activeView = view;
            if (typeof view === 'number') {
              s.activeStage = view;
              s.activeStageId = numericToStageId(view);
            }
          }),
        toggleJourneyGuide: () =>
          set((s) => {
            s.journeyGuideOpen = !s.journeyGuideOpen;
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
        partialize: (state) => ({ theme: state.theme, hasSeenTour: state.hasSeenTour, activeStageId: state.activeStageId }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          const resolved = resolveTheme(state.theme);
          applyThemeClass(resolved);
          state.resolvedTheme = resolved;
          if (state.activeStageId) {
            const idx = NUM_TO_STAGE_ID.indexOf(state.activeStageId);
            state.activeStage = idx >= 0 ? idx + 1 : 1;
          }
        },
      }
    )
  )
);
