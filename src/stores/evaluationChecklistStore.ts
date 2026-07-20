import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { EVALUATION_CHECKLIST } from '@/lib/commercial/evaluationChecklist';

export interface ChecklistItemState {
  checked: boolean;
  notes: string;
}

interface EvaluationChecklistState {
  items: Record<string, ChecklistItemState>;
  toggleItem: (id: string) => void;
  setItemNotes: (id: string, notes: string) => void;
  resetAll: () => void;
  getCompletedCount: () => number;
  getTotalCount: () => number;
}

export const useEvaluationChecklistStore = create<EvaluationChecklistState>()(
  immer(
    persist(
      (set, get) => ({
        items: Object.fromEntries(
          EVALUATION_CHECKLIST.map(item => [item.id, { checked: false, notes: '' }])
        ),

        toggleItem: (id: string) => set((state) => {
          if (state.items[id]) {
            state.items[id].checked = !state.items[id].checked;
          }
        }),

        setItemNotes: (id: string, notes: string) => set((state) => {
          if (state.items[id]) {
            state.items[id].notes = notes;
          }
        }),

        resetAll: () => set((state) => {
          for (const key of Object.keys(state.items)) {
            state.items[key] = { checked: false, notes: '' };
          }
        }),

        getCompletedCount: () => {
          return Object.values(get().items).filter(i => i.checked).length;
        },

        getTotalCount: () => {
          return EVALUATION_CHECKLIST.length;
        },
      }),
      {
        name: 'budget-engineer-evaluation-checklist',
      }
    )
  )
);
