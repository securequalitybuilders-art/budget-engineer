import { getMinimumDimensions, classifyRoom } from '../../geometry/plan-intelligence'
import type { NonResVariationProfile } from '../variation-engine'
import type { ApartmentUnit, ApartmentFloorModel, CorePlacementType, CorePlacement, UnitTemplateType } from '../apartment-units'
import { buildApartmentFloorModel, selectCorePlacement, suggestUnitTemplate, getUnitTemplate } from '../apartment-units'

const uid = () => Math.random().toString(36).slice(2, 10)

function placeRoomsInBand(
  items: { name: string; ratio: number }[],
  bandY: number,
  bandDepth: number,
  width: number,
  maxRows = 1,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  let x = 0
  let row = 0
  let yOffset = bandY
  const ratioSum = items.reduce((s, r) => s + r.ratio, 0) || 1

  for (let i = 0; i < items.length; i++) {
    const r = items[i]
    const remainingW = Math.max(0, width - x)
    const dims = getMinimumDimensions(r.name)

    const ratioW = width * (r.ratio / ratioSum)
    const areaW = bandDepth > 0.01 ? (dims.minWidth * dims.minDepth) / bandDepth : dims.minWidth
    const desiredW = Math.max(ratioW, areaW, dims.minWidth, 1.5)
    let w = Math.min(desiredW, remainingW)

    if (w <= 0 && row + 1 < maxRows) {
      row++
      x = 0
      yOffset = bandY + row * bandDepth
      w = Math.min(desiredW, width)
    }

    if (w <= 0) w = Math.max(0.5, remainingW)

    rooms.push({
      id: uid(),
      name: r.name,
      x: Number(x.toFixed(2)),
      y: Number(yOffset.toFixed(2)),
      width: Number(w.toFixed(2)),
      height: Number(bandDepth.toFixed(2)),
    })
    x += w
  }

  return rooms
}

