import { describe, it, expect, beforeEach } from 'vitest'
import { usePresentationStore } from '@/stores/presentationStore'

beforeEach(() => {
  usePresentationStore.setState({ boards: [], activeBoardId: null, editingAnnotationId: null })
})

describe('presentationStore', () => {
  describe('createBoard', () => {
    it('creates a board and sets it active', () => {
      const id = usePresentationStore.getState().createBoard('proj-1', 'Concept Board', 'concept')
      expect(id).toBeTruthy()
      const state = usePresentationStore.getState()
      expect(state.boards.length).toBe(1)
      expect(state.activeBoardId).toBe(id)
      expect(state.boards[0].name).toBe('Concept Board')
      expect(state.boards[0].cells.length).toBe(6)
    })

    it('creates a design-development board with 9 cells', () => {
      const id = usePresentationStore.getState().createBoard('proj-2', 'DD Board', 'design-development')
      const board = usePresentationStore.getState().boards.find((b) => b.id === id)
      expect(board?.cells.length).toBe(9)
    })
  })

  describe('deleteBoard', () => {
    it('removes board and clears active if deleted', () => {
      const id = usePresentationStore.getState().createBoard('proj-1', 'Board', 'concept')
      usePresentationStore.getState().deleteBoard(id)
      const state = usePresentationStore.getState()
      expect(state.boards.length).toBe(0)
      expect(state.activeBoardId).toBeNull()
    })
  })

  describe('renameBoard', () => {
    it('updates board name', () => {
      const id = usePresentationStore.getState().createBoard('proj-1', 'Old Name', 'concept')
      usePresentationStore.getState().renameBoard(id, 'New Name')
      const board = usePresentationStore.getState().boards.find((b) => b.id === id)
      expect(board?.name).toBe('New Name')
    })
  })

  describe('setActiveBoard', () => {
    it('sets active board id', () => {
      const id = usePresentationStore.getState().createBoard('proj-1', 'B1', 'concept')
      usePresentationStore.getState().setActiveBoard(id)
      expect(usePresentationStore.getState().activeBoardId).toBe(id)
    })

    it('sets null', () => {
      usePresentationStore.getState().setActiveBoard(null)
      expect(usePresentationStore.getState().activeBoardId).toBeNull()
    })
  })

  describe('annotations', () => {
    it('adds and removes annotation', () => {
      const boardId = usePresentationStore.getState().createBoard('proj-1', 'B1', 'concept')
      const ann = { id: 'a1', kind: 'textbox' as const, x: 10, y: 20, w: 50, h: 30, text: 'Hello', color: '#000', strokeWidth: 1 }
      usePresentationStore.getState().addAnnotation(boardId, ann)
      expect(usePresentationStore.getState().boards[0].annotations.length).toBe(1)
      usePresentationStore.getState().removeAnnotation(boardId, 'a1')
      expect(usePresentationStore.getState().boards[0].annotations.length).toBe(0)
    })

    it('updates annotation text', () => {
      const boardId = usePresentationStore.getState().createBoard('proj-1', 'B1', 'concept')
      usePresentationStore.getState().addAnnotation(boardId, { id: 'a1', kind: 'textbox', x: 0, y: 0, w: 50, h: 20, text: 'Old', color: '#000', strokeWidth: 1 })
      usePresentationStore.getState().updateAnnotation(boardId, 'a1', { text: 'Updated' })
      expect(usePresentationStore.getState().boards[0].annotations[0].text).toBe('Updated')
    })
  })

  describe('snapshots', () => {
    it('adds snapshot', () => {
      const boardId = usePresentationStore.getState().createBoard('proj-1', 'B1', 'concept')
      usePresentationStore.getState().addSnapshot(boardId, { id: 's1', name: 'Render', dataUrl: '', width: 100, height: 100, capturedAt: 1000 })
      expect(usePresentationStore.getState().boards[0].snapshots.length).toBe(1)
    })

    it('removes snapshot', () => {
      const boardId = usePresentationStore.getState().createBoard('proj-1', 'B1', 'concept')
      usePresentationStore.getState().addSnapshot(boardId, { id: 's1', name: 'Render', dataUrl: '', width: 100, height: 100, capturedAt: 1000 })
      usePresentationStore.getState().removeSnapshot(boardId, 's1')
      expect(usePresentationStore.getState().boards[0].snapshots.length).toBe(0)
    })
  })

  describe('duplicateBoard', () => {
    it('creates a copy with "(Copy)" suffix', () => {
      usePresentationStore.getState().createBoard('proj-1', 'Original', 'concept')
      const origId = usePresentationStore.getState().boards[0].id
      const newId = usePresentationStore.getState().duplicateBoard(origId)
      expect(newId).not.toBeNull()
      expect(usePresentationStore.getState().boards.length).toBe(2)
      const copy = usePresentationStore.getState().boards.find((b) => b.id === newId)
      expect(copy?.name).toContain('Copy')
    })

    it('returns null for non-existent board', () => {
      const result = usePresentationStore.getState().duplicateBoard('does-not-exist')
      expect(result).toBeNull()
    })
  })

  describe('updateCell', () => {
    it('updates cell contentId', () => {
      const boardId = usePresentationStore.getState().createBoard('proj-1', 'B1', 'concept')
      usePresentationStore.getState().updateCell(boardId, 'hero', { contentId: 'snap-1' })
      const cell = usePresentationStore.getState().boards[0].cells.find((c) => c.id === 'hero')
      expect(cell?.contentId).toBe('snap-1')
    })
  })
})
