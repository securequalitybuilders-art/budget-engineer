/**
 * RPLAN / MSD spatial reference dataset loader.
 *
 * Provides deterministic reference spatial patterns for common typologies
 * (office, residential, hospitality) based on published research datasets:
 *   - RPLAN (Zheng et al., 2022) — 122k residential floor plans
 *   - MSD (Building Typologies Design Guide §3) — Zimbabwe spatial programming
 *
 * All data is embedded — no network, no file I/O.  The loader is a pure
 * lookup that returns canonical room-program + adjacency patterns for a
 * given typology, useful for seeding the dual-encoder allocator or for
 * validating generated layouts against known-good proportions.
 */

import type { AdjacencyRule, ProgramItem } from '../tier1-types'
import type { OccupancyClass } from './topological-graph'

export interface ReferenceProgram {
  typologyId: string
  /** Canonical room program (SADC standard names). */
  program: ProgramItem[]
  /** Dominant occupancy class. */
  occupancyClass: OccupancyClass
  /** Floor-plate efficiency (net/gross, 0–1). */
  efficiency: number
  /** Average room area in m² (across the program). */
  avgRoomAreaM2: number
  /** Preferred structural grid in metres. */
  structuralGridM: number
  /** Source reference. */
  source: string
}

export interface ReferenceAdjacency {
  typologyId: string
  rules: AdjacencyRule[]
  source: string
}

// ─── RPLAN residential reference (3-bedroom house archetype) ─────────

const RPLAN_HOUSE: ReferenceProgram = {
  typologyId: 'house-residential',
  program: [
    { name: 'Living Room', count: 1, areaM2: 18 },
    { name: 'Dining Room', count: 1, areaM2: 10 },
    { name: 'Kitchen', count: 1, areaM2: 9 },
    { name: 'Master Bedroom', count: 1, areaM2: 14 },
    { name: 'Bedroom', count: 2, areaM2: 11 },
    { name: 'Bathroom', count: 2, areaM2: 5 },
    { name: 'Toilet', count: 1, areaM2: 2 },
    { name: 'Corridor', count: 1, areaM2: 6 },
    { name: 'Staircase', count: 1, areaM2: 4 },
  ],
  occupancyClass: 'B2',
  efficiency: 0.72,
  avgRoomAreaM2: 8.7,
  structuralGridM: 3.6,
  source: 'RPLAN 3-bed archetype + MSD §3.1 residential',
}

const RPLAN_TOWNHOUSE: ReferenceProgram = {
  typologyId: 'townhouse',
  program: [
    { name: 'Living Room', count: 1, areaM2: 18 },
    { name: 'Dining Room', count: 1, areaM2: 9 },
    { name: 'Kitchen', count: 1, areaM2: 9 },
    { name: 'Master Bedroom', count: 1, areaM2: 14 },
    { name: 'Bedroom', count: 2, areaM2: 11 },
    { name: 'Bathroom', count: 2, areaM2: 5 },
    { name: 'Toilet', count: 1, areaM2: 2 },
    { name: 'Stair Hall', count: 1, areaM2: 4 },
    { name: 'Corridor', count: 1, areaM2: 4 },
  ],
  occupancyClass: 'B2',
  efficiency: 0.68,
  avgRoomAreaM2: 8.3,
  structuralGridM: 3.6,
  source: 'RPLAN terraced + MSD §3.1 attached residential',
}

// ─── MSD office reference ───────────────────────────────────────────

const MSD_OFFICE: ReferenceProgram = {
  typologyId: 'office-commercial',
  program: [
    { name: 'Open Plan Office', count: 1, areaM2: 100 },
    { name: 'Private Office', count: 4, areaM2: 12 },
    { name: 'Reception', count: 1, areaM2: 15 },
    { name: 'Conference Room', count: 1, areaM2: 20 },
    { name: 'Kitchenette', count: 1, areaM2: 6 },
    { name: 'Server Room', count: 1, areaM2: 5 },
    { name: 'Corridor', count: 1, areaM2: 15 },
    { name: 'Staircase', count: 2, areaM2: 6 },
    { name: 'Lift Core', count: 1, areaM2: 3 },
    { name: 'Toilet', count: 2, areaM2: 4 },
  ],
  occupancyClass: 'E1',
  efficiency: 0.75,
  avgRoomAreaM2: 12.5,
  structuralGridM: 7.2,
  source: 'MSD §3.4 office + SANS 10400-A E1',
}

// ─── MSD clinic reference ───────────────────────────────────────────

