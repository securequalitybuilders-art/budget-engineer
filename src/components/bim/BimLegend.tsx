interface BimLegendProps {
  elementCounts?: Record<string, number>
}

const COLORS: Record<string, string> = {
  wall: '#6366f1',
  slab: '#22c55e',
  roof: '#f59e0b',
  opening: '#ef4444',
  block: '#8b5cf6',
  roomZone: '#06b6d4',
};

const LABELS: Record<string, string> = {
  wall: 'Walls',
  slab: 'Slabs',
  roof: 'Roof',
  opening: 'Openings',
  block: 'Objects',
  roomZone: 'Zones',
};

export function BimLegend({ elementCounts }: BimLegendProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Legend</h3>
      <div className="flex flex-wrap gap-3">
        {Object.entries(COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="inline-block h-3 w-3 rounded" style={{ background: color }} />
            <span>{LABELS[type] ?? type}</span>
            {elementCounts?.[type] != null && (
              <span className="text-slate-400">({elementCounts[type]})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
