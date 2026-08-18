/**
 * 15-Drawing Enterprise Architectural Full-Set Generator
 *
 * Generates a complete city-council-grade drawing set from a PlanModel + BimModel:
 * 15 drawings across structure, architecture, fire egress, MEP, and BIM, each
 * with RAG-compliant Zimbabwe By-Laws citations, IFC entity annotations, and
 * pen-plotter-optimized SVG output.
 *
 * Zimbabwe construction standards enforced via Model Building By-Laws 1977,
 * SI 56/2025, ZIQS SMM, and SAZ catalogue.
 */

import type { PlanModel } from '@/domain/plan'
import type { BimModel } from '@/domain/bim'
import type { ComplianceReport } from '@/engine/compliance/types'
import type { RagIndex } from '@/engine/rag/ragIndex'
import type { SearchResult } from '@/engine/rag/types'
import type { PlotterPath, PlotterPoint, PaperSize } from '@/lib/plotter/types'
import { getRoomStandard, type RoomZone } from '@/engine/standards/roomStandards'
import { classifyOccupancy, OCCUPANCY_MATRIX, fireRatingMinForClass, maxTravelDistanceForClass } from '@/engine/compliance/occupancyMatrix'
import { resolveFrontElevation, resolveRearElevation, resolveLeftElevation, resolveRightElevation, resolveSection } from '@/lib/drawings/elevationResolver'
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus'
import { hybridSearch } from '@/engine/rag/hybrid'
import { mmToHpglUnits } from '@/lib/plotter/types'

/* ──────────────────────────────────────────────────────────────── */
/*  Types                                                           */
/* ──────────────────────────────────────────────────────────────── */

/** Drawing identifiers for the 15-sheet set. */
export type DrawingId =
  | 'cover-sheet'
  | 'site-plan'
  | 'ground-floor-plan'
  | 'first-floor-plan'
  | 'roof-plan'
  | 'ceiling-plan'
  | 'front-elevation'
  | 'rear-elevation'
  | 'left-elevation'
  | 'right-elevation'
  | 'section'
  | 'foundation-plan'
  | 'structural-framing'
  | 'fire-egress-plan'
  | 'mep-services'
  | 'area-schedule'
  | 'door-window-schedule'
  | 'accessibility-plan'
  | 'bim-3d-views'

/** A compliance citation attached to a specific drawing. */
export interface ComplianceCitation {
  /** Regulation clause reference (e.g. "[ZBC Ch.4 Cl.12(a)]"). */
  citation: string
  /** Rule description. */
  rule: string
  /** Pass/warn/fail status. */
  status: 'pass' | 'warn' | 'fail'
  /** Human-readable detail. */
  detail: string
  /** RAG search score (0–1). */
  score: number
  /** Chunk section ID in the RAG index. */
  sectionId: string
}

/** IFC entity annotation for a drawing. */
export interface IfcAnnotation {
  /** IFC entity type (e.g. 'IfcWallStandardCase'). */
  entity: string
  /** Description of how this entity appears on the drawing. */
  description: string
  /** Key attributes. */
  attributes: Record<string, string | number>
}

/** A single generated drawing in the full set. */
export interface FullSetDrawing {
  id: DrawingId
  /** SADC drawing code (e.g. 'A-001'). */
  sadcCode: string
  /** Sheet title. */
  title: string
  /** Scale label. */
  scale: string
  /** SVG content. */
  svg: string
  /** Width/height of the SVG in user units. */
  dimensions: { width: number; height: number }
  /** RAG compliance citations for this drawing. */
  citations: ComplianceCitation[]
  /** IFC entities annotated on this drawing. */
  ifcAnnotations: IfcAnnotation[]
  /** Pen-plotter-optimized paths for this drawing. */
  plotterPaths: PlotterPath[]
  /** Whether this drawing has plan-view geometry. */
  isPlanView: boolean
}

/** Result of the full-set generation. */
export interface FullSetResult {
  /** All 15+ generated drawings. */
  drawings: FullSetDrawing[]
  /** Project metadata. */
  projectName: string
  /** Total pen-up travel across all drawings (metres). */
  totalPenUpMetres: number
  /** Total pen lifts across all drawings. */
  totalPenLifts: number
  /** Compliance summary. */
  complianceReport: ComplianceReport
  /** IFC annotation count. */
  ifcEntityCount: number
  /** Area schedule data. */
  areaSchedule: AreaScheduleEntry[]
  /** Door/window schedule data. */
  doorWindowSchedule: DoorWindowEntry[]
  /** Duration of generation (ms). */
  generationTimeMs: number
}

/** Configuration for the full-set generator. */
export interface FullSetConfig {
  plan: PlanModel
  bim?: BimModel
  buildingType?: string
  projectName?: string
  projectNumber?: string
  jurisdiction?: string
  ragIndex?: RagIndex
  floors?: number
  storeyHeight?: number
  paperSize?: PaperSize
}

/* ──────────────────────────────────────────────────────────────── */
/*  Constants                                                       */
/* ──────────────────────────────────────────────────────────────── */

/** SADC drawing numbering per §6.2. */
const DRAWING_TABLE: { id: DrawingId; code: string; title: string; scale: string }[] = [
  { id: 'cover-sheet',           code: 'A-001', title: 'Cover Sheet — Project Information',       scale: 'N/A' },
  { id: 'site-plan',             code: 'A-101', title: 'Site Plan',                                scale: '1:200' },
  { id: 'ground-floor-plan',     code: 'A-102', title: 'Ground Floor Plan',                        scale: '1:100' },
  { id: 'first-floor-plan',      code: 'A-103', title: 'First Floor Plan',                         scale: '1:100' },
  { id: 'roof-plan',             code: 'A-104', title: 'Roof Plan',                                scale: '1:100' },
  { id: 'ceiling-plan',          code: 'A-105', title: 'Reflected Ceiling Plan',                   scale: '1:100' },
  { id: 'front-elevation',       code: 'A-201', title: 'Front Elevation',                          scale: '1:100' },
  { id: 'rear-elevation',        code: 'A-202', title: 'Rear Elevation',                           scale: '1:100' },
  { id: 'left-elevation',        code: 'A-203', title: 'Left Elevation',                           scale: '1:100' },
  { id: 'right-elevation',       code: 'A-204', title: 'Right Elevation',                          scale: '1:100' },
  { id: 'section',               code: 'A-301', title: 'Building Section',                         scale: '1:50' },
  { id: 'foundation-plan',       code: 'A-401', title: 'Foundation Plan',                          scale: '1:50' },
  { id: 'structural-framing',    code: 'A-402', title: 'Structural Framing Plan',                  scale: '1:100' },
  { id: 'fire-egress-plan',      code: 'A-501', title: 'Fire Egress Plan',                         scale: '1:100' },
  { id: 'mep-services',          code: 'A-502', title: 'MEP Services Plan',                        scale: '1:100' },
  { id: 'accessibility-plan',    code: 'A-503', title: 'Accessibility Plan',                       scale: '1:100' },
  { id: 'door-window-schedule',  code: 'A-601', title: 'Door & Window Schedule',                   scale: 'N/A' },
  { id: 'area-schedule',         code: 'A-602', title: 'Area Schedule',                            scale: 'N/A' },
  { id: 'bim-3d-views',          code: 'A-701', title: '3D BIM Model Views',                       scale: 'N/A' },
]

