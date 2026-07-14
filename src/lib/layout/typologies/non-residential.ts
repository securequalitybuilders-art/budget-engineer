import { getMinimumDimensions, classifyRoom } from '../../geometry/plan-intelligence'

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

    // Compute desired width
    const ratioW = width * (r.ratio / ratioSum)
    const areaW = bandDepth > 0.01 ? (dims.minWidth * dims.minDepth) / bandDepth : dims.minWidth
    const desiredW = Math.max(ratioW, areaW, dims.minWidth, 1.5)
    let w = Math.min(desiredW, remainingW)

    // If room doesn't fit and we have rows left, wrap to next row
    if (w <= 0 && row + 1 < maxRows) {
      row++
      x = 0
      yOffset = bandY + row * bandDepth
      w = Math.min(desiredW, width)
    }

    // If still doesn't fit, give remaining width
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
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Clinic: reception/waiting at front, consultation rooms off controlled corridor, treatment at rear
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const receptionItems = program.filter(r => r.name.includes('Reception') || r.name.includes('Waiting'))
  const consultationItems = program.filter(r => r.name.includes('Consultation'))
  const treatmentItems = program.filter(r => r.name.includes('Treatment') || r.name.includes('Nurse') || r.name.includes('Pharmacy') || r.name.includes('Store'))
  const wcItems = program.filter(r => r.name.includes('WC') || r.name.includes('Toilet'))
  const officeItems = program.filter(r => (r.name.includes('Office') || r.name.includes('Staff')) && !r.name.includes('WC') && !r.name.includes('Toilet'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  // Three-band clinic layout
  const frontDepth = height * 0.30
  const corridorDepth = Math.max(1.5, height * 0.12)
  const corridorY = frontDepth
  const treatmentDepth = height - frontDepth - corridorDepth

  // Front band: reception + waiting
  if (receptionItems.length > 0) {
    for (const r of placeRoomsInBand(receptionItems, 0, frontDepth, width)) {
      rooms.push(r)
    }
  }

  // Circulation corridor
  if (circItems.length > 0) {
    for (const r of placeRoomsInBand(circItems, corridorY, corridorDepth, width)) {
      rooms.push(r)
    }
  } else {
    rooms.push({ id: uid(), name: 'Circulation', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Rear band: consultations, treatment, offices, WC
  const rearItems = [...consultationItems, ...treatmentItems, ...officeItems, ...wcItems]
  if (rearItems.length > 0) {
    // Group wet items (treatment/pharmacy) together
    const wetRear = rearItems.filter(r => classifyRoom(r.name) === 'wet' || r.name.includes('Treatment') || r.name.includes('Pharmacy'))
    const dryRear = rearItems.filter(r => !wetRear.includes(r))
    const sortedRear = [...wetRear, ...dryRear]

    const maxRearRows = sortedRear.length > 5 ? 2 : 1
    for (const r of placeRoomsInBand(sortedRear, corridorY + corridorDepth, treatmentDepth / maxRearRows, width, maxRearRows)) {
      rooms.push(r)
    }
  }

  return rooms
}

export function generateSchoolLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // School: repeated classroom modules along corridor, admin near entry, ablution cluster
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const classroomItems = program.filter(r => r.name.includes('Classroom'))
  const adminItems = program.filter(r => r.name.includes('Office') || r.name.includes('Staff') || r.name.includes('Head'))
  const ablutionItems = program.filter(r => r.name.includes('Toilet') || r.name.includes('Ablution'))
  const storeItems = program.filter(r => r.name.includes('Store'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const corridorY = height * 0.30
  const corridorDepth = Math.max(1.5, height * 0.10)
  const classroomDepth = corridorY
  const rearDepth = height - corridorY - corridorDepth

  // Classrooms in front band
  if (classroomItems.length > 0) {
    for (const r of placeRoomsInBand(classroomItems, 0, classroomDepth, width)) {
      rooms.push(r)
    }
  }

  // Circulation spine
  if (circItems.length > 0) {
    for (const r of placeRoomsInBand(circItems, corridorY, corridorDepth, width)) {
      rooms.push(r)
    }
  } else {
    rooms.push({ id: uid(), name: 'Circulation', x: 0, y: Number(corridorY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(corridorDepth.toFixed(2)) })
  }

  // Rear band: admin + ablution + store
  const rearItems = [...adminItems, ...ablutionItems, ...storeItems]
  if (rearItems.length > 0) {
    for (const r of placeRoomsInBand(rearItems, corridorY + corridorDepth, rearDepth, width)) {
      rooms.push(r)
    }
  }

  return rooms
}

export function generateRetailLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Retail: active frontage (sales floor), customer circulation, service back
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const salesItems = program.filter(r => r.name.includes('Sales') || r.name.includes('Retail') || r.name.includes('Shop'))
  const stockItems = program.filter(r => r.name.includes('Stock') || r.name.includes('Store') || r.name.includes('Storage'))
  const officeItems = program.filter(r => r.name.includes('Office') || r.name.includes('Staff'))
  const wcItems = program.filter(r => r.name.includes('WC') || r.name.includes('Toilet'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const salesDepth = height * 0.50
  const serviceDepth = height - salesDepth

  // Sales floor at front
  if (salesItems.length > 0) {
    for (const r of placeRoomsInBand(salesItems, 0, salesDepth, width)) {
      rooms.push(r)
    }
  }

  // Service/back-of-house at rear
  const serviceItems = [...stockItems, ...officeItems, ...wcItems, ...circItems]
  if (serviceItems.length > 0) {
    for (const r of placeRoomsInBand(serviceItems, salesDepth, serviceDepth, width)) {
      rooms.push(r)
    }
  }

  return rooms
}

export function generateMixedUseLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Mixed-use: retail front, residential lobby separate, service at rear
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const retailItems = program.filter(r => r.name.includes('Shop') || r.name.includes('Retail') || r.name.includes('Sales'))
  const residentialItems = program.filter(r => r.name.includes('Apartment') || r.name.includes('Upper'))
  const lobbyItems = program.filter(r => r.name.includes('Lobby') || r.name.includes('Stair'))
  const storeItems = program.filter(r => r.name.includes('Store') || r.name.includes('Storage'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const retailDepth = height * 0.45
  const lobbyDepth = Math.max(2.0, height * 0.10)
  const lobbyY = retailDepth
  const residentialDepth = height - retailDepth - lobbyDepth

  // Retail at front
  if (retailItems.length > 0) {
    for (const r of placeRoomsInBand(retailItems, 0, retailDepth, width)) {
      rooms.push(r)
    }
  }

  // Residential lobby (separate from retail circulation)
  if (lobbyItems.length > 0) {
    for (const r of placeRoomsInBand(lobbyItems, lobbyY, lobbyDepth, width)) {
      rooms.push(r)
    }
  } else {
    rooms.push({ id: uid(), name: 'Residential Lobby', x: 0, y: Number(lobbyY.toFixed(2)), width: Number(width.toFixed(2)), height: Number(lobbyDepth.toFixed(2)) })
  }

  // Residential apartments at rear
  if (residentialItems.length > 0) {
    for (const r of placeRoomsInBand(residentialItems, lobbyY + lobbyDepth, residentialDepth, width)) {
      rooms.push(r)
    }
  }

  // Store/service items
  if (storeItems.length > 0) {
    const storeY = lobbyY + lobbyDepth
    const storeDepth = residentialDepth > 0 ? residentialDepth * 0.3 : 2.0
    for (const r of placeRoomsInBand(storeItems, storeY, storeDepth, width)) {
      rooms.push(r)
    }
  }

  // Circulation
  if (circItems.length > 0) {
    for (const r of placeRoomsInBand(circItems, lobbyY, lobbyDepth, width)) {
      rooms.push(r)
    }
  }

  return rooms
}

export function generateWarehouseLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Warehouse: large-span work zone, admin/office block separate, loading edge
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const warehouseItems = program.filter(r => r.name.includes('Warehouse') || r.name.includes('Workshop') || r.name.includes('Manufacturing'))
  const adminItems = program.filter(r => r.name.includes('Office') || r.name.includes('Admin') || r.name.includes('Staff'))
  const loadingItems = program.filter(r => r.name.includes('Loading') || r.name.includes('Bay'))
  const wcItems = program.filter(r => r.name.includes('WC') || r.name.includes('Toilet'))

  const warehouseDepth = height * 0.65
  const adminDepth = height - warehouseDepth

  // Large span warehouse zone
  if (warehouseItems.length > 0) {
    for (const r of placeRoomsInBand(warehouseItems, 0, warehouseDepth, width)) {
      rooms.push(r)
    }
  }

  // Admin + loading + WC at front
  const frontItems = [...adminItems, ...loadingItems, ...wcItems]
  if (frontItems.length > 0) {
    for (const r of placeRoomsInBand(frontItems, warehouseDepth, adminDepth, width)) {
      rooms.push(r)
    }
  }

  return rooms
}

export function generateWorshipLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Worship: large hall, ablution/service cluster, office
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const hallItems = program.filter(r => r.name.includes('Hall') || r.name.includes('Sanctuary'))
  const classItems = program.filter(r => r.name.includes('School') || r.name.includes('Sunday'))
  const officeItems = program.filter(r => r.name.includes('Office') || r.name.includes('Pastor'))
  const kitchenItems = program.filter(r => r.name.includes('Kitchen'))
  const wcItems = program.filter(r => r.name.includes('Toilet') || r.name.includes('WC'))
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const hallDepth = height * 0.50

  // Main hall at front
  if (hallItems.length > 0) {
    for (const r of placeRoomsInBand(hallItems, 0, hallDepth, width)) {
      rooms.push(r)
    }
  }

  // Support spaces at rear
  const supportItems = [...classItems, ...officeItems, ...kitchenItems, ...wcItems, ...circItems]
  if (supportItems.length > 0) {
    for (const r of placeRoomsInBand(supportItems, hallDepth, height - hallDepth, width)) {
      rooms.push(r)
    }
  }

  return rooms
}

export function generateApartmentLayout(
  program: { name: string; ratio: number }[],
  width: number,
  height: number,
): { id: string; name: string; x: number; y: number; width: number; height: number }[] {
  // Apartment floor: core in center, units radiating, corridor ring
  const rooms: { id: string; name: string; x: number; y: number; width: number; height: number }[] = []

  const unitItems = program.filter(r => classifyRoom(r.name) !== 'circulation')
  const circItems = program.filter(r => classifyRoom(r.name) === 'circulation')

  const coreSize = 4.0
  const coreX = (width - coreSize) / 2
  const coreY = (height - coreSize) / 2

  // Core
  const coreItems = program.filter(r => r.name.includes('Core') || r.name.includes('Lift') || r.name.includes('Staircase'))
  if (coreItems.length > 0) {
    rooms.push({ id: uid(), name: 'Staircase / Lift Core', x: Number(coreX.toFixed(2)), y: Number(coreY.toFixed(2)), width: coreSize, height: coreSize })
  }

  // Corridor ring
  if (circItems.length > 0) {
    const corridorW = 2.0
    // Top corridor
    rooms.push({ id: uid(), name: 'Common Corridor', x: 0, y: 0, width: Number(width.toFixed(2)), height: Number(corridorW.toFixed(2)) })
  }

  // Units distributed around core
  const midIdx = Math.ceil(unitItems.length / 2)
  const leftUnits = unitItems.slice(0, midIdx)
  const rightUnits = unitItems.slice(midIdx)

  const unitDepth = height - 2.0
  let uy = 2.0
  for (const u of leftUnits) {
    const unitH = unitDepth / Math.max(leftUnits.length, 1)
    rooms.push({ id: uid(), name: u.name, x: 0, y: Number(uy.toFixed(2)), width: Number(coreX.toFixed(2)), height: Number(unitH.toFixed(2)) })
    uy += unitH
  }

  uy = 2.0
  for (const u of rightUnits) {
    const unitH = unitDepth / Math.max(rightUnits.length, 1)
    rooms.push({ id: uid(), name: u.name, x: Number((coreX + coreSize).toFixed(2)), y: Number(uy.toFixed(2)), width: Number((width - coreX - coreSize).toFixed(2)), height: Number(unitH.toFixed(2)) })
    uy += unitH
  }

  return rooms
}
