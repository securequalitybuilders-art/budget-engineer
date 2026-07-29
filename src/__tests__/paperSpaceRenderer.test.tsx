import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'
import type { PlanModel } from '@/domain/plan'
import { createPaperSpaceLayout } from '@/engine/parametric/paperSpaceModel'
import { renderSheet, ScaleBar, NorthArrow, createPlanSheet } from '@/components/drawings/paperSpaceRenderer'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan',
    designOptionId: 'test',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 10 },
      { id: 'r2', name: 'Kitchen', x: 6, y: 0, width: 6, height: 10 },
    ],
    walls: [
      { id: 'w-bottom', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w-top', start: { x: 0, y: 10 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w-left', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w-right', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.23, type: 'external' },
      { id: 'w-partition', start: { x: 6, y: 0 }, end: { x: 6, y: 10 }, thickness: 0.115, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w-bottom', kind: 'door', offset: 0.5, width: 0.9 },
      { id: 'o2', wallId: 'w-bottom', kind: 'window', offset: 0.2, width: 1.5 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

function flatten(els: ReactNode | ReactNode[]): ReactNode[] {
  const out: ReactNode[] = []
  const arr = Array.isArray(els) ? els : [els]
  for (const el of arr) {
    if (el == null) continue
    if (Array.isArray(el)) {
      out.push(...flatten(el))
      continue
    }
    if (typeof el !== 'object') continue
    out.push(el)
    const children = (el as any).props?.children
    if (children != null) {
      out.push(...flatten(children as ReactNode | ReactNode[]))
    }
  }
  return out
}

function countElements(elements: ReactNode[], keyPrefix: string): number {
  return flatten(elements).filter((el): boolean => {
    const key = (el as any).key
    return typeof key === 'string' && key.startsWith(keyPrefix)
  }).length
}

describe('ScaleBar', () => {
  it('renders with label', () => {
    const el = ScaleBar({ x: 10, y: 10, lengthMm: 50, label: '50mm' })
    expect(el).not.toBeNull()
  })

  it('renders without label', () => {
    const el = ScaleBar({ x: 10, y: 10, lengthMm: 100 })
    expect(el).not.toBeNull()
  })
})

describe('NorthArrow', () => {
  it('renders at given position', () => {
    const el = NorthArrow({ cx: 100, cy: 100, size: 10 })
    expect(el).not.toBeNull()
  })

  it('renders with default size', () => {
    const el = NorthArrow({ cx: 50, cy: 50 })
    expect(el).not.toBeNull()
  })
})

describe('renderSheet', () => {
  it('renders a complete sheet with background', () => {
    const layout = createPaperSpaceLayout('A4', 'portrait', [
      { modelWidth: 6, modelHeight: 5, scale: '1:50' },
    ])
    const result = renderSheet(layout, makePlan(), { drawingNumber: 'DRG-001', projectName: 'Test' })
    expect(result.svgWidth).toBeGreaterThan(0)
    expect(result.svgHeight).toBeGreaterThan(0)
    expect(countElements(result.elements, 'sheet-bg')).toBe(1)
    expect(countElements(result.elements, 'sheet-border')).toBe(1)
    expect(countElements(result.elements, 'title-block')).toBe(1)
    expect(countElements(result.elements, 'north-arrow')).toBe(1)
    expect(countElements(result.elements, 'scale-bar')).toBe(1)
  })

  it('renders viewport with walls and openings', () => {
    const layout = createPaperSpaceLayout('A3', 'landscape', [
      { modelWidth: 12, modelHeight: 10, scale: '1:100' },
    ])
    const result = renderSheet(layout, makePlan())
    expect(countElements(result.elements, 'vp-wall-')).toBeGreaterThanOrEqual(4)
    expect(countElements(result.elements, 'vp-opening-')).toBeGreaterThanOrEqual(2)
    expect(countElements(result.elements, 'vp-room-bg-')).toBeGreaterThanOrEqual(2)
  })

  it('renders two viewports on one sheet', () => {
    const layout = createPaperSpaceLayout('A1', 'landscape', [
      { modelWidth: 12, modelHeight: 10, scale: '1:100' },
      { modelWidth: 12, modelHeight: 10, scale: '1:200' },
    ])
    const result = renderSheet(layout, makePlan())
    expect(countElements(result.elements, 'vp-rect-')).toBe(2)
    expect(countElements(result.elements, 'vp-label-')).toBe(2)
    expect(countElements(result.elements, 'vp-wall-')).toBeGreaterThanOrEqual(4)
  })

  it('viewports have positive paper dimensions', () => {
    const layout = createPaperSpaceLayout('A2', 'portrait', [
      { modelWidth: 12, modelHeight: 10, scale: '1:50' },
    ])
    for (const vp of layout.viewports) {
      expect(vp.paperWidth).toBeGreaterThan(0)
      expect(vp.paperHeight).toBeGreaterThan(0)
    }
  })

  it('renders viewport label text', () => {
    const layout = createPaperSpaceLayout('A3', 'landscape', [
      { modelWidth: 12, modelHeight: 10, scale: '1:100' },
    ])
    const result = renderSheet(layout, makePlan())
    expect(countElements(result.elements, 'vp-label-')).toBe(1)
  })

  it('svg dimensions match paper size', () => {
    const layout = createPaperSpaceLayout('A4', 'portrait', [])
    const result = renderSheet(layout, makePlan())
    expect(result.svgWidth).toBe(layout.paperWidthMm)
    expect(result.svgHeight).toBe(layout.paperHeightMm)
  })

  it('renders with custom options', () => {
    const layout = createPaperSpaceLayout('A3', 'landscape', [])
    const result = renderSheet(layout, makePlan(), {
      drawingNumber: 'DRG-042',
      projectName: 'Custom Project',
      date: '2025-01-01',
    })
    expect(result.svgWidth).toBeGreaterThan(0)
  })
})

describe('createPlanSheet', () => {
  it('creates a complete plan sheet', () => {
    const plan = makePlan()
    const { layout, output } = createPlanSheet(plan, 'DRG-001', { size: 'A3' })
    expect(layout.sheetSize).toBe('A3')
    expect(output.svgWidth).toBe(layout.paperWidthMm)
    expect(output.svgHeight).toBe(layout.paperHeightMm)
    expect(countElements(output.elements, 'title-block')).toBe(1)
    expect(countElements(output.elements, 'sheet-bg')).toBe(1)
  })

  it('defaults to A3 landscape', () => {
    const plan = makePlan()
    const { layout } = createPlanSheet(plan)
    expect(layout.sheetSize).toBe('A3')
    expect(layout.viewports.length).toBeGreaterThanOrEqual(1)
  })

  it('accepts custom paper size', () => {
    const plan = makePlan()
    const { layout } = createPlanSheet(plan, 'DRG-002', { size: 'A1' })
    expect(layout.sheetSize).toBe('A1')
  })

  it('viewport wraps plan geometry', () => {
    const plan = makePlan()
    const { layout } = createPlanSheet(plan, 'DRG-003', { size: 'A4' })
    for (const vp of layout.viewports) {
      expect(vp.modelWidth).toBe(plan.width)
      expect(vp.modelHeight).toBe(plan.height)
    }
  })
})
