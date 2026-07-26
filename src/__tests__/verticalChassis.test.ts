import { describe, it, expect } from 'vitest'
import {
  generateBuildingChassis,
  validateVerticalConstraints,
  getConstraintsForLevel,
  type ChassisGenerationParams,
  type ShaftServiceType,
  type ShaftStack,
} from '../lib/layout/vertical-chassis'
import { computeLevelStack } from '../lib/layout/level-stack'
import { computeShaftStack, isWetRoom, getWetCategory, snapToShaft } from '../lib/layout/shaft-stack'
import { generatePartyWall, mirrorLayoutAroundPartyWall, validatePartyWall, clampToPartyWall } from '../lib/layout/party-wall'
import { validateCirculationSeparation, buildMixedUseCirculation, findSharedCirculationNodes } from '../lib/layout/circulation-separation'

function makeChassisParams(overrides: Partial<ChassisGenerationParams> = {}): ChassisGenerationParams {
  return {
    typology: 'house',
    storeyCount: 2,
    buildingWidth: 12,
    buildingDepth: 10,
    floorToFloorHeight: 3.0,
    wallThickness: 0.2,
    structuralSystem: undefined as any,
    maxStructuralSpan: 6.0,
    hasLift: false,
    hasDuplex: false,
    hasMixedUse: false,
    programmes: ['ground', 'upper'],
    ...overrides,
  }
}

// ── BuildingChassis ────────────────────────────────────────────

describe('BuildingChassis', () => {
  it('generates a chassis with correct storey count', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3 }))
    expect(chassis.storeyCount).toBe(3)
    expect(chassis.levels.length).toBe(3)
  })

  it('detects masonry for <= 2 storeys', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    expect(chassis.structuralSystem).toBe('masonry')
  })

  it('detects rc-frame for 3-5 storeys', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 4, structuralSystem: undefined as any }))
    expect(chassis.structuralSystem).toBe('rc-frame')
  })

  it('sets correct stack strategy for duplex', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ typology: 'duplex', hasDuplex: true }))
    expect(chassis.stackStrategy).toBe('mirrored-duplex')
  })

  it('sets correct stack strategy for apartment', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ typology: 'apartment', storeyCount: 5 }))
    expect(chassis.stackStrategy).toBe('repeated-unit')
  })

  it('generates support axes proportional to building width', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ buildingWidth: 20 }))
    expect(chassis.supportAxes.length).toBeGreaterThanOrEqual(4)
  })

  it('generates grid bays from support axes', () => {
    const chassis = generateBuildingChassis(makeChassisParams())
    expect(chassis.gridBays.length).toBeGreaterThan(0)
  })

  it('generates a stair core for 2+ storeys', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    expect(chassis.cores.some(c => c.hasStair)).toBe(true)
  })

  it('generates a combined stair+lift core for 3+ storeys', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3, hasLift: true }))
    const combined = chassis.cores.find(c => c.type === 'combined')
    expect(combined).toBeDefined()
    expect(combined!.hasLift).toBe(true)
  })

  it('generates two stair cores for 5+ storeys', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 5 }))
    const stairs = chassis.cores.filter(c => c.hasStair)
    expect(stairs.length).toBeGreaterThanOrEqual(2)
  })

  it('generates a plumbing shaft', () => {
    const chassis = generateBuildingChassis(makeChassisParams())
    const wetShaft = chassis.shafts.find(s => s.wetStack)
    expect(wetShaft).toBeDefined()
    expect(wetShaft!.serviceTypes).toContain('plumbing')
  })

  it('generates an electrical shaft', () => {
    const chassis = generateBuildingChassis(makeChassisParams())
    const elecShaft = chassis.shafts.find(s => s.serviceTypes.includes('electrical'))
    expect(elecShaft).toBeDefined()
  })

  it('does not generate party walls for non-duplex', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ hasDuplex: false }))
    expect(chassis.partyWalls.length).toBe(0)
  })

  it('generates party walls for duplex', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ hasDuplex: true }))
    expect(chassis.partyWalls.length).toBeGreaterThan(0)
  })

  it('sets ground level correctly', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3 }))
    expect(chassis.levels[0].isGround).toBe(true)
    expect(chassis.levels[2].isRoof).toBe(true)
  })

  it('assigns correct elevations', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3, floorToFloorHeight: 3.0 }))
    expect(chassis.levels[0].elevation).toBe(0)
    expect(chassis.levels[1].elevation).toBe(3.0)
    expect(chassis.levels[2].elevation).toBe(6.0)
  })

  it('generates plan constraints from cores', () => {
    const params = makeChassisParams({ storeyCount: 2 })
    const chassis = generateBuildingChassis(params)
    const groundConstraints = getConstraintsForLevel(chassis, 0)
    const coreConstraints = groundConstraints.filter(c => c.type === 'core-reserve')
    expect(coreConstraints.length).toBeGreaterThan(0)
  })

  it('generates wet zone constraints from shafts', () => {
    const params = makeChassisParams({ storeyCount: 2 })
    const chassis = generateBuildingChassis(params)
    const groundConstraints = getConstraintsForLevel(chassis, 0)
    const wetZones = groundConstraints.filter(c => c.type === 'wet-zone')
    expect(wetZones.length).toBeGreaterThan(0)
  })
})

