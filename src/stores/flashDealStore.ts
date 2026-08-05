import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FlashDeal {
  id: string;
  providerId: string;
  providerName: string;
  itemName: string;
  normalPriceCents: number;
  dealPriceCents: number;
  discountPct: number;
  expiresAt: string;
  active: boolean;
}

interface FlashDealStore {
  deals: FlashDeal[];
  add: (deal: Omit<FlashDeal, 'id' | 'active'>) => void;
  remove: (id: string) => void;
  toggleActive: (id: string) => void;
}

export const useFlashDealStore = create<FlashDealStore>()(
  persist(
    (set) => ({
      deals: [],
      add: (deal) =>
        set((s) => ({ deals: [...s.deals, { ...deal, id: crypto.randomUUID(), active: true }] })),
      remove: (id) => set((s) => ({ deals: s.deals.filter((d) => d.id !== id) })),
      toggleActive: (id) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, active: !d.active } : d)),
        })),
    }),
    { name: 'be-flash-deals' }
  )
);
