// ── Plotter SVG Drawing Generator ────────────────────────────
// Generates a full set of city-council-grade architectural
// drawing SVGs from a PlanModel — all strokes, no fills,
// proper AIA layer classes, pen-weight-appropriate stroke widths.
//
// Each drawing is a standalone <svg> string that can be fed
// into the lib/plotter pipeline (svgToHpgl) or rendered in
// the plotter simulator.

import type { PlanModel, RoomRect, WallSegment, Opening, Point } from '@/domain/plan'
import type { PlotterSegment } from './types'

// ── Constants ──────────────────────────────────────────────

/** Scale: 1 model-unit (m) → 1000 SVG-units (mm). */
const S = 1000

/** AIA layer classes mapped to stroke widths (px) per architectural standard. */
const PEN_WEIGHTS: Record<string, number> = {
  'A-WALL-FULL': 4,   // 0.50mm heavy — external walls
  'A-WALL-PART': 2,   // 0.25mm thin — internal walls
  'A-DOOR': 2,        // 0.25mm thin — door swings
  'A-GLAZ': 2,        // 0.25mm thin — windows
  'A-GRID': 1,        // 0.18mm fine — structural grid
  'A-ANNO': 1,        // 0.18mm fine — text annotations
  'A-ANNO-DIMS': 3,   // 0.35mm medium — dimension lines
  'A-ANNO-TEXT': 1,   // 0.18mm fine — room labels
  'A-ANNO-LEAD': 1,   // 0.18mm fine — leader lines
  'A-ELEV': 3,        // 0.35mm medium — elevation outlines
  'A-SECT': 4,        // 0.50mm heavy — section cut lines
  'A-ROOF': 3,        // 0.35mm medium — roof outlines
  'A-FLOR': 2,        // 0.25mm thin — floor slabs
  'S-COLS': 4,        // 0.50mm heavy — structural columns
  'S-BEAM': 3,        // 0.35mm medium — beams
  'S-FOOT': 3,        // 0.35mm medium — footings
  'E-POWR': 2,        // 0.25mm thin — power outlets
  'E-LITE': 1,        // 0.18mm fine — light fixtures
  'P-PIPE': 2,        // 0.25mm thin — pipes
  'P-FIXT': 2,        // 0.25mm thin — fixtures
  'M-HVAC': 2,        // 0.25mm thin — HVAC
  'M-HVAC-DUCT': 3,   // 0.35mm medium — ducts
  'I-CLNG': 2,        // 0.25mm thin — ceiling
}

// ── Drawing types ──────────────────────────────────────────

export type DrawingType =
  | 'site-plan'
  | 'floor-plan'
  | 'front-elevation'
  | 'side-elevation'
  | 'rear-elevation'
  | 'left-elevation'
  | 'section'
  | 'structural-plan'
  | 'electrical-plan'
  | 'plumbing-plan'
  | 'fire-egress'
  | 'reflected-ceiling'
  | 'door-window-schedule'

export interface SvgDrawing {
  type: DrawingType
  svg: string
  title: string
  scale: string
  /** Bounding box in SVG units (mm). */
  viewBox: { x: number; y: number; w: number; h: number }
}

// ── Helpers ────────────────────────────────────────────────

function weight(layer: string): number {
  return PEN_WEIGHTS[layer] ?? 1
}

function line(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-width="${weight(layer)}" class="${layer}"/>`
}

function polyline(layer: string, pts: Point[]): string {
  if (pts.length < 2) return ''
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * S} ${p.y * S}`).join(' ')
  return `<path d="${d}" fill="none" stroke="#1a1a1a" stroke-width="${weight(layer)}" class="${layer}"/>`
}

function rect(layer: string, x: number, y: number, w: number, h: number): string {
  const rx = x * S, ry = y * S, rw = w * S, rh = h * S
  return `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#1a1a1a" stroke-width="${weight(layer)}" class="${layer}"/>`
}

function text(layer: string, x: number, y: number, content: string, fontSize: number = 120): string {
  return `<text x="${x}" y="${y}" fill="#1a1a1a" font-size="${fontSize}" font-family="monospace" class="${layer}">${content}</text>`
}

