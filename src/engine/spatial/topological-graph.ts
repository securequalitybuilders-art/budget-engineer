/**
 * Topological graph — the unified adjacency abstraction for all typologies.
 *
 * A bubble diagram is a small labelled graph: spatial nodes (rooms) and
 * topological edges (expected adjacencies) with optional weights and
 * must-satisfy flags. Diagrams can come from the deterministic brief parser
 * (local), from a free-tier LLM (remote, strictly JSON-validated), or be
 * derived from a typology strategy's own adjacency rules. The realizer in
 * topological-realizer.ts turns a diagram back into a FloorLayoutResult.
 *
 * This module is intentionally dependency-light: it depends only on
 * roomStandards (for zone classification) and the tier1-types it shares.
 */

import { buildGroupClassifier, computeAdjacencyScore, normalizeRoomName, rectsTouch, type AdjacencyRoom, type RoomGroupSpec } from './adjacency-graph'
import type { AdjacencyGraphModel, AdjacencyRule, ProgramItem } from '../tier1-types'
import { getRoomStandard } from '../standards/roomStandards'

export type SpatialRole = 'public' | 'private' | 'service' | 'circulation' | 'core'

export type AdjacencyType = 'door' | 'window' | 'wall' | 'open-plan' | 'vertical'

export type OccupancyClass =
  | 'A1' | 'A2' | 'A3'
  | 'B1' | 'B2' | 'B3'
  | 'E1'
  | 'F1' | 'F2' | 'F3'
  | 'G1'
  | 'H1' | 'H2'
  | 'J1' | 'J2' | 'J3'

export interface SpatialNode {
  id: string
  name: string
  areaM2: number
  role?: SpatialRole
  group?: string | null
  /** SANS 10400-A occupancy class for IFC IfcSpace regulatory compliance. */
  occupancyClass?: OccupancyClass
  /** Design population (persons) for the room — IFC regulatory compliance [25]. */
  designPopulation?: number
  /** True when the room is programmatically mandatory (must appear in the layout). */
  mandatory?: boolean
  /** True when the room requires direct daylight (window-to-floor ≥ 0.15 per SANS 10400 Part O). */
  daylightRequirement?: boolean
  /** True when the room must satisfy SANS 10400 Part S universal accessibility. */
  accessibilityRequired?: boolean
  /** Preferred structural grid alignment (e.g. 7.2 for a 7.2m RC frame grid). */
  structuralGridAlignment?: number
}

export interface TopologicalEdge {
  from: string
  to: string
  type?: AdjacencyType
  weight?: number
  must?: boolean
  /** Door / opening width in metres (By-Laws Ch4: min 0.9m habitable, 0.8m service). */
  width?: number
  /** Fire-resistance rating in minutes (Grade A=240, B=120, C=60, D=30 per By-Laws Ch4). */
  fireRating?: number
}

export interface BubbleDiagram {
  nodes: SpatialNode[]
  edges: TopologicalEdge[]
  typologyId?: string
  programSummary?: { totalAreaM2: number; roomCount: number }
}

export interface BubbleDiagramOptions {
  typologyId?: string
  /** Group-level adjacency rules to derive edges from. Default GENERIC_ADJACENCY_RULES. */
  adjacencyRules?: AdjacencyRule[]
  /** Node group classifier. Default genericGroupFor. */
  groupFor?: (name: string) => string | null
}

/** Groups that always classify as 'core' regardless of room-standards zone. */
export const CORE_SPATIAL_GROUPS: string[] = ['stair', 'lift']

/** Spatial-role classification for a room name (standards zone + core override). */
export function classifySpatialRole(name: string, group?: string | null): SpatialRole {
  if (group && CORE_SPATIAL_GROUPS.includes(group)) return 'core'
  const std = getRoomStandard(name)
  if (std.zone === 'circulation') return 'circulation'
  if (std.zone === 'public') return 'public'
  if (std.zone === 'service') return 'service'
  return 'private'
}

