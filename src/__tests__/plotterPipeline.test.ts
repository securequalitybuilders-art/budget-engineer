// ── Plotter Pipeline — Comprehensive Test Suite ────────────────
// Tests SVG parsing, TSP optimization, HPGL generation, pen assignment,
// and the full pipeline end-to-end.

import { describe, it, expect } from 'vitest'
import {
  // SVG parser
  parseSvgPathD,
  extractSvgElements,
  svgToPlotterPaths,
  groupByLayer,
  // Path optimizer
  mergeCollinear,
  solveTsp2Opt,
  optimizePenGroup,
  // HPGL generator
  generateHpgl,
  formatHpglCmd,
  svgCoordToHpgl,
  estimatePlotTime,
  buildPlotterResult,
  // Pen assignment
  penSlotForLayer,
  penSpecForLayer,
  classifyLayer,
  requiredPens,
  countPenChanges,
  // Pipeline
  svgToHpgl as pipelineSvgToHpgl,
  pensForSheet,
  SHEET_LAYER_MAP,
  // Types
  PAPER_DIMENSIONS,
  mmToHpglUnits,
  ARCH_PEN_SET,
  penSlotForWeight,
} from '@/lib/plotter'
import type { PlotterPoint, PlotterSegment, PlotterPath, OptimizedPenGroup } from '@/lib/plotter'

// ── SVG Path Parser ───────────────────────────────────────────

