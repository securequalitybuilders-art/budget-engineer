import { describe, it, expect } from 'vitest'
import {
  getConstraintsForTypology,
  listTypologyIds,
  listAllConstraints,
  evaluateTypologyConstraints,
} from '@/engine/architecture/typologies/constraintEvaluator'
import type { ConstraintEvaluatorInput, RoomRect } from '@/engine/architecture/typologies/types'

const ALL_IDS = [
  'office-commercial',
  'house-residential',
  'apartment-multi',
  'duplex',
  'townhouse',
  'clinic-health',
  'school-classroom',
  'church-worship',
  'community-hall',
  'retail-shop',
  'hotel-fullservice',
  'restaurant',
  'warehouse-industrial',
  'market',
  'petrol-station',
  'mixed-use',
]

function makeRoom(overrides: Partial<RoomRect> & { name: string }): RoomRect {
  return {
    id: overrides.id ?? `r-${Math.random().toString(36).slice(2, 8)}`,
    name: overrides.name,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 5,
    height: overrides.height ?? 5,
  }
}

function makeInput(rooms: RoomRect[], width = 30, height = 20): ConstraintEvaluatorInput {
  return { rooms, totalWidth: width, totalHeight: height }
}

// ─── Registry tests ─────────────────────────────────────────────────────────

describe('constraint registry', () => {
  it('covers all 16 typologies', () => {
    expect(listTypologyIds().sort()).toEqual(ALL_IDS.sort())
  })

  it('listAllConstraints returns 16 entries', () => {
    expect(listAllConstraints()).toHaveLength(16)
  })

  it.each(ALL_IDS)('getConstraintsForTypology("%s") returns constraints', (id) => {
    const c = getConstraintsForTypology(id)
    expect(c).toBeDefined()
    expect(c!.typologyId).toBe(id)
    expect(c!.displayName).toBeTruthy()
    expect(c!.functionalZoning).toBeDefined()
    expect(c!.corePlanning).toBeDefined()
    expect(c!.emergencyExits).toBeDefined()
    expect(c!.structuralGrid).toBeDefined()
  })

  it('getConstraintsForTypology returns undefined for unknown id', () => {
    expect(getConstraintsForTypology('nonexistent')).toBeUndefined()
  })
})

// ─── Office typology (reference spec) ───────────────────────────────────────

describe('office-commercial constraints', () => {
  const C = getConstraintsForTypology('office-commercial')!

  it('has functional zoning zones', () => {
    expect(C.functionalZoning.zones.length).toBeGreaterThanOrEqual(4)
  })

  it('requires 2 stairs + 1 elevator', () => {
    expect(C.corePlanning.minStairs).toBe(2)
    expect(C.corePlanning.minElevators).toBe(1)
  })

  it('emergency exits: min 2 exits, 45m travel, 120min fire', () => {
    expect(C.emergencyExits.minExits).toBe(2)
    expect(C.emergencyExits.maxTravelDistanceM).toBe(45)
    expect(C.emergencyExits.fireRatingMinutes).toBe(120)
  })

  it('daylighting: 15% window ratio', () => {
    expect(C.daylighting.minWindowFaceRatio).toBe(0.15)
  })

  it('accessibility: 0.9m doors, 1.2m corridors, accessible WC', () => {
    expect(C.accessibility.minDoorWidthM).toBe(0.9)
    expect(C.accessibility.minCorridorWidthM).toBe(1.2)
    expect(C.accessibility.accessibleWc).toBe(true)
  })

  it('structural grid: 7.2m preferred, 8.0m max', () => {
    expect(C.structuralGrid.preferredSpanM).toBe(7.2)
    expect(C.structuralGrid.maxSpanM).toBe(8.0)
  })

  it('building services: all enabled', () => {
    expect(C.buildingServices.hvac).toBe(true)
    expect(C.buildingServices.electrical).toBe(true)
    expect(C.buildingServices.plumbing).toBe(true)
    expect(C.buildingServices.fireSuppression).toBe(true)
  })

  it('has workspace layouts: open plan + private + hybrid', () => {
    expect(C.workspaceLayouts.openPlan).toBeDefined()
    expect(C.workspaceLayouts.private).toBeDefined()
    expect(C.workspaceLayouts.hybrid).toBeDefined()
  })

  it('meeting rooms: small + medium + large', () => {
    expect(C.meetingRooms.types.length).toBe(3)
    expect(C.meetingRooms.types.map((t) => t.name)).toEqual(['Small Meeting', 'Medium Meeting', 'Large Meeting'])
  })
})