function circle(layer: string, cx: number, cy: number, r: number): string {
  const points: Point[] = []
  const n = 24
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return polyline(layer, points)
}

/** Grid bubble (40mm circle with label text). */
function gridBubble(label: string, cx: number, cy: number): string {
  const r = 20 // 20mm radius
  return circle('A-GRID', cx, cy, r) + text('A-GRID', cx - 40, cy + 50, label, 140)
}

/** Scale bar: N mm long, H mm tall, at origin. */
function scaleBar(totalMm: number, heightMm: number): string {
  const segs = 4
  const segW = totalMm / segs
  const els: string[] = []
  for (let i = 0; i < segs; i++) {
    const x = i * segW
    const fill = i % 2 === 0 ? '#1a1a1a' : 'none'
    els.push(`<rect x="${x}" y="${-heightMm}" width="${segW}" height="${heightMm}" fill="${fill}" stroke="#1a1a1a" stroke-width="1" class="A-ANNO"/>`)
    els.push(text('A-ANNO', x + 20, 200, `${(i * segW / S).toFixed(0)}m`, 80))
  }
  return els.join('')
}

/** North arrow at position. */
function northArrow(cx: number, cy: number): string {
  const h = 400
  return [
    `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - h}" stroke="#1a1a1a" stroke-width="2" class="A-ANNO"/>`,
    `<polygon points="${cx},${cy - h - 80} ${cx - 40},${cy - h + 60} ${cx + 40},${cy - h + 60}" fill="#1a1a1a" class="A-ANNO"/>`,
    text('A-ANNO', cx - 60, cy - h - 120, 'N', 200),
  ].join('')
}

function wrapSvg(viewBox: { x: number; y: number; w: number; h: number }, body: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}" width="${viewBox.w}" height="${viewBox.h}">`,
    body,
    '</svg>',
  ].join('\n')
}

function roomCenter(r: RoomRect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

function resolveOpeningPosition(op: Opening, walls: WallSegment[]): Point | null {
  const wall = walls.find(w => w.id === op.wallId)
  if (!wall) return null
  const dx = wall.end.x - wall.start.x
  const dy = wall.end.y - wall.start.y
  return { x: wall.start.x + dx * op.offset, y: wall.start.y + dy * op.offset }
}

/** Door swing arc (quarter-circle from opening center). */
function doorSwing(op: Opening, walls: WallSegment[]): string {
  const pos = resolveOpeningPosition(op, walls)
  if (!pos) return ''
  const w = op.width ?? 0.9
  const r = w * S
  const pts: Point[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI / 2) * i / n
    pts.push({ x: pos.x * S + r * Math.cos(a), y: pos.y * S + r * Math.sin(a) })
  }
  return `<path d="M${pos.x * S} ${pos.y * S} " + ` +
    `Q${pts[Math.floor(n / 2)].x} ${pts[Math.floor(n / 2)].y} ${pts[n].x} ${pts[n].y}" ` +
    `fill="none" stroke="#1a1a1a" stroke-width="${weight('A-DOOR')}" class="A-DOOR" stroke-dasharray="8 4"/>`
}

/** Dimension line between two points. */
function dimensionLine(a: Point, b: Point, offsetMm: number, label: string): string {
  const ax = a.x * S, ay = a.y * S
  const bx = b.x * S, by = b.y * S
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy)
  if (len < 1) return ''
  const nx = -dy / len * offsetMm
  const ny = dx / len * offsetMm
  const a1x = ax + nx, a1y = ay + ny
  const b1x = bx + nx, b1y = by + ny
  // Extension lines
  const ext1 = line('A-ANNO-DIMS', ax, ay, a1x, a1y)
  const ext2 = line('A-ANNO-DIMS', bx, by, b1x, b1y)
  // Dimension line
  const dim = line('A-ANNO-DIMS', a1x, a1y, b1x, b1y)
  // Label
  const midX = (a1x + b1x) / 2
  const midY = (a1y + b1y) / 2
  const lbl = text('A-ANNO-DIMS', midX - 200, midY - 40, label, 100)
  return [ext1, ext2, dim, lbl].join('')
}

