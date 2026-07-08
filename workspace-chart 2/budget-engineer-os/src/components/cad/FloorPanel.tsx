import type { CadDocument } from '../../domain/cad'

interface FloorPanelProps {
  doc: CadDocument | null
  onSelectFloor?: (floorId: string) => void
}

export function FloorPanel({ doc, onSelectFloor }: FloorPanelProps) {
  if (!doc) return null

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-xl font-semibold text-white">Floors</h2>
      <div className="mt-4 space-y-2">
        {doc.floors.map((floor) => (
          <button
            key={floor.id}
            onClick={() => onSelectFloor?.(floor.id)}
            className={`w-full rounded-2xl border px-3 py-2 text-left text-sm ${doc.activeFloorId === floor.id ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-slate-900/40 text-white'}`}
          >
            {floor.name} · {floor.elevation}m
          </button>
        ))}
      </div>
    </section>
  )
}
