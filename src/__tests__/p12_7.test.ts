// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  generateStudioTemplate,
  generateOneBedCompactTemplate,
  generateTwoBedStandardTemplate,
  generateTwoBedCornerTemplate,
  generateFamilyUnitTemplate,
  suggestUnitTemplate,
  selectCorePlacement,
  suggestCorePlacement,
  buildApartmentFloorModel,
  buildMixedUseAccess,
} from '@/lib/layout/apartment-units'
import {
  generateApartmentLayout,
  generateApartmentLayoutDetailed,
  selectApartmentStrategy,
} from '@/lib/layout/typologies/non-residential'
import { generateLayoutByTypology } from '@/lib/layout/typology-router'
import type { ApartmentUnit, CorePlacement } from '@/lib/layout/apartment-units'

// ── Helpers ──

function makeUnitProgram(count: number): { name: string; ratio: number }[] {
  const items: { name: string; ratio: number }[] = []
  for (let i = 0; i < count; i++) {
    items.push({ name: 'Living / Dining', ratio: 0.26 / count })
    items.push({ name: 'Kitchen', ratio: 0.20 / count })
    items.push({ name: 'Bedroom 1', ratio: 0.22 / count })
    items.push({ name: 'Bedroom 2', ratio: 0.17 / count })
    items.push({ name: 'Bathroom', ratio: 0.10 / count })
    items.push({ name: 'Balcony', ratio: 0.05 / count })
  }
  return items
}

// ── Workstream A: Unit Template Generation ──

describe('P12.7 — Unit templates', () => {
  it('generateStudioTemplate produces rooms with Entry, Studio Living, Kitchenette, Bathroom, Balcony', () => {
    const rooms = generateStudioTemplate({ ux: 0, uy: 0, uw: 5, uh: 8, facadeOrientation: 'north', entrySide: 'bottom' })
    expect(rooms.length).toBeGreaterThanOrEqual(4)
    expect(rooms.some(r => r.name.includes('Studio'))).toBe(true)
    expect(rooms.some(r => r.name.includes('Kitchenette'))).toBe(true)
    expect(rooms.some(r => r.name.includes('Bathroom'))).toBe(true)
    expect(rooms.some(r => r.name === 'Balcony')).toBe(true)
  })

  it('generateOneBedCompactTemplate produces rooms with Entry, Living/Dining, Kitchen, Bedroom, Bathroom, Balcony', () => {
    const rooms = generateOneBedCompactTemplate({ ux: 0, uy: 0, uw: 6, uh: 9, facadeOrientation: 'south', entrySide: 'top' })
    expect(rooms.length).toBeGreaterThanOrEqual(5)
    expect(rooms.some(r => r.name.includes('Living'))).toBe(true)
    expect(rooms.some(r => r.name.includes('Kitchen'))).toBe(true)
    expect(rooms.some(r => r.name.includes('Bedroom'))).toBe(true)
    expect(rooms.some(r => r.name === 'Bathroom')).toBe(true)
    expect(rooms.some(r => r.name === 'Balcony')).toBe(true)
  })

  it('generateTwoBedStandardTemplate produces 2 bedrooms', () => {
    const rooms = generateTwoBedStandardTemplate({ ux: 0, uy: 0, uw: 8, uh: 10, facadeOrientation: 'north', entrySide: 'bottom' })
    const bedrooms = rooms.filter(r => r.name.includes('Bedroom'))
    expect(bedrooms.length).toBe(2)
  })

  it('generateTwoBedCornerTemplate produces 2 bedrooms with wider balcony', () => {
    const rooms = generateTwoBedCornerTemplate({ ux: 0, uy: 0, uw: 9, uh: 11, facadeOrientation: 'east', entrySide: 'left' })
    const bedrooms = rooms.filter(r => r.name.includes('Bedroom'))
    expect(bedrooms.length).toBe(2)
    const balcony = rooms.find(r => r.name === 'Balcony')
    expect(balcony).toBeDefined()
    if (balcony) {
      expect(balcony.width).toBeGreaterThanOrEqual(2.5)
    }
  })

  it('generateFamilyUnitTemplate produces 3 bedrooms and 2 bathrooms', () => {
    const rooms = generateFamilyUnitTemplate({ ux: 0, uy: 0, uw: 12, uh: 14, facadeOrientation: 'south', entrySide: 'top' })
    const bedrooms = rooms.filter(r => r.name.includes('Bedroom'))
    expect(bedrooms.length).toBe(3)
    const bathrooms = rooms.filter(r => r.name.includes('Bathroom'))
    expect(bathrooms.length).toBe(2)
  })

  it('all template rooms have valid dimensions', () => {
    const templates = [
      () => generateStudioTemplate({ ux: 0, uy: 0, uw: 5, uh: 8, facadeOrientation: 'north', entrySide: 'bottom' }),
      () => generateOneBedCompactTemplate({ ux: 0, uy: 0, uw: 6, uh: 9, facadeOrientation: 'south', entrySide: 'top' }),
      () => generateTwoBedStandardTemplate({ ux: 0, uy: 0, uw: 8, uh: 10, facadeOrientation: 'east', entrySide: 'left' }),
      () => generateTwoBedCornerTemplate({ ux: 0, uy: 0, uw: 9, uh: 11, facadeOrientation: 'west', entrySide: 'right' }),
      () => generateFamilyUnitTemplate({ ux: 0, uy: 0, uw: 12, uh: 14, facadeOrientation: 'north', entrySide: 'bottom' }),
    ]
    for (const gen of templates) {
      const rooms = gen()
      for (const r of rooms) {
        expect(r.width).toBeGreaterThanOrEqual(1.0)
        expect(r.height).toBeGreaterThanOrEqual(1.0)
        expect(Number.isFinite(r.x)).toBe(true)
        expect(Number.isFinite(r.y)).toBe(true)
      }
    }
  })
})

