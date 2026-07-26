import type { CadDocument } from '../../domain/cad'

interface CadCommandPanelProps {
  doc: CadDocument
  selectedWallId: string | null
  selectedOpeningId: string | null
  onAddDoor: () => void
  onAddWindow: () => void
  onDeleteWall: () => void
  onDeleteOpening: () => void
  onAddFloor: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function CadCommandPanel({ doc, selectedWallId, selectedOpeningId, onAddDoor, onAddWindow, onDeleteWall, onDeleteOpening, onAddFloor, onUndo, onRedo, canUndo, canRedo }: CadCommandPanelProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:text-slate-400"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:text-slate-400"
        >
          Redo
        </button>
      </div>

      <span className="text-xs text-slate-400">|</span>

      <button
        onClick={onAddDoor}
        disabled={!selectedWallId}
        className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 disabled:opacity-30"
      >
        + Door
      </button>
      <button
        onClick={onAddWindow}
        disabled={!selectedWallId}
        className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 disabled:opacity-30"
      >
        + Window
      </button>
      <button
        onClick={onDeleteWall}
        disabled={!selectedWallId}
        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 disabled:opacity-30"
      >
        Delete Wall
      </button>
      <button
        onClick={onDeleteOpening}
        disabled={!selectedOpeningId}
        className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-200 disabled:opacity-30"
      >
        Delete Opening
      </button>

      <span className="text-xs text-slate-400">|</span>

      <button
        onClick={onAddFloor}
        className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200"
      >
        + Floor
      </button>

      <span className="text-xs text-slate-300">
        {doc.walls.length} walls · {doc.openings.length} openings · {doc.floors.length} floors · active: {doc.floors.find((f) => f.id === doc.activeFloorId)?.name ?? '—'}
      </span>
    </div>
  )
}
