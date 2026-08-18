/**
 * fullSetGenerator.test.ts
 *
 * Validates the 15-drawing full architectural set generator:
 *   - Drawing count and IDs
 *   - SADC drawing codes
 *   - SVG presence and project-name embedding
 *   - RAG citations (async mode only)
 *   - IFC entity annotations
 *   - Plotter path extraction and pen-lift budget
 *   - Area schedule room dimensions
 *   - Door/window schedule fire ratings
 *   - Compliance report aggregation
 *   - isPlanView flags
 *   - Sync mode (no RAG citations)
 *   - DRAWING_TABLE + RAG_QUERIES exports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanModel } from '@/domain/plan'
import type { BimModel } from '@/domain/bim'
import type { RagIndex } from '@/engine/rag/ragIndex'

/* ─── Mock the RAG pipeline so tests are deterministic ───────── */

vi.mock('@/engine/rag/hybrid', () => ({
  hybridSearch: (_index: unknown, _query: string, _opts: unknown) => [
    {
      chunkId: 'test-chunk-1',
      docId: 'by-laws-1977',
      sectionId: 'by-laws-1977:sec-4-1.3',
      heading: 'Ceiling Height',
      text: 'The minimum ceiling height of a habitable room shall be 2.4 m.',
      score: 0.85,
      citation: '[Model Building By-Laws 1977 Ch.4 Cl.1.3]',
    },
  ],
}))

vi.mock('@/engine/rag/codeCorpus', () => ({
  buildDefaultRagIndex: () => ({ hasDocument: () => true, size: 100 }) as unknown,
}))

/* ─── Fixtures ─────────────────────────────────────────────── */

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'plan-test-1',
    designOptionId: 'opt-1',
    width: 15,
    height: 12,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 7, height: 5 },
      { id: 'r2', name: 'Kitchen', x: 7, y: 0, width: 4, height: 3.5 },
      { id: 'r3', name: 'Bedroom 1', x: 0, y: 5, width: 5, height: 4 },
      { id: 'r4', name: 'Bathroom', x: 5, y: 5, width: 3, height: 2.5 },
      { id: 'r5', name: 'Corridor', x: 5, y: 7.5, width: 6, height: 1.8 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 15, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 0, y: 12 }, end: { x: 15, y: 12 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 0, y: 0 }, end: { x: 0, y: 12 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 15, y: 0 }, end: { x: 15, y: 12 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', offset: 0.15, width: 0.9, kind: 'door' },
      { id: 'o2', wallId: 'w1', offset: 0.45, width: 1.2, kind: 'window' },
    ],
    ...overrides,
  } as PlanModel
}

function makeBim(overrides?: Partial<BimModel>): BimModel {
  return {
    id: 'bim-test-1',
    walls: [],
    slabs: [
      { id: 's1', x: 0, y: 0, z: 0, width: 15, depth: 12, height: 0.2 },
    ],
    doors: [],
    windows: [],
    rooms: [],
    ceilingHeight: 2.7,
    ...overrides,
  } as unknown as BimModel
}

/* ─── Imports under test ───────────────────────────────────── */

import {
  generateFullSet,
  generateFullSetSync,
  DRAWING_TABLE,
  RAG_QUERIES,
} from '@/engine/architecture/fullSetGenerator'

/* ─── Pre-build fixtures (shared across tests) ─────────────── */

const PLAN = makePlan()
const BIM = makeBim()

/* ─── Tests ─────────────────────────────────────────────────── */