/** Generic room groups — a superset of the office/clinic/hotel patterns. */
export const GENERIC_ROOM_GROUPS: RoomGroupSpec[] = [
  { group: 'reception', patterns: ['reception / waiting', 'reception', 'receptionist', 'lobby', 'front desk'] },
  { group: 'living', patterns: ['living room', 'living area', 'lounge', 'family room', 'sitting room', 'living / dining', 'lounge / dining'] },
  { group: 'dining', patterns: ['dining room', 'dining area', 'dining', 'breakfast room', 'nook'] },
  { group: 'bedroom', patterns: ['master bedroom', 'guest bedroom', 'guest room', 'hotel room', 'hotel suite', 'bedroom', 'sleeping room', 'dormitory', 'hostel'] },
  { group: 'kitchen', patterns: ['commercial kitchen', 'kitchen', 'pantry', 'servery', 'food prep'] },
  { group: 'wc', patterns: ['guest wc', 'customer wc', 'staff wc', 'patient wc', 'public wc', 'wc', 'toilet', 'ablution', 'washroom', 'restroom', 'bathroom', 'en-suite'] },
  { group: 'stair', patterns: ['staircase', 'stairwell', 'stair hall', 'stairs', 'stair'] },
  { group: 'lift', patterns: ['lift core', 'lift lobby', 'elevator', 'lift'] },
  { group: 'corridor', patterns: ['corridor', 'circulation', 'passage', 'walkway', 'entry hall', 'entrance hall'] },
  { group: 'store', patterns: ['store room', 'storage room', 'store', 'storage', 'utility room', 'cleaner room', 'plant room', 'boiler room'] },
  { group: 'office', patterns: ['private office', 'executive office', 'director office', 'manager office', 'administrative office', 'admin office', 'admin', 'office'] },
  { group: 'open-plan', patterns: ['open-plan office', 'open plan office', 'open-plan', 'open plan', 'open office', 'bullpen'] },
  { group: 'meeting', patterns: ['conference room', 'meeting room', 'board room', 'boardroom', 'meeting', 'conference', 'classroom', 'consultation room', 'consulting room', 'treatment room', 'exam room'] },
  { group: 'kitchenette', patterns: ['kitchenette', 'tea room', 'break room', 'staff room'] },
  { group: 'server', patterns: ['server room', 'server', 'it room', 'data room', 'comms room', 'communications room'] },
  { group: 'retail', patterns: ['sales floor', 'shop', 'retail', 'storefront', 'market', 'sales area'] },
  { group: 'assembly', patterns: ['hall', 'auditorium', 'theatre', 'theater', 'church', 'chapel', 'mosque', 'worship', 'banquet hall', 'banquet room', 'function room', 'seminar room', 'ballroom'] },
  { group: 'entrance', patterns: ['entrance', 'foyer', 'vestibule', 'porch', 'veranda', 'verandah', 'stoop'] },
  { group: 'service', patterns: ['laundry', 'linen room', 'linen', 'housekeeping', 'back of house', 'back-of-house', 'staff canteen', 'staff changing'] },
]

/**
 * Generic group classifier (longest-pattern-first substring), matching the
 * office/clinic/hotel classifier semantics in adjacency-graph.ts.
 */
export const genericGroupFor: (name: string) => string | null = buildGroupClassifier(GENERIC_ROOM_GROUPS)

/** Generic group-level adjacency rules — private/circulation backbone + kitchen/dining bond. */
export const GENERIC_ADJACENCY_RULES: AdjacencyRule[] = [
  { from: 'bedroom', to: 'corridor', weight: 3 },
  { from: 'living', to: 'corridor', weight: 2 },
  { from: 'dining', to: 'corridor', weight: 2 },
  { from: 'kitchen', to: 'dining', weight: 3 },
  { from: 'kitchen', to: 'corridor', weight: 1 },
  { from: 'wc', to: 'corridor', weight: 2 },
  { from: 'stair', to: 'corridor', weight: 3 },
  { from: 'lift', to: 'corridor', weight: 2 },
  { from: 'office', to: 'corridor', weight: 2 },
  { from: 'store', to: 'corridor', weight: 1 },
  { from: 'living', to: 'dining', weight: 2 },
  { from: 'entrance', to: 'living', weight: 2 },
  { from: 'entrance', to: 'corridor', weight: 1 },
  { from: 'retail', to: 'corridor', weight: 2 },
  { from: 'assembly', to: 'corridor', weight: 2 },
]