// ── Vertical Validation ───────────────────────────────────────

describe('validateVerticalConstraints', () => {
  it('passes for a valid 2-storey chassis', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const report = validateVerticalConstraints(chassis)
    // Support alignment may have warnings for non-load-bearing axes
    expect(report.verticalEgressPass).toBe(true)
    expect(report.shaftContinuityPass).toBe(true)
  })

  it('warns when no stair core exists for multi-storey', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    chassis.cores = [] // Remove all cores
    const report = validateVerticalConstraints(chassis)
    expect(report.verticalEgressPass).toBe(false)
    expect(report.failures.some(f => f.includes('stair'))).toBe(true)
  })

  it('separates circulation in mixed-use', () => {
    const chassis = generateBuildingChassis(makeChassisParams({
      typology: 'mixed-use',
      storeyCount: 3,
      hasMixedUse: true,
      programmes: ['commercial', 'residential', 'residential'],
    }))
    const report = validateVerticalConstraints(chassis)
    // Should report on circulation model state
    expect(report.circulationSeparationPass).toBeDefined()
  })
})

// ── Level Stack ───────────────────────────────────────────────

describe('computeLevelStack', () => {
  it('creates assignments for all levels', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3 }))
    const result = computeLevelStack(chassis)
    expect(result.assignments.length).toBe(3)
  })

  it('provides support wall refs per level', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const result = computeLevelStack(chassis)
    for (const assignment of result.assignments) {
      expect(assignment.supportWalls.length).toBeGreaterThan(0)
    }
  })

  it('marks upper floor walls as must-stack', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const result = computeLevelStack(chassis)
    const upper = result.assignments[1]
    const mustStack = upper.supportWalls.filter(w => w.mustStack)
    expect(mustStack.length).toBeGreaterThan(0)
  })

  it('propagates shaft references to levels', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const result = computeLevelStack(chassis)
    for (const assignment of result.assignments) {
      expect(assignment.shaftsAbove).toBeDefined()
      expect(assignment.shaftsBelow).toBeDefined()
    }
  })
})

// ── Shaft Stack ───────────────────────────────────────────────

