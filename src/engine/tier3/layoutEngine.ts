import type { Tier1ParsedBrief, Typology, ProgramItem } from '../tier1-types'
import type { DesignConcept } from '../tier2/conceptEngine'

export type Topology = 'rectangle' | 'l-shape' | 'split-wing' | 'courtyard'

export interface LayoutParameters {
  topologies: Topology[]
  siteWidth: number
  siteDepth: number
  wallThickness: number
  corridorWidth: number
  minRoomDimensions: Record<string, { minWidth: number; minDepth: number }>
  floorCount: number
  floorHeight: number
}

export interface PlacedRoom {
  name: string
  x: number
  y: number
  width: number
  height: number
}

export interface FloorPlan {
  id: string
  name: string
  topology: Topology
  width: number
  height: number
  rooms: PlacedRoom[]
  floorIndex?: number
  totalFloors?: number
}

const uid = () => Math.random().toString(36).slice(2, 10)

const FALLBACK_MIN_DIMS: Record<string, { minWidth: number; minDepth: number }> = {
  'Master Bedroom': { minWidth: 3.5, minDepth: 4.0 },
  'Bedroom': { minWidth: 3.0, minDepth: 3.5 },
  'Bathroom': { minWidth: 1.8, minDepth: 2.2 },
  'Kitchen': { minWidth: 2.5, minDepth: 3.0 },
  'Living Room': { minWidth: 3.5, minDepth: 4.0 },
  'Reception / Waiting': { minWidth: 4.0, minDepth: 4.5 },
  'Consultation Room': { minWidth: 3.0, minDepth: 3.5 },
  'Treatment Room': { minWidth: 3.5, minDepth: 4.0 },
  'Restaurant': { minWidth: 6.0, minDepth: 8.0 },
  'Guest Room': { minWidth: 3.5, minDepth: 5.5 },
  'Classroom': { minWidth: 6.0, minDepth: 7.5 },
  'Staff Room': { minWidth: 4.0, minDepth: 4.5 },
  'Open-Plan Office': { minWidth: 6.0, minDepth: 8.0 },
  'Private Office': { minWidth: 3.0, minDepth: 3.5 },
  'Meeting Room': { minWidth: 4.0, minDepth: 4.5 },
  'Sales Floor': { minWidth: 5.0, minDepth: 8.0 },
  'Dining Area': { minWidth: 5.0, minDepth: 7.0 },
  'Commercial Kitchen': { minWidth: 4.0, minDepth: 5.0 },
  'Main Hall': { minWidth: 8.0, minDepth: 12.0 },
  'Main Hall / Sanctuary': { minWidth: 10.0, minDepth: 12.0 },
  'Warehouse Floor': { minWidth: 12.0, minDepth: 20.0 },
  'Vendor Stall': { minWidth: 2.0, minDepth: 3.0 },
  'Shop / Convenience': { minWidth: 4.0, minDepth: 5.0 },
  'Ground Floor Shop': { minWidth: 5.0, minDepth: 8.0 },
  'Upper Apartment': { minWidth: 5.0, minDepth: 8.0 },
}

function gatherMinDims(typology: Typology | null): Record<string, { minWidth: number; minDepth: number }> {
  const merged: Record<string, { minWidth: number; minDepth: number }> = {}
  if (typology?.minRoomDimensions) {
    for (const [k, v] of Object.entries(typology.minRoomDimensions)) {
      merged[k] = v
    }
  }
  for (const [k, v] of Object.entries(FALLBACK_MIN_DIMS)) {
    if (!merged[k]) merged[k] = v
  }
  return merged
}

function dimForRoom(name: string, minDims: Record<string, { minWidth: number; minDepth: number }>): { minWidth: number; minDepth: number } {
  if (minDims[name]) return minDims[name]
  for (const [key, dim] of Object.entries(minDims)) {
    if (name.startsWith(key) || key.startsWith(name)) return dim
  }
  return { minWidth: 2.0, minDepth: 2.0 }
}

