export type BuildingTypology =
  | 'house' | 'traditional-house' | 'villa' | 'duplex'
  | 'apartment-block' | 'clinic' | 'school'
  | 'hotel' | 'office' | 'shop' | 'church'
  | 'warehouse' | 'community-hall' | 'mixed-use'
  | 'unknown'

export type FacadeOrientation = 'front' | 'side' | 'rear'

export interface FacadeStyle {
  name: string
  typology: BuildingTypology
  plinthFill: string
  plinthStroke: string
  wallFill: string
  wallStroke: string
  fasciaFill: string
  fasciaStroke: string
  accentBandColor: string
  accentBandCount: number
  hasParapet: boolean
  hasQuoins: boolean
  hasPortico: boolean
  porticoWidth: number
  verandahDepth: number
  hasVerandah: boolean
  roofFill: string
  roofStroke: string
}

const STYLES: Record<BuildingTypology, FacadeStyle> = {
  house: {
    name: 'Residential Modern',
    typology: 'house',
    plinthFill: '#d6cfc4', plinthStroke: '#a8a29e',
    wallFill: '#fef3c7', wallStroke: '#f8fafc',
    fasciaFill: '#e7e5e4', fasciaStroke: '#d6d3d1',
    accentBandColor: '#92400e', accentBandCount: 1,
    hasParapet: false, hasQuoins: false,
    hasPortico: true, porticoWidth: 1.8,
    verandahDepth: 1.8, hasVerandah: true,
    roofFill: 'rgba(255,255,255,0.08)', roofStroke: '#f8fafc',
  },
  'traditional-house': {
    name: 'Residential Traditional',
    typology: 'traditional-house',
    plinthFill: '#a8a29e', plinthStroke: '#78716c',
    wallFill: '#fef9c3', wallStroke: '#f8fafc',
    fasciaFill: '#d6d3d1', fasciaStroke: '#a8a29e',
    accentBandColor: '#78716c', accentBandCount: 2,
    hasParapet: false, hasQuoins: true,
    hasPortico: true, porticoWidth: 2.0,
    verandahDepth: 2.4, hasVerandah: true,
    roofFill: 'rgba(180,130,80,0.12)', roofStroke: '#a8a29e',
  },
  villa: {
    name: 'Villa Luxury',
    typology: 'villa',
    plinthFill: '#cbd5e1', plinthStroke: '#94a3b8',
    wallFill: '#fefce8', wallStroke: '#f8fafc',
    fasciaFill: '#e2e8f0', fasciaStroke: '#cbd5e1',
    accentBandColor: '#1e40af', accentBandCount: 1,
    hasParapet: false, hasQuoins: true,
    hasPortico: true, porticoWidth: 2.4,
    verandahDepth: 3.0, hasVerandah: true,
    roofFill: 'rgba(255,215,0,0.06)', roofStroke: '#e2e8f0',
  },
  duplex: {
    name: 'Duplex',
    typology: 'duplex',
    plinthFill: '#d6cfc4', plinthStroke: '#a8a29e',
    wallFill: '#fef3c7', wallStroke: '#f8fafc',
    fasciaFill: '#e7e5e4', fasciaStroke: '#d6d3d1',
    accentBandColor: '#92400e', accentBandCount: 1,
    hasParapet: false, hasQuoins: false,
    hasPortico: true, porticoWidth: 1.6,
    verandahDepth: 1.5, hasVerandah: true,
    roofFill: 'rgba(255,255,255,0.08)', roofStroke: '#f8fafc',
  },
  'apartment-block': {
    name: 'Apartment Block',
    typology: 'apartment-block',
    plinthFill: '#9ca3af', plinthStroke: '#6b7280',
    wallFill: '#f3f4f6', wallStroke: '#d1d5db',
    fasciaFill: '#d1d5db', fasciaStroke: '#9ca3af',
    accentBandColor: '#4b5563', accentBandCount: 3,
    hasParapet: true, hasQuoins: false,
    hasPortico: false, porticoWidth: 0,
    verandahDepth: 0, hasVerandah: false,
    roofFill: '#d1d5db', roofStroke: '#9ca3af',
  },
  clinic: {
    name: 'Clinic / Institutional',
    typology: 'clinic',
    plinthFill: '#bbf7d0', plinthStroke: '#86efac',
    wallFill: '#f0fdf4', wallStroke: '#dcfce7',
    fasciaFill: '#86efac', fasciaStroke: '#4ade80',
    accentBandColor: '#22c55e', accentBandCount: 1,
    hasParapet: false, hasQuoins: false,
    hasPortico: true, porticoWidth: 2.4,
    verandahDepth: 2.0, hasVerandah: true,
    roofFill: 'rgba(74,222,128,0.08)', roofStroke: '#86efac',
  },
  school: {
    name: 'School / Educational',
    typology: 'school',
    plinthFill: '#fde68a', plinthStroke: '#fcd34d',
    wallFill: '#fffbea', wallStroke: '#fef3c7',
    fasciaFill: '#fcd34d', fasciaStroke: '#f59e0b',
    accentBandColor: '#d97706', accentBandCount: 2,
    hasParapet: false, hasQuoins: false,
    hasPortico: true, porticoWidth: 2.0,
    verandahDepth: 2.4, hasVerandah: true,
    roofFill: 'rgba(251,191,36,0.08)', roofStroke: '#fcd34d',
  },
  hotel: {
    name: 'Hotel / Hospitality',
    typology: 'hotel',
    plinthFill: '#c7d2fe', plinthStroke: '#a5b4fc',
    wallFill: '#eef2ff', wallStroke: '#e0e7ff',
    fasciaFill: '#a5b4fc', fasciaStroke: '#818cf8',
    accentBandColor: '#4338ca', accentBandCount: 1,
    hasParapet: false, hasQuoins: true,
    hasPortico: true, porticoWidth: 3.0,
    verandahDepth: 2.4, hasVerandah: true,
    roofFill: 'rgba(99,102,241,0.06)', roofStroke: '#a5b4fc',
  },
  office: {
    name: 'Office / Commercial',
    typology: 'office',
    plinthFill: '#9ca3af', plinthStroke: '#6b7280',
    wallFill: '#f9fafb', wallStroke: '#e5e7eb',
    fasciaFill: '#d1d5db', fasciaStroke: '#9ca3af',
    accentBandColor: '#374151', accentBandCount: 2,
    hasParapet: true, hasQuoins: false,
    hasPortico: false, porticoWidth: 0,
    verandahDepth: 0, hasVerandah: false,
    roofFill: '#d1d5db', roofStroke: '#9ca3af',
  },
  shop: {
    name: 'Retail / Streetfront',
    typology: 'shop',
    plinthFill: '#fca5a5', plinthStroke: '#f87171',
    wallFill: '#fff5f5', wallStroke: '#fecaca',
    fasciaFill: '#f87171', fasciaStroke: '#ef4444',
    accentBandColor: '#b91c1c', accentBandCount: 1,
    hasParapet: true, hasQuoins: false,
    hasPortico: false, porticoWidth: 0,
    verandahDepth: 1.5, hasVerandah: true,
    roofFill: 'rgba(248,113,113,0.08)', roofStroke: '#f87171',
  },
  church: {
    name: 'Worship / Monumental',
    typology: 'church',
    plinthFill: '#d6d3d1', plinthStroke: '#a8a29e',
    wallFill: '#fafaf9', wallStroke: '#e7e5e4',
    fasciaFill: '#a8a29e', fasciaStroke: '#78716c',
    accentBandColor: '#57534e', accentBandCount: 1,
    hasParapet: false, hasQuoins: true,
    hasPortico: true, porticoWidth: 3.0,
    verandahDepth: 0, hasVerandah: false,
    roofFill: 'rgba(80,60,40,0.10)', roofStroke: '#a8a29e',
  },
  warehouse: {
    name: 'Warehouse / Industrial',
    typology: 'warehouse',
    plinthFill: '#a3a3a3', plinthStroke: '#737373',
    wallFill: '#f5f5f4', wallStroke: '#d6d3d1',
    fasciaFill: '#a3a3a3', fasciaStroke: '#737373',
    accentBandColor: '#525252', accentBandCount: 0,
    hasParapet: true, hasQuoins: false,
    hasPortico: false, porticoWidth: 0,
    verandahDepth: 0, hasVerandah: false,
    roofFill: '#a3a3a3', roofStroke: '#737373',
  },
  'community-hall': {
    name: 'Community / Civic',
    typology: 'community-hall',
    plinthFill: '#e2e8f0', plinthStroke: '#cbd5e1',
    wallFill: '#f8fafc', wallStroke: '#e2e8f0',
    fasciaFill: '#cbd5e1', fasciaStroke: '#94a3b8',
    accentBandColor: '#475569', accentBandCount: 1,
    hasParapet: false, hasQuoins: false,
    hasPortico: true, porticoWidth: 2.4,
    verandahDepth: 2.0, hasVerandah: true,
    roofFill: 'rgba(148,163,184,0.10)', roofStroke: '#cbd5e1',
  },
  'mixed-use': {
    name: 'Mixed-Use Building',
    typology: 'mixed-use',
    plinthFill: '#d4d4d8', plinthStroke: '#a1a1aa',
    wallFill: '#f4f4f5', wallStroke: '#d4d4d8',
    fasciaFill: '#d4d4d8', fasciaStroke: '#a1a1aa',
    accentBandColor: '#3f3f46', accentBandCount: 2,
    hasParapet: true, hasQuoins: false,
    hasPortico: false, porticoWidth: 0,
    verandahDepth: 0, hasVerandah: false,
    roofFill: '#d4d4d8', roofStroke: '#a1a1aa',
  },
  unknown: {
    name: 'Default',
    typology: 'unknown',
    plinthFill: '#d6cfc4', plinthStroke: '#a8a29e',
    wallFill: '#fef3c7', wallStroke: '#f8fafc',
    fasciaFill: '#e7e5e4', fasciaStroke: '#d6d3d1',
    accentBandColor: '#92400e', accentBandCount: 0,
    hasParapet: false, hasQuoins: false,
    hasPortico: false, porticoWidth: 0,
    verandahDepth: 0, hasVerandah: false,
    roofFill: 'rgba(255,255,255,0.08)', roofStroke: '#f8fafc',
  },
}