/** Perimeter dimension lines for a room (top, bottom, left, right). */
function roomDimensions(r: RoomRect): string {
  const offset = 400
  return [
    dimensionLine({ x: r.x, y: r.y }, { x: r.x + r.width, y: r.y }, offset, `${r.width.toFixed(2)}`),
    dimensionLine({ x: r.x, y: r.y }, { x: r.x, y: r.y + r.height }, -offset, `${r.height.toFixed(2)}`),
  ].join('')
}

// ── Drawing generators ─────────────────────────────────────

function generateSitePlan(plan: PlanModel): SvgDrawing {
  const pad = 3000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // Plot boundary (solid thick)
  parts.push(rect('A-WALL-FULL', 0, 0, plan.width, plan.height))

  // Building footprint (external walls only)
  for (const w of plan.walls) {
    if (w.type === 'external') {
      parts.push(line('A-WALL-FULL', w.start.x * S, w.start.y * S, w.end.x * S, w.end.y * S))
    }
  }

  // Room outlines inside the footprint
  for (const room of plan.rooms) {
    parts.push(rect('A-WALL-PART', room.x, room.y, room.width, room.height))
  }

  // Grid bubbles (extents)
  parts.push(gridBubble('1', 0, -2000))
  parts.push(gridBubble('2', plan.width * S, -2000))
  parts.push(gridBubble('A', -2000, 0))
  parts.push(gridBubble('B', -2000, plan.height * S))

  // Scale bar + north
  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'site-plan', svg: wrapSvg(vb, parts.join('\n')), title: 'Site Plan', scale: '1:500', viewBox: vb }
}

function generateFloorPlan(plan: PlanModel): SvgDrawing {
  const pad = 4000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // External walls
  for (const w of plan.walls) {
    const layer = w.type === 'external' ? 'A-WALL-FULL' : 'A-WALL-PART'
    parts.push(line(layer, w.start.x * S, w.start.y * S, w.end.x * S, w.end.y * S))
  }

  // Room boundaries + labels
  for (const room of plan.rooms) {
    parts.push(rect('A-WALL-PART', room.x, room.y, room.width, room.height))
    const c = roomCenter(room)
    parts.push(text('A-ANNO-TEXT', c.x * S - 200, c.y * S, room.name, 100))
    parts.push(text('A-ANNO-TEXT', c.x * S - 200, c.y * S + 160, `${(room.width * room.height).toFixed(1)}m\u00B2`, 80))
  }

  // Doors (swing arc)
  for (const op of plan.openings) {
    if (op.kind === 'door') {
      parts.push(doorSwing(op, plan.walls))
    }
  }

  // Windows
  for (const op of plan.openings) {
    if (op.kind === 'window') {
      const pos = resolveOpeningPosition(op, plan.walls)
      if (pos) {
        parts.push(rect('A-GLAZ', pos.x - op.width / 2, pos.y - 0.1, op.width, 0.2))
      }
    }
  }

  // Grid bubbles
  const cols = Math.ceil(plan.width / 6) + 1
  const rows = Math.ceil(plan.height / 6) + 1
  for (let c = 0; c < cols; c++) {
    parts.push(gridBubble(String(c + 1), c * 6 * S, -2000))
  }
  for (let r = 0; r < rows; r++) {
    const letter = String.fromCharCode(65 + r)
    parts.push(gridBubble(letter, -2000, r * 6 * S))
  }

  // Dimensions on 2–3 representative rooms
  const dimRooms = plan.rooms.slice(0, Math.min(3, plan.rooms.length))
  for (const room of dimRooms) {
    parts.push(roomDimensions(room))
  }

  // Scale bar + north
  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'floor-plan', svg: wrapSvg(vb, parts.join('\n')), title: 'Floor Plan', scale: '1:100', viewBox: vb }
}

