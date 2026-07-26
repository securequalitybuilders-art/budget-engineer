import type { ElevationLine, ElevationRect, ElevationPolygon, ElevationText } from '@/adapters/planToElevations'

export interface TextureResult {
  lines: ElevationLine[]
  rects: ElevationRect[]
  polygons: ElevationPolygon[]
  texts: ElevationText[]
}

const BRICK_STROKE = '#a8a29e'
const STONE_COLOR = '#9ca3af'
const STONE_JOINT = '#6b7280'
const FRAME_COLOR = '#0284c7'
const GLASS_COLOR = '#7dd3fc'
const GLASS_LIGHT = '#bae6fd'
const SLAT_COLOR = '#0c4a6e'
const HOOD_COLOR = '#78716c'
const HOOD_STROKE = '#44403c'
const BRACKET_COLOR = '#57534e'
const STAIR_STRINGER = '#78716c'
const STAIR_TREAD = '#a8a29e'
const STAIR_RISER = '#57534e'

export function renderBrickCoursing(
  left: number, top: number, width: number, height: number,
  brickLen = 0.45, brickHt = 0.15,
): TextureResult {
  const lines: ElevationLine[] = []
  const courseCount = Math.max(1, Math.floor(height / brickHt))
  for (let ci = 0; ci <= courseCount; ci++) {
    const y = top + ci * brickHt
    if (y > top + height + 0.01) break
    lines.push({
      x1: left, y1: y, x2: left + width, y2: y,
      stroke: BRICK_STROKE, strokeWidth: 0.01,
    })
    if (ci < courseCount) {
      const stagger = (ci % 2) * (brickLen / 2)
      for (let bx = -brickLen; bx <= width + brickLen; bx += brickLen) {
        const perpX = left + bx + stagger
        if (perpX >= left && perpX <= left + width) {
          lines.push({
            x1: perpX, y1: y, x2: perpX, y2: y + brickHt,
            stroke: BRICK_STROKE, strokeWidth: 0.01,
          })
        }
      }
    }
  }
  return { lines, rects: [], polygons: [], texts: [] }
}

export function renderStonePlinth(
  left: number, top: number, width: number, height: number,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  rects.push({
    x: left, y: top, w: width, h: height,
    fill: STONE_COLOR, stroke: STONE_JOINT, strokeWidth: 0.03,
  })
  const rowH = 0.15
  const rows = Math.max(1, Math.floor(height / rowH))
  for (let ri = 0; ri <= rows; ri++) {
    const y = top + ri * rowH
    lines.push({
      x1: left, y1: y, x2: left + width, y2: y,
      stroke: STONE_JOINT, strokeWidth: 0.015,
    })
    const stoneW = 0.3 + (ri * 0.07) % 0.3
    for (let sx = -stoneW; sx <= width + stoneW; sx += stoneW + 0.05 * (ri % 3)) {
      const px = left + sx
      if (px >= left + 0.01 && px <= left + width - 0.01) {
        lines.push({
          x1: px, y1: y, x2: px, y2: y + rowH,
          stroke: STONE_JOINT, strokeWidth: 0.015,
        })
      }
    }
  }
  return { lines, rects, polygons: [], texts: [] }
}

export function renderLouverWindow(
  x: number, y: number, width: number, height: number,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  rects.push({
    x, y, w: width, h: height,
    fill: GLASS_COLOR, stroke: FRAME_COLOR, strokeWidth: 0.05,
  })
  const slatCount = Math.max(2, Math.floor(height / 0.08))
  const slatSpacing = height / (slatCount + 1)
  for (let si = 1; si <= slatCount; si++) {
    const sy = y + si * slatSpacing
    lines.push({
      x1: x + 0.03, y1: sy, x2: x + width - 0.03, y2: sy,
      stroke: SLAT_COLOR, strokeWidth: 0.025,
    })
  }
  lines.push({
    x1: x + width / 2, y1: y + 0.03, x2: x + width / 2, y2: y + height - 0.03,
    stroke: FRAME_COLOR, strokeWidth: 0.02,
  })
  return { lines, rects, polygons: [], texts: [] }
}

