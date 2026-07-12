import { useMemo } from 'react'
import { buildingToStructuralGeneration } from '../../adapters/canonical/building-to-structural'
import type { BuildingGraph } from '../../domain/building'
import type { StructuralMaterial } from '../../lib/structural/structural-types'

interface StructuralGeneratorPanelProps {
  graph: BuildingGraph | null
}

const MATERIAL_OPTIONS: { value: StructuralMaterial; label: string }[] = [
  { value: 'concrete', label: 'Concrete' },
  { value: 'steel', label: 'Steel' },
  { value: 'timber', label: 'Timber' },
]

export function StructuralGeneratorPanel({ graph }: StructuralGeneratorPanelProps) {
  const result = useMemo(() => {
    if (!graph) return null
    return buildingToStructuralGeneration(graph)
  }, [graph])

  if (!graph) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-stone-400">No design selected. Generate a design first to see structural elements.</p>
      </div>
    )
  }

  if (!result || (result.columns.length === 0 && result.beams.length === 0 && result.footings.length === 0)) {
    return (
      <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-6 text-center">
        <p className="text-sm text-stone-400">No structural walls detected. Add exterior or structural walls to generate columns, beams, and footings.</p>
      </div>
    )
  }

  const wallCount = graph.walls.length
  const spaceCount = graph.spaces.length
  const floorCount = graph.levels.length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-center">
          <p className="text-2xl font-bold text-cyan-300">{result.columns.length}</p>
          <p className="text-xs text-stone-400">Columns</p>
        </div>
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-center">
          <p className="text-2xl font-bold text-cyan-300">{result.beams.length}</p>
          <p className="text-xs text-stone-400">Beams</p>
        </div>
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3 text-center">
          <p className="text-2xl font-bold text-cyan-300">{result.footings.length}</p>
          <p className="text-xs text-stone-400">Footings</p>
        </div>
      </div>

      {result.columns.length > 0 && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Column Positions</h4>
          <div className="grid grid-cols-2 gap-1 text-xs text-stone-300">
            {result.columns.map((c, i) => (
              <div key={i} className="rounded bg-stone-800/60 px-2 py-1">
                C{i + 1}: ({c.position.x.toFixed(2)}, {c.position.y.toFixed(2)})
              </div>
            ))}
          </div>
        </div>
      )}

      {result.beams.length > 0 && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Beam Connections</h4>
          <div className="space-y-1 text-xs text-stone-300">
            {result.beams.map((b, i) => (
              <div key={i} className="rounded bg-stone-800/60 px-2 py-1">
                B{i + 1}: ({b.start.x.toFixed(2)}, {b.start.y.toFixed(2)}) → ({b.end.x.toFixed(2)}, {b.end.y.toFixed(2)})
              </div>
            ))}
          </div>
        </div>
      )}

      {result.footings.length > 0 && (
        <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Footing Placements</h4>
          <div className="grid grid-cols-2 gap-1 text-xs text-stone-300">
            {result.footings.map((f, i) => (
              <div key={i} className="rounded bg-stone-800/60 px-2 py-1">
                F{i + 1}: ({f.position.x.toFixed(2)}, {f.position.y.toFixed(2)}) — {f.width}m × {f.depth}m
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-stone-700/60 bg-stone-800/80 p-3">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Design Summary</h4>
        <div className="grid grid-cols-3 gap-2 text-xs text-stone-400">
          <div>Walls: {wallCount}</div>
          <div>Spaces: {spaceCount}</div>
          <div>Floors: {floorCount}</div>
        </div>
      </div>
    </div>
  )
}
