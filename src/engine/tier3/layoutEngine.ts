import type { Tier1ParsedBrief, Typology, ProgramItem } from '../tier1-types'
import type { ConstraintReport } from '../../domain/building'
import type { DesignConcept } from '../tier2/conceptEngine'
import { generateVerticalChassis, validateConstraintReport } from './vertical-chassis'
import type { VerticalChassis } from './vertical-chassis'

export type Topology = 'rectangle' | 'l-shape' | 'split-wing' | 'courtyard'

export interface MasterChassis {
  topology: Topology
  buildingW: number
  buildingD: number
  stairwell?: { x: number; y: number; w: number; h: number }
  wetZone?: { x: number; w: number }
  rectangle?: { frontD: number; corridorH: number; backD: number; corridorY: number }
  lShape?: { vertW: number; vertH: number; horizD: number; corridorW: number }
  splitWing?: { pavW: number; leftH: number; rightH: number; galleryW: number }
  courtyard?: { wingDepth: number; outerW: number; outerD: number }
  verticalChassis?: VerticalChassis
}

export interface LayoutParameters {
  topologies: Topology[]
  siteWidth: number
  siteDepth: number
  wallThickness: number
  corridorWidth: number
  minRoomDimensions: Record<string, { minWidth: number; minDepth: number }>
  floorCount: number
  floorHeight: number
  maxStructuralSpan?: number
}

export interface PlacedRoom {
  name: string
  x: number
  y: number
  width: number
  height: number
  zone?: 'public' | 'private' | 'service' | 'circulation'
  isWetCore?: boolean
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
  stairCalculations?: { risers: number; treads: number; run: number }
  verticalChassis?: VerticalChassis
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

export interface ExpandedProgramItem {
  name: string
  area: number
  zone?: 'public' | 'private' | 'service' | 'circulation'
  isWetCore?: boolean
}

function expandProgram(program: ProgramItem[]): ExpandedProgramItem[] {
  const items: ExpandedProgramItem[] = []
  for (const p of program) {
    for (let i = 0; i < p.count; i++) {
      const suffix = p.count > 1 ? ` ${i + 1}` : ''
      items.push({ name: p.name + suffix, area: p.areaM2, zone: p.zone, isWetCore: p.isWetCore })
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

// ΓöÇΓöÇ Topology generators ΓöÇΓöÇ

function generateRectangle(program: ProgramItem[], siteW: number, siteD: number, minDims: Record<string, { minWidth: number; minDepth: number }>, chassis?: MasterChassis): FloorPlan {
  const items = expandProgram(program)
  const progArea = totalProgramArea(program)
  const bldgW = chassis ? chassis.buildingW : Math.max(6, Math.min(siteW * 0.85, Math.sqrt(progArea * 1.5)))
  const bldgD = chassis ? chassis.buildingD : Math.max(6, Math.min(siteD * 0.85, progArea / bldgW))

  const vc = chassis?.verticalChassis

  const corridors = items.filter(r => r.zone === 'circulation' || r.name === 'Circulation' || r.name.startsWith('Circulation'))
  const nonCorridors = items.filter(r => !corridors.includes(r))

  const PUBLIC_PREFIXES = ['Reception / Waiting', 'Reception / Lobby', 'Reception', 'Living Room', 'Lounge / Dining', 'Dining Area', 'Sales Floor', 'Retail Floor', 'Dining Area 1', 'Main Hall', 'Open Plan Office']
  let publicItems = nonCorridors.filter(i => i.zone === 'public' || (!i.zone && PUBLIC_PREFIXES.some(p => i.name.startsWith(p))))
  let privateItems = nonCorridors.filter(i => !publicItems.includes(i))

  if (publicItems.length === 0 && privateItems.length > 0) {
    publicItems = [privateItems[0]]
    privateItems = privateItems.slice(1)
  }

  // Clustering: group wet cores together
  publicItems.sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))
  privateItems.sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))

  const corridorH = chassis?.rectangle ? chassis.rectangle.corridorH : Math.max(2, corridors.reduce((s, r) => s + r.area, 0) / bldgW)
  const usedH = corridorH
  const roomTotalArea = nonCorridors.reduce((s, r) => s + r.area, 0)

  let frontD = 3
  let backD = 3

  if (chassis?.rectangle) {
    frontD = chassis.rectangle.frontD
    backD = chassis.rectangle.backD
  } else {
    const publicMinDepth = publicItems.length > 0
      ? Math.max(...publicItems.map(r => dimForRoom(r.name, minDims).minDepth))
      : 3
    const privateMinDepth = privateItems.length > 0
      ? Math.max(...privateItems.map(r => dimForRoom(r.name, minDims).minDepth))
      : 3

    const availDepth = Math.max(0, bldgD - usedH)
    frontD = Math.max(publicMinDepth, availDepth > 0
      ? (roomTotalArea > 0
        ? availDepth * Math.max(0.2, Math.min(publicItems.reduce((s, r) => s + r.area, 0) / roomTotalArea, 0.7))
        : availDepth * (publicItems.length / Math.max(1, nonCorridors.length)))
      : 3)
    backD = Math.max(privateMinDepth, bldgD - frontD - usedH)
  }