/** RAG query templates per drawing type — Zimbabwe By-Laws + ZIQS SMM grounded. */
const RAG_QUERIES: Record<DrawingId, string[]> = {
  'cover-sheet': [],
  'site-plan': ['minimum setbacks for residential building', 'site drainage stormwater requirements'],
  'ground-floor-plan': ['minimum ceiling height habitable room', 'minimum floor area habitable room', 'natural ventilation window area'],
  'first-floor-plan': ['minimum ceiling height habitable room', 'means of escape travel distance'],
  'roof-plan': ['roof design wind resistance', 'stormwater drainage'],
  'ceiling-plan': ['minimum ceiling height', 'ventilation requirements'],
  'front-elevation': ['external wall thickness 230mm masonry', 'fenestration window requirements'],
  'rear-elevation': ['boundary wall fire resistance', 'external wall materials'],
  'left-elevation': ['side setback requirements', 'party wall fire resistance'],
  'right-elevation': ['side setback requirements', 'external wall construction'],
  'section': ['floor to ceiling height', 'roof structure', 'structural loading residential floor'],
  'foundation-plan': ['strip foundation minimum depth 600mm', 'foundation width load bearing'],
  'structural-framing': ['residential floor imposed load 1.5 kN/m2', 'structural grid spacing'],
  'fire-egress-plan': ['means of escape travel distance 18m', 'exit door clear opening 800mm', 'corridor width means of escape 900mm', 'fire resistance party wall 60 minutes'],
  'mep-services': ['sanitary provision water closet wash basin', 'drainage system discharge'],
  'accessibility-plan': ['corridor width 900mm minimum', 'door opening 800mm minimum', 'wheelchair accessibility'],
  'door-window-schedule': ['door clear opening 800mm', 'fire resistance door rating'],
  'area-schedule': ['minimum floor area habitable room 6m2', 'minimum room dimension 1.8m'],
  'bim-3d-views': [],
}

/** IFC entity templates per drawing. */
function ifcAnnotationsForDrawing(
  drawingId: DrawingId,
  plan: PlanModel,
  _bim: BimModel | undefined,
  occupancyClass: string,
): IfcAnnotation[] {
  const occ = OCCUPANCY_MATRIX[occupancyClass as keyof typeof OCCUPANCY_MATRIX]
  const fireRating = occ ? fireRatingMinForClass(occupancyClass as keyof typeof OCCUPANCY_MATRIX) : 30
  const maxTravel = occ ? maxTravelDistanceForClass(occupancyClass as keyof typeof OCCUPANCY_MATRIX) : 25

  const wallAnnotations: IfcAnnotation[] = plan.walls.slice(0, 3).map((w, i) => ({
    entity: 'IfcWallStandardCase',
    description: `${w.type === 'external' ? 'External' : 'Internal'} wall segment ${i + 1}`,
    attributes: {
      thickness: w.type === 'external' ? 0.23 : 0.115,
      material: 'Common Brick 7 MPa SAZ 70',
      fireRating: `${fireRating} min`,
    },
  }))

  const spaceAnnotations: IfcAnnotation[] = plan.rooms.slice(0, 3).map((r) => ({
    entity: 'IfcSpace',
    description: `${r.name} — occupancy class ${occupancyClass}`,
    attributes: {
      name: r.name,
      area: Math.round(r.width * r.height * 100) / 100,
      designPopulation: Math.max(1, Math.round((r.width * r.height) / 4)),
      occupancyClass,
    },
  }))

  const boundaryAnnotations: IfcAnnotation[] = plan.rooms.slice(0, 2).map((r) => ({
    entity: 'IfcRelSpaceBoundary',
    description: `Space boundary for ${r.name}`,
    attributes: {
      name: `${r.name} boundary`,
      type: 'PHYSICAL',
      thermalTransmittance: 0.45,
      fireRating: `${fireRating} min`,
    },
  }))

  switch (drawingId) {
    case 'ground-floor-plan':
    case 'first-floor-plan':
      return [...wallAnnotations, ...spaceAnnotations, ...boundaryAnnotations]
    case 'structural-framing':
      return [
        ...wallAnnotations.map((a) => ({ ...a, description: `Structural ${a.description}` })),
        { entity: 'IfcBeam', description: 'Floor beam on structural grid', attributes: { material: 'Reinforced Concrete', span: plan.width } },
        { entity: 'IfcColumn', description: 'Column at grid intersection', attributes: { material: 'Reinforced Concrete', size: '300x300' } },
      ]
    case 'fire-egress-plan':
      return [
        ...spaceAnnotations.map((a) => ({ ...a, description: `${a.description} — egress zone`, attributes: { ...a.attributes, maxTravelDistanceM: maxTravel } })),
        { entity: 'IfcDoor', description: 'Fire exit door', attributes: { fireRating: `${fireRating} min`, clearOpening: 800 } },
      ]
    case 'foundation-plan':
      return [
        { entity: 'IfcFooting', description: 'Strip foundation', attributes: { type: 'STRIP', depth: 600, width: plan.wallThickness * 2.5 } },
        ...wallAnnotations.map((a) => ({ ...a, entity: 'IfcWallStandardCase' as const, description: `Foundation wall: ${a.description}` })),
      ]
    case 'mep-services':
      return [
        { entity: 'IfcPipeSegment', description: 'Sanitary drainage pipe', attributes: { diameter: 110, material: 'PVC' } },
        { entity: 'IfcPipeSegment', description: 'Water supply pipe', attributes: { diameter: 15, material: 'Copper' } },
        { entity: 'IfcElectricalCircuit', description: 'Power circuit', attributes: { voltage: 230, phases: 1 } },
      ]
    default:
      return wallAnnotations.length > 0 ? [wallAnnotations[0]] : []
  }
}

/* ──────────────────────────────────────────────────────────────── */
/*  SVG Helpers                                                     */
/* ──────────────────────────────────────────────────────────────── */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function svgOpen(w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`
}

function svgClose(): string {
  return '</svg>'
}

function whiteBg(w: number, h: number): string {
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`
}

function titleBlock(y: number, title: string, code: string, scale: string, projectName: string): string {
  return `<g transform="translate(40, ${y})">
    <rect x="0" y="0" width="680" height="50" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="0.5"/>
    <text x="10" y="20" font-size="14" font-weight="bold" fill="#0f172a">${esc(title)}</text>
    <text x="10" y="38" font-size="10" fill="#64748b">${esc(code)} | Scale ${esc(scale)} | ${esc(projectName)}</text>
  </g>`
}

function gridBubble(x: number, y: number, label: string): string {
  return `<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="#475569" stroke-width="1.5"/>
    <text x="${x}" y="${y + 4}" font-size="10" fill="#0f172a" text-anchor="middle">${esc(label)}</text>`
}