function roomsIntersect(a: PlacedRoom, b: PlacedRoom): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function hasOverlaps(rooms: PlacedRoom[]): boolean {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsIntersect(rooms[i], rooms[j])) return true
    }
  }
  return false
}

function zbcEnforce(room: PlacedRoom, minDims: Record<string, { minWidth: number; minDepth: number }>): PlacedRoom {
  const d = dimForRoom(room.name, minDims)
  return {
    ...room,
    width: Math.max(room.width, d.minWidth),
    height: Math.max(room.height, d.minDepth),
  }
}

function totalProgramArea(program: ProgramItem[]): number {
  return program.reduce((s, p) => s + p.areaM2 * p.count, 0)
}

function expandProgram(program: ProgramItem[]): { name: string; area: number }[] {
  const items: { name: string; area: number }[] = []
  for (const p of program) {
    for (let i = 0; i < p.count; i++) {
      const suffix = p.count > 1 ? ` ${i + 1}` : ''
      items.push({ name: p.name + suffix, area: p.areaM2 })
    }
  }
  return items
}

function pickSiteDims(brief: Tier1ParsedBrief): { w: number; d: number } {
  const progArea = totalProgramArea(brief.program)
  const si = brief.siteInfo
  if (si.widthM && si.depthM) {
    return { w: si.widthM, d: si.depthM }
  }
  if (progArea <= 0) return { w: 30, d: 30 }
  const side = Math.sqrt(progArea * 1.3)
  return { w: Math.round(side * 10) / 10, d: Math.round((progArea * 1.3 / side) * 10) / 10 }
}

function computePlanBounds(rooms: PlacedRoom[]): { w: number; d: number } {
  const w = rooms.reduce((m, r) => Math.max(m, r.x + r.width), 0)
  const d = rooms.reduce((m, r) => Math.max(m, r.y + r.height), 0)
  return { w: w > 0 ? w : 10, d: d > 0 ? d : 10 }
}

// ── Topology generators ──

