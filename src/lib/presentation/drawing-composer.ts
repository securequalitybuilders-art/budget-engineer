import type { PlanModel } from '../../domain/plan'
import type { Level } from '../../domain/building'
import type { DrawingMode, LineweightCategory, SheetSizeDef } from './drafting-standards'
import { getDrawingStandards, getLineweight, getTextStyle, suggestSheetSize, resolveScale } from './drafting-standards'
import type { AnnotationSet } from './annotation-engine'
import { buildAnnotationSet } from './annotation-engine'

// ── Drawing metadata ──────────────────────────────────────────

export type DrawingType =
  | 'floor-plan'
  | 'reflected-ceiling-plan'
  | 'roof-plan'
  | 'site-plan'
  | 'elevation'
  | 'section'
  | 'detail'
  | '3d-view'
  | 'schematic'
  | 'board'

export interface DrawingMeta {
  id: string
  type: DrawingType
  title: string
  drawingNumber: string
  scale: number
  scaleLabel: string
  mode: DrawingMode
  sheetSize: SheetSizeDef
  levelName?: string
  levelNumber?: number
  discipline: string
}

export interface SheetMeta {
  projectName: string
  projectNumber: string
  sheetNumber: string
  sheetTitle: string
  date: string
  revision: string
  designer: string
  checker: string
  totalSheets: number
  drawingMetas: DrawingMeta[]
}

// ── SVG layer styling ─────────────────────────────────────────

export interface DrawingLayerStyle {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
  opacity?: number
}

export interface DrawingLayer {
  id: string
  name: string
  category: LineweightCategory
  style: DrawingLayerStyle
  zIndex: number
}

export function buildDrawingLayers(
  mode: DrawingMode = 'technical',
  colors: boolean = false,
): DrawingLayer[] {
  const layers: DrawingLayer[] = [
    { id: 'grid', name: 'Grid', category: 'grid', style: { fill: 'none', stroke: '#888', strokeWidth: 0.13, strokeDasharray: '3 2' }, zIndex: 0 },
    { id: 'terrain', name: 'Terrain', category: 'terrain', style: { fill: colors ? '#f0ecd8' : 'none', stroke: '#666', strokeWidth: 0.25 }, zIndex: 1 },
    { id: 'hatch-poche', name: 'Poché Hatch', category: 'hatch-boundary', style: { fill: colors ? '#e8e0d0' : '#f0f0f0', stroke: 'none', strokeWidth: 0.13 }, zIndex: 2 },
    { id: 'cut-wall', name: 'Cut Walls', category: 'cut-wall', style: { fill: colors ? '#d4c9b8' : '#333', stroke: '#000', strokeWidth: 0.7 }, zIndex: 3 },
    { id: 'cut-slab', name: 'Cut Slab', category: 'cut-slab', style: { fill: colors ? '#c8bdb0' : '#444', stroke: '#000', strokeWidth: 0.5 }, zIndex: 4 },
    { id: 'cut-structure', name: 'Cut Structure', category: 'cut-structure', style: { fill: colors ? '#b0a898' : '#555', stroke: '#000', strokeWidth: 0.5 }, zIndex: 5 },
    { id: 'external-wall', name: 'External Walls', category: 'external-outline', style: { fill: 'none', stroke: '#000', strokeWidth: 0.35 }, zIndex: 6 },
    { id: 'internal-wall', name: 'Internal Walls', category: 'internal-wall', style: { fill: 'none', stroke: '#333', strokeWidth: 0.25 }, zIndex: 7 },
    { id: 'overhead', name: 'Overhead', category: 'overhead', style: { fill: 'none', stroke: '#666', strokeWidth: 0.18, strokeDasharray: '4 3' }, zIndex: 8 },
    { id: 'fixture', name: 'Fixtures', category: 'fixture', style: { fill: colors ? '#a0d4e0' : '#ccc', stroke: '#444', strokeWidth: 0.18 }, zIndex: 9 },
    { id: 'furniture', name: 'Furniture', category: 'furniture', style: { fill: colors ? '#e0d0a0' : '#ddd', stroke: '#666', strokeWidth: 0.13 }, zIndex: 10 },
    { id: 'dimension', name: 'Dimensions', category: 'dimension', style: { fill: 'none', stroke: '#555', strokeWidth: 0.18 }, zIndex: 11 },
    { id: 'annotation', name: 'Annotations', category: 'annotation-leader', style: { fill: 'none', stroke: '#444', strokeWidth: 0.18 }, zIndex: 12 },
    { id: 'room-label', name: 'Room Labels', category: 'annotation-leader', style: { fill: '#000', stroke: 'none', strokeWidth: 0 }, zIndex: 13 },
    { id: 'section-cut', name: 'Section Cut', category: 'section-cut', style: { fill: 'none', stroke: '#000', strokeWidth: 0.7 }, zIndex: 14 },
    { id: 'hidden', name: 'Hidden', category: 'hidden', style: { fill: 'none', stroke: '#888', strokeWidth: 0.18, strokeDasharray: '2 2' }, zIndex: 15 },
    { id: 'reference', name: 'Reference', category: 'reference', style: { fill: 'none', stroke: '#aaa', strokeWidth: 0.13, strokeDasharray: '6 3 2 3' }, zIndex: 16 },
  ]

  for (const layer of layers) {
    const lw = getLineweight(layer.category, mode)
    layer.style.strokeWidth = lw.svgStrokeWidth
    layer.style.stroke = lw.rgb
  }

  return layers
}