  const rooms: PlacedRoom[] = []
  
  // Place core zones from vertical chassis (if available)
  let stairW = 0
  if (vc && vc.cores.length > 0) {
    // Use the first core for stairwell placement
    const firstCore = vc.cores[0]
    const coreX = Math.min(firstCore.x, bldgW - firstCore.width)
    const coreY = Math.min(firstCore.y, bldgD - firstCore.depth)
    rooms.push({ name: 'Stairwell', x: coreX, y: coreY, width: firstCore.width, height: firstCore.depth, zone: 'circulation' })
    stairW = firstCore.width

    // Add lift if the core has one
    if (firstCore.hasLift) {
      const liftX = coreX + firstCore.width + 0.5
      if (liftX + 1.5 <= bldgW) {
        rooms.push({ name: 'Lift Core', x: liftX, y: coreY, width: 1.5, height: firstCore.depth, zone: 'circulation' })
      }
    }

    // Place party walls from chassis
    if (vc.partyWalls.length > 0) {
      for (const pw of vc.partyWalls) {
        if (pw.x > 0 && pw.x < bldgW) {
          rooms.push({
            name: 'Party Wall',
            x: pw.x - 0.1,
            y: 0,
            width: 0.2,
            height: bldgD,
            zone: 'service',
          })
        }
      }
    }

    // Add service shaft rooms
    if (vc.serviceShafts.length > 0) {
      for (const shaft of vc.serviceShafts) {
        if (shaft.x < bldgW && shaft.y < bldgD) {
          rooms.push({
            name: `Service Shaft (${shaft.serviceTypes.join('/')})`,
            x: shaft.x,
            y: shaft.y,
            width: shaft.width,
            height: shaft.depth,
            zone: 'service',
          })
        }
      }
    }
  } else if (chassis?.stairwell) {
    rooms.push({ name: 'Stairwell', x: chassis.stairwell.x, y: chassis.stairwell.y, width: chassis.stairwell.w, height: chassis.stairwell.h, zone: 'circulation' })
    stairW = chassis.stairwell.w
  } else {
    const stairItem = corridors.find(r => r.name === 'Stairwell')
    if (stairItem) {
      const minW = dimForRoom('Stairwell', minDims).minWidth
      stairW = Math.max(minW, stairItem.area / corridorH)
      rooms.push({ name: 'Stairwell', x: 0, y: frontD, width: stairW, height: corridorH, zone: 'circulation' })
    }
  }

  // Helper to cap stretching and place Roof Terrace
  const finalizeBand = (bandRooms: PlacedRoom[], currentX: number, bandY: number, bandD: number, isUpper: boolean) => {
    if (bandRooms.length > 0 && currentX < bldgW) {
      const last = bandRooms[bandRooms.length - 1]
      const requiredW = Math.max(dimForRoom(last.name, minDims).minWidth, (totalProgramArea([{name: last.name, count: 1, areaM2: last.width*last.height}]) || last.width * last.height) / bandD)
      if (chassis && (bldgW - currentX) > requiredW * 0.5) {
        rooms.push({ name: isUpper ? 'Roof Terrace' : 'Verandah', x: currentX, y: bandY, width: bldgW - currentX, height: bandD, zone: 'public' })
      } else {
        last.width += bldgW - currentX
      }
    }
  }

  let x = 0
  // Wet-core stacking lock: prefer vertical chassis wetWalls, then fall back to chassis wetZone
  let wetCoreX: number | undefined = undefined
  if (vc && vc.wetWalls.length > 0) {
    wetCoreX = vc.wetWalls[0].x
  } else if (chassis?.wetZone) {
    wetCoreX = chassis.wetZone.x
  }
  if (wetCoreX !== undefined && publicItems.length > 0 && publicItems[0].isWetCore) {
    x = wetCoreX
  }
  for (const item of publicItems) {
    if (item.name === 'Stairwell') continue // already placed via chassis
    const reqW = Math.max(dimForRoom(item.name, minDims).minWidth, item.area > 0 ? item.area / frontD : dimForRoom(item.name, minDims).minWidth)
    const w = Math.min(reqW, bldgW - x)
    if (w <= 0) break
    const room: PlacedRoom = zbcEnforce({ name: item.name, x, y: 0, width: w, height: frontD, zone: item.zone, isWetCore: item.isWetCore }, minDims)
    room.height = Math.min(room.height, frontD)
    rooms.push(room)
    x += room.width
  }
  const publicPlaced = rooms.filter(r => r.y === 0 && r.name !== 'Stairwell')
  finalizeBand(publicPlaced, x, 0, frontD, !!chassis)

  // Corridor band
  const corridorY = chassis?.rectangle ? chassis.rectangle.corridorY : frontD
  const circX = stairW > 0 ? stairW : 0
  const circW = bldgW - circX
  rooms.push({ name: 'Circulation', x: circX, y: corridorY, width: circW, height: corridorH, zone: 'circulation' })