export function renderClerestoryWindow(
  x: number, y: number, width: number, height: number,
  splitRatio = 0.3,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const transomH = height * splitRatio
  const mainH = height - transomH
  rects.push({
    x, y: y, w: width, h: transomH,
    fill: GLASS_LIGHT, stroke: FRAME_COLOR, strokeWidth: 0.05,
  })
  rects.push({
    x, y: y + transomH, w: width, h: mainH,
    fill: GLASS_COLOR, stroke: FRAME_COLOR, strokeWidth: 0.05,
  })
  lines.push({
    x1: x, y1: y + transomH, x2: x + width, y2: y + transomH,
    stroke: FRAME_COLOR, strokeWidth: 0.04,
  })
  const midX = x + width / 2
  lines.push({
    x1: midX, y1: y + transomH, x2: midX, y2: y + height,
    stroke: FRAME_COLOR, strokeWidth: 0.02,
  })
  return { lines, rects, polygons: [], texts: [] }
}

export function renderTransomWindow(
  x: number, y: number, width: number, height: number,
  transomRatio = 0.2,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const transomH = height * transomRatio
  const mainH = height - transomH
  rects.push({
    x, y: y, w: width, h: transomH,
    fill: GLASS_LIGHT, stroke: FRAME_COLOR, strokeWidth: 0.04,
  })
  rects.push({
    x, y: y + transomH, w: width, h: mainH,
    fill: GLASS_COLOR, stroke: FRAME_COLOR, strokeWidth: 0.05,
  })
  lines.push({
    x1: x, y1: y + transomH, x2: x + width, y2: y + transomH,
    stroke: FRAME_COLOR, strokeWidth: 0.04,
  })
  const thirdX = x + width / 3
  const twoThirdX = x + 2 * width / 3
  lines.push({
    x1: thirdX, y1: y + transomH, x2: thirdX, y2: y + height,
    stroke: FRAME_COLOR, strokeWidth: 0.02,
  })
  lines.push({
    x1: twoThirdX, y1: y + transomH, x2: twoThirdX, y2: y + height,
    stroke: FRAME_COLOR, strokeWidth: 0.02,
  })
  return { lines, rects, polygons: [], texts: [] }
}

export function renderGroupedWindow(
  x: number, y: number, width: number, height: number,
  paneCount = 3,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  rects.push({
    x, y, w: width, h: height,
    fill: GLASS_COLOR, stroke: FRAME_COLOR, strokeWidth: 0.06,
  })
  const paneW = width / paneCount
  const midY = y + height / 2
  lines.push({
    x1: x, y1: midY, x2: x + width, y2: midY,
    stroke: FRAME_COLOR, strokeWidth: 0.02,
  })
  for (let pi = 1; pi < paneCount; pi++) {
    const px = x + pi * paneW
    lines.push({
      x1: px, y1: y + 0.03, x2: px, y2: y + height - 0.03,
      stroke: FRAME_COLOR, strokeWidth: 0.025,
    })
  }
  return { lines, rects, polygons: [], texts: [] }
}

export function renderArchedWindow(
  x: number, y: number, width: number, height: number,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const polygons: ElevationPolygon[] = []
  const archH = Math.min(width / 2, height * 0.35)
  const mainH = height - archH
  const cx = x + width / 2
  const r = width / 2
  rects.push({
    x, y: y + archH, w: width, h: mainH,
    fill: GLASS_COLOR, stroke: FRAME_COLOR, strokeWidth: 0.05,
  })
  const arcPoints: { x: number; y: number }[] = []
  arcPoints.push({ x: x, y: y + archH })
  arcPoints.push({ x: x, y: y + archH })
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI - (i / steps) * Math.PI
    const px = cx + r * Math.cos(angle)
    const py = y + archH - r * Math.sin(angle)
    arcPoints.push({ x: px, y: py })
  }
  arcPoints.push({ x: x + width, y: y + archH })
  polygons.push({
    points: arcPoints,
    fill: GLASS_LIGHT, stroke: FRAME_COLOR, strokeWidth: 0.05,
  })
  lines.push({
    x1: cx, y1: y, x2: cx, y2: y + height,
    stroke: FRAME_COLOR, strokeWidth: 0.02,
  })
  const keystone: ElevationPolygon = {
    points: [
      { x: cx - 0.04, y: y + 0.02 },
      { x: cx + 0.04, y: y + 0.02 },
      { x: cx + 0.03, y: y - 0.03 },
      { x: cx - 0.03, y: y - 0.03 },
    ],
    fill: FRAME_COLOR, stroke: 'none',
  }
  polygons.push(keystone)
  return { lines, rects, polygons, texts: [] }
}

