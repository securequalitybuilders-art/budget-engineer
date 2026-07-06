import { describe, it, expect } from 'vitest'
import type { PlanModel } from '@/domain/plan'
import {
  computeFrontElevation,
  computeSideElevation,
  computeSection,
  emptyDrawing,
} from '@/adapters/planToElevations'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan',
    designOptionId: 'test',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 8 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 4, height: 8 },
    ],
    walls: [
      { id: 'w-bottom', start: { x: 0, y: 8 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-top', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w-left', start: { x: 0, y: 0 }, end: { x: 0, y: 8 }, thickness: 0.23, type: 'external' },
      { id: 'w-right', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w-bottom', kind: 'door', offset: 0.5, width: 0.9 },
      { id: 'o2', wallId: 'w-bottom', kind: 'window', offset: 0.2, width: 1.2 },
      { id: 'o3', wallId: 'w-right', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

describe('computeFrontElevation', () => {
  it('returns null for empty plan', () => {
    expect(computeFrontElevation(null as unknown as PlanModel, 1)).toBeNull()
  })

  it('returns null for zero-width plan', () => {
    const plan = makePlan({ width: 0 })
    expect(computeFrontElevation(plan, 1)).toBeNull()
  })

  it('returns null for zero floors', () => {
    expect(computeFrontElevation(makePlan(), 0)).toBeNull()
  })

  it('overall width equals building width plus padding', () => {
    const plan = makePlan()
    const result = computeFrontElevation(plan, 1)
    expect(result).not.toBeNull()
    const [,, w] = result!.viewBox.split(' ').map(Number)
    expect(w).toBeCloseTo(plan.width + 4, 0) // PADDING * 2 = 4
  })

  it('total height equals storey height + pitch height + padding', () => {
    const result = computeFrontElevation(makePlan(), 2, 3, 1.5)
    expect(result).not.toBeNull()
    const [,,, h] = result!.viewBox.split(' ').map(Number)
    expect(h).toBeCloseTo(2 * 3 + 1.5 + 4, 1) // walls + roof + padding
  })

  it('contains a gable roof polygon', () => {
    const result = computeFrontElevation(makePlan(), 1)
    expect(result!.polygons.length).toBeGreaterThanOrEqual(1)
  })

  it('contains ground line', () => {
    const result = computeFrontElevation(makePlan(), 1)
    const groundLines = result!.lines.filter(l => l.strokeWidth && l.strokeWidth >= 0.06)
    expect(groundLines.length).toBeGreaterThanOrEqual(1)
  })

  it('contains door and window rects for front-face openings × floors', () => {
    const plan = makePlan()
    const result = computeFrontElevation(plan, 3)
    // w-bottom has a door (o1) and a window (o2) — both on front face
    // Only openings on front-facing walls (y = plan.height = 8)
    // w-bottom is the only front wall with openings
    expect(result!.rects.length).toBe(3 * 2) // 3 storeys × 2 openings
  })

  it('contains dimension text', () => {
    const result = computeFrontElevation(makePlan(), 1)
    expect(result!.texts.length).toBeGreaterThanOrEqual(1)
  })

  it('has correct viewBox format', () => {
    const result = computeFrontElevation(makePlan(), 1)
    expect(result!.viewBox).toMatch(/^0 0 \d+\.\d+ \d+\.\d+$/)
  })

  it('no NaN or negative coordinates', () => {
    const result = computeFrontElevation(makePlan(), 2)
    const allCoords = [
      ...result!.lines.flatMap(l => [l.x1, l.y1, l.x2, l.y2]),
      ...result!.rects.flatMap(r => [r.x, r.y, r.w, r.h]),
      ...result!.polygons.flatMap(p => p.points.flatMap(pt => [pt.x, pt.y])),
    ]
    for (const c of allCoords) {
      expect(c).not.toBeNaN()
      expect(c).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('computeSideElevation', () => {
  it('returns null for empty plan', () => {
    expect(computeSideElevation(null as unknown as PlanModel, 1)).toBeNull()
  })

  it('overall width equals building depth plus padding', () => {
    const plan = makePlan()
    const result = computeSideElevation(plan, 1)
    expect(result).not.toBeNull()
    const [,, w] = result!.viewBox.split(' ').map(Number)
    expect(w).toBeCloseTo(plan.height + 4, 0)
  })

  it('contains door rects for side-face openings × floors', () => {
    const plan = makePlan()
    const result = computeSideElevation(plan, 2)
    // w-right has a door (o3) — this is on the side face (x = plan.width = 10)
    expect(result!.rects.length).toBe(2 * 1) // 2 storeys × 1 opening
  })

  it('contains gable polygon', () => {
    const result = computeSideElevation(makePlan(), 1)
    expect(result!.polygons.length).toBeGreaterThanOrEqual(1)
  })

  it('no NaN or negative coordinates', () => {
    const result = computeSideElevation(makePlan(), 2)
    const allCoords = [
      ...result!.lines.flatMap(l => [l.x1, l.y1, l.x2, l.y2]),
      ...result!.rects.flatMap(r => [r.x, r.y, r.w, r.h]),
    ]
    for (const c of allCoords) {
      expect(c).not.toBeNaN()
      expect(c).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('computeSection', () => {
  it('returns null for empty plan', () => {
    expect(computeSection(null as unknown as PlanModel, 1)).toBeNull()
  })

  it('contains floor slab rects (floors + 1)', () => {
    const result = computeSection(makePlan(), 2)
    // floor slabs: one per floor + roof slab
    const slabRects = result!.rects.filter(r =>
      r.fill && r.fill.includes('189,248') && r.stroke === '#38bdf8',
    )
    // Should have floors + 1 slab rects (ground through top)
    expect(slabRects.length).toBe(3) // 3 for 2 storeys + ground = 2, actually 2 storeys = 2 floors + ground level slab... 
    // Actually: for si = 0, 1, 2 (= floors) = 3 slabs total
  })

  it('contains ground line', () => {
    const result = computeSection(makePlan(), 1)
    const groundLines = result!.lines.filter(l => l.strokeWidth && l.strokeWidth >= 0.06)
    expect(groundLines.length).toBeGreaterThanOrEqual(1)
  })

  it('contains roof polygon', () => {
    const result = computeSection(makePlan(), 1)
    expect(result!.polygons.length).toBeGreaterThanOrEqual(1)
  })

  it('no NaN or negative coordinates', () => {
    const result = computeSection(makePlan(), 2)
    const allCoords = [
      ...result!.lines.flatMap(l => [l.x1, l.y1, l.x2, l.y2]),
      ...result!.rects.flatMap(r => [r.x, r.y, r.w, r.h]),
      ...result!.polygons.flatMap(p => p.points.flatMap(pt => [pt.x, pt.y])),
    ]
    for (const c of allCoords) {
      expect(c).not.toBeNaN()
      expect(c).toBeGreaterThanOrEqual(0)
    }
  })

  it('has storey label texts', () => {
    const result = computeSection(makePlan(), 2)
    const labels = result!.texts.filter(t => t.text.startsWith('Fl'))
    expect(labels.length).toBe(2)
  })
})

describe('emptyDrawing', () => {
  it('returns a safe empty drawing', () => {
    const d = emptyDrawing()
    expect(d.lines).toEqual([])
    expect(d.rects).toEqual([])
    expect(d.polygons).toEqual([])
    expect(d.texts.length).toBe(1)
    expect(d.texts[0].text).toContain('unavailable')
  })

  it('accepts a custom title', () => {
    const d = emptyDrawing('TEST')
    expect(d.title).toBe('TEST')
  })
})

describe('opening positioning — front elevation', () => {
  it('door rect bottom equals ground line and height ≈ 2.1', () => {
    const plan = makePlan()
    const result = computeFrontElevation(plan, 1)
    const svgH = Number(result!.viewBox.split(' ')[3])
    const groundY = svgH - 2

    const doorRects = result!.rects.filter(r => r.fill === 'rgba(245,158,11,0.18)')
    expect(doorRects.length).toBeGreaterThanOrEqual(1)
    for (const dr of doorRects) {
      expect(dr.y + dr.h).toBeCloseTo(groundY, 1)
      expect(dr.h).toBeCloseTo(2.1, 1)
    }
  })

  it('window rect bottom at sill height (groundY − 0.9) and height ≈ 1.5', () => {
    const plan = makePlan()
    const result = computeFrontElevation(plan, 1)
    const svgH = Number(result!.viewBox.split(' ')[3])
    const groundY = svgH - 2

    const windowRects = result!.rects.filter(r => r.fill === 'rgba(56,189,248,0.18)')
    expect(windowRects.length).toBeGreaterThanOrEqual(1)
    for (const wr of windowRects) {
      expect(wr.y + wr.h).toBeCloseTo(groundY - 0.9, 1)
      expect(wr.h).toBeCloseTo(1.5, 1)
    }
  })

  it('projected openings do not overlap', () => {
    const plan = makePlan()
    const result = computeFrontElevation(plan, 2)
    const rects = result!.rects
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const yOverlap = a.y < b.y + b.h && b.y < a.y + a.h
        if (!yOverlap) continue
        const xOverlap = a.x < b.x + b.w && b.x < a.x + a.w
        expect(xOverlap).toBe(false)
      }
    }
  })

  it('only front-wall openings appear in front elevation', () => {
    const plan = makePlan()
    const result = computeFrontElevation(plan, 2)
    // w-bottom has 2 openings → 2 rects per floor × 2 floors = 4
    expect(result!.rects.length).toBe(4)
    for (const r of result!.rects) {
      // All rects should be within the building X range
      expect(r.x).toBeGreaterThanOrEqual(2) // PADDING
      expect(r.x + r.w).toBeLessThanOrEqual(2 + plan.width + 0.01)
    }
  })
})

describe('opening positioning — side elevation', () => {
  it('only side-wall openings appear in side elevation', () => {
    const plan = makePlan()
    const result = computeSideElevation(plan, 2)
    // w-right has 1 opening → 1 rect per floor × 2 floors = 2
    expect(result!.rects.length).toBe(2)
  })
})

describe('multi-storey openings', () => {
  it('front elevation has openings × floors', () => {
    const plan = makePlan()
    const result1 = computeFrontElevation(plan, 1)
    const result3 = computeFrontElevation(plan, 3)
    expect(result3!.rects.length).toBe(result1!.rects.length * 3)
  })

  it('section slab count matches floors + 1', () => {
    const result1 = computeSection(makePlan(), 1)
    const result3 = computeSection(makePlan(), 3)
    const slabLines1 = result1!.rects.filter(r =>
      r.fill && r.fill.includes('189,248'),
    ).length
    const slabLines3 = result3!.rects.filter(r =>
      r.fill && r.fill.includes('189,248'),
    ).length
    // 1 floor = 2 slabs (ground + floor1 ceiling/roof slab)
    // Actually with the current code, slabs are for si = 0..floors (inclusive)
    expect(slabLines3).toBe(4) // si=0,1,2,3 for 3 floors — no wait: si <= floors means si=0..3 = 4 slabs
    // For 3 floors: floors=3, so si=0,1,2,3 = 4 slabs
    expect(slabLines1).toBe(2) // si=0,1 = 2 slabs for 1 floor
  })
})
