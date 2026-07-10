import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DisciplineId } from '@/lib/studio/discipline';
import { DISCIPLINES, DEFAULT_DISCIPLINE } from '@/lib/studio/discipline';

interface DisciplineState {
  currentDiscipline: DisciplineId;
  visibleDisciplines: DisciplineId[];
  disciplineFilter: DisciplineId | null;
  setCurrentDiscipline: (id: DisciplineId) => void;
  toggleDisciplineVisibility: (id: DisciplineId) => void;
  showAllDisciplines: () => void;
  hideAllDisciplines: () => void;
  setDisciplineFilter: (id: DisciplineId | null) => void;
}

export const useDisciplineStore = create<DisciplineState>()(
  immer(
    persist(
      (set) => ({
        currentDiscipline: DEFAULT_DISCIPLINE,
        visibleDisciplines: DISCIPLINES.map((d) => d.id),
        disciplineFilter: null,

        setCurrentDiscipline: (id) =>
          set((s) => {
            s.currentDiscipline = id;
          }),

        toggleDisciplineVisibility: (id) =>
          set((s) => {
            const idx = s.visibleDisciplines.indexOf(id);
            if (idx === -1) {
              s.visibleDisciplines.push(id);
            } else {
              s.visibleDisciplines.splice(idx, 1);
            }
          }),

        showAllDisciplines: () =>
          set((s) => {
            s.visibleDisciplines = DISCIPLINES.map((d) => d.id);
          }),

        hideAllDisciplines: () =>
          set((s) => {
            s.visibleDisciplines = [];
          }),

        setDisciplineFilter: (id) =>
          set((s) => {
            s.disciplineFilter = id;
          }),
      }),
      {
        name: 'budget-engineer-discipline',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          currentDiscipline: state.currentDiscipline,
          visibleDisciplines: state.visibleDisciplines,
        }),
      }
    )
  )
);
