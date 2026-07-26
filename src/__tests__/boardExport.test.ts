import { describe, it, expect } from 'vitest'
import { generateBoardSvg, generateBoardSvgString, serializeBoardSvg } from '@/adapters/boardExport'
import type { PresentationBoard } from '@/domain/presentation'

function makeBoard(overrides?: Partial<PresentationBoard>): PresentationBoard {
  return {
    id: 'board-1',
    projectId: 'proj-1',
    name: 'Test Board',
    sheetSize: 'A1',
    landscape: true,
    cells: [
      { id: 'hero', type: 'snapshot', x: 40, y: 120, w: 380, h: 210, label: 'CONCEPT RENDERING' },
      { id: 'notes', type: 'text', x: 440, y: 120, w: 360, h: 210, label: 'DESIGN NOTES' },
      { id: 'title', type: 'title-block', x: 40, y: 10, w: 760, h: 80, label: '' },
    ],
    annotations: [
      { id: 'ann-1', kind: 'textbox', x: 100, y: 200, w: 120, h: 24, text: 'Hello', color: '#000', strokeWidth: 1 },
      { id: 'ann-2', kind: 'callout', x: 300, y: 300, color: '#e74c3c', strokeWidth: 1.5, points: [{ x: 300, y: 300 }, { x: 350, y: 280 }, { x: 400, y: 280 }], text: 'Note' },
      { id: 'ann-3', kind: 'dimension', x: 200, y: 400, color: '#3498db', strokeWidth: 0.5, points: [{ x: 200, y: 400 }, { x: 350, y: 400 }] },
      { id: 'ann-4', kind: 'freehand', x: 500, y: 400, color: '#2ecc71', strokeWidth: 2, points: [{ x: 500, y: 400 }, { x: 510, y: 410 }, { x: 520, y: 405 }] },
    ],
    snapshots: [],
    templateId: 'concept',
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  }
}

describe('generateBoardSvg', () => {
  it('returns string containing svg tag', () => {
    const board = makeBoard()
    const svg = generateBoardSvg(board)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('viewBox')
  })

  it('includes annotation elements', () => {
    const board = makeBoard()
    const svg = generateBoardSvg(board)
    expect(svg).toContain('Hello')
    expect(svg).toContain('Note')
  })

  it('includes cell frames', () => {
    const board = makeBoard()
    const svg = generateBoardSvg(board)
    expect(svg).toContain('CONCEPT RENDERING')
    expect(svg).toContain('DESIGN NOTES')
  })

  it('includes title block', () => {
    const board = makeBoard()
    const svg = generateBoardSvg(board)
    expect(svg).toContain('PRESENTATION BOARD')
  })

  it('handles board with no annotations', () => {
    const board = makeBoard({ annotations: [] })
    const svg = generateBoardSvg(board)
    expect(svg).toContain('<svg')
  })

  it('handles board with snapshots', () => {
    const board = makeBoard({
      cells: [
        { id: 'hero', type: 'snapshot', x: 40, y: 120, w: 380, h: 210, label: 'CONCEPT RENDERING', contentId: 'snap-1' },
        { id: 'notes', type: 'text', x: 440, y: 120, w: 360, h: 210, label: 'DESIGN NOTES' },
        { id: 'title', type: 'title-block', x: 40, y: 10, w: 760, h: 80, label: '' },
      ],
      snapshots: [{ id: 'snap-1', name: 'Render', dataUrl: 'data:image/png;base64,abc', width: 400, height: 300, capturedAt: 1000 }],
    })
    const svg = generateBoardSvg(board)
    expect(svg).toContain('image')
  })

  it('uses correct sheet dimensions for A0 portrait', () => {
    const board = makeBoard({ sheetSize: 'A0', landscape: false })
    const svg = generateBoardSvg(board)
    expect(svg).toContain('841')
    expect(svg).toContain('1189')
  })
})

describe('serializeBoardSvg', () => {
  it('returns null for null input', () => {
    expect(serializeBoardSvg(null)).toBeNull()
  })
})

describe('generateBoardSvgString', () => {
  it('produces valid SVG string', () => {
    const board = makeBoard()
    const svg = generateBoardSvgString(board)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})
