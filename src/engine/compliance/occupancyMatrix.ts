import type { StructuralOccupancy } from '@/engine/calculators/structuralLoad'

/**
 * SANS 10400-A occupancy classification matrix (gemini.md §4.4).
 *
 * Single authority for occupancy classes. Every class carries the audit
 * matrix's per-class live load, max travel distance, fire rating and
 * accessibility requirement. `classifyOccupancy()` maps a building type
 * string to a class using the same examples the audit uses in §3.1–§3.4.
 */
export type OccupancyClass =
  | 'A1' | 'A2' | 'A3'
  | 'B1' | 'B2' | 'B3'
  | 'E1'
  | 'F1' | 'F2' | 'F3'
  | 'G1'
  | 'H1' | 'H2'
  | 'J1' | 'J2' | 'J3'

export interface OccupancyClassSpec {
  code: OccupancyClass
  label: string
  description: string
  liveLoadKpa: number
  maxTravelDistanceM: number
  fireRatingMin: number
  accessibilityRequired: boolean
}

export const OCCUPANCY_MATRIX: Record<OccupancyClass, OccupancyClassSpec> = {
  A1: { code: 'A1', label: 'Entertainment (A1)', description: 'Entertainment venues — cinemas, theatres, nightclubs', liveLoadKpa: 5.0, maxTravelDistanceM: 20, fireRatingMin: 120, accessibilityRequired: true },
  A2: { code: 'A2', label: 'Assembly (A2)', description: 'Assembly — churches, halls, places of worship', liveLoadKpa: 5.0, maxTravelDistanceM: 18, fireRatingMin: 120, accessibilityRequired: true },
  A3: { code: 'A3', label: 'Instruction (A3)', description: 'Places of instruction — schools, classrooms, colleges', liveLoadKpa: 3.0, maxTravelDistanceM: 18, fireRatingMin: 60, accessibilityRequired: true },
  B1: { code: 'B1', label: 'Large dwelling (B1)', description: 'Large dwelling (> 200 m²)', liveLoadKpa: 1.5, maxTravelDistanceM: 25, fireRatingMin: 30, accessibilityRequired: false },
  B2: { code: 'B2', label: 'Medium dwelling (B2)', description: 'Medium dwelling (80–200 m²)', liveLoadKpa: 1.5, maxTravelDistanceM: 25, fireRatingMin: 30, accessibilityRequired: false },
  B3: { code: 'B3', label: 'Small dwelling (B3)', description: 'Small dwelling (< 80 m²)', liveLoadKpa: 1.5, maxTravelDistanceM: 25, fireRatingMin: 30, accessibilityRequired: false },
  E1: { code: 'E1', label: 'Office / place of care (E1)', description: 'Offices and places of work or care', liveLoadKpa: 2.5, maxTravelDistanceM: 18, fireRatingMin: 60, accessibilityRequired: true },
  F1: { code: 'F1', label: 'Large shop (F1)', description: 'Large shops — supermarkets, malls, department stores', liveLoadKpa: 5.0, maxTravelDistanceM: 18, fireRatingMin: 120, accessibilityRequired: true },
  F2: { code: 'F2', label: 'Small shop (F2)', description: 'Small shops — retail, markets', liveLoadKpa: 4.0, maxTravelDistanceM: 18, fireRatingMin: 60, accessibilityRequired: true },
  F3: { code: 'F3', label: 'Restaurant / bar (F3)', description: 'Restaurants, cafés and bars', liveLoadKpa: 4.0, maxTravelDistanceM: 18, fireRatingMin: 60, accessibilityRequired: true },
  G1: { code: 'G1', label: 'Storage (G1)', description: 'Storage and warehousing (low fire risk)', liveLoadKpa: 7.5, maxTravelDistanceM: 25, fireRatingMin: 60, accessibilityRequired: false },
  H1: { code: 'H1', label: 'Hotel (H1)', description: 'Hotels and guest accommodation', liveLoadKpa: 2.0, maxTravelDistanceM: 18, fireRatingMin: 60, accessibilityRequired: true },
  H2: { code: 'H2', label: 'Dormitory (H2)', description: 'Dormitories and boarding accommodation', liveLoadKpa: 2.0, maxTravelDistanceM: 18, fireRatingMin: 60, accessibilityRequired: true },
  J1: { code: 'J1', label: 'High risk industrial (J1)', description: 'High-risk industrial — foundries, heavy manufacturing', liveLoadKpa: 10.0, maxTravelDistanceM: 15, fireRatingMin: 240, accessibilityRequired: false },
  J2: { code: 'J2', label: 'Moderate risk industrial (J2)', description: 'Moderate-risk industrial', liveLoadKpa: 7.5, maxTravelDistanceM: 18, fireRatingMin: 120, accessibilityRequired: false },
  J3: { code: 'J3', label: 'Low risk industrial (J3)', description: 'Low-risk industrial — petrol stations, workshops', liveLoadKpa: 5.0, maxTravelDistanceM: 25, fireRatingMin: 60, accessibilityRequired: false },
}

export const OCCUPANCY_CLASSES: OccupancyClass[] = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'E1', 'F1', 'F2', 'F3', 'G1', 'H1', 'H2', 'J1', 'J2', 'J3']