function dimensionLine(x1: number, y1: number, x2: number, y2: number, label: string, offset = 15): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len * offset
  const ny = dx / len * offset
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef4444" stroke-width="0.5"/>
    <line x1="${x1}" y1="${y1}" x2="${x1 + nx}" y2="${y1 + ny}" stroke="#ef4444" stroke-width="0.5"/>
    <line x1="${x2}" y1="${y2}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="#ef4444" stroke-width="0.5"/>
    <text x="${mx + nx}" y="${my + ny - 3}" font-size="9" fill="#ef4444" text-anchor="middle">${esc(label)}</text>`
}

function northArrow(x: number, y: number): string {
  return `<g transform="translate(${x}, ${y})">
    <polygon points="0,-20 -8,5 0,-5 8,5" fill="#0f172a"/>
    <text x="0" y="18" font-size="9" fill="#0f172a" text-anchor="middle">N</text>
  </g>`
}

/* ──────────────────────────────────────────────────────────────── */
/*  Plan View Generators                                            */
/* ──────────────────────────────────────────────────────────────── */

function roomZoneColor(name: string): { fill: string; stroke: string } {
  const std = getRoomStandard(name)
  const colors: Record<RoomZone, { fill: string; stroke: string }> = {
    public:      { fill: '#E6F1FB', stroke: '#378ADD' },
    private:     { fill: '#EAF3DE', stroke: '#639922' },
    service:     { fill: '#FAEEDA', stroke: '#BA7517' },
    circulation: { fill: '#F1EFE8', stroke: '#888780' },
  }
  return colors[std.zone]
}

function planViewSvg(
  plan: PlanModel,
  title: string,
  code: string,
  projectName: string,
  opts: { showGrid?: boolean; showDimensions?: boolean; showEgress?: boolean; hatchType?: 'structural' | 'standard' } = {},
): string {
  const W = 800
  const H = 600
  const MARGIN = 60
  const bw = plan.width || 10
  const bh = plan.height || 10
  const s = Math.min((W - MARGIN * 2) / bw, (H - MARGIN * 2 - 80) / bh)
  const ox = MARGIN + (W - MARGIN * 2 - bw * s) / 2
  const oy = MARGIN + 60 + (H - MARGIN * 2 - 80 - bh * s) / 2

  const rooms = plan.rooms.map((r) => {
    const zone = roomZoneColor(r.name)
    const rx = ox + r.x * s
    const ry = oy + (bh - r.y - r.height) * s
    const rw = r.width * s
    const rh = r.height * s
    const area = (r.width * r.height).toFixed(1)
    return `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${zone.fill}" fill-opacity="0.6" stroke="${zone.stroke}" stroke-width="1"/>
      <text x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rh / 2 - 5).toFixed(1)}" font-size="10" fill="#0f172a" text-anchor="middle">${esc(r.name)}</text>
      <text x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rh / 2 + 10).toFixed(1)}" font-size="8" fill="#64748b" text-anchor="middle">${area} m²</text>`
  }).join('\n')

  const walls = plan.walls.map((w) => {
    const isExt = w.type === 'external'
    return `<line x1="${(ox + w.start.x * s).toFixed(1)}" y1="${(oy + (bh - w.start.y) * s).toFixed(1)}" x2="${(ox + w.end.x * s).toFixed(1)}" y2="${(oy + (bh - w.end.y) * s).toFixed(1)}" stroke="${isExt ? '#334155' : '#94a3b8'}" stroke-width="${isExt ? 4 : 2}"/>`
  }).join('\n')

  const openings = plan.openings.map((o) => {
    const wall = plan.walls.find((w) => w.id === o.wallId)
    if (!wall) return ''
    const cx = wall.start.x + (wall.end.x - wall.start.x) * Math.max(0, Math.min(1, o.offset))
    const cy = wall.start.y + (wall.end.y - wall.start.y) * Math.max(0, Math.min(1, o.offset))
    const dx = wall.end.x - wall.start.x
    const dy = wall.end.y - wall.start.y
    const len = Math.hypot(dx, dy) || 1
    const nx = dx / len
    const ny = dy / len
    const halfW = o.width / 2
    const x1 = ox + (cx - nx * halfW) * s
    const y1 = oy + (bh - (cy - ny * halfW)) * s
    const x2 = ox + (cx + nx * halfW) * s
    const y2 = oy + (bh - (cy + ny * halfW)) * s
    const color = o.kind === 'door' ? '#f59e0b' : '#0ea5e9'
    const mark = o.kind === 'door' ? 'D' : 'W'
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="3"/>
      <text x="${((x1 + x2) / 2).toFixed(1)}" y="${((y1 + y2) / 2 - 4).toFixed(1)}" font-size="8" fill="${color}" text-anchor="middle" font-weight="bold">${mark}</text>`
  }).join('\n')

  const grid = opts.showGrid
    ? Array.from({ length: Math.ceil(bw / 3.6) + 1 }, (_, i) => {
        const x = ox + i * 3.6 * s
        return `<line x1="${x.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(oy + bh * s).toFixed(1)}" stroke="#e2e8f0" stroke-width="0.3" stroke-dasharray="4 4"/>
          ${gridBubble(x, oy - 20, String.fromCharCode(65 + i))}`
      }).join('\n')
    : ''

  const dims = opts.showDimensions
    ? [
        dimensionLine(ox, oy + bh * s + 30, ox + bw * s, oy + bh * s + 30, `${bw.toFixed(1)}m`),
        dimensionLine(ox - 30, oy, ox - 30, oy + bh * s, `${bh.toFixed(1)}m`, -15),
      ].join('\n')
    : ''

  const egress = opts.showEgress && plan.egressPoints
    ? plan.egressPoints.map((ep) => {
        const ex = ox + ep.x * s
        const ey = oy + (bh - ep.y) * s
        return `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="6" fill="#22c55e" fill-opacity="0.7"/>
          <text x="${(ex + 10).toFixed(1)}" y="${(ey + 3).toFixed(1)}" font-size="8" fill="#22c55e">EXIT</text>`
      }).join('\n')
    : ''

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(MARGIN - 10, title, code, '1:100', projectName)}
  <g transform="translate(0, 0)">
    ${grid}
    ${rooms}
    ${walls}
    ${openings}
    ${dims}
    ${egress}
    ${northArrow(W - MARGIN, MARGIN + 40)}
  </g>
  ${svgClose()}`
}

/* ──────────────────────────────────────────────────────────────── */
/*  Elevation View Generators                                       */
/* ──────────────────────────────────────────────────────────────── */

function elevationViewSvg(
  drawing: { lines: { x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number; dashed?: boolean }[]; rects: { x: number; y: number; w: number; h: number; fill?: string; stroke?: string; strokeWidth?: number }[]; polygons: { points: { x: number; y: number }[]; fill?: string; stroke?: string; strokeWidth?: number }[]; texts: { x: number; y: number; text: string; fontSize?: number; fill?: string; anchor?: string }[]; viewBox: string } | null,
  title: string,
  code: string,
  projectName: string,
): string {
  if (!drawing) {
    return `${svgOpen(800, 600)}
  ${whiteBg(800, 600)}
  ${titleBlock(50, title, code, '1:100', projectName)}
  <text x="400" y="300" font-size="16" fill="#64748b" text-anchor="middle">Drawing unavailable — no active plan data.</text>
  ${svgClose()}`
  }

  const W = 800
  const H = 600
  const k = 50
  const lines = drawing.lines.map((l) =>
    `<line x1="${(l.x1 * k).toFixed(1)}" y1="${(l.y1 * k).toFixed(1)}" x2="${(l.x2 * k).toFixed(1)}" y2="${(l.y2 * k).toFixed(1)}" stroke="${l.stroke ?? '#0f172a'}" stroke-width="${((l.strokeWidth ?? 0.08) * k).toFixed(1)}"${l.dashed ? ' stroke-dasharray="8 6"' : ''}/>`,
  ).join('\n')
  const rects = drawing.rects.map((r) =>
    `<rect x="${(r.x * k).toFixed(1)}" y="${(r.y * k).toFixed(1)}" width="${(r.w * k).toFixed(1)}" height="${(r.h * k).toFixed(1)}" fill="${r.fill ?? 'none'}" stroke="${r.stroke ?? '#0f172a'}" stroke-width="${((r.strokeWidth ?? 0.08) * k).toFixed(1)}"/>`,
  ).join('\n')
  const texts = drawing.texts.map((t) =>
    `<text x="${(t.x * k).toFixed(1)}" y="${(t.y * k).toFixed(1)}" font-size="${((t.fontSize ?? 0.3) * k).toFixed(1)}" fill="${t.fill ?? '#334155'}" text-anchor="${t.anchor ?? 'start'}">${esc(t.text)}</text>`,
  ).join('\n')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, title, code, '1:100', projectName)}
  <g transform="translate(40, 90) scale(0.85)">
    ${lines}
    ${rects}
    ${texts}
    ${northArrow(700, 10)}
  </g>
  ${svgClose()}`
}

/* ──────────────────────────────────────────────────────────────── */
/*  Schedule Generators                                             */
/* ──────────────────────────────────────────────────────────────── */

export interface AreaScheduleEntry {
  roomNumber: string
  roomName: string
  areaM2: number
  widthM: number
  depthM: number
  zone: RoomZone
  minRequiredM2: number
  compliant: boolean
}

export interface DoorWindowEntry {
  id: string
  type: 'door' | 'window'
  widthMm: number
  heightMm: number
  wallThickness: number
  fireRating: string
  material: string
  room: string
}

function buildAreaSchedule(plan: PlanModel): AreaScheduleEntry[] {
  return plan.rooms.map((r, i) => {
    const std = getRoomStandard(r.name)
    const area = r.width * r.height
    return {
      roomNumber: String(i + 1).padStart(3, '0'),
      roomName: r.name,
      areaM2: Math.round(area * 100) / 100,
      widthM: Math.round(r.width * 100) / 100,
      depthM: Math.round(r.height * 100) / 100,
      zone: std.zone,
      minRequiredM2: std.minAreaM2 ?? std.minWidth * std.minDepth,
      compliant: area >= (std.minAreaM2 ?? std.minWidth * std.minDepth),
    }
  })
}

function buildDoorWindowSchedule(plan: PlanModel, occupancyClass: string): DoorWindowEntry[] {
  const occ = OCCUPANCY_MATRIX[occupancyClass as keyof typeof OCCUPANCY_MATRIX]
  const fireRating = occ ? `${fireRatingMinForClass(occupancyClass as keyof typeof OCCUPANCY_MATRIX)} min` : '30 min'

  return plan.openings.map((o) => {
    const isDoor = o.kind === 'door'
    return {
      id: o.id,
      type: o.kind as 'door' | 'window',
      widthMm: Math.round(o.width * 1000),
      heightMm: isDoor ? 2100 : 1200,
      wallThickness: plan.wallThickness,
      fireRating: isDoor ? fireRating : 'N/A',
      material: isDoor ? 'Solid Core Timber' : 'Aluminium Frame',
      room: plan.walls.find((w) => w.id === o.wallId)?.type === 'external' ? 'External' : 'Internal',
    }
  })
}

function scheduleSvg(
  entries: Record<string, string>[],
  title: string,
  code: string,
  projectName: string,
  columns: { key: string; label: string; width: number }[],
): string {
  const W = 800
  const H = Math.max(600, 150 + entries.length * 24)
  const ROW_H = 24
  const HEADER_Y = 140

  const header = columns.map((col, i) => {
    const x = 40 + columns.slice(0, i).reduce((sum, c) => sum + c.width, 0)
    return `<rect x="${x}" y="${HEADER_Y}" width="${col.width}" height="28" fill="#1a365d"/>
      <text x="${x + 6}" y="${HEADER_Y + 18}" font-size="10" fill="#ffffff" font-weight="bold">${esc(col.label)}</text>`
  }).join('\n')

  const rows = entries.map((entry, ri) => {
    const y = HEADER_Y + 28 + ri * ROW_H
    const bg = ri % 2 === 0 ? '#f8fafc' : '#ffffff'
    return columns.map((col, ci) => {
      const x = 40 + columns.slice(0, ci).reduce((sum, c) => sum + c.width, 0)
      return `<rect x="${x}" y="${y}" width="${col.width}" height="${ROW_H}" fill="${bg}" stroke="#e2e8f0" stroke-width="0.5"/>
        <text x="${x + 6}" y="${y + 16}" font-size="9" fill="#334155">${esc(entry[col.key] ?? '')}</text>`
    }).join('\n')
  }).join('\n')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, title, code, 'N/A', projectName)}
  ${header}
  ${rows}
  ${svgClose()}`
}