// ─── Residential typologies ─────────────────────────────────────────────────

describe('residential typologies', () => {
  it('house: single stairs, no elevator, 30min fire', () => {
    const c = getConstraintsForTypology('house-residential')!
    expect(c.corePlanning.minStairs).toBe(1)
    expect(c.corePlanning.minElevators).toBe(0)
    expect(c.emergencyExits.fireRatingMinutes).toBe(30)
    expect(c.emergencyExits.maxTravelDistanceM).toBe(25)
  })

  it('apartment: 2 stairs, 1 elevator, 60min fire', () => {
    const c = getConstraintsForTypology('apartment-multi')!
    expect(c.corePlanning.minStairs).toBe(2)
    expect(c.corePlanning.minElevators).toBe(1)
    expect(c.emergencyExits.fireRatingMinutes).toBe(60)
  })

  it('duplex: 1 stair, no elevator, 60min party wall', () => {
    const c = getConstraintsForTypology('duplex')!
    expect(c.corePlanning.minStairs).toBe(1)
    expect(c.emergencyExits.fireRatingMinutes).toBe(60)
  })

  it('townhouse: 1 stair, no elevator, 60min party wall', () => {
    const c = getConstraintsForTypology('townhouse')!
    expect(c.corePlanning.minStairs).toBe(1)
    expect(c.emergencyExits.fireRatingMinutes).toBe(60)
  })
})

// ─── Institutional typologies ───────────────────────────────────────────────

describe('institutional typologies', () => {
  it('clinic: min 2 consultation rooms', () => {
    const c = getConstraintsForTypology('clinic-health')!
    const consultationZone = c.functionalZoning.zones.find((z) => z.patterns.includes('consultation'))
    expect(consultationZone).toBeDefined()
    expect(consultationZone!.minCount).toBe(2)
  })

  it('school: min 4 classrooms, 42m² each', () => {
    const c = getConstraintsForTypology('school-classroom')!
    const classroomZone = c.functionalZoning.zones.find((z) => z.patterns.includes('classroom'))
    expect(classroomZone).toBeDefined()
    expect(classroomZone!.minCount).toBe(4)
    expect(classroomZone!.minAreaM2).toBe(42)
  })

  it('church: 200m² worship hall, 18m travel distance', () => {
    const c = getConstraintsForTypology('church-worship')!
    const hallZone = c.functionalZoning.zones.find((z) => z.patterns.includes('main hall'))
    expect(hallZone).toBeDefined()
    expect(hallZone!.minAreaM2).toBe(200)
    expect(c.emergencyExits.maxTravelDistanceM).toBe(18)
  })

  it('community-hall: 120m² assembly hall', () => {
    const c = getConstraintsForTypology('community-hall')!
    const hallZone = c.functionalZoning.zones.find((z) => z.patterns.includes('main hall'))
    expect(hallZone).toBeDefined()
    expect(hallZone!.minAreaM2).toBe(120)
  })
})

// ─── Commercial typologies ──────────────────────────────────────────────────

describe('commercial typologies', () => {
  it('retail: 50m² sales floor', () => {
    const c = getConstraintsForTypology('retail-shop')!
    const salesZone = c.functionalZoning.zones.find((z) => z.patterns.includes('sales floor'))
    expect(salesZone).toBeDefined()
    expect(salesZone!.minAreaM2).toBe(50)
  })

  it('hotel: min 10 guest rooms', () => {
    const c = getConstraintsForTypology('hotel-fullservice')!
    const guestZone = c.functionalZoning.zones.find((z) => z.patterns.includes('guest room'))
    expect(guestZone).toBeDefined()
    expect(guestZone!.minCount).toBe(10)
    expect(guestZone!.minAreaM2).toBe(18)
  })

  it('restaurant: 50m² dining, 25m² kitchen', () => {
    const c = getConstraintsForTypology('restaurant')!
    const diningZone = c.functionalZoning.zones.find((z) => z.patterns.includes('dining'))
    const kitchenZone = c.functionalZoning.zones.find((z) => z.patterns.includes('kitchen'))
    expect(diningZone!.minAreaM2).toBe(50)
    expect(kitchenZone!.minAreaM2).toBe(25)
  })

  it('market: 200m² trading area, min 10 stalls', () => {
    const c = getConstraintsForTypology('market')!
    const marketZone = c.functionalZoning.zones.find((z) => z.patterns.includes('sales floor'))
    const stallZone = c.functionalZoning.zones.find((z) => z.patterns.includes('stall'))
    expect(marketZone!.minAreaM2).toBe(200)
    expect(stallZone!.minCount).toBe(10)
  })
})

