import type { BuildingTypology } from './typology-router'

export type ZoneRole = 'public' | 'private' | 'wet' | 'service' | 'circulation' | 'core' | 'void'

export interface ZoneDefinition {
  id: string
  label: string
  role: ZoneRole
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
  acceptRoles: ZoneRole[]
  priority: number
}

export interface LayoutTemplate {
  id: string
  name: string
  typology: BuildingTypology
  minArea: number
  maxArea: number
  cols: number
  rows: number
  zones: ZoneDefinition[]
}

const CENTRAL_HALL: LayoutTemplate = {
  id: 'central-hall',
  name: 'Central Hall House',
  typology: 'house',
  minArea: 0,
  maxArea: 9999,
  cols: 4,
  rows: 3,
  zones: [
    { id: 'front-public', label: 'Front Public', role: 'public', colStart: 0, colEnd: 4, rowStart: 0, rowEnd: 1, acceptRoles: ['public', 'service'], priority: 2 },
    { id: 'circulation', label: 'Central Hall', role: 'circulation', colStart: 0, colEnd: 4, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 4 },
    { id: 'rear-private', label: 'Rear Private', role: 'private', colStart: 0, colEnd: 4, rowStart: 2, rowEnd: 3, acceptRoles: ['private', 'wet'], priority: 1 },
  ],
}

const SIDE_CORRIDOR: LayoutTemplate = {
  id: 'side-corridor',
  name: 'Side Corridor House',
  typology: 'house',
  minArea: 0,
  maxArea: 9999,
  cols: 4,
  rows: 3,
  zones: [
    { id: 'front-public', label: 'Front Public', role: 'public', colStart: 0, colEnd: 3, rowStart: 0, rowEnd: 1, acceptRoles: ['public', 'service'], priority: 2 },
    { id: 'circulation', label: 'Side Hall', role: 'circulation', colStart: 3, colEnd: 4, rowStart: 0, rowEnd: 3, acceptRoles: ['circulation'], priority: 4 },
    { id: 'rear-private', label: 'Rear Private', role: 'private', colStart: 0, colEnd: 3, rowStart: 1, rowEnd: 3, acceptRoles: ['private', 'wet'], priority: 1 },
  ],
}

const L_PLAN: LayoutTemplate = {
  id: 'l-plan',
  name: 'L-Plan House',
  typology: 'house',
  minArea: 100,
  maxArea: 9999,
  cols: 4,
  rows: 4,
  zones: [
    { id: 'front-public', label: 'Front Public', role: 'public', colStart: 0, colEnd: 4, rowStart: 0, rowEnd: 2, acceptRoles: ['public', 'service'], priority: 2 },
    { id: 'circulation', label: 'Central Hall', role: 'circulation', colStart: 1, colEnd: 3, rowStart: 2, rowEnd: 3, acceptRoles: ['circulation'], priority: 4 },
    { id: 'rear-private', label: 'Rear Private', role: 'private', colStart: 0, colEnd: 4, rowStart: 2, rowEnd: 4, acceptRoles: ['private', 'wet'], priority: 1 },
    { id: 'courtyard-void', label: 'Courtyard', role: 'void', colStart: 0, colEnd: 1, rowStart: 2, rowEnd: 3, acceptRoles: [], priority: 0 },
  ],
}

const SPLIT_WING: LayoutTemplate = {
  id: 'split-wing',
  name: 'Split-Wing House',
  typology: 'house',
  minArea: 130,
  maxArea: 9999,
  cols: 4,
  rows: 4,
  zones: [
    { id: 'wing-a-public', label: 'Wing A Public', role: 'public', colStart: 0, colEnd: 2, rowStart: 0, rowEnd: 2, acceptRoles: ['public', 'service'], priority: 2 },
    { id: 'circulation', label: 'Entry Hall', role: 'circulation', colStart: 2, colEnd: 4, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 4 },
    { id: 'wing-b-private', label: 'Wing B Private', role: 'private', colStart: 2, colEnd: 4, rowStart: 0, rowEnd: 1, acceptRoles: ['private'], priority: 1 },
    { id: 'rear-wet', label: 'Rear Wet', role: 'wet', colStart: 0, colEnd: 2, rowStart: 2, rowEnd: 4, acceptRoles: ['wet'], priority: 3 },
    { id: 'rear-private', label: 'Rear Private', role: 'private', colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 4, acceptRoles: ['private'], priority: 1 },
  ],
}

