import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type { Milestone } from '@/domain/milestone';
import { calculateMilestoneProgress, detectMilestoneDelay } from '@/engine/milestone/milestoneEngine';

interface MilestoneState {
  milestones: Milestone[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  setMilestone: (milestone: Milestone) => Promise<void>;
  addMilestone: (milestone: Milestone) => Promise<void>;
  removeMilestone: (id: string) => Promise<void>;
  getMilestoneProgress: () => number;
  getDelayedMilestones: (asOfDate: string) => Milestone[];
}

export const useMilestoneStore = create<MilestoneState>()(
  immer(
    persist(
      (set, get) => ({
        milestones: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const milestones = await db.milestones.where({ projectId }).toArray();
          milestones.sort((a, b) => a.order - b.order);
          set((s) => {
            s.milestones = milestones;
            s.isLoading = false;
          });
        },

        setMilestone: async (milestone) => {
          await db.milestones.put(milestone);
          set((s) => {
            const idx = s.milestones.findIndex((m) => m.id === milestone.id);
            if (idx >= 0) s.milestones[idx] = milestone;
            else s.milestones.push(milestone);
          });
        },

        addMilestone: async (milestone) => {
          await db.milestones.add(milestone);
          set((s) => { s.milestones.push(milestone) });
        },

        removeMilestone: async (id) => {
          await db.milestones.delete(id);
          set((s) => { s.milestones = s.milestones.filter((m) => m.id !== id) });
        },

        getMilestoneProgress: () => {
          const { milestones } = get();
          if (milestones.length === 0) return 0;
          const progress = milestones.reduce((sum, m) => sum + calculateMilestoneProgress(m), 0);
          return Math.round(progress / milestones.length);
        },

        getDelayedMilestones: (asOfDate) => {
          return get().milestones.filter((m) => detectMilestoneDelay(m, asOfDate) !== null);
        },
      }),
      {
        name: 'budget-engineer-milestones',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