function generateRectangle(program: ProgramItem[], siteW: number, siteD: number, minDims: Record<string, { minWidth: number; minDepth: number }>): FloorPlan {
  const items = expandProgram(program)
  const progArea = totalProgramArea(program)
  const bldgW = Math.max(6, Math.min(siteW * 0.85, Math.sqrt(progArea * 1.5)))
  const bldgD = Math.max(6, Math.min(siteD * 0.85, progArea / bldgW))

  const corridors = items.filter(r => r.name === 'Circulation' || r.name.startsWith('Circulation'))
  const nonCorridors = items.filter(r => r.name !== 'Circulation' && !r.name.startsWith('Circulation'))

  const PUBLIC_PREFIXES = ['Reception / Waiting', 'Reception / Lobby', 'Reception', 'Living Room', 'Lounge / Dining', 'Dining Area', 'Sales Floor', 'Retail Floor', 'Dining Area 1', 'Main Hall', 'Open Plan Office']
  let publicItems = nonCorridors.filter(i => PUBLIC_PREFIXES.some(p => i.name.startsWith(p)))
  let privateItems = nonCorridors.filter(i => !publicItems.includes(i))

  if (publicItems.length === 0 && privateItems.length > 0) {
    publicItems = [privateItems[0]]
    privateItems = privateItems.slice(1)
  }

  const corridorH = Math.max(2, corridors.reduce((s, r) => s + r.area, 0) / bldgW)
  const usedH = corridorH
  const roomTotalArea = nonCorridors.reduce((s, r) => s + r.area, 0)

  // Compute required band depths: must accommodate minDepth of rooms in each band
  const publicMinDepth = publicItems.length > 0
    ? Math.max(...publicItems.map(r => dimForRoom(r.name, minDims).minDepth))
    : 3
  const privateMinDepth = privateItems.length > 0
    ? Math.max(...privateItems.map(r => dimForRoom(r.name, minDims).minDepth))
    : 3

  const availDepth = Math.max(0, bldgD - usedH)
  const frontD = Math.max(publicMinDepth, availDepth > 0
    ? (roomTotalArea > 0
      ? availDepth * Math.max(0.2, Math.min(publicItems.reduce((s, r) => s + r.area, 0) / roomTotalArea, 0.7))
      : availDepth * (publicItems.length / Math.max(1, nonCorridors.length)))
    : 3)
  const backD = Math.max(privateMinDepth, bldgD - frontD - usedH)

  const rooms: PlacedRoom[] = []

  let x = 0
  for (const item of publicItems) {
    const w = Math.max(dimForRoom(item.name, minDims).minWidth, item.area > 0 ? item.area / frontD : dimForRoom(item.name, minDims).minWidth)
    const room: PlacedRoom = zbcEnforce({ name: item.name, x, y: 0, width: w, height: frontD }, minDims)
    // Clip room to band depth
    room.height = Math.min(room.height, frontD)
    rooms.push(room)
    x += room.width
  }
  if (rooms.length > 0 && x < bldgW) {
    rooms[rooms.length - 1].width += bldgW - x
  }

  // Corridor band
  rooms.push({ name: 'Circulation', x: 0, y: frontD, width: bldgW, height: corridorH })

  const backY = frontD + corridorH
  x = 0
  for (const item of privateItems) {
    const w = Math.max(dimForRoom(item.name, minDims).minWidth, item.area > 0 ? item.area / backD : dimForRoom(item.name, minDims).minWidth)
    const room: PlacedRoom = zbcEnforce({ name: item.name, x, y: backY, width: w, height: backD }, minDims)
    // Clip room to band depth
    room.height = Math.min(room.height, backD)
    rooms.push(room)
    x += room.width
  }
  if (x < bldgW && rooms.length > 0) {
    rooms[rooms.length - 1].width += bldgW - x
  }

  const { w: planW, d: planD } = computePlanBounds(rooms)
  return { id: uid(), name: 'Rectangle — Public Front / Corridor / Private Back', topology: 'rectangle', width: planW, height: planD, rooms }
}

function generateLShape(program: ProgramItem[], siteW: number, _siteD: number, minDims: Record<string, { minWidth: number; minDepth: number }>): FloorPlan {
  const items = expandProgram(program)
  const progArea = totalProgramArea(program)

  const wingW = Math.max(6, Math.min(siteW * 0.75, Math.sqrt(progArea) * 0.8))

  const midIdx = Math.max(1, Math.ceil(items.length / 2))
  const vertItems = items.slice(0, midIdx)
  const horizItems = items.slice(midIdx)

  const corridorW = 2.0
  const rooms: PlacedRoom[] = []

  // Vertical wing: rooms stacked on the left
  const vertW = Math.max(3, wingW * 0.45)
  let y = 0
  for (const item of vertItems) {
    const minD = dimForRoom(item.name, minDims).minDepth
    const h = Math.max(minD, item.area / vertW)
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: 0, y, width: vertW, height: h }, minDims)
    rooms.push(room)
    y += room.height
  }
  const actualVertH = Math.max(y, 3)

  // Corridor next to vertical wing
  rooms.push({ name: 'Circulation', x: vertW, y: 0, width: corridorW, height: actualVertH })

  // Horizontal wing: places at the BOTTOM of the vertical wing, extending right
  const horizX = vertW + corridorW
  const horizD = Math.max(2, actualVertH * 0.4)
  let horizRight = horizX
  for (const item of horizItems) {
    const minW = dimForRoom(item.name, minDims).minWidth
    const w = Math.max(minW, item.area / horizD)
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: horizRight, y: actualVertH - horizD, width: w, height: horizD }, minDims)
    rooms.push(room)
    horizRight += room.width
  }

  // Courtyard in the corner formed by vertical wing and horizontal wing
  const courtyardX = horizX
  const courtyardY = 0
  const courtyardW = Math.max(2, horizRight - horizX)
  const courtyardH = Math.max(2, actualVertH - horizD)
  if (courtyardW > 2 && courtyardH > 2) {
    rooms.push({ name: 'Courtyard', x: courtyardX, y: courtyardY, width: courtyardW, height: courtyardH })
  }

  const { w: planW, d: planD } = computePlanBounds(rooms)
  return { id: uid(), name: 'L-Shape — Vertical Wing + Horizontal Wing + Corner Courtyard', topology: 'l-shape', width: planW, height: planD, rooms }
}

