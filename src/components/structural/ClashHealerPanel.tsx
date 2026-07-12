import { useState, useMemo } from 'react'
import { autoHealClashes } from '../../lib/structural/clash-healer'
import type { CadWall, CadOpening, CadBlockInstance } from '../../domain/cad'
import type { BuildingGraph } from '../../domain/building'

interface ClashHealerPanelProps {
  graph: BuildingGraph | null
}

function graphToCadWalls(graph: BuildingGraph): CadWall[] {
  return graph.walls.map((w) => ({
    id: w.id,
    floorId: w.levelId ?? 'l1',
    start: { x: w.start.x, y: w.start.y },
    end: { x: w.end.x, y: w.end.y },
    thickness: w.thickness,
    structuralRole: w.role === 'exterior' ? 'external' : 'internal',
    layerId: 'walls' as const,
    bim: { classification: 'wall', material: w.material },
  }))
}

function graphToCadOpenings(graph: BuildingGraph): CadOpening[] {
  const walls = graph.walls
  return graph.openings.map((o) => {
    const wall = walls.find((w) => w.id === o.wallId)
    const wallLength = wall ? Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 1 : 1
    return {
      id: o.id,
      floorId: o.wallId ?? 'l1',
      wallId: o.wallId,
      kind: o.kind as 'door' | 'window',
      offsetRatio: wall ? o.xPosition / wallLength : 0.3,
      width: o.width,
      sillHeight: o.sillHeight,
      headHeight: o.height,
      layerId: 'openings' as const,
      bim: { classification: 'opening', typeName: o.kind },
    }
  })
}

export function ClashHealerPanel({ graph }: ClashHealerPanelProps) {
  const [showResults, setShowResults] = useState(false)

  const walls = useMemo(() => graph ? graphToCadWalls(graph) : [], [graph])
  const openings = useMemo(() => graph ? graphToCadOpenings(graph) : [], [graph])
  const blocks: CadBlockInstance[] = []

  const result = useMemo(() => {
    if (!showResults || walls.length === 0) return null
    return autoHealClashes(walls, openings, blocks)
  }, [walls, openings, showResults])

  if (!graph) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-stone-400">No design selected.</p>
      </div>
    )
  }

  const hasIssues = openings.some((o) => {
    const w = walls.find((x) => x.id === o.wallId)
    if (!w) return false
    const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1
    const absOff = o.offsetRatio * len
    return absOff < 0.3 || absOff + o.width > len - 0.3
  })

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400">Walls: <span className="text-stone-300">{walls.length}</span></p>
            <p className="text-xs text-stone-400">Openings: <span className="text-stone-300">{openings.length}</span></p>
          </div>
          <button
            onClick={() => setShowResults(true)}
            disabled={showResults}
            className="rounded bg-amber-600/20 px-3 py-1.5 text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Clash Detection
          </button>
        </div>
      </div>

      {!showResults && hasIssues && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-center">
          <p className="text-sm text-amber-300">Potential clashes detected. Click "Run Clash Detection" to scan and auto-heal.</p>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-3">
            <p className="text-xs font-semibold text-emerald-300">✓ Clash healing complete</p>
          </div>

          <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Healed Openings</h4>
            {result.openings.map((o) => {
              const orig = openings.find((x) => x.id === o.id)
              const changed = orig && (orig.offsetRatio !== o.offsetRatio)
              return (
                <div key={o.id} className={`rounded px-2 py-1 text-xs mb-1 ${changed ? 'bg-amber-900/20 text-amber-200' : 'text-stone-400'}`}>
                  {o.id} ({o.kind}) — offset: {o.offsetRatio.toFixed(3)}
                  {changed && <span className="ml-2 text-emerald-400">← adjusted</span>}
                </div>
              )
            })}
          </div>

          <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Healed Blocks</h4>
            {result.blocks.length === 0 ? (
              <p className="text-xs text-gray-400">No blocks to heal.</p>
            ) : (
              result.blocks.map((b) => (
                <div key={b.id} className="rounded bg-stone-800/60 px-2 py-1 text-xs text-stone-300">
                  {b.blockType} at ({b.position.x.toFixed(2)}, {b.position.y.toFixed(2)})
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!hasIssues && openings.length > 0 && !showResults && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-center">
          <p className="text-sm text-emerald-400">No obvious clashes detected.</p>
        </div>
      )}
    </div>
  )
}