/** Expand a ProgramItem list into discrete SpatialNodes, one per instance. */
export function expandProgram(program: ProgramItem[], groupFor: (name: string) => string | null = genericGroupFor): SpatialNode[] {
  const nodes: SpatialNode[] = []
  for (const item of program) {
    const count = Math.max(1, Math.round(item.count || 1))
    for (let i = 0; i < count; i++) {
      const suffix = count > 1 ? ` ${i + 1}` : ''
      const name = `${item.name}${suffix}`
      const group = groupFor(name)
      const std = getRoomStandard(name)
      const isCore = group != null && CORE_SPATIAL_GROUPS.includes(group)
      const isHabitable = std.zone === 'public' || std.zone === 'private'
      nodes.push({
        id: slugify(name, nodes.length),
        name,
        areaM2: Math.max(0.5, item.areaM2 || 0.5),
        role: classifySpatialRole(name, group),
        group,
        mandatory: isCore || group === 'corridor' || isHabitable,
        daylightRequirement: isHabitable && !isCore,
      })
    }
  }
  return nodes
}

function slugify(name: string, index: number): string {
  const base = normalizeRoomName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'room'
  return `${base}-${index}`
}

/** Expand group-level AdjacencyRules into node-pair TopologicalEdges (deduped). */
export function edgesFromRules(rules: AdjacencyRule[], nodes: SpatialNode[], type: AdjacencyType = 'door'): TopologicalEdge[] {
  const groupOf = new Map<string, string | null>()
  for (const node of nodes) groupOf.set(node.id, node.group ?? null)

  const edges: TopologicalEdge[] = []
  const seen = new Set<string>()
  for (const rule of rules) {
    for (const a of nodes) {
      if (groupOf.get(a.id) !== rule.from) continue
      for (const b of nodes) {
        if (groupOf.get(b.id) !== rule.to) continue
        if (a.id === b.id) continue
        const key = [a.id, b.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ from: a.id, to: b.id, type, weight: rule.weight, must: rule.must })
      }
    }
  }
  return edges
}

/** Collapse node-pair TopologicalEdges into group-level AdjacencyRules (deduped). */
export function edgesToRules(edges: TopologicalEdge[], nodes: SpatialNode[]): AdjacencyRule[] {
  const groupOf = new Map<string, string | null>()
  for (const node of nodes) groupOf.set(node.id, node.group ?? null)

  const byGroup = new Map<string, AdjacencyRule>()
  for (const edge of edges) {
    const from = groupOf.get(edge.from)
    const to = groupOf.get(edge.to)
    if (from == null || to == null || from === to) continue
    const key = [from, to].sort().join('|')
    const existing = byGroup.get(key)
    const weight = Math.max(existing?.weight ?? 0, edge.weight ?? 1)
    byGroup.set(key, { from, to, weight, must: existing?.must ?? edge.must })
  }
  return [...byGroup.values()]
}

/** Build a bubble diagram from a program + optional typology adjacency rules. */
export function bubbleFromProgram(program: ProgramItem[], options: BubbleDiagramOptions = {}): BubbleDiagram {
  const groupFor = options.groupFor ?? genericGroupFor
  const nodes = expandProgram(program, groupFor)
  const rules = options.adjacencyRules && options.adjacencyRules.length > 0 ? options.adjacencyRules : GENERIC_ADJACENCY_RULES
  const edges = edgesFromRules(rules, nodes)
  const totalAreaM2 = nodes.reduce((sum, n) => sum + n.areaM2, 0)
  return {
    nodes,
    edges,
    typologyId: options.typologyId,
    programSummary: { totalAreaM2, roomCount: nodes.length },
  }
}

