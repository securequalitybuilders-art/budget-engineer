interface CadGeometryPanelProps {
  selectedWallId: string | null
  secondSelectedWallId: string | null
  onSplitWall: () => void
  onJoinWalls: () => void
  onGenerateDimensions: () => void
  reconstructedRoomCount: number
}

export function CadGeometryPanel({ selectedWallId, secondSelectedWallId, onSplitWall, onJoinWalls, onGenerateDimensions, reconstructedRoomCount }: CadGeometryPanelProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button
        onClick={onSplitWall}
        disabled={!selectedWallId}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-30"
      >
        Split Wall at Midpoint
      </button>
      <button
        onClick={onJoinWalls}
        disabled={!selectedWallId || !secondSelectedWallId}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white disabled:opacity-30"
      >
        Join Walls
      </button>
      <button
        onClick={onGenerateDimensions}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
      >
        Generate Dimensions
      </button>
      <span className="text-xs text-slate-400">{reconstructedRoomCount} rooms reconstructed</span>
    </div>
  )
}
