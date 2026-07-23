import { describe, test, expect } from 'vitest'
import {
  renderBrickCoursing,
  renderStonePlinth,
  renderLouverWindow,
  renderClerestoryWindow,
  renderTransomWindow,
  renderGroupedWindow,
  renderArchedWindow,
  renderWindowHood,
  renderStairSection,
  renderParapetCoping,
  renderTimberBeam,
} from '@/adapters/materialTextures'

describe('renderBrickCoursing', () => {
  test('returns horizontal and vertical brick lines', () => {
    const result = renderBrickCoursing(0, 0, 10, 3)
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.rects.length).toBe(0)
  })

  test('has horizontal course lines', () => {
    const result = renderBrickCoursing(0, 0, 5, 2)
    const hLines = result.lines.filter(l => Math.abs(l.y1 - l.y2) < 0.001)
    expect(hLines.length).toBeGreaterThan(0)
  })

  test('has vertical perp-ends', () => {
    const result = renderBrickCoursing(0, 0, 5, 2)
    const vLines = result.lines.filter(l => Math.abs(l.x1 - l.x2) < 0.001)
    expect(vLines.length).toBeGreaterThan(0)
  })

  test('handles zero area', () => {
    const result = renderBrickCoursing(0, 0, 0, 0)
    expect(result.lines.length).toBeGreaterThanOrEqual(0)
  })
})

describe('renderStonePlinth', () => {
  test('returns rect and joint lines', () => {
    const result = renderStonePlinth(0, 0, 10, 0.3)
    expect(result.rects.length).toBe(1)
    expect(result.lines.length).toBeGreaterThan(0)
  })

  test('rect uses stone colours', () => {
    const result = renderStonePlinth(0, 0, 10, 0.3)
    expect(result.rects[0].fill).toBe('#9ca3af')
    expect(result.rects[0].stroke).toBe('#6b7280')
  })
})

describe('renderLouverWindow', () => {
  test('returns glass rect and slat lines', () => {
    const result = renderLouverWindow(0, 0, 1, 0.8)
    expect(result.rects.length).toBe(1)
    expect(result.lines.length).toBeGreaterThanOrEqual(2)
  })

  test('has centre mullion', () => {
    const result = renderLouverWindow(0, 0, 1, 0.8)
    const vLines = result.lines.filter(l => Math.abs(l.x1 - 0.5) < 0.01)
    expect(vLines.length).toBeGreaterThan(0)
  })

  test('has horizontal slats', () => {
    const result = renderLouverWindow(0, 0, 1, 0.8)
    const hLines = result.lines.filter(l => Math.abs(l.y1 - l.y2) < 0.001)
    expect(hLines.length).toBeGreaterThanOrEqual(2)
  })
})

describe('renderClerestoryWindow', () => {
  test('returns two glass rects with divider', () => {
    const result = renderClerestoryWindow(0, 0, 1, 1.2)
    expect(result.rects.length).toBe(2)
    expect(result.lines.length).toBeGreaterThanOrEqual(1)
  })

  test('upper pane is lighter than lower', () => {
    const result = renderClerestoryWindow(0, 0, 1, 1.2)
    expect(result.rects[0].fill).toBe('#bae6fd')
    expect(result.rects[1].fill).toBe('#7dd3fc')
  })

  test('has horizontal divider line', () => {
    const result = renderClerestoryWindow(0, 0, 1, 1.2)
    const hLines = result.lines.filter(l => Math.abs(l.y1 - l.y2) < 0.001)
    expect(hLines.length).toBeGreaterThan(0)
  })
})

describe('renderTransomWindow', () => {
  test('returns two rects with divider and mullions', () => {
    const result = renderTransomWindow(0, 0, 1.2, 1.5)
    expect(result.rects.length).toBe(2)
    expect(result.lines.length).toBeGreaterThanOrEqual(3)
  })

  test('has vertical mullion lines below transom', () => {
    const result = renderTransomWindow(0, 0, 1.2, 1.5)
    const vLines = result.lines.filter(l => Math.abs(l.x1 - l.x2) < 0.001)
    expect(vLines.length).toBeGreaterThan(0)
  })
})