// ── Drawing viewport ──────────────────────────────────────────

export interface DrawingViewport {
  id: string
  drawingMeta: DrawingMeta
  x: number
  y: number
  width: number
  height: number
  contentScale: number
  contentOffsetX: number
  contentOffsetY: number
}

export function createDrawingViewport(
  meta: DrawingMeta,
  sheetSize: SheetSizeDef,
  margin: number = 10,
): DrawingViewport {
  const pad = 30
  const contentWidth = meta.scale * (sheetSize.printableWidthMm - 2 * pad)
  const contentHeight = meta.scale * (sheetSize.printableHeightMm - 2 * pad)
  return {
    id: meta.id,
    drawingMeta: meta,
    x: margin + pad,
    y: margin + pad,
    width: contentWidth,
    height: contentHeight,
    contentScale: meta.scale,
    contentOffsetX: 0,
    contentOffsetY: 0,
  }
}

// ── Drawing composition result ────────────────────────────────

export interface ComposedDrawing {
  svgContent: string
  width: number
  height: number
  viewport: DrawingViewport
  meta: DrawingMeta
  annotations: AnnotationSet
  scale: number
}

export interface ComposedSheet {
  svgContent: string
  widthMm: number
  heightMm: number
  sheetMeta: SheetMeta
  drawings: ComposedDrawing[]
  scale: number
  mode: DrawingMode
}

// ── Composer ──────────────────────────────────────────────────

export function composePlanDrawing(
  planModel: PlanModel,
  level: Level | null,
  mode: DrawingMode = 'technical',
  drawingNumber?: string,
): ComposedDrawing {
  const bound = computeBounds(planModel)
  const std = getDrawingStandards(mode)

  const scale = resolveScale(
    bound.width * 1000,
    bound.height * 1000,
    std.sheetSizes[0].widthMm,
    std.sheetSizes[0].heightMm,
  )
  const scaleLabel = `1:${scale}`

  const meta: DrawingMeta = {
    id: planModel.id,
    type: 'floor-plan',
    title: level?.name ?? 'Floor Plan',
    drawingNumber: drawingNumber ?? 'A-101',
    scale,
    scaleLabel,
    mode,
    sheetSize: std.sheetSizes[0],
    levelName: level?.name,
    levelNumber: level?.number,
    discipline: 'Architectural',
  }

  const annotations = buildAnnotationSet(planModel, mode)
  const viewport = createDrawingViewport(meta, std.sheetSizes[0])

  const svgContent = renderPlanSvgContent(planModel, annotations, scale, mode)

  return { svgContent, width: bound.width, height: bound.height, viewport, meta, annotations, scale }
}

export function composeSheet(
  drawings: ComposedDrawing[],
  sheetMeta: SheetMeta,
  mode: DrawingMode = 'technical',
): ComposedSheet {
  const sheetSize = suggestSheetSize(0, 0, mode)
  const widthMm = sheetSize.widthMm
  const heightMm = sheetSize.heightMm
  const scale = 1

  return { svgContent: '', widthMm, heightMm, sheetMeta, drawings, scale, mode }
}

// ── SVG rendering helpers ─────────────────────────────────────

