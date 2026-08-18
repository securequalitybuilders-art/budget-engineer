/**
 * FCBD — Floorplan Containment-Boundary-Dual constraint framework.
 *
 * Joint node-edge reasoning over a bubble diagram and a placed layout.
 * Checks: (1) node containment within the building envelope, (2) edge
 * connectivity for mandatory adjacencies, (3) overlap absence, (4) fire-
 * rating propagation, and (5) daylight / accessibility compliance.
 *
 * All functions are pure and deterministic — no LLM, no network.
 */

import type { BubbleDiagram, PlacedRect } from './topological-graph'
import { hasOverlap, isContained, propagateFireRatings, encodeNodeSemantics } from './topological-graph'
import { rectsTouch, type AdjacencyRoom } from './adjacency-graph'

export interface FcbdViolation {
  severity: 'error' | 'warning'
  rule: string
  message: string
  nodeIds?: string[]
}

export interface FcbdResult {
  passed: boolean
  score: number
  violations: FcbdViolation[]
  summary: {
    totalChecks: number
    passed: number
    errors: number
    warnings: number
  }
}

export interface FcbdInput {
  diagram: BubbleDiagram
  placed: PlacedRect[]
  envelope: { width: number; height: number }
  /** Minimum door width in metres (default: 0.9 per By-Laws Ch4). */
  minDoorWidthM?: number
  /** Maximum travel distance in metres (default: 45 for E1). */
  maxTravelDistanceM?: number
}

/**
 * Run the full FCBD constraint suite on a placed layout.
 */
export function evaluateFcbd(input: FcbdInput): FcbdResult {
  const { diagram, placed, envelope } = input
  const minDoor = input.minDoorWidthM ?? 0.9

  const encoded = encodeNodeSemantics(diagram.nodes)
  const placedMap = new Map(placed.map(p => [p.id, p]))
  const violations: FcbdViolation[] = []
  let passed = 0
  let total = 0

  const envRect: PlacedRect = { id: '__env', x: 0, y: 0, w: envelope.width, h: envelope.height }

  // 1. CONTAINMENT — every placed rect must be inside the envelope
  total++
  const containmentFailures: string[] = []
  for (const p of placed) {
    if (!isContained(p, envRect)) containmentFailures.push(p.id)
  }
  if (containmentFailures.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'error',
      rule: 'fcbd-containment',
      message: `${containmentFailures.length} room(s) outside envelope`,
      nodeIds: containmentFailures,
    })
  }

  // 2. OVERLAP — no two rects may overlap (strict AABB)
  total++
  const overlapPairs: string[] = []
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      if (hasOverlap(placed[i], placed[j])) {
        overlapPairs.push(`${placed[i].id}↔${placed[j].id}`)
      }
    }
  }
  if (overlapPairs.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'error',
      rule: 'fcbd-no-overlap',
      message: `${overlapPairs.length} overlap(s): ${overlapPairs.slice(0, 5).join(', ')}`,
    })
  }

  // 3. MANDATORY ADJACENCY — edges marked `must` must touch
  total++
  const edges = propagateFireRatings(encoded, diagram.edges)
  const mustEdges = edges.filter(e => e.must)
  const mustFailures: string[] = []
  for (const e of mustEdges) {
    const a = placedMap.get(e.from)
    const b = placedMap.get(e.to)
    if (!a || !b) { mustFailures.push(`${e.from}↔${e.to}: not placed`); continue }
    const roomA: AdjacencyRoom = { id: a.id, name: a.id, x: a.x, y: a.y, width: a.w, height: a.h }
    const roomB: AdjacencyRoom = { id: b.id, name: b.id, x: b.x, y: b.y, width: b.w, height: b.h }
    if (!rectsTouch(roomA, roomB)) mustFailures.push(`${e.from}↔${e.to}`)
  }
  if (mustFailures.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'error',
      rule: 'fcbd-mandatory-adjacency',
      message: `${mustFailures.length} mandatory edge(s) not touching: ${mustFailures.slice(0, 5).join(', ')}`,
      nodeIds: mustFailures.flatMap(f => f.split('↔')),
    })
  }

  // 4. FIRE RATING — mandatory edges must have fireRating ≥ minDoor
  total++
  const fireFailures: string[] = []
  for (const e of mustEdges) {
    if (e.fireRating !== undefined && e.fireRating < 30) {
      fireFailures.push(`${e.from}↔${e.to} (${e.fireRating} min)`)
    }
  }
  if (fireFailures.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'warning',
      rule: 'fcbd-fire-rating',
      message: `${fireFailures.length} edge(s) with low fire rating: ${fireFailures.slice(0, 5).join(', ')}`,
    })
  }

  // 5. DOOR WIDTH — all edges should carry a width ≥ minDoor
  total++
  const doorFailures: string[] = []
  for (const e of edges) {
    if (e.type === 'door' && e.width !== undefined && e.width < minDoor) {
      doorFailures.push(`${e.from}↔${e.to} (${e.width}m)`)
    }
  }
  if (doorFailures.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'warning',
      rule: 'fcbd-door-width',
      message: `${doorFailures.length} door(s) narrower than ${minDoor}m: ${doorFailures.slice(0, 5).join(', ')}`,
    })
  }

  // 6. DAYLIGHT — rooms with daylightRequirement must be on the perimeter
  total++
  const daylitNodes = encoded.filter(n => n.daylightRequirement)
  const perimeterFailures: string[] = []
  for (const n of daylitNodes) {
    const r = placedMap.get(n.id)
    if (!r) { perimeterFailures.push(n.id); continue }
    const onPerimeter = r.x === 0 || r.y === 0 || r.x + r.w >= envelope.width || r.y + r.h >= envelope.height
    if (!onPerimeter) perimeterFailures.push(n.id)
  }
  if (perimeterFailures.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'warning',
      rule: 'fcbd-daylight',
      message: `${perimeterFailures.length} daylight-required room(s) not on perimeter`,
      nodeIds: perimeterFailures,
    })
  }

  // 7. ACCESSIBILITY — accessibilityRequired rooms must have a placed corridor/stair neighbour
  total++
  const accessNodes = encoded.filter(n => n.accessibilityRequired)
  const accessFailures: string[] = []
  for (const n of accessNodes) {
    const r = placedMap.get(n.id)
    if (!r) { accessFailures.push(n.id); continue }
    const neighbours = encoded.filter(nb =>
      nb.id !== n.id && (nb.group === 'corridor' || nb.group === 'stair' || nb.group === 'lift')
    )
    const hasAccessRoute = neighbours.some(nb => {
      const nr = placedMap.get(nb.id)
      if (!nr) return false
      const roomA: AdjacencyRoom = { id: r.id, name: r.id, x: r.x, y: r.y, width: r.w, height: r.h }
      const roomB: AdjacencyRoom = { id: nr.id, name: nr.id, x: nr.x, y: nr.y, width: nr.w, height: nr.h }
      return rectsTouch(roomA, roomB)
    })
    if (!hasAccessRoute) accessFailures.push(n.id)
  }
  if (accessFailures.length === 0) {
    passed++
  } else {
    violations.push({
      severity: 'warning',
      rule: 'fcbd-accessibility',
      message: `${accessFailures.length} accessible room(s) without direct corridor access`,
      nodeIds: accessFailures,
    })
  }

  const errors = violations.filter(v => v.severity === 'error').length
  const warnings = violations.filter(v => v.severity === 'warning').length
  const score = total > 0 ? passed / total : 1

  return {
    passed: errors === 0,
    score,
    violations,
    summary: { totalChecks: total, passed, errors, warnings },
  }
}