  const backY = corridorY + corridorH
  x = 0
  if (wetCoreX !== undefined && privateItems.length > 0 && privateItems[0].isWetCore) {
    x = wetCoreX
  }
  for (const item of privateItems) {
    if (item.name === 'Stairwell') continue
    const reqW = Math.max(dimForRoom(item.name, minDims).minWidth, item.area > 0 ? item.area / backD : dimForRoom(item.name, minDims).minWidth)
    const w = Math.min(reqW, bldgW - x)
    if (w <= 0) break
    const room: PlacedRoom = zbcEnforce({ name: item.name, x, y: backY, width: w, height: backD, zone: item.zone, isWetCore: item.isWetCore }, minDims)
    room.height = Math.min(room.height, backD)
    rooms.push(room)
    x += room.width
  }
  const privatePlaced = rooms.filter(r => Math.abs(r.y - backY) < 0.01 && r.name !== 'Stairwell')
  finalizeBand(privatePlaced, x, backY, backD, !!chassis)

  const planW = chassis ? chassis.buildingW : computePlanBounds(rooms).w
  const planD = chassis ? chassis.buildingD : computePlanBounds(rooms).d
  return { id: uid(), name: 'Rectangle ΓÇö Public Front / Corridor / Private Back', topology: 'rectangle', width: planW, height: planD, rooms }
}

function generateLShape(program: ProgramItem[], siteW: number, _siteD: number, minDims: Record<string, { minWidth: number; minDepth: number }>, chassis?: MasterChassis): FloorPlan {
  const items = expandProgram(program)
  const progArea = totalProgramArea(program)

  const bldgW = chassis ? chassis.buildingW : Math.max(6, Math.min(siteW * 0.75, Math.sqrt(progArea) * 0.8))
  const wingW = bldgW

  const midIdx = Math.max(1, Math.ceil(items.length / 2))
  const vertItems = items.slice(0, midIdx).sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))
  const horizItems = items.slice(midIdx).sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))

  const corridorW = chassis?.lShape ? chassis.lShape.corridorW : 2.0
  const rooms: PlacedRoom[] = []

  let stairH = 0
  if (chassis?.stairwell) {
    rooms.push({ name: 'Stairwell', x: chassis.stairwell.x, y: chassis.stairwell.y, width: chassis.stairwell.w, height: chassis.stairwell.h, zone: 'circulation' })
    stairH = chassis.stairwell.h
  } else {
    const stairItem = items.find(r => r.name === 'Stairwell')
    if (stairItem) {
      const minD = dimForRoom('Stairwell', minDims).minDepth
      stairH = Math.max(minD, stairItem.area / corridorW)
      // will be placed at x: vertW, y: 0
    }
  }

  // Vertical wing: rooms stacked on the left
  const vertW = chassis?.lShape ? chassis.lShape.vertW : Math.max(3, wingW * 0.45)
  let y = 0
  for (const item of vertItems) {
    if (item.name === 'Stairwell') continue
    const minD = dimForRoom(item.name, minDims).minDepth
    const reqH = Math.max(minD, item.area / vertW)
    const h = chassis?.lShape ? Math.min(reqH, chassis.lShape.vertH - y) : reqH
    if (h <= 0) break
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: 0, y, width: vertW, height: h, zone: item.zone, isWetCore: item.isWetCore }, minDims)
    room.width = Math.min(room.width, vertW)
    rooms.push(room)
    y += room.height
  }
  
  if (chassis?.lShape && y < chassis.lShape.vertH) {
    rooms.push({ name: 'Roof Terrace', x: 0, y, width: vertW, height: chassis.lShape.vertH - y, zone: 'public' })
  }
  const actualVertH = chassis?.lShape ? chassis.lShape.vertH : Math.max(y, 3)

  // Corridor next to vertical wing
  const circY = chassis?.stairwell && chassis.stairwell.y === 0 ? stairH : 0
  const circH = Math.max(0, chassis?.stairwell ? actualVertH - stairH : actualVertH)
  if (!chassis?.stairwell && stairH > 0) {
    rooms.push({ name: 'Stairwell', x: vertW, y: 0, width: corridorW, height: Math.min(stairH, actualVertH), zone: 'circulation' })
    const circHeight = Math.max(0, actualVertH - stairH)
    if (circHeight > 0) {
      rooms.push({ name: 'Circulation', x: vertW, y: Math.min(stairH, actualVertH), width: corridorW, height: circHeight, zone: 'circulation' })
    }
  } else if (circH > 0) {
    rooms.push({ name: 'Circulation', x: vertW, y: circY, width: corridorW, height: circH, zone: 'circulation' })
  }

  // Horizontal wing: places at the BOTTOM of the vertical wing, extending right
  const horizX = vertW + corridorW
  const horizD = chassis?.lShape ? chassis.lShape.horizD : Math.max(2, actualVertH * 0.4)
  let horizRight = horizX
  for (const item of horizItems) {
    if (item.name === 'Stairwell') continue
    const minW = dimForRoom(item.name, minDims).minWidth
    const reqW = Math.max(minW, item.area / horizD)
    const w = chassis ? Math.min(reqW, chassis.buildingW - horizRight) : reqW
    if (w <= 0) break
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: horizRight, y: actualVertH - horizD, width: w, height: horizD, zone: item.zone, isWetCore: item.isWetCore }, minDims)
    room.height = Math.min(room.height, horizD)
    rooms.push(room)
    horizRight += room.width
  }
  
  if (chassis && horizRight < chassis.buildingW) {
    rooms.push({ name: 'Roof Terrace', x: horizRight, y: actualVertH - horizD, width: chassis.buildingW - horizRight, height: horizD, zone: 'public' })
  }

  // Courtyard in the corner formed by vertical wing and horizontal wing
  const courtyardX = horizX
  const courtyardY = 0
  const courtyardW = Math.max(2, (chassis ? chassis.buildingW : horizRight) - horizX)
  const courtyardH = Math.max(2, actualVertH - horizD)
  if (courtyardW > 2 && courtyardH > 2) {
    rooms.push({ name: 'Courtyard', x: courtyardX, y: courtyardY, width: courtyardW, height: courtyardH })
  }

  const planW = chassis ? chassis.buildingW : computePlanBounds(rooms).w
  const planD = chassis ? chassis.buildingD : computePlanBounds(rooms).d
  return { id: uid(), name: 'L-Shape ΓÇö Vertical Wing + Horizontal Wing + Corner Courtyard', topology: 'l-shape', width: planW, height: planD, rooms }
}