function generateElevation(plan: PlanModel, face: 'front' | 'side' | 'rear' | 'left'): SvgDrawing {
  const pad = 2000
  const storeyH = 3000 // 3m storey
  const roofH = 1500  // 1.5m roof above
  const totalH = storeyH + roofH
  const buildingW = face === 'front' || face === 'rear' ? plan.width * S : plan.height * S
  const vb = { x: -pad, y: -pad, w: buildingW + 2 * pad, h: totalH + 2 * pad }
  const parts: string[] = []

  // Ground line
  parts.push(line('A-ELEV', -1000, 0, buildingW + 1000, 0))

  // Storey outlines
  parts.push(rect('A-ELEV', 0, 0, buildingW, storeyH))

  // Floor line
  parts.push(line('A-ELEV', 0, 0, buildingW, 0))

  // Roof outline (gable triangle)
  parts.push(line('A-ROOF', 0, storeyH, buildingW / 2, storeyH + roofH))
  parts.push(line('A-ROOF', buildingW / 2, storeyH + roofH, buildingW, storeyH))
  parts.push(line('A-ROOF', 0, storeyH, buildingW, storeyH))

  // Window openings on the facade
  const windowSpacing = 2000
  const windowW = 900
  const windowH = 1200
  const windowSill = 800
  let wx = 500
  while (wx + windowW < buildingW - 500) {
    parts.push(rect('A-GLAZ', wx / S, windowSill / S, windowW / S, windowH / S))
    wx += windowW + windowSpacing
  }

  // Door (on front elevation)
  if (face === 'front') {
    const doorW = 1200
    const doorH = 2100
    const doorX = buildingW / 2 - doorW / 2
    parts.push(rect('A-DOOR', doorX / S, 0, doorW / S, doorH / S))
  }

  // Storey height dimension
  parts.push(dimensionLine({ x: -1, y: 0 }, { x: -1, y: storeyH / S }, -1500, `${storeyH / S}m`))

  // Scale bar
  parts.push(scaleBar(3000, 200))
  parts.push(northArrow(vb.w / 2, vb.h - 400))

  return {
    type: face === 'front' ? 'front-elevation' : face === 'rear' ? 'rear-elevation' : face === 'left' ? 'left-elevation' : 'side-elevation',
    svg: wrapSvg(vb, parts.join('\n')),
    title: `${face.charAt(0).toUpperCase() + face.slice(1)} Elevation`,
    scale: '1:100',
    viewBox: vb,
  }
}

function generateSection(plan: PlanModel): SvgDrawing {
  const pad = 2000
  const storeyH = 3000
  const roofH = 1500
  const foundationD = 600
  const totalH = storeyH + roofH + foundationD
  const sectionW = Math.max(plan.width, plan.height) * S
  const vb = { x: -pad, y: -pad, w: sectionW + 2 * pad, h: totalH + 2 * pad }
  const parts: string[] = []

  // Ground line (thick section cut)
  parts.push(line('A-SECT', -1000, foundationD, sectionW + 1000, foundationD))

  // Foundation
  parts.push(line('A-SECT', 0, 0, sectionW, 0))
  parts.push(line('A-SECT', 0, 0, 0, foundationD))
  parts.push(line('A-SECT', sectionW, 0, sectionW, foundationD))

  // Floor slab
  parts.push(line('A-FLOR', 0, foundationD, sectionW, foundationD))
  parts.push(line('A-FLOR', 0, foundationD + 200, sectionW, foundationD + 200))

  // Walls (section cut — thick)
  parts.push(line('A-SECT', 0, foundationD, 0, storeyH + foundationD))
  parts.push(line('A-SECT', sectionW, foundationD, sectionW, storeyH + foundationD))

  // Roof
  parts.push(line('A-ROOF', 0, storeyH + foundationD, sectionW / 2, storeyH + foundationD + roofH))
  parts.push(line('A-ROOF', sectionW / 2, storeyH + foundationD + roofH, sectionW, storeyH + foundationD))

  // Height dimensions
  parts.push(dimensionLine({ x: -1, y: 0 }, { x: -1, y: foundationD / S }, -1500, `${(foundationD / S).toFixed(1)}m`))
  parts.push(dimensionLine({ x: -1, y: foundationD / S }, { x: -1, y: (foundationD + storeyH) / S }, -1500, `${(storeyH / S).toFixed(1)}m`))

  parts.push(scaleBar(4000, 200))
  parts.push(northArrow(vb.w / 2, vb.h - 400))

  return { type: 'section', svg: wrapSvg(vb, parts.join('\n')), title: 'Building Section', scale: '1:50', viewBox: vb }
}

