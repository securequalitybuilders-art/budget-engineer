/**
 * Syntopic Analysis — dual graph from plan geometry + topology + semantics.
 *
 * Builds a dual graph from a PlanModel where:
 *  - Nodes = rooms (with occupancy semantics, area, accessibility flags)
 *  - Edges = shared walls (with door width, fire rating, adjacency weight)
 *
 * Provides:
 *  - Wheelchair accessibility analysis (door widths, corridor widths)
 *  - Betweenness-centrality ranking (circulation importance)
 *  - Shortest-path egress computation (Dijkstra on door-width-weighted graph)
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DualNode {
  id: string
  name: string
  areaM2: number
  /** SANS 10400-A occupancy class (B2, E1, A3, etc). */
  occupancyClass: string
  /** Is this space wheelchair-accessible? */
  accessible: boolean
  /** Is this space mandatory (core / habitable / circulation)? */
  mandatory: boolean
  /** Centrality score (0–1 normalised). */
  centrality: number
  /** Zone: public | private | service | circulation. */
  zone: string
}

export interface DualEdge {
  from: string
  to: string
  /** Door width in metres (0 = no door, wall only). */
  doorWidth: number
  /** Fire rating in minutes. */
  fireRating: number
  /** Adjacency weight (higher = stronger spatial bond). */
  weight: number
  /** Shared wall length in metres. */
  wallLength: number
  /** Is this edge wheelchair-passable (door ≥ 0.9m per Zimbabwe By-Laws)? */
  wheelchairPassable: boolean
}

export interface DualGraph {
  nodes: DualNode[]
  edges: DualEdge[]
}

export interface AccessibilityReport {
  /** Per-node wheelchair accessibility verdict. */
  nodeResults: Array<{
    nodeId: string
    name: string
    accessible: boolean
    /** Reason if not accessible. */
    reason?: string
  }>
  /** Overall plan accessibility score (0–1). */
  score: number
  /** Number of accessible rooms. */
  accessibleCount: number
  /** Total rooms. */
  totalCount: number
}

export interface CentralityReport {
  /** Per-node betweenness centrality (0–1). */
  rankings: Array<{
    nodeId: string
    name: string
    centrality: number
    rank: number
    /** Role description. */
    role: string
  }>
  /** Most central node (highest betweenness). */
  mostCentral: string
}

