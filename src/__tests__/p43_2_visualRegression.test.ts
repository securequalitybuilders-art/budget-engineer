import { describe, test, expect } from 'vitest'
import { convertPlanModelToWs6Cad } from '@/adapters/planModelToWs6Cad'
import { buildElevationSvg } from '@/lib/drawings/elevation-svg'
import type { PlanModel, Opening } from '@/domain/plan'
import type { CadDocument } from '@/domain/ws6-types'

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    width: 8,
    height: 6,
    wallThickness: 0.23,
    storeyHeight: 3.0,
    rooms: [
      {
        id: 'r1', name: 'Living Room', width: 5, height: 4,
        x: 0.5, y: 0.5,
        windowIds: ['w1'], doorIds: ['d1'],
      },
      {
        id: 'r2', name: 'Kitchen', width: 3, height: 4,
        x: 5.5, y: 0.5,
        windowIds: ['w2'], doorIds: [],
      },
    ],
    walls: [],
    openings: [
      { id: 'w1', wallId: 'right-wall-1', kind: 'window', width: 1.2, height: 1.5, offset: 2.0, sillHeight: 0.9, headHeight: 2.4 },
    ],
    ...overrides,
  } as PlanModel
}

function makeCadWithOpenings(cadOverrides?: Partial<CadDocument>): CadDocument {
  return {
    id: 'test-cad-001',
    projectId: 'proj-001',
    floors: [{ id: 'fl1', name: 'Ground Floor', elevation: 0, height: 3.0 }],
    walls: [
      // orientWall convention: dy>0 → 'left', dy<0 → 'right', dx>0 → 'front', dx<0 → 'rear'
      { id: 'right-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 8, y: 0 } },
      { id: 'left-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 0, y: 6 } },
      { id: 'front-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 8, y: 0 } },
      { id: 'rear-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 0, y: 6 } },
    ],
    openings: [
      { id: 'o1', floorId: 'fl1', wallId: 'right-wall-1', kind: 'window', width: 1.2, offset: 2.0, sillHeight: 0.9, headHeight: 2.4, name: '', metadata: {} },
      { id: 'o2', floorId: 'fl1', wallId: 'right-wall-1', kind: 'door', width: 0.9, offset: 4.5, sillHeight: 0, headHeight: 2.1, name: '', metadata: { typeName: 'hinged' } },
    ],
    blocks: [],
    roomProgramme: { r1: 'Living Room', r2: 'Kitchen' },
    ...cadOverrides,
  } as unknown as CadDocument
}

function countInSvg(svg: string, pattern: string): number {
  return (svg.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
}

describe('P43.2 — Side elevation visual semantic markers', () => {
  test('right side elevation SVG contains sill markers on windows', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('SILL')
    expect(svg).toContain('+0.90')
  })

  test('right side elevation SVG contains head markers on windows', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('HD')
    expect(svg).toContain('+2.40')
  })

  test('right side elevation SVG contains head markers on doors', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('+2.10')
  })

  test('right side elevation SVG contains roof annotation', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('PITCHED ROOF')
    expect(svg).toContain('FASCIA')
  })

  test('right side elevation SVG contains ground line', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('GL')
    expect(svg).toContain('±0.000')
  })

  test('right side elevation SVG contains FFL datum', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('FFL')
    expect(svg).toContain('+3.00')
  })

  test('right side elevation SVG contains overall height annotation', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('HT')
    expect(svg).toContain('3.00')
  })

  test('right side elevation contains side label', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('RIGHT SIDE')
  })

  test('right side elevation contains building depth', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toMatch(/m deep/)
  })

  test('right side elevation contains opening counts', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toMatch(/openings/)
    expect(svg).toMatch(/W \//)
    expect(svg).toMatch(/D\)/)
  })

  test('right side elevation contains building depth', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toMatch(/m deep/)
  })

  test('right side elevation contains scale and typology', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('1:100')
    expect(svg).toContain('family house')
  })

  test('right side elevation contains datum column', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('Ground Floor FL')
  })

  test('right side elevation contains course lines', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    const lineCount = countInSvg(svg, 'stroke-width="0.35"')
    expect(lineCount).toBeGreaterThan(5)
  })

  test('right side elevation contains wall surface representation', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('brick-hatch')
  })

  test('right side elevation SVG is well-formed', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  test('right side elevation doorway has head annotation', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('HD +2.10')
  })
})