function generateStructuralPlan(plan: PlanModel): SvgDrawing {
  const pad = 3000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // Structural grid lines (6m spacing)
  const gridX: number[] = []
  const gridY: number[] = []
  for (let x = 0; x <= plan.width; x += 6) {
    gridX.push(x * S)
    parts.push(line('A-GRID', x * S, -1000, x * S, plan.height * S + 1000))
  }
  for (let y = 0; y <= plan.height; y += 6) {
    gridY.push(y * S)
    parts.push(line('A-GRID', -1000, y * S, plan.width * S + 1000, y * S))
  }

  // Columns at grid intersections (400mm squares)
  const colSize = 400
  for (const gx of gridX) {
    for (const gy of gridY) {
      parts.push(`<rect x="${gx - colSize / 2}" y="${gy - colSize / 2}" width="${colSize}" height="${colSize}" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="2" class="S-COLS"/>`)
    }
  }

  // Grid bubbles
  for (let i = 0; i < gridX.length; i++) {
    parts.push(gridBubble(String(i + 1), gridX[i], -2000))
  }
  for (let i = 0; i < gridY.length; i++) {
    parts.push(gridBubble(String.fromCharCode(65 + i), -2000, gridY[i]))
  }

  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'structural-plan', svg: wrapSvg(vb, parts.join('\n')), title: 'Structural Grid Plan', scale: '1:200', viewBox: vb }
}

function generateElectricalPlan(plan: PlanModel): SvgDrawing {
  const pad = 3000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // Walls (faint reference)
  for (const w of plan.walls) {
    const sw = w.type === 'external' ? 3 : 1
    parts.push(`<line x1="${w.start.x * S}" y1="${w.start.y * S}" x2="${w.end.x * S}" y2="${w.end.y * S}" stroke="#999" stroke-width="${sw}" class="A-WALL-PART"/>`)
  }

  // Power outlets (one per wall segment, mid-point)
  for (const w of plan.walls) {
    const mx = (w.start.x + w.end.x) / 2 * S
    const my = (w.start.y + w.end.y) / 2 * S
    parts.push(circle('E-POWR', mx, my, 100))
    parts.push(line('E-POWR', mx - 60, my, mx + 60, my))
  }

  // Light fixtures (one per room center)
  for (const room of plan.rooms) {
    const c = roomCenter(room)
    parts.push(`<rect x="${c.x * S - 80}" y="${c.y * S - 80}" width="160" height="160" fill="none" stroke="#1a1a1a" stroke-width="${weight('E-LITE')}" class="E-LITE"/>`)
    parts.push(line('E-LITE', c.x * S - 80, c.y * S - 80, c.x * S + 80, c.y * S + 80))
    parts.push(line('E-LITE', c.x * S + 80, c.y * S - 80, c.x * S - 80, c.y * S + 80))
  }

  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'electrical-plan', svg: wrapSvg(vb, parts.join('\n')), title: 'Electrical Layout Plan', scale: '1:100', viewBox: vb }
}

