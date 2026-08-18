// ── DXF Generator (AutoCAD R12 ASCII format) ─────────────────
// Converts PlotterPath[] → DXF string for AutoCAD / BricsCAD import.
// Uses R12 ASCII DXF for maximum compatibility (every CAD app reads it).

import type { PlotterPath, PlotterSegment } from './types'

// ── DXF constants ─────────────────────────────────────────────

const CONTINUOUS_LTYPE = 'CONTINUOUS'

/** Standard AutoCAD ACI (AutoCAD Color Index) palette — layer name → color number. */
const LAYER_COLORS: Record<string, number> = {
  'A-WALL-FULL': 7,   // white/black (heavy)
  'A-WALL-PART': 8,   // dark gray (medium)
  'A-DOOR': 3,        // green
  'A-GLAZ': 5,        // blue
  'A-ANNO-TEXT': 2,   // yellow
  'A-ANNO-DIMS': 6,   // magenta
  'A-GRID': 9,        // light gray
  'A-ELEV': 1,        // red
  'S-COLS': 1,        // red
  'S-BEAM': 4,        // cyan
}

/** Default color for unknown layers. */
const DEFAULT_COLOR = 7

// ── DXF section writers ───────────────────────────────────────

function dxfLine(code: number, value: string | number): string {
  const codeStr = String(code).padStart(3, ' ')
  return `${codeStr}\n${value}\n`
}

function layersSection(layerNames: string[]): string {
  let s = '  0\nSECTION\n  2\nLAYERS\n'
  for (const name of layerNames) {
    const color = LAYER_COLORS[name] ?? DEFAULT_COLOR
    s += '  0\nLAYER\n'
    s += dxfLine(2, name)
    s += dxfLine(70, 0) // frozen=0
    s += dxfLine(62, color)
    s += dxfLine(6, CONTINUOUS_LTYPE)
  }
  s += '  0\nENDSEC\n'
  return s
}

let entityHandle = 1

function polylineEntity(seg: PlotterSegment, layer: string): string {
  const pts = seg.points
  if (pts.length < 2) return ''

  let s = ''

  // POLYLINE entity header
  s += '  0\nPOLYLINE\n'
  s += dxfLine(8, layer)
  s += dxfLine(66, 1) // vertices follow
  s += dxfLine(70, seg.points.length >= 4 ? 1 : 0) // closed if 4+ pts (rooms)

  // VERTEX entities
  for (const pt of pts) {
    s += '  0\nVERTEX\n'
    s += dxfLine(8, layer)
    s += dxfLine(10, pt.x) // X
    s += dxfLine(20, pt.y) // Y
    s += dxfLine(30, 0)    // Z = 0 (2D)
  }

  // SEQEND
  s += '  0\nSEQEND\n'

  entityHandle++
  return s
}

function lineEntity(
  x1: number, y1: number, x2: number, y2: number, layer: string,
): string {
  let s = '  0\nLINE\n'
  s += dxfLine(8, layer)
  s += dxfLine(10, x1)
  s += dxfLine(20, y1)
  s += dxfLine(30, 0)
  s += dxfLine(11, x2)
  s += dxfLine(21, y2)
  s += dxfLine(31, 0)
  entityHandle++
  return s
}

function entitiesSection(paths: PlotterPath[]): string {
  let s = '  0\nSECTION\n  2\nENTITIES\n'

  for (const path of paths) {
    for (const seg of path.segments) {
      if (seg.points.length < 2) continue

      if (seg.points.length === 2) {
        // Two-point segment → LINE entity (simpler, more compatible)
        s += lineEntity(
          seg.points[0].x, seg.points[0].y,
          seg.points[1].x, seg.points[1].y,
          path.layer,
        )
      } else {
        // Multi-point → POLYLINE entity
        s += polylineEntity(seg, path.layer)
      }
    }
  }

  s += '  0\nENDSEC\n'
  return s
}

// ── Public API ────────────────────────────────────────────────

export interface DxfOptions {
  /** Include a text header identifying the source. Default: true. */
  includeHeader?: boolean
  /** Project name for the DXF header comment. */
  projectName?: string
}

/**
 * Convert PlotterPath[] to a DXF string (AutoCAD R12 ASCII format).
 *
 * The DXF uses POLYLINE entities for multi-point segments (rooms, openings)
 * and LINE entities for two-point segments (walls). Each layer maps to a
 * DXF layer with the standard AutoCAD Color Index.
 *
 * Output can be opened directly in AutoCAD, BricsCAD, LibreCAD, or any
 * DXF-compatible application.
 */
export function generateDxf(
  paths: PlotterPath[],
  opts: DxfOptions = {},
): string {
  const { includeHeader = true, projectName } = opts
  entityHandle = 1 // reset per call

  // Collect unique layer names
  const layerSet = new Set<string>()
  for (const p of paths) {
    layerSet.add(p.layer)
  }
  const layerNames = [...layerSet].sort()

  // Build DXF string
  let dxf = ''

  if (includeHeader) {
    dxf += '  0\nSECTION\n  2\nHEADER\n'
    dxf += '  9\n$ACADVER\n  1\nAC1009\n'
    dxf += '  9\n$INSUNITS\n  70\n4\n' // millimetres
    if (projectName) {
      dxf += '  0\nTEXT\n  8\nA-ANNO-TEXT\n'
      dxf += '  10\n0\n  20\n-100\n  30\n0\n'
      dxf += `  1\n${projectName} — Budget Engineer DXF Export\n`
      dxf += ' 40\n10\n'
    }
    dxf += '  0\nENDSEC\n'
  }

  dxf += layersSection(layerNames)
  dxf += entitiesSection(paths)

  // EOF
  dxf += '  0\nEOF\n'

  return dxf
}

/** Count POLYLINE + LINE entities in a DXF string. */
export function countDxfEntities(dxf: string): { polylines: number; lines: number } {
  const polylines = (dxf.match(/0\nPOLYLINE\n/g) ?? []).length
  const lines = (dxf.match(/0\nLINE\n/g) ?? []).length
  return { polylines, lines }
}

/** Get the list of layers defined in a DXF string. */
export function dxfLayerNames(dxf: string): string[] {
  const layers: string[] = []
  const re = /0\nLAYER\n\s*2\n(.+)\n/g
  let m: RegExpExecArray | null
  while ((m = re.exec(dxf)) !== null) {
    layers.push(m[1].trim())
  }
  return layers
}