const MATCH_ORDER: { pattern: string; typology: BuildingTypology }[] = [
  { pattern: 'mixed-use', typology: 'mixed-use' },
  { pattern: 'live-work', typology: 'mixed-use' },
  { pattern: 'community hall', typology: 'community-hall' },
  { pattern: 'community hall', typology: 'community-hall' },
  { pattern: 'traditional house', typology: 'traditional-house' },
  { pattern: 'traditional', typology: 'traditional-house' },
  { pattern: 'apartment', typology: 'apartment-block' },
  { pattern: 'flat', typology: 'apartment-block' },
  { pattern: 'clinic', typology: 'clinic' },
  { pattern: 'hospital', typology: 'clinic' },
  { pattern: 'school', typology: 'school' },
  { pattern: 'college', typology: 'school' },
  { pattern: 'university', typology: 'school' },
  { pattern: 'hotel', typology: 'hotel' },
  { pattern: 'lodge', typology: 'hotel' },
  { pattern: 'office', typology: 'office' },
  { pattern: 'commercial', typology: 'office' },
  { pattern: 'shop', typology: 'shop' },
  { pattern: 'retail', typology: 'shop' },
  { pattern: 'church', typology: 'church' },
  { pattern: 'mosque', typology: 'church' },
  { pattern: 'temple', typology: 'church' },
  { pattern: 'worship', typology: 'church' },
  { pattern: 'warehouse', typology: 'warehouse' },
  { pattern: 'factory', typology: 'warehouse' },
  { pattern: 'industrial', typology: 'warehouse' },
  { pattern: 'villa', typology: 'villa' },
  { pattern: 'duplex', typology: 'duplex' },
  { pattern: 'semi-detached', typology: 'duplex' },
  { pattern: 'house', typology: 'house' },
]