function generatePlumbingPlan(plan: PlanModel): SvgDrawing {
  const pad = 3000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // Walls (faint reference)
  for (const w of plan.walls) {
    const sw = w.type === 'external' ? 3 : 1
    parts.push(`<line x1="${w.start.x * S}" y1="${w.start.y * S}" x2="${w.end.x * S}" y2="${w.end.y * S}" stroke="#999" stroke-width="${sw}" class="A-WALL-PART"/>`)
  }

  // Pipe runs along wet walls (service rooms)
  const wetRoomNames = ['Bathroom', 'Kitchen', 'Laundry', 'Toilet', 'WC', 'En-suite', 'Guest WC', 'Bathroom 1', 'Bathroom 2']
  for (const room of plan.rooms) {
    const isWet = wetRoomNames.some(n => room.name.toLowerCase().includes(n.toLowerCase()))
    if (!isWet) continue

    // Supply line (top of room)
    parts.push(line('P-PIPE', room.x * S, (room.y + room.height) * S, (room.x + room.width) * S, (room.y + room.height) * S))

    // Fixture symbols
    const c = roomCenter(room)
    parts.push(`<circle cx="${c.x * S}" cy="${c.y * S}" r="150" fill="none" stroke="#1a1a1a" stroke-width="${weight('P-FIXT')}" class="P-FIXT"/>`)
    parts.push(text('P-FIXT', c.x * S - 80, c.y * S + 50, 'WC', 80))
  }

  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'plumbing-plan', svg: wrapSvg(vb, parts.join('\n')), title: 'Plumbing Layout Plan', scale: '1:100', viewBox: vb }
}

function generateFireEgress(plan: PlanModel): SvgDrawing {
  const pad = 3000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // Walls
  for (const w of plan.walls) {
    const layer = w.type === 'external' ? 'A-WALL-FULL' : 'A-WALL-PART'
    parts.push(line(layer, w.start.x * S, w.start.y * S, w.end.x * S, w.end.y * S))
  }

  // Room labels
  for (const room of plan.rooms) {
    const c = roomCenter(room)
    parts.push(text('A-ANNO-TEXT', c.x * S - 200, c.y * S, room.name, 100))
  }

  // Egress points (arrows pointing outward)
  if (plan.egressPoints && plan.egressPoints.length > 0) {
    for (const ep of plan.egressPoints) {
      const cx = ep.x * S
      const cy = ep.y * S
      const color = ep.type === 'emergency-exit' ? '#ef4444' : '#1a1a1a'
      const dashArray = ep.type === 'emergency-exit' ? ' stroke-dasharray="12 6"' : ''
      // Arrow body
      parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 600}" stroke="${color}" stroke-width="3"${dashArray} class="A-ANNO"/>`)
      // Arrow head
      parts.push(`<polygon points="${cx},${cy - 700} ${cx - 60},${cy - 500} ${cx + 60},${cy - 500}" fill="${color}" class="A-ANNO"/>`)
      // Label
      parts.push(text('A-ANNO', cx - 200, cy + 200, ep.label, 120))
    }
  }

  // Door swings
  for (const op of plan.openings) {
    if (op.kind === 'door') {
      parts.push(doorSwing(op, plan.walls))
    }
  }

  // Travel distance annotation
  if (plan.maxTravelDistance) {
    parts.push(text('A-ANNO', 0, -1500, `Max travel distance: ${plan.maxTravelDistance}m ${plan.egressCompliant ? '(COMPLIANT)' : '(NON-COMPLIANT)'}`, 120))
  }

  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'fire-egress', svg: wrapSvg(vb, parts.join('\n')), title: 'Fire Egress Plan', scale: '1:100', viewBox: vb }
}

function generateReflectedCeiling(plan: PlanModel): SvgDrawing {
  const pad = 3000
  const vb = { x: -pad, y: -pad, w: plan.width * S + 2 * pad, h: plan.height * S + 2 * pad }
  const parts: string[] = []

  // Room boundaries (ceiling grid)
  for (const room of plan.rooms) {
    parts.push(rect('A-WALL-PART', room.x, room.y, room.width, room.height))
    // Ceiling grid (600mm module)
    for (let x = room.x; x <= room.x + room.width; x += 0.6) {
      parts.push(line('I-CLNG', x * S, room.y * S, x * S, (room.y + room.height) * S))
    }
    for (let y = room.y; y <= room.y + room.height; y += 0.6) {
      parts.push(line('I-CLNG', room.x * S, y * S, (room.x + room.width) * S, y * S))
    }
  }

  parts.push(scaleBar(5000, 300))
  parts.push(northArrow(vb.w / 2, vb.h - 500))

  return { type: 'reflected-ceiling', svg: wrapSvg(vb, parts.join('\n')), title: 'Reflected Ceiling Plan', scale: '1:100', viewBox: vb }
}

