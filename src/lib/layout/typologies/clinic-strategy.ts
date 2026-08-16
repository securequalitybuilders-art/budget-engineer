import { placeAdjacencyLayout, type AdjacencyProgramRoom } from '../../../engine/spatial/graph-placer'
import { CLINIC_ADJACENCY_RULES, roomGroupForClinic, type ClinicRoomGroup } from '../../../engine/spatial/adjacency-graph'
import { getTypology } from '../../../engine/typology-kb'
import { templateForTypology } from '../layout-templates'
import { packTemplate } from '../grid-packer'
import type { FloorContext, FloorLayoutResult } from '../typology-types'
import type { AdjacencyRule, CoreType, StructuralGrid } from '../../../engine/tier1-types'

const DEFAULT_GRID: StructuralGrid = { spanX: 7.2, spanY: 7.2 }
const DEFAULT_CORE: CoreType = 'central'
const DEFAULT_EFFICIENCY = 0.72

/**
 * Per-role minimum depths for clinic rooms. Keys are the placement roles the
 * placer stacks by (see clinicRoleFor), not raw room names.
 */
export const CLINIC_MIN_DEPTH: Record<string, number> = {
  reception: 4.5,
  pharmacy: 4.5,
  'private-office': 3.5,
  meeting: 4.0,
  kitchenette: 2.0,
  wc: 2.0,
}

/**
 * Map a clinic room name to a placement role.
 *
 * Clinical groups map onto the generic office placement roles so the shared
 * adjacency placer can stack them (reception/waiting at the front, consultation
 * rooms as private offices down the left column, treatment as the meeting-band
 * cell, staff/store/nurse/records as the kitchenette-band cell). Pharmacy keeps
 * its own role so it can share the front band with reception. Groups without a
 * mapping pass through (wc/stair/lift/corridor), unclassified rooms pass null.
 */
const ROLE_MAP: Record<ClinicRoomGroup, string> = {
  reception: 'reception',
  waiting: 'reception',
  consultation: 'private-office',
  treatment: 'meeting',
  pharmacy: 'pharmacy',
  nurse: 'kitchenette',
  staff: 'kitchenette',
  records: 'kitchenette',
  store: 'kitchenette',
  wc: 'wc',
  stair: 'stair',
  lift: 'lift',
  corridor: 'corridor',
}

export function clinicRoleFor(name: string): string | null {
  const group = roomGroupForClinic(name)
  if (!group) return null
  return ROLE_MAP[group]
}

/**
 * Clinic floor strategy.
 *
 * Primary path: graph-based adjacency placement (single corridor spine, wc core
 * in the left column, treatment/staff/store band, reception + pharmacy front
 * band) via placeAdjacencyLayout. The KB entry (getTypology('clinic-health'))
 * is the single authority for structural grid / core type / adjacency rules /
 * nominal efficiency; hardcoded constants fall back when the entry lacks them.
 *
 * Fallback path: grid-template packing when the adjacency placer reports an
 * invalid layout (defense-in-depth; the adjacency path is valid for the
 * canonical clinic program on a 20 x 20 plate).
 */
export function generateClinicLayout(
  program: { name: string; ratio?: number; areaM2?: number }[],
  width: number,
  height: number,
  seed = 0,
  _floorContext?: FloorContext,
): FloorLayoutResult {
  const kb = getTypology('clinic-health')
  const grid: StructuralGrid = kb?.structuralGrid ?? DEFAULT_GRID
  const coreType: CoreType = kb?.coreType ?? DEFAULT_CORE
  const adjacencyRules: AdjacencyRule[] =
    kb?.adjacencyRules && kb.adjacencyRules.length > 0 ? kb.adjacencyRules : CLINIC_ADJACENCY_RULES
  const floorPlateEfficiency = kb?.floorPlateEfficiency ?? DEFAULT_EFFICIENCY

  const totalAreaM2 = width * height
  const rooms: AdjacencyProgramRoom[] = program
    .map((p, i) => ({
      id: `clinic-${i}`,
      name: p.name,
      areaM2: p.ratio != null ? p.ratio * totalAreaM2 : (p.areaM2 ?? 0),
    }))
    .filter(r => r.areaM2 > 0)

  const result = placeAdjacencyLayout(rooms, width, height, {
    corridorWidth: 1.8,
    coreType,
    grid,
    adjacencyRules,
    roleFor: clinicRoleFor,
    groupFor: roomGroupForClinic,
    coreGroups: ['stair', 'lift', 'wc'],
    minDepths: CLINIC_MIN_DEPTH,
    frontGroups: ['reception', 'pharmacy'],
    bandGroups: ['meeting', 'kitchenette'],
  })

  // The adjacency placer can report valid while dropping rooms that don't fit
  // a role/depth (e.g. unclassified rooms or overflow on a small plate). Only
  // take the adjacency path when every program room was placed; otherwise fall
  // back to template packing so no program room silently disappears.
  if (result.valid && result.rooms.length === rooms.length) {
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
  const t = templateForTypology('clinic', totalAreaM2, seed)
  const packed = packTemplate(
    t,
    program.map(p => ({ name: p.name, ratio: p.ratio ?? 0 })),
    width,
    height,
    seed,
  )
  const valid = packed.valid && packed.warnings.filter(w => w.roomName && w.message.includes('invalid')).length === 0
  return {
    rooms: packed.rooms,
    warnings: packed.warnings.map(w => w.message),
    valid,
    structuralGrid: grid,
  }
}
