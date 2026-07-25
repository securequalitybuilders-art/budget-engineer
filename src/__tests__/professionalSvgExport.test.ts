import { describe, it, expect } from 'vitest'
import { exportProfessionalSvg } from '@/lib/export/professionalSvgExport'
import type { PlanModel } from '@/domain/plan'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'test-plan',
    designOptionId: 'test-opt',
    width: 10,
    height: 8,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'r2', name: 'Bedroom', x: 5, y: 0, width: 5, height: 4 },
    ],
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.23, type: 'external' },
      { id: 'w2', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.23, type: 'external' },
    ],
    openings: [
      { id: 'o1', wallId: 'w1', kind: 'door', offset: 0.5, width: 0.9, height: 2.1, sillHeight: 0 },
    ],
    ...overrides,
  }
}

describe('exportProfessionalSvg', () => {
  it('returns an SVG string', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('includes white background', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('fill="#ffffff"')
  })

  it('includes wall elements with poché fill for external', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('fill="#000000"')
  })

  it('includes room labels in uppercase', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('LIVING ROOM')
    expect(svg).toContain('BEDROOM')
  })

  it('includes area text for rooms', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('m²')
  })

  it('includes dimension lines', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('stroke="#d94f4f"')
  })

  it('includes scale bar', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('0</text>')
    expect(svg).toContain('m</text>')
  })

  it('includes north arrow', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('N</text>')
  })

  it('includes title block', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('FLOOR PLAN')
    expect(svg).toContain('DzeNhare OS')
  })

  it('includes door rendering', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('stroke="#c2782b"')
  })

  it('includes sheet border', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('DIMENSIONS IN MILLIMETRES')
  })

  it('includes viewBox attribute', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('viewBox="')
  })

  it('includes xmlns attribute', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('does not include dark background', () => {
    const svg = exportProfessionalSvg(makePlan())
    expect(svg).not.toContain('#020617')
  })
})
