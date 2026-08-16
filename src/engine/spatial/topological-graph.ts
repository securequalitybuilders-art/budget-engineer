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

export interface SpatialNode {
  id: string
  name: string
  areaM2: number
  role?: SpatialRole
  group?: string | null
}

export interface TopologicalEdge {
  from: string
  to: string
  type?: AdjacencyType
  weight?: number
  must?: boolean
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
      nodes.push({
        id: slugify(name, nodes.length),
        name,
        areaM2: Math.max(0.5, item.areaM2 || 0.5),
        role: classifySpatialRole(name, groupFor(name)),
        group: groupFor(name),
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
    return {
      id: r.id,
      name: r.name,
      areaM2: Math.max(0.5, r.width * r.height),
      group,
      role: classifySpatialRole(r.name, group),
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
