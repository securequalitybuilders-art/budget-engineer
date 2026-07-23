import type { PlanModel, Opening, RoomRect } from '@/domain/plan'
import type { ElevationDrawing, ElevationLine, ElevationRect, ElevationPolygon, ElevationText } from '@/adapters/planToElevations'
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
import { getFacadeStyle, type FacadeStyle } from '@/adapters/facadeStyle'
import {
  renderBrickCoursing,
  renderStonePlinth,
  renderLouverWindow,
  renderClerestoryWindow,
  renderTransomWindow,
  renderGroupedWindow,
  renderWindowHood,
  renderStairSection,
  renderParapetCoping,
} from '@/adapters/materialTextures'

export type RoomClassification =
  | 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining'
  | 'entrance' | 'prayer' | 'study' | 'utility' | 'circulation' | 'unknown'

export interface StructuralBay {
  x: number
  width: number
  roomId: string | null
  roomName: string | null
}

export interface OpeningFamily {
  family: 'main-entry' | 'secondary-entry' | 'louver' | 'sliding' | 'casement' | 'fixed'
  hostRoomType: RoomClassification
  width: number
  height: number
  sillHeight: number
}

const ROOM_KEYWORDS: Record<string, RoomClassification> = {
  bedroom: 'bedroom', 'bed room': 'bedroom', 'b/r': 'bedroom', 'b.room': 'bedroom',
  bathroom: 'bathroom', 'bath': 'bathroom', 'washroom': 'bathroom', 'toilet': 'bathroom', 'w/c': 'bathroom', 'restroom': 'bathroom',
  kitchen: 'kitchen', 'k/t': 'kitchen', pantry: 'kitchen',
  living: 'living', 'living room': 'living', lounge: 'living', 'family room': 'living', 'sitting room': 'living',
  dining: 'dining', 'dining room': 'dining', 'd/hall': 'dining',
  entrance: 'entrance', 'foyer': 'entrance', 'entry': 'entrance', 'porch': 'entrance', 'vestibule': 'entrance',
  prayer: 'prayer', 'mosque': 'prayer', 'prayer room': 'prayer', 'musalla': 'prayer', 'chapel': 'prayer',
  study: 'study', 'office': 'study', 'library': 'study', 'den': 'study',
  utility: 'utility', 'laundry': 'utility', 'store': 'utility', 'storage': 'utility', 'boiler': 'utility', 'plant': 'utility',
  circulation: 'circulation', 'corridor': 'circulation', 'hall': 'circulation', 'lobby': 'circulation', 'passage': 'circulation', 'stair': 'circulation', 'landing': 'circulation',
}

export function classifyRoom(name: string): RoomClassification {
  const lower = name.toLowerCase().trim()
  for (const [keyword, classification] of Object.entries(ROOM_KEYWORDS)) {
    if (lower === keyword || lower.startsWith(keyword + ' ') || lower.startsWith(keyword + '/') || lower.endsWith(' ' + keyword) || lower.includes(' ' + keyword + ' ')) {
      return classification
    }
  }
  return 'unknown'
}

export function deriveStructuralBays(plan: PlanModel, _floors: number): StructuralBay[] {
  if (!plan.rooms || plan.rooms.length === 0) return [{ x: 0, width: plan.width, roomId: null, roomName: null }]

  const boundaries = new Set<number>()
  boundaries.add(0)
  boundaries.add(plan.width)

  for (const room of plan.rooms) {
    boundaries.add(room.x)
    boundaries.add(room.x + room.width)
  }

  const sorted = [...boundaries].filter(b => b >= 0 && b <= plan.width).sort((a, b) => a - b)
  const bays: StructuralBay[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const x = sorted[i]
    const width = sorted[i + 1] - x
    if (width < 0.01) continue

    let hostRoom: RoomRect | null = null
    for (const room of plan.rooms) {
      const cx = x + width / 2
      if (cx >= room.x - 0.01 && cx <= room.x + room.width + 0.01) {
        if (!hostRoom || room.x <= hostRoom.x) {
          hostRoom = room
        }
      }
    }

    bays.push({
      x,
      width,
      roomId: hostRoom?.id ?? null,
      roomName: hostRoom?.name ?? null,
    })
  }

  return bays
}