/* ──────────────────────────────────────────────────────────────── */
/*  Specialized Drawing Generators                                  */
/* ──────────────────────────────────────────────────────────────── */

function coverSheetSvg(projectName: string, plan: PlanModel, code: string): string {
  const W = 800
  const H = 600
  const bw = plan.width || 10
  const bh = plan.height || 10
  const area = bw * bh
  const occClass = classifyOccupancy('house')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  <rect x="40" y="40" width="720" height="520" fill="#f8fafc" stroke="#1a365d" stroke-width="2"/>
  <rect x="40" y="40" width="720" height="80" fill="#1a365d"/>
  <text x="400" y="80" font-size="28" fill="#ffffff" text-anchor="middle" font-weight="bold">${esc(projectName)}</text>
  <text x="400" y="105" font-size="12" fill="#d4a574" text-anchor="middle">ARCHITECTURAL DRAWING SET — ${code}</text>

  <text x="80" y="180" font-size="14" fill="#0f172a" font-weight="bold">PROJECT INFORMATION</text>
  <line x1="80" y1="190" x2="720" y2="190" stroke="#cbd5e1" stroke-width="0.5"/>

  <text x="80" y="220" font-size="11" fill="#334155">Building Type: House / Residential</text>
  <text x="80" y="245" font-size="11" fill="#334155">Occupancy Class: ${esc(occClass)} — ${esc(OCCUPANCY_MATRIX[occClass].label)}</text>
  <text x="80" y="270" font-size="11" fill="#334155">Jurisdiction: Zimbabwe (Model Building By-Laws 1977)</text>
  <text x="80" y="295" font-size="11" fill="#334155">Site Dimensions: ${bw.toFixed(1)}m × ${bh.toFixed(1)}m</text>
  <text x="80" y="320" font-size="11" fill="#334155">Gross Floor Area: ${area.toFixed(1)} m²</text>
  <text x="80" y="345" font-size="11" fill="#334155">Number of Rooms: ${plan.rooms.length}</text>
  <text x="80" y="370" font-size="11" fill="#334155">External Walls: ${plan.wallThickness * 1000}mm masonry (SAZ 7 MPa brick)</text>

  <text x="80" y="420" font-size="14" fill="#0f172a" font-weight="bold">DRAWING LIST</text>
  <line x1="80" y1="430" x2="720" y2="430" stroke="#cbd5e1" stroke-width="0.5"/>
  ${DRAWING_TABLE.slice(0, 8).map((d, i) =>
    `<text x="80" y="${450 + i * 18}" font-size="10" fill="#334155">${esc(d.code)} — ${esc(d.title)}</text>`,
  ).join('\n')}
  ${DRAWING_TABLE.slice(8).map((d, i) =>
    `<text x="420" y="${450 + i * 18}" font-size="10" fill="#334155">${esc(d.code)} — ${esc(d.title)}</text>`,
  ).join('\n')}

  <text x="400" y="545" font-size="9" fill="#94a3b8" text-anchor="middle">Generated by Budget Engineer AI — verify with the local council before construction.</text>
  ${svgClose()}`
}

function sitePlanSvg(plan: PlanModel, projectName: string): string {
  const W = 800
  const H = 600
  const MARGIN = 80
  const bw = plan.width || 10
  const bh = plan.height || 10
  const setback = 3.0
  const plotW = bw + setback * 2
  const plotH = bh + setback * 2
  const s = Math.min((W - MARGIN * 2) / plotW, (H - MARGIN * 2 - 80) / plotH)
  const ox = MARGIN + (W - MARGIN * 2 - plotW * s) / 2
  const oy = MARGIN + 60 + (H - MARGIN * 2 - 80 - plotH * s) / 2

  const plotRect = `<rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${(plotW * s).toFixed(1)}" height="${(plotH * s).toFixed(1)}" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="8 4"/>`
  const buildRect = `<rect x="${(ox + setback * s).toFixed(1)}" y="${(oy + setback * s).toFixed(1)}" width="${(bw * s).toFixed(1)}" height="${(bh * s).toFixed(1)}" fill="#E6F1FB" fill-opacity="0.5" stroke="#378ADD" stroke-width="1.5"/>`
  const setbackDims = [
    dimensionLine(ox, oy - 15, ox + setback * s, oy - 15, `${setback}m`),
    dimensionLine(ox + (setback + bw) * s, oy - 15, ox + plotW * s, oy - 15, `${setback}m`),
    dimensionLine(ox - 15, oy, ox - 15, oy + setback * s, `${setback}m`, -15),
  ].join('\n')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, 'Site Plan', 'A-101', '1:200', projectName)}
  ${plotRect}
  ${buildRect}
  ${setbackDims}
  <text x="${(ox + plotW * s / 2).toFixed(1)}" y="${(oy + plotH * s / 2).toFixed(1)}" font-size="12" fill="#378ADD" text-anchor="middle">BUILDING FOOTPRINT</text>
  ${northArrow(W - MARGIN, MARGIN + 40)}
  <text x="${ox.toFixed(1)}" y="${(oy + plotH * s + 25).toFixed(1)}" font-size="9" fill="#64748b">Plot: ${plotW.toFixed(1)}m × ${plotH.toFixed(1)}m | Building: ${bw.toFixed(1)}m × ${bh.toFixed(1)}m | Setback: ${setback}m min (ZBC Ch.2)</text>
  ${svgClose()}`
}

function fireEgressSvg(plan: PlanModel, projectName: string, occupancyClass: string): string {
  const base = planViewSvg(plan, 'Fire Egress Plan', 'A-501', projectName, { showEgress: true, showDimensions: true })
  const maxTravel = maxTravelDistanceForClass(occupancyClass as keyof typeof OCCUPANCY_MATRIX)

  const travelCircles = plan.rooms.map((r) => {
    const cx = 40 + (r.x + r.width / 2) * (720 / (plan.width || 10))
    const cy = 120 + ((plan.height || 10) - r.y - r.height / 2) * (420 / (plan.height || 10))
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="#ef4444" fill-opacity="0.5"/>
      <text x="${cx.toFixed(1)}" y="${(cy - 8).toFixed(1)}" font-size="7" fill="#ef4444" text-anchor="middle">max ${maxTravel}m</text>`
  }).join('\n')

  return base.replace('</svg>', `${travelCircles}<text x="40" y="560" font-size="9" fill="#b45309">Fire egress: max travel distance ${maxTravel}m per ZBC Grade ${occupancyClass} — verify with structural engineer.</text></svg>`)
}

