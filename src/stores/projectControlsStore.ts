import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  ProjectControlsBaseline,
  ProjectControlsSnapshot,
} from '@/domain/projectControls';

interface ProjectControlsState {
  baselines: ProjectControlsBaseline[];
  snapshots: ProjectControlsSnapshot[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  setBaseline: (baseline: ProjectControlsBaseline) => Promise<void>;
  addSnapshot: (snapshot: ProjectControlsSnapshot) => Promise<void>;
}

export const useProjectControlsStore = create<ProjectControlsState>()(
  immer(
    persist(
      (set) => ({
        baselines: [],
        snapshots: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [baselines, snapshots] = await Promise.all([
            db.projectControlsBaselines.where({ projectId }).toArray(),
            db.projectControlsSnapshots.where({ projectId }).toArray(),
          ]);
          set((s) => {
            s.baselines = baselines;
            s.snapshots = snapshots.sort(
              (a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime()
            );
            s.isLoading = false;
          });
        },

        setBaseline: async (baseline) => {
          await db.projectControlsBaselines.put(baseline);
          set((s) => {
            const idx = s.baselines.findIndex((b) => b.id === baseline.id);
            if (idx >= 0) s.baselines[idx] = baseline;
            else s.baselines.push(baseline);
          });
        },

        addSnapshot: async (snapshot) => {
          await db.projectControlsSnapshots.add(snapshot);
          set((s) => { s.snapshots.unshift(snapshot) });
        },
      }),
      {
        name: 'budget-engineer-project-controls',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