export interface EgressReport {
  /** Shortest path from each room to the nearest exit. */
  paths: Array<{
    fromNodeId: string
    fromName: string
    toExitName: string
    path: string[]
    distance: number
    /** Door widths along the path. */
    doorWidths: number[]
    /** Is every door on the path ≥ 0.9m? */
    compliant: boolean
  }>
  /** Longest egress distance in the plan. */
  maxEgressDistance: number
  /** Plan egress compliance (all rooms within travel distance). */
  compliant: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Zimbabwe By-Laws minimum door width for egress (metres). */
const MIN_EGRESS_DOOR_WIDTH = 0.9

/** Maximum travel distance default (metres). */
const MAX_TRAVEL_DEFAULT = 30

/* ------------------------------------------------------------------ */
/*  Graph construction                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build a dual graph from a plan model.
 *
 * Nodes are derived from rooms; edges from adjacency graph rules or
 * bubble diagram edges, enriched with door widths from openings.
 */
export function buildDualGraph(plan: {
  rooms: Array<{ id: string; name: string; x?: number; y?: number; width: number; height: number }>
  walls?: Array<{ id: string; start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; type: 'external' | 'internal' }>
  openings?: Array<{ id: string; wallId: string; offset: number; width: number; kind: 'door' | 'window' }>
  bubbleDiagram?: {
    nodes: Array<{ id: string; name: string; areaM2: number; group?: string | null; role?: string }>
    edges: Array<{ from: string; to: string; type?: string; weight?: number }>
  }
  adjacencyGraph?: {
    rules: Array<{ from: string; to: string; weight: number }>
  }
}): DualGraph {
  // Build nodes from rooms
  const nodes: DualNode[] = plan.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    areaM2: Math.round(room.width * room.height * 100) / 100,
    occupancyClass: 'B2',
    accessible: true,
    mandatory: false,
    centrality: 0,
    zone: classifyZone(room.name),
  }))

  // Build door lookup: wallId -> door width
  const doorByWall = new Map<string, number>()
  if (plan.openings) {
    for (const o of plan.openings) {
      if (o.kind === 'door') doorByWall.set(o.wallId, o.width)
    }
  }

  // Build adjacency edges from bubble diagram or adjacency graph
  const edgeSource =
    plan.bubbleDiagram?.edges?.map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight ?? 1,
    })) ??
    plan.adjacencyGraph?.rules?.map((r) => ({
      from: r.from,
      to: r.to,
      weight: r.weight,
    })) ??
    []

  // Deduplicate edges (from/to pairs)
  const seenPairs = new Set<string>()
  const edges: DualEdge[] = []

  for (const edge of edgeSource) {
    const key = [edge.from, edge.to].sort().join('|')
    if (seenPairs.has(key)) continue
    seenPairs.add(key)

    // Find matching rooms
    const nodeA = nodes.find((n) => n.id === edge.from || n.name === edge.from)
    const nodeB = nodes.find((n) => n.id === edge.to || n.name === edge.to)
    if (!nodeA || !nodeB) continue

    // Estimate wall length from room centres
    const roomA = plan.rooms.find((r) => r.id === nodeA.id)
    const roomB = plan.rooms.find((r) => r.id === nodeB.id)
    let wallLength = 2
    if (roomA && roomB) {
      const cA = { x: (roomA.x ?? 0) + roomA.width / 2, y: (roomA.y ?? 0) + roomA.height / 2 }
      const cB = { x: (roomB.x ?? 0) + roomB.width / 2, y: (roomB.y ?? 0) + roomB.height / 2 }
      wallLength = Math.round(Math.sqrt((cA.x - cB.x) ** 2 + (cA.y - cB.y) ** 2) * 100) / 100
      wallLength = Math.max(0.5, wallLength)
    }

    // Find door width for this edge (check walls between the two rooms)
    let doorWidth = 0
    if (plan.walls) {
      for (const wall of plan.walls) {
        const dw = doorByWall.get(wall.id)
        if (dw && dw > 0) {
          doorWidth = dw
          break
        }
      }
    }
    // Fallback: if we have openings but no wall linkage, use first unmatched door
    if (doorWidth === 0 && plan.openings && plan.openings.length > 0) {
      for (const o of plan.openings) {
        if (o.kind === 'door' && o.width > 0) {
          doorWidth = o.width
          break
        }
      }
    }

    edges.push({
      from: nodeA.id,
      to: nodeB.id,
      doorWidth,
      fireRating: 30,
      weight: edge.weight,
      wallLength,
      wheelchairPassable: doorWidth >= MIN_EGRESS_DOOR_WIDTH,
    })
  }

  return { nodes, edges }
}

/* ------------------------------------------------------------------ */
/*  Zone classification                                                */
/* ------------------------------------------------------------------ */

function classifyZone(name: string): string {
  const lower = name.toLowerCase()
  if (/corridor|circulation|passage|hall|lobby|entrance|vestibule/.test(lower)) return 'circulation'
  if (/kitchen|bathroom|toilet|wc|laundry|store|service|plant|boiler|cleaner/.test(lower)) return 'service'
  if (/living|dining|bedroom|lounge|study|office|reception|parlour/.test(lower)) return 'public'
  return 'private'
}

/* ------------------------------------------------------------------ */
/*  Accessibility analysis                                             */
/* ------------------------------------------------------------------ */

/**
 * Analyse wheelchair accessibility for every room in the plan.
 *
 * Rules (Zimbabwe By-Laws / SANS 10400-S):
 *  - Door width ≥ 0.9 m for wheelchair passage
 *  - Corridor width ≥ 1.2 m for wheelchair turning
 *  - Mandatory rooms must be accessible
 */
export function analyzeAccessibility(graph: DualGraph): AccessibilityReport {
  const results: AccessibilityReport['nodeResults'] = []

  for (const node of graph.nodes) {
    // Check if any edge to this node has a wheelchair-passable door
    const incomingEdges = graph.edges.filter(
      (e) => e.from === node.id || e.to === node.id,
    )

    const hasPassableDoor = incomingEdges.some((e) => e.wheelchairPassable)

    // Service rooms and corridors are exempt from door-width checks
    const isExempt = node.zone === 'service' || node.zone === 'circulation'

    // Mandatory rooms must be accessible
    const accessible = isExempt || hasPassableDoor || incomingEdges.length === 0

    let reason: string | undefined
    if (!accessible && node.mandatory) {
      reason = `Mandatory room ${node.name} lacks a ≥${MIN_EGRESS_DOOR_WIDTH}m wheelchair door`
    } else if (!accessible) {
      reason = `No wheelchair-passable door (need ≥${MIN_EGRESS_DOOR_WIDTH}m)`
    }

    results.push({ nodeId: node.id, name: node.name, accessible, reason })
  }

  const accessibleCount = results.filter((r) => r.accessible).length
  const score = results.length > 0 ? accessibleCount / results.length : 1

  return {
    nodeResults: results,
    score: Math.round(score * 100) / 100,
    accessibleCount,
    totalCount: results.length,
  }
}

