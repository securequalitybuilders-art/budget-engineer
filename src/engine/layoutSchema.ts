import type { Typology, ProgramItem } from './tier1-types'
import type { EgressPoint, AdjacencyWarning } from './tier3/circulationEngine'

// ── Top-level schema ──

export type SchemaTopology = 'rectangle' | 'l-shape' | 'split-wing' | 'courtyard'

export type SchemaJurisdiction = 'sans10400' | 'zbc' | 'sadc' | 'none'

export type SchemaZone = 'public' | 'private' | 'service' | 'circulation'

export interface LayoutSchema {
  version: string
  metadata: SchemaMeta
  building: SchemaBuilding
  rooms: SchemaRoom[]
  walls: SchemaWall[]
  openings: SchemaOpening[]
  circulation: SchemaCirculation
  structural: SchemaStructural
  validation: SchemaValidation
}

// ── Metadata ──

export interface SchemaMeta {
  generatedAt: string
  source: 'llm' | 'regex' | 'manual' | 'migration'
  confidence: number
  originalBrief?: string
  typologyId?: string
  jurisdiction?: SchemaJurisdiction
}

// ── Building ──

export interface SchemaBuilding {
  name: string
  typology: string
  style?: string
  floorCount: number
  floorHeight: number
  width: number
  depth: number
  totalArea: number
  orientation?: number
  roofType?: string
  jurisdiction?: SchemaJurisdiction
}

// ── Rooms ──

export interface SchemaRoom {
  id: string
  name: string
  zone: SchemaZone
  x: number
  y: number
  width: number
  height: number
  floor: number
  area: number
  isWetCore: boolean
  wallIds: string[]
  openingIds: string[]
  adjacentRoomIds: string[]
  programSource?: string
}

// ── Walls ──

export type WallRole = 'external' | 'internal' | 'party-wall' | 'shaft' | 'core'

export interface SchemaWall {
  id: string
  role: WallRole
  startX: number
  startY: number
  endX: number
  endY: number
  thickness: number
  height: number
  leftRoomId?: string
  rightRoomId?: string
  fireRating?: number
  loadBearing: boolean
}

// ── Openings ──

export type OpeningKind = 'door' | 'window' | 'louver' | 'skylight' | 'archway'

export interface SchemaOpening {
  id: string
  kind: OpeningKind
  wallId: string
  offset: number
  width: number
  height: number
  sillHeight: number
  isEgress: boolean
  label?: string
}

// ── Circulation ──

export interface SchemaCirculation {
  corridors: SchemaCorridor[]
  entries: SchemaEntry[]
  totalLength: number
  connectivity: 'full' | 'partial' | 'disconnected'
  maxTravelDistance: number
  egressCompliant: boolean
  warnings: string[]
}

export interface SchemaCorridor {
  id: string
  x: number
  y: number
  width: number
  height: number
  floor: number
  connectedRoomIds: string[]
}

export interface SchemaEntry {
  type: 'main-entry' | 'secondary-exit' | 'emergency-exit'
  x: number
  y: number
  connectedCorridorId?: string
}

// ── Structural ──

export interface SchemaStructural {
  gridX: number
  gridY: number
  maxSpan: number
  slabSystem: string
  wallConstruction: string
  corePositions: SchemaCore[]
}

export interface SchemaCore {
  id: string
  x: number
  y: number
  width: number
  height: number
  hasStair: boolean
  hasLift: boolean
  hasServiceShaft: boolean
}

// ── Validation ──

export interface SchemaValidation {
  valid: boolean
  violations: SchemaViolation[]
  scores: SchemaScores
  solverTrace?: string[]
}

export interface SchemaViolation {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  roomId?: string
}

export interface SchemaScores {
  areaEfficiency: number
  wetCoreCompactness: number
  structuralRegularity: number
  corridorEfficiency: number
  daylightPotential: number
  ventilationPotential: number
  composite: number
}

// ── Factory ──