describe('P43.2 — Front elevation baseline (regression guard)', () => {
  test('front elevation SVG contains sill and head markers', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'front')
    expect(svg).toContain('SILL')
    expect(svg).toContain('HD')
  })

  test('front elevation SVG contains entrance canopy', () => {
    const cad = makeCadWithOpenings({
      roomProgramme: { r1: 'Living Room', r2: 'Kitchen' },
      walls: [
        { id: 'front-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 8, y: 0 } },
        { id: 'right-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 8, y: 0 } },
        { id: 'left-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 0, y: 6 } },
        { id: 'rear-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 0, y: 6 } },
      ],
      openings: [
        { id: 'o1', floorId: 'fl1', wallId: 'front-wall-1', kind: 'door', width: 0.9, offset: 3.0, sillHeight: 0, headHeight: 2.1, name: '', metadata: { typeName: 'hinged' } },
      ],
    })
    const svg = buildElevationSvg(cad, 'front')
    expect(svg).toContain('ENTRY')
  })

  test('front elevation SVG contains front label', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'front')
    expect(svg).toContain('Front Elevation')
  })

  test('front elevation SVG contains keynote schedule', () => {
    const cad = makeCadWithOpenings()
    const svg = buildElevationSvg(cad, 'front')
    expect(svg).toContain('EXTERNAL WALL')
    expect(svg).toContain('BRICKWORK')
  })
})

describe('P43.2 — Semantic fallback with openings on perpendicular walls', () => {
  test('perpendicular wall opening still has basic sill/head markers', () => {
    const cad = makeCadWithOpenings({
      walls: [
        { id: 'front-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 8, y: 0 } },
        { id: 'right-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 8, y: 0 } },
        { id: 'left-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 0, y: 6 } },
        { id: 'rear-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 0, y: 6 } },
      ],
      openings: [
        { id: 'o-horiz', floorId: 'fl1', wallId: 'front-wall-1', kind: 'window', width: 1.2, offset: 3.0, sillHeight: 0.9, headHeight: 2.4, name: '', metadata: {} },
      ],
    })
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('SILL')
    expect(svg).toContain('HD')
    expect(svg).toContain('+0.90')
    expect(svg).toContain('+2.40')
  })
})

describe('P43.2 — Floor role detection', () => {
  test('right side elevation contains floor role labels for multi-storey', () => {
    const cad = makeCadWithOpenings({
      floors: [
        { id: 'fl1', name: 'Ground Floor', elevation: 0, height: 3.0 },
        { id: 'fl2', name: 'First Floor', elevation: 3.0, height: 2.7 },
      ],
      walls: [
        { id: 'right-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 8, y: 0 } },
        { id: 'left-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 0, y: 6 } },
        { id: 'front-wall-1', floorId: 'fl1', structural: true, start: { x: 0, y: 0 }, end: { x: 8, y: 0 } },
        { id: 'rear-wall-1', floorId: 'fl1', structural: true, start: { x: 8, y: 6 }, end: { x: 0, y: 6 } },
        { id: 'right-wall-2', floorId: 'fl2', structural: true, start: { x: 8, y: 6 }, end: { x: 8, y: 0 } },
        { id: 'left-wall-2', floorId: 'fl2', structural: true, start: { x: 0, y: 0 }, end: { x: 0, y: 6 } },
        { id: 'front-wall-2', floorId: 'fl2', structural: true, start: { x: 0, y: 0 }, end: { x: 8, y: 0 } },
        { id: 'rear-wall-2', floorId: 'fl2', structural: true, start: { x: 8, y: 6 }, end: { x: 0, y: 6 } },
      ],
    })
    const svg = buildElevationSvg(cad, 'right')
    expect(svg).toContain('GROUND')
    expect(svg).toContain('TOP FLOOR')
    expect(svg).toContain('FFL')
  })
})
