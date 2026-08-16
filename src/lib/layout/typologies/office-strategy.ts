import { placeAdjacencyLayout, type AdjacencyProgramRoom } from '../../../engine/spatial/graph-placer'
import { OFFICE_ADJACENCY_RULES } from '../../../engine/spatial/adjacency-graph'
import { getTypology } from '../../../engine/typology-kb'
import { templateForTypology } from '../layout-templates'
import { packTemplate } from '../grid-packer'
import type { FloorContext, FloorLayoutResult } from '../typology-types'
import type { AdjacencyRule, CoreType, StructuralGrid } from '../../../engine/tier1-types'

const DEFAULT_GRID: StructuralGrid = { spanX: 7.2, spanY: 7.2 }
const DEFAULT_CORE: CoreType = 'central'
const DEFAULT_EFFICIENCY = 0.78

/**
 * Office floor strategy.
 *
 * Primary path: graph-based adjacency placement (single corridor spine, core
 * split per core type, reception band) via placeAdjacencyLayout. The KB entry
 * (getTypology('office-commercial')) is the single authority for structural
 * grid / core type / adjacency rules / nominal efficiency; hardcoded constants
 * fall back when the entry lacks them.
 *
 * Fallback path: grid-template packing when the adjacency placer reports an
 * invalid layout (defense-in-depth; the adjacency path is valid for the
 * canonical office program across all three core types).
 */
export function generateOfficeLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  seed = 0,
  _floorContext?: FloorContext,
): FloorLayoutResult {
  const kb = getTypology('office-commercial')
  const grid: StructuralGrid = kb?.structuralGrid ?? DEFAULT_GRID
  const coreType: CoreType = kb?.coreType ?? DEFAULT_CORE
  const adjacencyRules: AdjacencyRule[] =
    kb?.adjacencyRules && kb.adjacencyRules.length > 0 ? kb.adjacencyRules : OFFICE_ADJACENCY_RULES
  const floorPlateEfficiency = kb?.floorPlateEfficiency ?? DEFAULT_EFFICIENCY

  const totalAreaM2 = width * height
  const rooms: AdjacencyProgramRoom[] = program
    .map((p, i) => ({ id: `office-${i}`, name: p.name, areaM2: p.ratio * totalAreaM2 }))
    .filter(r => r.areaM2 > 0)

  const result = placeAdjacencyLayout(rooms, width, height, {
    corridorWidth: 1.8,
    coreType,
    grid,
    adjacencyRules,
  })

  if (result.valid) {
    return {
      rooms: result.rooms.map(r => ({ id: r.id, name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })),
      structuralGrid: grid,
      coreLayout: result.coreLayout,
      floorPlateMetrics: {
        ...result.floorPlate,
        efficiency: result.floorPlate.efficiency > 0 ? result.floorPlate.efficiency : floorPlateEfficiency,
      },
      adjacencyGraph: result.adjacency,
      valid: true,
    }
  }

  // Fallback: grid-template packing.
  const t = templateForTypology('office', totalAreaM2, seed)
  const packed = packTemplate(t, program, width, height, seed)
  const valid = packed.valid && packed.warnings.filter(w => w.roomName && w.message.includes('invalid')).length === 0
  return {
    rooms: packed.rooms,
    warnings: packed.warnings.map(w => w.message),
    valid,
    structuralGrid: grid,
  }
}