export interface BubbleFromRoomsOptions {
  typologyId?: string
  /** Group-level adjacency rules to derive edges from. Default GENERIC_ADJACENCY_RULES. */
  adjacencyRules?: AdjacencyRule[]
  /** Node group classifier. Default genericGroupFor. */
  groupFor?: (name: string) => string | null
}

/**
 * Derive a bubble diagram from a placed room layout (the realized geometry).
 * Node ids/names/areas come from the placed rooms; edges come from the same
 * group-level adjacency rules the strategy placed with, so the diagram reflects
 * what was actually realized rather than the idealised program.
 */
export function bubbleFromRooms(
  rooms: { id: string; name: string; width: number; height: number }[],
  options: BubbleFromRoomsOptions = {},
): BubbleDiagram {
  const groupFor = options.groupFor ?? genericGroupFor
  const nodes: SpatialNode[] = rooms.map(r => {
    const group = groupFor(r.name)
    const std = getRoomStandard(r.name)
    const isCore = group != null && CORE_SPATIAL_GROUPS.includes(group)
    const isHabitable = std.zone === 'public' || std.zone === 'private'
    return {
      id: r.id,
      name: r.name,
      areaM2: Math.max(0.5, r.width * r.height),
      group,
      role: classifySpatialRole(r.name, group),
      mandatory: isCore || group === 'corridor' || isHabitable,
      daylightRequirement: isHabitable && !isCore,
    }
  })
  const rules =
    options.adjacencyRules && options.adjacencyRules.length > 0 ? options.adjacencyRules : GENERIC_ADJACENCY_RULES
  const edges = edgesFromRules(rules, nodes)
  return {
    nodes,
    edges,
    typologyId: options.typologyId,
    programSummary: {
      totalAreaM2: nodes.reduce((sum, n) => sum + n.areaM2, 0),
      roomCount: nodes.length,
    },
  }
}

export interface DiagramScoreOptions {
  rules?: AdjacencyRule[]
  touch?: (a: AdjacencyRoom, b: AdjacencyRoom) => boolean
  groupFor?: (name: string) => string | null
}

/**
 * Score a bubble diagram against a placed layout using computeAdjacencyScore.
 * `rooms` are the placed AdjacencyRoom rects; rules default to the diagram's
 * collapsed group rules and groupFor defaults to genericGroupFor.
 */
export function diagramAdjacencyScore(
  diagram: BubbleDiagram,
  rooms: AdjacencyRoom[],
  options: DiagramScoreOptions = {},
): AdjacencyGraphModel {
  const rules = options.rules ?? edgesToRules(diagram.edges, diagram.nodes)
  const groupFor = options.groupFor ?? genericGroupFor
  return computeAdjacencyScore(rules, rooms, options.touch ?? rectsTouch, groupFor)
}

// ─────────────────────────────────────────────────────────────────────
// § 2  Dual-encoder allocator — semantic + geometric feasibility
// ─────────────────────────────────────────────────────────────────────

/**
 * SANS 10400-A occupancy class mapped from the room-standard zone or group.
 * Covers the 16 SANS 10400-A classes. For rooms without a direct match
 * the function returns undefined (caller decides fallback).
 */
function classifyOccupancyForRoom(name: string, group: string | null | undefined): OccupancyClass | undefined {
  const n = name.toLowerCase()
  const g = (group ?? '').toLowerCase()
  // Residential (B1-B3)
  if (g === 'bedroom' || g === 'living') return 'B2'
  if (n.includes('hotel') || n.includes('guest') || n.includes('dormitory')) return 'H1'
  // Assembly (A1-A3)
  if (g === 'assembly') return 'A2'
  if (g === 'open-plan' || g === 'office') return 'E1'
  // Retail / food (F1-F3)
  if (g === 'retail') return 'F2'
  if (n.includes('restaurant') || n.includes('cafe') || n.includes('bar')) return 'F3'
  // Storage (G1)
  if (g === 'store' || n.includes('warehouse')) return 'G1'
  // Core / circulation / service — no occupancy class
  if (g === 'stair' || g === 'lift' || g === 'corridor' || g === 'wc' || g === 'kitchen') return undefined
  // Default to E1 (office / generic)
  return 'E1'
}

