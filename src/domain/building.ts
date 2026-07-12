/**
 * building.ts — Canonical Building Graph
 *
 * This is the SINGLE source of truth for all building,
 * site, and project data. Every output (2D, 3D, BOQ,
 * schedules, Gantt, boards, interoperability) derives
 * from this graph via typed adapter projections.
 *
 * No engine creates its own view of the building.
 */

// ── Geometry primitives ──────────────────────────────────────

export interface Point2D {
  x: number
  y: number
}

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface Polygon2D {
  vertices: Point2D[]
}

export interface BBox2D {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// ── Grid / referencing ───────────────────────────────────────

export interface GridAxis {
  id: string
  label: string
  /** 'horizontal' | 'vertical' */
  direction: 'horizontal' | 'vertical'
  /** Position in mm from origin */
  position: number
}

export interface GridSystem {
  id: string
  horizontal: GridAxis[]
  vertical: GridAxis[]
}

// ── Levels / storeys ─────────────────────────────────────────

export interface Level {
  id: string
  name: string
  number: number
  elevation: number
  floorHeight: number
  description?: string
}

// ── Spaces / rooms ───────────────────────────────────────────

export type RoomProgramme =
  | 'bedroom' | 'living' | 'dining' | 'kitchen' | 'bathroom'
  | 'ensuite' | 'hallway' | 'study' | 'lounge' | 'laundry'
  | 'pantry' | 'office' | 'playroom' | 'gym' | 'cinema'
  | 'storage' | 'entry' | 'landing' | 'balcony' | 'circulation'
  | 'stairwell' | 'lobby' | 'reception' | 'conference'
  | 'classroom' | 'ward' | 'consultation' | 'laboratory'
  | 'retail' | 'restaurant' | 'warehouse' | 'parking'
  | 'plant' | 'service' | 'other'

export type SurfaceType = 'wall' | 'floor' | 'ceiling'

export type MaterialCategory =
  | 'tile' | 'natural-stone' | 'timber' | 'laminate' | 'vinyl'
  | 'carpet' | 'paint' | 'wallpaper' | 'plaster' | 'concrete'
  | 'glass' | 'metal' | 'mirror' | 'fabric' | 'roofing'
  | 'waterproofing' | 'insulation' | 'other'

export interface MaterialSpec {
  id: string
  name: string
  category: MaterialCategory
  color: string
  pattern?: string
  unit: 'm2' | 'm' | 'each'
  rateCents: number
}

export interface FinishSpec {
  wallMaterialId: string | null
  floorMaterialId: string | null
  ceilingMaterialId: string | null
  wallFinish: string
  floorFinish: string
  ceilingFinish: string
}

export interface FixtureInstance {
  instanceId: string
  fixtureTypeId: string
  position: Point2D
  rotation: number
  flipped: boolean
}

export interface Space {
  id: string
  levelId: string
  name: string
  programme: RoomProgramme
  boundary: Polygon2D
  bbox: BBox2D
  areaM2: number
  finishSpec: FinishSpec
  fixtures: FixtureInstance[]
  notes: string
}

// ── Structural elements ──────────────────────────────────────

export type WallRole = 'external' | 'internal' | 'retaining' | 'party'

export interface Wall {
  id: string
  levelId: string
  role: WallRole
  start: Point3D
  end: Point3D
  thickness: number
  height: number
  material: string
  ifcClass: string
  properties: Record<string, string | number | boolean>
}

export interface Slab {
  id: string
  levelId: string
  boundary: Polygon2D
  thickness: number
  material: string
  ifcClass: string
  properties: Record<string, string | number | boolean>
}

export type OpeningKind = 'door' | 'window' | 'louver' | 'skylight' | 'archway'

export interface Opening {
  id: string
  levelId: string
  wallId: string
  kind: OpeningKind
  offsetRatio: number
  width: number
  height: number
  sillHeight: number
  material: string
  ifcClass: string
  properties: Record<string, string | number | boolean>
}

export interface Column {
  id: string
  levelId: string
  position: Point2D
  width: number
  depth: number
  height: number
  material: string
  ifcClass: string
  properties: Record<string, string | number | boolean>
}

export interface Beam {
  id: string
  levelId: string
  start: Point3D
  end: Point3D
  width: number
  depth: number
  material: string
  ifcClass: string
  properties: Record<string, string | number | boolean>
}

export type StairType = 'straight' | 'l-shaped' | 'u-shaped' | 'spiral'

export interface Stair {
  id: string
  levelId: string
  fromLevelId: string
  toLevelId: string
  stairType: StairType
  width: number
  treadCount: number
  rise: number
  going: number
  material: string
  properties: Record<string, string | number | boolean>
}

export type RoofType = 'flat' | 'pitched' | 'concrete-slab' | 'cgi-truss' | 'green'

export interface Roof {
  id: string
  levelId: string
  roofType: RoofType
  boundary: Polygon2D
  thickness: number
  pitch: number
  material: string
  properties: Record<string, string | number | boolean>
}

// ── Structural system ────────────────────────────────────────

export interface StructuralSpan {
  id: string
  direction: 'x' | 'y'
  length: number
  supportedBy: string[]
}

export interface StructuralSystem {
  grid: GridSystem
  spans: StructuralSpan[]
  lateralSystem: 'shear-wall' | 'moment-frame' | 'braced-frame' | 'core'
  floorSystem: 'two-way-slab' | 'one-way-slab' | 'flat-plate' | 'ribbed' | 'timber-joist'
}

// ── Services ─────────────────────────────────────────────────

export type ServiceType = 'plumbing' | 'electrical' | 'hvac' | 'fire' | 'data'

export interface ServiceZone {
  id: string
  levelId: string
  serviceType: ServiceType
  boundary: Polygon2D
  areaM2: number
  properties: Record<string, string | number | boolean>
}

// ── Building graph ───────────────────────────────────────────

export type BuildingCategory = 'residential' | 'commercial' | 'mixed-use'
  | 'institutional' | 'industrial' | 'healthcare' | 'education'
  | 'civic' | 'religious' | 'agricultural'

export interface BuildingMeta {
  id: string
  projectId: string
  name: string
  category: BuildingCategory
  description: string
  createdAt: string
  updatedAt: string
}

export interface BuildingGraph {
  meta: BuildingMeta
  site: import('./site').SiteContext | null
  levels: Level[]
  spaces: Space[]
  walls: Wall[]
  slabs: Slab[]
  openings: Opening[]
  columns: Column[]
  beams: Beam[]
  stairs: Stair[]
  roof: Roof | null
  structural: StructuralSystem | null
  serviceZones: ServiceZone[]
}

// ── Derivation metadata ──────────────────────────────────────

export interface DerivationMeta {
  source: 'prompt' | 'plan-import' | 'dxf-import' | 'ifc-import' | 'image-import' | 'manual'
  confidence: number
  warnings: string[]
  derivedAt: string
}

export interface DerivationResult<T> {
  graph: T
  derivation: DerivationMeta
}

// ── Quantity extraction from graph ───────────────────────────

export interface GraphQuantities {
  grossFloorArea: number
  totalWallsM2: number
  totalSlabsM3: number
  totalOpenings: number
  doorCount: number
  windowCount: number
  roomCount: number
  wetRoomCount: number
  finishFloorArea: number
  roofArea: number
  externalWallArea: number
  partitionArea: number
  floorCount: number
}

// ── Graph query helpers ──────────────────────────────────────

export function getLevelsSorted(graph: BuildingGraph): Level[] {
  return [...graph.levels].sort((a, b) => a.number - b.number)
}

export function getSpacesOnLevel(graph: BuildingGraph, levelId: string): Space[] {
  return graph.spaces.filter((s) => s.levelId === levelId)
}

export function getWallsOnLevel(graph: BuildingGraph, levelId: string): Wall[] {
  return graph.walls.filter((w) => w.levelId === levelId)
}

export function getOpeningsOnLevel(graph: BuildingGraph, levelId: string): Opening[] {
  return graph.openings.filter((o) => o.levelId === levelId)
}

export function computeGraphQuantities(graph: BuildingGraph): GraphQuantities {
  const spaces = graph.spaces
  const walls = graph.walls
  const openings = graph.openings

  const grossFloorArea = spaces.reduce((s, r) => s + r.areaM2, 0)
  const wetRoomTypes: RoomProgramme[] = ['bathroom', 'ensuite', 'kitchen', 'laundry', 'pantry']
  const wetRoomCount = spaces.filter((r) => wetRoomTypes.includes(r.programme)).length
  const externalWalls = walls.filter((w) => w.role === 'external')
  const internalWalls = walls.filter((w) => w.role === 'internal')

  return {
    grossFloorArea,
    totalWallsM2: walls.reduce((s, w) => s + w.height * distance(w.start, w.end), 0),
    totalSlabsM3: graph.slabs.reduce((s, sl) => s + polygonArea(sl.boundary) * sl.thickness, 0),
    totalOpenings: openings.length,
    doorCount: openings.filter((o) => o.kind === 'door').length,
    windowCount: openings.filter((o) => o.kind === 'window').length,
    roomCount: spaces.length,
    wetRoomCount,
    finishFloorArea: spaces.reduce((s, r) => s + r.areaM2 * 0.9, 0),
    roofArea: graph.roof ? polygonArea(graph.roof.boundary) : 0,
    externalWallArea: externalWalls.reduce((s, w) => s + w.height * distance(w.start, w.end), 0),
    partitionArea: internalWalls.reduce((s, w) => s + w.height * distance(w.start, w.end), 0),
    floorCount: graph.levels.length,
  }
}

function distance(a: Point3D, b: Point3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2)
}

function polygonArea(poly: Polygon2D): number {
  const v = poly.vertices
  if (v.length < 3) return 0
  let area = 0
  for (let i = 0; i < v.length; i++) {
    const j = (i + 1) % v.length
    area += v[i].x * v[j].y
    area -= v[j].x * v[i].y
  }
  return Math.abs(area / 2)
}
