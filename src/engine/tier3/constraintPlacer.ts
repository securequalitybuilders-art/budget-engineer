import { dimForRoom } from './layoutEngine'
import type { PlacedRoom, ExpandedProgramItem } from './layoutEngine'
import { classifyRoom } from './roomClassifier'

// ── Types ──

export interface ConstraintResult {
  valid: boolean
  reason?: string
}

interface SolverState {
  placed: PlacedRoom[]
  buildingW: number
  buildingD: number
  corridorY: number
  corridorH: number
  frontD: number
  backD: number
  boundaryCheck?: (room: PlacedRoom) => boolean
  skipZoneBand?: boolean
}

// ── 7 Constraints ──

function constraintMinDim(room: PlacedRoom): ConstraintResult {
  const d = dimForRoom(room.name, {})
  if (room.width < d.minWidth - 0.01) return { valid: false, reason: `Room "${room.name}" width ${room.width.toFixed(2)}m < min ${d.minWidth}m` }
  if (room.height < d.minDepth - 0.01) return { valid: false, reason: `Room "${room.name}" depth ${room.height.toFixed(2)}m < min ${d.minDepth}m` }
  return { valid: true }
}

function constraintNoOverlap(room: PlacedRoom, placed: PlacedRoom[]): ConstraintResult {
  for (const p of placed) {
    if (p.name === room.name) continue
    if (room.x < p.x + p.width && room.x + room.width > p.x && room.y < p.y + p.height && room.y + room.height > p.y) {
      return { valid: false, reason: `Overlap between "${room.name}" and "${p.name}"` }
    }
  }
  return { valid: true }
}

function constraintZoneBand(room: PlacedRoom, state: SolverState): ConstraintResult {
  const cls = classifyRoom(room.name)
  if (cls.zone === 'public' && room.y + room.height > state.corridorY + 0.01) {
    return { valid: false, reason: `Public room "${room.name}" extends below corridor band` }
  }
  if (cls.zone === 'private' && room.y < state.corridorY + state.corridorH - 0.01) {
    return { valid: false, reason: `Private room "${room.name}" overlaps corridor band` }
  }
  if (cls.zone === 'circulation' && room.y + room.height > state.corridorY + state.corridorH + 0.01) {
    return { valid: false, reason: `Circulation "${room.name}" outside corridor band` }
  }
  return { valid: true }
}

function constraintWetCoreAdjacent(room: PlacedRoom, state: SolverState): ConstraintResult {
  if (!room.isWetCore) return { valid: true }
  const otherWet = state.placed.filter(r => r.isWetCore && r.name !== room.name)
  if (otherWet.length === 0) return { valid: true }
  const dist = Math.min(...otherWet.map(r => Math.sqrt((room.x - r.x) ** 2 + (room.y - r.y) ** 2)))
  if (dist > 6) return { valid: false, reason: `Wet core "${room.name}" ${dist.toFixed(1)}m from nearest wet core — should be ≤6m` }
  return { valid: true }
}

function constraintMaxCorridorTravel(room: PlacedRoom, state: SolverState): ConstraintResult {
  if (room.zone === 'circulation') return { valid: true }
  const cx = state.buildingW / 2
  const cy = state.corridorY + state.corridorH / 2
  const rx = room.x + room.width / 2
  const ry = room.y + room.height / 2
  const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2)
  if (dist > 18) return { valid: false, reason: `Room "${room.name}" ${dist.toFixed(1)}m from corridor — exceeds 18m` }
  return { valid: true }
}

function constraintStructuralSpan(room: PlacedRoom, maxSpan: number = 6): ConstraintResult {
  if (room.width > maxSpan + 0.01) return { valid: false, reason: `Room "${room.name}" width ${room.width.toFixed(1)}m > max span ${maxSpan}m` }
  if (room.height > maxSpan + 0.01) return { valid: false, reason: `Room "${room.name}" height ${room.height.toFixed(1)}m > max span ${maxSpan}m` }
  return { valid: true }
}

function constraintEntryAccess(room: PlacedRoom, state: SolverState): ConstraintResult {
  if (room.y > 0.01) return { valid: true }
  const cls = classifyRoom(room.name)
  if (cls.zone === 'public' && room.x < state.buildingW && room.x >= 0) return { valid: true }
  return { valid: true }
}