const MSD_CLINIC: ReferenceProgram = {
  typologyId: 'clinic-health',
  program: [
    { name: 'Reception', count: 1, areaM2: 15 },
    { name: 'Consultation Room', count: 3, areaM2: 10 },
    { name: 'Treatment Room', count: 1, areaM2: 12 },
    { name: 'Pharmacy', count: 1, areaM2: 8 },
    { name: 'Staff Room', count: 1, areaM2: 10 },
    { name: 'Store', count: 1, areaM2: 5 },
    { name: 'Corridor', count: 1, areaM2: 10 },
    { name: 'Staircase', count: 1, areaM2: 5 },
    { name: 'Toilet', count: 2, areaM2: 3 },
  ],
  occupancyClass: 'E1',
  efficiency: 0.65,
  avgRoomAreaM2: 8.4,
  structuralGridM: 7.2,
  source: 'MSD §3.4 clinic + SANS 10400-A E1',
}

// ─── MSD hotel reference ────────────────────────────────────────────

const MSD_HOTEL: ReferenceProgram = {
  typologyId: 'hotel-fullservice',
  program: [
    { name: 'Guest Room', count: 20, areaM2: 18 },
    { name: 'Reception / Lobby', count: 1, areaM2: 25 },
    { name: 'Restaurant', count: 1, areaM2: 40 },
    { name: 'Kitchen', count: 1, areaM2: 20 },
    { name: 'Conference Room', count: 1, areaM2: 30 },
    { name: 'Corridor', count: 1, areaM2: 30 },
    { name: 'Staircase', count: 2, areaM2: 6 },
    { name: 'Lift Core', count: 1, areaM2: 3 },
    { name: 'Toilet', count: 4, areaM2: 3 },
  ],
  occupancyClass: 'H1',
  efficiency: 0.62,
  avgRoomAreaM2: 14.2,
  structuralGridM: 7.2,
  source: 'MSD §3.4 hotel + SANS 10400-A H1',
}

// ─── MSD retail reference ───────────────────────────────────────────

const MSD_RETAIL: ReferenceProgram = {
  typologyId: 'retail-shop',
  program: [
    { name: 'Sales Floor', count: 1, areaM2: 50 },
    { name: 'Counter', count: 1, areaM2: 5 },
    { name: 'Store', count: 1, areaM2: 10 },
    { name: 'Toilet', count: 1, areaM2: 3 },
    { name: 'Corridor', count: 1, areaM2: 5 },
  ],
  occupancyClass: 'F2',
  efficiency: 0.80,
  avgRoomAreaM2: 14.6,
  structuralGridM: 6.0,
  source: 'MSD §3.4 retail + SANS 10400-A F2',
}

// ─── MSD school reference ───────────────────────────────────────────

const MSD_SCHOOL: ReferenceProgram = {
  typologyId: 'school-classroom',
  program: [
    { name: 'Classroom', count: 6, areaM2: 42 },
    { name: 'Staff Room', count: 1, areaM2: 12 },
    { name: 'Library', count: 1, areaM2: 20 },
    { name: 'Corridor', count: 1, areaM2: 15 },
    { name: 'Staircase', count: 1, areaM2: 6 },
    { name: 'Toilet', count: 2, areaM2: 4 },
  ],
  occupancyClass: 'A3',
  efficiency: 0.68,
  avgRoomAreaM2: 21.4,
  structuralGridM: 7.2,
  source: 'MSD §3.4 school + SANS 10400-A A3',
}

// ─── MSD warehouse reference ────────────────────────────────────────

const MSD_WAREHOUSE: ReferenceProgram = {
  typologyId: 'warehouse-industrial',
  program: [
    { name: 'Warehouse Floor', count: 1, areaM2: 500 },
    { name: 'Office', count: 1, areaM2: 20 },
    { name: 'Loading Bay', count: 1, areaM2: 30 },
    { name: 'Store', count: 1, areaM2: 15 },
    { name: 'Toilet', count: 1, areaM2: 4 },
  ],
  occupancyClass: 'G1',
  efficiency: 0.85,
  avgRoomAreaM2: 113.8,
  structuralGridM: 12.0,
  source: 'MSD §3.4 warehouse + SANS 10400-A G1',
}

// ─── MSD church reference ───────────────────────────────────────────

const MSD_CHURCH: ReferenceProgram = {
  typologyId: 'church-worship',
  program: [
    { name: 'Main Hall', count: 1, areaM2: 200 },
    { name: 'Store', count: 1, areaM2: 5 },
    { name: 'Vestibule', count: 1, areaM2: 10 },
    { name: 'Corridor', count: 1, areaM2: 8 },
    { name: 'Toilet', count: 2, areaM2: 3 },
  ],
  occupancyClass: 'A2',
  efficiency: 0.75,
  avgRoomAreaM2: 45.2,
  structuralGridM: 15.0,
  source: 'MSD §3.4 assembly + SANS 10400-A A2',
}

