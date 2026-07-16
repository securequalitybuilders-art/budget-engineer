import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { db } from '@/db/db';
import type { DeliveryProject, SheetInfo, ReleasePackage } from '@/domain/delivery';

interface DeliveryState {
  currentDelivery: DeliveryProject | null;
  isLoading: boolean;
  currentProjectId: string | null;

  loadForProject: (projectId: string) => Promise<void>;
  setDelivery: (delivery: DeliveryProject) => Promise<void>;
  addSheet: (sheet: SheetInfo) => Promise<void>;
  updateSheet: (sheetId: string, partial: Partial<SheetInfo>) => Promise<void>;
  addPackage: (pkg: ReleasePackage) => Promise<void>;
  updatePackageStatus: (packageId: string, status: ReleasePackage['status']) => Promise<void>;
}

export const useDeliveryStore = create<DeliveryState>()(
  immer(
    persist(
      (set, get) => ({
        currentDelivery: null,
        isLoading: false,
        currentProjectId: null,

        loadForProject: async (projectId) => {
          set((s) => { s.isLoading = true; s.currentProjectId = projectId });
          try {
            const delivery = await db.deliveryProjects.where({ projectId }).first() ?? null;
            set((s) => { s.currentDelivery = delivery as DeliveryProject | null });
          } catch {
            set((s) => { s.currentDelivery = null });
          }
          set((s) => { s.isLoading = false });
        },

        setDelivery: async (delivery) => {
          try {
            await db.deliveryProjects.put(delivery as never);
          } catch { /* Dexie write error — silently ignore */ }
          set((s) => { s.currentDelivery = delivery });
        },

        addSheet: async (sheet) => {
          const delivery = get().currentDelivery;
          if (!delivery) return;
          const updated = { ...delivery, sheets: [...delivery.sheets, sheet] };
          try {
            await db.deliveryProjects.put(updated as never);
          } catch { /* ignore */ }
          set((s) => { s.currentDelivery = updated });
        },

        updateSheet: async (sheetId, partial) => {
          const delivery = get().currentDelivery;
          if (!delivery) return;
          const sheets = delivery.sheets.map((s) =>
            s.id === sheetId ? { ...s, ...partial } : s
          );
          const updated = { ...delivery, sheets };
          try {
            await db.deliveryProjects.put(updated as never);
          } catch { /* ignore */ }
          set((s) => { s.currentDelivery = updated });
        },

        addPackage: async (pkg) => {
          const delivery = get().currentDelivery;
          if (!delivery) return;
          const updated = { ...delivery, packages: [...delivery.packages, pkg] };
          try {
            await db.deliveryProjects.put(updated as never);
          } catch { /* ignore */ }
          set((s) => { s.currentDelivery = updated });
        },

        updatePackageStatus: async (packageId, status) => {
          const delivery = get().currentDelivery;
          if (!delivery) return;
          const packages = delivery.packages.map((p) =>
            p.id === packageId ? { ...p, status } : p
          );
          const updated = { ...delivery, packages };
          try {
            await db.deliveryProjects.put(updated as never);
          } catch { /* ignore */ }
          set((s) => { s.currentDelivery = updated });
        },
      }),
      {
        name: 'budget-engineer-delivery',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currentProjectId: state.currentProjectId }),
      }
    )
  )
);
