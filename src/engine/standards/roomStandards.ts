/**
 * Room Standards — single authoritative source for minimum room dimensions.
 *
 * Encodes the Zimbabwe room-standards table (gemini.md §5) plus the extended
 * SADC room inventory used across the engine. Every room minimum in the
 * codebase should resolve through this module so plan generation, tier3
 * layout, typology knowledge and classification stay consistent.
 *
 * The 13 §5 rooms carry spec values (minAreaM2 / minWidth / minDepth /
 * minCeilingHeight / naturalLightM2 / ventilation). All other rooms carry the
 * historical engine values that generation has been validated against.
 */

export type RoomZone = 'public' | 'private' | 'service' | 'circulation'

export interface RoomMinimums {
  minWidth: number
  minDepth: number
}

export interface RoomStandard extends RoomMinimums {
  /** Canonical room name (registry key). */
  name: string
  zone: RoomZone
  isWetCore: boolean
  /** Minimum floor area from the §5 table (m²). */
  minAreaM2?: number
  /** Minimum ceiling height (m). */
  minCeilingHeight?: number
  /** Minimum natural-light glazing area (m²). */
  naturalLightM2?: number
  /** Whether natural ventilation is required. */
  ventilation?: boolean
}

const DEFAULT_STANDARD: RoomStandard = {
  name: '(unknown)',
  zone: 'private',
  isWetCore: false,
  minWidth: 2.0,
  minDepth: 2.0,
}

