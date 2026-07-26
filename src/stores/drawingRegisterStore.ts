import { create } from 'zustand'
import {
  generateDefaultRegister,
  updateSheetRevision,
  sheetByView,
  sheetsByDiscipline,
  sheetsByStatus,
  type DrawingRegisterSheet,
  type DrawingTabId,
  type SheetStatus,
  type DisciplineCode,
  type DrawingTypeDef,
  type SheetSize,
} from '@/lib/drawings/drawing-register'
import type { DesignOption } from '@/domain/boq'

interface FilterState {
  discipline: DisciplineCode | 'ALL'
  status: SheetStatus | 'ALL'
}

interface DrawingRegisterState {
  sheets: DrawingRegisterSheet[]
  activeSheetId: string | null
  filter: FilterState
}

interface DrawingRegisterActions {
  initialize: (opts: {
    floorCount: number
    floorNames?: string[]
    includeTypes?: DrawingTypeDef[]
    revision?: string
    sheetSize?: SheetSize
  }) => void
  initializeFromDesign: (design: DesignOption) => void
  setSheetStatus: (id: string, status: SheetStatus, errorMessage?: string) => void
  setActiveSheet: (id: string | null) => void
  updateRevision: (id: string, newRev: string, note?: string) => void
  setFilter: (filter: Partial<FilterState>) => void
  markGenerated: (viewId: DrawingTabId, floorIndex?: number) => void
  clearAll: () => void
}

type DrawingRegisterStore = DrawingRegisterState & DrawingRegisterActions

export const useDrawingRegisterStore = create<DrawingRegisterStore>((set, get) => ({
  sheets: [],
  activeSheetId: null,
  filter: { discipline: 'ALL', status: 'ALL' },

  initialize: (opts) => {
    const sheets = generateDefaultRegister(opts)
    set({ sheets })
  },

  initializeFromDesign: (design) => {
    const sheets = generateDefaultRegister({
      floorCount: design.floors ?? 1,
      revision: 'A',
      sheetSize: 'A4',
    })
    set({ sheets })
  },

  setSheetStatus: (id, status, errorMessage) => {
    set((s) => ({
      sheets: s.sheets.map((sh) =>
        sh.id === id ? { ...sh, status, errorMessage, updatedAt: new Date().toISOString() } : sh
      ),
    }))
  },

  setActiveSheet: (id) => {
    set({ activeSheetId: id })
  },

  updateRevision: (id, newRev, note) => {
    set((s) => ({
      sheets: s.sheets.map((sh) => (sh.id === id ? updateSheetRevision(sh, newRev, note) : sh)),
    }))
  },

  setFilter: (f) => {
    set((s) => ({ filter: { ...s.filter, ...f } }))
  },

  markGenerated: (viewId, floorIndex) => {
    const state = get()
    const sheet = sheetByView(state.sheets, viewId, floorIndex)
    if (sheet) {
      set((s) => ({
        sheets: s.sheets.map((sh) =>
          sh.id === sheet.id ? { ...sh, status: 'generated' as SheetStatus, updatedAt: new Date().toISOString() } : sh
        ),
      }))
    }
  },

  clearAll: () => {
    set({ sheets: [], activeSheetId: null })
  },
}))

export function getFilteredSheets(sheets: DrawingRegisterSheet[], filter: FilterState): DrawingRegisterSheet[] {
  let result = sheets
  if (filter.discipline !== 'ALL') {
    result = sheetsByDiscipline(result, filter.discipline)
  }
  if (filter.status !== 'ALL') {
    result = sheetsByStatus(result, filter.status)
  }
  return result
}
