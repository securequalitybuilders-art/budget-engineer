import { describe, it, expect } from 'vitest'
import { parseBrief } from '@/engine/parseBrief'
import { generateDesignConcept } from '@/engine/tier2/conceptEngine'
import { generateLayoutParameters, generateFloorPlans } from '@/engine/tier3/layoutEngine'
import type { PlacedRoom } from '@/engine/tier3/layoutEngine'
import { floorPlanToPlanModel } from '@/adapters/floorPlanToPlanModel'
import type { DesignOption } from '@/domain/boq'

function makeDesignOption(buildingType: string): DesignOption {
  return { id: 'test-' + buildingType, name: buildingType, grossFloorArea: 500, floors: 1, buildingType, elements: [] }
}

function roomsIntersect(a: PlacedRoom, b: PlacedRoom): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function assertNoOverlaps(rooms: PlacedRoom[], label: string) {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      expect(roomsIntersect(rooms[i], rooms[j]),
        `${label}: "${rooms[i].name}" overlaps "${rooms[j].name}"`
      ).toBe(false)
    }
  }
}

function checkFiniteDimensions(rooms: PlacedRoom[], label: string) {
  for (const r of rooms) {
    expect(Number.isFinite(r.x), `${label}: "${r.name}" x finite`).toBe(true)
    expect(Number.isFinite(r.y), `${label}: "${r.name}" y finite`).toBe(true)
    expect(Number.isFinite(r.width), `${label}: "${r.name}" width finite`).toBe(true)
    expect(Number.isFinite(r.height), `${label}: "${r.name}" height finite`).toBe(true)
    expect(r.width, `${label}: "${r.name}" width > 0`).toBeGreaterThan(0)
    expect(r.height, `${label}: "${r.name}" height > 0`).toBeGreaterThan(0)
  }
}

describe('school-classroom — Tier 1→3 pipeline', () => {
  const brief = parseBrief('Build a primary school with classrooms, staff room, and toilets', { buildingType: 'auto' })
  const concept = generateDesignConcept(brief)
  const params = generateLayoutParameters(concept, brief)
  const plans = generateFloorPlans(params, brief)

  it('Tier 1 program includes key school spaces', () => {
    const names = brief.program.map(p => p.name)
    expect(names).toContain('Classroom')
    expect(names).toContain('Staff Room')
    expect(names).toContain("Head's Office")
    expect(names).toContain('Store')
    expect(names).toContain('Toilet Block')
    expect(names).not.toContain('Bedroom')
    expect(names).not.toContain('Living Room')
  })

  it('returns exactly 3 plans with distinct topology labels', () => {
    expect(plans).toHaveLength(3)
    const topos = plans.map(p => p.topology)
    expect(new Set(topos).size).toBe(3)
  })

  it('all plans have no overlapping rooms and finite positive dimensions', () => {
    for (const plan of plans) {
      assertNoOverlaps(plan.rooms, `school-${plan.topology}`)
      checkFiniteDimensions(plan.rooms, `school-${plan.topology}`)
    }
  })

  it('each plan includes classroom-type spaces (not house bedrooms)', () => {
    for (const plan of plans) {
      const names = plan.rooms.map(r => r.name)
      expect(names.some(n => n.includes('Classroom') || n.includes('Staff') || n.includes('Toilet'))).toBe(true)
      expect(names.some(n => n === 'Bedroom' || n === 'Living Room' || n === 'Master Bedroom')).toBe(false)
    }
  })

  it('floorPlanToPlanModel converts to a valid PlanModel without throwing', () => {
    const design = makeDesignOption('school-classroom')
    for (const plan of plans) {
      const model = floorPlanToPlanModel(plan, design)
      expect(model).toBeDefined()
      expect(model.width).toBeGreaterThan(0)
      expect(model.height).toBeGreaterThan(0)
      expect(model.walls.length).toBeGreaterThan(0)
      expect(model.openings.length).toBeGreaterThan(0)
      for (const r of model.rooms) {
        expect(Number.isFinite(r.x)).toBe(true)
        expect(r.width).toBeGreaterThan(0)
        expect(r.height).toBeGreaterThan(0)
      }
    }
  })
})

describe('office-commercial — Tier 1→3 pipeline', () => {
  const brief = parseBrief('Build a commercial office building with open plan workspaces, private offices, meeting rooms, reception', { buildingType: 'auto' })
  const concept = generateDesignConcept(brief)
  const params = generateLayoutParameters(concept, brief)
  const plans = generateFloorPlans(params, brief)

  it('Tier 1 program includes key office spaces', () => {
    const names = brief.program.map(p => p.name)
    expect(names).toContain('Open-Plan Office')
    expect(names).toContain('Private Office')
    expect(names).toContain('Meeting Room')
    expect(names).toContain('Reception')
    expect(names).toContain('Kitchenette')
    expect(names).toContain('Toilet')
    expect(names).not.toContain('Classroom')
    expect(names).not.toContain('Bedroom')
  })

  it('returns exactly 3 plans with distinct topology labels', () => {
    expect(plans).toHaveLength(3)
    const topos = plans.map(p => p.topology)
    expect(new Set(topos).size).toBe(3)
  })

  it('all plans have no overlapping rooms and finite positive dimensions', () => {
    for (const plan of plans) {
      assertNoOverlaps(plan.rooms, `office-${plan.topology}`)
      checkFiniteDimensions(plan.rooms, `office-${plan.topology}`)
    }
  })

  it('each plan includes office-type spaces (not house or school rooms)', () => {
    for (const plan of plans) {
      const names = plan.rooms.map(r => r.name)
      expect(names.some(n => n.includes('Office') || n.includes('Meeting') || n.includes('Reception'))).toBe(true)
      expect(names.some(n => n === 'Bedroom' || n === 'Classroom')).toBe(false)
    }
  })

  it('floorPlanToPlanModel converts to a valid PlanModel without throwing', () => {
    const design = makeDesignOption('office-commercial')
    for (const plan of plans) {
      const model = floorPlanToPlanModel(plan, design)
      expect(model).toBeDefined()
      expect(model.width).toBeGreaterThan(0)
      expect(model.height).toBeGreaterThan(0)
      expect(model.walls.length).toBeGreaterThan(0)
      expect(model.openings.length).toBeGreaterThan(0)
      for (const r of model.rooms) {
        expect(Number.isFinite(r.x)).toBe(true)
        expect(r.width).toBeGreaterThan(0)
        expect(r.height).toBeGreaterThan(0)
      }
    }
  })
})

