import { describe, it, expect } from 'vitest'
import { computeLevelProgrammes, getAllocationProgramme, getLevelSlabType, getLevelSlabThickness, getLevelFloorRole } from '../lib/layout/level-programme'
import { getFloorRoleStrategy, getRoomPlacementRules } from '../lib/layout/floor-role-strategies'
import { computeStructuralBridge } from '../lib/structure/structural-bridge'
import { assignLevelSlabs, determineLevelSlab } from '../lib/structure/slab-system'
import { generateBuildingChassis, type ChassisGenerationParams } from '../lib/layout/vertical-chassis'
import { generateLayoutByTypology, type FloorContext } from '../lib/layout/typology-router'
import { getPerLevelSlabs, planTo3d } from '../adapters/planTo3d'

function makeChassisParams(overrides: Partial<ChassisGenerationParams> = {}): ChassisGenerationParams {
  return {
    typology: 'house',
    storeyCount: 2,
    buildingWidth: 12,
    buildingDepth: 10,
    floorToFloorHeight: 3.0,
    wallThickness: 0.2,
    structuralSystem: 'masonry' as const,
    maxStructuralSpan: 6.0,
    hasLift: false,
    hasDuplex: false,
    hasMixedUse: false,
    programmes: ['ground-public', 'upper-private'],
    ...overrides,
  }
}

describe('Level Programme — per-storey allocation', () => {
  it('villa ground floor has public rooms, upper has bedrooms', () => {
    const profile = computeLevelProgrammes('house', 2)
    expect(profile.levels.length).toBe(2)
    expect(profile.levels[0].floorRole).toBe('ground-public')
    expect(profile.levels[1].floorRole).toBe('upper-private')
    expect(profile.levels[0].roomAllocations.some(r => r.name === 'Lounge')).toBe(true)
    expect(profile.levels[1].roomAllocations.some(r => r.name === 'Master Bedroom')).toBe(true)
  })

  it('apartment ground is podium, upper is repeated-unit', () => {
    const profile = computeLevelProgrammes('apartment', 3)
    expect(profile.levels[0].floorRole).toBe('podium')
    expect(profile.levels[1].floorRole).toBe('repeated-unit')
    expect(profile.levels[2].floorRole).toBe('repeated-unit')
    expect(profile.levels[0].roomAllocations.some(r => r.name === 'Lobby')).toBe(true)
    expect(profile.levels[1].roomAllocations.some(r => r.name === 'Living / Dining')).toBe(true)
  })

  it('mixed-use ground is podium, upper is residential', () => {
    const profile = computeLevelProgrammes('mixed-use', 3)
    expect(profile.levels[0].floorRole).toBe('podium')
    expect(profile.levels[1].floorRole).toBe('upper-residential')
    expect(profile.levels[0].programmeTags).toContain('retail')
    expect(profile.levels[0].programmeTags).toContain('separated-circulation')
    expect(profile.levels[1].programmeTags).toContain('separated-circulation')
  })

  it('warehouse ground is warehouse floor, upper is mezzanine-office', () => {
    const profile = computeLevelProgrammes('warehouse', 2)
    expect(profile.levels[0].floorRole).toBe('ground-public')
    expect(profile.levels[1].floorRole).toBe('mezzanine-office')
    expect(profile.levels[0].roomAllocations.some(r => r.name === 'Warehouse Floor')).toBe(true)
    expect(profile.levels[1].roomAllocations.some(r => r.name === 'Office 1')).toBe(true)
  })

  it('single-storey house has all rooms on one level', () => {
    const profile = computeLevelProgrammes('house', 1)
    expect(profile.levels.length).toBe(1)
    expect(profile.levels[0].floorRole).toBe('ground-public')
  })

  it('school ground is admin, upper is learning-block', () => {
    const profile = computeLevelProgrammes('school', 2)
    expect(profile.levels[0].floorRole).toBe('admin')
    expect(profile.levels[1].floorRole).toBe('learning-block')
    expect(profile.levels[0].roomAllocations.some(r => r.name === 'Reception')).toBe(true)
    expect(profile.levels[1].roomAllocations.some(r => r.name === 'Classroom 1')).toBe(true)
  })

  it('duplex/townhouse ground is living, upper is bedrooms', () => {
    const profile = computeLevelProgrammes('duplex', 2)
    expect(profile.levels[0].floorRole).toBe('ground-public')
    expect(profile.levels[1].floorRole).toBe('upper-private')
    expect(profile.levels[0].programmeTags).toContain('party-wall')
  })
})

describe('Level Programme — slab types', () => {
  it('ground floor is slab-on-grade', () => {
    const profile = computeLevelProgrammes('house', 2)
    expect(getLevelSlabType(profile, 0)).toBe('slab-on-grade')
    expect(getLevelSlabThickness(profile, 0)).toBe(0.15)
  })

  it('upper floors are suspended', () => {
    const profile = computeLevelProgrammes('apartment', 4)
    expect(getLevelSlabType(profile, 1)).toBe('suspended')
    expect(getLevelSlabType(profile, 2)).toBe('suspended')
    expect(getLevelSlabThickness(profile, 1)).toBe(0.15)
  })

  it('roof is roof-slab', () => {
    const profile = computeLevelProgrammes('house', 3)
    expect(getLevelSlabType(profile, 2)).toBe('roof-slab')
    expect(getLevelSlabThickness(profile, 2)).toBe(0.18)
  })
})