function checkAllConstraints(room: PlacedRoom, state: SolverState): ConstraintResult {
  if (state.boundaryCheck) {
    const bc = state.boundaryCheck(room)
    if (!bc) return { valid: false, reason: `"${room.name}" outside topology boundary` }
  }
  for (const check of state.skipZoneBand
    ? [constraintMinDim, constraintNoOverlap, constraintWetCoreAdjacent, constraintMaxCorridorTravel, constraintStructuralSpan, constraintEntryAccess]
    : [constraintMinDim, constraintNoOverlap, constraintZoneBand, constraintWetCoreAdjacent, constraintMaxCorridorTravel, constraintStructuralSpan, constraintEntryAccess]
  ) {
    const r = check === constraintNoOverlap
      ? constraintNoOverlap(room, state.placed)
      : check === constraintMinDim
        ? constraintMinDim(room)
        : check === constraintStructuralSpan
          ? constraintStructuralSpan(room)
          : check === constraintZoneBand
            ? constraintZoneBand(room, state)
            : check === constraintWetCoreAdjacent
              ? constraintWetCoreAdjacent(room, state)
              : check === constraintMaxCorridorTravel
                ? constraintMaxCorridorTravel(room, state)
                : constraintEntryAccess(room, state)
    if (!r.valid) return r
  }
  return { valid: true }
}

// ── Scoring ──

function scoreLayout(rooms: PlacedRoom[], buildingW: number, buildingD: number): number {
  let score = 0
  const totalArea = buildingW * buildingD
  const roomArea = rooms.reduce((s, r) => s + r.width * r.height, 0)
  const efficiency = totalArea > 0 ? roomArea / totalArea : 0
  score += efficiency * 30

  const wetCores = rooms.filter(r => r.isWetCore)
  if (wetCores.length > 1) {
    let totalDist = 0
    let pairs = 0
    for (let i = 0; i < wetCores.length; i++) {
      for (let j = i + 1; j < wetCores.length; j++) {
        totalDist += Math.sqrt((wetCores[i].x - wetCores[j].x) ** 2 + (wetCores[i].y - wetCores[j].y) ** 2)
        pairs++
      }
    }
    const avgDist = pairs > 0 ? totalDist / pairs : 0
    score += Math.max(0, (1 - avgDist / 10)) * 30
  } else {
    score += 30
  }

  const uniqueWidths = new Set(rooms.map(r => Math.round(r.width * 10)))
  const regularity = rooms.length > 0 ? 1 - (uniqueWidths.size / rooms.length) : 0
  score += regularity * 20

  const corridor = rooms.find(r => r.zone === 'circulation')
  if (corridor) {
    const corridorEfficiency = 1 - Math.min(1, corridor.width / 50)
    score += corridorEfficiency * 20
  }

  return Math.round(score)
}

// ── Candidate positions ──

const MAX_ATTEMPTS = 200

interface CandidatePosition {
  x: number
  y: number
  priority: number
}

function* roomCandidates(
  item: ExpandedProgramItem,
  state: SolverState,
): Generator<CandidatePosition> {
  const cls = classifyRoom(item.name)
  const d = dimForRoom(item.name, {})
  const minW = d.minWidth
  const minD = d.minDepth
  const desiredArea = item.area > 0 ? item.area : minW * minD * 1.5

  let yBandMin = 0
  let bandHeight = state.frontD
  if (cls.zone !== 'public') {
    if (cls.zone === 'circulation') {
      yBandMin = state.corridorY
      bandHeight = state.corridorH
    } else {
      yBandMin = state.corridorY + state.corridorH
      bandHeight = state.backD
    }
  }

  const yMax = Math.min(yBandMin + bandHeight, state.buildingD - minD)
  if (yMax < yBandMin) return

  // Generate candidate positions: try band start, then grid-aligned steps
  const step = 1.0
  for (let y = yBandMin; y <= yMax; y += step) {
    for (let x = 0; x <= state.buildingW - minW; x += step * 2) {
      const w = Math.max(minW, Math.min(desiredArea / bandHeight, state.buildingW - x))
      const h = Math.max(minD, bandHeight)
      if (w < minW || x + w > state.buildingW) continue

      // Quick boundary pre-check: skip positions clearly outside topology
      if (state.boundaryCheck) {
        const testRoom: PlacedRoom = { name: item.name, x, y, width: w, height: h, zone: cls.zone, isWetCore: cls.isWetCore }
        if (!state.boundaryCheck(testRoom)) continue
      }

      // Priority: prefer x-alignment with existing wet cores for wet rooms
      let priority = 0
      if (item.isWetCore) {
        const nearestWet = state.placed.filter(r => r.isWetCore)
          .reduce((best, r) => {
            const dist = Math.abs(x - r.x)
            return dist < best ? dist : best
          }, Infinity)
        if (nearestWet < 4) priority += 10
      }

      // Prefer left-to-right filling (lower x = higher priority)
      priority += 10 - Math.min(10, x / 2)

      yield { x, y, priority }
    }
  }
}