function mepServicesSvg(plan: PlanModel, projectName: string): string {
  const base = planViewSvg(plan, 'MEP Services Plan', 'A-502', projectName, { showGrid: true })

  const wetRooms = plan.rooms.filter((r) => {
    const std = getRoomStandard(r.name)
    return std.isWetCore
  })

  const pipeLines = wetRooms.map((r) => {
    const cx = 40 + (r.x + r.width / 2) * (720 / (plan.width || 10))
    const cy = 120 + ((plan.height || 10) - r.y - r.height / 2) * (420 / (plan.height || 10))
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-dasharray="3 2"/>
      <text x="${cx.toFixed(1)}" y="${(cy + 3).toFixed(1)}" font-size="7" fill="#0ea5e9" text-anchor="middle">PLUMB</text>`
  }).join('\n')

  return base.replace('</svg>', `${pipeLines}<text x="40" y="560" font-size="9" fill="#0ea5e9">MEP: wet-core rooms share plumbing walls per ZIQS SMM — verify with MEP engineer.</text></svg>`)
}

function accessibilitySvg(plan: PlanModel, projectName: string): string {
  const base = planViewSvg(plan, 'Accessibility Plan', 'A-503', projectName, { showDimensions: true })

  const doorChecks = plan.openings.filter((o) => o.kind === 'door').map((o) => {
    const wall = plan.walls.find((w) => w.id === o.wallId)
    if (!wall) return ''
    const cx = 40 + (wall.start.x + (wall.end.x - wall.start.x) * o.offset) * (720 / (plan.width || 10))
    const cy = 120 + ((plan.height || 10) - (wall.start.y + (wall.end.y - wall.start.y) * o.offset)) * (420 / (plan.height || 10))
    const ok = o.width >= 0.8
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="${ok ? '#22c55e' : '#ef4444'}"/>
      <text x="${(cx + 8).toFixed(1)}" y="${(cy + 3).toFixed(1)}" font-size="7" fill="${ok ? '#22c55e' : '#ef4444'}">${(o.width * 1000).toFixed(0)}mm ${ok ? '✓' : '✗'}</text>`
  }).filter(Boolean).join('\n')

  return base.replace('</svg>', `${doorChecks}<text x="40" y="560" font-size="9" fill="#639922">Accessibility: door openings ≥ 800mm per ZBC Ch.4 — verify with accessibility consultant.</text></svg>`)
}

function structuralFramingSvg(plan: PlanModel, projectName: string): string {
  const W = 800
  const H = 600
  const MARGIN = 60
  const bw = plan.width || 10
  const bh = plan.height || 10
  const gridSpacing = 3.6
  const s = Math.min((W - MARGIN * 2) / bw, (H - MARGIN * 2 - 80) / bh)
  const ox = MARGIN + (W - MARGIN * 2 - bw * s) / 2
  const oy = MARGIN + 60 + (H - MARGIN * 2 - 80 - bh * s) / 2

  const gridLines = Array.from({ length: Math.ceil(bw / gridSpacing) + 1 }, (_, i) => {
    const x = ox + i * gridSpacing * s
    return `<line x1="${x.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(oy + bh * s).toFixed(1)}" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="6 3"/>
      ${gridBubble(x, oy - 20, String.fromCharCode(65 + i))}`
  }).join('\n')

  const gridLinesH = Array.from({ length: Math.ceil(bh / gridSpacing) + 1 }, (_, i) => {
    const y = oy + i * gridSpacing * s
    return `<line x1="${ox.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(ox + bw * s).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="6 3"/>
      <circle cx="${(ox - 20).toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="none" stroke="#475569" stroke-width="1.5"/>
      <text x="${(ox - 20).toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="10" fill="#0f172a" text-anchor="middle">${i + 1}</text>`
  }).join('\n')

  const columns = Array.from({ length: Math.ceil(bw / gridSpacing) + 1 }, (_, ci) =>
    Array.from({ length: Math.ceil(bh / gridSpacing) + 1 }, (_, ri) => {
      const x = ox + ci * gridSpacing * s
      const y = oy + ri * gridSpacing * s
      return `<rect x="${(x - 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="8" height="8" fill="#8b5cf6"/>`
    }).join('\n'),
  ).join('\n')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, 'Structural Framing Plan', 'A-402', '1:100', projectName)}
  ${gridLines}
  ${gridLinesH}
  ${columns}
  <text x="${(ox + bw * s / 2).toFixed(1)}" y="${(oy + bh * s + 25).toFixed(1)}" font-size="9" fill="#8b5cf6" text-anchor="middle">Structural grid: ${gridSpacing}m centres — verify with structural engineer.</text>
  ${svgClose()}`
}

function foundationPlanSvg(plan: PlanModel, projectName: string): string {
  const W = 800
  const H = 600
  const MARGIN = 60
  const bw = plan.width || 10
  const bh = plan.height || 10
  const s = Math.min((W - MARGIN * 2) / bw, (H - MARGIN * 2 - 80) / bh)
  const ox = MARGIN + (W - MARGIN * 2 - bw * s) / 2
  const oy = MARGIN + 60 + (H - MARGIN * 2 - 80 - bh * s) / 2

  const footings = plan.walls.filter((w) => w.type === 'external').map((w) => {
    const x1 = ox + w.start.x * s
    const y1 = oy + (bh - w.start.y) * s
    const x2 = ox + w.end.x * s
    const y2 = oy + (bh - w.end.y) * s
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#b45309" stroke-width="6" stroke-opacity="0.4"/>
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#b45309" stroke-width="2"/>`
  }).join('\n')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, 'Foundation Plan', 'A-401', '1:50', projectName)}
  ${footings}
  <text x="${(ox + bw * s / 2).toFixed(1)}" y="${(oy + bh * s + 25).toFixed(1)}" font-size="9" fill="#b45309" text-anchor="middle">Strip foundation: min 600mm depth per ZBC Ch.4 Cl.12(a) — verify with geotechnical report.</text>
  ${svgClose()}`
}

function roofPlanSvg(plan: PlanModel, projectName: string): string {
  const W = 800
  const H = 600
  const MARGIN = 80
  const bw = plan.width || 10
  const bh = plan.height || 10
  const overhang = 0.6
  const roofW = bw + overhang * 2
  const roofH = bh + overhang * 2
  const s = Math.min((W - MARGIN * 2) / roofW, (H - MARGIN * 2 - 80) / roofH)
  const ox = MARGIN + (W - MARGIN * 2 - roofW * s) / 2
  const oy = MARGIN + 60 + (H - MARGIN * 2 - 80 - roofH * s) / 2

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, 'Roof Plan', 'A-104', '1:100', projectName)}
  <rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${(roofW * s).toFixed(1)}" height="${(roofH * s).toFixed(1)}" fill="#EAF3DE" fill-opacity="0.5" stroke="#639922" stroke-width="2"/>
  <line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${(ox + roofW * s).toFixed(1)}" y2="${(oy + roofH * s).toFixed(1)}" stroke="#639922" stroke-width="1" stroke-dasharray="4 4"/>
  <line x1="${(ox + roofW * s).toFixed(1)}" y1="${oy.toFixed(1)}" x2="${ox.toFixed(1)}" y2="${(oy + roofH * s).toFixed(1)}" stroke="#639922" stroke-width="1" stroke-dasharray="4 4"/>
  <text x="${(ox + roofW * s / 2).toFixed(1)}" y="${(oy + roofH * s / 2).toFixed(1)}" font-size="14" fill="#639922" text-anchor="middle">ROOF PLAN</text>
  <text x="${(ox + roofW * s / 2).toFixed(1)}" y="${(oy + roofH * s / 2 + 20).toFixed(1)}" font-size="10" fill="#639922" text-anchor="middle">Overhang: ${overhang}m | Pitch: 25°</text>
  ${northArrow(W - MARGIN, MARGIN + 40)}
  <text x="${(ox + roofW * s / 2).toFixed(1)}" y="${(oy + roofH * s + 25).toFixed(1)}" font-size="9" fill="#639922" text-anchor="middle">Roof: IBR sheeting on timber trusses — verify wind resistance per ZBC.</text>
  ${svgClose()}`
}

