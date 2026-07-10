import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PresentationBoard, BoardCell, BoardAnnotation, BoardSnapshotRef, BoardTemplateId } from '@/domain/presentation'
import { getDefaultCells } from '@/lib/presentation/boardLayout'
import { uuid } from '@/lib/utils'

interface PresentationState {
  boards: PresentationBoard[]
  activeBoardId: string | null
  editingAnnotationId: string | null
}

interface PresentationActions {
  createBoard: (projectId: string, name: string, templateId: BoardTemplateId) => string
  deleteBoard: (id: string) => void
  renameBoard: (id: string, name: string) => void
  setActiveBoard: (id: string | null) => void
  updateCell: (boardId: string, cellId: string, patch: Partial<BoardCell>) => void
  addAnnotation: (boardId: string, annotation: BoardAnnotation) => void
  updateAnnotation: (boardId: string, annotationId: string, patch: Partial<BoardAnnotation>) => void
  removeAnnotation: (boardId: string, annotationId: string) => void
  setEditingAnnotation: (id: string | null) => void
  addSnapshot: (boardId: string, snapshot: BoardSnapshotRef) => void
  removeSnapshot: (boardId: string, snapshotId: string) => void
  duplicateBoard: (id: string) => string | null
  getActiveBoard: () => PresentationBoard | undefined
}

export const usePresentationStore = create<PresentationState & PresentationActions>()(
  immer(
    persist(
      (set, get) => ({
        boards: [],
        activeBoardId: null,
        editingAnnotationId: null,

        createBoard: (projectId, name, templateId) => {
          const id = uuid()
          const cells = getDefaultCells(templateId)
          const now = Date.now()
          set((s) => {
            s.boards.push({
              id,
              projectId,
              name,
              templateId,
              cells,
              annotations: [],
              snapshots: [],
              sheetSize: 'A1',
              landscape: true,
              createdAt: now,
              updatedAt: now,
            })
            s.activeBoardId = id
          })
          return id
        },

        deleteBoard: (id) => {
          set((s) => {
            s.boards = s.boards.filter((b) => b.id !== id)
            if (s.activeBoardId === id) s.activeBoardId = null
          })
        },

        renameBoard: (id, name) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === id)
            if (board) {
              board.name = name
              board.updatedAt = Date.now()
            }
          })
        },

        setActiveBoard: (id) => {
          set((s) => { s.activeBoardId = id })
        },

        updateCell: (boardId, cellId, patch) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === boardId)
            if (!board) return
            const cell = board.cells.find((c) => c.id === cellId)
            if (cell) Object.assign(cell, patch)
            board.updatedAt = Date.now()
          })
        },

        addAnnotation: (boardId, annotation) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === boardId)
            if (board) {
              board.annotations.push(annotation)
              board.updatedAt = Date.now()
            }
          })
        },

        updateAnnotation: (boardId, annotationId, patch) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === boardId)
            if (!board) return
            const ann = board.annotations.find((a) => a.id === annotationId)
            if (ann) Object.assign(ann, patch)
            board.updatedAt = Date.now()
          })
        },

        removeAnnotation: (boardId, annotationId) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === boardId)
            if (board) {
              board.annotations = board.annotations.filter((a) => a.id !== annotationId)
              board.updatedAt = Date.now()
            }
          })
        },

        setEditingAnnotation: (id) => {
          set((s) => { s.editingAnnotationId = id })
        },

        addSnapshot: (boardId, snapshot) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === boardId)
            if (board) {
              const idx = board.snapshots.findIndex((s) => s.id === snapshot.id)
              if (idx >= 0) board.snapshots[idx] = snapshot
              else board.snapshots.push(snapshot)
              board.updatedAt = Date.now()
            }
          })
        },

        removeSnapshot: (boardId, snapshotId) => {
          set((s) => {
            const board = s.boards.find((b) => b.id === boardId)
            if (board) {
              board.snapshots = board.snapshots.filter((s) => s.id !== snapshotId)
              board.updatedAt = Date.now()
            }
          })
        },

        duplicateBoard: (id) => {
          const board = get().boards.find((b) => b.id === id)
          if (!board) return null
          const newId = uuid()
          const now = Date.now()
          set((s) => {
            s.boards.push({
              ...JSON.parse(JSON.stringify(board)),
              id: newId,
              name: `${board.name} (Copy)`,
              createdAt: now,
              updatedAt: now,
            })
          })
          return newId
        },

        getActiveBoard: () => {
          const { boards, activeBoardId } = get()
          return boards.find((b) => b.id === activeBoardId)
        },
      }),
      {
        name: 'budget-engineer-presentation',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          boards: state.boards,
          activeBoardId: state.activeBoardId,
        }),
      },
    ),
  ),
)
