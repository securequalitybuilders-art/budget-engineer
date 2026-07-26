import type { DesignOption } from '@/domain/boq'
import type { ScheduleSet, DoorScheduleRow, WindowScheduleRow, RoomFinishRow, SanitaryScheduleRow, ElectricalPointRow, HvacScheduleRow, RoofScheduleRow, MaterialTakeoffRow } from '@/lib/boq/schedules'
import { extractGeometryQuantities } from './geometryQuantitiesAdapter'
import { buildDesignGeometry } from './designGeometryAdapter'
import type { RoofType } from './designToBoq'

export function generateSchedules(
  design: DesignOption | null,
  roofType: RoofType = 'concrete-slab',
): ScheduleSet {
  if (!design || design.grossFloorArea <= 0) {
    return {
      doors: [], windows: [], roomFinishes: [], sanitary: [],
      electricalPoints: [], hvac: [], roof: [], materialTakeoff: [],
      generatedAt: new Date().toISOString(), designId: '',
    }
  }

  const qty = extractGeometryQuantities(design)
  const geo = buildDesignGeometry(design)
  const gfa = qty.grossFloorArea
  const floors = qty.floors || 1
  const footprint = qty.footprintArea || gfa / floors
  const doorCount = qty.doorCount || Math.max(1, Math.round(gfa / 25))
  const windowCount = qty.windowCount || Math.max(1, Math.round(gfa / 20))
  const wetRooms = qty.wetRoomCount
  const kitchens = qty.kitchenCount
  const rooms = geo.rooms
  const roomCount = qty.roomCount || Math.max(1, rooms.length)

  const roomTypes = new Map<string, number>()
  for (const room of rooms) {
    roomTypes.set(room.type, (roomTypes.get(room.type) ?? 0) + 1)
  }

  // ── DOOR SCHEDULE ──
  const doors: DoorScheduleRow[] = []
  for (let i = 0; i < Math.min(doorCount, 12); i++) {
    const isExternal = i < Math.max(1, Math.round(doorCount * 0.2))
    doors.push({
      mark: `D${String(i + 1).padStart(2, '0')}`,
      type: isExternal ? 'External' : 'Internal',
      widthMm: isExternal ? 1200 : 900,
      heightMm: isExternal ? 2100 : 2100,
      qty: i === 0 ? Math.max(1, doorCount - (Math.min(doorCount, 12) - 1)) : 1,
      material: isExternal ? 'Steel' : 'Timber',
      finish: isExternal ? 'Powder coated' : 'Painted',
      ironmongery: isExternal ? 'Mortice lock, closer' : 'Lever handle, latch',
      notes: isExternal ? 'With frame' : 'Hollow core',
    })
  }
  if (doorCount > 12) {
    doors.push({
      mark: `D${String(13).padStart(2, '0')}`,
      type: 'Internal',
      widthMm: 900,
      heightMm: 2100,
      qty: doorCount - 12,
      material: 'Timber',
      finish: 'Painted',
      ironmongery: 'Lever handle, latch',
      notes: 'Additional doors',
    })
  }

  // ── WINDOW SCHEDULE ──
  const windows: WindowScheduleRow[] = []
  const windowTypes = ['Sliding', 'Casement', 'Fixed']
  for (let i = 0; i < Math.min(windowCount, 8); i++) {
    const wType = windowTypes[i % windowTypes.length]
    const isSmall = i % 3 === 0
    windows.push({
      mark: `W${String(i + 1).padStart(2, '0')}`,
      type: wType,
      widthMm: isSmall ? 600 : 1200,
      heightMm: isSmall ? 600 : 1200,
      qty: i === 0 ? Math.max(1, windowCount - (Math.min(windowCount, 8) - 1)) : 1,
      frame: 'Aluminium',
      glazing: '6mm clear',
      opening: wType === 'Fixed' ? 'None' : 'Side hung',
      notes: 'With sill',
    })
  }
  if (windowCount > 8) {
    windows.push({
      mark: `W${String(9).padStart(2, '0')}`,
      type: 'Sliding',
      widthMm: 1200,
      heightMm: 1200,
      qty: windowCount - 8,
      frame: 'Aluminium',
      glazing: '6mm clear',
      opening: 'Side hung',
      notes: 'Additional windows',
    })
  }

  // ── ROOM FINISH SCHEDULE ──
  const roomFinishes: RoomFinishRow[] = []
  for (const room of rooms) {
    const isWet = room.type === 'bathroom' || room.type === 'toilets' || room.type === 'kitchen'
    roomFinishes.push({
      room: room.type.charAt(0).toUpperCase() + room.type.slice(1),
      floorAreaM2: room.area,
      floorFinish: isWet ? 'Ceramic tiles' : 'Vinyl / tiles',
      wallFinish: isWet ? 'Tiled splashback' : 'Painted plaster',
      ceilingFinish: 'Suspended ceiling / painted',
      skirting: isWet ? 'PVC' : 'Timber',
      waterproofing: isWet ? 'Yes' : 'No',
      notes: '',
    })
  }
  if (roomFinishes.length === 0) {
    const defaultRooms = ['Living', 'Kitchen', 'Bedroom 1', 'Bathroom']
    for (let i = 0; i < Math.min(roomCount, 10); i++) {
      const name = i < defaultRooms.length ? defaultRooms[i] : `Room ${i + 1}`
      const isWet = name === 'Kitchen' || name === 'Bathroom'
      roomFinishes.push({
        room: name,
        floorAreaM2: gfa / Math.min(roomCount, 10),
        floorFinish: isWet ? 'Ceramic tiles' : 'Vinyl / tiles',
        wallFinish: isWet ? 'Tiled splashback' : 'Painted plaster',
        ceilingFinish: 'Suspended ceiling / painted',
        skirting: isWet ? 'PVC' : 'Timber',
        waterproofing: isWet ? 'Yes' : 'No',
        notes: '',
      })
    }
  }

  // ── SANITARY SCHEDULE ──
  const sanitary: SanitaryScheduleRow[] = []
  for (let i = 0; i < wetRooms; i++) {
    sanitary.push(
      { fixture: 'WC Pan', type: 'Close coupled', qty: 1, cold: true, hot: false, waste: true, notes: 'Vitreous china' },
      { fixture: 'Basin', type: 'Wall hung', qty: 1, cold: true, hot: true, waste: true, notes: '' },
      { fixture: 'Shower', type: 'Mixer valve', qty: 1, cold: true, hot: true, waste: true, notes: 'With tray' },
      { fixture: 'Floor drain', type: '50mm', qty: 1, cold: true, hot: false, waste: true, notes: '' },
    )
  }
  for (let i = 0; i < kitchens; i++) {
    sanitary.push(
      { fixture: 'Sink', type: 'Stainless steel', qty: 1, cold: true, hot: true, waste: true, notes: 'Single bowl' },
      { fixture: 'Floor drain', type: '50mm', qty: 1, cold: true, hot: false, waste: true, notes: '' },
    )
  }

  // ── ELECTRICAL POINT SCHEDULE ──
  const electricalPoints: ElectricalPointRow[] = []
  const lightPoints = roomCount + 2
  const socketCount = roomCount * 2 + 2
  electricalPoints.push(
    { point: 'Lighting', type: 'LED downlight', qty: lightPoints, circuit: 'L1', ratingA: 6, notes: '' },
    { point: 'Socket outlet', type: '13A switched', qty: socketCount, circuit: 'S1', ratingA: 13, notes: 'With USB' },
    { point: 'Switch', type: '1-gang', qty: lightPoints, circuit: 'L1', ratingA: 6, notes: '' },
    { point: 'Cooker outlet', type: '45A', qty: 1, circuit: 'C1', ratingA: 45, notes: '' },
    { point: 'Geyser outlet', type: '20A', qty: 1, circuit: 'G1', ratingA: 20, notes: '' },
    { point: 'DB board', type: '8-way', qty: 1, circuit: 'Main', ratingA: 60, notes: 'With RCD' },
  )

  // ── HVAC SCHEDULE ──
  const hvac: HvacScheduleRow[] = []
  const bedrooms = qty.bedroomCount || Math.max(1, Math.round(roomCount * 0.4))
  for (let i = 0; i < bedrooms; i++) {
    hvac.push({
      unit: `AC-${String(i + 1).padStart(2, '0')}`,
      type: 'Split unit',
      capacityKw: 3.5,
      qty: 1,
      area: `Bedroom ${i + 1}`,
      refrigerant: 'R32',
      notes: '',
    })
  }
  if (wetRooms > 0) {
    hvac.push({
      unit: 'EF-01',
      type: 'Extract fan',
      capacityKw: 0.05,
      qty: wetRooms,
      area: 'Wet rooms',
      refrigerant: 'N/A',
      notes: '',
    })
  }

  // ── ROOF SCHEDULE ──
  const roof: RoofScheduleRow[] = []
  if (roofType === 'cgi-truss') {
    roof.push({
      section: 'Main roof',
      areaM2: footprint,
      pitchDeg: 25,
      covering: 'CGI sheets 0.6mm',
      insulation: '50mm fibreglass',
      structure: 'Timber trusses @ 600mm c/c',
      notes: 'With gutters',
    })
  } else {
    roof.push({
      section: 'Roof slab',
      areaM2: footprint,
      pitchDeg: 0,
      covering: 'Concrete slab 150mm',
      insulation: '50mm XPS',
      structure: 'RCC slab',
      notes: 'Waterproofed',
    })
  }

  // ── CORE MATERIAL TAKEOFF ──
  const materialTakeoff: MaterialTakeoffRow[] = []
  const extWallArea = qty.externalWallArea
  const extWallVol = extWallArea * 0.23
  const slabArea = qty.slabArea || gfa
  const slabVol = slabArea * 0.15
  const footingVol = footprint * 0.3 * 0.6

  materialTakeoff.push(
    { material: 'Concrete (all grades)', unit: 'm³', quantity: slabVol + footingVol + extWallVol * 0.2, wastePct: 10, totalQuantity: 0, notes: 'Mix C25/30' },
    { material: 'Reinforcement steel', unit: 'tonne', quantity: (slabVol + footingVol) * 0.08, wastePct: 8, totalQuantity: 0, notes: 'Y10–Y16' },
    { material: 'Common bricks / blocks', unit: 'm²', quantity: qty.externalWallArea + qty.partitionArea, wastePct: 5, totalQuantity: 0, notes: '230mm ext / 115mm int' },
    { material: 'Cement (OPC)', unit: 'tonne', quantity: (slabVol + footingVol) * 0.35, wastePct: 5, totalQuantity: 0, notes: '42.5N' },
    { material: 'River sand', unit: 'm³', quantity: (slabVol + footingVol) * 0.6, wastePct: 10, totalQuantity: 0, notes: '' },
    { material: 'Hardcore / aggregate', unit: 'm³', quantity: footprint * 0.15 + (slabVol + footingVol) * 0.8, wastePct: 8, totalQuantity: 0, notes: '20mm graded' },
    { material: 'Timber (formwork)', unit: 'm²', quantity: slabArea * 0.3 + extWallArea * 0.15, wastePct: 15, totalQuantity: 0, notes: 'Plywood 18mm' },
    { material: 'Roofing sheets', unit: 'm²', quantity: footprint, wastePct: 8, totalQuantity: 0, notes: roofType === 'cgi-truss' ? 'CGI 0.6mm' : 'N/A (concrete slab)' },
  )

  for (const m of materialTakeoff) {
    m.totalQuantity = Math.round(m.quantity * (1 + m.wastePct / 100) * 10) / 10
    m.quantity = Math.round(m.quantity * 10) / 10
  }

  return {
    doors, windows, roomFinishes, sanitary, electricalPoints, hvac, roof, materialTakeoff,
    generatedAt: new Date().toISOString(),
    designId: design.id,
  }
}