export function findOpeningHostRoom(opening: Opening, plan: PlanModel): RoomRect | null {
  const wall = plan.walls.find(w => w.id === opening.wallId)
  if (!wall) return null

  const wallDx = wall.end.x - wall.start.x
  const wallDy = wall.end.y - wall.start.y
  const wallLen = Math.hypot(wallDx, wallDy)
  if (wallLen < 0.01) return null

  const centreRatio = Math.max(0, Math.min(1, opening.offset))
  const opCx = wall.start.x + wallDx * centreRatio
  const opCy = wall.start.y + wallDy * centreRatio

  let bestRoom: RoomRect | null = null
  let bestDist = Infinity

  for (const room of plan.rooms) {
    const rCx = room.x + room.width / 2
    const rCy = room.y + room.height / 2
    const dist = Math.hypot(opCx - rCx, opCy - rCy)
    if (dist < bestDist) {
      bestDist = dist
      bestRoom = room
    }
  }

  return bestRoom
}

export function classifyOpening(opening: Opening, hostRoomType: RoomClassification): OpeningFamily {
  const width = opening.width
  const kind = opening.kind
  const host = hostRoomType

  if (kind === 'door') {
    if (host === 'entrance' || width >= 1.2) {
      return { family: 'main-entry', hostRoomType: host, width, height: opening.height ?? DOOR_DEFAULT_HEIGHT, sillHeight: opening.sillHeight ?? DOOR_DEFAULT_SILL }
    }
    if (host === 'utility' || host === 'bathroom' || width <= 0.7) {
      return { family: 'secondary-entry', hostRoomType: host, width, height: opening.height ?? DOOR_DEFAULT_HEIGHT, sillHeight: opening.sillHeight ?? DOOR_DEFAULT_SILL }
    }
    return { family: 'secondary-entry', hostRoomType: host, width, height: opening.height ?? DOOR_DEFAULT_HEIGHT, sillHeight: opening.sillHeight ?? DOOR_DEFAULT_SILL }
  }

  if (kind === 'window') {
    if (width >= 2.0) {
      return { family: 'sliding', hostRoomType: host, width, height: opening.height ?? WINDOW_DEFAULT_HEIGHT, sillHeight: opening.sillHeight ?? WINDOW_DEFAULT_SILL }
    }
    if (host === 'bathroom' || host === 'utility') {
      return { family: 'louver', hostRoomType: host, width, height: opening.height ?? 0.6, sillHeight: opening.sillHeight ?? 1.5 }
    }
    if (host === 'living' || host === 'dining') {
      return { family: 'casement', hostRoomType: host, width, height: opening.height ?? WINDOW_DEFAULT_HEIGHT, sillHeight: opening.sillHeight ?? WINDOW_DEFAULT_SILL }
    }
    return { family: 'casement', hostRoomType: host, width, height: opening.height ?? WINDOW_DEFAULT_HEIGHT, sillHeight: opening.sillHeight ?? WINDOW_DEFAULT_SILL }
  }

  return { family: 'fixed', hostRoomType: host, width, height: 1.0, sillHeight: 0.9 }
}

export function formatDimMm(m: number): string {
  const mm = Math.round(m * 1000)
  if (mm === 0) return '0'
  const parts: string[] = []
  const str = mm.toString()
  for (let i = str.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3)
    parts.unshift(str.slice(start, i))
  }
  return parts.join(' ')
}

export function formatLevel(elevation: number): string {
  if (Math.abs(elevation) < 0.001) return '±0.000'
  const sign = elevation > 0 ? '+' : ''
  return `${sign}${elevation.toFixed(3)}`
}

function getFrontWalls(plan: PlanModel) {
  return plan.walls.filter(w =>
    Math.abs(w.start.y - plan.height) < 0.05 && Math.abs(w.end.y - plan.height) < 0.05,
  )
}

function getSideWalls(plan: PlanModel) {
  return plan.walls.filter(w =>
    Math.abs(w.start.x - plan.width) < 0.05 && Math.abs(w.end.x - plan.width) < 0.05,
  )
}

function wallLen2D(sx: number, sy: number, ex: number, ey: number): number {
  return Math.hypot(ex - sx, ey - sy)
}

function opHeight(op: Opening): number {
  return op.height ?? (op.kind === 'door' ? DOOR_DEFAULT_HEIGHT : WINDOW_DEFAULT_HEIGHT)
}

function opSill(op: Opening): number {
  return op.sillHeight ?? (op.kind === 'door' ? DOOR_DEFAULT_SILL : WINDOW_DEFAULT_SILL)
}