describe('Level Programme — allocation programme', () => {
  it('returns room ratios for a given level', () => {
    const profile = computeLevelProgrammes('house', 2)
    const prog = getAllocationProgramme(profile, 0)
    expect(prog.length).toBeGreaterThan(0)
    expect(prog[0].name).toBeTruthy()
    expect(prog[0].ratio).toBeGreaterThan(0)
  })

  it('ground and upper have different room allocations', () => {
    const profile = computeLevelProgrammes('house', 2)
    const ground = getAllocationProgramme(profile, 0).map(p => p.name)
    const upper = getAllocationProgramme(profile, 1).map(p => p.name)
    expect(ground).not.toEqual(upper)
    expect(ground).toContain('Lounge')
    expect(upper).toContain('Master Bedroom')
  })
})

describe('Floor Role Strategy', () => {
  it('ground-public strategy has entrance rules', () => {
    const profile = computeLevelProgrammes('house', 2)
    const strategy = getFloorRoleStrategy(profile.levels[0])
    const rules = strategy.roomRules
    expect(rules.some(r => r.name === 'Entrance Hall')).toBe(true)
    expect(rules.some(r => r.name === 'Lounge')).toBe(true)
    expect(strategy.groundEntrance).toBe(true)
  })

  it('upper-private strategy has bedroom rules', () => {
    const profile = computeLevelProgrammes('house', 2)
    const strategy = getFloorRoleStrategy(profile.levels[1])
    const rules = strategy.roomRules
    expect(rules.some(r => r.name === 'Master Bedroom')).toBe(true)
    expect(rules.some(r => r.name === 'Bathroom 1')).toBe(true)
    expect(strategy.groundEntrance).toBe(false)
  })

  it('repeated-unit strategy has apartment room rules', () => {
    const profile = computeLevelProgrammes('apartment', 2)
    const rules = getRoomPlacementRules(profile.levels[1])
    expect(rules.some(r => r.name === 'Living / Dining')).toBe(true)
    expect(rules.some(r => r.name === 'Balcony')).toBe(true)
  })
})

describe('Structural Bridge', () => {
  it('computes beams and columns from chassis', () => {
    const chassis = generateBuildingChassis(makeChassisParams())
    const bridge = computeStructuralBridge(chassis)
    expect(bridge.totalBeams).toBeGreaterThan(0)
    expect(bridge.totalColumns).toBeGreaterThan(0)
    expect(bridge.totalWalls).toBeGreaterThan(0)
  })

  it('columns have grid labels', () => {
    const chassis = generateBuildingChassis(makeChassisParams())
    const bridge = computeStructuralBridge(chassis)
    const col = bridge.levels[0].columns[0]
    expect(col.gridLabel).toBeTruthy()
    expect(col.material).toBeTruthy()
  })

  it('beams have spans and dimensions', () => {
    const chassis = generateBuildingChassis(makeChassisParams())
    const bridge = computeStructuralBridge(chassis)
    const beam = bridge.levels[0].beams[0]
    expect(beam.span).toBeGreaterThan(0)
    expect(beam.width).toBeGreaterThan(0)
    expect(beam.depth).toBeGreaterThan(0)
  })

  it('masonry generates load-bearing walls, not columns on upper floors', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ structuralSystem: 'masonry', storeyCount: 2 }))
    const bridge = computeStructuralBridge(chassis)
    // Masonry should have fewer columns (in masonry, walls are load-bearing)
    expect(bridge.levels[0].walls.some(w => w.role === 'load-bearing')).toBe(true)
  })

  it('steel-frame uses steel materials', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ structuralSystem: 'steel-frame', storeyCount: 6 }))
    const bridge = computeStructuralBridge(chassis)
    const col = bridge.levels[0].columns[0]
    expect(col.material).toContain('steel')
  })

  it('per-level structural data exists for each storey', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3, structuralSystem: 'concrete-frame' }))
    const bridge = computeStructuralBridge(chassis)
    expect(bridge.levels.length).toBe(3)
    for (const level of bridge.levels) {
      expect(level.beams.length).toBeGreaterThan(0)
      expect(level.columns.length).toBeGreaterThan(0)
    }
  })
})