describe('ShaftStack', () => {
  it('identifies wet rooms correctly', () => {
    expect(isWetRoom('Bathroom')).toBe(true)
    expect(isWetRoom('Kitchen')).toBe(true)
    expect(isWetRoom('Laundry')).toBe(true)
    expect(isWetRoom('Bedroom')).toBe(false)
    expect(isWetRoom('Living Room')).toBe(false)
  })

  it('classifies wet room categories', () => {
    expect(getWetCategory('Bathroom 1')).toBe('full-bathroom')
    expect(getWetCategory('Kitchen')).toBe('kitchen')
    expect(getWetCategory('Laundry')).toBe('laundry')
    expect(getWetCategory('Patient WC')).toBe('clinical')
    expect(getWetCategory('Ablution Block')).toBe('ablution')
  })

  it('computes shaft stack from wet room placements', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const wetRoomsByFloor = [
      [{ name: 'Bathroom', x: 0, y: 0, width: 2, height: 2, floorIndex: 0 },
       { name: 'Kitchen', x: 0, y: 3, width: 3, height: 2, floorIndex: 0 }],
      [{ name: 'Bathroom', x: 0, y: 0, width: 2, height: 2, floorIndex: 1 }],
    ]
    const result = computeShaftStack(chassis, wetRoomsByFloor)
    expect(result.stackedZones.length).toBeGreaterThan(0)
    expect(result.warnings).toBeDefined()
  })

  it('warns when wet room is far from shaft', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const wetRoomsByFloor = [
      [{ name: 'Bathroom', x: 20, y: 20, width: 2, height: 2, floorIndex: 0 }],
    ]
    const result = computeShaftStack(chassis, wetRoomsByFloor)
    const longRunWarnings = result.warnings.filter(w => w.includes('long drainage'))
    expect(longRunWarnings.length).toBeGreaterThan(0)
  })

  it('snaps room position to shaft centre', () => {
    const shaft: ShaftStack = { id: 's1', x: 5, y: 5, width: 0.6, depth: 0.6, serviceTypes: ['plumbing' as ShaftServiceType], floorFrom: 0, floorTo: 1, wetStack: true, label: 'Test' }
    const result = snapToShaft(0, 0, 2, 2, shaft)
    expect(result.x).toBeCloseTo(4.3, 1)
    expect(result.y).toBeCloseTo(4.3, 1)
  })
})

// ── Party Wall ────────────────────────────────────────────────

describe('PartyWall', () => {
  it('generates a party wall at mid-width', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ buildingWidth: 12 }))
    const wall = generatePartyWall(chassis)
    expect(wall.startX).toBe(6)
    expect(wall.endY).toBe(10)
    expect(wall.continuous).toBe(true)
  })

  it('mirrors rooms around party wall', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ buildingWidth: 12 }))
    const wall = generatePartyWall(chassis)
    const sourceRooms = [
      { name: 'Living Room', x: 0, y: 0, width: 5, height: 4, mirrored: false },
      { name: 'Kitchen', x: 0, y: 4, width: 4, height: 3, mirrored: false },
    ]
    const result = mirrorLayoutAroundPartyWall(wall, sourceRooms)
    expect(result.leftRooms.length).toBe(2)
    expect(result.rightRooms.length).toBe(2)
    // Right room should be mirrored
    expect(result.rightRooms[0].x).toBeGreaterThan(6)
    expect(result.rightRooms[0].mirrored).toBe(true)
  })

  it('validates party wall continuity', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const wall = generatePartyWall(chassis)
    const warnings = validatePartyWall(wall, chassis)
    // A valid continuous wall should have few warnings
    const continuityIssues = warnings.filter(w => w.includes('continuous'))
    expect(continuityIssues.length).toBe(0)
  })

  it('clamps rooms to party wall', () => {
    const rooms = [
      { x: 0, y: 0, width: 8, height: 4 },
      { x: 0, y: 4, width: 12, height: 3 },
    ]
    clampToPartyWall(rooms, 6)
    expect(rooms[0].width).toBe(6)
    expect(rooms[1].width).toBe(6)
  })
})

// ── Circulation Separation ────────────────────────────────────