export function generateClinicLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  variation?: NonResVariationProfile,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const v = variation || { frontRatio: 0.30, corridorRatio: 0.12, rearRatio: 0.58, useMultiRow: false, clusterWet: true, circulationType: 'centre' as const }

  const receptionItems = program.filter(r => r.name.includes('Reception') || r.name.includes('Waiting'))
  const consultationItems = program.filter(r => r.name.includes('Consultation'))
  const treatmentItems = program.filter(r => r.name.includes('Treatment') || r.name.includes('Nurse') || r.name.includes('Pharmacy') || r.name.includes('Store'))
  const wcItems = program.filter(r => r.name.includes('WC') || r.name.includes('Toilet'))
  const officeItems = program.filter(r => (r.name.includes('Office') || r.name.includes('Staff') || r.name.includes('Admin')) && !r.name.includes('WC') && !r.name.includes('Toilet'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const frontDepth = height * v.frontRatio
  const corridorDepth = Math.max(1.5, height * v.corridorRatio)
  const corridorY = frontDepth
  const treatmentDepth = height - frontDepth - corridorDepth

  // Front band: reception + waiting (public-facing)
  if (receptionItems.length > 0) {
    rooms.push(...placeRoomsInBand(receptionItems, 0, frontDepth, width))
  }

  // Circulation corridor with privacy buffer
  if (circItems.length > 0) {
    rooms.push(...placeRoomsInBand(circItems, corridorY, corridorDepth, width))
  } else {
    rooms.push({ id: uid(), name: 'Clinic Corridor', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Rear band: consultations + treatment + admin, grouped by privacy
  const consultRear = [...consultationItems]
  const treatRear = [...treatmentItems]
  const adminRear = [...officeItems]
  const wcRear = [...wcItems]

  const maxRearRows = v.useMultiRow && (consultRear.length + treatRear.length) > 4 ? 2 : 1
  const rearBandH = treatmentDepth / maxRearRows

  // Sort rear items: consultation first (patient-facing), then treatment, then admin, then WC
  const sortedRear = [...consultRear, ...treatRear, ...adminRear, ...wcRear]
  if (sortedRear.length > 0) {
    rooms.push(...placeRoomsInBand(sortedRear, corridorY + corridorDepth, rearBandH, width, maxRearRows))
  }

  return rooms
}

export function generateSchoolLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  variation?: NonResVariationProfile,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const v = variation || { frontRatio: 0.35, corridorRatio: 0.10, rearRatio: 0.55, useMultiRow: false, clusterWet: true, circulationType: 'centre' as const }

  const classroomItems = program.filter(r => r.name.includes('Classroom') || r.name.includes('Learning'))
  const adminItems = program.filter(r => r.name.includes('Office') || r.name.includes('Staff') || r.name.includes('Head') || r.name.includes('Principal'))
  const ablutionItems = program.filter(r => r.name.includes('Toilet') || r.name.includes('Ablution') || r.name.includes('WC'))
  const storeItems = program.filter(r => r.name.includes('Store'))
  const hallItems = program.filter(r => r.name.includes('Hall') || r.name.includes('Assembly') || r.name.includes('Reception'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  // Classrooms in front band (large rooms with daylight access)
  const classroomDepth = height * v.frontRatio
  const corridorDepth = Math.max(1.5, height * v.corridorRatio)
  const corridorY = classroomDepth
  const rearDepth = height - classroomDepth - corridorDepth

  if (classroomItems.length > 0) {
    const classRows = v.useMultiRow && classroomItems.length > 3 ? 2 : 1
    const classH = classroomDepth / classRows
    rooms.push(...placeRoomsInBand(classroomItems, 0, classH, width, classRows))
  }

  // Circulation spine
  if (circItems.length > 0) {
    rooms.push(...placeRoomsInBand(circItems, corridorY, corridorDepth, width))
  } else {
    rooms.push({ id: uid(), name: 'School Corridor', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Rear band: hall + admin + ablution + store in sequence
  const hallDepth = hallItems.length > 0 ? rearDepth * 0.40 : 0
  const adminDepth = rearDepth - hallDepth

  if (hallItems.length > 0) {
    rooms.push(...placeRoomsInBand(hallItems, corridorY + corridorDepth, hallDepth, width))
  }

  const rearSupport = [...adminItems, ...ablutionItems, ...storeItems]
  if (rearSupport.length > 0) {
    const yStart = corridorY + corridorDepth + hallDepth
    const supportH = adminDepth > 0 ? adminDepth : rearDepth
    rooms.push(...placeRoomsInBand(rearSupport, yStart, supportH, width))
  }

  return rooms
}

export function generateRetailLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const salesItems = program.filter(r => r.name.includes('Sales') || r.name.includes('Retail') || r.name.includes('Shop'))
  const stockItems = program.filter(r => r.name.includes('Stock') || r.name.includes('Store') || r.name.includes('Storage'))
  const officeItems = program.filter(r => r.name.includes('Office') || r.name.includes('Staff'))
  const wcItems = program.filter(r => r.name.includes('WC') || r.name.includes('Toilet'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const salesDepth = height * 0.50
  const serviceDepth = height - salesDepth

  if (salesItems.length > 0) {
    rooms.push(...placeRoomsInBand(salesItems, 0, salesDepth, width))
  }

  const serviceItems = [...stockItems, ...officeItems, ...wcItems, ...circItems]
  if (serviceItems.length > 0) {
    rooms.push(...placeRoomsInBand(serviceItems, salesDepth, serviceDepth, width))
  }

  return rooms
}

// ── Entrance separation types ──────────────────────────────────

export type EntranceClass = 'retail-public' | 'residential-private' | 'service-boh'

export interface EntranceZone {
  id: string
  class: EntranceClass
  label: string
  x: number
  y: number
  width: number
  height: number
}

export function generateMixedUseLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  variation?: NonResVariationProfile,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const v = variation || { frontRatio: 0.45, corridorRatio: 0.10, rearRatio: 0.45, useMultiRow: false, clusterWet: true, circulationType: 'centre' as const }

  const retailItems = program.filter(r => r.name.includes('Shop') || r.name.includes('Retail') || r.name.includes('Sales') || r.name.includes('Retail Space'))
  const residentialItems = program.filter(r => r.name.includes('Apartment') || r.name.includes('Upper') || r.name.includes('Living') || r.name.includes('Kitchen') || r.name.includes('Bedroom'))
  const lobbyItems = program.filter(r => r.name.includes('Lobby') || r.name.includes('Stair') || r.name.includes('Core'))
  const storeItems = program.filter(r => r.name.includes('Store') || r.name.includes('Storage') || r.name.includes('Bin'))
  const retailDepth = height * v.frontRatio
  const corridorDepth = Math.max(2.5, height * v.corridorRatio)
  const corridorY = retailDepth
  const residentialDepth = height - retailDepth - corridorDepth

  // ── Entrance zones (explicit planning objects) ──

  const entranceZones: EntranceZone[] = [
    {
      id: uid(),
      class: 'retail-public',
      label: 'Retail / Public Entrance',
      x: 0,
      y: 0,
      width: Math.min(retailDepth, 3.5),
      height: Math.min(retailDepth, 3.5),
    },
    {
      id: uid(),
      class: 'residential-private',
      label: 'Residential Lobby Entrance',
      x: width - Math.min(retailDepth * 0.8, 3.0),
      y: 0,
      width: Math.min(retailDepth * 0.8, 3.0),
      height: Math.min(retailDepth * 0.8, 3.0),
    },
    {
      id: uid(),
      class: 'service-boh',
      label: 'Service / Back-of-House Entrance',
      x: width - 2.5,
      y: retailDepth + corridorDepth + residentialDepth - 2.5,
      width: 2.5,
      height: 2.5,
    },
  ]

  // Place entrance markers
  for (const ez of entranceZones) {
    rooms.push({
      id: ez.id,
      name: ez.label,
      x: Number(ez.x.toFixed(2)),
      y: Number(ez.y.toFixed(2)),
      width: Number(ez.width.toFixed(2)),
      height: Number(ez.height.toFixed(2)),
    })
  }

  // Retail at front (street-facing) — between public entrance and residential lobby
  if (retailItems.length > 0) {
    const retailX = entranceZones[0].width + 0.5
    const retailW = width - retailX - entranceZones[1].width - 0.5
    retailItems.forEach((item, i) => {
      const itemW = retailItems.length > 1 ? retailW / retailItems.length : retailW
      rooms.push({
        id: uid(),
        name: item.name,
        x: Number((retailX + i * itemW).toFixed(2)),
        y: Number(0.5.toFixed(2)),
        width: Number(Math.max(itemW - 0.3, 2.0).toFixed(2)),
        height: Number((retailDepth - 1.0).toFixed(2)),
      })
    })
  }

  // Separated service corridor between retail and residential (no retail access)
  const serviceCorridor = {
    id: uid(),
    name: 'Service Corridor',
    x: 0,
    y: Number(corridorY.toFixed(2)),
    width: Number((width - entranceZones[2].width).toFixed(2)),
    height: Number(corridorDepth.toFixed(2)),
  }
  rooms.push(serviceCorridor)

  // Residential lobby zone — separate from retail, accessed from side entrance
  if (lobbyItems.length > 0) {
    const lobbyX = width * 0.5
    const lobbyW = width - lobbyX - entranceZones[2].width
    const lobbyRooms = lobbyItems.map((item, i) => ({
      id: uid(),
      name: item.name,
      x: Number((lobbyX + i * (lobbyW / lobbyItems.length)).toFixed(2)),
      y: Number(corridorY.toFixed(2)),
      width: Number(Math.max((lobbyW / lobbyItems.length) - 0.3, 2.0).toFixed(2)),
      height: Number(corridorDepth.toFixed(2)),
    }))
    rooms.push(...lobbyRooms)
  } else {
    rooms.push({
      id: uid(),
      name: 'Residential Lobby',
      x: Number((width * 0.5).toFixed(2)),
      y: Number(corridorY.toFixed(2)),
      width: Number((width * 0.5).toFixed(2)),
      height: Number(corridorDepth.toFixed(2)),
    })
  }

  // Residential at rear — only accessible via residential lobby, not through retail
  if (residentialItems.length > 0) {
    const resX = width * 0.3
    const resW = width - resX
    const resRooms = residentialItems.map((item, i) => {
      const itemW = residentialItems.length > 1 ? resW / residentialItems.length : resW
      return {
        id: uid(),
        name: item.name,
        x: Number((resX + i * itemW).toFixed(2)),
        y: Number((corridorY + corridorDepth).toFixed(2)),
        width: Number(Math.max(itemW - 0.3, 2.0).toFixed(2)),
        height: Number((residentialDepth - entranceZones[2].height).toFixed(2)),
      }
    })
    rooms.push(...resRooms)
  }

  // Store/service at rear service corner (adjacent to service entrance)
  if (storeItems.length > 0) {
    const storeX = width - entranceZones[2].width - 4.0
    const storeRooms = storeItems.map((item, i) => ({
      id: uid(),
      name: item.name,
      x: Number((storeX + i * 2.0).toFixed(2)),
      y: Number((corridorY + corridorDepth).toFixed(2)),
      width: Number(2.0.toFixed(2)),
      height: Number(Math.min(2.0, residentialDepth * 0.3).toFixed(2)),
    }))
    rooms.push(...storeRooms)
  }

  return rooms
}

// ── Entrance separation validation ────────────────────────────

export interface EntranceSeparationResult {
  valid: boolean
  retailPublicRoute: string[]
  residentialPrivateRoute: string[]
  serviceRoute: string[]
  emergencyRoute: string[]
  conflicts: string[]
  repairs: string[]
}

export function validateEntranceSeparation(rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[]): EntranceSeparationResult {
  const conflicts: string[] = []
  const repairs: string[] = []

  const retailEntrance = rooms.find(r => r.name.includes('Retail / Public Entrance'))
  const residentialEntrance = rooms.find(r => r.name.includes('Residential Lobby Entrance'))
  const serviceEntrance = rooms.find(r => r.name.includes('Service / Back-of-House Entrance'))
  const residentialLobby = rooms.find(r => r.name === 'Residential Lobby')
  const serviceCorridor = rooms.find(r => r.name === 'Service Corridor')
  const retailSpaces = rooms.filter(r => r.name.includes('Retail Space'))

  // Check entrances exist
  if (!retailEntrance) {
    repairs.push('Missing retail/public entrance — add retail entrance at front')
  }
  if (!residentialEntrance) {
    repairs.push('Missing residential/private entrance — add residential entrance at side')
  }
  if (!serviceEntrance) {
    repairs.push('Missing service entrance — add BOH entrance at rear')
  }

  // Check retail and residential lobbies are separate
  if (retailEntrance && residentialEntrance) {
    const overlapX = retailEntrance.x + retailEntrance.width > residentialEntrance.x &&
      residentialEntrance.x + residentialEntrance.width > retailEntrance.x
    if (overlapX) {
      conflicts.push('Retail entrance overlaps with residential entrance — must maintain separate street frontage')
    }
  }

  // Check residential lobby is not on retail path
  if (residentialLobby && retailEntrance) {
    const resToRetail = residentialLobby.x < retailEntrance.x + retailEntrance.width + 1.0
    if (resToRetail) {
      conflicts.push('Residential lobby is too close to retail entrance — residential access should use separate side entrance')
      repairs.push('Shift residential lobby to the opposite side from retail entrance')
    }
  }

  // Check service corridor is separated from residential lobby
  if (serviceCorridor && residentialLobby) {
    const sharedCorridor = serviceCorridor.x < residentialLobby.x + residentialLobby.width &&
      residentialLobby.x < serviceCorridor.x + serviceCorridor.width
    if (sharedCorridor) {
      conflicts.push('Service corridor shares space with residential lobby — service and residential routes must be separate')
    }
  }

  // Check retail does not wrap around residential entrance
  if (retailSpaces.length > 0 && residentialEntrance) {
    const retailWrapping = retailSpaces.some(r =>
      r.x + r.width > residentialEntrance.x - 0.5 && r.y < residentialEntrance.y + residentialEntrance.height,
    )
    if (retailWrapping) {
      conflicts.push('Retail spaces wrap around residential entrance — residential access must be independent of retail circulation')
    }
  }

  // Build route arrays
  const retailRoute = retailEntrance ? [retailEntrance.id] : []
  const residentialRoute = residentialEntrance ? [residentialEntrance.id] : []
  const serviceRoute = serviceEntrance ? [serviceEntrance.id] : []
  const emergencyRoute = residentialLobby ? [residentialLobby.id] : []

  return {
    valid: conflicts.length === 0,
    retailPublicRoute: retailRoute,
    residentialPrivateRoute: residentialRoute,
    serviceRoute,
    emergencyRoute,
    conflicts,
    repairs,
  }
}

export function generateWarehouseLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  variation?: NonResVariationProfile,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const v = variation || { frontRatio: 0.65, corridorRatio: 0.05, rearRatio: 0.30, useMultiRow: false, clusterWet: true, circulationType: 'centre' as const }

  const warehouseItems = program.filter(r => r.name.includes('Warehouse') || r.name.includes('Workshop') || r.name.includes('Manufacturing'))
  const adminItems = program.filter(r => r.name.includes('Office') || r.name.includes('Admin') || r.name.includes('Staff'))
  const loadingItems = program.filter(r => r.name.includes('Loading') || r.name.includes('Bay') || r.name.includes('Goods'))
  const wcItems = program.filter(r => r.name.includes('WC') || r.name.includes('Toilet'))

  const warehouseDepth = height * v.frontRatio
  const adminDepth = height - warehouseDepth

  // Large span warehouse zone (dominant)
  if (warehouseItems.length > 0) {
    const warehouseH = v.useMultiRow ? warehouseDepth / 2 : warehouseDepth
    rooms.push(...placeRoomsInBand(warehouseItems, 0, warehouseH, width, v.useMultiRow ? 2 : 1))
  }

  // Admin + loading + WC at front/edge
  const frontItems = [...loadingItems, ...adminItems, ...wcItems]
  if (frontItems.length > 0) {
    rooms.push(...placeRoomsInBand(frontItems, warehouseDepth, adminDepth, width))
  }

  return rooms
}

export function generateWorshipLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  variation?: NonResVariationProfile,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const v = variation || { frontRatio: 0.50, corridorRatio: 0.10, rearRatio: 0.40, useMultiRow: false, clusterWet: true, circulationType: 'centre' as const }

  const hallItems = program.filter(r => r.name.includes('Hall') || r.name.includes('Sanctuary') || r.name.includes('Worship'))
  const fellowshipItems = program.filter(r => r.name.includes('Fellowship') || r.name.includes('Meeting') || r.name.includes('Class') || r.name.includes('Sunday'))
  const officeItems = program.filter(r => r.name.includes('Office') || r.name.includes('Pastor') || r.name.includes('Admin'))
  const kitchenItems = program.filter(r => r.name.includes('Kitchen'))
  const wcItems = program.filter(r => r.name.includes('Toilet') || r.name.includes('WC') || r.name.includes('Ablution'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const hallDepth = height * v.frontRatio
  const corridorDepth = Math.max(1.5, height * v.corridorRatio)
  const supportDepth = height - hallDepth - corridorDepth

  // Main hall at front (dominant space)
  if (hallItems.length > 0) {
    rooms.push(...placeRoomsInBand(hallItems, 0, hallDepth, width))
  }

  // Circulation / narthex
  if (circItems.length > 0) {
    rooms.push(...placeRoomsInBand(circItems, hallDepth, corridorDepth, width))
  } else {
    rooms.push({ id: uid(), name: 'Narthex / Foyer', x: 0, y: Number(hallDepth.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Support spaces at rear: fellowship + office + kitchen + WC
  const supportItems = [...fellowshipItems, ...officeItems, ...kitchenItems, ...wcItems]
  if (supportItems.length > 0) {
    const supportRows = supportItems.length > 4 ? 2 : 1
    const supportH = supportDepth / supportRows
    rooms.push(...placeRoomsInBand(supportItems, hallDepth + corridorDepth, supportH, width, supportRows))
  }

  return rooms
}

// ── Apartment strategy types ───────────────────────────────────

export type ApartmentStrategy =
  | 'double-loaded-corridor'
  | 'single-loaded-corridor'
  | 'core-served-cluster'
  | 'corner-end-variation'

export interface ApartmentStrategyResult {
  strategy: ApartmentStrategy
  unitCount: number
  unitsPerSide: number
  corridorWidth: number
  unitDepth: number
  unitWidth: number
  coreX: number
  coreY: number
  corePlacementType: CorePlacementType
  corridorType: string
  isWide: boolean
  isNarrow: boolean
  isCompact: boolean
  storeyCount: number
}

let _lastApartmentFloorModel: ApartmentFloorModel | null = null

export function getLastApartmentFloorModel(): ApartmentFloorModel | null {
  return _lastApartmentFloorModel
}

interface PlacedUnitRoom {
  name: string
  x: number
  y: number
  w: number
  h: number
}

export function selectApartmentStrategy(
  width: number,
  height: number,
  unitCount: number,
  hasCore: boolean,
  storeyCount = 2,
): ApartmentStrategyResult {
  const corridorW = 2.0
  const coreSize = 4.0
  const coreX = hasCore ? 0 : -1
  const coreY = 0
  const isWide = width >= 18
  const isNarrow = width < 12
  const isCompact = width <= 12 && height <= 12 && unitCount <= 4

  if (hasCore && isCompact) {
    const clusterSize = Math.max(Math.min(width, height) * 0.45, 4.0)
    return {
      strategy: 'core-served-cluster', unitCount,
      unitsPerSide: unitCount, corridorWidth: 1.5,
      unitDepth: Math.max(clusterSize / 2, 3.0),
      unitWidth: Math.max(clusterSize / 2, 2.5),
      coreX: width / 2 - coreSize / 2, coreY: height / 2 - coreSize / 2,
      corePlacementType: 'cluster', corridorType: 'core-served-cluster',
      isWide, isNarrow, isCompact, storeyCount,
    }
  }

  if (isWide && unitCount >= 4) {
    const usableDepth = height / 2 - corridorW / 2
    const unitsPerSide = Math.ceil(unitCount / 2)
    const unitW = (width - (hasCore ? coreSize : 0)) / Math.max(unitsPerSide, 1)
    return {
      strategy: 'double-loaded-corridor', unitCount, unitsPerSide,
      corridorWidth: corridorW,
      unitDepth: Math.max(usableDepth, 3.0), unitWidth: Math.max(unitW, 2.5),
      coreX, coreY,
      corePlacementType: 'central', corridorType: 'double-loaded',
      isWide, isNarrow, isCompact, storeyCount,
    }
  }

  if (width >= 8 && unitCount >= 2) {
    const unitH = (height - corridorW) / Math.max(unitCount, 1)
    return {
      strategy: 'single-loaded-corridor', unitCount, unitsPerSide: unitCount,
      corridorWidth: corridorW,
      unitDepth: Math.max(unitH, 3.0), unitWidth: Math.max(width - (hasCore ? coreSize : 0), 2.5),
      coreX, coreY,
      corePlacementType: 'side', corridorType: 'single-loaded',
      isWide, isNarrow, isCompact, storeyCount,
    }
  }

  if (unitCount <= 4 && hasCore) {
    const clusterSize = Math.max(Math.min(width, height) * 0.45, 4.0)
    return {
      strategy: 'core-served-cluster', unitCount, unitsPerSide: unitCount,
      corridorWidth: 1.5,
      unitDepth: Math.max(clusterSize / 2, 3.0), unitWidth: Math.max(clusterSize / 2, 2.5),
      coreX: width / 2 - coreSize / 2, coreY: height / 2 - coreSize / 2,
      corePlacementType: 'cluster', corridorType: 'core-served-cluster',
      isWide, isNarrow, isCompact, storeyCount,
    }
  }

  const unitH = (height - corridorW) / Math.max(unitCount, 1)
  return {
    strategy: 'single-loaded-corridor', unitCount, unitsPerSide: unitCount,
    corridorWidth: corridorW,
    unitDepth: Math.max(unitH, 3.0), unitWidth: Math.max(width - (hasCore ? coreSize : 0), 2.5),
    coreX, coreY,
    corePlacementType: sideCore(width, height, unitCount) as CorePlacementType,
    corridorType: 'single-loaded',
    isWide, isNarrow, isCompact, storeyCount,
  }
}

function sideCore(w: number, _h: number, _u: number): CorePlacementType {
  return w >= 12 ? 'central' : 'side'
}

// ── Unit-aware template generator helper ──────────────────────/

function generateUnitFromTemplate(
  unitLabel: string,
  ux: number,
  uy: number,
  uw: number,
  uh: number,
  unitType: UnitTemplateType,
  facadeOrientation: 'north' | 'south' | 'east' | 'west',
  entrySide: 'top' | 'bottom' | 'left' | 'right',
): { rooms: PlacedUnitRoom[]; wetCore: { x: number; y: number; width: number; height: number } | null; balcony: { x: number; y: number; width: number; height: number } | null } {
  const generator = getUnitTemplate(unitType)
  const templateRooms = generator({ ux, uy, uw, uh, facadeOrientation, entrySide })

  const rooms: PlacedUnitRoom[] = templateRooms.map(r => ({
    name: `${unitLabel} ${r.name}`,
    x: r.x,
    y: r.y,
    w: r.width,
    h: r.height,
  }))

  const bathRoom = templateRooms.find(r => r.name.startsWith('Bathroom'))
  const balconyRoom = templateRooms.find(r => r.name === 'Balcony')

  const wetCore = bathRoom ? { x: bathRoom.x, y: bathRoom.y, width: bathRoom.width, height: bathRoom.height } : null
  const balcony = balconyRoom ? { x: balconyRoom.x, y: balconyRoom.y, width: balconyRoom.width, height: balconyRoom.height } : null

  return { rooms, wetCore, balcony }
}

function entrySideForUnit(corridorSide: 'top' | 'bottom' | 'left' | 'right', onTopSide: boolean): 'top' | 'bottom' | 'left' | 'right' {
  if (corridorSide === 'top') return onTopSide ? 'bottom' : 'top'
  if (corridorSide === 'bottom') return onTopSide ? 'top' : 'bottom'
  if (corridorSide === 'left') return onTopSide ? 'right' : 'left'
  return onTopSide ? 'left' : 'right'
}

// ── Generate full apartment floor (unit-aware) ───────────────/

export function generateApartmentLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  floorContext?: { floorRole?: string; storeyCount?: number },
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const flatRooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []
  const coreSize = 4.0
  const hasCore = program.some(r => r.name.includes('Core') || r.name.includes('Lift') || r.name.includes('Staircase'))

  const livingCount = program.filter(r => r.name.includes('Living') || r.name.includes('Dining')).length
  const unitCount = Math.max(livingCount, Math.floor(width / 5.5))
  const storeyCount = floorContext?.storeyCount ?? 2

  const strategy = selectApartmentStrategy(width, height, unitCount, hasCore, storeyCount)

  const corePlacement: CorePlacement | null = hasCore
    ? selectCorePlacement(strategy.corePlacementType, width, height, coreSize)
    : null

  if (corePlacement) {
    flatRooms.push({
      id: uid(), name: 'Staircase / Lift Core',
      x: Number(corePlacement.x.toFixed(2)),
      y: Number(corePlacement.y.toFixed(2)),
      width: Number(corePlacement.width.toFixed(2)),
      height: Number(corePlacement.height.toFixed(2)),
    })
  }

  const units: ApartmentUnit[] = []

  switch (strategy.strategy) {
    case 'double-loaded-corridor': {
      const corY = height / 2 - strategy.corridorWidth / 2
      const corridor = { x: 0, y: corY, width, height: strategy.corridorWidth }
      flatRooms.push({
        id: uid(), name: 'Common Corridor',
        x: Number(corridor.x.toFixed(2)), y: Number(corridor.y.toFixed(2)),
        width: Number(corridor.width.toFixed(2)), height: Number(corridor.height.toFixed(2)),
      })

      // Top side units (corridor at bottom)
      for (let i = 0; i < strategy.unitsPerSide; i++) {
        const ux = corePlacement ? corePlacement.x + corePlacement.width + i * strategy.unitWidth : i * strategy.unitWidth
        const isCorner = i === 0 || i === strategy.unitsPerSide - 1
        const unitType = suggestUnitTemplate(strategy.unitWidth, corY, isCorner, isCorner)
        const entrySide = entrySideForUnit('top', false)
        const { rooms, wetCore, balcony } = generateUnitFromTemplate(
          `Unit ${i + 1}`, ux, 0, strategy.unitWidth, corY, unitType, 'north', entrySide,
        )

        units.push({
          id: uid(), label: `Unit ${i + 1}`, unitIndex: i, unitType,
          x: ux, y: 0, width: strategy.unitWidth, height: corY,
          isCornerUnit: isCorner, isEndUnit: isCorner,
          entryX: ux + Math.min(2.0, strategy.unitWidth * 0.25), entryY: 0,
          rooms: rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })),
          wetCoreZone: wetCore, balconyZone: balcony, facadeOrientation: 'north',
        })

        for (const r of rooms) {
          flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
        }
      }

      // Bottom side units (corridor at top)
      for (let i = 0; i < strategy.unitsPerSide; i++) {
        const ux = corePlacement ? corePlacement.x + corePlacement.width + i * strategy.unitWidth : i * strategy.unitWidth
        const uy = corY + strategy.corridorWidth
        const isCorner = i === 0 || i === strategy.unitsPerSide - 1
        const unitType = suggestUnitTemplate(strategy.unitWidth, corY, isCorner, isCorner)
        const entrySide = entrySideForUnit('bottom', false)
        const { rooms, wetCore, balcony } = generateUnitFromTemplate(
          `Unit ${strategy.unitsPerSide + i + 1}`, ux, uy, strategy.unitWidth, corY, unitType, 'south', entrySide,
        )

        units.push({
          id: uid(), label: `Unit ${strategy.unitsPerSide + i + 1}`, unitIndex: strategy.unitsPerSide + i, unitType,
          x: ux, y: uy, width: strategy.unitWidth, height: corY,
          isCornerUnit: isCorner, isEndUnit: isCorner,
          entryX: ux + Math.min(2.0, strategy.unitWidth * 0.25), entryY: uy,
          rooms: rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })),
          wetCoreZone: wetCore, balconyZone: balcony, facadeOrientation: 'south',
        })

        for (const r of rooms) {
          flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
        }
      }

      _lastApartmentFloorModel = buildApartmentFloorModel(units, corridor, corePlacement, strategy.strategy)
      break
    }

    case 'single-loaded-corridor': {
      const corW = width - (corePlacement ? corePlacement.width : 0)
      const corridor = {
        x: corePlacement ? corePlacement.width : 0,
        y: 0,
        width: corW,
        height: strategy.corridorWidth,
      }
      flatRooms.push({
        id: uid(), name: 'Common Corridor',
        x: Number(corridor.x.toFixed(2)), y: Number(corridor.y.toFixed(2)),
        width: Number(corridor.width.toFixed(2)), height: Number(corridor.height.toFixed(2)),
      })

      for (let i = 0; i < strategy.unitCount; i++) {
        const ux = corridor.x
        const uy = strategy.corridorWidth + i * strategy.unitDepth
        const isCorner = i === 0 || i === strategy.unitCount - 1
        const unitType = suggestUnitTemplate(strategy.unitWidth, strategy.unitDepth, isCorner, isCorner)
        const entrySide = 'top'
        const { rooms, wetCore, balcony } = generateUnitFromTemplate(
          `Unit ${i + 1}`, ux, uy, strategy.unitWidth, strategy.unitDepth, unitType, 'south', entrySide,
        )

        units.push({
          id: uid(), label: `Unit ${i + 1}`, unitIndex: i, unitType,
          x: ux, y: uy, width: strategy.unitWidth, height: strategy.unitDepth,
          isCornerUnit: isCorner, isEndUnit: isCorner,
          entryX: ux + Math.min(2.0, strategy.unitWidth * 0.25), entryY: uy,
          rooms: rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })),
          wetCoreZone: wetCore, balconyZone: balcony, facadeOrientation: 'south',
        })

        for (const r of rooms) {
          flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
        }
      }

      _lastApartmentFloorModel = buildApartmentFloorModel(units, corridor, corePlacement, strategy.strategy)
      break
    }

    case 'core-served-cluster': {
      const halfCore = coreSize / 2
      const unitW = strategy.unitWidth
      const unitH = strategy.unitDepth
      const cx = corePlacement ? corePlacement.x : width / 2 - halfCore
      const cy = corePlacement ? corePlacement.y : height / 2 - halfCore

      // Unit above core
      const u1 = generateUnitFromTemplate('Unit 1', cx - unitW / 2 + halfCore, cy - unitH, unitW, unitH, 'two-bed-standard', 'north', 'bottom')
      for (const r of u1.rooms) {
        flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
      }
      units.push({ id: uid(), label: 'Unit 1', unitIndex: 0, unitType: 'two-bed-standard' as const, x: cx - unitW / 2 + halfCore, y: cy - unitH, width: unitW, height: unitH, isCornerUnit: true, isEndUnit: true, entryX: cx - unitW / 2 + halfCore + Math.min(2.0, unitW * 0.25), entryY: cy - unitH, rooms: u1.rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })), wetCoreZone: u1.wetCore, balconyZone: u1.balcony, facadeOrientation: 'north' })

      // Unit below core
      const u2 = generateUnitFromTemplate('Unit 2', cx - unitW / 2 + halfCore, cy + coreSize, unitW, unitH, 'two-bed-standard', 'south', 'top')
      for (const r of u2.rooms) {
        flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
      }
      units.push({ id: uid(), label: 'Unit 2', unitIndex: 1, unitType: 'two-bed-standard' as const, x: cx - unitW / 2 + halfCore, y: cy + coreSize, width: unitW, height: unitH, isCornerUnit: true, isEndUnit: true, entryX: cx - unitW / 2 + halfCore + Math.min(2.0, unitW * 0.25), entryY: cy + coreSize, rooms: u2.rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })), wetCoreZone: u2.wetCore, balconyZone: u2.balcony, facadeOrientation: 'south' })

      // Units beside core
      if (strategy.unitCount >= 3) {
        const u3 = generateUnitFromTemplate('Unit 3', cx - unitW, cy, unitW / 2, coreSize, 'two-bed-standard', 'east', 'right')
        for (const r of u3.rooms) {
          flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
        }
        units.push({ id: uid(), label: 'Unit 3', unitIndex: 2, unitType: 'two-bed-standard' as const, x: cx - unitW, y: cy, width: unitW / 2, height: coreSize, isCornerUnit: false, isEndUnit: false, entryX: cx - unitW + Math.min(2.0, unitW * 0.25), entryY: cy, rooms: u3.rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })), wetCoreZone: u3.wetCore, balconyZone: u3.balcony, facadeOrientation: 'east' })
      }
      if (strategy.unitCount >= 4) {
        const u4 = generateUnitFromTemplate('Unit 4', cx + coreSize, cy, unitW / 2, coreSize, 'two-bed-standard', 'west', 'left')
        for (const r of u4.rooms) {
          flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
        }
        units.push({ id: uid(), label: 'Unit 4', unitIndex: 3, unitType: 'two-bed-standard' as const, x: cx + coreSize, y: cy, width: unitW / 2, height: coreSize, isCornerUnit: false, isEndUnit: false, entryX: cx + coreSize + Math.min(2.0, unitW * 0.25), entryY: cy, rooms: u4.rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })), wetCoreZone: u4.wetCore, balconyZone: u4.balcony, facadeOrientation: 'west' })
      }

      _lastApartmentFloorModel = buildApartmentFloorModel(units, null, corePlacement, strategy.strategy)
      break
    }

    default: {
      // Single-loaded fallback
      const corW = width - (corePlacement ? corePlacement.width : 0)
      const corridor = {
        x: corePlacement ? corePlacement.width : 0,
        y: 0,
        width: corW,
        height: strategy.corridorWidth,
      }
      flatRooms.push({
        id: uid(), name: 'Common Corridor',
        x: Number(corridor.x.toFixed(2)), y: Number(corridor.y.toFixed(2)),
        width: Number(corridor.width.toFixed(2)), height: Number(corridor.height.toFixed(2)),
      })

      for (let i = 0; i < strategy.unitCount; i++) {
        const ux = corridor.x
        const uy = strategy.corridorWidth + i * strategy.unitDepth
        const isCorner = i === 0 || i === strategy.unitCount - 1
        const unitType = suggestUnitTemplate(strategy.unitWidth, strategy.unitDepth, isCorner, isCorner)
        const { rooms, wetCore, balcony } = generateUnitFromTemplate(
          `Unit ${i + 1}`, ux, uy, strategy.unitWidth, strategy.unitDepth, unitType, 'south', 'top',
        )
        units.push({
          id: uid(), label: `Unit ${i + 1}`, unitIndex: i, unitType,
          x: ux, y: uy, width: strategy.unitWidth, height: strategy.unitDepth,
          isCornerUnit: isCorner, isEndUnit: isCorner,
          entryX: ux + Math.min(2.0, strategy.unitWidth * 0.25), entryY: uy,
          rooms: rooms.map(r => ({ name: r.name, x: r.x, y: r.y, width: r.w, height: r.h })),
          wetCoreZone: wetCore, balconyZone: balcony, facadeOrientation: 'south',
        })
        for (const r of rooms) {
          flatRooms.push({ id: uid(), name: r.name, x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)), width: Number(r.w.toFixed(2)), height: Number(r.h.toFixed(2)) })
        }
      }

      _lastApartmentFloorModel = buildApartmentFloorModel(units, corridor, corePlacement, strategy.strategy)
      break
    }
  }

  return flatRooms
}

export function generateApartmentLayoutDetailed(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
  floorContext?: { floorRole?: string; storeyCount?: number },
): { rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[]; model: ApartmentFloorModel } {
  const rooms = generateApartmentLayout(program, width, height, floorContext)
  return { rooms, model: _lastApartmentFloorModel ?? buildApartmentFloorModel([], null, null, 'unknown') }
}