function generateDoorWindowSchedule(plan: PlanModel): SvgDrawing {
  const doorCount = plan.openings.filter(o => o.kind === 'door').length
  const windowCount = plan.openings.filter(o => o.kind === 'window').length
  const totalOpenings = doorCount + windowCount
  const rows = totalOpenings + 2
  const colW = 2000
  const rowH = 400
  const tableW = 6 * colW
  const tableH = rows * rowH
  const vb = { x: 0, y: 0, w: tableW + 2000, h: tableH + 4000 }
  const parts: string[] = []

  // Title
  parts.push(text('A-ANNO', 1000, 800, 'DOOR & WINDOW SCHEDULE', 200))

  // Table header
  const headers = ['No.', 'Type', 'Room', 'Width', 'Height', 'Area']
  for (let i = 0; i < headers.length; i++) {
    parts.push(text('A-ANNO', (i + 0.5) * colW, 1600, headers[i], 120))
    parts.push(line('A-ANNO', i * colW, 1400, i * colW, 1400 + tableH))
  }
  parts.push(line('A-ANNO', 0, 1400, tableW, 1400))
  parts.push(line('A-ANNO', 0, 1400 + tableH, tableW, 1400 + tableH))

  // Door rows
  let row = 0
  for (const op of plan.openings) {
    if (op.kind !== 'door') continue
    row++
    const y = 1400 + row * rowH
    const wall = plan.walls.find(w => w.id === op.wallId)
    const room = wall ? plan.rooms.find(r =>
      r.x * S <= (wall.start.x + wall.end.x) / 2 * S &&
      (r.x + r.width) * S >= (wall.start.x + wall.end.x) / 2 * S
    ) : null
    const w = op.width ?? 0.9
    const h = op.height ?? 2.1
    parts.push(text('A-ANNO', colW * 0.5, y + 250, `${row}`, 100))
    parts.push(text('A-ANNO', colW * 1.5, y + 250, 'Door', 100))
    parts.push(text('A-ANNO', colW * 2.5, y + 250, room?.name ?? '-', 100))
    parts.push(text('A-ANNO', colW * 3.5, y + 250, `${w.toFixed(2)}m`, 100))
    parts.push(text('A-ANNO', colW * 4.5, y + 250, `${h.toFixed(2)}m`, 100))
    parts.push(text('A-ANNO', colW * 5.5, y + 250, `${(w * h).toFixed(2)}m\u00B2`, 100))
    parts.push(line('A-ANNO', 0, y + rowH, tableW, y + rowH))
  }

  for (const op of plan.openings) {
    if (op.kind !== 'window') continue
    row++
    const y = 1400 + row * rowH
    const wall = plan.walls.find(w => w.id === op.wallId)
    const room = wall ? plan.rooms.find(r =>
      r.x * S <= (wall.start.x + wall.end.x) / 2 * S &&
      (r.x + r.width) * S >= (wall.start.x + wall.end.x) / 2 * S
    ) : null
    const w = op.width ?? 1.2
    const h = op.height ?? 1.5
    parts.push(text('A-ANNO', colW * 0.5, y + 250, `${row}`, 100))
    parts.push(text('A-ANNO', colW * 1.5, y + 250, 'Window', 100))
    parts.push(text('A-ANNO', colW * 2.5, y + 250, room?.name ?? '-', 100))
    parts.push(text('A-ANNO', colW * 3.5, y + 250, `${w.toFixed(2)}m`, 100))
    parts.push(text('A-ANNO', colW * 4.5, y + 250, `${h.toFixed(2)}m`, 100))
    parts.push(text('A-ANNO', colW * 5.5, y + 250, `${(w * h).toFixed(2)}m\u00B2`, 100))
    parts.push(line('A-ANNO', 0, y + rowH, tableW, y + rowH))
  }

  return { type: 'door-window-schedule', svg: wrapSvg(vb, parts.join('\n')), title: 'Door & Window Schedule', scale: 'N/A', viewBox: vb }
}