// ─── Industrial/infrastructure typologies ───────────────────────────────────

describe('industrial typologies', () => {
  it('warehouse: 200m² floor, 15-20m span', () => {
    const c = getConstraintsForTypology('warehouse-industrial')!
    const floorZone = c.functionalZoning.zones.find((z) => z.patterns.includes('warehouse floor'))
    expect(floorZone!.minAreaM2).toBe(200)
    expect(c.structuralGrid.preferredSpanM).toBe(15.0)
    expect(c.structuralGrid.maxSpanM).toBe(20.0)
  })

  it('petrol: J3 high hazard, 120min fire, sprinklers', () => {
    const c = getConstraintsForTypology('petrol-station')!
    expect(c.emergencyExits.fireRatingMinutes).toBe(120)
    expect(c.emergencyExits.requiresSprinklers).toBe(true)
    expect(c.buildingServices.fireSuppression).toBe(true)
  })

  it('mixed-use: separate floor zoning', () => {
    const c = getConstraintsForTypology('mixed-use')!
    const commercialZone = c.functionalZoning.zones.find((z) => z.patterns.includes('shop'))
    const residentialZone = c.functionalZoning.zones.find((z) => z.patterns.includes('apartment'))
    expect(commercialZone!.separateFloor).toBe(true)
    expect(residentialZone!.separateFloor).toBe(true)
  })
})

// ─── Evaluator — pass cases ─────────────────────────────────────────────────

describe('constraint evaluator — passing plans', () => {
  it('office plan passes with correct rooms', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Open-Plan Office', width: 15, height: 10 }),
      makeRoom({ name: 'Reception', width: 5, height: 4 }),
      makeRoom({ name: 'Main Entrance', width: 3, height: 3 }),
      makeRoom({ name: 'Fire Exit', width: 2, height: 2 }),
      makeRoom({ name: 'Conference Room', width: 6, height: 5 }),
      makeRoom({ name: 'Staircase', width: 3, height: 5 }),
      makeRoom({ name: 'Staircase 2', width: 3, height: 5 }),
      makeRoom({ name: 'Lift', width: 2, height: 2 }),
      makeRoom({ name: 'Corridor', width: 20, height: 1.5 }),
      makeRoom({ name: 'Toilet', width: 3, height: 3 }),
      makeRoom({ name: 'Server Room', width: 3, height: 3 }),
    ]
    const result = evaluateTypologyConstraints('office-commercial', makeInput(rooms, 30, 20))
    expect(result.passed).toBe(true)
    expect(result.summary.errors).toBe(0)
  })

  it('house plan passes with correct rooms', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Living Room', width: 6, height: 4 }),
      makeRoom({ name: 'Dining Room', width: 4, height: 4 }),
      makeRoom({ name: 'Kitchen', width: 3, height: 4 }),
      makeRoom({ name: 'Bedroom 1', width: 4, height: 4 }),
      makeRoom({ name: 'Bedroom 2', width: 3, height: 4 }),
      makeRoom({ name: 'Bathroom', width: 3, height: 2 }),
      makeRoom({ name: 'Staircase', width: 2, height: 3 }),
      makeRoom({ name: 'Main Entrance', width: 2, height: 3 }),
      makeRoom({ name: 'Back Door', width: 2, height: 2 }),
    ]
    const result = evaluateTypologyConstraints('house-residential', makeInput(rooms, 15, 10))
    expect(result.passed).toBe(true)
    expect(result.summary.errors).toBe(0)
  })
})

// ─── Evaluator — failing cases ──────────────────────────────────────────────

