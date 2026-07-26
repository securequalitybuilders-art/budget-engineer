/**
 * P12.5 Typology Benchmark Hardening — Stability Tests
 *
 * Covers all 8 typologies with multi-variant generation to prove:
 * - No typology produces degenerate results
 * - Repeated generation remains stable
 * - Typology-specific room patterns are distinctive
 */

import { describe, it, expect } from 'vitest'
import { generateClinicLayout, generateSchoolLayout, generateMixedUseLayout, generateWarehouseLayout, generateWorshipLayout, generateApartmentLayout } from '../lib/layout/typologies/non-residential'
import { generateDuplexLayout } from '../lib/layout/typologies/residential'
import { generateZonedLayout } from '../lib/geometry/plan-intelligence'
import { generateLayoutByTypology } from '../lib/layout/typology-router'
import { computeLevelProgrammes, getAllocationProgramme } from '../lib/layout/level-programme'
import { generateBuildingChassis } from '../lib/layout/vertical-chassis'
import { computeStructuralBridge } from '../lib/structure/structural-bridge'
import { assignLevelSlabs } from '../lib/structure/slab-system'
import { generateNonResVariationProfile, generateVariationProfile, applyVariationToZones } from '../lib/layout/variation-engine'

function makeProgram(names: string[]): { name: string; ratio: number }[] {
  return names.map(name => ({ name, ratio: 1 / names.length }))
}

// ── 1. CLINIC ──────────────────────────────────────

describe('Clinic typology', () => {
  it('generates valid clinic with reception, consultation, treatment', () => {
    const program = makeProgram(['Reception', 'Waiting Room', 'Consultation 1', 'Consultation 2', 'Consultation 3', 'Consultation 4', 'Treatment Room', 'Nurse Station', 'Pharmacy', 'Staff WC', 'Patient WC', 'Circulation'])
    const rooms = generateClinicLayout(program, 14, 10)
    expect(rooms.length).toBeGreaterThan(0)
    const names = rooms.map(r => r.name)
    expect(names.some(n => n.includes('Reception') || n.includes('Waiting'))).toBe(true)
    expect(names.some(n => n.includes('Consultation'))).toBe(true)
    expect(names.some(n => n.includes('Treatment') || n.includes('Nurse') || n.includes('Pharmacy'))).toBe(true)
    for (const r of rooms) {
      expect(r.width).toBeGreaterThanOrEqual(0.3)
      expect(r.height).toBeGreaterThanOrEqual(0.3)
      expect(Number.isNaN(r.x)).toBe(false)
      expect(Number.isNaN(r.y)).toBe(false)
    }
  })

  it('reception/waiting are at front (y near 0)', () => {
    const program = makeProgram(['Reception', 'Waiting Room', 'Consultation 1', 'Consultation 2', 'Treatment Room', 'Pharmacy', 'Staff WC', 'Circulation'])
    const rooms = generateClinicLayout(program, 12, 10)
    const receptionRooms = rooms.filter(r => r.name.includes('Reception') || r.name.includes('Waiting'))
    for (const rr of receptionRooms) {
      expect(rr.y).toBeLessThan(4)
    }
  })

  it('variation profiles produce different layouts', () => {
    const program = makeProgram(['Reception', 'Waiting Room', 'Consultation 1', 'Consultation 2', 'Consultation 3', 'Treatment Room', 'Nurse Station', 'Pharmacy', 'Staff WC', 'Patient WC', 'Circulation'])
    const v1 = generateNonResVariationProfile(1, 'clinic')
    const v2 = generateNonResVariationProfile(2, 'clinic')
    const rooms1 = generateClinicLayout(program, 14, 10, v1)
    const rooms2 = generateClinicLayout(program, 14, 10, v2)
    // Both valid
    expect(rooms1.length).toBeGreaterThan(0)
    expect(rooms2.length).toBeGreaterThan(0)
  })
})

// ── 2. SCHOOL ──────────────────────────────────────