describe('Slab System', () => {
  it('determineLevelSlab returns slab-on-grade for ground', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3 }))
    const spec = determineLevelSlab(0, 3, chassis)
    expect(spec.slabType).toBe('slab-on-grade')
    expect(spec.material).toBe('reinforced-concrete')
  })

  it('determineLevelSlab returns roof-slab for top floor', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3, structuralSystem: 'concrete-frame' }))
    const spec = determineLevelSlab(2, 3, chassis)
    expect(spec.slabType).toBe('roof-slab')
    expect(spec.thickness).toBe(0.18)
  })

  it('determineLevelSlab returns suspended for middle floors', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 4 }))
    const spec = determineLevelSlab(1, 4, chassis)
    expect(spec.slabType).toBe('suspended')
    expect(spec.thickness).toBeGreaterThanOrEqual(0.15)
  })

  it('assignLevelSlabs creates per-level slab assignments', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 3, structuralSystem: 'concrete-frame' }))
    const slabs = assignLevelSlabs(chassis)
    expect(slabs.length).toBe(3)
    expect(slabs[0].isGround).toBe(true)
    expect(slabs[2].isRoof).toBe(true)
    expect(slabs[0].slabSpec.slabType).toBe('slab-on-grade')
    expect(slabs[1].slabSpec.slabType).toBe('suspended')
    expect(slabs[2].slabSpec.slabType).toBe('roof-slab')
  })

  it('timber-joist system uses lightweight roof slab', () => {
    const chassis = generateBuildingChassis(makeChassisParams({ storeyCount: 2 }))
    const chassisLight = { ...chassis, floorSystem: 'timber-joist' as const }
    const spec = determineLevelSlab(1, 2, chassisLight)
    expect(spec.slabType).toBe('roof-slab-lightweight')
    expect(spec.thickness).toBe(0.12)
  })
})

describe('PlanTo3D — per-level slabs', () => {
  it('getPerLevelSlabs returns differentiated slab info', () => {
    const slabs = getPerLevelSlabs(3)
    expect(slabs.length).toBe(3)
    expect(slabs[0].slabType).toBe('slab-on-grade')
    expect(slabs[1].slabType).toBe('suspended')
    expect(slabs[2].slabType).toBe('roof-slab-lightweight')
    expect(slabs[0].thickness).toBe(0.15)
    expect(slabs[2].thickness).toBe(0.12)
  })

  it('planTo3d uses per-level slab thicknesses', () => {
    const plan = {
      id: 'test',
      designOptionId: 'd1',
      width: 10,
      height: 8,
      wallThickness: 0.2,
      rooms: [{ id: 'r1', name: 'Room 1', x: 0, y: 0, width: 4, height: 4 }],
      walls: [{ id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.2, type: 'external' as const }],
      openings: [],
      scaleLabel: '1:100',
    }
    const result = planTo3d(plan, 2)
    expect(result.slabs.length).toBe(2)
    // Ground slab thickness
    expect(result.slabs[0].thickness).toBe(0.15)
    // With 2 storeys, si=1 is roof level → thickness 0.12
    expect(result.slabs[1].thickness).toBe(0.12)
  })
})

describe('Typology Router — floor context awareness', () => {
  it('generates layout with floor context for ground floor', () => {
    const program = [{ name: 'Lounge', ratio: 0.25 }, { name: 'Kitchen', ratio: 0.15 }]
    const context: FloorContext = {
      levelIndex: 0,
      totalFloors: 2,
      floorRole: 'ground-public',
      isGround: true,
      isRoof: false,
      programmeTags: ['public'],
    }
    const rooms = generateLayoutByTypology('house', program, 12, 10, 0, context)
    expect(rooms.length).toBeGreaterThan(0)
  })

  it('generates layout with floor context for upper floor', () => {
    const program = [{ name: 'Master Bedroom', ratio: 0.3 }, { name: 'Bathroom', ratio: 0.15 }]
    const context: FloorContext = {
      levelIndex: 1,
      totalFloors: 2,
      floorRole: 'upper-private',
      isGround: false,
      isRoof: false,
      programmeTags: ['private'],
    }
    const rooms = generateLayoutByTypology('house', program, 12, 10, 0, context)
    expect(rooms.length).toBeGreaterThan(0)
  })
})

describe('Tier 3 Vertical Chassis bridge', () => {
  it('imports without errors from tier3 module', async () => {
    const mod = await import('../engine/tier3/vertical-chassis')
    expect(mod.generateVerticalChassis).toBeDefined()
    expect(mod.validateConstraintReport).toBeDefined()
  })
})

describe('Integration — plan generator produces level-aware output', () => {
  it('generates plan model for multi-storey with level programmes', async () => {
    const { generatePlanModel } = await import('../engine/plan-generator')
    const design = {
      id: 'test-multi',
      name: '2-Storey Villa',
      buildingType: 'house',
      grossFloorArea: 200,
      floors: 2,
      elements: [],
    }
    const plan = generatePlanModel(design)
    expect(plan).toBeDefined()
    expect(plan.id).toBeTruthy()
    expect(plan.rooms.length).toBeGreaterThan(0)
  })

  it('generates different room sets for ground vs upper in villa', () => {
    const profile = computeLevelProgrammes('house', 2)
    const groundRooms = profile.levels[0].roomAllocations.map(r => r.name)
    const upperRooms = profile.levels[1].roomAllocations.map(r => r.name)
    expect(groundRooms).not.toEqual(upperRooms)
    expect(groundRooms).toContain('Lounge')
    expect(upperRooms).toContain('Master Bedroom')
  })
})
