import { describe, it, expect } from 'vitest'
import type { OccupancyClass } from '@/engine/compliance/occupancyMatrix'
import {
  OCCUPANCY_MATRIX,
  OCCUPANCY_CLASSES,
  classifyOccupancy,
  classLabel,
  classDescription,
  liveLoadKpaForClass,
  maxTravelDistanceForClass,
  fireRatingMinForClass,
  accessibilityRequiredForClass,
  isDwellingClass,
  occupancyForClass,
  compatibleOccupanciesForClass,
  sprinklerThresholdForClass,
} from '@/engine/compliance/occupancyMatrix'

describe('SANS 10400-A occupancy classification matrix (gemini.md §4.4)', () => {
  it('defines all 16 classes', () => {
    expect(OCCUPANCY_CLASSES).toHaveLength(16)
    for (const cls of OCCUPANCY_CLASSES) {
      expect(OCCUPANCY_MATRIX[cls]).toBeDefined()
      expect(OCCUPANCY_MATRIX[cls].code).toBe(cls)
    }
  })

  it('classifies each class with a description', () => {
    const labels: Record<string, string> = {
      A1: 'Entertainment', A2: 'Assembly', A3: 'Instruction',
      B1: 'Large dwelling', B2: 'Medium dwelling', B3: 'Small dwelling',
      E1: 'Office', F1: 'Large shop', F2: 'Small shop', F3: 'Restaurant',
      G1: 'Storage', H1: 'Hotel', H2: 'Dormitory',
      J1: 'High risk industrial', J2: 'Moderate risk industrial', J3: 'Low risk industrial',
    }
    for (const cls of OCCUPANCY_CLASSES) {
      expect(classLabel(cls)).toContain(labels[cls])
      expect(classDescription(cls).length).toBeGreaterThan(0)
    }
  })

  it('encodes the §4.4 per-class live loads', () => {
    const expected: Record<string, number> = {
      A1: 5.0, A2: 5.0, A3: 3.0,
      B1: 1.5, B2: 1.5, B3: 1.5,
      E1: 2.5, F1: 5.0, F2: 4.0, F3: 4.0,
      G1: 7.5, H1: 2.0, H2: 2.0,
      J1: 10.0, J2: 7.5, J3: 5.0,
    }
    for (const cls of OCCUPANCY_CLASSES) {
      expect(liveLoadKpaForClass(cls)).toBe(expected[cls])
    }
  })

  it('encodes the §4.4 per-class max travel distances', () => {
    const expected: Record<string, number> = {
      A1: 20, A2: 18, A3: 18,
      B1: 25, B2: 25, B3: 25,
      E1: 18, F1: 18, F2: 18, F3: 18,
      G1: 25, H1: 18, H2: 18,
      J1: 15, J2: 18, J3: 25,
    }
    for (const cls of OCCUPANCY_CLASSES) {
      expect(maxTravelDistanceForClass(cls)).toBe(expected[cls])
    }
  })

  it('encodes the §4.4 per-class fire ratings', () => {
    const expected: Record<string, number> = {
      A1: 120, A2: 120, A3: 60,
      B1: 30, B2: 30, B3: 30,
      E1: 60, F1: 120, F2: 60, F3: 60,
      G1: 60, H1: 60, H2: 60,
      J1: 240, J2: 120, J3: 60,
    }
    for (const cls of OCCUPANCY_CLASSES) {
      expect(fireRatingMinForClass(cls)).toBe(expected[cls])
    }
  })

  it('encodes the §4.4 per-class accessibility requirements', () => {
    const accessible: OccupancyClass[] = ['A1', 'A2', 'A3', 'E1', 'F1', 'F2', 'F3', 'H1', 'H2']
    const notAccessible: OccupancyClass[] = ['B1', 'B2', 'B3', 'G1', 'J1', 'J2', 'J3']
    for (const cls of accessible) {
      expect(accessibilityRequiredForClass(cls)).toBe(true)
    }
    for (const cls of notAccessible) {
      expect(accessibilityRequiredForClass(cls)).toBe(false)
    }
  })

  it('treats only B classes as dwellings', () => {
    for (const cls of OCCUPANCY_CLASSES) {
      expect(isDwellingClass(cls)).toBe(cls === 'B1' || cls === 'B2' || cls === 'B3')
    }
  })

  it('maps each class to a primary structural occupancy', () => {
    const expected: Record<string, string> = {
      A1: 'institutional', A2: 'institutional', A3: 'educational',
      B1: 'residential', B2: 'residential', B3: 'residential',
      E1: 'office', F1: 'retail', F2: 'retail', F3: 'retail',
      G1: 'storage', H1: 'residential', H2: 'residential',
      J1: 'industrial', J2: 'industrial', J3: 'industrial',
    }
    for (const cls of OCCUPANCY_CLASSES) {
      expect(occupancyForClass(cls)).toBe(expected[cls])
    }
  })

  it('lists compatible structural occupancies per class', () => {
    expect(compatibleOccupanciesForClass('E1')).toContain('office')
    expect(compatibleOccupanciesForClass('E1')).toContain('institutional')
    expect(compatibleOccupanciesForClass('A3')).toContain('educational')
    expect(compatibleOccupanciesForClass('A3')).toContain('institutional')
    expect(compatibleOccupanciesForClass('H1')).toContain('residential')
    expect(compatibleOccupanciesForClass('H1')).toContain('institutional')
    expect(compatibleOccupanciesForClass('J3')).toContain('industrial')
    expect(compatibleOccupanciesForClass('J3')).toContain('storage')
    expect(compatibleOccupanciesForClass('B2')).toEqual(['residential'])
  })

  it('sprinkler thresholds match the class fire-risk ranking', () => {
    expect(sprinklerThresholdForClass('B2')).toBe(0)
    expect(sprinklerThresholdForClass('A1')).toBe(500)
    expect(sprinklerThresholdForClass('E1')).toBe(500)
    expect(sprinklerThresholdForClass('F1')).toBe(1000)
    expect(sprinklerThresholdForClass('F3')).toBe(500)
    expect(sprinklerThresholdForClass('G1')).toBe(2000)
    expect(sprinklerThresholdForClass('H1')).toBe(1000)
    expect(sprinklerThresholdForClass('J1')).toBe(500)
    expect(sprinklerThresholdForClass('J2')).toBe(1000)
    expect(sprinklerThresholdForClass('J3')).toBe(2000)
  })
})

