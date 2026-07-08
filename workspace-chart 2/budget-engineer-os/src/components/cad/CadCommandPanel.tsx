import type { CadDocument } from '../../domain/cad'

interface CadCommandPanelProps {
  doc: CadDocument | null
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

export function CadCommandPanel({
  doc,
  selectedWallId,
  selectedOpeningId,
  onAddDoor,
  onAddWindow,
  onDeleteWall,
  onDeleteOpening,
  onAddFloor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CadCommandPanelProps) {
  if (!doc) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Drafting Commands</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button onClick={onAddDoor} disabled={!selectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Add Door</button>
        <button onClick={onAddWindow} disabled={!selectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Add Window</button>
        <button onClick={onDeleteWall} disabled={!selectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Delete Wall</button>
        <button onClick={onDeleteOpening} disabled={!selectedOpeningId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Delete Opening</button>
        <button onClick={onAddFloor} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Add Floor</button>
        <div className="flex gap-2">
          <button onClick={onUndo} disabled={!canUndo} className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Undo</button>
          <button onClick={onRedo} disabled={!canRedo} className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Redo</button>
        </div>
      </div>
    </section>
  )
}