describe('church-worship — Tier 1→3 pipeline', () => {
  const brief = parseBrief('Build a church with a main sanctuary, childrens ministry rooms, clergy room, kitchen, and toilets', { buildingType: 'auto' })
  const concept = generateDesignConcept(brief)
  const params = generateLayoutParameters(concept, brief)
  const plans = generateFloorPlans(params, brief)

  it('Tier 1 program includes key church spaces', () => {
    const names = brief.program.map(p => p.name)
    expect(names).toContain('Main Hall / Sanctuary')
    expect(names).toContain('Sunday School Room')
    expect(names).toContain("Pastor's Office")
    expect(names).toContain('Kitchen')
    expect(names).toContain('Toilet Block')
    expect(names).not.toContain('Bedroom')
    expect(names).not.toContain('Classroom')
    expect(names).not.toContain('Open-Plan Office')
  })

  it('returns exactly 3 plans with distinct topology labels', () => {
    expect(plans).toHaveLength(3)
    const topos = plans.map(p => p.topology)
    expect(new Set(topos).size).toBe(3)
  })

  it('all plans have no overlapping rooms and finite positive dimensions', () => {
    for (const plan of plans) {
      assertNoOverlaps(plan.rooms, `church-${plan.topology}`)
      checkFiniteDimensions(plan.rooms, `church-${plan.topology}`)
    }
  })

  it('each plan includes church-type spaces (not house or office rooms)', () => {
    for (const plan of plans) {
      const names = plan.rooms.map(r => r.name)
      expect(names.some(n => n.includes('Sanctuary') || n.includes('Sunday School') || n.includes("Pastor's Office") || n.includes('Toilet'))).toBe(true)
      expect(names.some(n => n === 'Bedroom' || n === 'Open-Plan Office' || n === 'Classroom')).toBe(false)
    }
  })

  it('floorPlanToPlanModel converts to a valid PlanModel without throwing', () => {
    const design = makeDesignOption('church-worship')
    for (const plan of plans) {
      const model = floorPlanToPlanModel(plan, design)
      expect(model).toBeDefined()
      expect(model.width).toBeGreaterThan(0)
      expect(model.height).toBeGreaterThan(0)
      expect(model.walls.length).toBeGreaterThan(0)
      expect(model.openings.length).toBeGreaterThan(0)
      for (const r of model.rooms) {
        expect(Number.isFinite(r.x)).toBe(true)
        expect(r.width).toBeGreaterThan(0)
        expect(r.height).toBeGreaterThan(0)
      }
    }
  })
})

describe('typology cross-comparison — school vs office vs church', () => {
  const schoolBrief = parseBrief('Build a primary school with 6 classrooms', { buildingType: 'auto' })
  const officeBrief = parseBrief('Build a commercial office building', { buildingType: 'auto' })
  const churchBrief = parseBrief('Build a church with a sanctuary', { buildingType: 'auto' })

  const schoolProgram = schoolBrief.program.map(p => p.name)
  const officeProgram = officeBrief.program.map(p => p.name)
  const churchProgram = churchBrief.program.map(p => p.name)

  it('school program has no office or church signature rooms', () => {
    expect(schoolProgram).not.toContain('Open-Plan Office')
    expect(schoolProgram).not.toContain('Main Hall / Sanctuary')
  })

  it('office program has no school or church signature rooms', () => {
    expect(officeProgram).not.toContain('Classroom')
    expect(officeProgram).not.toContain('Main Hall / Sanctuary')
  })

  it('church program has no school or office signature rooms', () => {
    expect(churchProgram).not.toContain('Classroom')
    expect(churchProgram).not.toContain('Open-Plan Office')
  })

  it('all three typologies produce the correct topology count', () => {
    const schoolPlans = generateFloorPlans(generateLayoutParameters(generateDesignConcept(schoolBrief), schoolBrief), schoolBrief)
    const officePlans = generateFloorPlans(generateLayoutParameters(generateDesignConcept(officeBrief), officeBrief), officeBrief)
    const churchPlans = generateFloorPlans(generateLayoutParameters(generateDesignConcept(churchBrief), churchBrief), churchBrief)
    expect(schoolPlans).toHaveLength(3)
    expect(officePlans).toHaveLength(3)
    expect(churchPlans).toHaveLength(3)
  })
})