export const ROOM_STANDARDS: Record<string, RoomStandard> = {
  // ── Residential ──
  'Master Bedroom': { name: 'Master Bedroom', zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 4.0, minAreaM2: 14, minCeilingHeight: 2.4, naturalLightM2: 1.4, ventilation: true },
  'Guest Bedroom': { name: 'Guest Bedroom', zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Bedroom': { name: 'Bedroom', zone: 'private', isWetCore: false, minWidth: 2.7, minDepth: 3.0, minAreaM2: 7.5, minCeilingHeight: 2.4, naturalLightM2: 0.75, ventilation: true },
  'Bedroom 1': { name: 'Bedroom 1', zone: 'private', isWetCore: false, minWidth: 2.7, minDepth: 3.0, minAreaM2: 7.5, minCeilingHeight: 2.4, naturalLightM2: 0.75, ventilation: true },
  'Bedroom 2': { name: 'Bedroom 2', zone: 'private', isWetCore: false, minWidth: 2.7, minDepth: 3.0, minAreaM2: 7.5, minCeilingHeight: 2.4, naturalLightM2: 0.75, ventilation: true },
  'Bedroom 3': { name: 'Bedroom 3', zone: 'private', isWetCore: false, minWidth: 2.7, minDepth: 3.0, minAreaM2: 7.5, minCeilingHeight: 2.4, naturalLightM2: 0.75, ventilation: true },
  'En-suite': { name: 'En-suite', zone: 'service', isWetCore: true, minWidth: 1.8, minDepth: 2.2 },
  'Guest WC': { name: 'Guest WC', zone: 'service', isWetCore: true, minWidth: 1.5, minDepth: 1.5 },
  'Bathroom': { name: 'Bathroom', zone: 'service', isWetCore: true, minWidth: 1.5, minDepth: 1.8, minAreaM2: 2.8, minCeilingHeight: 2.1, ventilation: true },
  'Bathroom 1': { name: 'Bathroom 1', zone: 'service', isWetCore: true, minWidth: 1.5, minDepth: 1.8, minAreaM2: 2.8, minCeilingHeight: 2.1, ventilation: true },
  'Bathroom 2': { name: 'Bathroom 2', zone: 'service', isWetCore: true, minWidth: 1.5, minDepth: 1.8, minAreaM2: 2.8, minCeilingHeight: 2.1, ventilation: true },
  'Kitchen': { name: 'Kitchen', zone: 'service', isWetCore: true, minWidth: 2.1, minDepth: 2.4, minAreaM2: 5, minCeilingHeight: 2.4, naturalLightM2: 0.5, ventilation: true },
  'Laundry': { name: 'Laundry', zone: 'service', isWetCore: true, minWidth: 1.8, minDepth: 2.0 },
  'Pantry': { name: 'Pantry', zone: 'service', isWetCore: true, minWidth: 1.5, minDepth: 2.0 },
  'Living Room': { name: 'Living Room', zone: 'public', isWetCore: false, minWidth: 3.0, minDepth: 3.5, minAreaM2: 10, minCeilingHeight: 2.4, naturalLightM2: 1.0, ventilation: true },
  'Living / Dining': { name: 'Living / Dining', zone: 'public', isWetCore: false, minWidth: 3.5, minDepth: 4.5 },
  'Living / Kitchen / Dining': { name: 'Living / Kitchen / Dining', zone: 'public', isWetCore: false, minWidth: 3.5, minDepth: 3.5 },
  'Lounge / Dining': { name: 'Lounge / Dining', zone: 'public', isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Dining Room': { name: 'Dining Room', zone: 'public', isWetCore: false, minWidth: 2.7, minDepth: 3.0, minAreaM2: 8, minCeilingHeight: 2.4, naturalLightM2: 0.8, ventilation: true },
  'Lounge': { name: 'Lounge', zone: 'public', isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Study': { name: 'Study', zone: 'private', isWetCore: false, minWidth: 2.5, minDepth: 2.5 },
  'Study / Flex': { name: 'Study / Flex', zone: 'private', isWetCore: false, minWidth: 2.5, minDepth: 2.5 },
  'Playroom': { name: 'Playroom', zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Verandah': { name: 'Verandah', zone: 'public', isWetCore: false, minWidth: 1.8, minDepth: 3.0 },
  'Veranda': { name: 'Veranda', zone: 'public', isWetCore: false, minWidth: 1.5, minDepth: 2.0 },
  'Porch': { name: 'Porch', zone: 'public', isWetCore: false, minWidth: 1.5, minDepth: 2.0 },
  'Garage': { name: 'Garage', zone: 'service', isWetCore: false, minWidth: 3.0, minDepth: 5.5 },

  // ── Apartment / Multi-Unit ──
  'Studio Unit': { name: 'Studio Unit', zone: 'private', isWetCore: false, minWidth: 4.0, minDepth: 6.0 },
  'One-Bedroom Unit': { name: 'One-Bedroom Unit', zone: 'private', isWetCore: false, minWidth: 5.0, minDepth: 8.0 },
  'Two-Bedroom Unit': { name: 'Two-Bedroom Unit', zone: 'private', isWetCore: false, minWidth: 6.0, minDepth: 10.0 },
  'Staircase / Lift Core': { name: 'Staircase / Lift Core', zone: 'circulation', isWetCore: false, minWidth: 3.0, minDepth: 5.0 },
  'Common Corridor': { name: 'Common Corridor', zone: 'circulation', isWetCore: false, minWidth: 1.5, minDepth: 3.0 },

  // ── Clinic / Health ──
  'Consultation Room': { name: 'Consultation Room', zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5, minAreaM2: 10, minCeilingHeight: 2.4, naturalLightM2: 1.0, ventilation: true },
  'Treatment Room': { name: 'Treatment Room', zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 4.0 },
  'Reception': { name: 'Reception', zone: 'public', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Reception / Waiting': { name: 'Reception / Waiting', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Reception / Lobby': { name: 'Reception / Lobby', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Pharmacy / Dispensary': { name: 'Pharmacy / Dispensary', zone: 'service', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Ward': { name: 'Ward', zone: 'private', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  'Operating Theatre': { name: 'Operating Theatre', zone: 'private', isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Nurse Station': { name: 'Nurse Station', zone: 'service', isWetCore: false, minWidth: 2.5, minDepth: 3.0 },
  'Staff Room': { name: 'Staff Room', zone: 'service', isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Laboratory': { name: 'Laboratory', zone: 'service', isWetCore: false, minWidth: 3.5, minDepth: 4.5 },

  // ── School / Education ──
  'Classroom': { name: 'Classroom', zone: 'public', isWetCore: false, minWidth: 6.0, minDepth: 7.0, minAreaM2: 42, minCeilingHeight: 2.7, naturalLightM2: 4.2, ventilation: true },
  "Head's Office": { name: "Head's Office", zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Library': { name: 'Library', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Computer Lab': { name: 'Computer Lab', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Science Lab': { name: 'Science Lab', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Assembly Hall': { name: 'Assembly Hall', zone: 'public', isWetCore: false, minWidth: 8.0, minDepth: 12.0 },
  'Toilet Block': { name: 'Toilet Block', zone: 'service', isWetCore: true, minWidth: 3.0, minDepth: 4.0 },

  // ── Hotel / Hospitality ──
  'Guest Room': { name: 'Guest Room', zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 4.5, minAreaM2: 16, minCeilingHeight: 2.4, naturalLightM2: 1.6, ventilation: true },
  'Restaurant': { name: 'Restaurant', zone: 'public', isWetCore: false, minWidth: 6.0, minDepth: 8.0 },
  'Bar': { name: 'Bar', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  'Swimming Pool': { name: 'Swimming Pool', zone: 'public', isWetCore: false, minWidth: 6.0, minDepth: 12.0 },
  'Conference Room': { name: 'Conference Room', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 6.0 },
  'Kitchen (Commercial)': { name: 'Kitchen (Commercial)', zone: 'service', isWetCore: true, minWidth: 4.0, minDepth: 5.0 },
  'Admin Office': { name: 'Admin Office', zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },

  // ── Office / Commercial ──
  'Open-Plan Office': { name: 'Open-Plan Office', zone: 'public', isWetCore: false, minWidth: 6.0, minDepth: 8.0 },
  'Private Office': { name: 'Private Office', zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },
  'Meeting Room': { name: 'Meeting Room', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 4.5 },
  'Office': { name: 'Office', zone: 'private', isWetCore: false, minWidth: 2.5, minDepth: 3.0, minAreaM2: 8, minCeilingHeight: 2.4, naturalLightM2: 0.8, ventilation: true },
  'Kitchenette': { name: 'Kitchenette', zone: 'service', isWetCore: true, minWidth: 2.0, minDepth: 2.0 },

  // ── Retail / Shop ──
  'Sales Floor': { name: 'Sales Floor', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 8.0 },
  'Stock Room': { name: 'Stock Room', zone: 'service', isWetCore: false, minWidth: 3.0, minDepth: 4.0 },
  'Display Area': { name: 'Display Area', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },

  // ── Restaurant ──
  'Dining Area': { name: 'Dining Area', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 7.0 },
  'Counter / Bar': { name: 'Counter / Bar', zone: 'public', isWetCore: false, minWidth: 2.0, minDepth: 4.0 },

  // ── Church / Worship ──
  'Main Hall / Sanctuary': { name: 'Main Hall / Sanctuary', zone: 'public', isWetCore: false, minWidth: 10.0, minDepth: 12.0 },
  'Main Hall': { name: 'Main Hall', zone: 'public', isWetCore: false, minWidth: 8.0, minDepth: 12.0 },
  'Sunday School Room': { name: 'Sunday School Room', zone: 'private', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  "Pastor's Office": { name: "Pastor's Office", zone: 'private', isWetCore: false, minWidth: 3.0, minDepth: 3.5 },

  // ── Warehouse / Industrial ──
  'Warehouse Floor': { name: 'Warehouse Floor', zone: 'public', isWetCore: false, minWidth: 12.0, minDepth: 20.0 },
  'Loading Bay': { name: 'Loading Bay', zone: 'service', isWetCore: false, minWidth: 4.0, minDepth: 8.0 },

  // ── Community Hall ──
  'Stage / Platform': { name: 'Stage / Platform', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },

  // ── Market ──
  'Vendor Stall': { name: 'Vendor Stall', zone: 'public', isWetCore: false, minWidth: 2.0, minDepth: 3.0 },
  'Aisle / Corridor': { name: 'Aisle / Corridor', zone: 'circulation', isWetCore: false, minWidth: 1.5, minDepth: 2.0 },

  // ── Petrol Station ──
  'Shop / Convenience': { name: 'Shop / Convenience', zone: 'public', isWetCore: false, minWidth: 4.0, minDepth: 5.0 },
  'Fuel Bay (canopy)': { name: 'Fuel Bay (canopy)', zone: 'service', isWetCore: false, minWidth: 6.0, minDepth: 10.0 },
  'Car Wash': { name: 'Car Wash', zone: 'service', isWetCore: true, minWidth: 4.0, minDepth: 8.0 },

  // ── Mixed-Use ──
  'Ground Floor Shop': { name: 'Ground Floor Shop', zone: 'public', isWetCore: false, minWidth: 5.0, minDepth: 8.0 },
  'Upper Apartment': { name: 'Upper Apartment', zone: 'private', isWetCore: false, minWidth: 5.0, minDepth: 8.0 },

  // ── Duplex ──
  'Stair Hall': { name: 'Stair Hall', zone: 'circulation', isWetCore: false, minWidth: 1.8, minDepth: 2.5 },

  // ── General ──
  'Store': { name: 'Store', zone: 'service', isWetCore: false, minWidth: 1.5, minDepth: 1.5 },
  'Toilet': { name: 'Toilet', zone: 'service', isWetCore: true, minWidth: 0.8, minDepth: 1.2, minAreaM2: 1.0, minCeilingHeight: 2.1, ventilation: true },
  'Toilet (Public)': { name: 'Toilet (Public)', zone: 'service', isWetCore: true, minWidth: 2.0, minDepth: 2.5 },
  'Customer Toilet': { name: 'Customer Toilet', zone: 'service', isWetCore: true, minWidth: 1.8, minDepth: 2.2 },
  'Circulation': { name: 'Circulation', zone: 'circulation', isWetCore: false, minWidth: 1.5, minDepth: 1.5 },
  'Corridor': { name: 'Corridor', zone: 'circulation', isWetCore: false, minWidth: 0.9, minDepth: 2.0, minCeilingHeight: 2.1, ventilation: false },
  'Staircase': { name: 'Staircase', zone: 'circulation', isWetCore: false, minWidth: 0.9, minDepth: 2.4, minAreaM2: 2.2, minCeilingHeight: 2.1, ventilation: false },
}

/**
 * Specific-first prefixes so generic keys never shadow their specialised
 * variants (e.g. 'Toilet (Public)' before 'Toilet', 'Staircase / Lift Core'
 * before 'Staircase'). Exact registry matches are tried before prefixes.
 */
const SPECIFIC_PREFIXES: string[] = [
  'Reception / Waiting',
  'Reception / Lobby',
  'Main Hall / Sanctuary',
  'Staircase / Lift Core',
  'Kitchen (Commercial)',
  'Pharmacy / Dispensary',
  'Sunday School Room',
  "Head's Office",
  "Pastor's Office",
  'Stage / Platform',
  'Shop / Convenience',
  'Fuel Bay (canopy)',
  'Ground Floor Shop',
  'Warehouse Floor',
  'Loading Bay',
  'Aisle / Corridor',
  'Vendor Stall',
  'Stair Hall',
  'Common Corridor',
  'One-Bedroom Unit',
  'Two-Bedroom Unit',
  'Toilet Block',
  'Toilet (Public)',
  'Customer Toilet',
  'Open-Plan Office',
  'Private Office',
  'Meeting Room',
  'Consultation Room',
  'Treatment Room',
  'Sales Floor',
  'Dining Area',
  'Classroom',
  'Master Bedroom',
  'Guest Bedroom',
  'Guest Room',
  'Guest WC',
  'Living Room',
  'Living / Dining',
  'Lounge / Dining',
  'Dining Room',
  'Study / Flex',
  'Bathroom',
  'Kitchenette',
  'Kitchen',
  'Bedroom',
  'Office',
  'Store',
  'Garage',
  'Toilet',
  'Corridor',
  'Staircase',
  'Lounge',
  'Laundry',
  'Pantry',
  'Verandah',
  'Porch',
  'Study',
  'Playroom',
  'Reception',
]

/** Names that never match a prefix and resolve only by exact lookup. */
const EXACT_ONLY = new Set(['Toilet', 'Staircase'])

/** Strip a trailing space + number ("Bedroom 2" → "Bedroom"). */
function stripTrailingNumber(name: string): string {
  return name.replace(/\s+\d+$/, '').trim()
}

function getStandard(name: string): RoomStandard | undefined {
  return ROOM_STANDARDS[name]
}

/** Resolve a room standard for a name using exact → prefix → keyword lookup. */
export function getRoomStandard(name: string): RoomStandard {
  const lookup = stripTrailingNumber(name)
  const exact = getStandard(lookup)
  if (exact) return exact

  for (const prefix of SPECIFIC_PREFIXES) {
    if (EXACT_ONLY.has(prefix)) continue
    if (lookup.startsWith(prefix)) return ROOM_STANDARDS[prefix]
  }

  const kw: Array<[string, string]> = [
    ['Open Plan Office', 'Open-Plan Office'],
    ['Commercial Kitchen', 'Kitchen (Commercial)'],
    ['Fuel Bay', 'Fuel Bay (canopy)'],
    ['Stairwell', 'Staircase'],
    ['Stair', 'Staircase'],
    ['Bedroom', 'Bedroom'],
    ['Bathroom', 'Bathroom'],
    ['Kitchen', 'Kitchen'],
    ['Office', 'Office'],
    ['Store', 'Store'],
    ['Toilet', 'Toilet'],
    ['Classroom', 'Classroom'],
    ['Reception', 'Reception / Waiting'],
    ['Corridor', 'Corridor'],
    ['Hall', 'Corridor'],
    ['Aisle', 'Aisle / Corridor'],
    ['Lobby', 'Reception / Lobby'],
    ['Waiting', 'Reception / Waiting'],
    ['Dispensary', 'Pharmacy / Dispensary'],
    ['Admin', 'Admin Office'],
    ['Living', 'Living Room'],
  ]
  for (const [needle, mapped] of kw) {
    if (lookup.includes(needle)) return ROOM_STANDARDS[mapped]
  }

  return DEFAULT_STANDARD
}

/** Minimum width/depth for a room name (used by plan generation + validation). */
export function getMinimumDimensions(name: string): RoomMinimums {
  const std = getRoomStandard(name)
  return { minWidth: std.minWidth, minDepth: std.minDepth }
}

/** The 13 Zimbabwe §5 table rows, by canonical name. */
const SPEC_NAMES: string[] = [
  'Master Bedroom',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Living Room',
  'Dining Room',
  'Toilet',
  'Corridor',
  'Staircase',
  'Classroom',
  'Consultation Room',
  'Guest Room',
  'Office',
]

/** All §5 table rows (spec-backed standards), keyed by canonical name. */
export function listSpecStandards(): RoomStandard[] {
  return SPEC_NAMES.map((name) => ROOM_STANDARDS[name])
}