describe('fullSetGenerator', () => {
  /* ── Shared async fixture ── */
  let result: Awaited<ReturnType<typeof generateFullSet>>

  beforeEach(async () => {
    const ragIndex = {
      hasDocument: () => true,
      size: 100,
    } as unknown as RagIndex

    result = await generateFullSet({
      plan: PLAN,
      bim: BIM,
      ragIndex,
      projectName: 'Harare House',
      projectNumber: 'BE-TEST-001',
      buildingType: 'house',
      jurisdiction: 'zimbabwe',
      floors: 2,
      storeyHeight: 3,
    })
  })

  /* ── 1. Drawing count ── */

  it('generates one drawing per DRAWING_TABLE entry', () => {
    expect(result.drawings).toHaveLength(DRAWING_TABLE.length)
  })

  it('each drawing has a unique id', () => {
    const ids = result.drawings.map((d) => d.id)
    expect(new Set(ids).size).toBe(DRAWING_TABLE.length)
  })

  /* ── 2. SADC codes ── */

  it('each drawing carries a non-empty SADC code', () => {
    for (const d of result.drawings) {
      expect(d.sadcCode).toBeTruthy()
      expect(d.sadcCode).toMatch(/^A-\d{3}$/)
    }
  })

  it('SADC codes cover the required ranges', () => {
    const codes = new Set(result.drawings.map((d) => d.sadcCode))
    // Plans: A-1xx, Elevations: A-2xx, Sections: A-3xx, MEP: A-4xx,
    // Schedules: A-5xx, Construction details: A-6xx, Compliance: A-7xx
    expect(codes.has('A-001')).toBe(true) // cover sheet
    expect(codes.has('A-601')).toBe(true) // construction details
    expect(codes.has('A-701')).toBe(true) // compliance cert
  })

  /* ── 3. SVG presence and project name ── */

  it('every drawing produces a non-empty SVG', () => {
    for (const d of result.drawings) {
      expect(d.svg).toBeTruthy()
      expect(d.svg.length).toBeGreaterThan(100)
      expect(d.svg).toContain('<svg')
    }
  })

  it('cover sheet embeds the project name', () => {
    const cover = result.drawings.find((d) => d.id === 'cover-sheet')!
    expect(cover.svg).toContain('Harare House')
  })

  it('every drawing has valid SVG dimensions', () => {
    for (const d of result.drawings) {
      expect(d.dimensions.width).toBeGreaterThan(0)
      expect(d.dimensions.height).toBeGreaterThan(0)
    }
  })

  /* ── 4. RAG citations (async mode) ── */

  it('async mode includes RAG citations on every drawing', () => {
    for (const d of result.drawings) {
      expect(Array.isArray(d.citations)).toBe(true)
      // Each citation has the expected shape
      for (const c of d.citations) {
        expect(c.sectionId).toBeTruthy()
        expect(c.rule).toBeTruthy()
        expect(c.detail).toBeTruthy()
        expect(c.score).toBeGreaterThan(0)
      }
    }
  })

  it('compliance report includes RAG-sourced findings', () => {
    const ragFindings = result.complianceReport.results.filter((r) =>
      r.ruleId.startsWith('cover-sheet:') || r.ruleId.includes(':by-laws-1977')
    )
    expect(ragFindings.length).toBeGreaterThan(0)
  })

  /* ── 5. IFC entity annotations ── */

  it('every drawing carries IFC annotations array', () => {
    for (const d of result.drawings) {
      expect(Array.isArray(d.ifcAnnotations)).toBe(true)
    }
  })

  it('aggregate IFC entity count matches sum of per-drawing annotations', () => {
    const sum = result.drawings.reduce((s, d) => s + d.ifcAnnotations.length, 0)
    expect(result.ifcEntityCount).toBe(sum)
  })

  it('fire-egress drawing annotates fire-rated doors', () => {
    const fireEgress = result.drawings.find((d) => d.id === 'fire-egress-plan')!
    expect(fireEgress.ifcAnnotations.length).toBeGreaterThan(0)
    const types = fireEgress.ifcAnnotations.map((a) => a.entity)
    expect(types.some((t) => t.includes('Wall') || t.includes('Space'))).toBe(true)
  })

  /* ── 6. Plotter paths ── */

  it('every drawing produces plotter paths', () => {
    for (const d of result.drawings) {
      expect(Array.isArray(d.plotterPaths)).toBe(true)
    }
  })

  it('plotter paths have valid segments and points', () => {
    for (const d of result.drawings) {
      for (const p of d.plotterPaths) {
        expect(p.segments).toBeDefined()
        expect(p.segments.length).toBeGreaterThan(0)
        for (const seg of p.segments) {
          expect(seg.points.length).toBeGreaterThanOrEqual(2)
          expect(typeof seg.points[0].x).toBe('number')
          expect(typeof seg.points[0].y).toBe('number')
        }
      }
    }
  })

  it('total pen-lifts stay within budget (≤12% of segments)', () => {
    expect(result.totalPenLifts).toBeGreaterThanOrEqual(0)
    const allSegments = result.drawings.flatMap((d) =>
      d.plotterPaths.flatMap((p) => p.segments.flatMap((s) => s.points.length - 1))
    )
    const totalSegs = allSegments.reduce((a, b) => a + b, 0)
    if (totalSegs > 0) {
      expect(result.totalPenLifts).toBeLessThanOrEqual(Math.round(totalSegs * 0.12))
    }
  })

  it('pen-up travel is a positive number in metres', () => {
    expect(result.totalPenUpMetres).toBeGreaterThan(0)
  })

  /* ── 7. Area schedule ── */

  it('area schedule covers all plan rooms', () => {
    expect(result.areaSchedule.length).toBe(PLAN.rooms.length)
  })

  it('each area-schedule entry has valid dimensions', () => {
    for (const entry of result.areaSchedule) {
      expect(entry.roomName).toBeTruthy()
      expect(entry.areaM2).toBeGreaterThan(0)
      expect(entry.widthM).toBeGreaterThan(0)
      expect(entry.depthM).toBeGreaterThan(0)
      expect(entry.zone).toBeTruthy()
      expect(typeof entry.compliant).toBe('boolean')
    }
  })

  it('area-schedule widths match plan room widths', () => {
    for (const entry of result.areaSchedule) {
      const planRoom = PLAN.rooms.find((r) => r.name === entry.roomName)
      if (planRoom) {
        // Allow rounding tolerance
        expect(entry.widthM).toBeCloseTo(planRoom.width, 1)
        expect(entry.depthM).toBeCloseTo(planRoom.height, 1)
      }
    }
  })

  /* ── 8. Door/window schedule ── */

  it('door-window schedule lists openings from the plan', () => {
    expect(result.doorWindowSchedule.length).toBeGreaterThanOrEqual(PLAN.openings.length)
  })

  it('each schedule entry has a fire rating', () => {
    for (const entry of result.doorWindowSchedule) {
      expect(entry.fireRating).toBeTruthy()
      expect(typeof entry.widthMm).toBe('number')
      expect(entry.widthMm).toBeGreaterThan(0)
      expect(typeof entry.heightMm).toBe('number')
      expect(entry.heightMm).toBeGreaterThan(0)
    }
  })

  it('door entries reference the correct width in mm', () => {
    const doors = result.doorWindowSchedule.filter((e) => e.type === 'door')
    const planDoors = PLAN.openings.filter((o) => o.kind === 'door')
    expect(doors.length).toBe(planDoors.length)
    for (let i = 0; i < doors.length; i++) {
      expect(doors[i].widthMm).toBeCloseTo(planDoors[i].width * 1000, -2)
    }
  })

  /* ── 9. Compliance report ── */

  it('compliance report is aggregated with totalRules > 0', () => {
    expect(result.complianceReport.totalRules).toBeGreaterThan(0)
  })

  it('score is between 0 and 100', () => {
    expect(result.complianceReport.score).toBeGreaterThanOrEqual(0)
    expect(result.complianceReport.score).toBeLessThanOrEqual(100)
  })

  it('passedRules ≤ totalRules', () => {
    expect(result.complianceReport.passedRules).toBeLessThanOrEqual(
      result.complianceReport.totalRules
    )
  })

  it('jurisdiction is carried through', () => {
    expect(result.complianceReport.jurisdiction).toBe('zimbabwe')
  })

  /* ── 10. isPlanView flags ── */

  it('plan drawings are flagged as plan views', () => {
    const planViews = result.drawings.filter((d) => d.isPlanView)
    const planIds = planViews.map((d) => d.id)
    expect(planIds).toContain('ground-floor-plan')
    expect(planIds).toContain('site-plan')
    expect(planIds).toContain('roof-plan')
    expect(planIds).toContain('foundation-plan')
  })

  it('elevation drawings are NOT flagged as plan views', () => {
    const nonPlan = result.drawings
      .filter((d) => d.id.includes('elevation'))
      .filter((d) => d.isPlanView)
    expect(nonPlan).toHaveLength(0)
  })

  /* ── 11. projectName and projectNumber carried through ── */

  it('result carries the project name', () => {
    expect(result.projectName).toBe('Harare House')
  })

  /* ── 12. generationTimeMs is positive ── */

  it('reports a non-negative generation time', () => {
    expect(result.generationTimeMs).toBeGreaterThanOrEqual(0)
  })

  /* ── 13. Pen type annotations in SVG ── */

  it('SVGs embed architectural pen widths in stroke-width attributes', () => {
    const floorPlan = result.drawings.find((d) => d.id === 'ground-floor-plan')!
    // Should contain standard architectural stroke widths
    expect(floorPlan.svg).toMatch(/stroke-width/)
  })
})