function generateSplitWing(program: ProgramItem[], siteW: number, minDims: Record<string, { minWidth: number; minDepth: number }>, chassis?: MasterChassis): FloorPlan {
  const items = expandProgram(program)
  const progArea = totalProgramArea(program)

  const bldgW = chassis ? chassis.buildingW : Math.max(6, Math.min(siteW * 0.4 * 2 + 2, Math.sqrt(progArea) * 1.0))
  const pavW = chassis?.splitWing ? chassis.splitWing.pavW : Math.max(3, bldgW * 0.4)
  const galleryW = chassis?.splitWing ? chassis.splitWing.galleryW : 2.0

  const midIdx = Math.max(1, Math.ceil(items.length / 2))
  const leftItems = items.slice(0, midIdx).sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))
  const rightItems = items.slice(midIdx).sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))

  const rooms: PlacedRoom[] = []
  
  let stairH = 0
  if (chassis?.stairwell) {
    rooms.push({ name: 'Stairwell', x: chassis.stairwell.x, y: chassis.stairwell.y, width: chassis.stairwell.w, height: chassis.stairwell.h, zone: 'circulation' })
    stairH = chassis.stairwell.h
  } else {
    const stairItem = items.find(r => r.name === 'Stairwell')
    if (stairItem) {
      const minD = dimForRoom('Stairwell', minDims).minDepth
      stairH = Math.max(minD, stairItem.area / galleryW)
    }
  }

  let y = 0
  for (const item of leftItems) {
    if (item.name === 'Stairwell') continue
    const minD = dimForRoom(item.name, minDims).minDepth
    const reqH = Math.max(minD, item.area / pavW)
    const h = chassis?.splitWing ? Math.min(reqH, chassis.splitWing.leftH - y) : reqH
    if (h <= 0) break
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: 0, y, width: pavW, height: h, zone: item.zone, isWetCore: item.isWetCore }, minDims)
    room.width = Math.min(room.width, pavW)
    rooms.push(room)
    y += room.height
  }
  
  if (chassis?.splitWing && y < chassis.splitWing.leftH) {
    rooms.push({ name: 'Roof Terrace', x: 0, y, width: pavW, height: chassis.splitWing.leftH - y, zone: 'public' })
  }
  const leftH = chassis?.splitWing ? chassis.splitWing.leftH : Math.max(y, 3)

  const circY = chassis?.stairwell && chassis.stairwell.y === 0 ? Math.min(stairH, leftH) : 0
  const circH = Math.max(0, chassis?.stairwell ? leftH - stairH : leftH)
  if (!chassis?.stairwell && stairH > 0) {
    rooms.push({ name: 'Stairwell', x: pavW, y: 0, width: galleryW, height: Math.min(stairH, leftH), zone: 'circulation' })
    const galleryH = Math.max(0, leftH - stairH)
    if (galleryH > 0) {
      rooms.push({ name: 'Gallery', x: pavW, y: Math.min(stairH, leftH), width: galleryW, height: galleryH, zone: 'circulation' })
    }
  } else if (circH > 0) {
    rooms.push({ name: 'Gallery', x: pavW, y: circY, width: galleryW, height: circH, zone: 'circulation' })
  }

  const rightX = pavW + galleryW
  y = 0
  for (const item of rightItems) {
    if (item.name === 'Stairwell') continue
    const minD = dimForRoom(item.name, minDims).minDepth
    const reqH = Math.max(minD, item.area / pavW)
    const h = chassis?.splitWing ? Math.min(reqH, chassis.splitWing.rightH - y) : reqH
    if (h <= 0) break
    const room: PlacedRoom = zbcEnforce({ name: item.name, x: rightX, y, width: pavW, height: h, zone: item.zone, isWetCore: item.isWetCore }, minDims)
    room.width = Math.min(room.width, pavW)
    rooms.push(room)
    y += room.height
  }
  
  if (chassis?.splitWing && y < chassis.splitWing.rightH) {
    rooms.push({ name: 'Roof Terrace', x: rightX, y, width: pavW, height: chassis.splitWing.rightH - y, zone: 'public' })
  }

  const planW = chassis ? chassis.buildingW : computePlanBounds(rooms).w
  const planD = chassis ? chassis.buildingD : computePlanBounds(rooms).d
  return { id: uid(), name: 'Split-Wing ΓÇö Two Pavilions + Central Gallery', topology: 'split-wing', width: planW, height: planD, rooms }
}