function generateSplitWing(program: ProgramItem[], siteW: number, minDims: Record<string, { minWidth: number; minDepth: number }>): FloorPlan {
  const items = expandProgram(program)
  const progArea = totalProgramArea(program)

  const pavW = Math.max(3, Math.min(siteW * 0.4, Math.sqrt(progArea) * 0.5))
  const galleryW = 2.0

  const midIdx = Math.max(1, Math.ceil(items.length / 2))
  const leftItems = items.slice(0, midIdx)
  const rightItems = items.slice(midIdx)

  const rooms: PlacedRoom[] = []

  let y = 0
  for (const item of leftItems) {
    const minD = dimForRoom(item.name, minDims).minDepth
    const h = Math.max(minD, item.area / pavW)
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: 0, y, width: pavW, height: h }, minDims)
    rooms.push(room)
    y += room.height
  }
  const leftH = Math.max(y, 3)

  rooms.push({ name: 'Gallery', x: pavW, y: 0, width: galleryW, height: leftH })

  const rightX = pavW + galleryW
  y = 0
  for (const item of rightItems) {
    const minD = dimForRoom(item.name, minDims).minDepth
    const h = Math.max(minD, item.area / pavW)
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: rightX, y, width: pavW, height: h }, minDims)
    rooms.push(room)
    y += room.height
  }

  const { w: planW, d: planD } = computePlanBounds(rooms)
  return { id: uid(), name: 'Split-Wing — Two Pavilions + Central Gallery', topology: 'split-wing', width: planW, height: planD, rooms }
}

