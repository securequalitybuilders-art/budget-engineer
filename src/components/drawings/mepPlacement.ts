import type { PlanModel, RoomRect } from '@/domain/plan'

export interface MepSymbol {
  type: string
  cx: number
  cy: number
  size: number
  label?: string
}

export interface MepRun {
  points: { x: number; y: number }[]
}

export interface MepPlacement {
  symbols: MepSymbol[]
  runs: MepRun[]
}

// ── Helpers ──

function roomCenter(room: RoomRect): { cx: number; cy: number } {
  return { cx: room.x + room.width / 2, cy: room.y + room.height / 2 }
}

function isWetName(name: string): boolean {
  const lower = name.toLowerCase()
  return /bath|toilet|wc|kitchen|laundry|shower|pantry|scullery/.test(lower)
}

function findDoors(plan: PlanModel): RoomRect[] {
  return plan.rooms.filter(r => /door|entry|entrance|lobby/.test(r.name.toLowerCase()))
}

// ── Electrical ──

export function placeElectrical(plan: PlanModel): MepPlacement {
  const symbols: MepSymbol[] = []
  const runs: MepRun[] = []

  if (plan.rooms.length === 0) {
    return { symbols, runs }
  }

  // One ceiling light per room centre
  for (const room of plan.rooms) {
    const { cx, cy } = roomCenter(room)
    symbols.push({ type: 'light', cx, cy, size: 6 })
  }

  // Sockets: ~1 per 3m of interior wall perimeter, min 2 per room
  for (const room of plan.rooms) {
    const perim = 2 * (room.width + room.height)
    const count = Math.max(2, Math.round(perim / 3))
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count
      const perimeter = t * perim
      let sx: number, sy: number
      const halfPerim = room.width + room.height
      if (perimeter < room.width) {
        sx = room.x + perimeter
        sy = room.y
      } else if (perimeter < halfPerim) {
        sx = room.x + room.width
        sy = room.y + (perimeter - room.width)
      } else if (perimeter < halfPerim + room.width) {
        sx = room.x + room.width - (perimeter - halfPerim)
        sy = room.y + room.height
      } else {
        sx = room.x
        sy = room.y + room.height - (perimeter - halfPerim - room.width)
      }
      symbols.push({ type: 'socket', cx: sx, cy: sy, size: 5 })
    }
  }

  // Switch beside first door-like room or near entry
  const entries = findDoors(plan)
  if (entries.length > 0) {
    const entry = entries[0]
    symbols.push({ type: 'switch', cx: entry.x + entry.width + 0.3, cy: entry.y + entry.height / 2, size: 4 })
  } else {
    const first = plan.rooms[0]
    symbols.push({ type: 'switch', cx: first.x + first.width + 0.3, cy: first.y + first.height / 2, size: 4 })
  }

  // DistributionBoard near main entry or first room
  const first = plan.rooms[0]
  symbols.push({ type: 'db', cx: first.x + 0.5, cy: first.y + first.height - 0.5, size: 8 })

  return { symbols, runs }
}

// ── Plumbing ──

export function placePlumbing(plan: PlanModel): MepPlacement {
  const symbols: MepSymbol[] = []
  const runs: MepRun[] = []

  if (plan.rooms.length === 0) {
    return { symbols, runs }
  }

  const wetRooms = plan.rooms.filter(r => isWetName(r.name))

  if (wetRooms.length === 0) {
    // Indicative stack only
    const cx = plan.width / 2
    const cy = plan.height / 2
    symbols.push({ type: 'stack', cx, cy, size: 7, label: 'indicative stack' })
    return { symbols, runs }
  }

  for (const room of wetRooms) {
    const { cx, cy } = roomCenter(room)
    const lower = room.name.toLowerCase()

    if (/wc|toilet/.test(lower)) {
      symbols.push({ type: 'wc', cx: cx - room.width * 0.2, cy, size: 7 })
    }
    if (/bath|shower/.test(lower)) {
      symbols.push({ type: 'shower', cx: cx + room.width * 0.2, cy, size: 7 })
    }
    if (/basin|wash/.test(lower)) {
      symbols.push({ type: 'basin', cx: cx - room.width * 0.2, cy: cy + room.height * 0.2, size: 6 })
    }
    // Every wet room gets a floor drain
    symbols.push({ type: 'drain', cx: cx + room.width * 0.25, cy: cy - room.height * 0.2, size: 4 })

    if (/kitchen|pantry|scullery/.test(lower)) {
      symbols.push({ type: 'sink', cx: cx + room.width * 0.3, cy, size: 8 })
    }
  }

  // Stack/riser in/near the largest wet room
  const largestWet = wetRooms.reduce((a, b) => a.width * a.height > b.width * b.height ? a : b)
  const { cx: scx, cy: scy } = roomCenter(largestWet)
  symbols.push({ type: 'stack', cx: scx + largestWet.width * 0.35, cy: scy + largestWet.height * 0.35, size: 7 })

  // Dashed pipe runs from each wet room centre to stack
  for (const room of wetRooms) {
    const { cx, cy } = roomCenter(room)
    runs.push({
      points: [
        { x: cx, y: cy },
        { x: scx + largestWet.width * 0.35, y: scy + largestWet.height * 0.35 },
      ],
    })
  }

  return { symbols, runs }
}

// ── HVAC ──

export function placeHvac(plan: PlanModel): MepPlacement {
  const symbols: MepSymbol[] = []
  const runs: MepRun[] = []

  if (plan.rooms.length === 0) {
    return { symbols, runs }
  }

  // Supply diffuser + return grille per room
  for (const room of plan.rooms) {
    const { cx, cy } = roomCenter(room)
    symbols.push({ type: 'supply', cx: cx - room.width * 0.2, cy, size: 7 })
    symbols.push({ type: 'return', cx: cx + room.width * 0.2, cy, size: 7 })
  }

  // One FCU near centre of plan
  const fcuCx = plan.width / 2
  const fcuCy = plan.height / 2
  symbols.push({ type: 'fcu', cx: fcuCx, cy: fcuCy, size: 10 })

  // Duct runs from FCU to each room centre
  for (const room of plan.rooms) {
    const { cx, cy } = roomCenter(room)
    runs.push({
      points: [
        { x: fcuCx, y: fcuCy },
        { x: cx, y: cy },
      ],
    })
  }

  return { symbols, runs }
}
