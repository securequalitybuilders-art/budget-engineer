import { create } from 'zustand'

export interface ComponentSelectionStore {
  selectedDoorSpec: string | null
  selectedWindowSpec: string | null
  setSelectedDoorSpec: (code: string | null) => void
  setSelectedWindowSpec: (code: string | null) => void
  clearSelection: () => void
}

export const useComponentSelectionStore = create<ComponentSelectionStore>((set) => ({
  selectedDoorSpec: null,
  selectedWindowSpec: null,
  setSelectedDoorSpec: (code) => set({ selectedDoorSpec: code, selectedWindowSpec: null }),
  setSelectedWindowSpec: (code) => set({ selectedWindowSpec: code, selectedDoorSpec: null }),
  clearSelection: () => set({ selectedDoorSpec: null, selectedWindowSpec: null }),
}))
