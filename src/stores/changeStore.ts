import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type { ChangeOrder, RFI, Submittal, SiteInspection, NCR, SnagItem as ChangeSnagItem } from '@/domain/change';

interface ChangeState {
  changeOrders: ChangeOrder[];
  rfis: RFI[];
  submittals: Submittal[];
  siteInspections: SiteInspection[];
  ncrs: NCR[];
  snagItems: ChangeSnagItem[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
}

export const useChangeStore = create<ChangeState>()(
  immer(
    persist(
      (set) => ({
        changeOrders: [],
        rfis: [],
        submittals: [],
        siteInspections: [],
        ncrs: [],
        snagItems: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [cos, rfis, subs, inspections, ncrs, snags] = await Promise.all([
            db.changeOrders.where({ projectId }).toArray(),
            db.rfis.where({ projectId }).toArray(),
            db.submittals.where({ projectId }).toArray(),
            db.siteInspections.where({ projectId }).toArray(),
            db.ncrs.where({ projectId }).toArray(),
            db.snagItems.where({ projectId }).toArray(),
          ]);
          set((s) => {
            s.changeOrders = cos;
            s.rfis = rfis;
            s.submittals = subs;
            s.siteInspections = inspections;
            s.ncrs = ncrs;
            s.snagItems = snags;
            s.isLoading = false;
          });
        },
      }),
      {
        name: 'budget-engineer-change',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
