import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type {
  CompletionStage,
  SnagList,
  HandoverPackage,
  AssetRegisterItem,
  WarrantyRecord,
  OAndMRecord,
} from '@/domain/handover';

interface HandoverState {
  completionStages: CompletionStage[];
  snagLists: SnagList[];
  handoverPackages: HandoverPackage[];
  assetRegister: AssetRegisterItem[];
  warrantyRecords: WarrantyRecord[];
  oAndMRecords: OAndMRecord[];
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  setCompletionStage: (stage: CompletionStage) => Promise<void>;
  setSnagList: (list: SnagList) => Promise<void>;
  setHandoverPackage: (pkg: HandoverPackage) => Promise<void>;
  addAssetItem: (item: AssetRegisterItem) => Promise<void>;
  setWarrantyRecord: (record: WarrantyRecord) => Promise<void>;
  setOAndMRecord: (record: OAndMRecord) => Promise<void>;
}

export const useHandoverStore = create<HandoverState>()(
  immer(
    persist(
      (set) => ({
        completionStages: [],
        snagLists: [],
        handoverPackages: [],
        assetRegister: [],
        warrantyRecords: [],
        oAndMRecords: [],
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          const [stages, snagLists, packages, assets, warranties, oandms] = await Promise.all([
            db.completionStages.where({ projectId }).toArray(),
            db.snagLists.where({ projectId }).toArray(),
            db.handoverPackages.where({ projectId }).toArray(),
            db.assetRegister.where({ projectId }).toArray(),
            db.warrantyRecords.where({ projectId }).toArray(),
            db.oAndMRecords.where({ projectId }).toArray(),
          ]);
          set((s) => {
            s.completionStages = stages;
            s.snagLists = snagLists;
            s.handoverPackages = packages;
            s.assetRegister = assets;
            s.warrantyRecords = warranties;
            s.oAndMRecords = oandms;
            s.isLoading = false;
          });
        },

        setCompletionStage: async (stage) => {
          await db.completionStages.put(stage);
          set((s) => {
            const idx = s.completionStages.findIndex((c) => c.id === stage.id);
            if (idx >= 0) s.completionStages[idx] = stage;
            else s.completionStages.push(stage);
          });
        },

        setSnagList: async (list) => {
          await db.snagLists.put(list);
          set((s) => {
            const idx = s.snagLists.findIndex((l) => l.id === list.id);
            if (idx >= 0) s.snagLists[idx] = list;
            else s.snagLists.push(list);
          });
        },

        setHandoverPackage: async (pkg) => {
          await db.handoverPackages.put(pkg);
          set((s) => {
            const idx = s.handoverPackages.findIndex((p) => p.id === pkg.id);
            if (idx >= 0) s.handoverPackages[idx] = pkg;
            else s.handoverPackages.push(pkg);
          });
        },

        addAssetItem: async (item) => {
          await db.assetRegister.add(item);
          set((s) => { s.assetRegister.push(item) });
        },

        setWarrantyRecord: async (record) => {
          await db.warrantyRecords.put(record);
          set((s) => {
            const idx = s.warrantyRecords.findIndex((w) => w.id === record.id);
            if (idx >= 0) s.warrantyRecords[idx] = record;
            else s.warrantyRecords.push(record);
          });
        },

        setOAndMRecord: async (record) => {
          await db.oAndMRecords.put(record);
          set((s) => {
            const idx = s.oAndMRecords.findIndex((o) => o.id === record.id);
            if (idx >= 0) s.oAndMRecords[idx] = record;
            else s.oAndMRecords.push(record);
          });
        },
      }),
      {
        name: 'budget-engineer-handover',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