export function getFacadeStyle(buildingType: string): FacadeStyle {
  const bt = buildingType.toLowerCase().replace(/[-\s]/g, ' ').trim()
  for (const { pattern, typology } of MATCH_ORDER) {
    if (bt === pattern || bt.startsWith(pattern + ' ') || bt.endsWith(' ' + pattern) || bt.includes(' ' + pattern + ' ') || bt.startsWith(pattern + '-') || bt.endsWith('-' + pattern)) {
      return STYLES[typology]
    }
  }
  if (bt.includes('apartment') || bt.includes('flat')) return STYLES['apartment-block']
  if (bt.includes('clinic') || bt.includes('hospital') || bt.includes('health')) return STYLES.clinic
  if (bt.includes('school') || bt.includes('college') || bt.includes('university')) return STYLES.school
  if (bt.includes('hotel') || bt.includes('lodge') || bt.includes('inn')) return STYLES.hotel
  if (bt.includes('office') || bt.includes('commercial')) return STYLES.office
  if (bt.includes('shop') || bt.includes('retail') || bt.includes('store')) return STYLES.shop
  if (bt.includes('church') || bt.includes('mosque') || bt.includes('temple') || bt.includes('worship')) return STYLES.church
  if (bt.includes('warehouse') || bt.includes('factory') || bt.includes('industrial')) return STYLES.warehouse
  if (bt.includes('hall') || bt.includes('community')) return STYLES['community-hall']
  if (bt.includes('mixed') || bt.includes('live-work')) return STYLES['mixed-use']
  if (bt.includes('traditional') || bt.includes('vernacular')) return STYLES['traditional-house']
  if (bt.includes('villa')) return STYLES.villa
  if (bt.includes('duplex') || bt.includes('semi')) return STYLES.duplex
  return STYLES.unknown
}

export function getFacadeOrientation(planWidth: number, planDepth: number): FacadeOrientation {
  if (planWidth >= planDepth) return 'front'
  return 'side'
}

export function detectVerandah(buildingType: string): boolean {
  const style = getFacadeStyle(buildingType)
  return style.hasVerandah
}

export function getVerandahDepth(buildingType: string): number {
  const style = getFacadeStyle(buildingType)
  return style.verandahDepth
}

export function detectPortico(buildingType: string): boolean {
  const style = getFacadeStyle(buildingType)
  return style.hasPortico
}

export function getPorticoWidth(buildingType: string): number {
  const style = getFacadeStyle(buildingType)
  return style.porticoWidth
}
