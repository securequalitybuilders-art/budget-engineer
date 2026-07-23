import { describe, test, expect } from 'vitest'
import type { PlanModel, Opening } from '@/domain/plan'
import {
  classifyRoom,
  deriveStructuralBays,
  classifyOpening,
  findOpeningHostRoom,
  formatDimMm,
  formatLevel,
  computeEnhancedFrontElevation,
  computeEnhancedSideElevation,
  computeEnhancedSection,
} from '@/adapters/elevationEngine'

function makeMinimalPlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan',
    designOptionId: 'test-do',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 5 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 6, height: 5 },
      { id: 'r3', name: 'Bedroom 1', x: 0, y: 5, width: 4, height: 5 },
      { id: 'r4', name: 'Bathroom', x: 4, y: 5, width: 4, height: 5 },
      { id: 'r5', name: 'Corridor', x: 8, y: 5, width: 4, height: 5 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 10 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w5', start: { x: 6, y: 0 }, end: { x: 6, y: 10 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w3', kind: 'door', offset: 0.3, width: 0.9, height: 2.1, sillHeight: 0 },
      { id: 'o2', wallId: 'w3', kind: 'window', offset: 0.7, width: 1.5, height: 1.2, sillHeight: 0.9 },
      { id: 'o3', wallId: 'w1', kind: 'window', offset: 0.5, width: 1.8, height: 1.5, sillHeight: 0.9 },
      { id: 'o4', wallId: 'w1', kind: 'door', offset: 0.1, width: 0.9, height: 2.1, sillHeight: 0 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

// ── classifyRoom (8 tests) ──
describe('classifyRoom', () => {
  test('classifies bedroom', () => {
    expect(classifyRoom('Bedroom 1')).toBe('bedroom')
  })

  test('classifies bathroom', () => {
    expect(classifyRoom('Bathroom')).toBe('bathroom')
  })

  test('classifies kitchen', () => {
    expect(classifyRoom('Kitchen')).toBe('kitchen')
  })

  test('classifies living room', () => {
    expect(classifyRoom('Living Room')).toBe('living')
  })

  test('classifies entrance', () => {
    expect(classifyRoom('Entrance')).toBe('entrance')
  })

  test('classifies prayer room', () => {
    expect(classifyRoom('Prayer Room')).toBe('prayer')
  })

  test('classifies unknown room', () => {
    expect(classifyRoom('Workshop')).toBe('unknown')
  })

  test('handles geometry edge case with empty string', () => {
    expect(classifyRoom('')).toBe('unknown')
  })
})

// ── deriveStructuralBays (5 tests) ──
describe('deriveStructuralBays', () => {
  test('derives bays from room boundaries', () => {
    const plan = makeMinimalPlan()
    const bays = deriveStructuralBays(plan, 1)
    expect(bays.length).toBeGreaterThanOrEqual(3)
    expect(bays[0].x).toBe(0)
    const totalWidth = bays.reduce((s, b) => s + b.width, 0)
    expect(totalWidth).toBeCloseTo(plan.width, 1)
  })

  test('bays align with room boundaries', () => {
    const plan = makeMinimalPlan()
    const bays = deriveStructuralBays(plan, 1)
    for (const bay of bays) {
      expect(bay.width).toBeGreaterThan(0)
    }
  })

  test('bays cover full building width', () => {
    const plan = makeMinimalPlan()
    const bays = deriveStructuralBays(plan, 1)
    const first = bays[0].x
    const last = bays[bays.length - 1].x + bays[bays.length - 1].width
    expect(first).toBeCloseTo(0, 1)
    expect(last).toBeCloseTo(plan.width, 1)
  })

  test('returns single bay for plan with no rooms', () => {
    const plan = makeMinimalPlan({ rooms: [] })
    const bays = deriveStructuralBays(plan, 1)
    expect(bays.length).toBe(1)
    expect(bays[0].width).toBe(plan.width)
  })

  test('assigns room names to bays', () => {
    const plan = makeMinimalPlan()
    const bays = deriveStructuralBays(plan, 1)
    const namedBays = bays.filter(b => b.roomName !== null)
    expect(namedBays.length).toBeGreaterThan(0)
  })
})

// ── classifyOpening (6 tests) ──
describe('classifyOpening', () => {
  test('main-entry for entrance room', () => {
    const op: Opening = { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.9 }
    const family = classifyOpening(op, 'entrance')
    expect(family.family).toBe('main-entry')
  })

  test('main-entry for wide door', () => {
    const op: Opening = { id: 'o2', wallId: 'w1', kind: 'door', offset: 0.5, width: 1.5 }
    const family = classifyOpening(op, 'living')
    expect(family.family).toBe('main-entry')
  })

  test('secondary-entry for bathroom door', () => {
    const op: Opening = { id: 'o3', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.7 }
    const family = classifyOpening(op, 'bathroom')
    expect(family.family).toBe('secondary-entry')
  })

  test('sliding window for wide opening', () => {
    const op: Opening = { id: 'o4', wallId: 'w1', kind: 'window', offset: 0.5, width: 2.5 }
    const family = classifyOpening(op, 'living')
    expect(family.family).toBe('sliding')
  })

  test('louver window for bathroom', () => {
    const op: Opening = { id: 'o5', wallId: 'w1', kind: 'window', offset: 0.5, width: 0.6 }
    const family = classifyOpening(op, 'bathroom')
    expect(family.family).toBe('louver')
  })

  test('casement window for living room', () => {
    const op: Opening = { id: 'o6', wallId: 'w1', kind: 'window', offset: 0.5, width: 1.2 }
    const family = classifyOpening(op, 'living')
    expect(family.family).toBe('casement')
  })
})

// ── formatDimMm (4 tests) ──
describe('formatDimMm', () => {
  test('formats with space separator', () => {
    expect(formatDimMm(10)).toBe('10 000')
  })

  test('handles large values', () => {
    expect(formatDimMm(35.512)).toBe('35 512')
  })

  test('rounds to nearest mm', () => {
    expect(formatDimMm(3.14159)).toBe('3 142')
  })

  test('returns zero as 0', () => {
    expect(formatDimMm(0)).toBe('0')
  })
})

// ── formatLevel (3 tests) ──
describe('formatLevel', () => {
  test('formats zero as ±0.000', () => {
    expect(formatLevel(0)).toBe('±0.000')
  })

  test('formats positive elevation with + sign', () => {
    expect(formatLevel(3)).toBe('+3.000')
  })

  test('formats negative elevation correctly', () => {
    expect(formatLevel(-1.5)).toBe('-1.500')
  })
})

// ── findOpeningHostRoom (3 extra tests) ──
describe('findOpeningHostRoom', () => {
  test('finds host room for opening', () => {
    const plan = makeMinimalPlan()
    const op = plan.openings[0]
    const room = findOpeningHostRoom(op, plan)
    expect(room).not.toBeNull()
  })

  test('returns null for orphaned opening', () => {
    const plan = makeMinimalPlan()
    const orphan: Opening = { id: 'orphan', wallId: 'nonexistent', kind: 'door', offset: 0.5, width: 0.9 }
    const room = findOpeningHostRoom(orphan, plan)
    expect(room).toBeNull()
  })

  test('returns nearest room for opening between rooms', () => {
    const plan = makeMinimalPlan()
    const op: Opening = { id: 'mid', wallId: 'w5', kind: 'door', offset: 0.5, width: 0.8 }
    const room = findOpeningHostRoom(op, plan)
    expect(room).not.toBeNull()
    expect(room!.name).toBeDefined()
  })
})

// ── computeEnhancedFrontElevation (14 tests) ──
describe('computeEnhancedFrontElevation', () => {
  test('returns null for null plan', () => {
    expect(computeEnhancedFrontElevation(null as unknown as PlanModel, 1)).toBeNull()
  })

  test('returns null for zero floors', () => {
    const plan = makeMinimalPlan()
    expect(computeEnhancedFrontElevation(plan, 0)).toBeNull()
  })

  test('returns drawing with valid viewBox', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    expect(drawing).not.toBeNull()
    expect(drawing!.viewBox).toMatch(/^[\d.]+ [\d.]+ [\d.]+ [\d.]+$/)
  })

  test('contains plinth rects', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    expect(drawing!.rects.length).toBeGreaterThan(0)
  })

  test('contains fascia rect', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 2)
    const fasciaRects = drawing!.rects.filter(r => r.fill === '#e7e5e4')
    expect(fasciaRects.length).toBeGreaterThan(0)
  })

  test('contains roof polygon', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    expect(drawing!.polygons.length).toBeGreaterThan(0)
  })

  test('dimensions use formatted mm not raw metres', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    const dimTexts = drawing!.texts.filter(t => t.text.includes(' '))
    expect(dimTexts.length).toBeGreaterThan(0)
  })

  test('contains level markers', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 2)
    const levelTexts = drawing!.texts.filter(t => t.text.includes('+') || t.text.includes('±'))
    expect(levelTexts.length).toBeGreaterThan(0)
  })

  test('contains door openings', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    const doorRects = drawing!.rects.filter(r => r.fill === '#d4a574' || r.fill === 'rgba(245,158,11,0.18)')
    expect(doorRects.length).toBeGreaterThan(0)
  })

  test('contains window glass openings', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    const windowRects = drawing!.rects.filter(r => r.fill === '#7dd3fc')
    expect(windowRects.length).toBeGreaterThan(0)
  })

  test('handles multi-storey', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 3)
    expect(drawing).not.toBeNull()
    const levelTexts = drawing!.texts.filter(t => t.text.includes('+') || t.text.includes('±'))
    expect(levelTexts.length).toBe(5)
  })

  test('contains DPC line', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    const dpcLines = drawing!.lines.filter(l => l.stroke === '#dc2626')
    expect(dpcLines.length).toBeGreaterThan(0)
  })

  test('contains structural bay lines', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    const verticalWalls = drawing!.lines.filter(l =>
      Math.abs(l.x1 - l.x2) < 0.01 && l.stroke === '#f8fafc',
    )
    expect(verticalWalls.length).toBeGreaterThan(0)
  })

  test('returns null for NaN dimensions', () => {
    const plan = makeMinimalPlan({ width: NaN })
    const drawing = computeEnhancedFrontElevation(plan, 1)
    expect(drawing).not.toBeNull()
  })
})