// ─── MSD apartment reference ─────────────────────────────────────────

const MSD_APARTMENT: ReferenceProgram = {
  typologyId: 'apartment-multi',
  program: [
    { name: 'Studio Unit', count: 6, areaM2: 30 },
    { name: 'One-Bedroom Unit', count: 4, areaM2: 45 },
    { name: 'Two-Bedroom Unit', count: 4, areaM2: 65 },
    { name: 'Staircase', count: 2, areaM2: 6 },
    { name: 'Lift Core', count: 1, areaM2: 8 },
    { name: 'Common Corridor', count: 1, areaM2: 30 },
  ],
  occupancyClass: 'B2',
  efficiency: 0.65,
  avgRoomAreaM2: 30.4,
  structuralGridM: 6.0,
  source: 'MSD §3.2 multi-unit residential + SANS 10400-A B2',
}

// ─── MSD duplex reference ────────────────────────────────────────────

const MSD_DUPLEX: ReferenceProgram = {
  typologyId: 'duplex',
  program: [
    { name: 'Living / Dining', count: 2, areaM2: 18 },
    { name: 'Kitchen', count: 2, areaM2: 9 },
    { name: 'Master Bedroom', count: 2, areaM2: 14 },
    { name: 'Bedroom', count: 4, areaM2: 11 },
    { name: 'Bathroom', count: 2, areaM2: 5 },
    { name: 'Guest WC', count: 2, areaM2: 2.5 },
    { name: 'Stair Hall', count: 2, areaM2: 4 },
  ],
  occupancyClass: 'B2',
  efficiency: 0.70,
  avgRoomAreaM2: 9.4,
  structuralGridM: 5.0,
  source: 'MSD §3.1 paired residential + SANS 10400-A B2',
}

// ─── MSD restaurant reference ────────────────────────────────────────

const MSD_RESTAURANT: ReferenceProgram = {
  typologyId: 'restaurant',
  program: [
    { name: 'Dining Area', count: 1, areaM2: 50 },
    { name: 'Commercial Kitchen', count: 1, areaM2: 25 },
    { name: 'Store / Pantry', count: 1, areaM2: 6 },
    { name: 'Customer Toilet', count: 2, areaM2: 4 },
    { name: 'Office', count: 1, areaM2: 6 },
  ],
  occupancyClass: 'F3',
  efficiency: 0.72,
  avgRoomAreaM2: 16.4,
  structuralGridM: 6.0,
  source: 'MSD §3.5 food service + SANS 10400-A F3',
}

// ─── MSD community-hall reference ────────────────────────────────────

const MSD_COMMUNITY_HALL: ReferenceProgram = {
  typologyId: 'community-hall',
  program: [
    { name: 'Main Hall', count: 1, areaM2: 120 },
    { name: 'Kitchen', count: 1, areaM2: 12 },
    { name: 'Store', count: 1, areaM2: 8 },
    { name: 'Stage / Platform', count: 1, areaM2: 20 },
    { name: 'Toilet Block', count: 2, areaM2: 12 },
  ],
  occupancyClass: 'A2',
  efficiency: 0.75,
  avgRoomAreaM2: 31.2,
  structuralGridM: 8.0,
  source: 'MSD §3.4 assembly + SANS 10400-A A2',
}

// ─── MSD market reference ────────────────────────────────────────────

const MSD_MARKET: ReferenceProgram = {
  typologyId: 'market',
  program: [
    { name: 'Sales Floor', count: 1, areaM2: 300 },
    { name: 'Vendor Stall', count: 20, areaM2: 6 },
    { name: 'Aisle / Corridor', count: 1, areaM2: 40 },
    { name: 'Storage', count: 1, areaM2: 15 },
    { name: 'Public Toilet', count: 2, areaM2: 10 },
    { name: 'Admin Office', count: 1, areaM2: 8 },
  ],
  occupancyClass: 'F2',
  efficiency: 0.60,
  avgRoomAreaM2: 18.9,
  structuralGridM: 15.0,
  source: 'MSD §3.5 market / informal trading + SANS 10400-A F2',
}

// ─── MSD petrol-station reference ────────────────────────────────────

