interface FloorVisibilityPanelProps {
  floors: { id: string; name: string }[]
  activeFloorId: string | null
  onFloorChange: (floorId: string | null) => void
}

export function FloorVisibilityPanel({ floors, activeFloorId, onFloorChange }: FloorVisibilityPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onFloorChange(null)}
        className={`rounded-xl border px-3 py-1.5 text-xs ${activeFloorId === null ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-slate-900 text-slate-400'}`}
      >
        All Floors
      </button>
      {floors.map((floor) => (
        <button
          key={floor.id}
          onClick={() => onFloorChange(floor.id)}
          className={`rounded-xl border px-3 py-1.5 text-xs ${activeFloorId === floor.id ? 'border-violet-400/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-slate-900 text-slate-400'}`}
        >
          {floor.name}
        </button>
      ))}
    </div>
  )
}