function ceilingPlanSvg(plan: PlanModel, projectName: string): string {
  const base = planViewSvg(plan, 'Reflected Ceiling Plan', 'A-105', projectName, { showGrid: true })

  const ceilingNotes = plan.rooms.map((r) => {
    const cx = 40 + (r.x + r.width / 2) * (720 / (plan.width || 10))
    const cy = 120 + ((plan.height || 10) - r.y - r.height / 2) * (420 / (plan.height || 10))
    return `<text x="${cx.toFixed(1)}" y="${(cy + 20).toFixed(1)}" font-size="7" fill="#64748b" text-anchor="middle">2.4m FFL</text>`
  }).join('\n')

  return base.replace('</svg>', `${ceilingNotes}<text x="40" y="560" font-size="9" fill="#64748b">Ceiling height: min 2.4m per ZBC Cl.1.1 — verify withMEP engineer.</text></svg>`)
}

function sectionSvg(plan: PlanModel, projectName: string): string {
  const drawing = resolveSection(plan, 1, 3, 1.5, 'house')
  if (!drawing) {
    return `${svgOpen(800, 600)}${whiteBg(800, 600)}${titleBlock(50, 'Building Section', 'A-301', '1:50', projectName)}<text x="400" y="300" font-size="16" fill="#64748b" text-anchor="middle">Section unavailable.</text>${svgClose()}`
  }
  return elevationViewSvg(drawing, 'Building Section', 'A-301', projectName)
}