/** Design-population densities per SANS 10400-A class (persons / m²). */
const CLASS_POPULATION_DENSITY: Record<string, number> = {
  A1: 0.5,   // 2 m² per person (entertainment standing)
  A2: 0.5,   // 2 m² per person (assembly)
  A3: 0.33,  // 3 m² per person (instruction, seated)
  B1: 0.1,   // 10 m² per person (dwelling)
  B2: 0.1,
  B3: 0.1,
  E1: 0.1,   // 10 m² per person (office)
  F1: 0.5,   // 2 m² per person (large retail)
  F2: 0.25,  // 4 m² per person (small retail)
  F3: 0.5,
  G1: 0.05,  // 20 m² per person (storage)
  H1: 0.1,   // hotel
  H2: 0.1,
  J1: 0.05,
  J2: 0.05,
  J3: 0.05,
}

/**
 * Estimate design population for a room from its area and occupancy class.
 * Returns 0 for core/circulation rooms that don't carry a population.
 */
export function estimateDesignPopulation(areaM2: number, occupancyClass: OccupancyClass | undefined): number {
  if (!occupancyClass) return 0
  const density = CLASS_POPULATION_DENSITY[occupancyClass]
  if (density === undefined) return 0
  return Math.max(1, Math.round(areaM2 * density))
}

/**
 * Semantic encoder — stamps occupancyClass + designPopulation + regulatory
 * flags onto a SpatialNode list.  Pure function, no side-effects.
 */
export function encodeNodeSemantics(nodes: SpatialNode[]): SpatialNode[] {
  return nodes.map(n => {
    const occ = n.occupancyClass ?? classifyOccupancyForRoom(n.name, n.group)
    const std = getRoomStandard(n.name)
    const isCore = n.group != null && CORE_SPATIAL_GROUPS.includes(n.group)
    const isHabitable = std.zone === 'public' || std.zone === 'private'
    return {
      ...n,
      occupancyClass: occ,
      designPopulation: n.designPopulation ?? estimateDesignPopulation(n.areaM2, occ),
      mandatory: n.mandatory ?? (isCore || n.group === 'corridor' || isHabitable),
      daylightRequirement: n.daylightRequirement ?? (isHabitable && !isCore),
      accessibilityRequired: n.accessibilityRequired ?? (occ != null && occ !== 'G1'),
      structuralGridAlignment: n.structuralGridAlignment,
    }
  })
}

/**
 * Geometry rect for a placed node.
 */
export interface PlacedRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

