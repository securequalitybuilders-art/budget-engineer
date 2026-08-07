import type { PlanModel, Opening } from '@/domain/plan'
import {
  DEFAULT_STOREY_HEIGHT,
  FALLBACK_WALL_THICKNESS,
  DOOR_DEFAULT_HEIGHT,
  DOOR_DEFAULT_SILL,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_SILL,
  ROOF_PITCH_HEIGHT,
  ROOF_OVERHANG,
} from '@/adapters/planTo3d'

export interface ElevationLine {
  x1: number; y1: number; x2: number; y2: number
  stroke?: string; strokeWidth?: number; dashed?: boolean
}

export interface ElevationRect {
  x: number; y: number; w: number; h: number
  fill?: string; stroke?: string; strokeWidth?: number
}

export interface ElevationPolygon {
  points: { x: number; y: number }[]
  fill?: string; stroke?: string; strokeWidth?: number
}

export interface ElevationText {
  x: number; y: number; text: string
  fontSize?: number; fill?: string; anchor?: string
}

export interface ElevationDrawing {
  lines: ElevationLine[]
  rects: ElevationRect[]
  polygons: ElevationPolygon[]
  texts: ElevationText[]
  viewBox: string
  title: string
}

const WALL_STROKE = '#f8fafc'
const WALL_WIDTH = 0.06
const OPENING_FILL_DOOR = 'rgba(245,158,11,0.18)'
const OPENING_STROKE_DOOR = '#f59e0b'
const OPENING_FILL_WINDOW = 'rgba(56,189,248,0.18)'
const OPENING_STROKE_WINDOW = '#38bdf8'
const DIM_COLOR = '#67e8f9'
const GROUND_STROKE = '#cbd5e1'
const ROOF_FILL = 'rgba(255,255,255,0.08)'
const ROOF_STROKE = '#f8fafc'
const POCHE_FILL = 'rgba(255,255,255,0.12)'
const SLAB_FILL = 'rgba(56,189,248,0.25)'
const GROUND_WIDTH = 0.08
const PADDING = 2

function opHeight(op: Opening): number {
  return op.height ?? (op.kind === 'door' ? DOOR_DEFAULT_HEIGHT : WINDOW_DEFAULT_HEIGHT)
}

function opSill(op: Opening): number {
  return op.sillHeight ?? (op.kind === 'door' ? DOOR_DEFAULT_SILL : WINDOW_DEFAULT_SILL)
}

function wallLen2D(sx: number, sy: number, ex: number, ey: number): number {
  return Math.hypot(ex - sx, ey - sy)
}

export type ElevationFace = 'front' | 'rear' | 'left' | 'right'

interface FaceGeometry {
  bd: number
  wallMatch: (w: PlanModel['walls'][number]) => boolean
  openingCentre: (w: PlanModel['walls'][number], op: Opening) => number
  title: string
}

function faceGeometry(face: ElevationFace, plan: PlanModel): FaceGeometry {
  const eps = 0.05
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
  switch (face) {
    case 'front':
      return {
        bd: plan.width,
        wallMatch: (w) => Math.abs(w.start.y - plan.height) < eps && Math.abs(w.end.y - plan.height) < eps,
        openingCentre: (w, op) => w.start.x + (w.end.x - w.start.x) * clamp01(op.offset),
        title: 'FRONT ELEVATION',
      }
    case 'rear':
      return {
        bd: plan.width,
        wallMatch: (w) => Math.abs(w.start.y) < eps && Math.abs(w.end.y) < eps,
        openingCentre: (w, op) => plan.width - (w.start.x + (w.end.x - w.start.x) * clamp01(op.offset)),
        title: 'REAR ELEVATION',
      }
    case 'left':
      return {
        bd: plan.height,
        wallMatch: (w) => Math.abs(w.start.x) < eps && Math.abs(w.end.x) < eps,
        openingCentre: (w, op) => plan.height - (w.start.y + (w.end.y - w.start.y) * clamp01(op.offset)),
        title: 'LEFT ELEVATION',
      }
    case 'right':
      return {
        bd: plan.height,
        wallMatch: (w) => Math.abs(w.start.x - plan.width) < eps && Math.abs(w.end.x - plan.width) < eps,
        openingCentre: (w, op) => w.start.y + (w.end.y - w.start.y) * clamp01(op.offset),
        title: 'SIDE ELEVATION',
      }
  }
}

function computeElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number,
  pitchHeight: number,
  levelLabels: string[] | undefined,
  face: ElevationFace,
): ElevationDrawing | null {
  if (!plan || plan.width <= 0 || plan.height <= 0 || floors < 1) return null

  const geo = faceGeometry(face, plan)
  const bd = geo.bd
  const wallH = floors * storeyHeight
  const totalH = wallH + pitchHeight
  const svgW = bd + PADDING * 2
  const svgH = totalH + PADDING * 2

  const groundY = svgH - PADDING
  const eaveY = groundY - wallH
  const ridgeY = eaveY - pitchHeight
  const ridgeCx = PADDING + bd / 2

  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const polygons: ElevationPolygon[] = []
  const texts: ElevationText[] = []

  // Ground line
  lines.push({ x1: 0, y1: groundY, x2: svgW, y2: groundY, stroke: GROUND_STROKE, strokeWidth: GROUND_WIDTH })

  // Building walls outline
  lines.push({ x1: PADDING, y1: eaveY, x2: PADDING + bd, y2: eaveY, stroke: WALL_STROKE, strokeWidth: WALL_WIDTH })
  lines.push({ x1: PADDING, y1: groundY, x2: PADDING, y2: eaveY, stroke: WALL_STROKE, strokeWidth: WALL_WIDTH })
  lines.push({ x1: PADDING + bd, y1: groundY, x2: PADDING + bd, y2: eaveY, stroke: WALL_STROKE, strokeWidth: WALL_WIDTH })

  // Gable roof triangle (gable faces see the full triangle; side faces see the half-span profile)
  const roofOverhang = ROOF_OVERHANG
  polygons.push({
    points: [
      { x: PADDING - roofOverhang, y: eaveY },
      { x: ridgeCx, y: ridgeY },
      { x: PADDING + bd + roofOverhang, y: eaveY },
    ],
    fill: ROOF_FILL,
    stroke: ROOF_STROKE,
    strokeWidth: WALL_WIDTH,
  })

  const faceWalls = plan.walls.filter(geo.wallMatch)

  for (const op of plan.openings) {
    const wall = faceWalls.find(w => w.id === op.wallId)
    if (!wall) continue
    const wl = wallLen2D(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
    if (wl < 0.01) continue
    const centreX = geo.openingCentre(wall, op)
    const halfW = op.width / 2
    const x1 = PADDING + centreX - halfW
    const x2 = PADDING + centreX + halfW
    const opH = opHeight(op)
    const opS = opSill(op)

    for (let si = 0; si < floors; si++) {
      const floorBaseY = groundY - si * storeyHeight
      const topY = floorBaseY - opS - opH
      const botY = floorBaseY - opS
      rects.push({
        x: x1, y: topY, w: x2 - x1, h: botY - topY,
        fill: op.kind === 'door' ? OPENING_FILL_DOOR : OPENING_FILL_WINDOW,
        stroke: op.kind === 'door' ? OPENING_STROKE_DOOR : OPENING_STROKE_WINDOW,
        strokeWidth: 0.08,
      })
    }
  }

  // Level labels on the right side
  for (let si = 0; si < floors; si++) {
    const midY = groundY - si * storeyHeight - storeyHeight / 2
    const label = levelLabels?.[si] ?? `Fl ${si + 1}`
    texts.push({
      x: PADDING + bd + 0.3, y: midY + 0.15,
      text: label,
      fontSize: 0.3, fill: DIM_COLOR, anchor: 'start',
    })
  }

  // Dimension: building face width
  texts.push({
    x: PADDING + bd / 2, y: groundY + 0.6,
    text: `${bd.toFixed(1)} m`,
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'middle',
  })

  // Dimension: wall height (left side)
  texts.push({
    x: PADDING - 0.7, y: (groundY + eaveY) / 2 + 0.15,
    text: `${wallH.toFixed(1)} m`,
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'end',
  })

  // Dimension: ridge height
  texts.push({
    x: ridgeCx, y: ridgeY - 0.4,
    text: `RL ${(wallH + pitchHeight).toFixed(2)}`,
    fontSize: 0.35, fill: DIM_COLOR, anchor: 'middle',
  })

  return { lines, rects, polygons, texts, viewBox: `0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}`, title: geo.title }
}

export function computeFrontElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
): ElevationDrawing | null {
  return computeElevation(plan, floors, storeyHeight, pitchHeight, levelLabels, 'front')
}

export function computeSideElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
): ElevationDrawing | null {
  return computeElevation(plan, floors, storeyHeight, pitchHeight, levelLabels, 'right')
}

export function computeRearElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
): ElevationDrawing | null {
  return computeElevation(plan, floors, storeyHeight, pitchHeight, levelLabels, 'rear')
}

export function computeLeftElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
): ElevationDrawing | null {
  return computeElevation(plan, floors, storeyHeight, pitchHeight, levelLabels, 'left')
}

export function computeRightElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
): ElevationDrawing | null {
  return computeElevation(plan, floors, storeyHeight, pitchHeight, levelLabels, 'right')
}

