// ── SVG Parser ────────────────────────────────────────────────
// Parses SVG strings into PlotterPath objects ready for TSP optimization.
// Handles <line>, <rect>, <polyline>, <path>, <circle> elements.

import type {
  PlotterPoint,
  PlotterSegment,
  PlotterPath,
  SvgElement,
  SvgLineElement,
  SvgRectElement,
  SvgCircleElement,
} from './types'

// ── SVG d-attribute path parser ───────────────────────────────

/** Parse an SVG path `d` attribute into polyline point arrays. */
export function parseSvgPathD(d: string): PlotterPoint[][] {
  const polylines: PlotterPoint[][] = []
  let current: PlotterPoint[] = []
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0

  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)
  if (!tokens) return polylines

  // SVG paths always start with a command letter; if the first token is not
  // one, the input is not a valid path string (e.g. random text that happens
  // to contain letters like 'h' or 'v' that are also SVG commands).
  if (!/^[MmLlHhVvCcQqZz]$/.test(tokens[0])) return polylines

  let i = 0
  const next = (): string => tokens[i++] ?? ''
  const peek = (): string | undefined => tokens[i]

  const ensurePoint = (): void => {
    if (current.length === 0) current.push({ x: cx, y: cy })
  }

  while (i < tokens.length) {
    const cmd = next()

    switch (cmd) {
      case 'M': { // Absolute moveto
        if (current.length > 1) polylines.push(current)
        cx = parseFloat(next()); cy = parseFloat(next())
        current = [{ x: cx, y: cy }]
        sx = cx; sy = cy
        // Implicit lineto for additional coordinate pairs
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          const nx = parseFloat(next()); const ny = parseFloat(next())
          cx = nx; cy = ny
          current.push({ x: cx, y: cy })
        }
        break
      }
      case 'm': { // Relative moveto
        if (current.length > 1) polylines.push(current)
        cx += parseFloat(next()); cy += parseFloat(next())
        current = [{ x: cx, y: cy }]
        sx = cx; sy = cy
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          cx += parseFloat(next()); cy += parseFloat(next())
          current.push({ x: cx, y: cy })
        }
        break
      }
      case 'L': { // Absolute lineto
        ensurePoint()
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          cx = parseFloat(next()); cy = parseFloat(next())
          current.push({ x: cx, y: cy })
        }
        break
      }
      case 'l': { // Relative lineto
        ensurePoint()
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          cx += parseFloat(next()); cy += parseFloat(next())
          current.push({ x: cx, y: cy })
        }
        break
      }
      case 'H': { // Absolute horizontal lineto
        ensurePoint()
        cx = parseFloat(next())
        current.push({ x: cx, y: cy })
        break
      }
      case 'h': { // Relative horizontal lineto
        ensurePoint()
        cx += parseFloat(next())
        current.push({ x: cx, y: cy })
        break
      }
      case 'V': { // Absolute vertical lineto
        ensurePoint()
        cy = parseFloat(next())
        current.push({ x: cx, y: cy })
        break
      }
      case 'v': { // Relative vertical lineto
        ensurePoint()
        cy += parseFloat(next())
        current.push({ x: cx, y: cy })
        break
      }
      case 'C': { // Absolute cubic bezier → approximate with line segments
        ensurePoint()
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          const x1 = parseFloat(next()); const y1 = parseFloat(next())
          const x2 = parseFloat(next()); const y2 = parseFloat(next())
          const ex = parseFloat(next()); const ey = parseFloat(next())
          const pts = cubicToPolyline(cx, cy, x1, y1, x2, y2, ex, ey)
          for (const pt of pts) current.push(pt)
          cx = ex; cy = ey
        }
        break
      }
      case 'c': { // Relative cubic bezier
        ensurePoint()
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          const x1 = cx + parseFloat(next()); const y1 = cy + parseFloat(next())
          const x2 = cx + parseFloat(next()); const y2 = cy + parseFloat(next())
          const ex = cx + parseFloat(next()); const ey = cy + parseFloat(next())
          const pts = cubicToPolyline(cx, cy, x1, y1, x2, y2, ex, ey)
          for (const pt of pts) current.push(pt)
          cx = ex; cy = ey
        }
        break
      }
      case 'Q': { // Absolute quadratic bezier → approximate with line segments
        ensurePoint()
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          const x1 = parseFloat(next()); const y1 = parseFloat(next())
          const ex = parseFloat(next()); const ey = parseFloat(next())
          const pts = quadraticToPolyline(cx, cy, x1, y1, ex, ey)
          for (const pt of pts) current.push(pt)
          cx = ex; cy = ey
        }
        break
      }
      case 'q': { // Relative quadratic bezier
        ensurePoint()
        while (peek() && !/^[a-zA-Z]$/.test(peek()!)) {
          const x1 = cx + parseFloat(next()); const y1 = cy + parseFloat(next())
          const ex = cx + parseFloat(next()); const ey = cy + parseFloat(next())
          const pts = quadraticToPolyline(cx, cy, x1, y1, ex, ey)
          for (const pt of pts) current.push(pt)
          cx = ex; cy = ey
        }
        break
      }
      case 'Z':
      case 'z': { // Closepath
        if (current.length > 0 && (current[0].x !== cx || current[0].y !== cy)) {
          current.push({ x: sx, y: sy })
        }
        cx = sx; cy = sy
        break
      }
      // Skip unsupported commands (A for arcs, etc.)
      default:
        break
    }
  }

  if (current.length > 1) polylines.push(current)
  return polylines
}