function generateCourtyard(program: ProgramItem[], siteW: number, siteD: number, minDims: Record<string, { minWidth: number; minDepth: number }>): FloorPlan {
  const items = expandProgram(program)
  const count = items.length
  if (count === 0) {
    return { id: uid(), name: 'Courtyard — Rooms Around Central Space', topology: 'courtyard', width: 10, height: 10, rooms: [] }
  }

  const gutter = 0.3

  // For each item, compute the ZBC-enforced minimum dimensions once
  interface SizedRoom {
    name: string
    area: number
    minW: number
    minD: number
  }
  const sized: SizedRoom[] = items.map(item => {
    const d = dimForRoom(item.name, minDims)
    return { name: item.name, area: item.area, minW: d.minWidth, minD: d.minDepth }
  })

  // Choose wingDepth so that NO room's minDepth or minWidth exceeds it.
  // This guarantees zbcEnforce never changes planned dimensions.
  let maxDim = 4.0
  for (const r of sized) {
    maxDim = Math.max(maxDim, r.minW, r.minD)
  }
  const wingDepth = maxDim

  // Distribute rooms evenly across wings (handle <4 by using fewer wings)
  function distributeEven(arr: SizedRoom[], wings: number): SizedRoom[][] {
    const result: SizedRoom[][] = Array.from({ length: wings }, () => [])
    for (let i = 0; i < arr.length; i++) {
      result[i % wings].push(arr[i])
    }
    return result
  }

  const numWings = count < 4 ? count : 4
  const wings = distributeEven(sized, numWings)

  // Helper: for a horizontal wing (north/south), room height = wingDepth, width = area/wingDepth clamped to minW
  function hSize(r: SizedRoom): number {
    return Math.max(r.minW, r.area / wingDepth)
  }
  // Helper: for a vertical wing (east/west), room width = wingDepth, height = area/wingDepth clamped to minD
  function vSize(r: SizedRoom): number {
    return Math.max(r.minD, r.area / wingDepth)
  }

  function horizontalSpan(w: SizedRoom[]): number {
    if (w.length === 0) return 3
    return w.reduce((s, r) => s + hSize(r) + gutter, 0)
  }

  function verticalSpan(w: SizedRoom[]): number {
    if (w.length === 0) return 3
    return w.reduce((s, r) => s + vSize(r) + gutter, 0)
  }

  // Compute spans for each of the 4 cardinal wings (or fewer)
  const hSpan0 = horizontalSpan(wings[0] || [])  // north
  const vSpan1 = verticalSpan(wings[1] || [])    // east
  const hSpan2 = horizontalSpan(wings[2] || [])  // south
  const vSpan3 = verticalSpan(wings[3] || [])    // west

  // For N-wing layouts, pad missing wings with 0 span
  const reqW = Math.max(hSpan0, hSpan2) + (wings.length > 1 ? wingDepth * 2 : 0)
  const reqD = Math.max(vSpan1, vSpan3) + (wings.length > 1 ? wingDepth * 2 : 0)

  const outerW = Math.min(Math.max(siteW * 0.9, reqW), Math.max(siteW, reqW))
  const outerD = Math.min(Math.max(siteD * 0.9, reqD), Math.max(siteD, reqD))

  const rooms: PlacedRoom[] = []

  if (numWings === 1) {
    // Single row — place all rooms side-by-side
    let x = 0
    for (const r of wings[0]) {
      const w = hSize(r)
      rooms.push({ name: r.name, x, y: 0, width: w, height: wingDepth })
      x += w + gutter
    }
  } else if (numWings === 2) {
    // Two wings — place north row then south row (or left column + right)
    const midIdx = Math.ceil(count / 2)
    const top = sized.slice(0, midIdx)
    const bottom = sized.slice(midIdx)
    let x = 0
    for (const r of top) {
      const rw = hSize(r)
      rooms.push({ name: r.name, x, y: 0, width: rw, height: wingDepth })
      x += rw + gutter
    }
    x = 0
    for (const r of bottom) {
      const rw = hSize(r)
      rooms.push({ name: r.name, x, y: outerD - wingDepth, width: rw, height: wingDepth })
      x += rw + gutter
    }
  } else {
    // 3 or 4 wings — full ring
    const availSide = Math.max(3, outerW - wingDepth * 2)
    const availVert = Math.max(3, outerD - wingDepth * 2)

    // North wing (top, rooms side-by-side)
    const northStartX = wings.length >= 4 ? (outerW - availSide) / 2 : 0
    let x = northStartX
    for (const r of wings[0]) {
      const w = hSize(r)
      rooms.push({ name: r.name, x, y: 0, width: w, height: wingDepth })
      x += w + gutter
    }

    // East wing (right, rooms stacked)
    const eastStartY = wings.length >= 4 ? (outerD - availVert) / 2 : 0
    let y = eastStartY
    if (wings[1]) {
      for (const r of wings[1]) {
        const d = vSize(r)
        rooms.push({ name: r.name, x: outerW - wingDepth, y, width: wingDepth, height: d })
        y += d + gutter
      }
    }

    // South wing (bottom, rooms side-by-side)
    x = northStartX
    for (const r of wings[2]) {
      const w = hSize(r)
      rooms.push({ name: r.name, x, y: outerD - wingDepth, width: w, height: wingDepth })
      x += w + gutter
    }

    // West wing (left, rooms stacked)
    y = eastStartY
    if (wings[3]) {
      for (const r of wings[3]) {
        const d = vSize(r)
        rooms.push({ name: r.name, x: 0, y, width: wingDepth, height: d })
        y += d + gutter
      }
    }

    // Courtyard void (center)
    if (wings.length >= 4) {
      const cw = outerW - wingDepth * 2
      const cd = outerD - wingDepth * 2
      if (cw > 2 && cd > 2) {
        rooms.push({ name: 'Courtyard', x: wingDepth, y: wingDepth, width: cw, height: cd })
      }
    }
  }

  const { w: planW, d: planD } = computePlanBounds(rooms)
  return { id: uid(), name: 'Courtyard — Rooms Around Central Space', topology: 'courtyard', width: planW, height: planD, rooms }
}