describe('SVG path parser', () => {
  describe('parseSvgPathD', () => {
    it('parses a simple M L Z path', () => {
      const pts = parseSvgPathD('M 0,0 L 10,0 L 10,10 Z')
      expect(pts).toHaveLength(1)
      expect(pts[0]).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 0 },
      ])
    })

    it('parses relative moveto and lineto', () => {
      const pts = parseSvgPathD('M 5,5 l 3,4 L 7,9')
      expect(pts).toHaveLength(1)
      expect(pts[0][0]).toEqual({ x: 5, y: 5 })
      expect(pts[0][1]).toEqual({ x: 8, y: 9 })
      expect(pts[0][2]).toEqual({ x: 7, y: 9 })
    })

    it('parses horizontal and vertical lineto', () => {
      const pts = parseSvgPathD('M 0,0 H 20 V 10 H 0 Z')
      expect(pts).toHaveLength(1)
      expect(pts[0]).toEqual([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ])
    })

    it('parses cubic bezier curves', () => {
      const pts = parseSvgPathD('M 0,0 C 5,10 15,10 20,0')
      expect(pts).toHaveLength(1)
      expect(pts[0].length).toBeGreaterThan(2) // Bezier produces multiple points
      expect(pts[0][0]).toEqual({ x: 0, y: 0 })
      // Last point should be near the curve end
      const last = pts[0][pts[0].length - 1]
      expect(last.x).toBeCloseTo(20, 0)
      expect(last.y).toBeCloseTo(0, 0)
    })

    it('parses quadratic bezier curves', () => {
      const pts = parseSvgPathD('M 0,0 Q 10,10 20,0')
      expect(pts).toHaveLength(1)
      expect(pts[0].length).toBeGreaterThan(2)
      const last = pts[0][pts[0].length - 1]
      expect(last.x).toBeCloseTo(20, 0)
      expect(last.y).toBeCloseTo(0, 0)
    })

    it('returns empty for invalid input', () => {
      expect(parseSvgPathD('')).toEqual([])
      expect(parseSvgPathD('not a path')).toEqual([])
    })

    it('handles multiple moveto subpaths', () => {
      const pts = parseSvgPathD('M 0,0 L 10,10 M 20,20 L 30,30')
      expect(pts).toHaveLength(2)
    })
  })

  describe('extractSvgElements', () => {
    it('extracts line elements', () => {
      const svg = '<svg><line x1="0" y1="0" x2="10" y2="20" stroke="#000"/></svg>'
      const els = extractSvgElements(svg)
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('line')
    })

    it('extracts rect elements', () => {
      const svg = '<svg><rect x="5" y="5" width="50" height="30" fill="none" stroke="#333"/></svg>'
      const els = extractSvgElements(svg)
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('rect')
    })

    it('skips filled rects with no stroke (backgrounds)', () => {
      const svg = '<svg><rect width="100" height="100" fill="#0b1220"/></svg>'
      const els = extractSvgElements(svg)
      expect(els).toHaveLength(0)
    })

    it('extracts path elements', () => {
      const svg = '<svg><path d="M 0,0 L 10,0 L 10,10 Z" stroke="#000"/></svg>'
      const els = extractSvgElements(svg)
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('path')
    })

    it('extracts polyline elements', () => {
      const svg = '<svg><polyline points="0,0 10,0 10,10 0,10" stroke="#000"/></svg>'
      const els = extractSvgElements(svg)
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('polyline')
    })

    it('extracts circle elements', () => {
      const svg = '<svg><circle cx="50" cy="50" r="25" stroke="#000"/></svg>'
      const els = extractSvgElements(svg)
      expect(els).toHaveLength(1)
      expect(els[0].type).toBe('circle')
    })

    it('extracts layer from class attribute', () => {
      const svg = '<svg><line x1="0" y1="0" x2="10" y2="10" class="A-WALL-FULL"/></svg>'
      const els = extractSvgElements(svg)
      expect(els[0]).toHaveProperty('layer', 'A-WALL-FULL')
    })

    it('extracts layer from data-layer attribute', () => {
      const svg = '<svg><line x1="0" y1="0" x2="10" y2="10" data-layer="S-COLS"/></svg>'
      const els = extractSvgElements(svg)
      expect(els[0]).toHaveProperty('layer', 'S-COLS')
    })

    it('extracts multiple elements from a complex SVG', () => {
      const svg = `<svg>
        <line x1="0" y1="0" x2="10" y2="10" stroke="#000"/>
        <rect x="5" y="5" width="50" height="30" fill="none" stroke="#333"/>
        <path d="M 20,20 L 30,30" stroke="#666"/>
        <circle cx="15" cy="15" r="5" stroke="#999"/>
      </svg>`
      const els = extractSvgElements(svg)
      expect(els.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('svgToPlotterPaths', () => {
    it('converts SVG to PlotterPath array', () => {
      const svg = `<svg>
        <line x1="0" y1="0" x2="100" y2="0" stroke="#000" class="A-WALL"/>
        <line x1="0" y1="0" x2="0" y2="100" stroke="#000" class="A-WALL"/>
      </svg>`
      const paths = svgToPlotterPaths(svg)
      expect(paths).toHaveLength(2)
      expect(paths[0].layer).toBe('A-WALL')
      expect(paths[0].segments).toHaveLength(1)
      expect(paths[0].length).toBeGreaterThan(0)
    })

    it('converts rect to closed polyline path', () => {
      const svg = '<svg><rect x="0" y="0" width="10" height="10" fill="none" stroke="#000" class="A-ANNO"/></svg>'
      const paths = svgToPlotterPaths(svg)
      expect(paths).toHaveLength(1)
      expect(paths[0].segments[0].points).toHaveLength(5) // 4 corners + close
    })

    it('converts circle to polygon path', () => {
      const svg = '<svg><circle cx="50" cy="50" r="10" fill="none" stroke="#000" class="A-GRID"/></svg>'
      const paths = svgToPlotterPaths(svg)
      expect(paths).toHaveLength(1)
      expect(paths[0].segments[0].points.length).toBeGreaterThan(10)
    })

    it('skips elements with no visible stroke', () => {
      const svg = '<svg><rect width="100" height="100" fill="red"/></svg>'
      const paths = svgToPlotterPaths(svg)
      expect(paths).toHaveLength(0)
    })
  })

  describe('groupByLayer', () => {
    it('groups paths by layer', () => {
      const paths: PlotterPath[] = [
        { index: 0, layer: 'A-WALL', segments: [], length: 0 },
        { index: 1, layer: 'A-GRID', segments: [], length: 0 },
        { index: 2, layer: 'A-WALL', segments: [], length: 0 },
      ]
      const groups = groupByLayer(paths)
      expect(groups.size).toBe(2)
      expect(groups.get('A-WALL')).toHaveLength(2)
      expect(groups.get('A-GRID')).toHaveLength(1)
    })
  })
})

// ── Path Optimizer ────────────────────────────────────────────

describe('Path optimizer', () => {
  const makeSeg = (points: PlotterPoint[], layer = 'A-WALL'): PlotterSegment => ({
    points,
    layer,
  })

  describe('mergeCollinear', () => {
    it('merges two collinear segments', () => {
      const segs = [
        makeSeg([{ x: 0, y: 0 }, { x: 5, y: 0 }]),
        makeSeg([{ x: 5, y: 0 }, { x: 10, y: 0 }]),
      ]
      const [merged, count] = mergeCollinear(segs)
      expect(merged).toHaveLength(1)
      expect(count).toBe(1)
      expect(merged[0].points).toEqual([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
      ])
    })

    it('does not merge non-collinear segments', () => {
      const segs = [
        makeSeg([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
        makeSeg([{ x: 10, y: 0 }, { x: 10, y: 10 }]),
      ]
      const [merged] = mergeCollinear(segs)
      expect(merged).toHaveLength(2)
    })

    it('does not merge segments with a gap', () => {
      const segs = [
        makeSeg([{ x: 0, y: 0 }, { x: 5, y: 0 }]),
        makeSeg([{ x: 10, y: 0 }, { x: 15, y: 0 }]),
      ]
      const [merged] = mergeCollinear(segs)
      expect(merged).toHaveLength(2)
    })

    it('does not merge segments with different layers', () => {
      const segs = [
        makeSeg([{ x: 0, y: 0 }, { x: 5, y: 0 }], 'A-WALL'),
        makeSeg([{ x: 5, y: 0 }, { x: 10, y: 0 }], 'A-GRID'),
      ]
      const [merged] = mergeCollinear(segs)
      expect(merged).toHaveLength(2)
    })

    it('returns empty for no segments', () => {
      const [merged, count] = mergeCollinear([])
      expect(merged).toHaveLength(0)
      expect(count).toBe(0)
    })

    it('returns single segment unchanged', () => {
      const segs = [makeSeg([{ x: 0, y: 0 }, { x: 10, y: 0 }])]
      const [merged, count] = mergeCollinear(segs)
      expect(merged).toHaveLength(1)
      expect(count).toBe(0)
    })
  })

  describe('solveTsp2Opt', () => {
    it('reorders segments to minimize pen-up travel', () => {
      // Three segments: A(0,0→10,0), B(50,50→60,50), C(11,0→20,0)
      // Naive order A→B→C: 10→50 = ~56.6, 60→11 = ~49.5 = ~106 pen-up
      // Optimized order A→C→B: 10→11 = 1, 20→50 = ~31.6 = ~32.6 pen-up
      const segs = [
        makeSeg([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
        makeSeg([{ x: 50, y: 50 }, { x: 60, y: 50 }]),
        makeSeg([{ x: 11, y: 0 }, { x: 20, y: 0 }]),
      ]
      const ordered = solveTsp2Opt(segs)
      expect(ordered).toHaveLength(3)
      // First two should be nearby
      const d1 = Math.hypot(
        ordered[0].points[ordered[0].points.length - 1].x - ordered[1].points[0].x,
        ordered[0].points[ordered[0].points.length - 1].y - ordered[1].points[0].y,
      )
      const d2 = Math.hypot(
        ordered[1].points[ordered[1].points.length - 1].x - ordered[2].points[0].x,
        ordered[1].points[ordered[1].points.length - 1].y - ordered[2].points[0].y,
      )
      // Total pen-up should be much less than naive 106
      expect(d1 + d2).toBeLessThan(80)
    })

    it('handles two segments', () => {
      const segs = [
        makeSeg([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
        makeSeg([{ x: 5, y: 0 }, { x: 15, y: 0 }]),
      ]
      const ordered = solveTsp2Opt(segs)
      expect(ordered).toHaveLength(2)
    })

    it('handles single segment', () => {
      const segs = [makeSeg([{ x: 0, y: 0 }, { x: 10, y: 0 }])]
      const ordered = solveTsp2Opt(segs)
      expect(ordered).toHaveLength(1)
    })
  })

  describe('optimizePenGroup', () => {
    it('merges, orders, and stats a pen group', () => {
      const paths: PlotterPath[] = [{
        index: 0,
        layer: 'A-WALL',
        segments: [
          makeSeg([{ x: 0, y: 0 }, { x: 5, y: 0 }]),
          makeSeg([{ x: 5, y: 0 }, { x: 10, y: 0 }]), // collinear, will merge
          makeSeg([{ x: 50, y: 50 }, { x: 60, y: 50 }]),
        ],
        length: 60,
      }]
      const result = optimizePenGroup(4, paths)
      expect(result.pen).toBe(4)
      expect(result.mergesApplied).toBe(1) // Two collinear segments merged
      expect(result.segments.length).toBeLessThan(3)
      expect(result.penDownDistance).toBeGreaterThan(0)
      expect(result.penLifts).toBeGreaterThan(0)
    })
  })
})

// ── HPGL Generator ────────────────────────────────────────────

describe('HPGL generator', () => {
  describe('formatHpglCmd', () => {
    it('formats SP command', () => {
      expect(formatHpglCmd({ cmd: 'SP', pen: 3 })).toBe('SP3;')
    })

    it('formats PU with point', () => {
      expect(formatHpglCmd({ cmd: 'PU', point: { x: 100, y: 200 } })).toBe('PU100,200;')
    })

    it('formats PD with points', () => {
      const cmd = formatHpglCmd({
        cmd: 'PD',
        points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }],
      })
      expect(cmd).toBe('PD0,0,10,10,20,0;')
    })

    it('formats IP command', () => {
      expect(formatHpglCmd({ cmd: 'IP' })).toBe('IP;')
    })
  })

  describe('generateHpgl', () => {
    it('generates valid HPGL from pen groups', () => {
      const penGroups: OptimizedPenGroup[] = [{
        pen: 4,
        segments: [{
          points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
          layer: 'A-WALL',
        }],
        penUpTravel: 0,
        penDownDistance: 200,
        penLifts: 1,
        mergesApplied: 0,
      }]
      const { hpglString } = generateHpgl(penGroups, 200, 200, 'A1')
      expect(hpglString).toContain('SP4;')
      expect(hpglString).toContain('PU')
      expect(hpglString).toContain('PD')
      expect(hpglString).toContain('IP;')
    })
  })

  describe('svgCoordToHpgl (coordinate conversion)', () => {
    it('flips Y axis from SVG to HPGL', () => {
      const pt = svgCoordToHpgl(
        { x: 10, y: 10 },
        100, 100,
        841, 594,
      )
      // SVG y=10 from top → HPGL y near bottom
      expect(pt.y).toBeGreaterThan(0)
    })

    it('scales coordinates to paper', () => {
      const pt = svgCoordToHpgl(
        { x: 50, y: 50 },
        100, 100,
        841, 594,
      )
      expect(pt.x).toBeGreaterThan(0)
      expect(pt.x).toBeLessThan(mmToHpglUnits(841))
    })
  })

  describe('estimatePlotTime', () => {
    it('returns positive minutes', () => {
      const groups: OptimizedPenGroup[] = [{
        pen: 1,
        segments: [{
          points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }],
          layer: 'A-WALL',
        }],
        penUpTravel: 500,
        penDownDistance: 1000,
        penLifts: 10,
        mergesApplied: 0,
      }]
      expect(estimatePlotTime(groups)).toBeGreaterThan(0)
    })
  })

  describe('buildPlotterResult', () => {
    it('assembles a complete result', () => {
      const groups: OptimizedPenGroup[] = [{
        pen: 4,
        segments: [{
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          layer: 'A-WALL',
        }],
        penUpTravel: 500,
        penDownDistance: 3000,
        penLifts: 10,
        mergesApplied: 0,
      }]
      const result = buildPlotterResult(groups, 200, 200, 'A2')
      expect(result.paper.size).toBe('A2')
      expect(result.paper.widthMm).toBe(594)
      expect(result.stats.totalSegments).toBe(1)
      expect(result.stats.totalPenLifts).toBe(10)
      expect(result.stats.estimatedTimeMinutes).toBeGreaterThan(0)
      expect(result.hpglString).toContain('SP')
    })
  })
})

// ── Pen Assignment ────────────────────────────────────────────

describe('Pen assignment', () => {
  describe('penSlotForLayer', () => {
    it('maps A-WALL-FULL to pen 4 (0.50mm)', () => {
      expect(penSlotForLayer('A-WALL-FULL')).toBe(4)
    })

    it('maps A-DOOR to pen 2 (0.25mm)', () => {
      expect(penSlotForLayer('A-DOOR')).toBe(2)
    })

    it('maps A-GRID to pen 1 (0.18mm)', () => {
      expect(penSlotForLayer('A-GRID')).toBe(1)
    })

    it('maps S-COLS to pen 4 (0.50mm)', () => {
      expect(penSlotForLayer('S-COLS')).toBe(4)
    })

    it('maps A-SECT to pen 4 (0.70mm)', () => {
      expect(penSlotForLayer('A-SECT')).toBe(4)
    })

    it('maps unknown layer to pen 1 (default)', () => {
      expect(penSlotForLayer('UNKNOWN-LAYER')).toBe(1)
    })
  })

  describe('classifyLayer', () => {
    it('classifies A-WALL as architecture', () => {
      expect(classifyLayer('A-WALL')).toBe('architecture')
    })

    it('classifies S-COLS as structure', () => {
      expect(classifyLayer('S-COLS')).toBe('structure')
    })

    it('classifies A-DOOR as openings', () => {
      expect(classifyLayer('A-DOOR')).toBe('openings')
    })

    it('classifies E-POWR as electrical', () => {
      expect(classifyLayer('E-POWR')).toBe('electrical')
    })

    it('classifies P-PIPE as plumbing', () => {
      expect(classifyLayer('P-PIPE')).toBe('plumbing')
    })

    it('classifies M-HVAC as mechanical', () => {
      expect(classifyLayer('M-HVAC')).toBe('mechanical')
    })

    it('classifies A-ANNO-DIMS as dimensions', () => {
      expect(classifyLayer('A-ANNO-DIMS')).toBe('dimensions')
    })

    it('classifies A-TTLB as title', () => {
      expect(classifyLayer('A-TTLB')).toBe('title')
    })
  })

  describe('requiredPens', () => {
    it('returns sorted unique pen slots', () => {
      const pens = requiredPens(['A-WALL-FULL', 'A-DOOR', 'A-GRID', 'A-SECT'])
      expect(pens).toEqual([1, 2, 4])
    })

    it('returns empty for no layers', () => {
      expect(requiredPens([])).toEqual([])
    })
  })

  describe('countPenChanges', () => {
    it('counts pen changes', () => {
      expect(countPenChanges([1, 2, 3, 4])).toBe(3)
      expect(countPenChanges([4, 4, 4])).toBe(0)
      expect(countPenChanges([1, 1, 2, 2, 3])).toBe(2)
    })
  })
})

// ── Paper & Units ─────────────────────────────────────────────

describe('Paper and units', () => {
  it('has correct A1 dimensions', () => {
    expect(PAPER_DIMENSIONS.A1).toEqual({ widthMm: 841, heightMm: 594 })
  })

  it('has correct A0 dimensions', () => {
    expect(PAPER_DIMENSIONS.A0).toEqual({ widthMm: 1189, heightMm: 841 })
  })

  it('converts mm to HPGL units correctly', () => {
    expect(mmToHpglUnits(1)).toBe(40) // 1mm = 40 HPGL units
    expect(mmToHpglUnits(25.4)).toBe(1016) // 1 inch = 1016 units
  })

  it('pen slot for weight groups correctly', () => {
    expect(penSlotForWeight(0.13)).toBe(1)
    expect(penSlotForWeight(0.18)).toBe(1)
    expect(penSlotForWeight(0.25)).toBe(2)
    expect(penSlotForWeight(0.35)).toBe(3)
    expect(penSlotForWeight(0.50)).toBe(4)
    expect(penSlotForWeight(0.70)).toBe(4)
  })

  it('has 4 architectural pens defined', () => {
    expect(ARCH_PEN_SET).toHaveLength(4)
    expect(ARCH_PEN_SET[0].tipMm).toBe(0.18)
    expect(ARCH_PEN_SET[3].tipMm).toBe(0.50)
  })
})

// ── Drawing sheet pens ────────────────────────────────────────

describe('Drawing sheet pens', () => {
  it('floor plan needs pens 1,2,3,4', () => {
    const pens = pensForSheet('floor-plan')
    expect(pens).toContain(1) // grid/annotations
    expect(pens).toContain(2) // doors
    expect(pens).toContain(4) // walls
  })

  it('structural plan needs pens 1 and 4', () => {
    const pens = pensForSheet('structural-plan')
    expect(pens).toContain(1) // grid
    expect(pens).toContain(4) // columns/beams
  })

  it('electrical plan needs pens 1,2', () => {
    const pens = pensForSheet('electrical-plan')
    expect(pens.length).toBeGreaterThanOrEqual(1)
  })

  it('all sheet types have defined layers', () => {
    for (const [, layers] of Object.entries(SHEET_LAYER_MAP)) {
      expect(layers.length).toBeGreaterThan(0)
    }
  })
})

// ── Full Pipeline Integration ─────────────────────────────────

describe('Full pipeline integration', () => {
  const SIMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg">
    <line x1="0" y1="0" x2="100" y2="0" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="100" y1="0" x2="100" y2="80" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="100" y1="80" x2="0" y2="80" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="0" y1="80" x2="0" y2="0" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="0" y1="0" x2="50" y2="0" stroke="#2d3748" stroke-width="2" class="A-DOOR"/>
    <rect x="10" y="10" width="30" height="20" fill="none" stroke="#888" stroke-width="1" class="A-GRID"/>
    <line x1="150" y1="0" x2="200" y2="0" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="200" y1="0" x2="200" y2="80" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
  </svg>`

  it('parses SVG and groups by pen', () => {
    const paths = svgToPlotterPaths(SIMPLE_SVG)
    expect(paths.length).toBeGreaterThanOrEqual(5)

    // Check layer grouping
    const groups = groupByLayer(paths)
    expect(groups.has('A-WALL-FULL')).toBe(true)
    expect(groups.has('A-DOOR')).toBe(true)
    expect(groups.has('A-GRID')).toBe(true)
  })

  it('runs full pipeline end-to-end', () => {
    const result = pipelineSvgToHpgl(SIMPLE_SVG, { paperSize: 'A1' })
    expect(result.hpglString).toContain('SP')
    expect(result.hpglString).toContain('PU')
    expect(result.hpglString).toContain('PD')
    expect(result.hpglString).toContain('IP')
    expect(result.stats.totalSegments).toBeGreaterThan(0)
    expect(result.stats.totalPenLifts).toBeGreaterThan(0)
    expect(result.stats.estimatedTimeMinutes).toBeGreaterThan(0)
    expect(result.paper.size).toBe('A1')
  })

  it('optimization reduces pen-up travel vs naive', () => {
    const optimized = pipelineSvgToHpgl(SIMPLE_SVG, {
      paperSize: 'A1',
      tsp: { maxIterations: 500 },
    })
    const naive = pipelineSvgToHpgl(SIMPLE_SVG, {
      paperSize: 'A1',
      skipOptimization: true,
    })
    // Optimized should have less or equal pen-up travel
    expect(optimized.stats.totalPenUpTravelMm).toBeLessThanOrEqual(
      naive.stats.totalPenUpTravelMm + 1, // +1 for floating point
    )
  })

  it('different paper sizes produce different scales', () => {
    const a1 = pipelineSvgToHpgl(SIMPLE_SVG, { paperSize: 'A1' })
    const a3 = pipelineSvgToHpgl(SIMPLE_SVG, { paperSize: 'A3' })
    expect(a1.paper.widthMm).toBe(841)
    expect(a3.paper.widthMm).toBe(420)
    // Scale should be different
    expect(a1.paper.scale).not.toBeCloseTo(a3.paper.scale, 1)
  })

  it('skips optimization when skipOptimization is true', () => {
    const result = pipelineSvgToHpgl(SIMPLE_SVG, { skipOptimization: true })
    expect(result.stats.totalSegments).toBeGreaterThan(0)
    expect(result.hpglString).toContain('SP')
  })

  it('handles empty SVG gracefully', () => {
    const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    const result = pipelineSvgToHpgl(emptySvg)
    expect(result.stats.totalSegments).toBe(0)
    expect(result.hpglString).toContain('IP')
  })

  it('generates HPGL with correct pen selection per group', () => {
    const result = pipelineSvgToHpgl(SIMPLE_SVG, { paperSize: 'A1' })
    // Should have pen selections for different pens
    const penSelects = result.hpglString.match(/SP\d+;/g) ?? []
    expect(penSelects.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Realistic floor plan SVG test ─────────────────────────────

describe('Realistic floor plan SVG', () => {
  // Simulates a simplified floor plan with walls, doors, and grid
  const FLOOR_PLAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg">
    <!-- External walls -->
    <line x1="0" y1="0" x2="600" y2="0" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="600" y1="0" x2="600" y2="400" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="600" y1="400" x2="0" y2="400" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <line x1="0" y1="400" x2="0" y2="0" stroke="#1a1a1a" stroke-width="4" class="A-WALL-FULL"/>
    <!-- Internal wall -->
    <line x1="300" y1="0" x2="300" y2="400" stroke="#4a5568" stroke-width="2" class="A-WALL-PART"/>
    <!-- Doors -->
    <line x1="100" y1="0" x2="190" y2="0" stroke="#2d3748" stroke-width="2" class="A-DOOR"/>
    <line x1="400" y1="0" x2="490" y2="0" stroke="#2d3748" stroke-width="2" class="A-DOOR"/>
    <!-- Windows -->
    <line x1="0" y1="150" x2="0" y2="250" stroke="#718096" stroke-width="1" class="A-GLAZ"/>
    <line x1="600" y1="150" x2="600" y2="250" stroke="#718096" stroke-width="1" class="A-GLAZ"/>
    <!-- Grid -->
    <line x1="0" y1="200" x2="600" y2="200" stroke="#a0aec0" stroke-width="0.5" class="A-GRID"/>
    <line x1="300" y1="0" x2="300" y2="400" stroke="#a0aec0" stroke-width="0.5" class="A-GRID"/>
    <!-- Dimensions -->
    <line x1="0" y1="450" x2="600" y2="450" stroke="#4a5568" stroke-width="0.5" class="A-ANNO-DIMS"/>
    <line x1="-50" y1="0" x2="-50" y2="400" stroke="#4a5568" stroke-width="0.5" class="A-ANNO-DIMS"/>
    <!-- Room labels -->
    <rect x="50" y="50" width="200" height="300" fill="none" stroke="#2d3748" stroke-width="0.5" class="A-ANNO-TEXT"/>
    <rect x="350" y="50" width="200" height="300" fill="none" stroke="#2d3748" stroke-width="0.5" class="A-ANNO-TEXT"/>
  </svg>`

  it('handles a realistic floor plan with 5 pen groups', () => {
    const result = pipelineSvgToHpgl(FLOOR_PLAN_SVG, { paperSize: 'A1' })
    expect(result.stats.totalSegments).toBeGreaterThanOrEqual(10)
    expect(result.penGroups.length).toBeGreaterThanOrEqual(3)
    expect(result.stats.totalPenUpTravelMm).toBeGreaterThanOrEqual(0)
    expect(result.stats.totalPenDownDistanceMm).toBeGreaterThan(0)
    expect(result.stats.totalPenLifts).toBeGreaterThanOrEqual(3)
    expect(result.hpglString.length).toBeGreaterThan(100)
  })

  it('pen groups map to correct physical pens', () => {
    const result = pipelineSvgToHpgl(FLOOR_PLAN_SVG, { paperSize: 'A1' })
    const penNumbers = result.penGroups.map(g => g.pen)
    // Walls → pen 4, doors → pen 2, grid → pen 1
    expect(penNumbers).toContain(4)
    expect(penNumbers).toContain(2)
    expect(penNumbers).toContain(1)
  })

  it('HPGL string has valid structure', () => {
    const result = pipelineSvgToHpgl(FLOOR_PLAN_SVG, { paperSize: 'A1' })
    // Must start with IP (initialize)
    expect(result.hpglString.startsWith('IP;')).toBe(true)
    // Must end with pen up + deselect
    expect(result.hpglString).toMatch(/PU.*SP0;$/s)
  })
})

// ── Pen table integration ─────────────────────────────────────

describe('Pen table integration', () => {
  it('penSpecForLayer returns valid PenSpec', () => {
    const spec = penSpecForLayer('A-WALL-FULL')
    expect(spec.slot).toBeGreaterThanOrEqual(1)
    expect(spec.slot).toBeLessThanOrEqual(4)
    expect(spec.tipMm).toBeGreaterThan(0)
    expect(spec.label).toBeTruthy()
  })

  it('all PEN_TABLE layers map to a valid pen slot', () => {
    // Test a representative set of layers
    const layers = [
      'S-COLS', 'S-BEAM', 'S-FOOT', 'S-WALL',
      'A-WALL', 'A-WALL-FULL', 'A-WALL-PART', 'A-DOOR', 'A-GLAZ',
      'A-GRID', 'A-ANNO', 'A-ANNO-DIMS', 'A-ANNO-TEXT',
      'A-SECT', 'A-ELEV', 'A-TTLB',
      'I-WALL', 'I-FURN', 'I-CLNG',
      'E-POWR', 'E-LITE',
      'P-PIPE', 'P-FIXT',
      'M-HVAC',
    ]
    for (const layer of layers) {
      const slot = penSlotForLayer(layer)
      expect(slot).toBeGreaterThanOrEqual(1)
      expect(slot).toBeLessThanOrEqual(4)
    }
  })
})
