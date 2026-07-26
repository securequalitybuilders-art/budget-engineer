import type { FloorPlan, PlacedRoom, ProgramItem, MasterChassis } from './layoutEngine'
import type { VerticalChassis } from './vertical-chassis'

export interface StairwellDesign {
  risers: number
  treads: number
  run: number
  landingDepth: number
  stairWidth: number
  uShapeDepth: number
}

export interface MultiStoreyWarnings {
  wetCoreMisalignments: string[]
  stairMisalignments: string[]
  structuralWarnings: string[]
  programWarnings: string[]
}

export function computeStairwellDesign(floorHeight: number): StairwellDesign {
  const maxRiser = 0.175
  const minGoing = 0.25
  const stairWidth = 1.0
  const landingClear = 0.3

  const risers = Math.ceil(floorHeight / maxRiser)
  const actualRiser = floorHeight / risers
  const treads = risers - 1
  const run = treads * minGoing
  const landingDepth = stairWidth + landingClear
  const uShapeDepth = (run / 2) + landingDepth

  return { risers, treads, run, landingDepth, stairWidth, uShapeDepth }
}

export function computeStairArea(stairDesign: StairwellDesign): number {
  return Math.ceil(stairDesign.stairWidth * Math.max(stairDesign.uShapeDepth, 2.5))
}

function roomsOverlapX(a: PlacedRoom, b: PlacedRoom, tolerance: number = 0.5): boolean {
  const aCx = a.x + a.width / 2
  const bCx = b.x + b.width / 2
  return Math.abs(aCx - bCx) < (a.width / 2 + b.width / 2 + tolerance)
}

export function enforceVerticalStacking(
  floors: FloorPlan[][],
  verticalChassis: VerticalChassis,
): { plans: FloorPlan[][]; warnings: MultiStoreyWarnings } {
  const warnings: MultiStoreyWarnings = {
    wetCoreMisalignments: [],
    stairMisalignments: [],
    structuralWarnings: [],
    programWarnings: [],
  }

  if (floors.length < 2) return { plans: floors, warnings }

  // ── 1. Wet-core stacking ──
  const wetCorePositions: { floor: number; name: string; cx: number }[] = []
  for (let fi = 0; fi < floors.length; fi++) {
    for (const plan of floors[fi]) {
      for (const room of plan.rooms) {
        if (room.isWetCore) {
          wetCorePositions.push({ floor: fi, name: room.name, cx: room.x + room.width / 2 })
        }
      }
    }
  }

  if (wetCorePositions.length > 1) {
    for (let i = 1; i < wetCorePositions.length; i++) {
      const prev = wetCorePositions[i - 1]
      const curr = wetCorePositions[i]
      if (curr.floor === prev.floor) continue
      if (!roomsOverlapX({ ...prev, width: 1, height: 1 } as PlacedRoom, { ...curr, width: 1, height: 1 } as PlacedRoom, 0.5)) {
        warnings.wetCoreMisalignments.push(
          `Wet core "${curr.name}" on floor ${curr.floor} (cx=${curr.cx.toFixed(1)}) misaligned with "${prev.name}" on floor ${prev.floor} (cx=${prev.cx.toFixed(1)})`,
        )
      }
    }
  }

  // ── 2. Stairwell stacking ──
  const stairPositions: { floor: number; cx: number; cy: number }[] = []
  for (let fi = 0; fi < floors.length; fi++) {
    for (const plan of floors[fi]) {
      const stair = plan.rooms.find(r => r.name === 'Stairwell')
      if (stair) {
        stairPositions.push({ floor: fi, cx: stair.x + stair.width / 2, cy: stair.y + stair.height / 2 })
      }
    }
  }

  if (stairPositions.length > 1) {
    const baseStair = stairPositions[0]
    for (let i = 1; i < stairPositions.length; i++) {
      const s = stairPositions[i]
      const dx = Math.abs(s.cx - baseStair.cx)
      const dy = Math.abs(s.cy - baseStair.cy)
      if (dx > 0.5 || dy > 0.5) {
        warnings.stairMisalignments.push(
          `Stairwell on floor ${s.floor} (cx=${s.cx.toFixed(1)}, cy=${s.cy.toFixed(1)}) misaligned with floor ${baseStair.floor} (cx=${baseStair.cx.toFixed(1)}, cy=${baseStair.cy.toFixed(1)})`,
        )
      }
    }
  }

  // ── 3. Structural grid alignment ──
  if (floors.length >= 2 && floors[0].length > 0) {
    const refWidth = floors[0][0].width
    for (let fi = 1; fi < floors.length; fi++) {
      for (const plan of floors[fi]) {
        const refPlan = floors[0].find(p => p.topology === plan.topology)
        if (refPlan && Math.abs(refPlan.width - plan.width) > 0.5) {
          warnings.structuralWarnings.push(
            `Floor ${fi} ${plan.topology} width (${plan.width.toFixed(1)}) differs from ground floor (${refPlan.width.toFixed(1)})`,
          )
        }
      }
    }
  }

  // ── 4. Program partitioning check ──
  if (verticalChassis.isMixedUse && floors.length >= 2) {
    const groundPublic = floors[0].some(plan =>
      plan.rooms.some(r => r.zone === 'public' || r.name.includes('Shop') || r.name.includes('Retail')),
    )
    if (!groundPublic) {
      warnings.programWarnings.push('Mixed-use: ground floor has no public/retail rooms')
    }

    for (let fi = 1; fi < floors.length; fi++) {
      const hasPrivate = floors[fi].some(plan =>
        plan.rooms.some(r => r.zone === 'private'),
      )
      if (!hasPrivate) {
        warnings.programWarnings.push(`Mixed-use: floor ${fi} has no private (residential) rooms`)
      }
    }
  }

  return { plans: floors, warnings }
}