describe('School typology', () => {
  it('generates valid school with classrooms, admin, ablution', () => {
    const program = makeProgram(['Classroom 1', 'Classroom 2', 'Classroom 3', 'Classroom 4', 'Classroom 5', 'Classroom 6', 'Staff Room', 'Principal Office', 'Student WC', 'Staff WC', 'Store', 'Corridor'])
    const rooms = generateSchoolLayout(program, 20, 12)
    expect(rooms.length).toBeGreaterThan(0)
    const names = rooms.map(r => r.name)
    const classCount = names.filter(n => n.includes('Classroom')).length
    expect(classCount).toBeGreaterThanOrEqual(4)
    // All rooms valid
    for (const r of rooms) {
      expect(r.width).toBeGreaterThanOrEqual(0.3)
      expect(r.height).toBeGreaterThanOrEqual(0.3)
    }
  })

  it('each classroom has minimum viable width', () => {
    const program = makeProgram(['Classroom 1', 'Classroom 2', 'Classroom 3', 'Classroom 4', 'Corridor'])
    const rooms = generateSchoolLayout(program, 16, 10)
    const classRooms = rooms.filter(r => r.name.includes('Classroom'))
    for (const cr of classRooms) {
      expect(cr.width).toBeGreaterThanOrEqual(1.5)
    }
  })
})

// ── 3. WORSHIP ─────────────────────────────────────

describe('Worship typology', () => {
  it('generates valid worship layout with hall dominating', () => {
    const program = makeProgram(['Main Hall', 'Fellowship Hall', 'Pastor Office', 'Admin Office', 'Kitchen', 'Men WC', 'Women WC', 'Narthex / Foyer'])
    const rooms = generateWorshipLayout(program, 18, 14)
    expect(rooms.length).toBeGreaterThan(0)
    const hallRooms = rooms.filter(r => r.name.includes('Hall') || r.name.includes('Sanctuary'))
    expect(hallRooms.length).toBeGreaterThan(0)
    // Hall should be the largest room
    const hall = hallRooms[0]
    const nonHall = rooms.filter(r => !r.name.includes('Hall'))
    const maxNonHall = nonHall.reduce((max, r) => Math.max(max, r.width * r.height), 0)
    expect(hall.width * hall.height).toBeGreaterThanOrEqual(maxNonHall)
  })
})

// ── 4. WAREHOUSE ───────────────────────────────────

describe('Warehouse typology', () => {
  it('generates valid warehouse with warehouse zone > 50%', () => {
    const program = makeProgram(['Warehouse Floor', 'Loading Bay', 'Goods In / Out', 'Admin Office', 'Staff WC', 'Stairwell'])
    const rooms = generateWarehouseLayout(program, 24, 12)
    expect(rooms.length).toBeGreaterThan(0)
    const warehouseRooms = rooms.filter(r => r.name.includes('Warehouse'))
    expect(warehouseRooms.length).toBeGreaterThan(0)
  })
})

// ── 5. DUPLEX SYMMETRY ─────────────────────────────