export function createEmptySchema(meta?: Partial<SchemaMeta>): LayoutSchema {
  return {
    version: '1.0.0',
    metadata: {
      generatedAt: new Date().toISOString(),
      source: meta?.source ?? 'manual',
      confidence: meta?.confidence ?? 1.0,
      originalBrief: meta?.originalBrief,
      typologyId: meta?.typologyId,
      jurisdiction: meta?.jurisdiction,
    },
    building: {
      name: '',
      typology: '',
      floorCount: 1,
      floorHeight: 3.0,
      width: 0,
      depth: 0,
      totalArea: 0,
    },
    rooms: [],
    walls: [],
    openings: [],
    circulation: {
      corridors: [],
      entries: [],
      totalLength: 0,
      connectivity: 'disconnected',
      maxTravelDistance: 0,
      egressCompliant: false,
      warnings: [],
    },
    structural: {
      gridX: 0,
      gridY: 0,
      maxSpan: 6,
      slabSystem: 'rc-slab',
      wallConstruction: 'masonry',
      corePositions: [],
    },
    validation: {
      valid: true,
      violations: [],
      scores: {
        areaEfficiency: 0,
        wetCoreCompactness: 0,
        structuralRegularity: 0,
        corridorEfficiency: 0,
        daylightPotential: 0,
        ventilationPotential: 0,
        composite: 0,
      },
    },
  }
}

// ── Build schema from engine types ──

export function buildSchema(
  building: { name: string; typology: string; floorCount: number; floorHeight: number; width: number; depth: number },
  rooms: SchemaRoom[],
  circulation: { corridors: SchemaCorridor[]; entries: SchemaEntry[]; maxTravelDistance: number; egressCompliant: boolean; warnings: string[] },
  structural: SchemaStructural,
  meta?: Partial<SchemaMeta>,
): LayoutSchema {
  const schema = createEmptySchema(meta)
  schema.building = { ...schema.building, ...building, totalArea: building.width * building.depth }

  schema.rooms = rooms
  schema.walls = deriveWalls(rooms)
  schema.openings = rooms.flatMap(r => r.openingIds.length > 0 ? [] : [])
  schema.circulation = {
    corridors: circulation.corridors,
    entries: circulation.entries,
    totalLength: circulation.corridors.reduce((s, c) => s + (c.width + c.height) * 2, 0),
    connectivity: circulation.corridors.length > 0 ? 'full' : 'partial',
    maxTravelDistance: circulation.maxTravelDistance,
    egressCompliant: circulation.egressCompliant,
    warnings: circulation.warnings,
  }
  schema.structural = structural
  schema.validation.scores = computeScores(schema)

  return schema
}

// ── Wall derivation ──

function deriveWalls(rooms: SchemaRoom[]): SchemaWall[] {
  const walls: SchemaWall[] = []
  const EPS = 0.01
  let wallId = 0

  for (const room of rooms) {
    const x1 = room.x, y1 = room.y
    const x2 = room.x + room.width, y2 = room.y + room.height

    const edges: Array<{ ax: number; ay: number; bx: number; by: number; side: 'left' | 'right' | 'top' | 'bottom' }> = [
      { ax: x1, ay: y1, bx: x2, by: y1, side: 'bottom' },
      { ax: x2, ay: y1, bx: x2, by: y2, side: 'right' },
      { ax: x1, ay: y2, bx: x2, by: y2, side: 'top' },
      { ax: x1, ay: y1, bx: x1, by: y2, side: 'left' },
    ]

    for (const edge of edges) {
      const shared = rooms.find(other =>
        other.id !== room.id &&
        (
          (Math.abs(edge.ax - other.x) < EPS && Math.abs(edge.bx - (other.x + other.width)) < EPS && Math.abs(edge.ay - other.y) < EPS && Math.abs(edge.by - other.y) < EPS) ||
          (Math.abs(edge.ax - other.x) < EPS && Math.abs(edge.bx - (other.x + other.width)) < EPS && Math.abs(edge.ay - (other.y + other.height)) < EPS && Math.abs(edge.by - (other.y + other.height)) < EPS) ||
          (Math.abs(edge.ay - other.y) < EPS && Math.abs(edge.by - (other.y + other.height)) < EPS && Math.abs(edge.ax - other.x) < EPS && Math.abs(edge.bx - other.x) < EPS) ||
          (Math.abs(edge.ay - other.y) < EPS && Math.abs(edge.by - (other.y + other.height)) < EPS && Math.abs(edge.ax - (other.x + other.width)) < EPS && Math.abs(edge.bx - (other.x + other.width)) < EPS)
        ),
      )

      walls.push({
        id: `wall-${wallId++}`,
        role: shared ? 'internal' : 'external',
        startX: edge.ax,
        startY: edge.ay,
        endX: edge.bx,
        endY: edge.by,
        thickness: shared ? 0.2 : 0.25,
        height: 3.0,
        leftRoomId: room.id,
        rightRoomId: shared?.id,
        loadBearing: !shared,
      })
    }
  }

  return dedupeWalls(walls)
}

