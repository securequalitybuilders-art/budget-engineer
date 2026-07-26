import { create } from 'zustand'
import type { BlockCategory, PlacedBlock } from '@/domain/furniture'

let nextId = 1
function uid(): string { return `blk-${nextId++}-${Date.now()}` }

export interface FurnitureStore {
  blocks: PlacedBlock[]
  activeDefId: string | null
  activeCategory: BlockCategory
  setActiveCategory: (cat: BlockCategory) => void
  setActiveDef: (defId: string | null) => void
  placeBlock: (defId: string, x: number, y: number, rotation?: number, roomId?: string) => void
  moveBlock: (instanceId: string, x: number, y: number) => void
  rotateBlock: (instanceId: string) => void
  removeBlock: (instanceId: string) => void
  clearAll: () => void
}

export const useFurnitureStore = create<FurnitureStore>((set) => ({
  blocks: [],
  activeDefId: null,
  activeCategory: 'furniture',

  setActiveCategory: (cat) => set({ activeCategory: cat, activeDefId: null }),

  setActiveDef: (defId) => set({ activeDefId: defId }),

  placeBlock: (defId, x, y, rotation = 0, roomId) =>
    set((s) => ({
      blocks: [
        ...s.blocks,
        { instanceId: uid(), defId, x, y, rotation, roomId, flipped: false },
      ],
    })),

  moveBlock: (instanceId, x, y) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.instanceId === instanceId ? { ...b, x, y } : b)),
    })),

  rotateBlock: (instanceId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.instanceId === instanceId ? { ...b, rotation: (b.rotation + 90) % 360 } : b,
      ),
    })),

  removeBlock: (instanceId) =>
    set((s) => ({ blocks: s.blocks.filter((b) => b.instanceId !== instanceId) })),

  clearAll: () => set({ blocks: [] }),
}))
