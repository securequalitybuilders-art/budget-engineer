import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SelectionItem {
  id: string;
  name: string;
  category: string;
  budgetAllowanceCents: number;
  actualCostCents: number;
}

interface SelectionsStore {
  items: SelectionItem[];
  add: (item: Omit<SelectionItem, 'id'>) => void;
  update: (id: string, patch: Partial<Omit<SelectionItem, 'id'>>) => void;
  remove: (id: string) => void;
}

export const useSelectionsStore = create<SelectionsStore>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: [...s.items, { ...item, id: crypto.randomUUID() }] })),
      update: (id, patch) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    }),
    { name: 'be-selections' }
  )
);