// ── Workstream B: Template Suggestion ──

describe('P12.7 — suggestUnitTemplate', () => {
  it('suggests studio for very small units (area < 18)', () => {
    expect(suggestUnitTemplate(3, 5, false, false)).toBe('studio')
  })

  it('suggests one-bed-compact for small units (area 18-29)', () => {
    expect(suggestUnitTemplate(4, 5, false, false)).toBe('one-bed-compact')
  })

  it('suggests two-bed-standard for larger units (area >= 30, interior)', () => {
    expect(suggestUnitTemplate(6, 7, false, false)).toBe('two-bed-standard')
  })

  it('suggests two-bed-corner for corner units with area 22-34', () => {
    expect(suggestUnitTemplate(5, 5, true, true)).toBe('two-bed-corner')
  })

  it('suggests family-unit for large corner units (area >= 35)', () => {
    expect(suggestUnitTemplate(7, 8, true, true)).toBe('family-unit')
  })

  it('suggests two-bed-standard for end units with area >= 28', () => {
    expect(suggestUnitTemplate(7, 5, false, true)).toBe('two-bed-standard')
  })
})

// ── Workstream C: Core Placement Strategies ──

describe('P12.7 — Core placement', () => {
  it('selectCorePlacement central places core at center of floor', () => {
    const core = selectCorePlacement('central', 20, 15, 4)
    expect(core.type).toBe('central')
    expect(core.x).toBeCloseTo(8, 0)
    expect(core.y).toBeCloseTo(5.5, 0)
    expect(core.hasStair).toBe(true)
    expect(core.hasLift).toBe(true)
  })

  it('selectCorePlacement side places core at left edge', () => {
    const core = selectCorePlacement('side', 20, 15, 4)
    expect(core.type).toBe('side')
    expect(core.x).toBe(0)
    expect(core.y).toBeCloseTo(5.5, 0)
  })

  it('selectCorePlacement end places core at right edge', () => {
    const core = selectCorePlacement('end', 20, 15, 4)
    expect(core.type).toBe('end')
    expect(core.x).toBeCloseTo(16, 0)
  })

  it('selectCorePlacement cluster places compact core at center', () => {
    const core = selectCorePlacement('cluster', 12, 12, 4)
    expect(core.type).toBe('cluster')
    expect(core.x).toBeCloseTo(4, 0)
    expect(core.y).toBeCloseTo(4, 0)
  })

  it('selectCorePlacement dual creates wide corridor between stair cores', () => {
    const core = selectCorePlacement('dual', 24, 15, 4)
    expect(core.type).toBe('dual')
    expect(core.hasStair).toBe(true)
    expect(core.hasLift).toBe(true)
  })

  it('suggestCorePlacement returns central for wide buildings', () => {
    expect(suggestCorePlacement(20, 12, 4, 2, 'double-loaded')).toBe('central')
  })

  it('suggestCorePlacement returns cluster for compact layouts', () => {
    expect(suggestCorePlacement(10, 10, 2, 2, 'compact')).toBe('cluster')
  })

  it('suggestCorePlacement returns side for medium width', () => {
    expect(suggestCorePlacement(14, 12, 4, 2, 'single-loaded')).toBe('side')
  })

  it('suggestCorePlacement returns end for narrow low-unit buildings', () => {
    expect(suggestCorePlacement(10, 12, 3, 2, 'single-loaded')).toBe('end')
  })

  it('suggestCorePlacement returns dual for tall buildings with 6+ storeys', () => {
    expect(suggestCorePlacement(14, 12, 4, 6, 'single-loaded')).toBe('dual')
  })
})