// ── Bezier approximation ──────────────────────────────────────

const BEZIER_SEGMENTS = 8

function cubicToPolyline(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
): PlotterPoint[] {
  const pts: PlotterPoint[] = []
  for (let t = 1; t <= BEZIER_SEGMENTS; t++) {
    const u = t / BEZIER_SEGMENTS
    const u2 = u * u
    const u3 = u2 * u
    const v = 1 - u
    const v2 = v * v
    const v3 = v2 * v
    pts.push({
      x: v3 * x0 + 3 * v2 * u * x1 + 3 * v * u2 * x2 + u3 * x3,
      y: v3 * y0 + 3 * v2 * u * y1 + 3 * v * u2 * y2 + u3 * y3,
    })
  }
  return pts
}

function quadraticToPolyline(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
): PlotterPoint[] {
  const pts: PlotterPoint[] = []
  for (let t = 1; t <= BEZIER_SEGMENTS; t++) {
    const u = t / BEZIER_SEGMENTS
    const v = 1 - u
    pts.push({
      x: v * v * x0 + 2 * v * u * x1 + u * u * x2,
      y: v * v * y0 + 2 * v * u * y1 + u * u * y2,
    })
  }
  return pts
}

// ── SVG element extraction ────────────────────────────────────

function extractNum(attr: string, fallback = 0): number {
  const n = parseFloat(attr)
  return Number.isFinite(n) ? n : fallback
}

/** Extract a numeric attribute from an SVG tag string. */
function attr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}="([^"]*)"`)
  const m = tag.match(re)
  return m?.[1]
}

/** Extract class/layer from an SVG element tag. */
function extractLayer(tag: string): string | undefined {
  const cls = attr(tag, 'class') ?? attr(tag, 'data-layer') ?? attr(tag, 'id')
  if (cls) return cls.split(/\s+/)[0]
  return undefined
}

/** Parse a <line> element. */
function parseLine(tag: string): SvgLineElement {
  return {
    type: 'line',
    x1: extractNum(attr(tag, 'x1') ?? '0'),
    y1: extractNum(attr(tag, 'y1') ?? '0'),
    x2: extractNum(attr(tag, 'x2') ?? '0'),
    y2: extractNum(attr(tag, 'y2') ?? '0'),
    stroke: attr(tag, 'stroke'),
    strokeWidth: extractNum(attr(tag, 'stroke-width') ?? '0') || undefined,
    layer: extractLayer(tag),
  }
}

/** Parse a <rect> element. */
function parseRect(tag: string): SvgRectElement {
  return {
    type: 'rect',
    x: extractNum(attr(tag, 'x') ?? '0'),
    y: extractNum(attr(tag, 'y') ?? '0'),
    width: extractNum(attr(tag, 'width') ?? '0'),
    height: extractNum(attr(tag, 'height') ?? '0'),
    stroke: attr(tag, 'stroke'),
    strokeWidth: extractNum(attr(tag, 'stroke-width') ?? '0') || undefined,
    layer: extractLayer(tag),
  }
}

/** Parse a <polyline> element's points attribute. */
function parsePolylinePoints(tag: string): PlotterPoint[] {
  const ptsStr = attr(tag, 'points') ?? ''
  const nums = ptsStr.match(/[-+]?(?:\d+\.?\d*|\.\d+)/g)
  if (!nums || nums.length < 4) return []
  const pts: PlotterPoint[] = []
  for (let i = 0; i < nums.length - 1; i += 2) {
    pts.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) })
  }
  return pts
}

/** Parse a <circle> element into an approximate polygon. */
function parseCircle(tag: string): SvgCircleElement {
  return {
    type: 'circle',
    cx: extractNum(attr(tag, 'cx') ?? '0'),
    cy: extractNum(attr(tag, 'cy') ?? '0'),
    r: extractNum(attr(tag, 'r') ?? '0'),
    stroke: attr(tag, 'stroke'),
    strokeWidth: extractNum(attr(tag, 'stroke-width') ?? '0') || undefined,
    layer: extractLayer(tag),
  }
}

/** Circle → polygon approximation (16 segments). */
function circleToPoints(cx: number, cy: number, r: number): PlotterPoint[] {
  const pts: PlotterPoint[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const angle = (2 * Math.PI * i) / n
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
  }
  return pts
}