export function computeSection(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
): ElevationDrawing | null {
  if (!plan || plan.width <= 0 || plan.height <= 0 || floors < 1) return null

  // Section cut along X axis through the middle of the building
  const cutY = plan.height / 2
  const bw = plan.width
  const wallH = floors * storeyHeight
  const totalH = wallH + pitchHeight
  const svgW = bw + PADDING * 2
  const svgH = totalH + PADDING * 2 + 0.8

  const groundY = svgH - PADDING
  const eaveY = groundY - wallH
  const ridgeY = eaveY - pitchHeight
  const ridgeCx = PADDING + bw / 2

  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const polygons: ElevationPolygon[] = []
  const texts: ElevationText[] = []

  // Ground line (thicker)
  lines.push({ x1: 0, y1: groundY, x2: svgW, y2: groundY, stroke: GROUND_STROKE, strokeWidth: GROUND_WIDTH })

  // Ground hatching below
  const hatchSpacing = 0.3
  for (let hx = 0; hx < svgW; hx += hatchSpacing) {
    lines.push({
      x1: hx, y1: groundY, x2: hx + hatchSpacing * 0.6, y2: groundY + 0.5,
      stroke: 'rgba(203,213,225,0.2)', strokeWidth: 0.02,
    })
  }

  // Floor slabs (horizontal thick lines across full width) — differentiated by level
  for (let si = 0; si <= floors; si++) {
    const slabY = groundY - si * storeyHeight
    const isGroundSlab = si === 0
    const isRoofSlab = si === floors
    // Ground slab thicker, roof slab thinner, intermediate slabs standard
    const slabH = isGroundSlab ? 0.15 : isRoofSlab ? 0.10 : 0.12
    const slabColor = isGroundSlab ? 'rgba(74,222,128,0.35)' : isRoofSlab ? 'rgba(251,191,36,0.30)' : SLAB_FILL
    rects.push({
      x: PADDING, y: slabY - slabH / 2, w: bw, h: slabH,
      fill: slabColor, stroke: isGroundSlab ? '#22c55e' : isRoofSlab ? '#f59e0b' : '#38bdf8', strokeWidth: 0.04,
    })
  }

  // Walls that cross the cut plane (y ≈ cutY)
  const cutWalls = plan.walls.filter(w => {
    const minWy = Math.min(w.start.y, w.end.y)
    const maxWy = Math.max(w.start.y, w.end.y)
    return minWy <= cutY && maxWy >= cutY
  })

  for (const wall of cutWalls) {
    // Project wall onto X axis at the cut plane
    const wl = wallLen2D(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
    if (wl < 0.01) continue
    if (Math.abs(wall.end.y - wall.start.y) < 0.001) continue
    // Linearly interpolate X at cutY
    const t = wl > 0 ? (cutY - wall.start.y) / (wall.end.y - wall.start.y) : 0
    const cx = wall.start.x + (wall.end.x - wall.start.x) * t
    const wallThk = wall.thickness || plan.wallThickness || FALLBACK_WALL_THICKNESS

    // Cut walls shown as poché columns, full height
    const wx = PADDING + cx - wallThk / 2
    for (let si = 0; si < floors; si++) {
      const slabY = groundY - si * storeyHeight
      const nextSlabY = groundY - (si + 1) * storeyHeight
      rects.push({
        x: wx, y: nextSlabY, w: wallThk, h: slabY - nextSlabY,
        fill: POCHE_FILL, stroke: WALL_STROKE, strokeWidth: 0.04,
      })
    }
  }

  // Roof profile above top storey
  polygons.push({
    points: [
      { x: PADDING - ROOF_OVERHANG, y: eaveY },
      { x: ridgeCx, y: ridgeY },
      { x: PADDING + bw + ROOF_OVERHANG, y: eaveY },
    ],
    fill: ROOF_FILL,
    stroke: ROOF_STROKE,
    strokeWidth: WALL_WIDTH,
  })

  // Storey height annotations — show level-specific labels when available
  for (let si = 0; si < floors; si++) {
    const midY = groundY - si * storeyHeight - storeyHeight / 2
    const label = levelLabels?.[si] ?? `Fl ${si + 1}`
    texts.push({
      x: PADDING + bw + 0.4, y: midY + 0.15,
      text: label,
      fontSize: 0.35, fill: DIM_COLOR, anchor: 'start',
    })
  }

  // Dimension notes
  texts.push({
    x: PADDING + bw / 2, y: groundY + 0.6,
    text: `${bw.toFixed(1)} m`,
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'middle',
  })
  texts.push({
    x: ridgeCx, y: ridgeY - 0.4,
    text: `RL ${(wallH + pitchHeight).toFixed(2)}`,
    fontSize: 0.35, fill: DIM_COLOR, anchor: 'middle',
  })

  return { lines, rects, polygons, texts, viewBox: `0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}`, title: 'SECTION A-A' }
}

export function emptyDrawing(title?: string): ElevationDrawing {
  return {
    lines: [],
    rects: [],
    polygons: [],
    texts: [{ x: 10, y: 10, text: 'Drawing unavailable — no active plan', fontSize: 0.6, fill: '#a1a1aa' }],
    viewBox: '0 0 20 20',
    title: title ?? 'DRAWING',
  }
}
