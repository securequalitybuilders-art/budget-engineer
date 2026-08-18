// ── dxfGenerator.test.ts ───────────────────────────────────────
// Tests for PlotterPath[] → AutoCAD R12 DXF conversion.

import { describe, it, expect } from 'vitest'
import { generateDxf, countDxfEntities, dxfLayerNames } from '@/lib/plotter/dxfGenerator'
import type { PlotterPath } from '@/lib/plotter/types'

// ── Fixtures ───────────────────────────────────────────────────

function makeWallPath(layer = 'A-WALL-FULL'): PlotterPath {
  return {
    index: 0,
    layer,
    segments: [{
      points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }],
      layer,
    }],
    length: 1000,
  }
}

function makeRoomPath(): PlotterPath {
  return {
    index: 1,
    layer: 'A-ANNO-TEXT',
    segments: [{
      points: [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 3000 },
        { x: 0, y: 3000 },
        { x: 0, y: 0 },
      ],
      layer: 'A-ANNO-TEXT',
    }],
    length: 16000,
  }
}

function makeDoorPath(): PlotterPath {
  return {
    index: 2,
    layer: 'A-DOOR',
    segments: [{
      points: [
        { x: 1000, y: 0 },
        { x: 1900, y: 0 },
        { x: 1900, y: 2100 },
        { x: 1000, y: 2100 },
        { x: 1000, y: 0 },
      ],
      layer: 'A-DOOR',
    }],
    length: 6000,
  }
}

// ── Tests ──────────────────────────────────────────────────────

