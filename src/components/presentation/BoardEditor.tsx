import React from 'react'
import { usePresentationStore } from '@/stores/presentationStore'
import { BoardAnnotator } from './BoardAnnotator'
import { computeBoardLayout } from '@/lib/presentation/boardLayout'
import type { BoardSnapshotRef, BoardTemplateId } from '@/domain/presentation'
import { uuid } from '@/lib/utils'

export function BoardEditor({ projectId }: { projectId: string }) {
  const boards = usePresentationStore((s) => s.boards)
  const activeBoardId = usePresentationStore((s) => s.activeBoardId)
  const createBoard = usePresentationStore((s) => s.createBoard)
  const setActiveBoard = usePresentationStore((s) => s.setActiveBoard)
  const deleteBoard = usePresentationStore((s) => s.deleteBoard)
  const renameBoard = usePresentationStore((s) => s.renameBoard)
  const duplicateBoard = usePresentationStore((s) => s.duplicateBoard)
  const removeSnapshot = usePresentationStore((s) => s.removeSnapshot)
  const updateCell = usePresentationStore((s) => s.updateCell)

  const activeBoard = boards.find((b) => b.id === activeBoardId)
  const layout = activeBoard
    ? computeBoardLayout(activeBoard.templateId as BoardTemplateId, activeBoard.sheetSize, activeBoard.landscape)
    : null

  const handleCreateBoard = () => {
    const templates = ['concept', 'design-development', 'planning'] as const
    const pick = templates[Math.floor(Math.random() * templates.length)]
    createBoard(projectId, `Board ${boards.length + 1}`, pick)
  }

  const handleDuplicate = () => {
    if (activeBoardId) duplicateBoard(activeBoardId)
  }

  const handleDelete = () => {
    if (activeBoardId) deleteBoard(activeBoardId)
  }

  const handleRename = (id: string, name: string) => {
    renameBoard(id, name)
  }

  const handleCaptureSnapshot = async () => {
    if (!activeBoard || !layout) return
    const contentCell = activeBoard.cells.find((c) => c.type === 'snapshot')
    if (!contentCell) return
    const snap: BoardSnapshotRef = {
      id: uuid(),
      name: `Snapshot ${activeBoard.snapshots.length + 1}`,
      dataUrl: '',
      width: contentCell.w,
      height: contentCell.h,
      capturedAt: Date.now(),
    }
    const el = document.querySelector<HTMLElement>('[data-snapshot-source]')
    if (el) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = contentCell.w
        canvas.height = contentCell.h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const svgData = new XMLSerializer().serializeToString(el)
          const img = new Image()
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              snap.dataUrl = canvas.toDataURL('image/png')
              URL.revokeObjectURL(url)
              resolve()
            }
            img.onerror = () => { URL.revokeObjectURL(url); reject() }
            img.src = url
          })
        }
      } catch {
        // fallback: empty snapshot
      }
    }
    usePresentationStore.getState().addSnapshot(activeBoard.id, snap)
    updateCell(activeBoard.id, contentCell.id, { contentId: snap.id, snapshotRefId: snap.id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid #e0e0e0', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleCreateBoard} style={btnStyle}>
          + New Board
        </button>
        {boards.length > 0 && (
          <>
            <select
              value={activeBoardId ?? ''}
              onChange={(e) => setActiveBoard(e.target.value || null)}
              style={{ padding: '4px 8px', fontSize: 13, border: '1px solid #ccc', borderRadius: 4, minWidth: 160 }}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={handleDuplicate} disabled={!activeBoardId} style={btnStyle}>
              Duplicate
            </button>
            <button onClick={handleDelete} disabled={!activeBoardId} style={{ ...btnStyle, color: '#c0392b' }}>
              Delete
            </button>
            <button onClick={handleCaptureSnapshot} disabled={!activeBoardId} style={btnStyle}>
              Capture Snapshot
            </button>
          </>
        )}
      </div>
      {activeBoard && layout ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              value={activeBoard.name}
              onChange={(e) => handleRename(activeBoard.id, e.target.value)}
              style={{ padding: '4px 8px', fontSize: 14, fontWeight: 600, border: '1px solid #ccc', borderRadius: 4, width: 280 }}
            />
            <span style={{ fontSize: 11, color: '#888' }}>
              {activeBoard.sheetSize} {activeBoard.landscape ? 'Landscape' : 'Portrait'} | {layout.sheetW} x {layout.sheetH} mm
            </span>
          </div>
          <BoardAnnotator boardId={activeBoard.id} boardWidth={layout.sheetW} boardHeight={layout.sheetH} />
          <SnapshotManager board={activeBoard} onRemove={removeSnapshot} />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>
          {boards.length === 0 ? 'Create a board to get started' : 'Select a board from the dropdown'}
        </div>
      )}
    </div>
  )
}

function SnapshotManager({ board, onRemove }: { board: { id: string; snapshots: BoardSnapshotRef[] }; onRemove: (boardId: string, snapId: string) => void }) {
  if (board.snapshots.length === 0) return null
  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#555' }}>Captured Snapshots</h4>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {board.snapshots.map((snap) => (
          <div key={snap.id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 8, background: '#fafafa', width: 200 }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600 }}>{snap.name}</p>
            {snap.dataUrl ? (
              <img src={snap.dataUrl} alt={snap.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4 }} />
            ) : (
              <div style={{ width: '100%', height: 120, background: '#eee', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>
                No preview
              </div>
            )}
            <button
              onClick={() => onRemove(board.id, snap.id)}
              style={{ marginTop: 4, padding: '2px 8px', fontSize: 11, color: '#c0392b', background: 'none', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  background: '#f5f5f5',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  fontWeight: 500,
}