const VILLA_FORMAL: LayoutTemplate = {
  id: 'villa-formal',
  name: 'Formal Entry Villa',
  typology: 'house',
  minArea: 150,
  maxArea: 9999,
  cols: 5,
  rows: 4,
  zones: [
    { id: 'entry-hall', label: 'Entry Hall', role: 'circulation', colStart: 0, colEnd: 5, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 5 },
    { id: 'public-formal', label: 'Formal Public', role: 'public', colStart: 0, colEnd: 5, rowStart: 0, rowEnd: 1, acceptRoles: ['public'], priority: 2 },
    { id: 'veranda', label: 'Veranda', role: 'public', colStart: 0, colEnd: 5, rowStart: 3, rowEnd: 4, acceptRoles: ['service'], priority: 3 },
    { id: 'private-formal', label: 'Private Suite', role: 'private', colStart: 0, colEnd: 5, rowStart: 2, rowEnd: 4, acceptRoles: ['private', 'wet'], priority: 1 },
  ],
}

const COMPACT_HOUSE: LayoutTemplate = {
  id: 'compact-house',
  name: 'Compact Starter House',
  typology: 'house',
  minArea: 0,
  maxArea: 100,
  cols: 3,
  rows: 3,
  zones: [
    { id: 'front-public', label: 'Front Public', role: 'public', colStart: 0, colEnd: 3, rowStart: 0, rowEnd: 1, acceptRoles: ['public', 'service'], priority: 2 },
    { id: 'circulation', label: 'Hall', role: 'circulation', colStart: 0, colEnd: 3, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 4 },
    { id: 'rear-private', label: 'Rear Private', role: 'private', colStart: 0, colEnd: 3, rowStart: 2, rowEnd: 3, acceptRoles: ['private', 'wet'], priority: 1 },
  ],
}

export const HOUSE_TEMPLATES: LayoutTemplate[] = [
  COMPACT_HOUSE,
  CENTRAL_HALL,
  SIDE_CORRIDOR,
  L_PLAN,
  SPLIT_WING,
  VILLA_FORMAL,
]

const DOUBLE_LOADED_CORRIDOR: LayoutTemplate = {
  id: 'double-loaded',
  name: 'Double-Loaded Corridor',
  typology: 'apartment',
  minArea: 0,
  maxArea: 9999,
  cols: 6,
  rows: 3,
  zones: [
    { id: 'units-front', label: 'Front Units', role: 'private', colStart: 0, colEnd: 6, rowStart: 0, rowEnd: 1, acceptRoles: ['private', 'public', 'wet'], priority: 1 },
    { id: 'corridor', label: 'Corridor', role: 'circulation', colStart: 0, colEnd: 6, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 4 },
    { id: 'units-rear', label: 'Rear Units', role: 'private', colStart: 0, colEnd: 6, rowStart: 2, rowEnd: 3, acceptRoles: ['private', 'wet'], priority: 1 },
  ],
}

const SINGLE_LOADED_CORRIDOR: LayoutTemplate = {
  id: 'single-loaded',
  name: 'Single-Loaded Corridor',
  typology: 'apartment',
  minArea: 0,
  maxArea: 9999,
  cols: 4,
  rows: 3,
  zones: [
    { id: 'units', label: 'Units', role: 'private', colStart: 0, colEnd: 4, rowStart: 0, rowEnd: 2, acceptRoles: ['private', 'public', 'wet'], priority: 1 },
    { id: 'corridor', label: 'Corridor', role: 'circulation', colStart: 0, colEnd: 4, rowStart: 2, rowEnd: 3, acceptRoles: ['circulation'], priority: 4 },
  ],
}

const CORE_CLUSTER: LayoutTemplate = {
  id: 'core-cluster',
  name: 'Core-Served Cluster',
  typology: 'apartment',
  minArea: 0,
  maxArea: 9999,
  cols: 4,
  rows: 4,
  zones: [
    { id: 'core', label: 'Core', role: 'core', colStart: 1, colEnd: 3, rowStart: 1, rowEnd: 3, acceptRoles: ['circulation'], priority: 5 },
    { id: 'units-nw', label: 'Units NW', role: 'private', colStart: 0, colEnd: 1, rowStart: 0, rowEnd: 2, acceptRoles: ['private', 'public'], priority: 1 },
    { id: 'units-ne', label: 'Units NE', role: 'private', colStart: 3, colEnd: 4, rowStart: 0, rowEnd: 2, acceptRoles: ['private', 'public'], priority: 1 },
    { id: 'units-sw', label: 'Units SW', role: 'private', colStart: 0, colEnd: 1, rowStart: 2, rowEnd: 4, acceptRoles: ['wet', 'private'], priority: 1 },
    { id: 'units-se', label: 'Units SE', role: 'private', colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 4, acceptRoles: ['wet', 'private'], priority: 1 },
  ],
}