export function renderWindowHood(
  x: number, y: number, width: number, height: number,
): TextureResult {
  const lines: ElevationLine[] = []
  const polygons: ElevationPolygon[] = []
  const hoodOverhang = 0.08
  const hoodH = 0.08
  const bracketW = 0.04
  const bracketH = 0.06
  polygons.push({
    points: [
      { x: x - hoodOverhang, y: y + hoodH },
      { x: x - hoodOverhang, y: y },
      { x: x + width + hoodOverhang, y: y },
      { x: x + width + hoodOverhang, y: y + hoodH },
      { x: x, y: y + hoodH },
      { x: x, y: y + height },
      { x: x + width, y: y + height },
      { x: x + width, y: y + hoodH },
    ],
    fill: HOOD_COLOR, stroke: HOOD_STROKE, strokeWidth: 0.02,
  })
  lines.push({
    x1: x - hoodOverhang, y1: y + hoodH, x2: x + width + hoodOverhang, y2: y + hoodH,
    stroke: HOOD_STROKE, strokeWidth: 0.02,
  })
  const bracketLeft = x + width * 0.2
  const bracketRight = x + width * 0.8
  for (const bx of [bracketLeft, bracketRight]) {
    polygons.push({
      points: [
        { x: bx - bracketW / 2, y: y + hoodH },
        { x: bx + bracketW / 2, y: y + hoodH },
        { x: bx + bracketW / 2, y: y + hoodH + bracketH },
        { x: bx, y: y + hoodH + bracketH + 0.01 },
        { x: bx - bracketW / 2, y: y + hoodH + bracketH },
      ],
      fill: BRACKET_COLOR, stroke: 'none',
    })
  }
  return { lines, rects: [], polygons, texts: [] }
}

export function renderStairSection(
  stairX: number, stairY: number, stairWidth: number,
  totalRise: number, treadCount: number,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  const texts: ElevationText[] = []
  const treadDepth = stairWidth / treadCount
  const riserH = totalRise / treadCount
  let cx = stairX
  let cy = stairY
  for (let ti = 0; ti < treadCount; ti++) {
    const nextX = cx + treadDepth
    const nextY = cy - riserH
    lines.push({
      x1: cx, y1: cy, x2: nextX, y2: cy,
      stroke: STAIR_TREAD, strokeWidth: 0.03,
    })
    lines.push({
      x1: nextX, y1: cy, x2: nextX, y2: nextY,
      stroke: STAIR_RISER, strokeWidth: 0.025,
    })
    cx = nextX
    cy = nextY
  }
  lines.push({
    x1: stairX, y1: stairY, x2: cx, y2: cy,
    stroke: STAIR_STRINGER, strokeWidth: 0.02,
    dashed: true,
  })
  rects.push({
    x: stairX + stairWidth - treadDepth, y: stairY - totalRise,
    w: treadDepth, h: 0.06,
    fill: STAIR_TREAD, stroke: STAIR_RISER, strokeWidth: 0.02,
  })
  texts.push({
    x: stairX + stairWidth / 2, y: stairY - totalRise - 0.15,
    text: `STAIR ${treadCount}R @ ${(riserH * 1000).toFixed(0)}mm RISER`,
    fontSize: 0.18, fill: '#67e8f9', anchor: 'middle',
  })
  return { lines, rects, polygons: [], texts }
}

export function renderTimberBeam(
  x: number, y: number, width: number, height: number,
): TextureResult {
  const lines: ElevationLine[] = []
  const rects: ElevationRect[] = []
  rects.push({
    x, y, w: width, h: height,
    fill: '#a8a29e', stroke: '#78716c', strokeWidth: 0.02,
  })
  const hatchSp = 0.04
  for (let hx = x; hx < x + width; hx += hatchSp) {
    lines.push({
      x1: hx, y1: y, x2: hx + hatchSp * 0.5, y2: y + height,
      stroke: 'rgba(120,113,108,0.3)', strokeWidth: 0.008,
    })
  }
  return { lines, rects, polygons: [], texts: [] }
}

export function renderParapetCoping(
  x: number, y: number, width: number, height: number,
): TextureResult {
  const rects: ElevationRect[] = []
  const lines: ElevationLine[] = []
  rects.push({
    x, y, w: width, h: height,
    fill: '#9ca3af', stroke: '#6b7280', strokeWidth: 0.02,
  })
  lines.push({
    x1: x + 0.02, y1: y + height / 2,
    x2: x + width - 0.02, y2: y + height / 2,
    stroke: '#d1d5db', strokeWidth: 0.01, dashed: true,
  })
  return { lines, rects, polygons: [], texts: [] }
}