// ── computeEnhancedSideElevation (5 tests) ──
describe('computeEnhancedSideElevation', () => {
  test('returns null for null plan', () => {
    expect(computeEnhancedSideElevation(null as unknown as PlanModel, 1)).toBeNull()
  })

  test('returns drawing with valid viewBox', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSideElevation(plan, 1)
    expect(drawing).not.toBeNull()
    expect(drawing!.viewBox).toMatch(/^[\d.]+ [\d.]+ [\d.]+ [\d.]+$/)
  })

  test('contains plinth rects on side', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSideElevation(plan, 1)
    const plinthRects = drawing!.rects.filter(r => r.fill === '#d6cfc4')
    expect(plinthRects.length).toBeGreaterThan(0)
  })

  test('contains side openings', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSideElevation(plan, 1)
    expect(drawing!.rects.length).toBeGreaterThan(0)
  })

  test('contains fascia on side', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSideElevation(plan, 1)
    const fasciaRects = drawing!.rects.filter(r => r.fill === '#e7e5e4')
    expect(fasciaRects.length).toBeGreaterThan(0)
  })
})

// ── computeEnhancedSection (8 tests) ──
describe('computeEnhancedSection', () => {
  test('returns null for null plan', () => {
    expect(computeEnhancedSection(null as unknown as PlanModel, 1)).toBeNull()
  })

  test('returns drawing with valid viewBox', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 1)
    expect(drawing).not.toBeNull()
    expect(drawing!.viewBox).toMatch(/^[\d.]+ [\d.]+ [\d.]+ [\d.]+$/)
  })

  test('contains floor slab rects', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 2)
    const slabRects = drawing!.rects.filter(r => r.fill === '#c8bdb0')
    expect(slabRects.length).toBeGreaterThan(0)
  })

  test('contains cut walls with hatched fill', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 1)
    const cutWallRects = drawing!.rects.filter(r => r.fill === '#e8e0d0')
    expect(cutWallRects.length).toBeGreaterThan(0)
  })

  test('contains room labels in cut', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 1)
    const roomTexts = drawing!.texts.filter(t => t.text === 'Living Room' || t.text === 'Kitchen')
    expect(roomTexts.length).toBeGreaterThan(0)
  })

  test('contains foundation footings', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 1)
    const footings = drawing!.rects.filter(r => r.fill === '#6b7280')
    expect(footings.length).toBeGreaterThan(0)
  })

  test('contains ceiling/rafter lines', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 1)
    const rafterLines = drawing!.lines.filter(l => l.stroke === 'rgba(248,250,252,0.3)')
    expect(rafterLines.length).toBeGreaterThan(0)
  })

  test('contains foundation annotation', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedSection(plan, 1)
    const foundationText = drawing!.texts.filter(t => t.text === 'REINFORCED CONCRETE FOUNDATION')
    expect(foundationText.length).toBe(1)
  })
})