export const APARTMENT_TEMPLATES: LayoutTemplate[] = [
  DOUBLE_LOADED_CORRIDOR,
  SINGLE_LOADED_CORRIDOR,
  CORE_CLUSTER,
]

const CLINIC_FRONT_REAR: LayoutTemplate = {
  id: 'clinic-standard',
  name: 'Reception + Consult Spine',
  typology: 'clinic',
  minArea: 0,
  maxArea: 9999,
  cols: 4,
  rows: 3,
  zones: [
    { id: 'front-reception', label: 'Reception / Waiting', role: 'public', colStart: 0, colEnd: 4, rowStart: 0, rowEnd: 1, acceptRoles: ['public'], priority: 2 },
    { id: 'corridor', label: 'Corridor', role: 'circulation', colStart: 0, colEnd: 4, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 4 },
    { id: 'rear-consult', label: 'Consult / Treatment', role: 'private', colStart: 0, colEnd: 4, rowStart: 2, rowEnd: 3, acceptRoles: ['private', 'wet', 'service'], priority: 1 },
  ],
}

export const CLINIC_TEMPLATES: LayoutTemplate[] = [CLINIC_FRONT_REAR]

const SCHOOL_CORRIDOR_BAR: LayoutTemplate = {
  id: 'school-corridor',
  name: 'Corridor Classroom Bar',
  typology: 'school',
  minArea: 0,
  maxArea: 9999,
  cols: 5,
  rows: 3,
  zones: [
    { id: 'classrooms', label: 'Classrooms', role: 'public', colStart: 0, colEnd: 5, rowStart: 0, rowEnd: 1, acceptRoles: ['public'], priority: 2 },
    { id: 'corridor', label: 'Verandah / Corridor', role: 'circulation', colStart: 0, colEnd: 5, rowStart: 1, rowEnd: 2, acceptRoles: ['circulation'], priority: 4 },
    { id: 'admin-support', label: 'Admin + Support', role: 'service', colStart: 0, colEnd: 5, rowStart: 2, rowEnd: 3, acceptRoles: ['service', 'wet', 'private'], priority: 1 },
  ],
}

export const SCHOOL_TEMPLATES: LayoutTemplate[] = [SCHOOL_CORRIDOR_BAR]

const RETAIL_FRONT_BACK: LayoutTemplate = {
  id: 'retail-standard',
  name: 'Front Sales + Rear Service',
  typology: 'commercial',
  minArea: 0,
  maxArea: 9999,
  cols: 3,
  rows: 2,
  zones: [
    { id: 'sales-floor', label: 'Sales Floor', role: 'public', colStart: 0, colEnd: 3, rowStart: 0, rowEnd: 1, acceptRoles: ['public'], priority: 2 },
    { id: 'service-rear', label: 'Service / Office', role: 'service', colStart: 0, colEnd: 3, rowStart: 1, rowEnd: 2, acceptRoles: ['service', 'private', 'wet', 'circulation'], priority: 1 },
  ],
}

export const RETAIL_TEMPLATES: LayoutTemplate[] = [RETAIL_FRONT_BACK]

const MIXED_USE_PODIUM: LayoutTemplate = {
  id: 'mixed-use-podium',
  name: 'Podium + Upper Residential',
  typology: 'mixed-use',
  minArea: 0,
  maxArea: 9999,
  cols: 5,
  rows: 4,
  zones: [
    { id: 'retail-front', label: 'Retail Frontage', role: 'public', colStart: 0, colEnd: 5, rowStart: 0, rowEnd: 2, acceptRoles: ['public'], priority: 2 },
    { id: 'lobby', label: 'Residential Lobby', role: 'circulation', colStart: 1, colEnd: 2, rowStart: 2, rowEnd: 3, acceptRoles: ['circulation'], priority: 4 },
    { id: 'service-rear', label: 'Service / BOH', role: 'service', colStart: 0, colEnd: 5, rowStart: 3, rowEnd: 4, acceptRoles: ['service', 'wet'], priority: 1 },
    { id: 'retail-strip', label: 'Retail Rear', role: 'public', colStart: 2, colEnd: 5, rowStart: 2, rowEnd: 3, acceptRoles: ['private', 'service'], priority: 2 },
  ],
}

export const MIXED_USE_TEMPLATES: LayoutTemplate[] = [MIXED_USE_PODIUM]