function generateCourtyard(program: ProgramItem[], siteW: number, siteD: number, minDims: Record<string, { minWidth: number; minDepth: number }>, chassis?: MasterChassis): FloorPlan {
  const items = expandProgram(program)
  const count = items.length
  if (count === 0) {
    const planW = chassis ? chassis.buildingW : 10
    const planD = chassis ? chassis.buildingD : 10
    return { id: uid(), name: 'Courtyard ΓÇö Rooms Around Central Space', topology: 'courtyard', width: planW, height: planD, rooms: [] }
  }

  const gutter = 0.3

  // For each item, compute the ZBC-enforced minimum dimensions once
  interface SizedRoom {
    name: string
    area: number
    minW: number
    minD: number
    zone?: 'public' | 'private' | 'service' | 'circulation'
    isWetCore?: boolean
  }
  const sized: SizedRoom[] = items.map(item => {
    const d = dimForRoom(item.name, minDims)
    return { name: item.name, area: item.area, minW: d.minWidth, minD: d.minDepth, zone: item.zone, isWetCore: item.isWetCore }
  })

  // Choose wingDepth so that NO room's minDepth or minWidth exceeds it.
  // This guarantees zbcEnforce never changes planned dimensions.
  let maxDim = 4.0
  for (const r of sized) {
    if (r.name !== 'Stairwell') {
      maxDim = Math.max(maxDim, r.minW, r.minD)
    }
  }
  const wingDepth = chassis?.courtyard ? chassis.courtyard.wingDepth : maxDim

  // Distribute rooms evenly across wings (handle <4 by using fewer wings)
  function distributeEven(arr: SizedRoom[], wings: number): SizedRoom[][] {
    const result: SizedRoom[][] = Array.from({ length: wings }, () => [])
    for (let i = 0; i < arr.length; i++) {
      result[i % wings].push(arr[i])
    }
    // Sort each wing by wet-core to cluster them
    for (const wing of result) {
      wing.sort((a, b) => (a.isWetCore === b.isWetCore ? 0 : a.isWetCore ? -1 : 1))
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

  const outerW = chassis?.courtyard ? chassis.courtyard.outerW : Math.min(Math.max(siteW * 0.9, reqW), Math.max(siteW, reqW))
  const outerD = chassis?.courtyard ? chassis.courtyard.outerD : Math.min(Math.max(siteD * 0.9, reqD), Math.max(siteD, reqD))

  const rooms: PlacedRoom[] = []
  
  if (chassis?.stairwell) {
    rooms.push({ name: 'Stairwell', x: chassis.stairwell.x, y: chassis.stairwell.y, width: chassis.stairwell.w, height: chassis.stairwell.h, zone: 'circulation' })
  } else {
    const stairItem = items.find(r => r.name === 'Stairwell')
    if (stairItem) {
      rooms.push({ name: 'Stairwell', x: 0, y: 0, width: wingDepth, height: wingDepth, zone: 'circulation' })
      // For Courtyard, we just reserve the top-left corner. We don't shrink the rest of the wing for simplicity of this fallback.
    }
  }

  if (numWings === 1) {
    // Single row ΓÇö place all rooms side-by-side
    let x = 0
    for (const r of wings[0]) {
      const w = hSize(r)
      rooms.push({ name: r.name, x, y: 0, width: w, height: wingDepth, zone: r.zone, isWetCore: r.isWetCore })
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
      rooms.push({ name: r.name, x, y: 0, width: rw, height: wingDepth, zone: r.zone, isWetCore: r.isWetCore })
      x += rw + gutter
    }
    x = 0
    for (const r of bottom) {
      const rw = hSize(r)
      rooms.push({ name: r.name, x, y: outerD - wingDepth, width: rw, height: wingDepth, zone: r.zone, isWetCore: r.isWetCore })
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
      rooms.push({ name: r.name, x, y: 0, width: w, height: wingDepth, zone: r.zone, isWetCore: r.isWetCore })
      x += w + gutter
    }

    // East wing (right, rooms stacked)
    const eastStartY = wings.length >= 4 ? (outerD - availVert) / 2 : 0
    let y = eastStartY
    if (wings[1]) {
      for (const r of wings[1]) {
        const d = vSize(r)
        rooms.push({ name: r.name, x: outerW - wingDepth, y, width: wingDepth, height: d, zone: r.zone, isWetCore: r.isWetCore })
        y += d + gutter
      }
    }

    // South wing (bottom, rooms side-by-side)
    x = northStartX
    for (const r of wings[2]) {
      const w = hSize(r)
      rooms.push({ name: r.name, x, y: outerD - wingDepth, width: w, height: wingDepth, zone: r.zone, isWetCore: r.isWetCore })
      x += w + gutter
    }

    // West wing (left, rooms stacked)
    y = eastStartY
    if (wings[3]) {
      for (const r of wings[3]) {
        const d = vSize(r)
        rooms.push({ name: r.name, x: 0, y, width: wingDepth, height: d, zone: r.zone, isWetCore: r.isWetCore })
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

  const planW = chassis ? chassis.buildingW : computePlanBounds(rooms).w
  const planD = chassis ? chassis.buildingD : computePlanBounds(rooms).d
  return { id: uid(), name: 'Courtyard ΓÇö Rooms Around Central Space', topology: 'courtyard', width: planW, height: planD, rooms }
}

function floorPlanWithMeta(
  plan: Omit<FloorPlan, 'floorIndex' | 'totalFloors'>,
  floorIndex: number,
  totalFloors: number,
  stairCalculations?: { risers: number; treads: number; run: number }
): FloorPlan {
  return { ...plan, floorIndex, totalFloors, stairCalculations }
}

const PUBLIC_PREFIXES = ['Reception / Waiting', 'Reception / Lobby', 'Reception', 'Living Room', 'Lounge / Dining', 'Dining Area', 'Sales Floor', 'Retail Floor', 'Dining Area 1', 'Main Hall', 'Open Plan Office', 'Kitchen', 'Restaurant', 'Commercial Kitchen', 'Consultation Room', 'Treatment Room', 'Staff Room', 'Meeting Room', 'Ground Floor Shop']

function isPublicItem(name: string): boolean {
  return PUBLIC_PREFIXES.some((p) => name.startsWith(p))
}

function partitionProgram(
  program: ProgramItem[],
  floorCount: number,
  typologyId?: string,
): { groundFloor: ProgramItem[]; upperFloors: ProgramItem[][] } {
  if (floorCount <= 1) {
    return { groundFloor: [...program], upperFloors: [] }
  }

  const groundItems: ProgramItem[] = []
  const remainingItems: ProgramItem[] = []

  // Detect mixed-use: inject Residential Lobby for fire-separated egress
  const isMixedUse = typologyId === 'mixed-use'
  let hasResidentialLobby = false

  for (const item of program) {
    if (
      isPublicItem(item.name) || 
      item.name === 'Circulation' || 
      item.name.startsWith('Circulation') ||
      item.name.includes('Lobby') ||
      item.name.includes('Stair')
    ) {
      groundItems.push(item)
      if (item.name.includes('Lobby')) hasResidentialLobby = true
    } else {
      remainingItems.push(item)
    }
  }

  if (isMixedUse && !hasResidentialLobby) {
    groundItems.push({ name: 'Residential Lobby', count: 1, areaM2: 8, zone: 'circulation' })
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

function computeMasterChassis(
  topology: Topology,
  baseProgram: ProgramItem[],
  siteWidth: number,
  siteDepth: number,
  minRoomDimensions: Record<string, { minWidth: number; minDepth: number }>,
  verticalChassis?: VerticalChassis,
): MasterChassis {
  let basePlan: FloorPlan
  switch (topology) {
    case 'rectangle': basePlan = generateRectangle(baseProgram, siteWidth, siteDepth, minRoomDimensions); break;
    case 'l-shape': basePlan = generateLShape(baseProgram, siteWidth, siteDepth, minRoomDimensions); break;
    case 'split-wing': basePlan = generateSplitWing(baseProgram, siteWidth, minRoomDimensions); break;
    case 'courtyard': basePlan = generateCourtyard(baseProgram, siteWidth, siteDepth, minRoomDimensions); break;
  }

  const stair = basePlan.rooms.find(r => r.name === 'Stairwell')
  const chassis: MasterChassis = {
    topology,
    buildingW: basePlan.width,
    buildingD: basePlan.height,
  }
  if (stair) {
    chassis.stairwell = { x: stair.x, y: stair.y, w: stair.width, h: stair.height }
  }

  const wetRooms = basePlan.rooms.filter(r => r.isWetCore).sort((a, b) => a.x - b.x)
  if (wetRooms.length > 0) {
    chassis.wetZone = { x: wetRooms[0].x, w: wetRooms[0].width }
  }

  if (topology === 'rectangle') {
    const circ = basePlan.rooms.find(r => r.name === 'Circulation')
    chassis.rectangle = {
      frontD: circ?.y ?? 3.0,
      corridorH: circ?.height ?? 2.0,
      backD: Math.max(3.0, basePlan.height - ((circ?.y ?? 0) + (circ?.height ?? 0))),
      corridorY: circ?.y ?? 3.0
    }
  } else if (topology === 'l-shape') {
    const circ = basePlan.rooms.find(r => r.name === 'Circulation')
    const horizR = basePlan.rooms.find(r => r.y > 0 && r.x > ((circ?.x ?? 0) + (circ?.width ?? 0)) && r.name !== 'Courtyard' && r.name !== 'Roof Terrace')
    chassis.lShape = {
      vertW: circ?.x ?? 3.0,
      vertH: circ?.height ?? basePlan.height,
      horizD: horizR?.height ?? 3.0,
      corridorW: circ?.width ?? 2.0
    }
  } else if (topology === 'split-wing') {
    const gal = basePlan.rooms.find(r => r.name === 'Gallery')
    chassis.splitWing = {
      pavW: gal?.x ?? 3.0,
      leftH: gal?.height ?? basePlan.height,
      rightH: gal?.height ?? basePlan.height,
      galleryW: gal?.width ?? 2.0
    }
  } else if (topology === 'courtyard') {
    const room = basePlan.rooms.find(r => r.name !== 'Stairwell' && r.name !== 'Courtyard' && r.name !== 'Roof Terrace')
    chassis.courtyard = {
      wingDepth: room?.height ?? 4.0,
      outerW: basePlan.width,
      outerD: basePlan.height
    }
  }

  if (verticalChassis) {
    chassis.verticalChassis = verticalChassis
  }

  return chassis
}

function generateDuplex(
  program: ProgramItem[],
  siteW: number,
  siteD: number,
  minDims: Record<string, { minWidth: number; minDepth: number }>,
  topology: Topology,
  chassis?: MasterChassis
): FloorPlan {
  // 1. Halve the program (count only ΓÇö area stays per-unit)
  const halfProgram = program.map(p => ({
    ...p,
    count: Math.max(1, Math.ceil(p.count / 2)),
  }))

  // 2. Generate Unit A on half the site; snap party-wall axis to 50 mm
  const halfSiteW = Math.round((siteW / 2) * 20) / 20
  
  // If chassis is provided, we must also halve the chassis width for the internal generator
  let halfChassis: MasterChassis | undefined = undefined
  if (chassis) {
    halfChassis = { ...chassis, buildingW: chassis.buildingW / 2 }
    if (chassis.rectangle) halfChassis.rectangle = { ...chassis.rectangle }
    if (chassis.lShape) halfChassis.lShape = { ...chassis.lShape }
    if (chassis.splitWing) halfChassis.splitWing = { ...chassis.splitWing }
    if (chassis.courtyard) halfChassis.courtyard = { ...chassis.courtyard, outerW: chassis.courtyard.outerW / 2 }
    if (chassis.stairwell) halfChassis.stairwell = { ...chassis.stairwell }
    if (chassis.wetZone) halfChassis.wetZone = { ...chassis.wetZone }
  }

  let unitA: FloorPlan
  switch (topology) {
    case 'rectangle': unitA = generateRectangle(halfProgram, halfSiteW, siteD, minDims, halfChassis); break;
    case 'l-shape': unitA = generateLShape(halfProgram, halfSiteW, siteD, minDims, halfChassis); break;
    case 'split-wing': unitA = generateSplitWing(halfProgram, halfSiteW, minDims, halfChassis); break;
    case 'courtyard': unitA = generateCourtyard(halfProgram, halfSiteW, siteD, minDims, halfChassis); break;
    default: unitA = generateRectangle(halfProgram, halfSiteW, siteD, minDims, halfChassis); break;
  }

  // 3. Mirror Unit A to create Unit B
  const roomsA = unitA.rooms
  const buildingWidth = chassis ? chassis.buildingW : unitA.width * 2
  const roomsB = roomsA.map(r => ({
    ...r,
    // mirror across the center (which is buildingWidth / 2)
    x: buildingWidth - (r.x + r.width)
  }))

  // 4. Inject Party Wall — prefer vertical chassis info, fallback to computed axis
  const vc = chassis?.verticalChassis
  let partyX: number
  if (vc && vc.partyWalls.length > 0) {
    partyX = vc.partyWalls[0].x
  } else {
    partyX = halfSiteW * 2 / 2
  }
  const partyWall: PlacedRoom = {
    name: 'Party Wall',
    x: partyX - 0.1,
    y: 0,
    width: 0.2,
    height: unitA.height,
    zone: 'service'
  }

  return {
    ...unitA,
    name: `Duplex (${unitA.name})`,
    width: buildingWidth,
    rooms: [...roomsA, partyWall, ...roomsB]
  }
}

/**
 * Generate floor plans for a multi-storey building.
 * Ground floor gets public/shared rooms, upper floors get private/repeatable rooms.
 * Returns one FloorPlan[] per floor, with shared stair positions for alignment.
 */
export function generateMultiFloorPlans(
  params: LayoutParameters,
  brief: Tier1ParsedBrief,
): { plans: FloorPlan[][]; constraintReport: ConstraintReport } {
  const { topologies, siteWidth, siteDepth, minRoomDimensions, floorCount } = params
  let program = brief.program.length > 0 ? brief.program : (brief.typology?.defaultProgram ?? [])

  if (program.length === 0) {
    program = [{ name: 'Default Room', count: Math.max(1, floorCount), areaM2: 20 }]
  }

  const { groundFloor, upperFloors } = partitionProgram(program, floorCount, brief.typology?.id)

  const perFloorPrograms = [groundFloor, ...upperFloors]

  let stairCalculations: { risers: number; treads: number; run: number } | undefined = undefined
  if (floorCount > 1) {
    const risers = Math.ceil(params.floorHeight / 0.17)
    const treads = risers - 1
    const runLength = treads * 0.28
    stairCalculations = { risers, treads, run: runLength }
    
    const uShapeDepth = (runLength / 2) + 1.2
    const stairArea = Math.ceil(2.5 * Math.max(uShapeDepth, 2.5))
    const stairProgramItem: ProgramItem = { name: 'Stairwell', count: 1, areaM2: stairArea, zone: 'circulation', isWetCore: false }
    for (const floorProg of perFloorPrograms) {
      floorProg.push(stairProgramItem)
    }
  }

  // Generate vertical chassis once for the entire building
  const verticalChassis = generateVerticalChassis(params, brief)

  const result: FloorPlan[][] = []

  // Pre-compute master chassis for each topology based on the ground floor (or largest floor)
  const masterChassisMap: Record<string, MasterChassis> = {}
  if (floorCount > 1) {
    const baseProgram = perFloorPrograms[0].length > 0 ? perFloorPrograms[0] : [{ name: 'Default Room', count: 1, areaM2: 20 }]
    for (const topology of topologies) {
      try {
        masterChassisMap[topology] = computeMasterChassis(topology, baseProgram, siteWidth, siteDepth, minRoomDimensions, verticalChassis)
      } catch {
        // ignore fallback to calculation inside
      }
    }
  }

  for (let fi = 0; fi < perFloorPrograms.length; fi++) {
    let floorProgram = perFloorPrograms[fi]
    if (floorProgram.length === 0) {
      floorProgram = [{ name: 'Default Room', count: 1, areaM2: 20 }]
    }

    const floorPlans: FloorPlan[] = []

    for (const topology of topologies) {
      let plan: FloorPlan
      const chassis = masterChassisMap[topology]
      const isDuplex = brief.typology?.id === 'duplex'
      try {
        if (isDuplex) {
          plan = generateDuplex(floorProgram, siteWidth, siteDepth, minRoomDimensions, topology, chassis)
        } else {
          switch (topology) {
            case 'rectangle':
              plan = generateRectangle(floorProgram, siteWidth, siteDepth, minRoomDimensions, chassis)
              break
            case 'l-shape':
              plan = generateLShape(floorProgram, siteWidth, siteDepth, minRoomDimensions, chassis)
              break
            case 'split-wing':
              plan = generateSplitWing(floorProgram, siteWidth, minRoomDimensions, chassis)
              break
            case 'courtyard':
              plan = generateCourtyard(floorProgram, siteWidth, siteDepth, minRoomDimensions, chassis)
              break
            default:
              plan = generateRectangle(floorProgram, siteWidth, siteDepth, minRoomDimensions, chassis)
              break
          }
        }
        if (hasOverlaps(plan!.rooms)) {
          plan = generateRectangle(floorProgram, Math.max(siteWidth, 30), Math.max(siteDepth, 30), minRoomDimensions)
          plan = { ...plan, topology, name: `Fallback Rectangle (${topology} degrade)` }
        }
        // Attach vertical chassis to the plan
        plan.verticalChassis = verticalChassis
      } catch {
        plan = generateRectangle(floorProgram, Math.max(siteWidth, 30), Math.max(siteDepth, 30), minRoomDimensions)
        plan = { ...plan, topology, name: `Fallback Rectangle (${topology} degrade)` }
        plan.verticalChassis = verticalChassis
      }
      floorPlans.push(floorPlanWithMeta(plan, fi, floorCount, stairCalculations))
    }

    result.push(floorPlans)
  }

  // Use real validation instead of hardcoded values
  const validation = validateConstraintReport(verticalChassis, result)

  const constraintReport: ConstraintReport = {
    timestamp: new Date().toISOString(),
    structuralAlignmentPass: validation.structuralAlignmentPass,
    shaftContinuityPass: validation.shaftContinuityPass,
    circulationEgressPass: validation.circulationEgressPass,
    partyWallContinuous: validation.partyWallContinuous,
    warnings: validation.warnings,
  }

  return { plans: result, constraintReport }
}

// ΓöÇΓöÇ Public API ΓöÇΓöÇ

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
    maxStructuralSpan: brief.typology?.maxStructuralSpan ?? 6.0,
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