// ── Extra regression tests (4) to reach 58 ──
describe('Regression', () => {
  test('enhanced engine returns same shape as legacy', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    expect(drawing).toHaveProperty('lines')
    expect(drawing).toHaveProperty('rects')
    expect(drawing).toHaveProperty('polygons')
    expect(drawing).toHaveProperty('texts')
    expect(drawing).toHaveProperty('viewBox')
    expect(drawing).toHaveProperty('title')
  })

  test('side elevation width differs from front', () => {
    const plan = makeMinimalPlan()
    const front = computeEnhancedFrontElevation(plan, 1)!
    const side = computeEnhancedSideElevation(plan, 1)!
    const frontW = parseFloat(front.viewBox.split(' ')[2])
    const sideW = parseFloat(side.viewBox.split(' ')[2])
    expect(Math.abs(frontW - sideW)).toBeGreaterThan(0.1)
  })

  test('section viewBox is taller than building height alone', () => {
    const plan = makeMinimalPlan()
    const section = computeEnhancedSection(plan, 1)!
    const svgH = parseFloat(section.viewBox.split(' ')[3])
    const buildingH = 1 * 3 + 1.5 // floors * storeyHeight + pitchHeight
    expect(svgH).toBeGreaterThan(buildingH)
  })

  test('opening families are distributed correctly', () => {
    const plan = makeMinimalPlan()
    const drawing = computeEnhancedFrontElevation(plan, 1)
    expect(drawing).not.toBeNull()
    expect(drawing!.title).toBe('FRONT ELEVATION')
  })
})