const WAREHOUSE_SHED_OFFICE: LayoutTemplate = {
  id: 'warehouse-standard',
  name: 'Warehouse + Side Office',
  typology: 'warehouse',
  minArea: 0,
  maxArea: 9999,
  cols: 3,
  rows: 2,
  zones: [
    { id: 'warehouse-bay', label: 'Warehouse Bay', role: 'service', colStart: 0, colEnd: 2, rowStart: 0, rowEnd: 2, acceptRoles: ['service', 'public'], priority: 2 },
    { id: 'office-bar', label: 'Office / Admin', role: 'private', colStart: 2, colEnd: 3, rowStart: 0, rowEnd: 2, acceptRoles: ['private', 'wet', 'circulation'], priority: 1 },
  ],
}

export const WAREHOUSE_TEMPLATES: LayoutTemplate[] = [WAREHOUSE_SHED_OFFICE]

const WORSHIP_HALL_SUPPORT: LayoutTemplate = {
  id: 'worship-standard',
  name: 'Main Hall + Rear Support',
  typology: 'worship',
  minArea: 0,
  maxArea: 9999,
  cols: 4,
  rows: 3,
  zones: [
    { id: 'sanctuary', label: 'Main Hall / Sanctuary', role: 'public', colStart: 0, colEnd: 4, rowStart: 0, rowEnd: 2, acceptRoles: ['public'], priority: 2 },
    { id: 'narthex', label: 'Narthex / Foyer', role: 'circulation', colStart: 0, colEnd: 4, rowStart: 2, rowEnd: 3, acceptRoles: ['circulation'], priority: 4 },
    { id: 'support-rear', label: 'Support / Fellowship', role: 'service', colStart: 0, colEnd: 4, rowStart: 2, rowEnd: 3, acceptRoles: ['service', 'wet', 'private'], priority: 1 },
  ],
}

export const WORSHIP_TEMPLATES: LayoutTemplate[] = [WORSHIP_HALL_SUPPORT]

export function templateForTypology(
  typology: BuildingTypology,
  area: number,
  seed = 0,
): LayoutTemplate {
  const rng = () => {
    let s = (seed + 100) % 2147483647
    if (s <= 0) s += 2147483646
    s = (s * 16807) % 2147483647
    return s
  }

  switch (typology) {
    case 'house': {
      const candidates = HOUSE_TEMPLATES.filter(t => area >= t.minArea && area <= t.maxArea)
      if (candidates.length === 0) return CENTRAL_HALL
      if (seed === 0 || candidates.length === 1) return candidates[0]
      const idx = rng() % candidates.length
      return candidates[idx]
    }
    case 'apartment': {
      const idx = rng() % APARTMENT_TEMPLATES.length
      return APARTMENT_TEMPLATES[idx]
    }
    case 'clinic':
      return CLINIC_FRONT_REAR
    case 'school':
      return SCHOOL_CORRIDOR_BAR
    case 'commercial':
    case 'office':
      return RETAIL_FRONT_BACK
    case 'mixed-use':
      return MIXED_USE_PODIUM
    case 'warehouse':
      return WAREHOUSE_SHED_OFFICE
    case 'worship':
      return WORSHIP_HALL_SUPPORT
    case 'duplex':
      return CENTRAL_HALL
    case 'townhouse':
      return COMPACT_HOUSE
    default:
      return CENTRAL_HALL
  }
}

const FLEXIBLE_ROOM_PREFIXES = [
  'Store', 'Storage', 'Pantry', 'Utility', 'Vestibule', 'Lobby',
  'Porch', 'Entry', 'Foyer', 'Mud', 'Service Corridor',
]

export function isFlexibleRoom(name: string): boolean {
  return FLEXIBLE_ROOM_PREFIXES.some(p => name.startsWith(p) || name === p)
}

export function isRequiredRoom(name: string): boolean {
  if (isFlexibleRoom(name)) return false
  // Circulation, core, and service corridors are required but compressible
  if (name === 'Circulation' || name.includes('Corridor') || name.includes('Hall')) return false
  // Everything else (bedrooms, bathrooms, kitchens, public rooms) is required
  return true
}

export function pickHouseTemplate(area: number, seed = 0): LayoutTemplate {
  const candidates = HOUSE_TEMPLATES.filter(t => area >= t.minArea && area <= t.maxArea)
  if (candidates.length === 0) return CENTRAL_HALL
  if (seed === 0 || candidates.length === 1) return candidates[0]
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  s = (s * 16807) % 2147483647
  const idx = s % candidates.length
  return candidates[idx]
}
