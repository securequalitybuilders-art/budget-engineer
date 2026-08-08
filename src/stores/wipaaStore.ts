import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import { deriveEscrowFromMilestones } from '@/engine/construction/executionSync';
import {
  computeWipaaSnapshot,
  monthKeyFor,
  sortSnapshotsDesc,
  type WipaaSnapshot,
} from '@/engine/payment/wipaaAutoRun';

export type AutoRolloverResult =
  | { ran: true; snapshot: WipaaSnapshot }
  | { ran: false; reason: 'no-data' | 'already-ran' | 'error' };

export interface WipaaRunOptions {
  now?: Date;
  costsIncurredToDateCents?: number;
  totalEstimatedCostsCents?: number;
}

interface WipaaState {
  snapshots: WipaaSnapshot[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  runAutoRollover: (projectId: string, options?: WipaaRunOptions) => Promise<AutoRolloverResult>;
  runManualSnapshot: (projectId: string, options?: WipaaRunOptions) => Promise<WipaaSnapshot | null>;
}

async function resolveEscrow(projectId: string) {
  const [milestones, escrows] = await Promise.all([
    db.milestones.where({ projectId }).toArray(),
    db.escrows.where({ projectId }).toArray(),
  ]);
  const escrow = escrows[0] ?? (milestones.length > 0 ? deriveEscrowFromMilestones(projectId, milestones) : null);
  return { milestones, escrow };
}

function upsertSnapshot(state: { snapshots: WipaaSnapshot[] }, snapshot: WipaaSnapshot) {
  const idx = state.snapshots.findIndex((s) => s.monthKey === snapshot.monthKey);
  if (idx >= 0) state.snapshots[idx] = snapshot;
  else state.snapshots.push(snapshot);
}

export const useWipaaStore = create<WipaaState>()(
  immer(
    persist(
      (set) => ({
        snapshots: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const snapshots = sortSnapshotsDesc(await db.wipaaSnapshots.where({ projectId }).toArray());
          set((s) => {
            s.snapshots = snapshots;
            s.isLoading = false;
          });
        },

        runAutoRollover: async (projectId, options = {}) => {
          try {
            const { milestones, escrow } = await resolveEscrow(projectId);
            if (!escrow) return { ran: false, reason: 'no-data' };
            const monthKey = monthKeyFor(options.now ?? new Date());
            const existing = await db.wipaaSnapshots.where({ projectId, monthKey }).first();
            if (existing) return { ran: false, reason: 'already-ran' };
            const snapshot = computeWipaaSnapshot(escrow, milestones, {
              asOf: (options.now ?? new Date()).toISOString(),
              source: 'auto',
              costsIncurredToDateCents: options.costsIncurredToDateCents,
              totalEstimatedCostsCents: options.totalEstimatedCostsCents,
            });
            await db.wipaaSnapshots.put(snapshot);
            set((s) => { upsertSnapshot(s, snapshot) });
            return { ran: true, snapshot };
          } catch {
            return { ran: false, reason: 'error' };
          }
        },

        runManualSnapshot: async (projectId, options = {}) => {
          const { milestones, escrow } = await resolveEscrow(projectId);
          if (!escrow) return null;
          const snapshot = computeWipaaSnapshot(escrow, milestones, {
            asOf: (options.now ?? new Date()).toISOString(),
            source: 'manual',
            costsIncurredToDateCents: options.costsIncurredToDateCents,
            totalEstimatedCostsCents: options.totalEstimatedCostsCents,
          });
          await db.wipaaSnapshots.put(snapshot);
          set((s) => {
            upsertSnapshot(s, snapshot);
            s.snapshots = sortSnapshotsDesc(s.snapshots);
          });
          return snapshot;
        },
      }),
      {
        name: 'budget-engineer-wipaa',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