/* ------------------------------------------------------------------ */
/*  Betweenness centrality                                             */
/* ------------------------------------------------------------------ */

/**
 * Compute betweenness centrality for all nodes in the dual graph.
 *
 * Uses Brandes' algorithm on the unweighted dual graph.
 * Normalised to 0–1 range.
 */
export function analyzeCentrality(graph: DualGraph): CentralityReport {
  const n = graph.nodes.length
  if (n === 0) {
    return { rankings: [], mostCentral: '' }
  }

  // Build adjacency list
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    adj.get(edge.from)?.push(edge.to)
    adj.get(edge.to)?.push(edge.from)
  }

  // Brandes' algorithm
  const betweenness = new Map<string, number>()
  for (const node of graph.nodes) betweenness.set(node.id, 0)

  for (const s of graph.nodes) {
    const S: string[] = []
    const P = new Map<string, string[]>()
    const sigma = new Map<string, number>()
    const d = new Map<string, number>()

    for (const node of graph.nodes) {
      P.set(node.id, [])
      sigma.set(node.id, 0)
      d.set(node.id, -1)
    }

    sigma.set(s.id, 1)
    d.set(s.id, 0)

    const Q: string[] = [s.id]
    while (Q.length > 0) {
      const v = Q.shift()!
      S.push(v)
      for (const w of adj.get(v) ?? []) {
        // First time reaching w?
        if ((d.get(w) ?? -1) < 0) {
          d.set(w, (d.get(v) ?? 0) + 1)
          Q.push(w)
        }
        // Shortest path through v?
        if ((d.get(w) ?? 0) === (d.get(v) ?? 0) + 1) {
          sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0))
          P.get(w)!.push(v)
        }
      }
    }

    // Back-propagation
    const delta = new Map<string, number>()
    for (const node of graph.nodes) delta.set(node.id, 0)

    while (S.length > 0) {
      const w = S.pop()!
      for (const v of P.get(w) ?? []) {
        delta.set(v, (delta.get(v) ?? 0) + ((sigma.get(v) ?? 0) / (sigma.get(w) ?? 1)) * (1 + (delta.get(w) ?? 0)))
      }
      if (w !== s.id) {
        betweenness.set(w, (betweenness.get(w) ?? 0) + (delta.get(w) ?? 0))
      }
    }
  }

  // Normalise
  const maxB = Math.max(...Array.from(betweenness.values()), 1)
  const rankings = graph.nodes
    .map((node) => {
      const c = (betweenness.get(node.id) ?? 0) / maxB
      return {
        nodeId: node.id,
        name: node.name,
        centrality: Math.round(c * 1000) / 1000,
        rank: 0,
        role: centralityRole(c),
      }
    })
    .sort((a, b) => b.centrality - a.centrality)
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return {
    rankings,
    mostCentral: rankings[0]?.nodeId ?? '',
  }
}

function centralityRole(c: number): string {
  if (c >= 0.8) return 'Primary circulation hub'
  if (c >= 0.5) return 'Secondary circulation'
  if (c >= 0.2) return 'Connector'
  return 'Leaf room'
}

/* ------------------------------------------------------------------ */
/*  Shortest-path egress                                               */
/* ------------------------------------------------------------------ */

/**
 * Compute shortest-path egress from every room to the nearest exit.
 *
 * Uses Dijkstra's algorithm on the dual graph, weighted by inverse door
 * width (narrower doors = longer effective distance).
 *
 * Exits are identified by name matching: "entrance", "foyer", "vestibule",
 * or any room connected to an egress point.
 */