/** AABB overlap test (strict, touching edges do NOT overlap). */
export function hasOverlap(a: PlacedRect, b: PlacedRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** True if `a` is entirely contained within `b` (edges may touch). */
export function isContained(a: PlacedRect, container: PlacedRect): boolean {
  return a.x >= container.x && a.y >= container.y && a.x + a.w <= container.x + container.w && a.y + a.h <= container.y + container.h
}

/** Given an area, return the most compact (closest to square) rect. */
function compactRect(areaM2: number): { w: number; h: number } {
  const side = Math.sqrt(areaM2)
  const w = Math.max(1.5, Math.round(side * 10) / 10)
  const h = Math.max(1.5, Math.round((areaM2 / w) * 10) / 10)
  return { w, h }
}

export interface AllocateOptions {
  /** Building envelope (rooms must stay inside). */
  envelope?: { width: number; height: number }
  /** Structural grid snap (default: no snap). */
  gridSnap?: number
  /** Spiral search radius in metres (default: 50). */
  maxSearchRadius?: number
  /** Seed for deterministic placement order. */
  seed?: number
}

export interface AllocateResult {
  placed: PlacedRect[]
  placedNodes: (SpatialNode & PlacedRect)[]
  containedAll: boolean
  overlapCount: number
  adjacencyScore: number
  violations: string[]
}

/**
 * Deterministic geometric allocator — places every node inside an optional
 * envelope using a spiral search from the centroid, mandatory rooms first,
 * maximising adjacency weight and avoiding overlaps.
 *
 * This is the "geometric feasibility encoder" half of the dual-encoder
 * pattern.  It does NOT use a GNN — it's a greedy heuristic that gives
 * a valid baseline layout.  The FCBD framework in fcbd.ts then validates
 * and repairs the result.
 */
export function allocateNodes(
  nodes: SpatialNode[],
  edges: TopologicalEdge[],
  options: AllocateOptions = {},
): AllocateResult {
  const envW = options.envelope?.width ?? 100
  const envH = options.envelope?.height ?? 100
  const gridSnap = options.gridSnap ?? 0
  const maxR = options.maxSearchRadius ?? 50

  // 1. Encode semantics if not already done
  const encoded = nodes.some(n => n.occupancyClass) ? nodes : encodeNodeSemantics(nodes)

  // 2. Sort: mandatory first, then by area descending (big rooms place first)
  const sorted = [...encoded].sort((a, b) => {
    if (a.mandatory && !b.mandatory) return -1
    if (!a.mandatory && b.mandatory) return 1
    return b.areaM2 - a.areaM2
  })

  // 3. Build adjacency lookup: nodeId → [{ targetId, weight, must }]
  const adjMap = new Map<string, { target: string; weight: number; must: boolean }[]>()
  for (const e of edges) {
    const w = e.weight ?? 1
    if (!adjMap.has(e.from)) adjMap.set(e.from, [])
    if (!adjMap.has(e.to)) adjMap.set(e.to, [])
    adjMap.get(e.from)!.push({ target: e.to, weight: w, must: e.must ?? false })
    adjMap.get(e.to)!.push({ target: e.from, weight: w, must: e.must ?? false })
  }

  // 4. Place each node
  const placed: PlacedRect[] = []
  const placedMap = new Map<string, PlacedRect>()
  const violations: string[] = []
  const snap = (v: number) => gridSnap > 0 ? Math.round(v / gridSnap) * gridSnap : Math.round(v * 10) / 10

  const envRect: PlacedRect = { id: '__env', x: 0, y: 0, w: envW, h: envH }

  for (const node of sorted) {
    const { w: rw, h: rh } = compactRect(node.areaM2)
    const adj = adjMap.get(node.id) ?? []
    const mandatoryTargets = adj.filter(a => a.must).map(a => a.target)

    // Preferred position: midpoint between already-placed mandatory neighbours
    let prefX = envW / 2 - rw / 2
    let prefY = envH / 2 - rh / 2

    if (mandatoryTargets.length > 0 && placedMap.size > 0) {
      let sx = 0, sy = 0, cnt = 0
      for (const tid of mandatoryTargets) {
        const t = placedMap.get(tid)
        if (t) { sx += t.x + t.w / 2; sy += t.y + t.h / 2; cnt++ }
      }
      if (cnt > 0) { prefX = snap(sx / cnt - rw / 2); prefY = snap(sy / cnt - rh / 2) }
    } else if (adj.length > 0 && placedMap.size > 0) {
      // Fall back to weighted centroid of all placed neighbours
      let sx = 0, sy = 0, sw = 0
      for (const a of adj) {
        const t = placedMap.get(a.target)
        if (t) { const w = a.weight; sx += (t.x + t.w / 2) * w; sy += (t.y + t.h / 2) * w; sw += w }
      }
      if (sw > 0) { prefX = snap(sx / sw - rw / 2); prefY = snap(sy / sw - rh / 2) }
    }

    // Spiral search from preferred position
    let found = false
    for (let r = 0; r <= maxR && !found; r += 1.0) {
      const angles = r === 0 ? [0] : Array.from({ length: Math.max(8, Math.floor(r * 4)) }, (_, i) => (i / Math.max(8, Math.floor(r * 4))) * Math.PI * 2)
      for (const angle of angles) {
        const cx = r === 0 ? prefX : prefX + r * Math.cos(angle)
        const cy = r === 0 ? prefY : prefY + r * Math.sin(angle)
        const rect: PlacedRect = { id: node.id, x: snap(cx), y: snap(cy), w: rw, h: rh }
        const inBounds = isContained(rect, envRect)
        const hasOv = placed.some(p => hasOverlap(p, rect))
        if (inBounds && !hasOv) {
          placed.push(rect)
          placedMap.set(node.id, rect)
          found = true
          break
        }
      }
    }
    if (!found) {
      // Forced placement at next available position (last resort)
      const lastPlaced = placed[placed.length - 1]
      const fy = lastPlaced ? lastPlaced.y + lastPlaced.h + 0.5 : 0
      const rect: PlacedRect = { id: node.id, x: 0, y: snap(fy), w: rw, h: rh }
      placed.push(rect)
      placedMap.set(node.id, rect)
      violations.push(`${node.name}: forced outside envelope`)
    }
  }

  // 5. Compute adjacency score
  const adjRooms: AdjacencyRoom[] = placed.map(p => ({ id: p.id, name: p.id, x: p.x, y: p.y, width: p.w, height: p.h }))
  const groupRules = edgesToRules(edges, encoded)
  const groupForFn = (name: string) => {
    const node = encoded.find(n => n.name === name)
    return node?.group ?? genericGroupFor(name)
  }
  const scoreResult = computeAdjacencyScore(groupRules, adjRooms, rectsTouch, groupForFn)
  const overlapCount = countOverlaps(placed)

  const placedNodes: (SpatialNode & PlacedRect)[] = sorted.map(n => {
    const r = placedMap.get(n.id)
    return { ...n, x: r?.x ?? 0, y: r?.y ?? 0, w: r?.w ?? 0, h: r?.h ?? 0 }
  })

  return {
    placed,
    placedNodes,
    containedAll: placed.every(p => isContained(p, envRect)),
    overlapCount,
    adjacencyScore: scoreResult.score,
    violations,
  }
}

/** Count strict AABB overlaps in a list of rects. */
function countOverlaps(rects: PlacedRect[]): number {
  let count = 0
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (hasOverlap(rects[i], rects[j])) count++
    }
  }
  return count
}