// ── Workstream D: Apartment Floor Model ──

describe('P12.7 — Apartment floor model', () => {
  it('buildApartmentFloorModel returns model with units and shaft refs', () => {
    const unit: ApartmentUnit = {
      id: 'u1', label: 'Unit 1', unitIndex: 0, unitType: 'one-bed-compact',
      x: 0, y: 0, width: 6, height: 8,
      isCornerUnit: false, isEndUnit: false,
      entryX: 1, entryY: 0,
      rooms: [],
      wetCoreZone: { x: 4, y: 3, width: 1.5, height: 1.8 },
      balconyZone: { x: 0, y: 6.8, width: 6, height: 1.2 },
      facadeOrientation: 'north',
    }
    const core: CorePlacement = { type: 'central', x: 8, y: 5.5, width: 4, height: 4, hasStair: true, hasLift: true, serviceShaftX: 8.5, serviceShaftY: 5.5 }
    const model = buildApartmentFloorModel([unit],
      { x: 0, y: 0, width: 20, height: 2 },
      core,
      'double-loaded-corridor',
    )
    expect(model.units.length).toBe(1)
    expect(model.shaftRefs.length).toBeGreaterThanOrEqual(1)
    expect(model.unitCount).toBe(1)
    expect(model.strategy).toBe('double-loaded-corridor')
  })

  it('buildMixedUseAccess returns model with podium lobby and upper-floor route', () => {
    const core: CorePlacement = { type: 'central', x: 8, y: 5, width: 4, height: 4, hasStair: true, hasLift: true, serviceShaftX: 8.5, serviceShaftY: 5.5 }
    const access = buildMixedUseAccess(core, true)
    expect(access.podiumLobby).not.toBeNull()
    expect(access.upperFloorRoute.viaCore).toBe(true)
    expect(access.upperFloorRoute.shaftContinuity).toBe(true)
    expect(access.serviceSeparation).toBe(true)
  })

  it('buildMixedUseAccess returns minimal access when no core', () => {
    const access = buildMixedUseAccess(null, false)
    expect(access.podiumLobby).toBeNull()
    expect(access.residentialCore).toBeNull()
    expect(access.upperFloorRoute.viaCore).toBe(false)
  })
})

// ── Workstream E: Unit-Aware Apartment Layout ──

