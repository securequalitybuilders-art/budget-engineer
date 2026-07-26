export interface DoorScheduleRow {
  mark: string
  type: string
  widthMm: number
  heightMm: number
  qty: number
  material: string
  finish: string
  ironmongery: string
  notes: string
}

export interface WindowScheduleRow {
  mark: string
  type: string
  widthMm: number
  heightMm: number
  qty: number
  frame: string
  glazing: string
  opening: string
  notes: string
}

export interface RoomFinishRow {
  room: string
  floorAreaM2: number
  floorFinish: string
  wallFinish: string
  ceilingFinish: string
  skirting: string
  waterproofing: string
  notes: string
}

export interface SanitaryScheduleRow {
  fixture: string
  type: string
  qty: number
  cold: boolean
  hot: boolean
  waste: boolean
  notes: string
}

export interface ElectricalPointRow {
  point: string
  type: string
  qty: number
  circuit: string
  ratingA: number
  notes: string
}

export interface HvacScheduleRow {
  unit: string
  type: string
  capacityKw: number
  qty: number
  area: string
  refrigerant: string
  notes: string
}

export interface RoofScheduleRow {
  section: string
  areaM2: number
  pitchDeg: number
  covering: string
  insulation: string
  structure: string
  notes: string
}

export interface MaterialTakeoffRow {
  material: string
  unit: string
  quantity: number
  wastePct: number
  totalQuantity: number
  notes: string
}

export interface ScheduleSet {
  doors: DoorScheduleRow[]
  windows: WindowScheduleRow[]
  roomFinishes: RoomFinishRow[]
  sanitary: SanitaryScheduleRow[]
  electricalPoints: ElectricalPointRow[]
  hvac: HvacScheduleRow[]
  roof: RoofScheduleRow[]
  materialTakeoff: MaterialTakeoffRow[]
  generatedAt: string
  designId: string
}

export function buildScheduleCsv(schedules: ScheduleSet): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const sections: string[] = []

  if (schedules.doors.length > 0) {
    sections.push('DOOR SCHEDULE')
    sections.push(['Mark', 'Type', 'Width (mm)', 'Height (mm)', 'Qty', 'Material', 'Finish', 'Ironmongery', 'Notes'].map(esc).join(','))
    for (const d of schedules.doors) {
      sections.push([d.mark, d.type, d.widthMm, d.heightMm, d.qty, d.material, d.finish, d.ironmongery, d.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.windows.length > 0) {
    sections.push('WINDOW SCHEDULE')
    sections.push(['Mark', 'Type', 'Width (mm)', 'Height (mm)', 'Qty', 'Frame', 'Glazing', 'Opening', 'Notes'].map(esc).join(','))
    for (const w of schedules.windows) {
      sections.push([w.mark, w.type, w.widthMm, w.heightMm, w.qty, w.frame, w.glazing, w.opening, w.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.roomFinishes.length > 0) {
    sections.push('ROOM FINISH SCHEDULE')
    sections.push(['Room', 'Floor Area (m²)', 'Floor', 'Wall', 'Ceiling', 'Skirting', 'Waterproofing', 'Notes'].map(esc).join(','))
    for (const r of schedules.roomFinishes) {
      sections.push([r.room, r.floorAreaM2, r.floorFinish, r.wallFinish, r.ceilingFinish, r.skirting, r.waterproofing, r.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.sanitary.length > 0) {
    sections.push('SANITARY SCHEDULE')
    sections.push(['Fixture', 'Type', 'Qty', 'Cold', 'Hot', 'Waste', 'Notes'].map(esc).join(','))
    for (const s of schedules.sanitary) {
      sections.push([s.fixture, s.type, s.qty, s.cold ? 'Yes' : 'No', s.hot ? 'Yes' : 'No', s.waste ? 'Yes' : 'No', s.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.electricalPoints.length > 0) {
    sections.push('ELECTRICAL POINT SCHEDULE')
    sections.push(['Point', 'Type', 'Qty', 'Circuit', 'Rating (A)', 'Notes'].map(esc).join(','))
    for (const e of schedules.electricalPoints) {
      sections.push([e.point, e.type, e.qty, e.circuit, e.ratingA, e.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.hvac.length > 0) {
    sections.push('HVAC SCHEDULE')
    sections.push(['Unit', 'Type', 'Capacity (kW)', 'Qty', 'Area', 'Refrigerant', 'Notes'].map(esc).join(','))
    for (const h of schedules.hvac) {
      sections.push([h.unit, h.type, h.capacityKw, h.qty, h.area, h.refrigerant, h.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.roof.length > 0) {
    sections.push('ROOF SCHEDULE')
    sections.push(['Section', 'Area (m²)', 'Pitch (°)', 'Covering', 'Insulation', 'Structure', 'Notes'].map(esc).join(','))
    for (const r of schedules.roof) {
      sections.push([r.section, r.areaM2, r.pitchDeg, r.covering, r.insulation, r.structure, r.notes].map(esc).join(','))
    }
    sections.push('')
  }

  if (schedules.materialTakeoff.length > 0) {
    sections.push('MATERIAL TAKEOFF')
    sections.push(['Material', 'Unit', 'Quantity', 'Waste %', 'Total Qty', 'Notes'].map(esc).join(','))
    for (const m of schedules.materialTakeoff) {
      sections.push([m.material, m.unit, m.quantity, m.wastePct, m.totalQuantity, m.notes].map(esc).join(','))
    }
    sections.push('')
  }

  return sections.join('\n')
}