/**
 * Stamp regulatory fields onto a BubbleDiagram in-place (non-destructive
 * clone).  Returns a new diagram with all nodes carrying semantic encoding.
 */
export function stampDiagramSemantics(diagram: BubbleDiagram): BubbleDiagram {
  const nodes = encodeNodeSemantics(diagram.nodes)
  return { ...diagram, nodes }
}

/**
 * Edges with fire-rating inherited from the node occupancy classes.
 * By-Laws Ch4: Grade A (240 min) for J1, B (120 min) for A1/A2/F1/J2,
 * C (60 min) for A3/E1/F2/F3/G1/H1/H2/J3, D (30 min) for B1-B3.
 */
const GRADE_FIRE_MAP: Record<string, number> = {
  J1: 240,
  A1: 120, A2: 120, F1: 120, J2: 120,
  A3: 60, E1: 60, F2: 60, F3: 60, G1: 60, H1: 60, H2: 60, J3: 60,
  B1: 30, B2: 30, B3: 30,
}

/**
 * Propagate fire-rating onto edges from the fire-rating of the more
 * restrictive node on each edge (maximum of the two endpoints).
 */
export function propagateFireRatings(nodes: SpatialNode[], edges: TopologicalEdge[]): TopologicalEdge[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  return edges.map(e => {
    if (e.fireRating !== undefined) return e
    const a = nodeMap.get(e.from)
    const b = nodeMap.get(e.to)
    const ra = a?.occupancyClass ? GRADE_FIRE_MAP[a.occupancyClass] : undefined
    const rb = b?.occupancyClass ? GRADE_FIRE_MAP[b.occupancyClass] : undefined
    if (ra !== undefined && rb !== undefined) return { ...e, fireRating: Math.max(ra, rb) }
    if (ra !== undefined) return { ...e, fireRating: ra }
    if (rb !== undefined) return { ...e, fireRating: rb }
    return e
  })
}