function floorPlanWithMeta(
  plan: Omit<FloorPlan, 'floorIndex' | 'totalFloors'>,
  floorIndex: number,
  totalFloors: number,
): FloorPlan {
  return { ...plan, floorIndex, totalFloors }
}

const PUBLIC_PREFIXES = ['Reception / Waiting', 'Reception / Lobby', 'Reception', 'Living Room', 'Lounge / Dining', 'Dining Area', 'Sales Floor', 'Retail Floor', 'Dining Area 1', 'Main Hall', 'Open Plan Office', 'Kitchen', 'Restaurant', 'Commercial Kitchen', 'Consultation Room', 'Treatment Room', 'Staff Room', 'Meeting Room', 'Ground Floor Shop']

function isPublicItem(name: string): boolean {
  return PUBLIC_PREFIXES.some((p) => name.startsWith(p))
}

function partitionProgram(
  program: ProgramItem[],
  floorCount: number,
): { groundFloor: ProgramItem[]; upperFloors: ProgramItem[][] } {
  if (floorCount <= 1) {
    return { groundFloor: [...program], upperFloors: [] }
  }

  const groundItems: ProgramItem[] = []
  const remainingItems: ProgramItem[] = []

  for (const item of program) {
    if (isPublicItem(item.name) || item.name === 'Circulation' || item.name.startsWith('Circulation')) {
      groundItems.push(item)
    } else {
      remainingItems.push(item)
    }
  }

  if (groundItems.length === 0 && remainingItems.length > 0) {
    groundItems.push(remainingItems.shift()!)
  }

  const upperCount = floorCount - 1
  const perFloor = Math.max(1, Math.ceil(remainingItems.length / upperCount))
  const upperFloors: ProgramItem[][] = []

  for (let i = 0; i < upperCount; i++) {
    const start = i * perFloor
    const end = Math.min(start + perFloor, remainingItems.length)
    if (start < remainingItems.length) {
      upperFloors.push(remainingItems.slice(start, end))
    } else {
      upperFloors.push([])
    }
  }

  return { groundFloor: groundItems, upperFloors }
}

/**
 * Generate floor plans for a multi-storey building.
 * Ground floor gets public/shared rooms, upper floors get private/repeatable rooms.
 * Returns one FloorPlan[] per floor, with shared stair positions for alignment.
 */
