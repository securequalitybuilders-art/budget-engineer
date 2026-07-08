import type { CadDocument } from '../../domain/cad'

interface CadGeometryPanelProps {
  doc: CadDocument | null
  selectedWallId: string | null
  secondSelectedWallId: string | null
  onSplitWall: () => void
  onJoinWalls: () => void
  onGenerateDimensions: () => void
  reconstructedRoomCount: number
}

export function CadGeometryPanel({
  doc,
  selectedWallId,
  secondSelectedWallId,
  onSplitWall,
  onJoinWalls,
  onGenerateDimensions,
  reconstructedRoomCount,
}: CadGeometryPanelProps) {
  if (!doc) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Geometry Intelligence</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button onClick={onSplitWall} disabled={!selectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Split Wall</button>
        <button onClick={onJoinWalls} disabled={!selectedWallId || !secondSelectedWallId} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white disabled:text-slate-500">Join 2 Walls</button>
        <button onClick={onGenerateDimensions} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">Generate Dimensions</button>
        <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300">Reconstructed Rooms: {reconstructedRoomCount}</div>
      </div>
    </section>
  )
}
