import { describe, it, expect } from 'vitest'
import type { BoardTemplateId } from '@/domain/presentation'
import { computeBoardLayout, getDefaultCells, listTemplateIds, getTemplateDef, scaleCellContent } from '@/lib/presentation/boardLayout'

describe('computeBoardLayout', () => {
  it('returns cells for concept template on A1 landscape', () => {
    const result = computeBoardLayout('concept', 'A1', true)
    expect(result.cells.length).toBe(6)
    expect(result.sheetW).toBe(841)
    expect(result.sheetH).toBe(594)
  })

  it('returns cells for design-development template', () => {
    const result = computeBoardLayout('design-development', 'A1', true)
    expect(result.cells.length).toBe(9)
    expect(result.sheetW).toBe(841)
  })

  it('returns empty array for unknown template', () => {
    const result = computeBoardLayout('unknown' as BoardTemplateId)
    expect(result.cells).toEqual([])
    expect(result.sheetW).toBe(0)
    expect(result.sheetH).toBe(0)
  })

  it('all cells have positive dimensions', () => {
    const result = computeBoardLayout('planning', 'A0', false)
    for (const cell of result.cells) {
      expect(cell.w).toBeGreaterThan(100)
      expect(cell.h).toBeGreaterThan(50)
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('cells do not overlap', () => {
    const result = computeBoardLayout('design-development', 'A1', true)
    for (let i = 0; i < result.cells.length; i++) {
      for (let j = i + 1; j < result.cells.length; j++) {
        const a = result.cells[i]
        const b = result.cells[j]
        const overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
        expect(overlap).toBe(false)
      }
    }
  })
})

describe('getDefaultCells', () => {
  it('returns correct cell count for concept', () => {
    const cells = getDefaultCells('concept')
    expect(cells.length).toBe(6)
    expect(cells[0].type).toBe('snapshot')
    expect(cells[0].label).toBeTruthy()
  })

  it('returns empty array for unknown template', () => {
    expect(getDefaultCells('unknown' as BoardTemplateId)).toEqual([])
  })
})

describe('listTemplateIds', () => {
  it('returns three templates', () => {
    const ids = listTemplateIds()
    expect(ids).toContain('concept')
    expect(ids).toContain('design-development')
    expect(ids).toContain('planning')
    expect(ids.length).toBe(3)
  })
})

describe('getTemplateDef', () => {
  it('returns defs for planning template', () => {
    const defs = getTemplateDef('planning')
    expect(defs.length).toBe(8)
    expect(defs[0].id).toBe('site-plan')
  })
})

describe('scaleCellContent', () => {
  it('returns scale ≤ 1', () => {
    const result = scaleCellContent(400, 300, 800, 600)
    expect(result.scale).toBeLessThanOrEqual(1)
    expect(result.scale).toBeGreaterThan(0)
  })

  it('offsets center content in cell', () => {
    const result = scaleCellContent(400, 300, 200, 150)
    expect(result.offsetX).toBeGreaterThan(0)
    expect(result.offsetY).toBeGreaterThan(0)
  })

  it('handles zero content dimensions', () => {
    const result = scaleCellContent(400, 300, 0, 0)
    expect(result.scale).toBeGreaterThan(0)
  })
})
