// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  getDrawingStandards,
  getLineweight,
  getTextStyle,
  getSheetSize,
  suggestSheetSize,
  scaleContentToFit,
  resolveScale,
  formatScaleLabel,
  mmToSvg,
} from '@/lib/presentation/drafting-standards'
import type { DrawingMode, TextRole } from '@/lib/presentation/drafting-standards'
import { buildAnnotationSet } from '@/lib/presentation/annotation-engine'
import type { PlanModel } from '@/domain/plan'
import {
  buildDrawingLayers,
  composePlanDrawing,
  createDrawingViewport,
} from '@/lib/presentation/drawing-composer'
import type { DrawingType } from '@/lib/presentation/drawing-composer'
import { PEN_FAMILY, LEGACY_TO_PEN, PEN_NAMES } from '@/components/drawings/cadConstants'

// ── Helpers ──

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan',
    designOptionId: 'test',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 6, height: 5 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 6, height: 5 },
      { id: 'r3', name: 'Bathroom', x: 0, y: 5, width: 4, height: 5 },
      { id: 'r4', name: 'Bedroom', x: 4, y: 5, width: 8, height: 5 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w3', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w4', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w5', start: { x: 6, y: 0 }, end: { x: 6, y: 5 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

// ── Drafting Standards ──

describe('drafting-standards', () => {
  it('returns technical standards by default', () => {
    const std = getDrawingStandards()
    expect(std.mode).toBe('technical')
    expect(std.name).toContain('Technical')
    expect(std.lineweights.length).toBeGreaterThan(10)
    expect(std.textStyles.length).toBeGreaterThan(10)
    expect(std.sheetSizes.length).toBeGreaterThanOrEqual(6)
  })

  it('returns presentation standards when requested', () => {
    const std = getDrawingStandards('presentation')
    expect(std.mode).toBe('presentation')
    expect(std.name).toContain('Presentation')
  })

  it('technical cut-wall is heavier than annotation', () => {
    const cut = getLineweight('cut-wall', 'technical')
    const dim = getLineweight('dimension', 'technical')
    expect(cut.penWidth).toBeGreaterThan(dim.penWidth)
    expect(cut.svgStrokeWidth).toBeGreaterThan(dim.svgStrokeWidth)
  })

  it('presentation lineweights are lighter than technical', () => {
    const tCut = getLineweight('cut-wall', 'technical')
    const pCut = getLineweight('cut-wall', 'presentation')
    expect(tCut.penWidth).toBeGreaterThan(pCut.penWidth)
  })

  it('each lineweight category has unique priority', () => {
    const std = getDrawingStandards()
    const priorities = std.lineweights.map(lw => lw.priority)
    expect(new Set(priorities).size).toBe(priorities.length)
  })

  it('getTextStyle returns known roles', () => {
    const roles: TextRole[] = ['drawing-title', 'room-label', 'dimension-text', 'sheet-title']
    for (const role of roles) {
      const ts = getTextStyle(role)
      expect(ts.role).toBe(role)
      expect(ts.fontSizeMm).toBeGreaterThan(0)
      expect(ts.fontFamily).toBeTruthy()
    }
  })

  it('drawing-title is bold and largest', () => {
    const title = getTextStyle('drawing-title')
    const dim = getTextStyle('dimension-text')
    expect(title.weight).toBe('bold')
    expect(title.fontSizeMm).toBeGreaterThan(dim.fontSizeMm)
  })

  it('getSheetSize returns known sizes', () => {
    const a1 = getSheetSize('A1', true)
    expect(a1).toBeDefined()
    expect(a1!.widthMm).toBe(841)
    expect(a1!.heightMm).toBe(594)

    const a3 = getSheetSize('A3', false)
    expect(a3).toBeDefined()
    expect(a3!.widthMm).toBe(297)
    expect(a3!.heightMm).toBe(420)
  })

  it('suggestSheetSize picks smallest that fits', () => {
    const s = suggestSheetSize(200, 150)
    expect(s.code).toBe('A3')
    expect(s.landscape).toBe(true)
  })

  it('suggestSheetSize scales up for large content', () => {
    const s = suggestSheetSize(600, 400)
    expect(['A1', 'A2']).toContain(s.code)
  })

  it('scaleContentToFit returns positive values', () => {
    const result = scaleContentToFit(1000, 800, 841, 594)
    expect(result.scale).toBeGreaterThan(0)
    expect(result.offsetX).toBeGreaterThanOrEqual(0)
  })

  it('resolveScale returns standard denominator', () => {
    const scale = resolveScale(12000, 8000, 841, 594)
    expect(scale).toBe(20)
  })

  it('formatScaleLabel returns 1:500', () => {
    expect(formatScaleLabel(500)).toBe('1:500')
  })

  it('mmToSvg converts correctly at 96 dpi', () => {
    expect(mmToSvg(25.4)).toBeCloseTo(96, 0)
    expect(mmToSvg(1)).toBeCloseTo(96 / 25.4, 1)
  })
})

// ── Annotation Engine ──

describe('annotation-engine', () => {
  it('buildAnnotationSet returns all annotation types', () => {
    const plan = makePlan()
    const ann = buildAnnotationSet(plan)
    expect(ann.planId).toBe('test-plan')
    expect(ann.dimensions.length).toBeGreaterThan(0)
    expect(ann.overallDimensions.length).toBe(2)
    expect(ann.roomLabels.length).toBe(4)
    expect(ann.northArrows.length).toBe(1)
    expect(ann.scaleBars.length).toBe(1)
  })

  it('every room gets a label', () => {
    const plan = makePlan()
    const ann = buildAnnotationSet(plan)
    const labelNames = ann.roomLabels.map(l => l.name).sort()
    expect(labelNames).toEqual(['Bathroom', 'Bedroom', 'Kitchen', 'Living Room'])
  })

  it('overall dimensions use overall plan bounds', () => {
    const plan = makePlan()
    const ann = buildAnnotationSet(plan)
    const bottom = ann.overallDimensions.find(d => d.side === 'bottom')
    expect(bottom).toBeDefined()
    expect(bottom!.valueMm).toBe(12000)

    const right = ann.overallDimensions.find(d => d.side === 'right')
    expect(right).toBeDefined()
    expect(right!.valueMm).toBe(10000)
  })

  it('presentation mode produces same structure', () => {
    const plan = makePlan()
    const ann = buildAnnotationSet(plan, 'presentation')
    expect(ann.roomLabels.length).toBe(4)
    expect(ann.overallDimensions.length).toBe(2)
  })
})

// ── Drawing Composer ──

describe('drawing-composer', () => {
  it('buildDrawingLayers returns 17 layers', () => {
    const layers = buildDrawingLayers('technical')
    expect(layers.length).toBe(17)
    const ids = layers.map(l => l.id)
    expect(ids).toContain('cut-wall')
    expect(ids).toContain('dimension')
    expect(ids).toContain('room-label')
  })

  it('presentation layers have different stroke widths', () => {
    const tec = buildDrawingLayers('technical')
    const pres = buildDrawingLayers('presentation')
    for (let i = 0; i < tec.length; i++) {
      if (tec[i].category === 'cut-wall') {
        expect(tec[i].style.strokeWidth).toBeGreaterThan(pres[i].style.strokeWidth)
      }
    }
  })

  it('composePlanDrawing returns valid ComposedDrawing', () => {
    const plan = makePlan()
    const result = composePlanDrawing(plan, null)
    expect(result.svgContent).toBeTruthy()
    expect(result.svgContent).toContain('<g')
    expect(result.meta.type).toBe('floor-plan')
    expect(result.meta.scale).toBeGreaterThanOrEqual(1)
    expect(result.meta.scaleLabel).toContain('1:')
    expect(result.annotations.roomLabels.length).toBe(4)
  })

  it('composePlanDrawing with presentation mode', () => {
    const plan = makePlan()
    const result = composePlanDrawing(plan, null, 'presentation')
    expect(result.meta.mode).toBe('presentation')
    expect(result.svgContent).toBeTruthy()
  })

  it('createDrawingViewport returns valid viewport', () => {
    const std = getDrawingStandards()
    const a1 = std.sheetSizes.find(s => s.code === 'A1' && s.landscape)!
    const meta = {
      id: 'test-vp',
      type: 'floor-plan' as DrawingType,
      title: 'Test',
      drawingNumber: 'A-101',
      scale: 100,
      scaleLabel: '1:100',
      mode: 'technical' as DrawingMode,
      sheetSize: a1,
      discipline: 'Architectural',
    }
    const vp = createDrawingViewport(meta, a1)
    expect(vp.width).toBeGreaterThan(0)
    expect(vp.height).toBeGreaterThan(0)
    expect(vp.contentScale).toBe(100)
  })
})

// ── cadConstants extensions ──

describe('cadConstants extensions', () => {
  it('PEN_FAMILY has 7 members', () => {
    expect(PEN_FAMILY.length).toBe(7)
    expect(PEN_FAMILY[0]).toBe(0.13)
    expect(PEN_FAMILY[6]).toBe(1.00)
  })

  it('LEGACY_TO_PEN maps correctly', () => {
    expect(LEGACY_TO_PEN.HEAVY).toBe(0.70)
    expect(LEGACY_TO_PEN.MEDIUM).toBe(0.35)
    expect(LEGACY_TO_PEN.THIN).toBe(0.25)
    expect(LEGACY_TO_PEN.HAIR).toBe(0.18)
  })

  it('PEN_NAMES maps each weight', () => {
    for (const pen of PEN_FAMILY) {
      expect(PEN_NAMES[pen]).toBe(pen.toFixed(2))
    }
  })
})
