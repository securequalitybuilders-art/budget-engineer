// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import type { PlanModel } from '@/domain/plan'
import { computePresentationLayout } from '@/components/drawings/presentationSheetModel'
import { PresentationSheetView } from '@/components/drawings/PresentationSheetView'
import { serializeSvg } from '@/adapters/sheetExport'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'pres-test-plan',
    designOptionId: 'test',
    width: 12,
    height: 10,
    wallThickness: 0.23,
    rooms: [
      { id: 'r1', name: 'Living', x: 0, y: 0, width: 6, height: 5 },
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
      { id: 'w6', start: { x: 0, y: 5 }, end: { x: 4, y: 5 }, thickness: 0.15, type: 'internal' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.9 },
    ],
    scaleLabel: '1:100',
    ...overrides,
  }
}

describe('computePresentationLayout', () => {
  it('returns 9 cells with expected structure', () => {
    const layout = computePresentationLayout()
    expect(layout.cells.length).toBe(9)
    expect(layout.sheetW).toBeGreaterThan(0)
    expect(layout.sheetH).toBeGreaterThan(0)
    for (const cell of layout.cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.w).toBeGreaterThan(0)
      expect(cell.h).toBeGreaterThan(0)
      expect(cell.id).toBeTruthy()
      expect(cell.label).toBeTruthy()
    }
  })

  it('cells do not overlap', () => {
    const layout = computePresentationLayout()
    for (let i = 0; i < layout.cells.length; i++) {
      for (let j = i + 1; j < layout.cells.length; j++) {
        const a = layout.cells[i]
        const b = layout.cells[j]
        const noOverlap = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
        expect(noOverlap).toBe(true)
      }
    }
  })

  it('contains expected cell ids', () => {
    const layout = computePresentationLayout()
    const ids = layout.cells.map(c => c.id)
    expect(ids).toContain('front-elevation')
    expect(ids).toContain('side-elevation')
    expect(ids).toContain('section')
    expect(ids).toContain('floor-plan')
    expect(ids).toContain('site-plan')
    expect(ids).toContain('foundation')
    expect(ids).toContain('roof-plan')
    expect(ids).toContain('rcp')
    expect(ids).toContain('mep-overview')
  })
})

describe('PresentationSheetView', () => {
  it('is a function', () => {
    expect(typeof PresentationSheetView).toBe('function')
  })

  it('renders safe fallback on null plan', () => {
    const { container } = render(React.createElement(PresentationSheetView, {
      activePlan: null,
      design: null,
      floors: 1,
      storeyHeight: 3,
      pitchHeight: 1.5,
    }))
    expect(container.textContent).toMatch(/unavailable|no .* data/i)
  })

  it('renders an SVG with master title block text', () => {
    const { container } = render(React.createElement(PresentationSheetView, {
      activePlan: makePlan(),
      design: null,
      floors: 1,
      storeyHeight: 3,
      pitchHeight: 1.5,
    }))
    expect(container.querySelector('svg')).not.toBeNull()
    expect(container.textContent).toMatch(/pres-test-plan|Design/i)
    expect(container.textContent).toMatch(/A1/)
  })

  it('renders at least 3 drawing captions', () => {
    const { container } = render(React.createElement(PresentationSheetView, {
      activePlan: makePlan(),
      design: null,
      floors: 1,
      storeyHeight: 3,
      pitchHeight: 1.5,
    }))
    const match = container.textContent || ''
    const captions = ['FRONT ELEVATION', 'SIDE ELEVATION', 'SECTION A-A', 'FLOOR PLAN', 'SITE PLAN', 'FOUNDATION PLAN', 'ROOF PLAN', 'RCP', 'ELECTRICAL']
    const found = captions.filter(c => match.includes(c))
    expect(found.length).toBeGreaterThanOrEqual(3)
  })

  it('renders export buttons with accessible labels', () => {
    const { container } = render(React.createElement(PresentationSheetView, {
      activePlan: makePlan(),
      design: null,
      floors: 1,
      storeyHeight: 3,
      pitchHeight: 1.5,
    }))
    const pngBtn = container.querySelector('button[aria-label="Export presentation sheet as PNG image"]')
    const pdfBtn = container.querySelector('button[aria-label="Export presentation sheet as PDF document"]')
    expect(pngBtn).not.toBeNull()
    expect(pdfBtn).not.toBeNull()
  })
})

describe('serializeSvg', () => {
  it('returns null for null input', () => {
    expect(serializeSvg(null as unknown as SVGSVGElement)).toBeNull()
  })

  it('returns string containing <svg for valid SVG element', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 100 100')
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const result = serializeSvg(svg)
    expect(result).not.toBeNull()
    expect(result).toContain('<svg')
    expect(result).toContain('viewBox')
  })
})