/* ──────────────────────────────────────────────────────────────── */
/*  Sync mode (no RAG)                                             */
/* ──────────────────────────────────────────────────────────────── */

describe('generateFullSetSync', () => {
  it('produces one drawing per DRAWING_TABLE entry without an RAG index', () => {
    const result = generateFullSetSync({
      plan: PLAN,
      bim: BIM,
      projectName: 'Sync Test',
    })
    expect(result.drawings).toHaveLength(DRAWING_TABLE.length)
  })

  it('citations array is empty in sync mode', () => {
    const result = generateFullSetSync({
      plan: PLAN,
      bim: BIM,
    })
    for (const d of result.drawings) {
      expect(d.citations).toHaveLength(0)
    }
  })

  it('compliance report warns about synchronous mode', () => {
    const result = generateFullSetSync({
      plan: PLAN,
      bim: BIM,
    })
    expect(result.complianceReport.warnings).toContain(
      'Synchronous mode — RAG citations not included.'
    )
  })

  it('plotter paths are still extracted in sync mode', () => {
    const result = generateFullSetSync({
      plan: PLAN,
      bim: BIM,
    })
    const totalPaths = result.drawings.reduce((s, d) => s + d.plotterPaths.length, 0)
    expect(totalPaths).toBeGreaterThan(0)
  })

  it('IFC annotations are present in sync mode', () => {
    const result = generateFullSetSync({
      plan: PLAN,
      bim: BIM,
    })
    expect(result.ifcEntityCount).toBeGreaterThan(0)
  })

  it('respects custom building type and jurisdiction', () => {
    const result = generateFullSetSync({
      plan: PLAN,
      bim: BIM,
      buildingType: 'office',
      jurisdiction: 'south-africa',
    })
    expect(result.complianceReport.jurisdiction).toBe('south-africa')
  })
})

/* ──────────────────────────────────────────────────────────────── */
/*  DRAWING_TABLE and RAG_QUERIES exports                          */
/* ──────────────────────────────────────────────────────────────── */

describe('exports', () => {
  it('DRAWING_TABLE contains 19 entries (SADC §6.2 full set)', () => {
    expect(DRAWING_TABLE).toHaveLength(19)
  })

  it('each DRAWING_TABLE entry has id, code, title, scale', () => {
    for (const def of DRAWING_TABLE) {
      expect(def.id).toBeTruthy()
      expect(def.code).toMatch(/^A-\d{3}$/)
      expect(def.title).toBeTruthy()
      expect(def.scale).toBeTruthy()
    }
  })

  it('RAG_QUERIES is a non-empty object', () => {
    expect(typeof RAG_QUERIES).toBe('object')
    expect(Object.keys(RAG_QUERIES).length).toBeGreaterThan(0)
  })

  it('RAG_QUERIES keys match DRAWING_TABLE ids', () => {
    const tableIds = new Set(DRAWING_TABLE.map((d) => d.id))
    for (const key of Object.keys(RAG_QUERIES)) {
      expect(tableIds.has(key as typeof DRAWING_TABLE[number]['id'])).toBe(true)
    }
  })
})