describe('constraint evaluator — failing plans', () => {
  it('office fails with missing stairs', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Open-Plan Office', width: 15, height: 10 }),
      makeRoom({ name: 'Lift', width: 2, height: 2 }),
    ]
    const result = evaluateTypologyConstraints('office-commercial', makeInput(rooms))
    expect(result.passed).toBe(false)
    const stairFinding = result.findings.find((f) => f.rule === 'core-min-stairs')
    expect(stairFinding).toBeDefined()
    expect(stairFinding!.severity).toBe('error')
  })

  it('office fails with undersized private office', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Private Office', width: 2, height: 3 }),
      makeRoom({ name: 'Staircase', width: 3, height: 5 }),
      makeRoom({ name: 'Staircase 2', width: 3, height: 5 }),
      makeRoom({ name: 'Lift', width: 2, height: 2 }),
    ]
    const result = evaluateTypologyConstraints('office-commercial', makeInput(rooms))
    const officeFinding = result.findings.find((f) => f.rule === 'workspace-private')
    expect(officeFinding).toBeDefined()
    expect(officeFinding!.severity).toBe('error')
  })

  it('clinic fails with missing consultation rooms', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Reception', width: 5, height: 5 }),
      makeRoom({ name: 'Corridor', width: 15, height: 1.5 }),
    ]
    const result = evaluateTypologyConstraints('clinic-health', makeInput(rooms))
    expect(result.passed).toBe(false)
    const consultFinding = result.findings.find((f) => f.rule === 'zone-consultation-count')
    expect(consultFinding).toBeDefined()
  })

  it('returns error for unknown typology', () => {
    const result = evaluateTypologyConstraints('nonexistent', makeInput([]))
    expect(result.passed).toBe(false)
    expect(result.findings[0].rule).toBe('unknown-typology')
  })

  it('school fails with undersized classroom', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Classroom', width: 5, height: 5 }),
      makeRoom({ name: 'Classroom', width: 5, height: 5 }),
      makeRoom({ name: 'Classroom', width: 5, height: 5 }),
      makeRoom({ name: 'Classroom', width: 5, height: 5 }),
    ]
    const result = evaluateTypologyConstraints('school-classroom', makeInput(rooms))
    const areaFinding = result.findings.find((f) => f.rule === 'zone-classroom-area')
    expect(areaFinding).toBeDefined()
    expect(areaFinding!.severity).toBe('error')
  })

  it('corridor too narrow triggers accessibility error', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Corridor', width: 0.8, height: 10 }),
      makeRoom({ name: 'Staircase', width: 3, height: 5 }),
      makeRoom({ name: 'Staircase 2', width: 3, height: 5 }),
      makeRoom({ name: 'Lift', width: 2, height: 2 }),
      makeRoom({ name: 'Open-Plan Office', width: 15, height: 10 }),
    ]
    const result = evaluateTypologyConstraints('office-commercial', makeInput(rooms))
    const corridorFinding = result.findings.find((f) => f.rule === 'corridor-width')
    expect(corridorFinding).toBeDefined()
    expect(corridorFinding!.severity).toBe('error')
  })
})

// ─── Score and summary ──────────────────────────────────────────────────────

describe('evaluation summary', () => {
  it('counts errors, warnings, and info correctly', () => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Corridor', width: 0.5, height: 10 }),
    ]
    const result = evaluateTypologyConstraints('office-commercial', makeInput(rooms))
    expect(result.summary.errors).toBeGreaterThanOrEqual(1)
    expect(typeof result.score).toBe('number')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })
})

// ─── All 16 typologies — evaluation smoke test ─────────────────────────────

describe('all 16 typologies — evaluation smoke', () => {
  it.each(ALL_IDS)('evaluateTypologyConstraints("%s") returns valid result', (id) => {
    const rooms: RoomRect[] = [
      makeRoom({ name: 'Main Space', width: 10, height: 10 }),
      makeRoom({ name: 'Corridor', width: 15, height: 1.5 }),
      makeRoom({ name: 'Staircase', width: 3, height: 5 }),
      makeRoom({ name: 'Toilet', width: 3, height: 3 }),
    ]
    const result = evaluateTypologyConstraints(id, makeInput(rooms, 25, 15))
    expect(result).toBeDefined()
    expect(result.typologyId).toBe(id)
    expect(typeof result.passed).toBe('boolean')
    expect(typeof result.score).toBe('number')
    expect(Array.isArray(result.findings)).toBe(true)
    expect(result.summary.totalRules).toBe(result.findings.length)
    expect(result.summary.errors + result.summary.warnings + result.summary.info + result.summary.passed).toBe(result.summary.totalRules)
  })
})