function computeBounds(plan: PlanModel): { width: number; height: number } {
  if (plan.rooms.length === 0) return { width: plan.width, height: plan.height }
  const maxX = Math.max(...plan.rooms.map(r => r.x + r.width))
  const maxY = Math.max(...plan.rooms.map(r => r.y + r.height))
  return { width: maxX, height: maxY }
}

interface RoomRenderStyle {
  fill: string
  stroke: string
  strokeWidth: number
  fillOpacity: number
}

function getRoomStyle(roomName: string, mode: DrawingMode): RoomRenderStyle {
  const isWet = ['Bathroom', 'Kitchen', 'Laundry', 'WC', 'Pantry'].some(p => roomName.includes(p))
  const isCirculation = ['Corridor', 'Hall', 'Stair', 'Lobby', 'Entry'].some(p => roomName.includes(p))
  const isService = ['Store', 'Storage', 'Plant', 'Service'].some(p => roomName.includes(p))

  if (mode === 'technical') {
    return {
      fill: isWet ? '#e8f0fe' : isCirculation ? '#f5f5f5' : isService ? '#fef0e0' : '#fafafa',
      stroke: isWet ? '#444' : '#333',
      strokeWidth: 0.25,
      fillOpacity: 1,
    }
  }
  return {
    fill: isWet ? '#e0f0ff' : isCirculation ? '#f8f6f2' : isService ? '#fff0e0' : '#fcfbf8',
    stroke: '#555',
    strokeWidth: 0.18,
    fillOpacity: 0.85,
  }
}

function renderPlanSvgContent(
  plan: PlanModel,
  annotations: AnnotationSet,
  scale: number,
  mode: DrawingMode,
): string {
  const sf = 1000 / scale
  const lines: string[] = []

  lines.push(`<g transform="scale(${sf})">`)

  for (const room of plan.rooms) {
    const style = getRoomStyle(room.name, mode)
    lines.push(`<rect x="${room.x}" y="${room.y}" width="${room.width}" height="${room.height}" fill="${style.fill}" fill-opacity="${style.fillOpacity}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}"/>`)
  }

  for (const wall of plan.walls) {
    const lw = wall.type === 'external'
      ? getLineweight('external-outline', mode)
      : getLineweight('internal-wall', mode)
    lines.push(`<line x1="${wall.start.x}" y1="${wall.start.y}" x2="${wall.end.x}" y2="${wall.end.y}" stroke="${lw.rgb}" stroke-width="${lw.svgStrokeWidth}"/>`)
  }

  for (const label of annotations.roomLabels) {
    const ts = getTextStyle('room-label', mode)
    lines.push(`<text x="${label.cx}" y="${label.cy}" font-family="${ts.fontFamily}" font-size="${ts.fontSizeMm * sf}" fill="${ts.color}" text-anchor="middle" dominant-baseline="central" font-weight="${ts.weight}">${label.name}</text>`)
    lines.push(`<text x="${label.cx}" y="${label.cy + ts.fontSizeMm * sf + 1}" font-family="${ts.fontFamily}" font-size="${(ts.fontSizeMm * 0.7) * sf}" fill="#888" text-anchor="middle">${label.areaM2.toFixed(1)} m²</text>`)
  }

  for (const dim of annotations.overallDimensions) {
    const ts = getTextStyle('dimension-text', mode)
    lines.push(`<line x1="${dim.x1}" y1="${dim.y1}" x2="${dim.x2}" y2="${dim.y2}" stroke="#555" stroke-width="0.18"/>`)
    const midX = (dim.x1 + dim.x2) / 2
    lines.push(`<text x="${midX}" y="${dim.y1 + (dim.side === 'bottom' ? 12 : -4)}" font-family="${ts.fontFamily}" font-size="${ts.fontSizeMm * sf}" fill="${ts.color}" text-anchor="middle">${dim.label}</text>`)
  }

  for (const north of annotations.northArrows) {
    const s = north.size
    lines.push(`<g transform="translate(${north.x}, ${north.y})">
      <polygon points="0,${-s} ${s * 0.5},${s} 0,${s * 0.4} ${-s * 0.5},${s}" fill="#333" stroke="none"/>
      <text x="0" y="${-s - 2}" font-size="${0.8 * s}" fill="#333" text-anchor="middle" font-family="Arial">N</text>
    </g>`)
  }

  lines.push('</g>')
  return lines.join('\n')
}

export { getRoomStyle }