export function generateMultiFloorPlans(
  params: LayoutParameters,
  brief: Tier1ParsedBrief,
): FloorPlan[][] {
  const { topologies, siteWidth, siteDepth, minRoomDimensions, floorCount } = params
  let program = brief.program.length > 0 ? brief.program : (brief.typology?.defaultProgram ?? [])

  if (program.length === 0) {
    program = [{ name: 'Default Room', count: Math.max(1, floorCount), areaM2: 20 }]
  }

  const { groundFloor, upperFloors } = partitionProgram(program, floorCount)

  const perFloorPrograms = [groundFloor, ...upperFloors]

  const result: FloorPlan[][] = []

  for (let fi = 0; fi < perFloorPrograms.length; fi++) {
    let floorProgram = perFloorPrograms[fi]
    if (floorProgram.length === 0) {
      floorProgram = [{ name: 'Default Room', count: 1, areaM2: 20 }]
    }

    const floorPlans: FloorPlan[] = []

    for (const topology of topologies) {
      let plan: FloorPlan
      try {
        switch (topology) {
          case 'rectangle':
            plan = generateRectangle(floorProgram, siteWidth, siteDepth, minRoomDimensions)
            break
          case 'l-shape':
            plan = generateLShape(floorProgram, siteWidth, siteDepth, minRoomDimensions)
            break
          case 'split-wing':
            plan = generateSplitWing(floorProgram, siteWidth, minRoomDimensions)
            break
          case 'courtyard':
            plan = generateCourtyard(floorProgram, siteWidth, siteDepth, minRoomDimensions)
            break
        }
        if (hasOverlaps(plan!.rooms)) {
          plan = generateRectangle(floorProgram, Math.max(siteWidth, 30), Math.max(siteDepth, 30), minRoomDimensions)
          plan = { ...plan, topology, name: `Fallback Rectangle (${topology} degrade)` }
        }
      } catch {
        plan = generateRectangle(floorProgram, Math.max(siteWidth, 30), Math.max(siteDepth, 30), minRoomDimensions)
        plan = { ...plan, topology, name: `Fallback Rectangle (${topology} degrade)` }
      }
      floorPlans.push(floorPlanWithMeta(plan, fi, floorCount))
    }

    result.push(floorPlans)
  }

  return result
}

// ── Public API ──

export function generateLayoutParameters(
  _concept: DesignConcept,
  brief: Tier1ParsedBrief,
): LayoutParameters {
  const { w, d } = pickSiteDims(brief)
  const minDims = gatherMinDims(brief.typology)
  const typologyId = brief.typology?.id ?? 'house-residential'

  const heritageId = brief.heritagePattern?.id
  const needsCourtyard = typologyId === 'hotel-fullservice' || typologyId === 'townhouse' || heritageId === 'kraal' || heritageId === 'courtyard-hearth'

  const topologies: Topology[] = needsCourtyard
    ? ['courtyard', 'l-shape', 'split-wing']
    : ['rectangle', 'l-shape', 'split-wing']

  const floorCount = Math.max(1, brief.typology?.defaultStoreys ?? 1)

  return {
    topologies,
    siteWidth: w,
    siteDepth: d,
    wallThickness: 0.2,
    corridorWidth: 1.5,
    minRoomDimensions: minDims,
    floorCount,
    floorHeight: 3.0,
  }
}

export function generateFloorPlans(
  params: LayoutParameters,
  brief: Tier1ParsedBrief,
): FloorPlan[] {
  const { topologies, siteWidth, siteDepth, minRoomDimensions } = params
  const program = brief.program.length > 0 ? brief.program : (brief.typology?.defaultProgram ?? [])

  const plans: FloorPlan[] = []

  for (const topology of topologies) {
    let plan: FloorPlan
    try {
      switch (topology) {
        case 'rectangle':
          plan = generateRectangle(program, siteWidth, siteDepth, minRoomDimensions)
          break
        case 'l-shape':
          plan = generateLShape(program, siteWidth, siteDepth, minRoomDimensions)
          break
        case 'split-wing':
          plan = generateSplitWing(program, siteWidth, minRoomDimensions)
          break
        case 'courtyard':
          plan = generateCourtyard(program, siteWidth, siteDepth, minRoomDimensions)
          break
      }
      if (hasOverlaps(plan!.rooms)) {
        console.warn(`[Tier 3] ${topology} had overlaps — using fallback`)
        plan = generateRectangle(program, Math.max(siteWidth, 30), Math.max(siteDepth, 30), minRoomDimensions)
        plan = { ...plan, topology, name: `Fallback Rectangle (${topology} degrade)` }
      }
    } catch (err) {
      console.warn(`[Tier 3] ${topology} error: ${err instanceof Error ? err.message : 'unknown'} — using fallback`)
      plan = generateRectangle(program, Math.max(siteWidth, 30), Math.max(siteDepth, 30), minRoomDimensions)
      plan = { ...plan, topology, name: `Fallback Rectangle (${topology} degrade)` }
    }
    plans.push(plan)
  }

  return plans
}
