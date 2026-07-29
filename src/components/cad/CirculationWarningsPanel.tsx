import type { AdjacencyWarning } from '@/domain/plan'

interface CirculationWarningsPanelProps {
  adjacencyWarnings: AdjacencyWarning[]
  maxTravelDistance?: number
  egressCompliant?: boolean
}

export function CirculationWarningsPanel({ adjacencyWarnings, maxTravelDistance, egressCompliant }: CirculationWarningsPanelProps) {
  if (adjacencyWarnings.length === 0 && maxTravelDistance == null) return null

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <h3 className="mb-2 text-xs font-semibold text-[var(--text-primary)]">Circulation & Egress</h3>

      {maxTravelDistance != null && (
        <div className="mb-2 flex items-center gap-2 text-[11px]">
          <span className="text-[var(--text-secondary)]">Max travel distance:</span>
          <span className={`font-semibold ${egressCompliant ? 'text-green-400' : 'text-red-400'}`}>
            {maxTravelDistance.toFixed(1)}m
          </span>
          <span className="text-[var(--text-muted)]">/ 18m</span>
          {egressCompliant ? (
            <span className="text-green-400" title="Egress compliant">✓</span>
          ) : (
            <span className="text-red-400" title="Egress non-compliant">✗</span>
          )}
        </div>
      )}

      {adjacencyWarnings.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-medium text-amber-400">
            {adjacencyWarnings.length} adjacency warning{adjacencyWarnings.length !== 1 ? 's' : ''}
          </p>
          <ul className="space-y-1">
            {adjacencyWarnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">
                <span className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true">⚠</span>
                <span>{w.message} ({w.distance.toFixed(1)}m)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