function isResidentialType(b: string): boolean {
  return ['house', 'apartment', 'townhouse', 'dwelling', 'flat', 'duplex', 'villa', 'cottage', 'mansion', 'bungalow', 'lodge'].some((k) => b.includes(k))
}

/** Map a building type string to an occupancy class (audit §3.1–§3.4 examples). */
export function classifyOccupancy(bt: string): OccupancyClass {
  const b = bt.toLowerCase()
  if (b.includes('warehouse') || b.includes('storage')) return 'G1'
  if (b.includes('petrol') || b.includes('fuel') || b.includes('filling')) return 'J3'
  if (b.includes('factory') || b.includes('manufacturing') || b.includes('foundry') || b.includes('plant')) return 'J1'
  if (b.includes('industrial')) return 'J2'
  if (b.includes('workshop')) return 'J3'
  if (b.includes('dormitory') || b.includes('hostel') || b.includes('boarding')) return 'H2'
  if (b.includes('school') || b.includes('classroom') || b.includes('education') || b.includes('college') || b.includes('university')) return 'A3'
  if (b.includes('hotel') || b.includes('lodge') || b.includes('guest')) return 'H1'
  if (b.includes('clinic') || b.includes('hospital') || b.includes('medical') || b.includes('health') || b.includes('care')) return 'E1'
  if (b.includes('office') || b.includes('commercial')) return 'E1'
  if (b.includes('theatre') || b.includes('cinema') || b.includes('nightclub') || b.includes('entertainment') || b.includes('concert')) return 'A1'
  if (b.includes('church') || b.includes('chapel') || b.includes('mosque') || b.includes('temple') || b.includes('worship') || b.includes('assembly') || b.includes('hall')) return 'A2'
  if (b.includes('restaurant') || b.includes('cafe') || b.includes('bar')) return 'F3'
  if (isResidentialType(b)) {
    if (b.includes('small') || b.includes('cottage') || b.includes('studio')) return 'B3'
    if (b.includes('large') || b.includes('mansion') || b.includes('executive')) return 'B1'
    return 'B2'
  }
  if (/\bmall\b|supermarket|department/.test(b)) return 'F1'
  if (b.includes('shop') || b.includes('retail') || b.includes('store') || b.includes('market')) return 'F2'
  return 'F1'
}

export function classLabel(cls: OccupancyClass): string {
  return OCCUPANCY_MATRIX[cls].label
}

export function classDescription(cls: OccupancyClass): string {
  return OCCUPANCY_MATRIX[cls].description
}

export function liveLoadKpaForClass(cls: OccupancyClass): number {
  return OCCUPANCY_MATRIX[cls].liveLoadKpa
}

export function maxTravelDistanceForClass(cls: OccupancyClass): number {
  return OCCUPANCY_MATRIX[cls].maxTravelDistanceM
}

export function fireRatingMinForClass(cls: OccupancyClass): number {
  return OCCUPANCY_MATRIX[cls].fireRatingMin
}

export function accessibilityRequiredForClass(cls: OccupancyClass): boolean {
  return OCCUPANCY_MATRIX[cls].accessibilityRequired
}

export function isDwellingClass(cls: OccupancyClass): boolean {
  return cls === 'B1' || cls === 'B2' || cls === 'B3'
}

/** Primary structural occupancy for a class (used for the occupancy consistency rule). */
export function occupancyForClass(cls: OccupancyClass): StructuralOccupancy {
  switch (cls) {
    case 'A1':
    case 'A2':
      return 'institutional'
    case 'A3':
      return 'educational'
    case 'B1':
    case 'B2':
    case 'B3':
      return 'residential'
    case 'E1':
      return 'office'
    case 'F1':
    case 'F2':
    case 'F3':
      return 'retail'
    case 'G1':
      return 'storage'
    case 'H1':
    case 'H2':
      return 'residential'
    case 'J1':
    case 'J2':
    case 'J3':
      return 'industrial'
  }
}

/** Structural occupancies compatible with a class (class may cover multiple uses, e.g. E1 = office + clinic). */
export function compatibleOccupanciesForClass(cls: OccupancyClass): StructuralOccupancy[] {
  switch (cls) {
    case 'A1':
    case 'A2':
      return ['institutional', 'residential', 'retail']
    case 'A3':
      return ['educational', 'institutional']
    case 'B1':
    case 'B2':
    case 'B3':
      return ['residential']
    case 'E1':
      return ['office', 'institutional']
    case 'F1':
    case 'F2':
    case 'F3':
      return ['retail']
    case 'G1':
      return ['storage']
    case 'H1':
    case 'H2':
      return ['residential', 'institutional']
    case 'J1':
    case 'J2':
    case 'J3':
      return ['industrial', 'storage']
  }
}

/** Gross floor area at which automatic fire suppression is triggered (0 = dwelling-exempt). */
export function sprinklerThresholdForClass(cls: OccupancyClass): number {
  switch (cls) {
    case 'A1':
    case 'A2':
    case 'A3':
      return 500
    case 'B1':
    case 'B2':
    case 'B3':
      return 0
    case 'E1':
      return 500
    case 'F1':
    case 'F2':
      return 1000
    case 'F3':
      return 500
    case 'G1':
      return 2000
    case 'H1':
    case 'H2':
      return 1000
    case 'J1':
      return 500
    case 'J2':
      return 1000
    case 'J3':
      return 2000
  }
}
