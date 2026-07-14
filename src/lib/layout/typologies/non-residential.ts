import { getMinimumDimensions, classifyRoom } from '../../geometry/plan-intelligence'
import type { NonResVariationProfile } from '../variation-engine'

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
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const retailDepth = height * v.frontRatio
  const corridorDepth = Math.max(2.0, height * v.corridorRatio)
  const corridorY = retailDepth
  const residentialDepth = height - retailDepth - corridorDepth

  // Retail at front (street-facing)
  if (retailItems.length > 0) {
    rooms.push(...placeRoomsInBand(retailItems, 0, retailDepth, width))
  }

  // Separated circulation corridor (service corridor between retail and residential)
  if (circItems.length > 0) {
    rooms.push(...placeRoomsInBand(circItems, corridorY, corridorDepth, width))
  } else {
    rooms.push({ id: uid(), name: 'Service Corridor', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Residential lobby (separate from retail)
  if (lobbyItems.length > 0) {
    rooms.push(...placeRoomsInBand(lobbyItems, corridorY, corridorDepth, width))
  } else {
    rooms.push({ id: uid(), name: 'Residential Lobby', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Residential at rear
  if (residentialItems.length > 0) {
    rooms.push(...placeRoomsInBand(residentialItems, corridorY + corridorDepth, residentialDepth, width))
  }

  // Store/service items at rear corner
  if (storeItems.length > 0) {
    const storeDepth = Math.min(2.0, residentialDepth * 0.3)
    rooms.push(...placeRoomsInBand(storeItems, corridorY + corridorDepth, storeDepth, width))
  }

  return rooms
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

export function generateApartmentLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const unitItems = program.filter(r => classifyRoom(r.name) !== 'circulation')

  const coreSize = 4.0
  const corridorW = 2.0

  // Core and corridor: place along one side to leave room for units
  const hasCore = program.some(r => r.name.includes('Core') || r.name.includes('Lift') || r.name.includes('Staircase'))

  if (hasCore) {
    rooms.push({ id: uid(), name: 'Staircase / Lift Core', x: 0, y: 0, width: coreSize, height: coreSize })
  }

  // Corridor along the front
  rooms.push({ id: uid(), name: 'Common Corridor', x: hasCore ? coreSize : 0, y: 0, width: Number((width - (hasCore ? coreSize : 0)).toFixed(2)), height: Number(corridorW.toFixed(2)) })

  // Distribute units below the corridor
  const unitDepth = height - corridorW
  const midIdx = Math.ceil(unitItems.length / 2)
  const leftUnits = unitItems.slice(0, midIdx)
  const rightUnits = unitItems.slice(midIdx)

  // Group units: combine living/dining + kitchen into one "Apartment Unit" and bedrooms + bath into another
  const unitGroups: { name: string; x: number; y: number; w: number; h: number }[] = []
  const allUnits = [...leftUnits, ...rightUnits]

  const unitH = unitDepth / Math.max(allUnits.length, 1)
  let uy = corridorW
  for (const u of allUnits) {
    unitGroups.push({ name: u.name, x: 0, y: uy, w: width, h: Math.max(unitH, 1.5) })
    uy += unitH
  }

  for (const ug of unitGroups) {
    rooms.push({ id: uid(), name: ug.name, x: Number(ug.x.toFixed(2)), y: Number(ug.y.toFixed(2)), width: Number(ug.w.toFixed(2)), height: Number(ug.h.toFixed(2)) })
  }

  return rooms
}