const WALL_WIDTH = 0.06
const DIM_COLOR = '#cc0000'
const GROUND_STROKE = '#cbd5e1'
const PADDING = 2
const DPC_COLOR = '#dc2626'
const DOOR_FILL = '#d4a574'
const DOOR_FRAME = '#92400e'
const DOOR_THRESHOLD = '#a8a29e'
const WINDOW_GLASS = '#7dd3fc'
const WINDOW_FRAME = '#0284c7'
const WINDOW_SILL = '#a8a29e'
const CUT_WALL_FILL = '#e8e0d0'
const CUT_HATCH = '#c4b8a8'
const FLOOR_SLAB_FILL = '#c8bdb0'
const FOUNDATION_FILL = '#6b7280'

function styleFor(buildingType?: string): FacadeStyle {
  return getFacadeStyle(buildingType ?? '')
}

export function computeEnhancedFrontElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
  buildingType?: string,
): ElevationDrawing | null {
  if (!plan || plan.width <= 0 || plan.height <= 0 || floors < 1) return null

  const bw = plan.width
  const wallH = floors * storeyHeight
  const totalH = wallH + pitchHeight
  const svgW = bw + PADDING * 2
  const svgH = totalH + PADDING * 2

  const groundY = svgH - PADDING
  const eaveY = groundY - wallH
  const ridgeY = eaveY - pitchHeight
  const ridgeCx = PADDING + bw / 2

  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const polygons: ElevationPolygon[] = []
  const texts: ElevationText[] = []

  const style = styleFor(buildingType)
  const frontWalls = getFrontWalls(plan)
  let windowTagCounter = 0
  let doorTagCounter = 0

  lines.push({ x1: 0, y1: groundY, x2: svgW, y2: groundY, stroke: GROUND_STROKE, strokeWidth: 0.08 })

  if (plan.rooms && plan.rooms.length > 0) {
    const bays = deriveStructuralBays(plan, floors)
    for (const bay of bays) {
      if (bay.width < 0.1) continue
      const bx = PADDING + bay.x
      const bx2 = PADDING + bay.x + bay.width
      lines.push({
        x1: bx, y1: eaveY, x2: bx2, y2: eaveY,
        stroke: style.wallStroke, strokeWidth: WALL_WIDTH,
      })
      lines.push({
        x1: bx, y1: groundY, x2: bx, y2: eaveY,
        stroke: style.wallStroke, strokeWidth: WALL_WIDTH,
      })
      lines.push({
        x1: bx2, y1: groundY, x2: bx2, y2: eaveY,
        stroke: style.wallStroke, strokeWidth: WALL_WIDTH,
      })
    }
  } else {
    lines.push({ x1: PADDING, y1: eaveY, x2: PADDING + bw, y2: eaveY, stroke: style.wallStroke, strokeWidth: WALL_WIDTH })
    lines.push({ x1: PADDING, y1: groundY, x2: PADDING, y2: eaveY, stroke: style.wallStroke, strokeWidth: WALL_WIDTH })
    lines.push({ x1: PADDING + bw, y1: groundY, x2: PADDING + bw, y2: eaveY, stroke: style.wallStroke, strokeWidth: WALL_WIDTH })
  }

  polygons.push({
    points: [
      { x: PADDING - ROOF_OVERHANG, y: eaveY },
      { x: ridgeCx, y: ridgeY },
      { x: PADDING + bw + ROOF_OVERHANG, y: eaveY },
    ],
    fill: style.roofFill,
    stroke: style.roofStroke,
    strokeWidth: WALL_WIDTH,
  })

  const brickTex = renderBrickCoursing(PADDING, eaveY, bw, wallH)
  lines.push(...brickTex.lines)

  for (const op of plan.openings) {
    const wall = frontWalls.find(w => w.id === op.wallId)
    if (!wall) continue
    const wl = wallLen2D(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
    if (wl < 0.01) continue
    const centreX = wall.start.x + (wall.end.x - wall.start.x) * Math.max(0, Math.min(1, op.offset))
    const halfW = op.width / 2
    const x1 = PADDING + centreX - halfW
    const x2 = PADDING + centreX + halfW
    const opH = opHeight(op)
    const opS = opSill(op)

    const hostRoom = findOpeningHostRoom(op, plan)
    const roomType = hostRoom ? classifyRoom(hostRoom.name) : 'unknown'
    const family = classifyOpening(op, roomType)

    for (let si = 0; si < floors; si++) {
      const floorBaseY = groundY - si * storeyHeight
      const topY = floorBaseY - opS - opH
      const botY = floorBaseY - opS

      const isDoor = op.kind === 'door'
      const fill = isDoor ? (family.family === 'main-entry' ? DOOR_FILL : 'rgba(245,158,11,0.18)') : WINDOW_GLASS

      rects.push({
        x: x1, y: topY, w: x2 - x1, h: botY - topY,
        fill,
        stroke: isDoor ? DOOR_FRAME : WINDOW_FRAME,
        strokeWidth: 0.08,
      })

      lines.push({
        x1: x1, y1: topY, x2: x2, y2: topY,
        stroke: isDoor ? DOOR_FRAME : WINDOW_FRAME,
        strokeWidth: 0.04,
      })
      lines.push({
        x1: x1, y1: botY, x2: x2, y2: botY,
        stroke: isDoor ? DOOR_FRAME : WINDOW_FRAME,
        strokeWidth: 0.04,
      })

      const w = x2 - x1
      const h = botY - topY

      if (isDoor) {
        rects.push({
          x: x1, y: botY - 0.04, w: w, h: 0.04,
          fill: DOOR_THRESHOLD, stroke: 'none',
        })

        if (family.family === 'main-entry') {
          const midX = (x1 + x2) / 2
          lines.push({
            x1: midX, y1: topY + 0.1, x2: midX, y2: botY - 0.04,
            stroke: DOOR_FRAME, strokeWidth: 0.03,
          })
        }
      } else {
        if (family.family === 'louver') {
          const tex = renderLouverWindow(x1, topY, w, h)
          rects.push(...tex.rects)
          lines.push(...tex.lines)
        } else if (family.family === 'sliding') {
          const tex = renderGroupedWindow(x1, topY, w, h, 3)
          rects.push(...tex.rects)
          lines.push(...tex.lines)
        } else if (w > 2.0) {
          const tex = renderTransomWindow(x1, topY, w, h)
          rects.push(...tex.rects)
          lines.push(...tex.lines)
        } else if (roomType === 'living' || roomType === 'dining') {
          const tex = renderClerestoryWindow(x1, topY, w, h)
          rects.push(...tex.rects)
          lines.push(...tex.lines)
        } else {
          rects.push({
            x: x1, y: topY, w, h,
            fill: WINDOW_GLASS, stroke: WINDOW_FRAME, strokeWidth: 0.05,
          })
          const midY = (topY + botY) / 2
          lines.push({
            x1: x1, y1: midY, x2: x2, y2: midY,
            stroke: WINDOW_FRAME, strokeWidth: 0.02,
            dashed: true,
          })
          if (w > 1.5) {
            const thirdX = x1 + w / 3
            const twoThirdX = x1 + 2 * w / 3
            lines.push({
              x1: thirdX, y1: topY, x2: thirdX, y2: botY,
              stroke: WINDOW_FRAME, strokeWidth: 0.02,
            })
            lines.push({
              x1: twoThirdX, y1: topY, x2: twoThirdX, y2: botY,
              stroke: WINDOW_FRAME, strokeWidth: 0.02,
            })
          }
        }

        rects.push({
          x: x1 - 0.04, y: botY, w: w + 0.08, h: 0.05,
          fill: WINDOW_SILL, stroke: 'none',
        })
        rects.push({
          x: x1 - 0.03, y: topY - 0.05, w: w + 0.06, h: 0.04,
          fill: WINDOW_SILL, stroke: 'none',
        })
      }

      if (!isDoor && (roomType === 'living' || roomType === 'dining' || family.family === 'main-entry')) {
        const hoodTex = renderWindowHood(x1, topY, w, h)
        polygons.push(...hoodTex.polygons)
        lines.push(...hoodTex.lines)
      }

      if (isDoor) {
        doorTagCounter++
        texts.push({
          x: (x1 + x2) / 2, y: topY - 0.08,
          text: `D${String(doorTagCounter).padStart(2, '0')}`,
          fontSize: 0.14, fill: DIM_COLOR, anchor: 'middle',
        })
      } else {
        windowTagCounter++
        texts.push({
          x: (x1 + x2) / 2, y: botY + 0.12,
          text: `W${String(windowTagCounter).padStart(2, '0')}`,
          fontSize: 0.14, fill: DIM_COLOR, anchor: 'middle',
        })
      }
    }
  }

  const plinthH = 0.3
  for (let si = 0; si < floors; si++) {
    const floorBaseY = groundY - si * storeyHeight

    const stoneTex = renderStonePlinth(PADDING - 0.1, floorBaseY - plinthH, bw + 0.2, plinthH)
    rects.push(...stoneTex.rects)
    lines.push(...stoneTex.lines)

    if (si === 0) {
      lines.push({
        x1: PADDING - 0.1, y1: floorBaseY - plinthH * 0.6, x2: PADDING + bw + 0.1, y2: floorBaseY - plinthH * 0.6,
        stroke: DPC_COLOR, strokeWidth: 0.02, dashed: true,
      })
    }
  }

  const fasciaH = 0.12
  rects.push({
    x: PADDING - ROOF_OVERHANG, y: eaveY - fasciaH, w: bw + ROOF_OVERHANG * 2, h: fasciaH,
    fill: style.fasciaFill, stroke: style.fasciaStroke, strokeWidth: 0.03,
  })

  if (style.accentBandCount > 0) {
    const bandH = 0.06
    for (let bi = 0; bi < style.accentBandCount; bi++) {
      const bandY = eaveY - fasciaH - (bi + 1) * (storeyHeight / (style.accentBandCount + 1))
      lines.push({
        x1: PADDING, y1: bandY, x2: PADDING + bw, y2: bandY,
        stroke: style.accentBandColor, strokeWidth: bandH,
      })
    }
  }

  if (style.hasQuoins) {
    const qw = 0.12
    for (let si = 0; si < floors; si++) {
      for (let qi = 0; qi < 4; qi++) {
        const qx = qi < 2 ? PADDING - qw / 2 : PADDING + bw - qw / 2
        const qy = groundY - si * storeyHeight - qi * (storeyHeight / 4)
        rects.push({
          x: qx, y: qy - qw / 2, w: qw, h: qw,
          fill: style.plinthStroke, stroke: 'none',
        })
      }
    }
  }

  if (style.hasVerandah && style.verandahDepth > 0) {
    const vd = Math.min(style.verandahDepth, bw * 0.3)
    const vx = PADDING + (bw - vd) / 2
    const vy = groundY + 0.1
    rects.push({
      x: vx, y: vy, w: vd, h: 0.05,
      fill: style.plinthStroke, stroke: 'none',
    })
    lines.push({
      x1: vx, y1: vy + 0.05, x2: vx + vd, y2: vy + 0.05,
      stroke: style.plinthStroke, strokeWidth: 0.02, dashed: true,
    })
    texts.push({
      x: PADDING + bw / 2, y: vy + 0.3,
      text: `VERANDAH ${style.verandahDepth.toFixed(1)}m`,
      fontSize: 0.2, fill: DIM_COLOR, anchor: 'middle',
    })
  }

  if (style.hasPortico && style.porticoWidth > 0) {
    const pw2 = Math.min(style.porticoWidth, bw * 0.5)
    const px = PADDING + (bw - pw2) / 2
    const py = groundY + 0.5
    rects.push({
      x: px, y: py, w: pw2, h: 0.04,
      fill: style.accentBandColor, stroke: 'none',
    })
    texts.push({
      x: PADDING + bw / 2, y: py + 0.3,
      text: 'PORTICO',
      fontSize: 0.22, fill: DIM_COLOR, anchor: 'middle',
    })
  }

  for (let si = 0; si < floors; si++) {
    const midY = groundY - si * storeyHeight - storeyHeight / 2
    const label = levelLabels?.[si] ?? `Fl ${si + 1}`
    texts.push({
      x: PADDING + bw + 0.3, y: midY + 0.15,
      text: label,
      fontSize: 0.3, fill: DIM_COLOR, anchor: 'start',
    })
  }

  texts.push({
    x: PADDING + bw / 2, y: groundY + 0.6,
    text: formatDimMm(bw),
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'middle',
  })

  // Per-storey vertical dimensions (left side)
  for (let si = 0; si < floors; si++) {
    const topY = groundY - (si + 1) * storeyHeight
    const botY = groundY - si * storeyHeight
    const midY = (topY + botY) / 2
    const dimLabel = formatDimMm(storeyHeight)
    const dimX = PADDING - 0.4
    lines.push({
      x1: dimX, y1: topY + 0.05, x2: dimX, y2: botY - 0.05,
      stroke: DIM_COLOR, strokeWidth: 0.015,
    })
    lines.push({
      x1: dimX - 0.08, y1: topY + 0.05, x2: dimX + 0.08, y2: topY + 0.05,
      stroke: DIM_COLOR, strokeWidth: 0.015,
    })
    lines.push({
      x1: dimX - 0.08, y1: botY - 0.05, x2: dimX + 0.08, y2: botY - 0.05,
      stroke: DIM_COLOR, strokeWidth: 0.015,
    })
    texts.push({
      x: dimX - 0.12, y: midY + 0.05,
      text: dimLabel,
      fontSize: 0.2, fill: DIM_COLOR, anchor: 'end',
    })
  }

  texts.push({
    x: PADDING - 0.7, y: (groundY + eaveY) / 2 + 0.15,
    text: formatDimMm(wallH),
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'end',
  })

  texts.push({
    x: ridgeCx, y: ridgeY - 0.4,
    text: formatLevel(wallH + pitchHeight),
    fontSize: 0.35, fill: DIM_COLOR, anchor: 'middle',
  })

  for (let si = 0; si <= floors; si++) {
    const elev = si * storeyHeight
    texts.push({
      x: PADDING + bw + 0.1, y: groundY - si * storeyHeight + 0.1,
      text: formatLevel(elev),
      fontSize: 0.25, fill: DIM_COLOR, anchor: 'start',
    })
  }

  return { lines, rects, polygons, texts, viewBox: `0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}`, title: 'FRONT ELEVATION' }
}

export function computeEnhancedSideElevation(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
  buildingType?: string,
): ElevationDrawing | null {
  if (!plan || plan.width <= 0 || plan.height <= 0 || floors < 1) return null

  const bd = plan.height
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

  const style = styleFor(buildingType)
  const sideWalls = getSideWalls(plan)

  lines.push({ x1: 0, y1: groundY, x2: svgW, y2: groundY, stroke: GROUND_STROKE, strokeWidth: 0.08 })

  lines.push({ x1: PADDING, y1: eaveY, x2: PADDING + bd, y2: eaveY, stroke: style.wallStroke, strokeWidth: WALL_WIDTH })
  lines.push({ x1: PADDING, y1: groundY, x2: PADDING, y2: eaveY, stroke: style.wallStroke, strokeWidth: WALL_WIDTH })
  lines.push({ x1: PADDING + bd, y1: groundY, x2: PADDING + bd, y2: eaveY, stroke: style.wallStroke, strokeWidth: WALL_WIDTH })

  polygons.push({
    points: [
      { x: PADDING, y: eaveY },
      { x: ridgeCx, y: ridgeY },
      { x: PADDING + bd, y: eaveY },
    ],
    fill: style.roofFill,
    stroke: style.roofStroke,
    strokeWidth: WALL_WIDTH,
  })

  const sideBrickTex = renderBrickCoursing(PADDING, eaveY, bd, wallH)
  lines.push(...sideBrickTex.lines)

  for (const op of plan.openings) {
    const wall = sideWalls.find(w => w.id === op.wallId)
    if (!wall) continue
    const wl = wallLen2D(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
    if (wl < 0.01) continue
    const centreY = wall.start.y + (wall.end.y - wall.start.y) * Math.max(0, Math.min(1, op.offset))
    const halfW = op.width / 2
    const x1 = PADDING + centreY - halfW
    const x2 = PADDING + centreY + halfW
    const opH = opHeight(op)
    const opS = opSill(op)

    for (let si = 0; si < floors; si++) {
      const floorBaseY = groundY - si * storeyHeight
      const topY = floorBaseY - opS - opH
      const botY = floorBaseY - opS
      const isDoor = op.kind === 'door'
      rects.push({
        x: x1, y: topY, w: x2 - x1, h: botY - topY,
        fill: isDoor ? DOOR_FILL : WINDOW_GLASS,
        stroke: isDoor ? DOOR_FRAME : WINDOW_FRAME,
        strokeWidth: 0.08,
      })
    }
  }

  const plinthH = 0.3
  for (let si = 0; si < floors; si++) {
    const floorBaseY = groundY - si * storeyHeight
    rects.push({
      x: PADDING - 0.1, y: floorBaseY - plinthH, w: bd + 0.2, h: plinthH,
      fill: style.plinthFill, stroke: style.plinthStroke, strokeWidth: 0.03,
    })
    if (si === 0) {
      lines.push({
        x1: PADDING - 0.1, y1: floorBaseY - plinthH * 0.6, x2: PADDING + bd + 0.1, y2: floorBaseY - plinthH * 0.6,
        stroke: DPC_COLOR, strokeWidth: 0.02, dashed: true,
      })
    }
  }

  const fasciaH = 0.12
  rects.push({
    x: PADDING, y: eaveY - fasciaH, w: bd, h: fasciaH,
    fill: style.fasciaFill, stroke: style.fasciaStroke, strokeWidth: 0.03,
  })

  for (let si = 0; si < floors; si++) {
    const midY = groundY - si * storeyHeight - storeyHeight / 2
    const label = levelLabels?.[si] ?? `Fl ${si + 1}`
    texts.push({
      x: PADDING + bd + 0.3, y: midY + 0.15,
      text: label,
      fontSize: 0.3, fill: DIM_COLOR, anchor: 'start',
    })
  }

  texts.push({
    x: PADDING + bd / 2, y: groundY + 0.6,
    text: formatDimMm(bd),
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'middle',
  })
  texts.push({
    x: PADDING - 0.7, y: (groundY + eaveY) / 2 + 0.15,
    text: formatDimMm(wallH),
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'end',
  })
  texts.push({
    x: ridgeCx, y: ridgeY - 0.4,
    text: formatLevel(wallH + pitchHeight),
    fontSize: 0.35, fill: DIM_COLOR, anchor: 'middle',
  })

  for (let si = 0; si <= floors; si++) {
    const elev = si * storeyHeight
    texts.push({
      x: PADDING + bd + 0.1, y: groundY - si * storeyHeight + 0.1,
      text: formatLevel(elev),
      fontSize: 0.25, fill: DIM_COLOR, anchor: 'start',
    })
  }

  return { lines, rects, polygons, texts, viewBox: `0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}`, title: 'SIDE ELEVATION' }
}

export function computeEnhancedSection(
  plan: PlanModel,
  floors: number,
  storeyHeight: number = DEFAULT_STOREY_HEIGHT,
  pitchHeight: number = ROOF_PITCH_HEIGHT,
  levelLabels?: string[],
  buildingType?: string,
): ElevationDrawing | null {
  if (!plan || plan.width <= 0 || plan.height <= 0 || floors < 1) return null

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

  const style = styleFor(buildingType)
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const polygons: ElevationPolygon[] = []
  const texts: ElevationText[] = []

  lines.push({ x1: 0, y1: groundY, x2: svgW, y2: groundY, stroke: GROUND_STROKE, strokeWidth: 0.08 })

  const sectionBrickTex = renderBrickCoursing(PADDING, eaveY, bw, wallH)
  lines.push(...sectionBrickTex.lines)

  const hatchSpacing = 0.3
  for (let hx = 0; hx < svgW; hx += hatchSpacing) {
    lines.push({
      x1: hx, y1: groundY, x2: hx + hatchSpacing * 0.6, y2: groundY + 0.5,
      stroke: 'rgba(203,213,225,0.2)', strokeWidth: 0.02,
    })
  }

  const cutRooms = plan.rooms.filter(r => {
    const ry1 = r.y
    const ry2 = r.y + r.height
    return ry1 <= cutY && ry2 >= cutY
  })

  for (const room of cutRooms) {
    const rcx = room.x + room.width / 2
    const rrX = PADDING + rcx - room.width / 2
    const rrW = room.width

    for (let si = 0; si < floors; si++) {
      const slabThick = si === 0 ? 0.15 : 0.12
      const roomTop = groundY - (si + 1) * storeyHeight + slabThick
      const roomBot = groundY - si * storeyHeight
      const roomH = roomBot - roomTop

      rects.push({
        x: rrX, y: roomTop, w: rrW, h: roomH,
        fill: 'rgba(255,255,255,0.04)',
        stroke: 'none',
      })

      texts.push({
        x: rrX + rrW / 2, y: (roomTop + roomBot) / 2 + 0.08,
        text: room.name,
        fontSize: 0.3, fill: DIM_COLOR, anchor: 'middle',
      })

      const roomType = classifyRoom(room.name)
      if (roomType === 'circulation' && rrW > 1.0) {
        const treadCount = Math.max(4, Math.floor(rrW / 0.28))
        const totalRise = Math.min(roomH * 0.7, 1.5)
        const stairTex = renderStairSection(rrX + 0.2, roomBot - 0.05, rrW - 0.4, totalRise, treadCount)
        lines.push(...stairTex.lines)
        rects.push(...stairTex.rects)
        texts.push(...stairTex.texts)
      }
    }
  }

  const cutWalls = plan.walls.filter(w => {
    const minWy = Math.min(w.start.y, w.end.y)
    const maxWy = Math.max(w.start.y, w.end.y)
    return minWy <= cutY && maxWy >= cutY
  })

  for (const wall of cutWalls) {
    const wl = wallLen2D(wall.start.x, wall.start.y, wall.end.x, wall.end.y)
    if (wl < 0.01) continue
    const t = wl > 0 ? (cutY - wall.start.y) / (wall.end.y - wall.start.y) : 0
    const cx = wall.start.x + (wall.end.x - wall.start.x) * t
    const wallThk = wall.thickness || plan.wallThickness || FALLBACK_WALL_THICKNESS
    const wx = PADDING + cx - wallThk / 2

    for (let si = 0; si < floors; si++) {
      const slabThick = si === 0 ? 0.15 : 0.12
      const topY = groundY - (si + 1) * storeyHeight + slabThick
      const botY = groundY - si * storeyHeight

      rects.push({
        x: wx, y: topY, w: wallThk, h: botY - topY,
        fill: CUT_WALL_FILL, stroke: style.wallStroke, strokeWidth: 0.04,
      })

      const hatchStep = 0.15
      for (let hy = topY; hy < botY; hy += hatchStep) {
        lines.push({
          x1: wx, y1: hy, x2: wx + wallThk, y2: hy - hatchStep * 0.6,
          stroke: CUT_HATCH, strokeWidth: 0.01,
        })
      }
    }

    const footingW = Math.max(wallThk * 3, 0.3)
    const footingH = 0.3
    const footingY = groundY + 2
    rects.push({
      x: wx - (footingW - wallThk) / 2, y: footingY, w: footingW, h: footingH,
      fill: FOUNDATION_FILL, stroke: 'none',
    })

    texts.push({
      x: wx + wallThk / 2, y: footingY + footingH + 0.2,
      text: 'FOOTING',
      fontSize: 0.2, fill: DIM_COLOR, anchor: 'middle',
    })
  }

  for (let si = 0; si <= floors; si++) {
    const slabY = groundY - si * storeyHeight
    const isGround = si === 0
    const slabH = isGround ? 0.15 : 0.12

    rects.push({
      x: PADDING, y: slabY - slabH / 2, w: bw, h: slabH,
      fill: FLOOR_SLAB_FILL,
      stroke: isGround ? '#22c55e' : '#38bdf8',
      strokeWidth: 0.04,
    })

    lines.push({
      x1: PADDING, y1: slabY, x2: PADDING + bw, y2: slabY,
      stroke: '#ffffff', strokeWidth: 0.01, dashed: true,
    })
  }

  polygons.push({
    points: [
      { x: PADDING - ROOF_OVERHANG, y: eaveY },
      { x: ridgeCx, y: ridgeY },
      { x: PADDING + bw + ROOF_OVERHANG, y: eaveY },
    ],
    fill: style.roofFill,
    stroke: style.roofStroke,
    strokeWidth: 0.06,
  })

  const rafterCount = 4
  for (let i = 0; i <= rafterCount; i++) {
    const t = i / rafterCount
    const rx = PADDING + t * bw
    const ry1 = eaveY
    const ry2 = ridgeY + (eaveY - ridgeY) * (1 - Math.abs(t - 0.5) * 2)
    lines.push({
      x1: rx, y1: ry1, x2: ridgeCx, y2: ry2,
      stroke: 'rgba(248,250,252,0.3)', strokeWidth: 0.02,
    })
  }

  if (style.hasParapet) {
    const copingTex = renderParapetCoping(PADDING - ROOF_OVERHANG, eaveY - 0.08, bw + ROOF_OVERHANG * 2, 0.08)
    rects.push(...copingTex.rects)
    lines.push(...copingTex.lines)
  }

  for (let si = 0; si < floors; si++) {
    const midY = groundY - si * storeyHeight - storeyHeight / 2
    const label = levelLabels?.[si] ?? `Fl ${si + 1}`
    texts.push({
      x: PADDING + bw + 0.4, y: midY + 0.15,
      text: label,
      fontSize: 0.35, fill: DIM_COLOR, anchor: 'start',
    })
  }

  texts.push({
    x: PADDING + bw / 2, y: groundY + 0.6,
    text: formatDimMm(bw),
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'middle',
  })
  texts.push({
    x: ridgeCx, y: ridgeY - 0.4,
    text: formatLevel(wallH + pitchHeight),
    fontSize: 0.35, fill: DIM_COLOR, anchor: 'middle',
  })

  texts.push({
    x: PADDING - 0.7, y: (groundY + eaveY) / 2 + 0.15,
    text: formatDimMm(wallH),
    fontSize: 0.4, fill: DIM_COLOR, anchor: 'end',
  })

  texts.push({
    x: PADDING + bw / 2, y: groundY + 2.5,
    text: 'REINFORCED CONCRETE FOUNDATION',
    fontSize: 0.25, fill: DIM_COLOR, anchor: 'middle',
  })

  for (let si = 0; si <= floors; si++) {
    const elev = si * storeyHeight
    texts.push({
      x: PADDING + bw + 0.2, y: groundY - si * storeyHeight + 0.1,
      text: formatLevel(elev),
      fontSize: 0.25, fill: DIM_COLOR, anchor: 'start',
    })
  }

  return { lines, rects, polygons, texts, viewBox: `0 0 ${svgW.toFixed(2)} ${svgH.toFixed(2)}`, title: 'SECTION A-A' }
}