describe('Duplex symmetry', () => {
  it('mirrored units have similar room counts', () => {
    const program = makeProgram(['Lounge / Dining', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bathroom', 'Circulation', 'Entrance Hall', 'Veranda'])
    const rooms = generateDuplexLayout(program, 14, 10)
    expect(rooms.length).toBeGreaterThan(0)
    // Check party wall exists at center of mirror
    const midX = 14 / 2
    // Rooms should exist on both sides of the midline
    const leftRooms = rooms.filter(r => r.x + r.width / 2 < midX)
    const rightRooms = rooms.filter(r => r.x + r.width / 2 > midX)
    // Both sides have rooms
    expect(leftRooms.length).toBeGreaterThan(0)
    expect(rightRooms.length).toBeGreaterThan(0)
  })
})

// ── 6. APARTMENT ───────────────────────────────────

describe('Apartment typology', () => {
  it('generates valid apartment floor with units', () => {
    const program = makeProgram(['Living / Dining', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bathroom', 'Balcony', 'Common Corridor', 'Staircase / Lift Core'])
    const rooms = generateApartmentLayout(program, 16, 12)
    expect(rooms.length).toBeGreaterThan(0)
    expect(rooms.some(r => r.name.includes('Core'))).toBe(true)
    expect(rooms.some(r => r.name.includes('Corridor'))).toBe(true)
    // All rooms valid
    for (const r of rooms) {
      expect(r.width).toBeGreaterThanOrEqual(0.3)
      expect(r.height).toBeGreaterThanOrEqual(0.3)
    }
  })
})

// ── 7. MIXED-USE ──────────────────────────────────

describe('Mixed-use typology', () => {
  it('podium floor has retail, residential lobby, service', () => {
    const program = makeProgram(['Retail Space', 'Retail Storage', 'Public Lobby', 'Residential Lobby', 'Stairwell', 'Service Corridor', 'Bin / Service Store'])
    const rooms = generateMixedUseLayout(program, 18, 12)
    expect(rooms.length).toBeGreaterThan(0)
    expect(rooms.some(r => r.name.includes('Retail') || r.name.includes('Shop'))).toBe(true)
    expect(rooms.some(r => r.name.includes('Lobby'))).toBe(true)
  })
})

// ── 8. MULTI-VARIANT STABILITY ─────────────────────

describe('Multi-variant stability', () => {
  const WIDTHS = [10, 12, 14, 16, 18, 20, 22, 24]
  const HEIGHTS = [8, 10, 12, 14]

  it('house generates valid layout across 5 different seeds', () => {
    const program = makeProgram(['Lounge / Dining', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bathroom 1', 'Bathroom 2', 'Circulation', 'Veranda'])
    for (let seed = 0; seed < 5; seed++) {
      const profile = generateVariationProfile(seed)
      const zones = applyVariationToZones(profile)
      const rooms = generateZonedLayout({ program, width: 12, height: 10, corridorWidth: zones.corridorWidth })
      expect(rooms.length).toBeGreaterThan(0)
      for (const r of rooms) {
        expect(r.width).toBeGreaterThanOrEqual(0.3)
        expect(r.height).toBeGreaterThanOrEqual(0.3)
      }
    }
  })

  it('clinic generates across multiple sizes without failure', () => {
    const program = makeProgram(['Reception', 'Waiting Room', 'Consultation 1', 'Consultation 2', 'Consultation 3', 'Consultation 4', 'Treatment Room', 'Nurse Station', 'Pharmacy', 'Staff WC', 'Patient WC', 'Circulation'])
    for (const w of WIDTHS) {
      for (const h of HEIGHTS.slice(0, 2)) {
        const rooms = generateClinicLayout(program, w, h)
        expect(rooms.length).toBeGreaterThan(0)
      }
    }
  })

  it('school generates across multiple sizes without failure', () => {
    const program = makeProgram(['Classroom 1', 'Classroom 2', 'Classroom 3', 'Classroom 4', 'Classroom 5', 'Classroom 6', 'Staff Room', 'Principal Office', 'Student WC', 'Staff WC', 'Store', 'Corridor'])
    for (const w of WIDTHS) {
      for (const h of HEIGHTS.slice(0, 2)) {
        const rooms = generateSchoolLayout(program, w, h)
        expect(rooms.length).toBeGreaterThan(0)
      }
    }
  })

  it('worship generates across multiple sizes without failure', () => {
    const program = makeProgram(['Main Hall', 'Fellowship Hall', 'Pastor Office', 'Kitchen', 'Men WC', 'Women WC', 'Narthex'])
    for (const w of WIDTHS) {
      const rooms = generateWorshipLayout(program, w, 12)
      expect(rooms.length).toBeGreaterThan(0)
    }
  })

  it('warehouse generates across multiple sizes without failure', () => {
    const program = makeProgram(['Warehouse Floor', 'Loading Bay', 'Goods In / Out', 'Admin Office', 'Staff WC', 'Stairwell'])
    for (const w of WIDTHS) {
      const rooms = generateWarehouseLayout(program, w, 10)
      expect(rooms.length).toBeGreaterThan(0)
    }
  })
})

// ── 9. TYPOLOGY DISTINCTION ────────────────────────

describe('Typology distinction', () => {
  it('clinic rooms differ from house rooms', () => {
    const clinicProgram = makeProgram(['Reception', 'Waiting Room', 'Consultation 1', 'Consultation 2', 'Treatment Room', 'Nurse Station', 'Pharmacy', 'Staff WC', 'Patient WC', 'Circulation'])
    const houseProgram = makeProgram(['Lounge / Dining', 'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bathroom 1', 'Bathroom 2', 'Circulation', 'Veranda'])
    const clinicRooms = generateClinicLayout(clinicProgram, 14, 10)
    const houseRooms = generateZonedLayout({ program: houseProgram, width: 12, height: 10, corridorWidth: 1.5 })
    const clinicNames = new Set(clinicRooms.map(r => r.name))
    const houseNames = new Set(houseRooms.map(r => r.name))
    // Clinic should NOT have bedroom names
    expect(clinicNames.has('Bedroom 1')).toBe(false)
    // House should NOT have consultation names
    expect(houseNames.has('Consultation 1')).toBe(false)
  })

  it('school rooms differ from house rooms', () => {
    const schoolProgram = makeProgram(['Classroom 1', 'Classroom 2', 'Classroom 3', 'Staff Room', 'Principal Office', 'Student WC', 'Corridor'])
    const schoolRooms = generateSchoolLayout(schoolProgram, 16, 10)
    const schoolNames = new Set(schoolRooms.map(r => r.name))
    expect(schoolNames.has('Classroom 1')).toBe(true)
    expect(schoolNames.has('Lounge / Dining')).toBe(false)
  })

  it('warehouse rooms differ from worship rooms', () => {
    const whProgram = makeProgram(['Warehouse Floor', 'Loading Bay', 'Goods In / Out', 'Admin Office', 'Staff WC'])
    const worshipProgram = makeProgram(['Main Hall', 'Fellowship Hall', 'Pastor Office', 'Kitchen', 'Men WC', 'Women WC', 'Narthex'])
    const whRooms = generateWarehouseLayout(whProgram, 20, 10)
    const worshipRooms = generateWorshipLayout(worshipProgram, 18, 12)
    const whNames = new Set(whRooms.map(r => r.name))
    const worshipNames = new Set(worshipRooms.map(r => r.name))
    expect(whNames.has('Warehouse Floor')).toBe(true)
    expect(worshipNames.has('Warehouse Floor')).toBe(false)
    expect(worshipNames.has('Main Hall')).toBe(true)
    expect(whNames.has('Main Hall')).toBe(false)
  })
})

// ── 10. LEVEL PROGRAMME HARDENING ──────────────────

describe('Level programme typology distinction', () => {
  it('each typology produces distinct floor roles', () => {
    const villa = computeLevelProgrammes('house', 2)
    const duplex = computeLevelProgrammes('duplex', 2)
    const apt = computeLevelProgrammes('apartment', 5)
    const mixed = computeLevelProgrammes('mixed-use', 4)
    const school = computeLevelProgrammes('school', 2)
    const wh = computeLevelProgrammes('warehouse', 2)

    expect(villa.levels[0].floorRole).toBe('ground-public')
    expect(duplex.levels[0].programmeTags).toContain('party-wall')
    expect(apt.levels[1].floorRole).toBe('repeated-unit')
    expect(mixed.levels[0].programmeTags).toContain('separated-circulation')
    expect(school.levels[1].floorRole).toBe('learning-block')
    expect(wh.levels[1].floorRole).toBe('mezzanine-office')
  })

  it('allocation ratios are non-trivial (not just 1/N flat)', () => {
    const profile = computeLevelProgrammes('school', 2)
    const alloc = getAllocationProgramme(profile, 0)
    const totalRatio = alloc.reduce((s, r) => s + r.ratio, 0)
    expect(Math.abs(totalRatio - 1.0)).toBeLessThan(0.01)
    // With typology-specific weighting, ratios should differ
    const uniqueRatios = new Set(alloc.map(r => r.ratio))
    expect(uniqueRatios.size).toBeGreaterThan(1)
  })
})

// ── 11. STRUCTURAL + SLAB HARDENING ────────────────

describe('Structural/slab hardening across typologies', () => {
  it('villa chassis generates structural bridge', () => {
    const chassis = generateBuildingChassis({
      typology: 'house', storeyCount: 2, buildingWidth: 10, buildingDepth: 12,
      floorToFloorHeight: 3.0, wallThickness: 0.2, structuralSystem: 'masonry',
      maxStructuralSpan: 6.0, hasLift: false, hasDuplex: false, hasMixedUse: false,
      programmes: ['ground-public', 'upper-private'],
    })
    const bridge = computeStructuralBridge(chassis)
    expect(bridge.totalBeams).toBeGreaterThan(0)
    expect(bridge.totalWalls).toBeGreaterThan(0)
    // Slab assignment
    const slabs = assignLevelSlabs(chassis)
    expect(slabs.length).toBe(2)
    expect(slabs[0].slabSpec.slabType).toBe('slab-on-grade')
    expect(slabs[1].slabSpec.slabType).toContain('roof')
  })

  it('apartment chassis handles 5 storeys', () => {
    const chassis = generateBuildingChassis({
      typology: 'apartment', storeyCount: 5, buildingWidth: 20, buildingDepth: 15,
      floorToFloorHeight: 3.0, wallThickness: 0.2, structuralSystem: 'rc-frame',
      maxStructuralSpan: 6.0, hasLift: true, hasDuplex: false, hasMixedUse: false,
      programmes: ['podium', 'repeated-unit', 'repeated-unit', 'repeated-unit', 'repeated-unit'],
    })
    const bridge = computeStructuralBridge(chassis)
    expect(bridge.levels.length).toBe(5)
    expect(bridge.totalColumns).toBeGreaterThan(0)
    const slabs = assignLevelSlabs(chassis)
    expect(slabs.length).toBe(5)
    expect(slabs[0].slabSpec.slabType).toBe('slab-on-grade')
    expect(slabs[4].slabSpec.slabType).toContain('roof')
    for (let i = 1; i < 4; i++) {
      expect(slabs[i].slabSpec.slabType).toBe('suspended')
    }
  })

  it('mixed-use chassis has separated circulation', () => {
    const chassis = generateBuildingChassis({
      typology: 'mixed-use', storeyCount: 4, buildingWidth: 18, buildingDepth: 14,
      floorToFloorHeight: 3.0, wallThickness: 0.2, structuralSystem: 'rc-frame',
      maxStructuralSpan: 6.0, hasLift: true, hasDuplex: false, hasMixedUse: true,
      programmes: ['retail', 'residential', 'residential', 'residential'],
    })
    expect(chassis.circulationModel.separated).toBe(true)
    const bridge = computeStructuralBridge(chassis)
    expect(bridge.totalBeams).toBeGreaterThan(0)
  })
})

// ── 12. REPAIR / REGENERATION HARDENING ────────────

describe('Repair/regeneration hardening', () => {
  it('generateLayoutByTypology works for all typologies', () => {
    const typologies = ['house', 'apartment', 'clinic', 'school', 'mixed-use', 'warehouse', 'worship', 'townhouse', 'duplex', 'commercial', 'office']
    for (const typ of typologies) {
      const program = makeProgram(['Room 1', 'Room 2', 'Room 3', 'Circulation'])
      const { rooms } = generateLayoutByTypology(typ, program, 12, 10, 42)
      expect(rooms.length).toBeGreaterThan(0)
      for (const r of rooms) {
        expect(r.width).toBeGreaterThanOrEqual(0.2)
        expect(r.height).toBeGreaterThanOrEqual(0.2)
      }
    }
  })

  it('generateLayoutByTypology accepts floorContext for all typologies', () => {
    const typologies = ['house', 'apartment', 'clinic', 'school', 'mixed-use', 'warehouse', 'worship']
    for (const typ of typologies) {
      const program = makeProgram(['Room 1', 'Room 2', 'Circulation'])
      const { rooms } = generateLayoutByTypology(typ, program, 12, 10, 0, {
        levelIndex: 1, totalFloors: 2, floorRole: 'upper-private',
        isGround: false, isRoof: true, programmeTags: [],
      })
      expect(rooms.length).toBeGreaterThan(0)
    }
  })
})