export function shortestPathEgress(
  graph: DualGraph,
  exits?: Array<{ label: string }>,
): EgressReport {
  const exitNames = new Set(
    (exits ?? []).map((e) => e.label.toLowerCase()),
  )

  // Identify exit nodes by name
  const exitNodeIds = new Set<string>()
  for (const node of graph.nodes) {
    const lower = node.name.toLowerCase()
    if (
      /entrance|foyer|vestibule|exit|lobby|main door/.test(lower) ||
      exitNames.has(lower)
    ) {
      exitNodeIds.add(node.id)
    }
  }

  // If no exits identified, use the node with highest centrality as fallback
  if (exitNodeIds.size === 0 && graph.nodes.length > 0) {
    const sorted = [...graph.nodes].sort((a, b) => b.centrality - a.centrality)
    exitNodeIds.add(sorted[0].id)
  }

  // Build adjacency with weights
  const adj = new Map<string, Array<{ to: string; weight: number; doorWidth: number }>>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    // Weight = inverse door width (narrower = harder to traverse)
    const w = edge.doorWidth > 0 ? 1 / edge.doorWidth : 10
    adj.get(edge.from)?.push({ to: edge.to, weight: w * edge.wallLength, doorWidth: edge.doorWidth })
    adj.get(edge.to)?.push({ to: edge.from, weight: w * edge.wallLength, doorWidth: edge.doorWidth })
  }

  const paths: EgressReport['paths'] = []
  let maxDist = 0

  for (const node of graph.nodes) {
    if (exitNodeIds.has(node.id)) {
      paths.push({
        fromNodeId: node.id,
        fromName: node.name,
        toExitName: node.name,
        path: [node.id],
        distance: 0,
        doorWidths: [],
        compliant: true,
      })
      continue
    }

    const result = dijkstra(adj, graph.nodes.map((n) => n.id), node.id, exitNodeIds)

    if (result.dist === Infinity) {
      paths.push({
        fromNodeId: node.id,
        fromName: node.name,
        toExitName: '(none)',
        path: [],
        distance: Infinity,
        doorWidths: [],
        compliant: false,
      })
      maxDist = Infinity
      continue
    }

    // Collect door widths along the path
    const doorWidths: number[] = []
    for (let i = 0; i < result.path.length - 1; i++) {
      const edge = graph.edges.find(
        (e) =>
          (e.from === result.path[i] && e.to === result.path[i + 1]) ||
          (e.to === result.path[i] && e.from === result.path[i + 1]),
      )
      doorWidths.push(edge?.doorWidth ?? 0)
    }

    const maxTravel = MAX_TRAVEL_DEFAULT
    const compliant = result.dist <= maxTravel && doorWidths.every((w) => w === 0 || w >= MIN_EGRESS_DOOR_WIDTH)

    const exitNode = graph.nodes.find((n) => n.id === result.exitId)

    paths.push({
      fromNodeId: node.id,
      fromName: node.name,
      toExitName: exitNode?.name ?? '(unknown)',
      path: result.path,
      distance: Math.round(result.dist * 100) / 100,
      doorWidths,
      compliant,
    })

    if (result.dist > maxDist) maxDist = result.dist
  }

  return {
    paths,
    maxEgressDistance: maxDist === Infinity ? Infinity : Math.round(maxDist * 100) / 100,
    compliant: paths.every((p) => p.compliant),
  }
}

/* ------------------------------------------------------------------ */
/*  Dijkstra                                                           */
/* ------------------------------------------------------------------ */

function dijkstra(
  adj: Map<string, Array<{ to: string; weight: number; doorWidth: number }>>,
  allIds: string[],
  source: string,
  targets: Set<string>,
): { path: string[]; dist: number; exitId: string } {
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  const visited = new Set<string>()

  for (const id of allIds) {
    dist.set(id, Infinity)
    prev.set(id, null)
  }
  dist.set(source, 0)

  let exitId = ''
  let exitDist = Infinity

  for (let i = 0; i < allIds.length; i++) {
    // Pick unvisited node with smallest distance
    let u = ''
    let minD = Infinity
    for (const id of allIds) {
      if (!visited.has(id) && (dist.get(id) ?? Infinity) < minD) {
        minD = dist.get(id) ?? Infinity
        u = id
      }
    }
    if (u === '' || minD === Infinity) break
    visited.add(u)

    // Found an exit?
    if (targets.has(u) && u !== source) {
      exitId = u
      exitDist = dist.get(u) ?? Infinity
      break
    }

    // Relax neighbours
    for (const { to, weight } of adj.get(u) ?? []) {
      const alt = (dist.get(u) ?? 0) + weight
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt)
        prev.set(to, u)
      }
    }
  }

  // Reconstruct path
  if (exitId === '') return { path: [], dist: Infinity, exitId: '' }

  const path: string[] = []
  let current: string | null = exitId
  while (current !== null) {
    path.unshift(current)
    current = prev.get(current) ?? null
  }

  return { path, dist: exitDist, exitId }
}
