import { create } from 'zustand'

export type LevelDisplayMode = 'stacked' | 'exploded' | 'solo'
export type CameraMode = 'perspective' | 'orthographic'

export interface ViewerSelection {
  buildingId: string | null
  levelId: string | null
  zoneId: string | null
  wallId: string | null
  itemId: string | null
}

export interface ViewerState {
  selection: ViewerSelection
  levelDisplayMode: LevelDisplayMode
  cameraMode: CameraMode
  explodedOffset: number

  setSelection: (sel: Partial<ViewerSelection>) => void
  clearSelection: () => void
  setLevelDisplayMode: (mode: LevelDisplayMode) => void
  setCameraMode: (mode: CameraMode) => void
  setExplodedOffset: (offset: number) => void
}

const INITIAL_SELECTION: ViewerSelection = {
  buildingId: null,
  levelId: null,
  zoneId: null,
  wallId: null,
  itemId: null,
}

export const useViewer = create<ViewerState>()((set) => ({
  selection: { ...INITIAL_SELECTION },
  levelDisplayMode: 'stacked',
  cameraMode: 'perspective',
  explodedOffset: 3.0,

  setSelection: (sel) =>
    set((state) => ({
      selection: { ...state.selection, ...sel },
    })),

  clearSelection: () => set({ selection: { ...INITIAL_SELECTION } }),

  setLevelDisplayMode: (mode) => set({ levelDisplayMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setExplodedOffset: (offset) => set({ explodedOffset: offset }),
}))
