import type { PlanModel, RoomRect, WallSegment, Opening } from '../../domain/plan'
import type { Level, BuildingGraph } from '../../domain/building'
import type { DrawingMode } from './drafting-standards'
import { getDrawingStandards } from './drafting-standards'

// ── Dimension data ────────────────────────────────────────────

export type DimensionSide = 'top' | 'bottom' | 'left' | 'right'

export interface DimensionLine {
  id: string
  side: DimensionSide
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  valueMm: number
  offsetMm: number
}

export interface OverallDimension {
  id: string
  side: DimensionSide
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  valueMm: number
  offsetMm: number
}

export interface OpeningDimension {
  id: string
  wallId: string
  x: number
  y: number
  widthMm: number
  label: string
  side: DimensionSide
}

// ── Level / section markers ───────────────────────────────────

export interface LevelMarker {
  id: string
  x: number
  y: number
  elevation: number
  label: string
}

export interface SectionMarker {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  viewDirection: 'left' | 'right' | 'up' | 'down'
}

export interface CalloutMarker {
  id: string
  cx: number
  cy: number
  detailNumber: number
  sheetReference: string
  radius: number
}

export interface GridBubbleData {
  id: string
  cx: number
  cy: number
  label: string
  axis: 'horizontal' | 'vertical'
}

export interface ScaleBarData {
  x: number
  y: number
  lengthMm: number
  segments: number
  label: string
}

export interface RoomLabel {
  roomId: string
  name: string
  areaM2: number
  cx: number
  cy: number
}

export interface NorthArrow {
  x: number
  y: number
  size: number
}

// ── Annotation set ────────────────────────────────────────────

export interface AnnotationSet {
  planId: string
  dimensions: DimensionLine[]
  overallDimensions: OverallDimension[]
  openingDimensions: OpeningDimension[]
  levelMarkers: LevelMarker[]
  sectionMarkers: SectionMarker[]
  calloutMarkers: CalloutMarker[]
  gridBubbles: GridBubbleData[]
  scaleBars: ScaleBarData[]
  roomLabels: RoomLabel[]
  northArrows: NorthArrow[]
}

// ── Generators ────────────────────────────────────────────────

function computePlanBounds(rooms: RoomRect[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (rooms.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  const minX = Math.min(...rooms.map(r => r.x))
  const minY = Math.min(...rooms.map(r => r.y))
  const maxX = Math.max(...rooms.map(r => r.x + r.width))
  const maxY = Math.max(...rooms.map(r => r.y + r.height))
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

function computeOpeningDimensions(walls: WallSegment[], openings: Opening[]): OpeningDimension[] {
  const results: OpeningDimension[] = []
  for (const opening of openings) {
    const wall = walls.find(w => w.id === opening.wallId)
    if (!wall) continue
    const mx = (wall.start.x + wall.end.x) / 2
    const my = (wall.start.y + wall.end.y) / 2
    const wallLen = Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2)
    if (wallLen === 0) continue
    const w = opening.width * 1000
    const side: DimensionSide = (wall.end.x - wall.start.x) > (wall.end.y - wall.start.y) ? (wall.start.x < wall.end.x ? 'bottom' : 'top') : (wall.start.y < wall.end.y ? 'right' : 'left')
    results.push({
      id: opening.id,
      wallId: opening.wallId,
      x: mx,
      y: my,
      widthMm: w,
      label: `${Math.round(w / 100)}`,
      side,
    })
  }
  return results
}

export function buildAnnotationSet(
  planModel: PlanModel,
  mode: DrawingMode = 'technical',
): AnnotationSet {
  const std = getDrawingStandards(mode)
  const scale = Number(planModel.scaleLabel.replace('1:', '')) || 100
  const bound = computePlanBounds(planModel.rooms)
  const dimOffset = std.dimensionOffsetMm * scale
  const overallOffset = dimOffset + 8 * scale

  const dims: DimensionLine[] = []
  const overalls: OverallDimension[] = []
  const uid = () => Math.random().toString(36).slice(2, 8)

  function addDims(side: DimensionSide, rooms: RoomRect[]) {
    if (rooms.length === 0) return
    const sorted = side === 'top' || side === 'bottom'
      ? [...rooms].sort((a, b) => a.x - b.x)
      : [...rooms].sort((a, b) => a.y - b.y)
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i]
      let x1: number, y1: number, x2: number, y2: number
      if (side === 'top') {
        x1 = r.x; y1 = r.y - dimOffset; x2 = r.x + r.width; y2 = r.y - dimOffset
      } else if (side === 'bottom') {
        x1 = r.x; y1 = r.y + r.height + dimOffset; x2 = r.x + r.width; y2 = r.y + r.height + dimOffset
      } else if (side === 'left') {
        x1 = r.x - dimOffset; y1 = r.y; x2 = r.x - dimOffset; y2 = r.y + r.height
      } else {
        x1 = r.x + r.width + dimOffset; y1 = r.y; x2 = r.x + r.width + dimOffset; y2 = r.y + r.height
      }
      const len = side === 'top' || side === 'bottom' ? r.width : r.height
      const labelVal = Math.round(len * 1000)
      dims.push({
        id: `${uid()}`,
        side,
        x1, y1, x2, y2,
        label: `${labelVal}`,
        valueMm: labelVal,
        offsetMm: dimOffset,
      })
    }
  }

  addDims('top', planModel.rooms)
  addDims('bottom', planModel.rooms)
  addDims('left', planModel.rooms)
  addDims('right', planModel.rooms)

  overalls.push({
    id: `${uid()}`,
    side: 'bottom',
    x1: bound.minX, y1: bound.maxY + overallOffset,
    x2: bound.maxX, y2: bound.maxY + overallOffset,
    label: `${Math.round(bound.width * 1000)}`,
    valueMm: Math.round(bound.width * 1000),
    offsetMm: overallOffset,
  })
  overalls.push({
    id: `${uid()}`,
    side: 'right',
    x1: bound.maxX + overallOffset, y1: bound.minY,
    x2: bound.maxX + overallOffset, y2: bound.maxY,
    label: `${Math.round(bound.height * 1000)}`,
    valueMm: Math.round(bound.height * 1000),
    offsetMm: overallOffset,
  })

  const openingDims = computeOpeningDimensions(planModel.walls, planModel.openings)

  const levelMarkers: LevelMarker[] = []
  const sectionMarkers: SectionMarker[] = []
  const calloutMarkers: CalloutMarker[] = []
  const gridBubbles: GridBubbleData[] = []
  const scaleBars: ScaleBarData[] = []
  const roomLabels: RoomLabel[] = []
  const northArrows: NorthArrow[] = []

  for (const room of planModel.rooms) {
    const cx = room.x + room.width / 2
    const cy = room.y + room.height / 2
    roomLabels.push({
      roomId: room.id,
      name: room.name,
      areaM2: Math.round(room.width * room.height * 100) / 100,
      cx,
      cy,
    })
  }

  northArrows.push({ x: bound.minX + 20, y: bound.minY + 20, size: 12 })

  const barLen = 10 * scale
  scaleBars.push({
    x: bound.maxX - barLen - 20,
    y: bound.maxY + overallOffset + 20,
    lengthMm: barLen,
    segments: 4,
    label: `0  ${(barLen / 1000 / 4).toFixed(0)}m  ${(barLen / 1000 / 2).toFixed(0)}m`,
  })

  return {
    planId: planModel.id,
    dimensions: dims,
    overallDimensions: overalls,
    openingDimensions: openingDims,
    levelMarkers,
    sectionMarkers,
    calloutMarkers,
    gridBubbles,
    scaleBars,
    roomLabels,
    northArrows,
  }
}