const MSD_PETROL: ReferenceProgram = {
  typologyId: 'petrol-station',
  program: [
    { name: 'Shop / Convenience', count: 1, areaM2: 25 },
    { name: 'Office', count: 1, areaM2: 8 },
    { name: 'Fuel Bay (canopy)', count: 1, areaM2: 80 },
    { name: 'Car Wash', count: 1, areaM2: 40 },
    { name: 'Toilet', count: 2, areaM2: 4 },
    { name: 'Pump Island', count: 1, areaM2: 20 },
    { name: 'Store', count: 1, areaM2: 8 },
  ],
  occupancyClass: 'J3',
  efficiency: 0.55,
  avgRoomAreaM2: 26.4,
  structuralGridM: 6.0,
  source: 'MSD §3.5 fuel storage + SANS 10400-A J3',
}

// ─── MSD mixed-use reference ─────────────────────────────────────────

const MSD_MIXED_USE: ReferenceProgram = {
  typologyId: 'mixed-use',
  program: [
    { name: 'Ground Floor Shop', count: 1, areaM2: 50 },
    { name: 'Upper Apartment', count: 2, areaM2: 55 },
    { name: 'Shared Stair / Lobby', count: 1, areaM2: 10 },
    { name: 'Store Room', count: 1, areaM2: 6 },
  ],
  occupancyClass: 'F2',
  efficiency: 0.68,
  avgRoomAreaM2: 35.2,
  structuralGridM: 6.0,
  source: 'MSD §3.5 mixed commercial/residential',
}

// ─── Registry ───────────────────────────────────────────────────────

const REFERENCE_PROGRAMS: ReferenceProgram[] = [
  RPLAN_HOUSE,
  RPLAN_TOWNHOUSE,
  MSD_APARTMENT,
  MSD_DUPLEX,
  MSD_OFFICE,
  MSD_CLINIC,
  MSD_HOTEL,
  MSD_RESTAURANT,
  MSD_RETAIL,
  MSD_SCHOOL,
  MSD_COMMUNITY_HALL,
  MSD_MARKET,
  MSD_WAREHOUSE,
  MSD_PETROL,
  MSD_CHURCH,
  MSD_MIXED_USE,
]