/** Extract all drawable SVG elements from an SVG string. */
export function extractSvgElements(svg: string): SvgElement[] {
  const elements: SvgElement[] = []

  // Extract <line> elements
  const lineRe = /<line\b[^>]*\/?>/gi
  for (const m of svg.matchAll(lineRe)) {
    elements.push(parseLine(m[0]))
  }

  // Extract <rect> elements (skip filled rects with no stroke — they're backgrounds)
  const rectRe = /<rect\b[^>]*\/?>/gi
  for (const m of svg.matchAll(rectRe)) {
    const tag = m[0]
    const stroke = attr(tag, 'stroke')
    const fill = attr(tag, 'fill')
    // Skip background fills with no stroke (plotter can't draw fill)
    if (fill && fill !== 'none' && !stroke) continue
    elements.push(parseRect(tag))
  }

  // Extract <polyline> elements
  const polyRe = /<polyline\b[^>]*\/?>/gi
  for (const m of svg.matchAll(polyRe)) {
    const tag = m[0]
    const points = parsePolylinePoints(tag)
    if (points.length >= 2) {
      elements.push({
        type: 'polyline',
        points,
        stroke: attr(tag, 'stroke'),
        strokeWidth: extractNum(attr(tag, 'stroke-width') ?? '0') || undefined,
        layer: extractLayer(tag),
      })
    }
  }

  // Extract <path> elements
  const pathRe = /<path\b[^>]*\/?>/gi
  for (const m of svg.matchAll(pathRe)) {
    const tag = m[0]
    const d = attr(tag, 'd')
    if (d) {
      elements.push({
        type: 'path',
        d,
        stroke: attr(tag, 'stroke'),
        strokeWidth: extractNum(attr(tag, 'stroke-width') ?? '0') || undefined,
        layer: extractLayer(tag),
      })
    }
  }

  // Extract <circle> elements
  const circleRe = /<circle\b[^>]*\/?>/gi
  for (const m of svg.matchAll(circleRe)) {
    elements.push(parseCircle(m[0]))
  }

  return elements
}

// ── Element → PlotterPath conversion ──────────────────────────

/** Convert a single SVG element to a PlotterSegment. */
function elementToSegment(el: SvgElement): PlotterSegment | null {
  switch (el.type) {
    case 'line':
      return {
        points: [
          { x: el.x1, y: el.y1 },
          { x: el.x2, y: el.y2 },
        ],
        layer: el.layer ?? 'default',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
      }
    case 'rect': {
      if (el.width <= 0 || el.height <= 0) return null
      return {
        points: [
          { x: el.x, y: el.y },
          { x: el.x + el.width, y: el.y },
          { x: el.x + el.width, y: el.y + el.height },
          { x: el.x, y: el.y + el.height },
          { x: el.x, y: el.y },
        ],
        layer: el.layer ?? 'default',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
      }
    }
    case 'polyline':
      return {
        points: [...el.points],
        layer: el.layer ?? 'default',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
      }
    case 'path': {
      const polylines = parseSvgPathD(el.d)
      // Return first polyline; complex paths may produce multiple
      if (polylines.length === 0) return null
      if (polylines.length === 1) {
        return {
          points: polylines[0],
          layer: el.layer ?? 'default',
          stroke: el.stroke,
          strokeWidth: el.strokeWidth,
        }
      }
      // Multi-polyline path: return the longest one
      let longest = polylines[0]
      for (const pl of polylines) {
        if (pl.length > longest.length) longest = pl
      }
      return {
        points: longest,
        layer: el.layer ?? 'default',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
      }
    }
    case 'circle':
      if (el.r <= 0) return null
      return {
        points: circleToPoints(el.cx, el.cy, el.r),
        layer: el.layer ?? 'default',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
      }
    default:
      return null
  }
}

/** Compute total length of a polyline in SVG units. */
function polylineLength(pts: PlotterPoint[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  return len
}

/** Parse an SVG string into PlotterPath objects. */
export function svgToPlotterPaths(svg: string): PlotterPath[] {
  const elements = extractSvgElements(svg)
  const paths: PlotterPath[] = []

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    const seg = elementToSegment(el)
    if (seg && seg.points.length >= 2) {
      paths.push({
        index: i,
        layer: seg.layer,
        segments: [seg],
        length: polylineLength(seg.points),
      })
    }
  }

  return paths
}

/** Group PlotterPaths by their layer key. */
export function groupByLayer(paths: PlotterPath[]): Map<string, PlotterPath[]> {
  const groups = new Map<string, PlotterPath[]>()
  for (const p of paths) {
    const existing = groups.get(p.layer)
    if (existing) {
      existing.push(p)
    } else {
      groups.set(p.layer, [p])
    }
  }
  return groups
}