// ── Public API ─────────────────────────────────────────────

export interface GenerateDrawingsOptions {
  /** Which drawings to generate. Default: all. */
  types?: DrawingType[]
}

/** Default drawing set for a complete project submission. */
export const DEFAULT_DRAWING_SET: DrawingType[] = [
  'site-plan',
  'floor-plan',
  'front-elevation',
  'side-elevation',
  'rear-elevation',
  'left-elevation',
  'section',
  'structural-plan',
  'electrical-plan',
  'plumbing-plan',
  'fire-egress',
  'reflected-ceiling',
  'door-window-schedule',
]

const GENERATORS: Record<DrawingType, (plan: PlanModel) => SvgDrawing> = {
  'site-plan': generateSitePlan,
  'floor-plan': generateFloorPlan,
  'front-elevation': (p) => generateElevation(p, 'front'),
  'side-elevation': (p) => generateElevation(p, 'side'),
  'rear-elevation': (p) => generateElevation(p, 'rear'),
  'left-elevation': (p) => generateElevation(p, 'left'),
  'section': generateSection,
  'structural-plan': generateStructuralPlan,
  'electrical-plan': generateElectricalPlan,
  'plumbing-plan': generatePlumbingPlan,
  'fire-egress': generateFireEgress,
  'reflected-ceiling': generateReflectedCeiling,
  'door-window-schedule': generateDoorWindowSchedule,
}

/**
 * Generate a full set of architectural drawing SVGs from a PlanModel.
 * All strokes, no fills — ready for pen plotter output.
 */
export function generateDrawingSet(
  plan: PlanModel,
  opts: GenerateDrawingsOptions = {},
): SvgDrawing[] {
  const types = opts.types ?? DEFAULT_DRAWING_SET
  return types.map(type => GENERATORS[type](plan))
}

/**
 * Generate a single drawing by type.
 */
export function generateDrawing(
  plan: PlanModel,
  type: DrawingType,
): SvgDrawing {
  return GENERATORS[type](plan)
}

/**
 * Extract all PlotterSegments from a full drawing set for the plotter pipeline.
 * This bridges the SVG generator to the path optimizer.
 */
export function drawingSetToSegments(drawings: SvgDrawing[]): PlotterSegment[] {
  const segments: PlotterSegment[] = []
  for (const drawing of drawings) {
    // Parse SVG line elements from the generated SVG
    const lineRe = /<line[^>]*x1="([^"]*)"[^>]*y1="([^"]*)"[^>]*x2="([^"]*)"[^>]*y2="([^"]*)"[^>]*class="([^"]*)"[^>]*\/>/g
    for (const m of drawing.svg.matchAll(lineRe)) {
      segments.push({
        points: [
          { x: parseFloat(m[1]), y: parseFloat(m[2]) },
          { x: parseFloat(m[3]), y: parseFloat(m[4]) },
        ],
        layer: m[5],
      })
    }

    // Parse SVG path elements (polylines, door swings, etc.)
    const pathRe = /<path[^>]*d="([^"]*)"[^>]*class="([^"]*)"[^>]*\/>/g
    for (const m of drawing.svg.matchAll(pathRe)) {
      const d = m[1]
      const layer = m[2]
      // Extract M/L/Q coordinates from d attribute
      const coords = d.match(/[-+]?(?:\d+\.?\d*|\.\d+)/g)
      if (coords && coords.length >= 4) {
        const points: Point[] = []
        for (let i = 0; i < coords.length - 1; i += 2) {
          points.push({ x: parseFloat(coords[i]), y: parseFloat(coords[i + 1]) })
        }
        if (points.length >= 2) {
          segments.push({ points, layer })
        }
      }
    }
  }
  return segments
}