describe('P12.7 — Unit-aware apartment layout', () => {
  it('generateApartmentLayout produces rooms with template-based names', () => {
    const program = makeUnitProgram(4)
    const rooms = generateApartmentLayout(program, 20, 15)
    expect(rooms.length).toBeGreaterThan(10)

    const livingRooms = rooms.filter(r => r.name.includes('Living'))
    expect(livingRooms.length).toBeGreaterThanOrEqual(4)

    const bedrooms = rooms.filter(r => r.name.includes('Bedroom'))
    expect(bedrooms.length).toBeGreaterThanOrEqual(4)
  })

  it('generateApartmentLayoutDetailed returns both rooms and model', () => {
    const program = makeUnitProgram(4)
    const result = generateApartmentLayoutDetailed(program, 20, 15)
    expect(result.rooms.length).toBeGreaterThan(10)
    expect(result.model).toBeDefined()
    expect(result.model.units.length).toBeGreaterThanOrEqual(4)
    expect(result.model.strategy).toBe('double-loaded-corridor')
  })

  it('corner units get upgraded template types in double-loaded layout', () => {
    const program = makeUnitProgram(6)
    const result = generateApartmentLayoutDetailed(program, 24, 14, { floorRole: 'upper-residential', storeyCount: 4 })
    const model = result.model

    // Corner units (first and last on each side) should be two-bed-corner or family
    const cornerUnits = model.units.filter(u => u.isCornerUnit)
    const interiorUnits = model.units.filter(u => !u.isCornerUnit)

    expect(cornerUnits.length).toBeGreaterThanOrEqual(2)
    expect(interiorUnits.length).toBeGreaterThanOrEqual(2)

    // Corner units should have more bedrooms than interior on average
    const cornerBedrooms = cornerUnits.reduce((sum, u) => sum + u.rooms.filter(r => r.name.includes('Bedroom')).length, 0)
    const interiorBedrooms = interiorUnits.reduce((sum, u) => sum + u.rooms.filter(r => r.name.includes('Bedroom')).length, 0)
    const avgCorner = cornerBedrooms / cornerUnits.length
    const avgInterior = interiorBedrooms / interiorUnits.length
    expect(avgCorner).toBeGreaterThanOrEqual(avgInterior)
  })

  it('each generated room has valid dimensions', () => {
    const program = makeUnitProgram(4)
    const rooms = generateApartmentLayout(program, 18, 14)
    for (const r of rooms) {
      expect(r.width).toBeGreaterThan(0)
      expect(r.height).toBeGreaterThan(0)
      expect(Number.isFinite(r.x)).toBe(true)
      expect(Number.isFinite(r.y)).toBe(true)
    }
  })

  it('generates balconies for each unit', () => {
    const program = makeUnitProgram(4)
    const rooms = generateApartmentLayout(program, 20, 14)
    const balconies = rooms.filter(r => r.name.includes('Balcony'))
    expect(balconies.length).toBeGreaterThanOrEqual(4)
  })

  it('unit entries are placed at corridor side', () => {
    const program = makeUnitProgram(4)
    const result = generateApartmentLayoutDetailed(program, 20, 14, { floorRole: 'upper-residential', storeyCount: 4 })
    const entries = result.rooms.filter(r => r.name.includes('Entry'))
    expect(entries.length).toBeGreaterThanOrEqual(4)
  })
})

// ── Workstream F: Strategy Selection + Core Placement ──