export function partitionProgramForStoreys(
  program: ProgramItem[],
  floorCount: number,
  typologyId?: string,
): { groundFloor: ProgramItem[]; upperFloors: ProgramItem[][] } {
  if (floorCount <= 1) {
    return { groundFloor: [...program], upperFloors: [] }
  }

  const groundItems: ProgramItem[] = []
  const serviceItems: ProgramItem[] = []
  const privateItems: ProgramItem[] = []
  const remainingItems: ProgramItem[] = []

  const PUBLIC_PREFIXES = [
    'Reception', 'Waiting', 'Living Room', 'Lounge', 'Dining',
    'Sales Floor', 'Display', 'Main Hall', 'Assembly',
    'Open Plan', 'Restaurant', 'Bar', 'Conference',
    'Classroom', 'Library', 'Lab', 'Warehouse', 'Vendor',
    'Shop', 'Retail', 'Kitchen', 'Counter',
  ]
  const SERVICE_PREFIXES = ['Kitchen', 'Laundry', 'Storage', 'Utility', 'Plant', 'Boiler', 'Service']
  const isMixedUse = typologyId === 'mixed-use'

  let hasResidentialLobby = false

  for (const item of program) {
    const isPublic = PUBLIC_PREFIXES.some(p => item.name.startsWith(p))
    const isService = SERVICE_PREFIXES.some(p => item.name.startsWith(p))
    const isCirc = item.name === 'Circulation' || item.name.startsWith('Circulation') || item.name.includes('Lobby') || item.name.includes('Stair')
    const isWet = item.isWetCore

    if (isPublic || isCirc) {
      groundItems.push(item)
      if (item.name.includes('Lobby')) hasResidentialLobby = true
    } else if (isService || isWet) {
      serviceItems.push(item)
    } else {
      privateItems.push(item)
    }
  }

  if (isMixedUse && !hasResidentialLobby) {
    groundItems.push({ name: 'Residential Lobby', count: 1, areaM2: 8, zone: 'circulation' })
  }

  remainingItems.push(...serviceItems, ...privateItems)

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