describe('classifyOccupancy edge cases', () => {
  it('handles residential variants per audit §3.1', () => {
    expect(classifyOccupancy('house')).toBe('B2')
    expect(classifyOccupancy('duplex')).toBe('B2')
    expect(classifyOccupancy('apartment')).toBe('B2')
    expect(classifyOccupancy('townhouse')).toBe('B2')
    expect(classifyOccupancy('small house')).toBe('B3')
    expect(classifyOccupancy('cottage')).toBe('B3')
    expect(classifyOccupancy('studio apartment')).toBe('B3')
    expect(classifyOccupancy('large house')).toBe('B1')
    expect(classifyOccupancy('mansion')).toBe('B1')
    expect(classifyOccupancy('executive house')).toBe('B1')
  })

  it('handles institutional/care and education per audit §3.2', () => {
    expect(classifyOccupancy('clinic')).toBe('E1')
    expect(classifyOccupancy('hospital')).toBe('E1')
    expect(classifyOccupancy('medical centre')).toBe('E1')
    expect(classifyOccupancy('school')).toBe('A3')
    expect(classifyOccupancy('classroom block')).toBe('A3')
    expect(classifyOccupancy('college')).toBe('A3')
    expect(classifyOccupancy('university building')).toBe('A3')
    expect(classifyOccupancy('church')).toBe('A2')
    expect(classifyOccupancy('chapel')).toBe('A2')
    expect(classifyOccupancy('assembly hall')).toBe('A2')
  })

  it('handles office/hotel/dormitory per audit §3.3', () => {
    expect(classifyOccupancy('office')).toBe('E1')
    expect(classifyOccupancy('commercial office block')).toBe('E1')
    expect(classifyOccupancy('hotel')).toBe('H1')
    expect(classifyOccupancy('lodge')).toBe('H1')
    expect(classifyOccupancy('guest house')).toBe('H1')
    expect(classifyOccupancy('dormitory')).toBe('H2')
    expect(classifyOccupancy('hostel')).toBe('H2')
    expect(classifyOccupancy('boarding school')).toBe('H2')
  })

  it('handles industrial, petrol and entertainment per audit §3.4', () => {
    expect(classifyOccupancy('factory')).toBe('J1')
    expect(classifyOccupancy('manufacturing plant')).toBe('J1')
    expect(classifyOccupancy('foundry')).toBe('J1')
    expect(classifyOccupancy('industrial')).toBe('J2')
    expect(classifyOccupancy('petrol station')).toBe('J3')
    expect(classifyOccupancy('filling station')).toBe('J3')
    expect(classifyOccupancy('workshop')).toBe('J3')
    expect(classifyOccupancy('theatre')).toBe('A1')
    expect(classifyOccupancy('cinema')).toBe('A1')
    expect(classifyOccupancy('nightclub')).toBe('A1')
  })

  it('handles retail variants', () => {
    expect(classifyOccupancy('shop')).toBe('F2')
    expect(classifyOccupancy('retail')).toBe('F2')
    expect(classifyOccupancy('market')).toBe('F2')
    expect(classifyOccupancy('supermarket')).toBe('F1')
    expect(classifyOccupancy('mall')).toBe('F1')
    expect(classifyOccupancy('department store')).toBe('F1')
    expect(classifyOccupancy('restaurant')).toBe('F3')
    expect(classifyOccupancy('cafe')).toBe('F3')
    expect(classifyOccupancy('bar')).toBe('F3')
  })

  it('handles storage and falls back to F1 for unknown types', () => {
    expect(classifyOccupancy('warehouse')).toBe('G1')
    expect(classifyOccupancy('storage')).toBe('G1')
    expect(classifyOccupancy('unknown-type')).toBe('F1')
  })
})