function dedupeWalls(walls: SchemaWall[]): SchemaWall[] {
  const EPS = 0.05
  return walls.filter((w, i) =>
    !walls.some((o, j) =>
      j < i &&
      Math.abs(w.startX - o.startX) < EPS &&
      Math.abs(w.startY - o.startY) < EPS &&
      Math.abs(w.endX - o.endX) < EPS &&
      Math.abs(w.endY - o.endY) < EPS,
    ),
  )
}

// ── Scoring ──

const SCORE_WEIGHTS = {
  areaEfficiency: 0.30,
  wetCoreCompactness: 0.20,
  structuralRegularity: 0.15,
  corridorEfficiency: 0.15,
  daylightPotential: 0.10,
  ventilationPotential: 0.10,
}

export function computeScores(schema: LayoutSchema): SchemaScores {
  const areaEfficiency = scoreAreaEfficiency(schema)
  const wetCoreCompactness = scoreWetCoreCompactness(schema)
  const structuralRegularity = scoreStructuralRegularity(schema)
  const corridorEfficiency = scoreCorridorEfficiency(schema)
  const daylightPotential = scoreDaylightPotential(schema)
  const ventilationPotential = scoreVentilationPotential(schema)

  const composite = Math.round(
    (areaEfficiency * SCORE_WEIGHTS.areaEfficiency +
      wetCoreCompactness * SCORE_WEIGHTS.wetCoreCompactness +
      structuralRegularity * SCORE_WEIGHTS.structuralRegularity +
      corridorEfficiency * SCORE_WEIGHTS.corridorEfficiency +
      daylightPotential * SCORE_WEIGHTS.daylightPotential +
      ventilationPotential * SCORE_WEIGHTS.ventilationPotential) * 100,
  ) / 100

  return {
    areaEfficiency: Math.round(areaEfficiency * 100) / 100,
    wetCoreCompactness: Math.round(wetCoreCompactness * 100) / 100,
    structuralRegularity: Math.round(structuralRegularity * 100) / 100,
    corridorEfficiency: Math.round(corridorEfficiency * 100) / 100,
    daylightPotential: Math.round(daylightPotential * 100) / 100,
    ventilationPotential: Math.round(ventilationPotential * 100) / 100,
    composite,
  }
}

function scoreAreaEfficiency(schema: LayoutSchema): number {
  const totalArea = schema.building.width * schema.building.depth
  if (totalArea <= 0) return 0
  const roomArea = schema.rooms.reduce((s, r) => s + r.width * r.height, 0)
  const ratio = Math.min(1, roomArea / totalArea)
  return 0.4 + ratio * 0.6
}

function scoreWetCoreCompactness(schema: LayoutSchema): number {
  const wetCores = schema.rooms.filter(r => r.isWetCore)
  if (wetCores.length <= 1) return 1.0
  let totalDist = 0
  let pairs = 0
  for (let i = 0; i < wetCores.length; i++) {
    for (let j = i + 1; j < wetCores.length; j++) {
      const dx = wetCores[i].x - wetCores[j].x
      const dy = wetCores[i].y - wetCores[j].y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      pairs++
    }
  }
  const avgDist = pairs > 0 ? totalDist / pairs : 0
  return Math.max(0, 1 - avgDist / 12)
}

function scoreStructuralRegularity(schema: LayoutSchema): number {
  if (schema.rooms.length === 0) return 0
  const uniqueWidths = new Set(schema.rooms.map(r => Math.round(r.width * 10)))
  const uniqueHeights = new Set(schema.rooms.map(r => Math.round(r.height * 10)))
  const widthScore = 1 - Math.min(1, uniqueWidths.size / schema.rooms.length)
  const heightScore = 1 - Math.min(1, uniqueHeights.size / schema.rooms.length)
  return (widthScore + heightScore) / 2
}

function scoreCorridorEfficiency(schema: LayoutSchema): number {
  if (schema.circulation.corridors.length === 0) return 0
  const totalRoomArea = schema.rooms.reduce((s, r) => s + r.width * r.height, 0)
  if (totalRoomArea <= 0) return 0.5
  const circArea = schema.circulation.corridors.reduce((s, c) => s + c.width * c.height, 0)
  const circRatio = circArea / totalRoomArea
  if (circRatio > 0.3) return Math.max(0, 1 - circRatio)
  return 0.5 + (1 - circRatio / 0.3) * 0.5
}

function scoreDaylightPotential(schema: LayoutSchema): number {
  const externalWalls = schema.walls.filter(w => w.role === 'external')
  if (externalWalls.length === 0) return 0.5
  const dimRooms = schema.rooms.filter(r => r.width > 6 || r.height > 6)
  if (dimRooms.length === 0) return 1.0
  const deepRatio = dimRooms.length / schema.rooms.length
  return Math.max(0, 1 - deepRatio * 0.5)
}