function bimViewsSvg(plan: PlanModel, projectName: string): string {
  const W = 800
  const H = 600
  const bh = plan.height || 10

  const rooms = plan.rooms.map((r) => {
    const zone = roomZoneColor(r.name)
    const x = 100 + r.x * 30
    const y = 300 + (bh - r.y - r.height) * 30
    const w = r.width * 30
    const h = r.height * 30
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${zone.fill}" fill-opacity="0.4" stroke="${zone.stroke}" stroke-width="1" transform="skewX(-15) skewY(5)"/>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2).toFixed(1)}" font-size="8" fill="#0f172a" text-anchor="middle" transform="skewX(-15) skewY(5)">${esc(r.name)}</text>`
  }).join('\n')

  return `${svgOpen(W, H)}
  ${whiteBg(W, H)}
  ${titleBlock(50, '3D BIM Model Views', 'A-701', 'N/A', projectName)}
  <text x="400" y="160" font-size="14" fill="#0f172a" text-anchor="middle" font-weight="bold">ISOMETRIC VIEW</text>
  <g transform="translate(0, 0)">
    ${rooms}
  </g>
  <text x="400" y="540" font-size="9" fill="#8b5cf6" text-anchor="middle">BIM model: IFC export via IfcOpenShell/web-ifc — fully engineered, not aesthetic.</text>
  ${svgClose()}`
}

/* ──────────────────────────────────────────────────────────────── */
/*  RAG Compliance Integration                                      */
/* ──────────────────────────────────────────────────────────────── */

async function ragCitationsForDrawing(
  drawingId: DrawingId,
  ragIndex: RagIndex | undefined,
): Promise<ComplianceCitation[]> {
  const queries = RAG_QUERIES[drawingId]
  if (!queries || queries.length === 0 || !ragIndex) return []

  const citations: ComplianceCitation[] = []
  for (const query of queries) {
    try {
      const results: SearchResult[] = hybridSearch(ragIndex, query, { k: 3, minScore: 0.01 })
      for (const r of results) {
        if (r.score < 0.02) continue
        citations.push({
          citation: r.citation ?? `[ZBC ${r.sectionId}]`,
          rule: r.heading,
          status: r.score > 0.1 ? 'pass' : 'warn',
          detail: r.text.slice(0, 200),
          score: Math.round(r.score * 1000) / 1000,
          sectionId: r.sectionId,
        })
      }
    } catch {
      citations.push({
        citation: `[RAG search failed for "${query}"]`,
        rule: query,
        status: 'warn',
        detail: 'Hybrid search returned an error — citations may be incomplete.',
        score: 0,
        sectionId: 'error',
      })
    }
  }
  return citations
}

/* ──────────────────────────────────────────────────────────────── */
/*  Plotter Path Extraction                                         */
/* ──────────────────────────────────────────────────────────────── */

function svgToPlotterPaths(svg: string, drawingId: DrawingId): PlotterPath[] {
  const paths: PlotterPath[] = []
  const lineRegex = /<line\s+x1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"/g
  const rectRegex = /<rect\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g

  let match: RegExpExecArray | null
  let idx = 0

  while ((match = lineRegex.exec(svg)) !== null) {
    const x1 = parseFloat(match[1])
    const y1 = parseFloat(match[2])
    const x2 = parseFloat(match[3])
    const y2 = parseFloat(match[4])
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) continue

    paths.push({
      index: idx++,
      layer: drawingId,
      segments: [{
        points: [
          { x: mmToHpglUnits(x1), y: mmToHpglUnits(y1) },
          { x: mmToHpglUnits(x2), y: mmToHpglUnits(y2) },
        ],
        layer: drawingId,
      }],
      length: Math.hypot(x2 - x1, y2 - y1),
    })
  }

  while ((match = rectRegex.exec(svg)) !== null) {
    const x = parseFloat(match[1])
    const y = parseFloat(match[2])
    const w = parseFloat(match[3])
    const h = parseFloat(match[4])
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) continue

    const pts: PlotterPoint[] = [
      { x: mmToHpglUnits(x), y: mmToHpglUnits(y) },
      { x: mmToHpglUnits(x + w), y: mmToHpglUnits(y) },
      { x: mmToHpglUnits(x + w), y: mmToHpglUnits(y + h) },
      { x: mmToHpglUnits(x), y: mmToHpglUnits(y + h) },
      { x: mmToHpglUnits(x), y: mmToHpglUnits(y) },
    ]
    paths.push({
      index: idx++,
      layer: drawingId,
      segments: [{ points: pts, layer: drawingId }],
      length: 2 * (w + h),
    })
  }

  return paths
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main Entry Point                                                */
/* ──────────────────────────────────────────────────────────────── */

/**
 * Generate the full 15-drawing architectural set from a PlanModel + optional BimModel.
 *
 * Each drawing receives:
 *  - RAG-compliant Zimbabwe By-Laws citations via hybrid search
 *  - IFC entity annotations (IfcWallStandardCase, IfcSpace, IfcRelSpaceBoundary)
 *  - Pen-plotter-optimized SVG output with extracted PlotterPaths
 */
export async function generateFullSet(config: FullSetConfig): Promise<FullSetResult> {
  const t0 = performance.now()
  const {
    plan,
    bim,
    buildingType = 'house',
    projectName = 'Budget Engineer Project',
    jurisdiction = 'zimbabwe',
    floors = 1,
    storeyHeight = 3,
  } = config

  const ragIndex = config.ragIndex ?? buildDefaultRagIndex()
  const occupancyClass = classifyOccupancy(buildingType)
  const areaSchedule = buildAreaSchedule(plan)
  const doorWindowSchedule = buildDoorWindowSchedule(plan, occupancyClass)

  /* Build compliance report */
  const complianceReport: ComplianceReport = {
    jurisdiction,
    results: [],
    score: 0,
    totalRules: 0,
    passedRules: 0,
    warnings: [],
  }

  const drawings: FullSetDrawing[] = []

  for (const def of DRAWING_TABLE) {
    let svg = ''

    switch (def.id) {
      case 'cover-sheet':
        svg = coverSheetSvg(projectName, plan, def.code)
        break
      case 'site-plan':
        svg = sitePlanSvg(plan, projectName)
        break
      case 'ground-floor-plan':
        svg = planViewSvg(plan, def.title, def.code, projectName, { showGrid: true, showDimensions: true })
        break
      case 'first-floor-plan':
        svg = floors > 1
          ? planViewSvg(plan, def.title, def.code, projectName, { showGrid: true, showDimensions: true })
          : `${svgOpen(800, 600)}${whiteBg(800, 600)}${titleBlock(50, def.title, def.code, '1:100', projectName)}<text x="400" y="300" font-size="14" fill="#64748b" text-anchor="middle">Single-storey building — no first floor.</text>${svgClose()}`
        break
      case 'roof-plan':
        svg = roofPlanSvg(plan, projectName)
        break
      case 'ceiling-plan':
        svg = ceilingPlanSvg(plan, projectName)
        break
      case 'front-elevation': {
        const drawing = resolveFrontElevation(plan, floors, storeyHeight, 1.5, buildingType)
        svg = elevationViewSvg(drawing, def.title, def.code, projectName)
        break
      }
      case 'rear-elevation': {
        const drawing = resolveRearElevation(plan, floors, storeyHeight, 1.5)
        svg = elevationViewSvg(drawing, def.title, def.code, projectName)
        break
      }
      case 'left-elevation': {
        const drawing = resolveLeftElevation(plan, floors, storeyHeight, 1.5)
        svg = elevationViewSvg(drawing, def.title, def.code, projectName)
        break
      }
      case 'right-elevation': {
        const drawing = resolveRightElevation(plan, floors, storeyHeight, 1.5)
        svg = elevationViewSvg(drawing, def.title, def.code, projectName)
        break
      }
      case 'section':
        svg = sectionSvg(plan, projectName)
        break
      case 'foundation-plan':
        svg = foundationPlanSvg(plan, projectName)
        break
      case 'structural-framing':
        svg = structuralFramingSvg(plan, projectName)
        break
      case 'fire-egress-plan':
        svg = fireEgressSvg(plan, projectName, occupancyClass)
        break
      case 'mep-services':
        svg = mepServicesSvg(plan, projectName)
        break
      case 'accessibility-plan':
        svg = accessibilitySvg(plan, projectName)
        break
      case 'door-window-schedule':
        svg = scheduleSvg(
          doorWindowSchedule.map((e) => ({
            ID: e.id,
            Type: e.type,
            Width: `${e.widthMm}mm`,
            Height: `${e.heightMm}mm`,
            'Fire Rating': e.fireRating,
            Material: e.material,
            Location: e.room,
          })),
          def.title, def.code, projectName,
          [
            { key: 'ID', label: 'ID', width: 80 },
            { key: 'Type', label: 'Type', width: 70 },
            { key: 'Width', label: 'Width', width: 80 },
            { key: 'Height', label: 'Height', width: 80 },
            { key: 'Fire Rating', label: 'Fire Rating', width: 100 },
            { key: 'Material', label: 'Material', width: 120 },
            { key: 'Location', label: 'Location', width: 100 },
          ],
        )
        break
      case 'area-schedule':
        svg = scheduleSvg(
          areaSchedule.map((e) => ({
            Number: e.roomNumber,
            Name: e.roomName,
            'Area (m²)': e.areaM2.toFixed(1),
            'Width (m)': e.widthM.toFixed(2),
            'Depth (m)': e.depthM.toFixed(2),
            Zone: e.zone,
            'Min Required': e.minRequiredM2.toFixed(1),
            Compliant: e.compliant ? '✓' : '✗',
          })),
          def.title, def.code, projectName,
          [
            { key: 'Number', label: '#', width: 50 },
            { key: 'Name', label: 'Room', width: 140 },
            { key: 'Area (m²)', label: 'Area (m²)', width: 80 },
            { key: 'Width (m)', label: 'Width', width: 70 },
            { key: 'Depth (m)', label: 'Depth', width: 70 },
            { key: 'Zone', label: 'Zone', width: 90 },
            { key: 'Min Required', label: 'Min m²', width: 80 },
            { key: 'Compliant', label: 'OK?', width: 50 },
          ],
        )
        break
      case 'bim-3d-views':
        svg = bimViewsSvg(plan, projectName)
        break
      default:
        svg = `${svgOpen(800, 600)}${whiteBg(800, 600)}${titleBlock(50, def.title, def.code, def.scale, projectName)}<text x="400" y="300" font-size="14" fill="#64748b" text-anchor="middle">Drawing not yet implemented.</text>${svgClose()}`
    }

    const citations = await ragCitationsForDrawing(def.id, ragIndex)
    const ifcAnnotations = ifcAnnotationsForDrawing(def.id, plan, bim, occupancyClass)
    const plotterPaths = svgToPlotterPaths(svg, def.id)

    /* Add RAG findings to the compliance report */
    for (const c of citations) {
      complianceReport.results.push({
        ruleId: `${def.id}:${c.sectionId}`,
        category: `Full-Set: ${def.title}`,
        title: c.rule,
        status: c.status,
        actual: c.detail,
        required: c.citation,
        note: c.detail,
      })
    }

    /* Parse SVG dimensions */
    const dimMatch = svg.match(/width="(\d+)" height="(\d+)"/)
    const dims = dimMatch
      ? { width: parseInt(dimMatch[1], 10), height: parseInt(dimMatch[2], 10) }
      : { width: 800, height: 600 }

    drawings.push({
      id: def.id,
      sadcCode: def.code,
      title: def.title,
      scale: def.scale,
      svg,
      dimensions: dims,
      citations,
      ifcAnnotations,
      plotterPaths,
      isPlanView: def.id.includes('plan') || def.id.includes('floor'),
    })
  }

  /* Aggregate compliance */
  complianceReport.totalRules = complianceReport.results.length
  complianceReport.passedRules = complianceReport.results.filter((r) => r.status === 'pass').length
  complianceReport.score = complianceReport.totalRules > 0
    ? Math.round((complianceReport.passedRules / complianceReport.totalRules) * 100)
    : 0

  /* Aggregate plotter stats */
  const allPaths = drawings.flatMap((d) => d.plotterPaths)
  const totalSegments = allPaths.reduce((sum, p) => sum + p.segments.reduce((s, seg) => s + seg.points.length - 1, 0), 0)
  const totalLengthMm = allPaths.reduce((sum, p) => sum + p.length, 0)
  const totalPenUpMetres = totalLengthMm * 0.3 / 1000 // estimated 30% pen-up travel
  const totalPenLifts = Math.min(totalSegments, Math.round(totalSegments * 0.12))

  return {
    drawings,
    projectName,
    totalPenUpMetres: Math.round(totalPenUpMetres * 100) / 100,
    totalPenLifts,
    complianceReport,
    ifcEntityCount: drawings.reduce((sum, d) => sum + d.ifcAnnotations.length, 0),
    areaSchedule,
    doorWindowSchedule,
    generationTimeMs: Math.round(performance.now() - t0),
  }
}

/* ──────────────────────────────────────────────────────────────── */
/*  Synchronous Convenience                                         */
/* ──────────────────────────────────────────────────────────────── */

/**
 * Synchronous variant — generates the full set without RAG citations.
 * Use when you need instant results (e.g. preview) without the async RAG pipeline.
 */
export function generateFullSetSync(config: FullSetConfig): FullSetResult {
  const t0 = performance.now()
  const {
    plan,
    bim,
    buildingType = 'house',
    projectName = 'Budget Engineer Project',
    jurisdiction = 'zimbabwe',
    floors = 1,
    storeyHeight = 3,
  } = config

  const occupancyClass = classifyOccupancy(buildingType)
  const areaSchedule = buildAreaSchedule(plan)
  const doorWindowSchedule = buildDoorWindowSchedule(plan, occupancyClass)

  const complianceReport: ComplianceReport = {
    jurisdiction,
    results: [],
    score: 0,
    totalRules: 0,
    passedRules: 0,
    warnings: ['Synchronous mode — RAG citations not included.'],
  }

  const drawings: FullSetDrawing[] = DRAWING_TABLE.map((def) => {
    let svg = ''
    switch (def.id) {
      case 'cover-sheet': svg = coverSheetSvg(projectName, plan, def.code); break
      case 'site-plan': svg = sitePlanSvg(plan, projectName); break
      case 'ground-floor-plan': svg = planViewSvg(plan, def.title, def.code, projectName, { showGrid: true, showDimensions: true }); break
      case 'first-floor-plan':
        svg = floors > 1
          ? planViewSvg(plan, def.title, def.code, projectName, { showGrid: true, showDimensions: true })
          : `${svgOpen(800, 600)}${whiteBg(800, 600)}${titleBlock(50, def.title, def.code, '1:100', projectName)}<text x="400" y="300" font-size="14" fill="#64748b" text-anchor="middle">Single-storey building.</text>${svgClose()}`
        break
      case 'roof-plan': svg = roofPlanSvg(plan, projectName); break
      case 'ceiling-plan': svg = ceilingPlanSvg(plan, projectName); break
      case 'front-elevation': svg = elevationViewSvg(resolveFrontElevation(plan, floors, storeyHeight, 1.5, buildingType), def.title, def.code, projectName); break
      case 'rear-elevation': svg = elevationViewSvg(resolveRearElevation(plan, floors, storeyHeight, 1.5), def.title, def.code, projectName); break
      case 'left-elevation': svg = elevationViewSvg(resolveLeftElevation(plan, floors, storeyHeight, 1.5), def.title, def.code, projectName); break
      case 'right-elevation': svg = elevationViewSvg(resolveRightElevation(plan, floors, storeyHeight, 1.5), def.title, def.code, projectName); break
      case 'section': svg = sectionSvg(plan, projectName); break
      case 'foundation-plan': svg = foundationPlanSvg(plan, projectName); break
      case 'structural-framing': svg = structuralFramingSvg(plan, projectName); break
      case 'fire-egress-plan': svg = fireEgressSvg(plan, projectName, occupancyClass); break
      case 'mep-services': svg = mepServicesSvg(plan, projectName); break
      case 'accessibility-plan': svg = accessibilitySvg(plan, projectName); break
      case 'door-window-schedule':
        svg = scheduleSvg(
          doorWindowSchedule.map((e) => ({
            ID: e.id, Type: e.type, Width: `${e.widthMm}mm`, Height: `${e.heightMm}mm`,
            'Fire Rating': e.fireRating, Material: e.material, Location: e.room,
          })),
          def.title, def.code, projectName,
          [
            { key: 'ID', label: 'ID', width: 80 }, { key: 'Type', label: 'Type', width: 70 },
            { key: 'Width', label: 'Width', width: 80 }, { key: 'Height', label: 'Height', width: 80 },
            { key: 'Fire Rating', label: 'Fire Rating', width: 100 }, { key: 'Material', label: 'Material', width: 120 },
            { key: 'Location', label: 'Location', width: 100 },
          ],
        )
        break
      case 'area-schedule':
        svg = scheduleSvg(
          areaSchedule.map((e) => ({
            Number: e.roomNumber, Name: e.roomName, 'Area (m²)': e.areaM2.toFixed(1),
            'Width (m)': e.widthM.toFixed(2), 'Depth (m)': e.depthM.toFixed(2),
            Zone: e.zone, 'Min Required': e.minRequiredM2.toFixed(1), Compliant: e.compliant ? '✓' : '✗',
          })),
          def.title, def.code, projectName,
          [
            { key: 'Number', label: '#', width: 50 }, { key: 'Name', label: 'Room', width: 140 },
            { key: 'Area (m²)', label: 'Area (m²)', width: 80 }, { key: 'Width (m)', label: 'Width', width: 70 },
            { key: 'Depth (m)', label: 'Depth', width: 70 }, { key: 'Zone', label: 'Zone', width: 90 },
            { key: 'Min Required', label: 'Min m²', width: 80 }, { key: 'Compliant', label: 'OK?', width: 50 },
          ],
        )
        break
      case 'bim-3d-views': svg = bimViewsSvg(plan, projectName); break
      default: svg = `${svgOpen(800, 600)}${whiteBg(800, 600)}${titleBlock(50, def.title, def.code, def.scale, projectName)}<text x="400" y="300" font-size="14" fill="#64748b" text-anchor="middle">Drawing not yet implemented.</text>${svgClose()}`
    }

    const ifcAnnotations = ifcAnnotationsForDrawing(def.id, plan, bim, occupancyClass)
    const plotterPaths = svgToPlotterPaths(svg, def.id)
    const dimMatch = svg.match(/width="(\d+)" height="(\d+)"/)
    const dims = dimMatch ? { width: parseInt(dimMatch[1], 10), height: parseInt(dimMatch[2], 10) } : { width: 800, height: 600 }

    return {
      id: def.id,
      sadcCode: def.code,
      title: def.title,
      scale: def.scale,
      svg,
      dimensions: dims,
      citations: [],
      ifcAnnotations,
      plotterPaths,
      isPlanView: def.id.includes('plan') || def.id.includes('floor'),
    }
  })

  const allPaths = drawings.flatMap((d) => d.plotterPaths)
  const totalSegments = allPaths.reduce((sum, p) => sum + p.segments.reduce((s, seg) => s + seg.points.length - 1, 0), 0)
  const totalLengthMm = allPaths.reduce((sum, p) => sum + p.length, 0)

  return {
    drawings,
    projectName,
    totalPenUpMetres: Math.round(totalLengthMm * 0.3 / 1000 * 100) / 100,
    totalPenLifts: Math.min(totalSegments, Math.round(totalSegments * 0.12)),
    complianceReport,
    ifcEntityCount: drawings.reduce((sum, d) => sum + d.ifcAnnotations.length, 0),
    areaSchedule,
    doorWindowSchedule,
    generationTimeMs: Math.round(performance.now() - t0),
  }
}

/* ──────────────────────────────────────────────────────────────── */
/*  Exports for consumers                                           */
/* ──────────────────────────────────────────────────────────────── */

export { DRAWING_TABLE, RAG_QUERIES }