export function extractAnnotationsFromBuilding(
  graph: BuildingGraph,
  level: Level,
  mode: DrawingMode = 'technical',
): AnnotationSet {
  const spaces = graph.spaces.filter(s => s.levelId === level.id)
  const walls = graph.walls.filter(w => w.levelId === level.id)

  const rooms: RoomRect[] = spaces.map(s => ({
    id: s.id,
    name: s.name,
    x: s.bbox.minX,
    y: s.bbox.minY,
    width: s.bbox.maxX - s.bbox.minX,
    height: s.bbox.maxY - s.bbox.minY,
  }))

  const wallSegments: WallSegment[] = walls.map(w => ({
    id: w.id,
    start: { x: w.start.x, y: w.start.y },
    end: { x: w.end.x, y: w.end.y },
    thickness: w.thickness,
    type: w.role === 'external' ? 'external' : 'internal',
  }))

  const openings: Opening[] = graph.openings.filter(o => o.levelId === level.id).map(o => ({
    id: o.id,
    wallId: o.wallId,
    kind: o.kind === 'door' ? 'door' : 'window',
    offset: o.offsetRatio,
    width: o.width / 1000,
    height: o.height,
    sillHeight: o.sillHeight,
  }))

  const planModel: PlanModel = {
    id: level.id,
    designOptionId: graph.meta.id,
    width: Math.max(...rooms.map(r => r.x + r.width), 0),
    height: Math.max(...rooms.map(r => r.y + r.height), 0),
    wallThickness: walls.length > 0 ? walls[0].thickness : 0.2,
    rooms,
    walls: wallSegments,
    openings,
    scaleLabel: '1:100',
  }

  return buildAnnotationSet(planModel, mode)
}

export function annotatePlanSvgDimensions(
  annotations: AnnotationSet,
  scale: number,
): string {
  return annotations.dimensions.map(d => {
    const mid = d.side === 'top' || d.side === 'bottom'
      ? (d.x1 + d.x2) / 2
      : (d.y1 + d.y2) / 2
    return `  <line x1="${d.x1}" y1="${d.y1}" x2="${d.x2}" y2="${d.y2}" stroke="currentColor" stroke-width="0.18"/>
  <line x1="${d.x1}" y1="${d.y1}" x2="${d.x1}" y2="${d.y1 + (d.side === 'top' ? -3 : d.side === 'bottom' ? 3 : 0)}" stroke="currentColor" stroke-width="0.18"/>
  <line x1="${d.x2}" y1="${d.y2}" x2="${d.x2}" y2="${d.y2 + (d.side === 'top' ? -3 : d.side === 'bottom' ? 3 : 0)}" stroke="currentColor" stroke-width="0.18"/>
  <text x="${mid}" y="${d.y1 + (d.side === 'top' ? -4 : d.side === 'bottom' ? 14 : 0)}" font-size="${2 * scale / 100}" fill="currentColor" text-anchor="middle" font-family="Arial">${d.label}</text>`
  }).join('\n')
}