function scoreVentilationPotential(schema: LayoutSchema): number {
  const exposedRooms = new Set<string>()
  for (const wall of schema.walls) {
    if (wall.role === 'external') {
      if (wall.leftRoomId) exposedRooms.add(wall.leftRoomId)
      if (wall.rightRoomId) exposedRooms.add(wall.rightRoomId)
    }
  }
  if (schema.rooms.length === 0) return 0.5
  const crossVentRooms = schema.rooms.filter(r => {
    const hasEastWall = schema.walls.some(w => (w.leftRoomId === r.id || w.rightRoomId === r.id) && w.role === 'external' && Math.abs(w.startX - w.endX) < 0.01)
    const hasWestWall = schema.walls.some(w => (w.leftRoomId === r.id || w.rightRoomId === r.id) && w.role === 'external' && Math.abs(w.startX - w.endX) < 0.01)
    const hasNorthWall = schema.walls.some(w => (w.leftRoomId === r.id || w.rightRoomId === r.id) && w.role === 'external' && Math.abs(w.startY - w.endY) < 0.01)
    const hasSouthWall = schema.walls.some(w => (w.leftRoomId === r.id || w.rightRoomId === r.id) && w.role === 'external' && Math.abs(w.startY - w.endY) < 0.01)
    return (hasEastWall && hasWestWall) || (hasNorthWall && hasSouthWall)
  })
  return Math.max(0.3, Math.min(1, exposedRooms.size / schema.rooms.length * 0.5 + crossVentRooms.length / schema.rooms.length * 0.5))
}

// ── Adapter: FloorPlan → LayoutSchema ──

export function floorPlanToSchema(
  plan: import('./tier3/layoutEngine').FloorPlan,
  program: ProgramItem[],
  egressPoints: EgressPoint[],
  adjacencyWarnings: AdjacencyWarning[],
  meta?: Partial<SchemaMeta>,
): LayoutSchema {
  const roomIdMap = new Map<string, string>()
  let roomIdx = 0

  const rooms: SchemaRoom[] = plan.rooms.map(r => {
    const id = `room-${roomIdx++}`
    roomIdMap.set(r.name, id)
    return {
      id,
      name: r.name,
      zone: (r.zone as SchemaZone) ?? 'public',
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      floor: plan.floorIndex ?? 0,
      area: r.width * r.height,
      isWetCore: r.isWetCore ?? false,
      wallIds: [],
      openingIds: [],
      adjacentRoomIds: [],
      programSource: program.find(p => r.name.startsWith(p.name))?.name,
    }
  })

  for (const room of rooms) {
    room.adjacentRoomIds = rooms
      .filter(o => o.id !== room.id && !(room.x + room.width <= o.x || o.x + o.width <= room.x || room.y + room.height <= o.y || o.y + o.height <= room.y))
      .map(o => o.id)
  }

  const walls = deriveWalls(rooms)
  for (const room of rooms) {
    room.wallIds = walls.filter(w => w.leftRoomId === room.id || w.rightRoomId === room.id).map(w => w.id)
  }

  const corridors: SchemaCorridor[] = []
  for (const room of rooms) {
    if (room.zone === 'circulation') {
      corridors.push({
        id: `corr-${corridors.length}`,
        x: room.x,
        y: room.y,
        width: room.width,
        height: room.height,
        floor: room.floor,
        connectedRoomIds: room.adjacentRoomIds,
      })
    }
  }

  const entries: SchemaEntry[] = egressPoints.map((ep, i) => ({
    type: ep.type as SchemaEntry['type'],
    x: ep.x,
    y: ep.y,
    connectedCorridorId: corridors.length > 0 ? corridors[0].id : undefined,
  }))

  return buildSchema(
    {
      name: plan.name,
      typology: plan.topology,
      floorCount: plan.totalFloors ?? 1,
      floorHeight: 3.0,
      width: plan.width,
      depth: plan.height,
    },
    rooms,
    {
      corridors,
      entries,
      maxTravelDistance: plan.maxTravelDistance ?? 0,
      egressCompliant: plan.egressCompliant ?? false,
      warnings: (adjacencyWarnings ?? []).map(w => w.message),
    },
    {
      gridX: 0,
      gridY: 0,
      maxSpan: 6,
      slabSystem: 'rc-slab',
      wallConstruction: 'masonry',
      corePositions: [],
    },
    meta,
  )
}