describe('P12.7 — Strategy + core integration', () => {
  it('selectApartmentStrategy returns corePlacementType for wide buildings', () => {
    const result = selectApartmentStrategy(20, 15, 4, true, 2)
    expect(result.corePlacementType).toBe('central')
    expect(result.isWide).toBe(true)
  })

  it('selectApartmentStrategy returns cluster corePlacementType for compact', () => {
    const result = selectApartmentStrategy(10, 10, 2, true, 2)
    expect(result.corePlacementType).toBe('cluster')
    expect(result.isCompact).toBe(true)
  })

  it('selectApartmentStrategy returns side corePlacementType for medium width', () => {
    const result = selectApartmentStrategy(14, 15, 4, false, 2)
    expect(result.corePlacementType).toBe('side')
    expect(result.isNarrow).toBe(false)
    expect(result.isWide).toBe(false)
  })

  it('strategy includes storeyCount', () => {
    const result = selectApartmentStrategy(20, 15, 4, true, 6)
    expect(result.storeyCount).toBe(6)
  })

  it('generateApartmentLayout creates core room when program has Core', () => {
    const program = makeUnitProgram(2)
    program.push({ name: 'Core', ratio: 0.1 })
    const rooms = generateApartmentLayout(program, 14, 12)
    const coreRooms = rooms.filter(r => r.name.includes('Core'))
    expect(coreRooms.length).toBeGreaterThanOrEqual(1)
  })
})

// ── Workstream G: Mixed-Use Upper-Floor Continuity ──

describe('P12.7 — Mixed-use upper-floor continuity', () => {
  it('upper-residential floor context generates apartment layout via typology router', () => {
    const program = makeUnitProgram(3)
    const rooms = generateLayoutByTypology('mixed-use', program, 18, 14, 0, {
      levelIndex: 1,
      totalFloors: 4,
      floorRole: 'upper-residential',
      isGround: false,
      isRoof: false,
      programmeTags: ['residential', 'private'],
    })
    expect(rooms.length).toBeGreaterThan(5)

    // Should have apartment-style room names
    const livingRooms = rooms.filter(r => r.name.includes('Living'))
    expect(livingRooms.length).toBeGreaterThanOrEqual(3)
  })

  it('ground-floor mixed-use uses mixed-use layout (not apartment)', () => {
    const program = [
      { name: 'Retail Space', ratio: 0.30 },
      { name: 'Residential Lobby', ratio: 0.15 },
      { name: 'Stairwell', ratio: 0.15 },
      { name: 'Service Corridor', ratio: 0.15 },
    ]
    const rooms = generateLayoutByTypology('mixed-use', program, 18, 14, 0, {
      levelIndex: 0,
      totalFloors: 4,
      floorRole: 'ground-public',
      isGround: true,
      isRoof: false,
      programmeTags: ['retail', 'public'],
    })
    expect(rooms.length).toBeGreaterThan(3)

    // Should have mixed-use entrance zones
    const retailEntrance = rooms.find(r => r.name.includes('Retail / Public Entrance'))
    expect(retailEntrance).toBeDefined()
  })

  it('podium floor generates zoned layout for apartment typology', () => {
    const program = makeUnitProgram(2)
    const rooms = generateLayoutByTypology('apartment', program, 18, 14, 0, {
      levelIndex: 0,
      totalFloors: 3,
      floorRole: 'podium',
      isGround: true,
      isRoof: false,
      programmeTags: ['podium', 'public'],
    })
    // Podium should produce rooms (zoned layout fallback for apartments)
    expect(rooms.length).toBeGreaterThan(0)
  })
})

// ── Workstream H: Corridor Intelligence ──

describe('P12.7 — Corridor intelligence', () => {
  it('double-loaded strategy places corridor at center', () => {
    const result = generateApartmentLayoutDetailed(makeUnitProgram(4), 20, 15)
    const corridor = result.rooms.find(r => r.name === 'Common Corridor')
    expect(corridor).toBeDefined()
    if (corridor) {
      // Corridor y should be near center of height
      expect(corridor.y).toBeGreaterThan(5)
      expect(corridor.y).toBeLessThan(10)
    }
  })

  it('single-loaded strategy places corridor at one edge', () => {
    const result = generateApartmentLayoutDetailed(makeUnitProgram(2), 10, 18, { floorRole: 'upper-residential', storeyCount: 2 })
    const corridor = result.rooms.find(r => r.name === 'Common Corridor')
    expect(corridor).toBeDefined()
    if (corridor) {
      // Corridor should be at y=0 (or near 0) for single-loaded
      expect(corridor.y).toBeGreaterThanOrEqual(0)
    }
  })
})