/** Canonical adjacency rules per typology (group-level). */
const REFERENCE_ADJACENCIES: ReferenceAdjacency[] = [
  {
    typologyId: 'house-residential',
    rules: [
      { from: 'living', to: 'corridor', weight: 2 },
      { from: 'dining', to: 'kitchen', weight: 3 },
      { from: 'dining', to: 'corridor', weight: 2 },
      { from: 'kitchen', to: 'corridor', weight: 1 },
      { from: 'bedroom', to: 'corridor', weight: 3 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'entrance', to: 'living', weight: 2 },
    ],
    source: 'RPLAN residential adjacency statistics',
  },
  {
    typologyId: 'townhouse',
    rules: [
      { from: 'living', to: 'corridor', weight: 3 },
      { from: 'dining', to: 'kitchen', weight: 3 },
      { from: 'bedroom', to: 'corridor', weight: 3 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'entrance', to: 'living', weight: 2 },
      { from: 'store', to: 'corridor', weight: 1 },
    ],
    source: 'RPLAN townhouse / terraced',
  },
  {
    typologyId: 'office-commercial',
    rules: [
      { from: 'reception', to: 'corridor', weight: 3 },
      { from: 'open-plan', to: 'corridor', weight: 3 },
      { from: 'office', to: 'corridor', weight: 2 },
      { from: 'meeting', to: 'corridor', weight: 2 },
      { from: 'kitchenette', to: 'corridor', weight: 1 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'lift', to: 'corridor', weight: 2 },
      { from: 'server', to: 'corridor', weight: 1 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.4 office adjacency graph',
  },
  {
    typologyId: 'clinic-health',
    rules: [
      { from: 'reception', to: 'corridor', weight: 3 },
      { from: 'meeting', to: 'corridor', weight: 2 },
      { from: 'kitchenette', to: 'corridor', weight: 1 },
      { from: 'store', to: 'corridor', weight: 1 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'stair', to: 'corridor', weight: 3 },
    ],
    source: 'MSD §3.4 clinic adjacency graph',
  },
  {
    typologyId: 'hotel-fullservice',
    rules: [
      { from: 'bedroom', to: 'corridor', weight: 3 },
      { from: 'reception', to: 'corridor', weight: 3 },
      { from: 'retail', to: 'corridor', weight: 2 },
      { from: 'kitchen', to: 'corridor', weight: 1 },
      { from: 'meeting', to: 'corridor', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'lift', to: 'corridor', weight: 2 },
      { from: 'kitchen', to: 'retail', weight: 3 },
      { from: 'reception', to: 'retail', weight: 1 },
    ],
    source: 'MSD §3.4 hotel double-loaded corridor',
  },
  {
    typologyId: 'retail-shop',
    rules: [
      { from: 'retail', to: 'corridor', weight: 3 },
      { from: 'store', to: 'retail', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.4 retail front-back',
  },
  {
    typologyId: 'school-classroom',
    rules: [
      { from: 'meeting', to: 'corridor', weight: 3 },
      { from: 'office', to: 'corridor', weight: 2 },
      { from: 'store', to: 'corridor', weight: 1 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'stair', to: 'corridor', weight: 3 },
    ],
    source: 'MSD §3.4 school corridor-served',
  },
  {
    typologyId: 'warehouse-industrial',
    rules: [
      { from: 'office', to: 'retail', weight: 2 },
      { from: 'store', to: 'retail', weight: 2 },
      { from: 'wc', to: 'office', weight: 1 },
    ],
    source: 'MSD §3.4 warehouse shed',
  },
  {
    typologyId: 'church-worship',
    rules: [
      { from: 'assembly', to: 'corridor', weight: 3 },
      { from: 'store', to: 'assembly', weight: 1 },
      { from: 'entrance', to: 'assembly', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.4 worship hall',
  },
  {
    typologyId: 'apartment-multi',
    rules: [
      { from: 'bedroom', to: 'corridor', weight: 3 },
      { from: 'reception', to: 'corridor', weight: 3 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'lift', to: 'corridor', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'kitchenette', to: 'corridor', weight: 1 },
    ],
    source: 'MSD §3.2 multi-unit corridor-served',
  },
  {
    typologyId: 'duplex',
    rules: [
      { from: 'living', to: 'corridor', weight: 3 },
      { from: 'dining', to: 'kitchen', weight: 3 },
      { from: 'bedroom', to: 'corridor', weight: 3 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'wc', to: 'corridor', weight: 2 },
      { from: 'entrance', to: 'living', weight: 2 },
    ],
    source: 'RPLAN duplex / semi-detached',
  },
  {
    typologyId: 'restaurant',
    rules: [
      { from: 'retail', to: 'corridor', weight: 3 },
      { from: 'kitchen', to: 'retail', weight: 3 },
      { from: 'store', to: 'kitchen', weight: 2 },
      { from: 'office', to: 'corridor', weight: 1 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.5 food service front-back',
  },
  {
    typologyId: 'community-hall',
    rules: [
      { from: 'assembly', to: 'corridor', weight: 3 },
      { from: 'kitchen', to: 'assembly', weight: 2 },
      { from: 'store', to: 'assembly', weight: 1 },
      { from: 'entrance', to: 'assembly', weight: 3 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.4 community hall',
  },
  {
    typologyId: 'market',
    rules: [
      { from: 'retail', to: 'corridor', weight: 3 },
      { from: 'store', to: 'retail', weight: 2 },
      { from: 'office', to: 'corridor', weight: 1 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.5 market open-plan',
  },
  {
    typologyId: 'petrol-station',
    rules: [
      { from: 'retail', to: 'corridor', weight: 3 },
      { from: 'office', to: 'retail', weight: 2 },
      { from: 'store', to: 'retail', weight: 1 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.5 fuel station shop-front',
  },
  {
    typologyId: 'mixed-use',
    rules: [
      { from: 'retail', to: 'corridor', weight: 3 },
      { from: 'bedroom', to: 'corridor', weight: 3 },
      { from: 'stair', to: 'corridor', weight: 3 },
      { from: 'store', to: 'retail', weight: 2 },
      { from: 'wc', to: 'corridor', weight: 2 },
    ],
    source: 'MSD §3.5 mixed commercial/residential',
  },
]

// ─── Public API ──────────────────────────────────────────────────────

/** Look up a reference program by typology id. */
export function getReferenceProgram(typologyId: string): ReferenceProgram | undefined {
  return REFERENCE_PROGRAMS.find(r => r.typologyId === typologyId)
}

/** Look up reference adjacency rules by typology id. */
export function getReferenceAdjacency(typologyId: string): ReferenceAdjacency | undefined {
  return REFERENCE_ADJACENCIES.find(r => r.typologyId === typologyId)
}

/** List all registered typology ids. */
export function listReferenceTypologyIds(): string[] {
  return REFERENCE_PROGRAMS.map(r => r.typologyId)
}

/** All reference programs (immutable). */
export function listAllReferencePrograms(): readonly ReferenceProgram[] {
  return REFERENCE_PROGRAMS
}