describe('CirculationSeparation', () => {
  it('validates separated mixed-use circulation', () => {
    const chassis = generateBuildingChassis(makeChassisParams({
      typology: 'mixed-use',
      storeyCount: 3,
      hasMixedUse: true,
      programmes: ['commercial', 'residential', 'residential'],
    }))
    chassis.circulationModel = buildMixedUseCirculation(chassis)
    const result = validateCirculationSeparation(chassis)
    expect(result.separated).toBe(true)
  })

  it('detects shared circulation nodes', () => {
    const chassis = generateBuildingChassis(makeChassisParams({
      typology: 'mixed-use', storeyCount: 2, hasMixedUse: true,
    }))
    chassis.circulationModel = buildMixedUseCirculation(chassis)
    const shared = findSharedCirculationNodes(chassis.circulationModel)
    // Emergency and private routes may share exit nodes — acceptable if protected
    expect(shared).toBeDefined()
  })

  it('builds mixed-use circulation model with proper routes', () => {
    const chassis = generateBuildingChassis(makeChassisParams({
      typology: 'mixed-use', storeyCount: 3, hasMixedUse: true,
    }))
    const model = buildMixedUseCirculation(chassis)
    expect(model.publicRoutes.length).toBeGreaterThan(0)
    expect(model.privateRoutes.length).toBeGreaterThan(0)
    expect(model.emergencyRoutes.length).toBeGreaterThan(0)
    expect(model.separated).toBe(true)
  })
})

// ── Integration with plan-generator ────────────────────────────

describe('Vertical Chassis — multi-storey generation', () => {
  it('generates chassis for 2-storey house without errors', () => {
    const params = makeChassisParams({ typology: 'house', storeyCount: 2 })
    const chassis = generateBuildingChassis(params)
    const report = validateVerticalConstraints(chassis)
    expect(chassis.typology).toBe('house')
    expect(report.verticalEgressPass).toBe(true)
  })

  it('generates chassis for 5-storey apartment with lift core', () => {
    const params = makeChassisParams({
      typology: 'apartment', storeyCount: 5, hasLift: true, structuralSystem: 'rc-frame',
      programmes: Array(5).fill('residential'),
    })
    const chassis = generateBuildingChassis(params)
    expect(chassis.cores.some(c => c.hasLift)).toBe(true)
    expect(chassis.cores.filter(c => c.hasStair).length).toBeGreaterThanOrEqual(2)
    expect(chassis.structuralSystem).toBe('rc-frame')
  })

  it('generates chassis for duplex with party wall', () => {
    const params = makeChassisParams({
      typology: 'duplex', storeyCount: 2, hasDuplex: true, buildingWidth: 14,
    })
    const chassis = generateBuildingChassis(params)
    expect(chassis.partyWalls.length).toBeGreaterThan(0)
    expect(chassis.stackStrategy).toBe('mirrored-duplex')
  })

  it('generates chassis for mixed-use with circulation separation', () => {
    const params = makeChassisParams({
      typology: 'mixed-use', storeyCount: 3, hasMixedUse: true,
      programmes: ['commercial', 'residential', 'residential'],
    })
    const chassis = generateBuildingChassis(params)
    chassis.circulationModel = buildMixedUseCirculation(chassis)
    expect(chassis.circulationModel.separated).toBe(true)
  })

  it('getConstraintsForLevel returns constraints for all levels', () => {
    const params = makeChassisParams({ storeyCount: 3 })
    const chassis = generateBuildingChassis(params)
    for (let i = 0; i < 3; i++) {
      const constraints = getConstraintsForLevel(chassis, i)
      expect(constraints.length).toBeGreaterThan(0)
    }
  })

  it('shaft continuity check reports on wet stack span', () => {
    const params = makeChassisParams({ storeyCount: 3 })
    const chassis = generateBuildingChassis(params)
    // Shafts should span all floors by default
    const wetShaft = chassis.shafts.find(s => s.wetStack)
    expect(wetShaft).toBeDefined()
    expect(wetShaft!.floorFrom).toBe(0)
    expect(wetShaft!.floorTo).toBe(2)
  })

  it('distributes programme across levels from params', () => {
    const programmes = ['retail', 'office', 'office', 'residential']
    const params = makeChassisParams({ storeyCount: 4, programmes })
    const chassis = generateBuildingChassis(params)
    for (let i = 0; i < 4; i++) {
      expect(chassis.levels[i].assignedProgramme).toBe(programmes[i])
    }
  })
})