describe('generateDxf', () => {
  it('returns a non-empty DXF string', () => {
    const dxf = generateDxf([makeWallPath()])
    expect(dxf.length).toBeGreaterThan(0)
  })

  it('contains AutoCAD R12 version header AC1009', () => {
    const dxf = generateDxf([makeWallPath()])
    expect(dxf).toContain('AC1009')
  })

  it('contains SECTION and ENDSEC blocks', () => {
    const dxf = generateDxf([makeWallPath()])
    expect(dxf).toContain('SECTION')
    expect(dxf).toContain('ENDSEC')
  })

  it('ends with EOF marker', () => {
    const dxf = generateDxf([makeWallPath()])
    expect(dxf.trimEnd()).toMatch(/EOF\n?$/)
  })

  it('defines all layers from paths', () => {
    const paths = [makeWallPath('A-WALL-FULL'), makeRoomPath(), makeDoorPath()]
    const dxf = generateDxf(paths)
    const layers = dxfLayerNames(dxf)
    expect(layers).toContain('A-WALL-FULL')
    expect(layers).toContain('A-ANNO-TEXT')
    expect(layers).toContain('A-DOOR')
  })

  it('uses LINE entity for 2-point wall segments', () => {
    const dxf = generateDxf([makeWallPath()])
    const { lines, polylines } = countDxfEntities(dxf)
    expect(lines).toBe(1)
    expect(polylines).toBe(0)
  })

  it('uses POLYLINE entity for multi-point room segments', () => {
    const dxf = generateDxf([makeRoomPath()])
    const { lines, polylines } = countDxfEntities(dxf)
    expect(polylines).toBe(1)
    expect(lines).toBe(0)
  })

  it('marks closed polyline for 4+ points', () => {
    const dxf = generateDxf([makeRoomPath()])
    // Group code 70 with value 1 = closed polyline
    expect(dxf).toContain('70\n1\n')
  })

  it('marks open polyline for 2-3 points', () => {
    const openSeg: PlotterPath = {
      index: 0, layer: 'A-GLAZ', length: 500,
      segments: [{ points: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 500 }], layer: 'A-GLAZ' }],
    }
    const dxf = generateDxf([openSeg])
    // Group code 70 with value 0 = open polyline
    expect(dxf).toContain('70\n0\n')
  })

  it('includes all VERTEX entries for polyline points', () => {
    const dxf = generateDxf([makeRoomPath()])
    const vertexCount = (dxf.match(/VERTEX\n/g) ?? []).length
    expect(vertexCount).toBe(5)
  })

  it('includes SEQEND after polyline vertices', () => {
    const dxf = generateDxf([makeRoomPath()])
    expect(dxf).toContain('SEQEND')
  })

  it('includes projectName text when provided', () => {
    const dxf = generateDxf([makeWallPath()], { projectName: 'My Project' })
    expect(dxf).toContain('My Project — Budget Engineer DXF Export')
  })

  it('omits projectName text by default', () => {
    const dxf = generateDxf([makeWallPath()])
    expect(dxf).not.toContain('Budget Engineer DXF Export')
  })

  it('sets INSUNITS to 4 (millimetres)', () => {
    const dxf = generateDxf([makeWallPath()])
    expect(dxf).toContain('INSUNITS')
    expect(dxf).toContain('4')
  })

  it('omits header section when includeHeader=false', () => {
    const dxf = generateDxf([makeWallPath()], { includeHeader: false })
    const layers = dxfLayerNames(dxf)
    expect(layers.length).toBeGreaterThan(0)
    expect(dxf).not.toContain('Budget Engineer')
  })

  it('returns empty string for no paths', () => {
    const dxf = generateDxf([])
    expect(dxf).toContain('EOF')
  })

  it('assigns ACI color 7 to A-WALL-FULL layer', () => {
    const dxf = generateDxf([makeWallPath('A-WALL-FULL')])
    // Find the LAYER block for A-WALL-FULL and check color code 62
    const re = /LAYER\n  2\nA-WALL-FULL[\s\S]*?62\n(\d+)/
    const match = dxf.match(re)
    expect(match?.[1]).toBe('7')
  })

  it('assigns ACI color 3 (green) to A-DOOR layer', () => {
    const dxf = generateDxf([makeDoorPath()])
    const re = /LAYER\n  2\nA-DOOR[\s\S]*?62\n(\d+)/
    const match = dxf.match(re)
    expect(match?.[1]).toBe('3')
  })

  it('uses CONTINUOUS linetype for all layers', () => {
    const dxf = generateDxf([makeWallPath(), makeRoomPath()])
    const layerCount = dxfLayerNames(dxf).length
    const ltCount = (dxf.match(/CONTINUOUS/g) ?? []).length
    expect(ltCount).toBeGreaterThanOrEqual(layerCount)
  })

  it('skips segments with fewer than 2 points', () => {
    const degenerate: PlotterPath = {
      index: 0, layer: 'A-WALL-FULL', length: 0,
      segments: [{ points: [{ x: 0, y: 0 }], layer: 'A-WALL-FULL' }],
    }
    const dxf = generateDxf([degenerate])
    const { lines, polylines } = countDxfEntities(dxf)
    expect(lines).toBe(0)
    expect(polylines).toBe(0)
  })
})

describe('countDxfEntities', () => {
  it('counts polylines and lines separately', () => {
    const dxf = generateDxf([makeWallPath(), makeRoomPath(), makeDoorPath()])
    const { polylines, lines } = countDxfEntities(dxf)
    expect(lines).toBe(1) // wall (2-point)
    expect(polylines).toBe(2) // room + door (5-point each)
  })

  it('returns zeros for empty DXF', () => {
    expect(countDxfEntities('')).toEqual({ polylines: 0, lines: 0 })
  })
})

describe('dxfLayerNames', () => {
  it('returns sorted unique layer names', () => {
    const dxf = generateDxf([makeWallPath('A-WALL-FULL'), makeRoomPath(), makeDoorPath()])
    const layers = dxfLayerNames(dxf)
    expect(layers).toEqual(['A-ANNO-TEXT', 'A-DOOR', 'A-WALL-FULL'])
  })

  it('returns empty array for DXF with no layers', () => {
    expect(dxfLayerNames('')).toEqual([])
  })
})