// ── Solver ──

function tryPlace(
  remaining: ExpandedProgramItem[],
  state: SolverState,
  best: { score: number; rooms: PlacedRoom[] | null },
  depth: number = 0,
): boolean {
  if (depth > 50 || remaining.length === 0) {
    if (remaining.length === 0) {
      const s = scoreLayout(state.placed, state.buildingW, state.buildingD)
      if (s > best.score) {
        best.score = s
        best.rooms = state.placed.map(r => ({ ...r }))
      }
      return true
    }
    return false
  }

  const item = remaining[0]
  const rest = remaining.slice(1)
  const cls = classifyRoom(item.name)
  const d = dimForRoom(item.name, {})
  const minW = d.minWidth
  const minD = d.minDepth
  const desiredArea = item.area > 0 ? item.area : minW * minD * 1.5

  let bandHeight = state.frontD
  if (cls.zone !== 'public') {
    bandHeight = cls.zone === 'circulation' ? state.corridorH : state.backD
  }

  let attempts = 0
  const candidates = Array.from(roomCandidates(item, state))
    .sort((a, b) => b.priority - a.priority)

  for (const pos of candidates) {
    if (attempts++ >= MAX_ATTEMPTS) break

    const w = Math.max(minW, Math.min(desiredArea / bandHeight, state.buildingW - pos.x))
    const h = Math.max(minD, bandHeight)
    if (w < minW || pos.x + w > state.buildingW) continue

    const room: PlacedRoom = {
      name: item.name,
      x: Math.round(pos.x * 10) / 10,
      y: Math.round(pos.y * 10) / 10,
      width: Math.round(Math.min(w, state.buildingW - pos.x) * 10) / 10,
      height: Math.round(Math.min(h, state.buildingD - pos.y) * 10) / 10,
      zone: cls.zone,
      isWetCore: cls.isWetCore,
    }

    // Quick boundary pre-check before full constraint evaluation
    if (state.boundaryCheck && !state.boundaryCheck(room)) continue

    const result = checkAllConstraints(room, state)
    if (!result.valid) continue

    state.placed.push(room)
    if (tryPlace(rest, state, best, depth + 1)) return true
    state.placed.pop()
  }

  return false
}

export function solveConstraintPlacement(
  items: ExpandedProgramItem[],
  buildingW: number,
  buildingD: number,
  corridorY: number,
  corridorH: number,
  frontD: number,
  backD: number,
  boundaryCheck?: (room: PlacedRoom) => boolean,
  skipZoneBand?: boolean,
): PlacedRoom[] | null {
  const state: SolverState = { placed: [], buildingW, buildingD, corridorY, corridorH, frontD, backD, boundaryCheck, skipZoneBand }

  // Separate circulation items first
  const circItems = items.filter(i => classifyRoom(i.name).zone === 'circulation' || i.name === 'Circulation' || i.name.startsWith('Circulation'))
  const nonCircItems = items.filter(i => !circItems.includes(i))

  // Order: public → circulation → private, then by wet-core grouping
  const ordered = [
    ...nonCircItems.filter(i => classifyRoom(i.name).zone === 'public'),
    ...circItems,
    ...nonCircItems.filter(i => classifyRoom(i.name).zone === 'private' || classifyRoom(i.name).zone === 'service'),
    ...nonCircItems.filter(i => {
      const z = classifyRoom(i.name).zone
      return z !== 'public' && z !== 'private' && z !== 'service' && z !== 'circulation'
    }),
  ]

  // Place corridor first (skip for non-rectangular topologies or if boundary rejects it)
  if (!skipZoneBand) {
    const existingCorridor = state.placed.find(r => r.zone === 'circulation' || r.name === 'Circulation')
    if (!existingCorridor) {
      const defaultCorridor: PlacedRoom = { name: 'Circulation', x: 0, y: corridorY, width: buildingW, height: corridorH, zone: 'circulation' }
      if (!boundaryCheck || boundaryCheck(defaultCorridor)) {
        state.placed.push(defaultCorridor)
      }
    }
  }

  const best: { score: number; rooms: PlacedRoom[] | null } = { score: -1, rooms: null }
  tryPlace(ordered.filter(i => !(i.zone === 'circulation' || i.name === 'Circulation' || i.name.startsWith('Circulation'))), state, best)

  return best.rooms ? best.rooms.map(r => ({ ...r })) : null
}