describe('renderGroupedWindow', () => {
  test('returns outer rect with mullion lines', () => {
    const result = renderGroupedWindow(0, 0, 2.4, 1.5, 4)
    expect(result.rects.length).toBe(1)
    expect(result.lines.length).toBeGreaterThanOrEqual(4)
  })

  test('creates correct number of panes', () => {
    const result = renderGroupedWindow(0, 0, 2.4, 1.5, 3)
    const vLines = result.lines.filter(l => Math.abs(l.x1 - l.x2) < 0.001 && l.strokeWidth === 0.025)
    expect(vLines.length).toBe(2)
  })

  test('has horizontal mid line', () => {
    const result = renderGroupedWindow(0, 0, 2.4, 1.5)
    const hLines = result.lines.filter(l => Math.abs(l.y1 - l.y2) < 0.001)
    expect(hLines.length).toBeGreaterThan(0)
  })
})

describe('renderArchedWindow', () => {
  test('returns rect, arch polygon, and keystone', () => {
    const result = renderArchedWindow(0, 0, 1.2, 1.5)
    expect(result.rects.length).toBe(1)
    expect(result.polygons.length).toBeGreaterThanOrEqual(2)
    expect(result.lines.length).toBeGreaterThan(0)
  })

  test('arch polygon is first polygon', () => {
    const result = renderArchedWindow(0, 0, 1.2, 1.5)
    expect(result.polygons[0].points.length).toBeGreaterThan(2)
  })

  test('keystone is second polygon', () => {
    const result = renderArchedWindow(0, 0, 1.2, 1.5)
    expect(result.polygons[1].points.length).toBe(4)
  })
})

describe('renderWindowHood', () => {
  test('returns hood polygon and bracket polygons', () => {
    const result = renderWindowHood(0, 0, 1.2, 1.5)
    expect(result.polygons.length).toBeGreaterThanOrEqual(3)
    expect(result.lines.length).toBeGreaterThan(0)
  })

  test('cover exceeds window width', () => {
    const result = renderWindowHood(0, 0, 1, 1.5)
    const maxX = Math.max(...result.polygons[0].points.map(p => p.x))
    expect(maxX).toBeGreaterThan(1)
  })

  test('has two bracket polygons', () => {
    const result = renderWindowHood(0, 0, 1.2, 1.5)
    const bracketPolys = result.polygons.filter(p => p.fill === '#57534e')
    expect(bracketPolys.length).toBe(2)
  })
})

describe('renderStairSection', () => {
  test('returns tread and riser lines', () => {
    const result = renderStairSection(0, 3, 3, 1.5, 10)
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.rects.length).toBe(1)
    expect(result.texts.length).toBe(1)
  })

  test('has stringer line (dashed)', () => {
    const result = renderStairSection(0, 3, 3, 1.5, 10)
    const dashedLines = result.lines.filter(l => l.dashed)
    expect(dashedLines.length).toBe(1)
  })

  test('text annotation contains riser info', () => {
    const result = renderStairSection(0, 3, 3, 1.5, 10)
    expect(result.texts[0].text).toContain('STAIR')
    expect(result.texts[0].text).toContain('150')
  })

  test('generates correct number of tread lines', () => {
    const result = renderStairSection(0, 3, 3, 1.5, 10)
    const treadLines = result.lines.filter(l => l.stroke === '#a8a29e')
    expect(treadLines.length).toBe(10)
  })
})

describe('renderParapetCoping', () => {
  test('returns rect with dashed centre line', () => {
    const result = renderParapetCoping(0, 0, 10, 0.08)
    expect(result.rects.length).toBe(1)
    expect(result.lines.length).toBeGreaterThan(0)
  })

  test('dashed line is centred', () => {
    const result = renderParapetCoping(0, 0, 10, 0.12)
    expect(result.lines[0].dashed).toBe(true)
    expect(result.lines[0].y1).toBe(0.06)
  })
})

describe('renderTimberBeam', () => {
  test('returns rect with hatch lines', () => {
    const result = renderTimberBeam(0, 0, 3, 0.2)
    expect(result.rects.length).toBe(1)
    expect(result.lines.length).toBeGreaterThan(0)
  })
})
