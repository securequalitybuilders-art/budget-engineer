import type { Typology } from './tier1-types'

const TYPOLOGIES: Typology[] = [
  {
    id: 'house-residential',
    displayName: 'House / Residential',
    aliases: ['house', 'residential', 'home', 'dwelling', 'bungalow', 'villa', 'cottage', 'standalone', 'detached'],
    sans10400Class: 'Class 1 – Single-unit dwelling',
    zbcClass: 'Part 1 – Small Buildings (residential)',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Master Bedroom', count: 1, areaM2: 16 },
      { name: 'Bedroom', count: 2, areaM2: 12 },
      { name: 'Bathroom', count: 1, areaM2: 5 },
      { name: 'Kitchen', count: 1, areaM2: 9 },
      { name: 'Living Room', count: 1, areaM2: 18 },
      { name: 'Dining Room', count: 1, areaM2: 10 },
    ],
    minRoomDimensions: {
      'Master Bedroom': { minWidth: 3.5, minDepth: 4.0 },
      'Bedroom': { minWidth: 3.0, minDepth: 3.5 },
      'Bathroom': { minWidth: 1.8, minDepth: 2.2 },
      'Kitchen': { minWidth: 2.5, minDepth: 3.0 },
      'Living Room': { minWidth: 3.5, minDepth: 4.0 },
    },
    maxStructuralSpan: 5.0,
    notes: 'Most common typology. ZBC 1996 Part 1 covers single-family dwellings with minimum room sizes.',
  },
  {
    id: 'apartment-multi',
    displayName: 'Apartment / Multi-Unit Residential',
    aliases: ['apartment', 'flat', 'condo', 'multi-unit', 'highrise', 'low-rise', 'block of flats'],
    sans10400Class: 'Class 2 – Multi-unit residential',
    zbcClass: 'Part 2 – Medium-rise residential (multi-unit)',
    defaultStoreys: 4,
    defaultProgram: [
      { name: 'Studio Unit', count: 6, areaM2: 30 },
      { name: 'One-Bedroom Unit', count: 4, areaM2: 45 },
      { name: 'Two-Bedroom Unit', count: 4, areaM2: 65 },
      { name: 'Staircase / Lift Core', count: 1, areaM2: 20 },
      { name: 'Common Corridor', count: 1, areaM2: 30 },
    ],
    minRoomDimensions: {
      'Studio Unit': { minWidth: 4.0, minDepth: 6.0 },
      'One-Bedroom Unit': { minWidth: 5.0, minDepth: 8.0 },
      'Two-Bedroom Unit': { minWidth: 6.0, minDepth: 10.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Multi-storey residential blocks common in Harare and Bulawayo. Requires lift if >3 storeys (ZBC).',
  },
  {
    id: 'clinic-health',
    displayName: 'Clinic / Health Centre',
    aliases: ['clinic', 'health centre', 'health center', 'hospital', 'medical', 'surgery', 'dispensary'],
    sans10400Class: 'Class 5 – Health care',
    zbcClass: 'Part 4 – Public assembly / health (clinic)',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Reception / Waiting', count: 1, areaM2: 20 },
      { name: 'Consultation Room', count: 2, areaM2: 12 },
      { name: 'Treatment Room', count: 1, areaM2: 15 },
      { name: 'Pharmacy / Dispensary', count: 1, areaM2: 10 },
      { name: 'Staff Room', count: 1, areaM2: 10 },
      { name: 'Toilet (Public)', count: 2, areaM2: 4 },
      { name: 'Store', count: 1, areaM2: 6 },
    ],
    minRoomDimensions: {
      'Consultation Room': { minWidth: 3.0, minDepth: 3.5 },
      'Treatment Room': { minWidth: 3.5, minDepth: 4.0 },
      'Reception / Waiting': { minWidth: 4.0, minDepth: 4.5 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Rural clinics require water tank + solar backup. ZBC Part 4 applies for public assembly.',
  },
  {
    id: 'school-classroom',
    displayName: 'School / Classroom Block',
    aliases: ['school', 'classroom', 'education', 'primary school', 'secondary school', 'college', 'university', 'learning'],
    sans10400Class: 'Class 4 – Educational',
    zbcClass: 'Part 3 – Educational facilities',
    defaultStoreys: 2,
    defaultProgram: [
      { name: 'Classroom', count: 6, areaM2: 48 },
      { name: 'Staff Room', count: 1, areaM2: 20 },
      { name: 'Head\'s Office', count: 1, areaM2: 12 },
      { name: 'Store', count: 1, areaM2: 8 },
      { name: 'Toilet Block', count: 2, areaM2: 12 },
    ],
    minRoomDimensions: {
      'Classroom': { minWidth: 6.0, minDepth: 7.5 },
      'Staff Room': { minWidth: 4.0, minDepth: 4.5 },
    },
    maxStructuralSpan: 7.5,
    notes: 'ZBC requires min 1.1 m2 per learner, natural light, cross-ventilation. Standard classroom ~48 m2 for 40 pupils.',
  },
  {
    id: 'hotel-fullservice',
    displayName: 'Hotel (Full Service)',
    aliases: ['hotel', 'lodge', 'inn', 'guest house', 'boutique hotel', 'resort'],
    sans10400Class: 'Class 3 – Hospitality / Residential transient',
    zbcClass: 'Part 2 – Hospitality (guest accommodation)',
    defaultStoreys: 3,
    defaultProgram: [
      { name: 'Guest Room', count: 20, areaM2: 28 },
      { name: 'Reception / Lobby', count: 1, areaM2: 40 },
      { name: 'Restaurant', count: 1, areaM2: 60 },
      { name: 'Kitchen (Commercial)', count: 1, areaM2: 30 },
      { name: 'Laundry', count: 1, areaM2: 15 },
      { name: 'Admin Office', count: 1, areaM2: 12 },
    ],
    minRoomDimensions: {
      'Guest Room': { minWidth: 3.5, minDepth: 5.5 },
      'Restaurant': { minWidth: 6.0, minDepth: 8.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Zimbabwe tourism sector. Guest houses common in Victoria Falls and Nyanga. Requires parking, pool, landscaping.',
  },
  {
    id: 'office-commercial',
    displayName: 'Office / Commercial',
    aliases: ['office', 'commercial', 'workspace', 'corporate', 'business park', 'coworking', 'co-working', 'administrative'],
    sans10400Class: 'Class 6 – Office / Commercial',
    zbcClass: 'Part 5 – Commercial / Office',
    defaultStoreys: 2,
    defaultProgram: [
      { name: 'Open-Plan Office', count: 2, areaM2: 60 },
      { name: 'Private Office', count: 3, areaM2: 12 },
      { name: 'Meeting Room', count: 2, areaM2: 20 },
      { name: 'Reception', count: 1, areaM2: 15 },
      { name: 'Kitchenette', count: 1, areaM2: 6 },
      { name: 'Toilet', count: 2, areaM2: 5 },
    ],
    minRoomDimensions: {
      'Open-Plan Office': { minWidth: 6.0, minDepth: 8.0 },
      'Private Office': { minWidth: 3.0, minDepth: 3.5 },
      'Meeting Room': { minWidth: 4.0, minDepth: 4.5 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Common in Harare CBD and Borrowdale. Open-plan layout with cellular offices. SANS 10400 Part N: ventilation.',
  },
  {
    id: 'retail-shop',
    displayName: 'Retail / Shop',
    aliases: ['shop', 'retail', 'store', 'boutique', 'supermarket', 'mini-mart', 'grocery', 'butchery'],
    sans10400Class: 'Class 6 – Mercantile',
    zbcClass: 'Part 5 – Retail / Mercantile',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Sales Floor', count: 1, areaM2: 80 },
      { name: 'Stock Room', count: 1, areaM2: 15 },
      { name: 'Office', count: 1, areaM2: 8 },
      { name: 'Staff Room', count: 1, areaM2: 8 },
      { name: 'Customer Toilet', count: 1, areaM2: 3 },
    ],
    minRoomDimensions: {
      'Sales Floor': { minWidth: 5.0, minDepth: 8.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Street-front retail. ZBC requires accessible entrance, fire escape if >200 m2. Common in high-density suburbs.',
  },
  {
    id: 'restaurant',
    displayName: 'Restaurant / Eatery',
    aliases: ['restaurant', 'eatery', 'cafe', 'diner', 'food court', 'fast food', 'takeaway'],
    sans10400Class: 'Class 7 – Restaurant / Food service',
    zbcClass: 'Part 5 – Food handling / Restaurant',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Dining Area', count: 1, areaM2: 50 },
      { name: 'Commercial Kitchen', count: 1, areaM2: 25 },
      { name: 'Store / Pantry', count: 1, areaM2: 6 },
      { name: 'Customer Toilet', count: 2, areaM2: 4 },
      { name: 'Office', count: 1, areaM2: 6 },
    ],
    minRoomDimensions: {
      'Dining Area': { minWidth: 5.0, minDepth: 7.0 },
      'Commercial Kitchen': { minWidth: 4.0, minDepth: 5.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'ZBC requires grease trap, ventilation hood, fire extinguisher, separate ablutions. Growing sector in Zim.',
  },
  {
    id: 'church-worship',
    displayName: 'Church / Place of Worship',
    aliases: ['church', 'chapel', 'worship', 'mosque', 'temple', 'shrine', 'cathedral', 'mission'],
    sans10400Class: 'Class 4 – Assembly / Worship',
    zbcClass: 'Part 4 – Public assembly (worship)',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Main Hall / Sanctuary', count: 1, areaM2: 150 },
      { name: 'Sunday School Room', count: 2, areaM2: 25 },
      { name: 'Pastor\'s Office', count: 1, areaM2: 10 },
      { name: 'Kitchen', count: 1, areaM2: 15 },
      { name: 'Toilet Block', count: 2, areaM2: 15 },
    ],
    minRoomDimensions: {
      'Main Hall / Sanctuary': { minWidth: 10.0, minDepth: 12.0 },
    },
    maxStructuralSpan: 10.0,
    notes: 'Assembly occupancy: ZBC requires wide exits, fire safety, disabled access. Common throughout Zimbabwe.',
  },
  {
    id: 'warehouse-industrial',
    displayName: 'Warehouse / Industrial',
    aliases: ['warehouse', 'industrial', 'factory', 'workshop', 'storage', 'manufacturing', 'depot', 'shed'],
    sans10400Class: 'Class 8 – Storage / Industrial',
    zbcClass: 'Part 6 – Industrial / Storage',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Warehouse Floor', count: 1, areaM2: 300 },
      { name: 'Office / Admin', count: 1, areaM2: 20 },
      { name: 'Staff Room', count: 1, areaM2: 12 },
      { name: 'Toilet', count: 2, areaM2: 5 },
      { name: 'Loading Bay', count: 1, areaM2: 40 },
    ],
    minRoomDimensions: {
      'Warehouse Floor': { minWidth: 12.0, minDepth: 20.0 },
    },
    maxStructuralSpan: 12.0,
    notes: 'Industrial sites require large clear-span roof, concrete floor, 6m+ eaves, loading dock. Fire rating critical.',
  },
  {
    id: 'community-hall',
    displayName: 'Community Hall',
    aliases: ['community hall', 'village hall', 'town hall', 'meeting hall', 'multi-purpose hall', 'recreation hall'],
    sans10400Class: 'Class 4 – Assembly',
    zbcClass: 'Part 4 – Public assembly (hall)',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Main Hall', count: 1, areaM2: 120 },
      { name: 'Kitchen', count: 1, areaM2: 12 },
      { name: 'Store', count: 1, areaM2: 8 },
      { name: 'Stage / Platform', count: 1, areaM2: 20 },
      { name: 'Toilet Block', count: 2, areaM2: 12 },
    ],
    minRoomDimensions: {
      'Main Hall': { minWidth: 8.0, minDepth: 12.0 },
    },
    maxStructuralSpan: 8.0,
    notes: 'Multi-use community space. Popular in rural growth points. Requires stage, sound-proofing, accessible toilets.',
  },
  {
    id: 'market',
    displayName: 'Market / Informal Trading',
    aliases: ['market', 'informal trading', 'kiosk', 'stall', 'open market', 'flea market', 'vending'],
    sans10400Class: 'Class 6 – Mercantile (informal)',
    zbcClass: 'Part 5 – Market / Trading',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Vendor Stall', count: 20, areaM2: 6 },
      { name: 'Aisle / Corridor', count: 1, areaM2: 40 },
      { name: 'Storage', count: 1, areaM2: 15 },
      { name: 'Public Toilet', count: 2, areaM2: 10 },
      { name: 'Admin Office', count: 1, areaM2: 8 },
    ],
    minRoomDimensions: {
      'Vendor Stall': { minWidth: 2.0, minDepth: 3.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Vendor markets are a key Zim economic sector. ZBC requires covered walkways, water points, ablutions, waste bins.',
  },
  {
    id: 'petrol-station',
    displayName: 'Petrol Station / Filling Station',
    aliases: ['petrol station', 'filling station', 'gas station', 'service station', 'fuel station', 'garage forecourt'],
    sans10400Class: 'Class 8 – Hazardous (fuel)',
    zbcClass: 'Part 6 – Fuel / Service station',
    defaultStoreys: 1,
    defaultProgram: [
      { name: 'Shop / Convenience', count: 1, areaM2: 25 },
      { name: 'Office', count: 1, areaM2: 8 },
      { name: 'Fuel Bay (canopy)', count: 1, areaM2: 80 },
      { name: 'Car Wash', count: 1, areaM2: 40 },
      { name: 'Toilet', count: 2, areaM2: 4 },
    ],
    minRoomDimensions: {
      'Shop / Convenience': { minWidth: 4.0, minDepth: 5.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'ZBC requires fuel storage compliance, fire suppression, set-back from road (min 10 m). Common along highways.',
  },
  {
    id: 'mixed-use',
    displayName: 'Mixed-Use (Commercial + Residential)',
    aliases: ['mixed-use', 'mixed use', 'commercial residential', 'live-work', 'shop flat', 'duplex', 'maisonette'],
    sans10400Class: 'Class 2/6 – Mixed occupancy',
    zbcClass: 'Part 5/2 – Mixed commercial/residential',
    defaultStoreys: 3,
    defaultProgram: [
      { name: 'Ground Floor Shop', count: 1, areaM2: 50 },
      { name: 'Upper Apartment', count: 2, areaM2: 55 },
      { name: 'Shared Stair / Lobby', count: 1, areaM2: 10 },
      { name: 'Store Room', count: 1, areaM2: 6 },
    ],
    minRoomDimensions: {
      'Ground Floor Shop': { minWidth: 5.0, minDepth: 8.0 },
      'Upper Apartment': { minWidth: 5.0, minDepth: 8.0 },
    },
    maxStructuralSpan: 6.0,
    notes: 'Growing trend in Zim urban centres (Harare, Bulawayo). Ground-floor retail, upper residential. Fire separation required.',
  },
  {
    id: 'duplex',
    displayName: 'Duplex / Semi-Detached',
    aliases: ['duplex', 'semi-detached', 'semi detached', 'twin villa', 'paired house'],
    sans10400Class: 'Class 1 – Single-unit dwelling (paired)',
    zbcClass: 'Part 1 – Small Buildings (paired residential)',
    defaultStoreys: 2,
    defaultProgram: [
      { name: 'Living / Dining', count: 2, areaM2: 18 },
      { name: 'Kitchen', count: 2, areaM2: 9 },
      { name: 'Master Bedroom', count: 2, areaM2: 14 },
      { name: 'Bedroom', count: 4, areaM2: 11 },
      { name: 'Bathroom', count: 2, areaM2: 5 },
      { name: 'Guest WC', count: 2, areaM2: 2.5 },
      { name: 'Stair Hall', count: 2, areaM2: 4 },
    ],
    minRoomDimensions: {
      'Living / Dining': { minWidth: 3.5, minDepth: 4.5 },
      'Master Bedroom': { minWidth: 3.5, minDepth: 3.5 },
      'Bedroom': { minWidth: 3.0, minDepth: 3.2 },
      'Kitchen': { minWidth: 2.5, minDepth: 3.0 },
      'Bathroom': { minWidth: 1.8, minDepth: 2.0 },
    },
    maxStructuralSpan: 5.0,
    notes: 'Two mirror-image units sharing a party wall. Common in Zim high-density suburbs. Ground floor: living/kitchen/WC. Upper: bedrooms/bathroom.',
  },
]

const TYPOLOGY_MAP = new Map(TYPOLOGIES.map((t) => [t.id, t]))

export function getTypology(id: string): Typology | undefined {
  return TYPOLOGY_MAP.get(id)
}

export function getAllTypologies(): Typology[] {
  return TYPOLOGIES
}

export function detectTypology(text: string): { typology: Typology | null; confidence: number } {
  const lower = text.toLowerCase()
  let best: { typology: Typology | null; confidence: number } = { typology: null, confidence: 0 }

  for (const t of TYPOLOGIES) {
    let matchCount = 0
    for (const alias of t.aliases) {
      const pattern = new RegExp(`\\b${alias.replace(/[^a-z0-9]/g, (c) => `\\${c}`)}\\b`, 'i')
      if (pattern.test(lower)) {
        matchCount++
      }
    }
    if (matchCount > 0) {
      const confidence = Math.min(1, matchCount * 0.35 + 0.1)
      if (confidence > best.confidence) {
        best = { typology: t, confidence }
      }
    }
  }

  return best
}
