import type { PlanModel, WallSegment } from '@/domain/plan'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cvInstance: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadOpenCv(): Promise<any> {
  if (cvInstance) return cvInstance
  await import('@techstark/opencv-js')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cvInstance = (window as any).cv
  if (!cvInstance) throw new Error('OpenCV.js failed to load')
  return cvInstance
}

export interface DetectedSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface DetectionResult {
  walls: DetectedSegment[]
  rooms: { x: number; y: number; width: number; height: number }[]
  confidence: 'low' | 'medium' | 'high'
  detectedLines: number
  message: string
}

function segmentAngle(seg: DetectedSegment): number {
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  let angle = Math.atan2(dy, dx) * (180 / Math.PI)
  if (angle < 0) angle += 180
  return angle
}

function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  return Math.abs(dx * (py - y1) - dy * (px - x1)) / len
}

function tryMerge(
  a: DetectedSegment,
  b: DetectedSegment,
  angleTol: number,
  distTol: number,
): DetectedSegment | null {
  const angleA = segmentAngle(a)
  const angleB = segmentAngle(b)

  let angleDiff = Math.abs(angleA - angleB)
  if (angleDiff > 90) angleDiff = 180 - angleDiff
  if (angleDiff > angleTol) return null

  const midAx = (a.x1 + a.x2) / 2
  const midAy = (a.y1 + a.y2) / 2
  const midBx = (b.x1 + b.x2) / 2
  const midBy = (b.y1 + b.y2) / 2

  const dAtoB = pointToLineDistance(midAx, midAy, b.x1, b.y1, b.x2, b.y2)
  const dBtoA = pointToLineDistance(midBx, midBy, a.x1, a.y1, a.x2, a.y2)
  if (dAtoB > distTol && dBtoA > distTol) return null

  const adx = a.x2 - a.x1
  const ady = a.y2 - a.y1
  const aLen = Math.sqrt(adx * adx + ady * ady)
  if (aLen === 0) return null

  const ux = adx / aLen
  const uy = ady / aLen
  const proj = (px: number, py: number) => (px - a.x1) * ux + (py - a.y1) * uy

  const pA1 = proj(a.x1, a.y1)
  const pA2 = proj(a.x2, a.y2)
  const pB1 = proj(b.x1, b.y1)
  const pB2 = proj(b.x2, b.y2)

  const minA = Math.min(pA1, pA2)
  const maxA = Math.max(pA1, pA2)
  const minB = Math.min(pB1, pB2)
  const maxB = Math.max(pB1, pB2)

  const gap = minA > maxB ? minA - maxB : minB > maxA ? minB - maxA : 0
  if (gap > distTol) return null

  const allT = [pA1, pA2, pB1, pB2]
  const minT = Math.min(...allT)
  const maxT = Math.max(...allT)

  return {
    x1: a.x1 + ux * minT,
    y1: a.y1 + uy * minT,
    x2: a.x1 + ux * maxT,
    y2: a.y1 + uy * maxT,
  }
}

export function mergeCollinearSegments(
  segments: DetectedSegment[],
  angleToleranceDeg = 5,
  distTolerance = 5,
): DetectedSegment[] {
  const result: DetectedSegment[] = [...segments]
  let merged = true

  while (merged) {
    merged = false
    const next: DetectedSegment[] = []
    const used = new Array<boolean>(result.length).fill(false)

    for (let i = 0; i < result.length; i++) {
      if (used[i]) continue
      let current = result[i]
      let changed = true

      while (changed) {
        changed = false
        for (let j = i + 1; j < result.length; j++) {
          if (used[j]) continue
          const m = tryMerge(current, result[j], angleToleranceDeg, distTolerance)
          if (m) {
            current = m
            used[j] = true
            changed = true
            merged = true
          }
        }
      }

      next.push(current)
    }

    result.length = 0
    result.push(...next)
  }

  return result
}

export function snapToAxis(seg: DetectedSegment, toleranceDeg = 8): DetectedSegment {
  const angle = segmentAngle(seg)
  const distFromHoriz = Math.min(angle, 180 - angle)
  const distFromVert = Math.abs(angle - 90)

  if (distFromHoriz <= toleranceDeg) {
    const y = (seg.y1 + seg.y2) / 2
    return {
      x1: Math.min(seg.x1, seg.x2),
      y1: y,
      x2: Math.max(seg.x1, seg.x2),
      y2: y,
    }
  }

  if (distFromVert <= toleranceDeg) {
    const x = (seg.x1 + seg.x2) / 2
    return {
      x1: x,
      y1: Math.min(seg.y1, seg.y2),
      x2: x,
      y2: Math.max(seg.y1, seg.y2),
    }
  }

  return { ...seg }
}

export function pixelsToMetresSegment(seg: DetectedSegment, pxPerMetre: number): DetectedSegment {
  if (pxPerMetre <= 0) throw new Error('pxPerMetre must be positive')
  return {
    x1: seg.x1 / pxPerMetre,
    y1: seg.y1 / pxPerMetre,
    x2: seg.x2 / pxPerMetre,
    y2: seg.y2 / pxPerMetre,
  }
}

function isOnBoundingHull(
  w: DetectedSegment,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  tolerance: number,
): boolean {
  return (
    Math.abs(w.x1 - minX) <= tolerance ||
    Math.abs(w.x2 - minX) <= tolerance ||
    Math.abs(w.x1 - maxX) <= tolerance ||
    Math.abs(w.x2 - maxX) <= tolerance ||
    Math.abs(w.y1 - minY) <= tolerance ||
    Math.abs(w.y2 - minY) <= tolerance ||
    Math.abs(w.y1 - maxY) <= tolerance ||
    Math.abs(w.y2 - maxY) <= tolerance
  )
}

export function segmentsToPlan(
  walls: DetectedSegment[],
  pxPerMetre: number,
  options?: { wallThickness?: number },
): PlanModel | null {
  if (walls.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const w of walls) {
    minX = Math.min(minX, w.x1, w.x2)
    minY = Math.min(minY, w.y1, w.y2)
    maxX = Math.max(maxX, w.x1, w.x2)
    maxY = Math.max(maxY, w.y1, w.y2)
  }

  const wallThickness = options?.wallThickness ?? 0.23
  const pad = 1
  const width = maxX - minX + 2 * pad
  const height = maxY - minY + 2 * pad
  const inset = 0.5
  const hullTolerance = 0.1

  const wallSegments: WallSegment[] = walls.map((w, i) => ({
    id: `wall-${i}`,
    start: { x: w.x1, y: w.y1 },
    end: { x: w.x2, y: w.y2 },
    thickness: wallThickness,
    type: isOnBoundingHull(w, minX, minY, maxX, maxY, hullTolerance) ? 'external' : 'internal',
  }))

  return {
    id: 'detected',
    designOptionId: 'imported',
    width,
    height,
    wallThickness,
    rooms: [
      {
        id: 'room-0',
        name: 'Detected Room',
        x: minX - pad + inset,
        y: minY - pad + inset,
        width: width - 2 * inset,
        height: height - 2 * inset,
      },
    ],
    walls: wallSegments,
    openings: [],
    scaleLabel: `${pxPerMetre} px/m`,
  }
}

export function computeConfidence(
  detectedLines: number,
  imageWidth: number,
  imageHeight: number,
): 'low' | 'medium' | 'high' {
  const ratio = detectedLines / (imageWidth * imageHeight)
  if (ratio > 0.001) return 'high'
  if (ratio > 0.0003) return 'medium'
  return 'low'
}

function deriveRooms(
  walls: DetectedSegment[],
): { x: number; y: number; width: number; height: number }[] {
  const horiz = walls
    .filter((w) => Math.abs(w.y1 - w.y2) < 0.01)
    .map((w) => ({
      x1: Math.min(w.x1, w.x2),
      x2: Math.max(w.x1, w.x2),
      y: w.y1,
    }))
  const vert = walls
    .filter((w) => Math.abs(w.x1 - w.x2) < 0.01)
    .map((w) => ({
      y1: Math.min(w.y1, w.y2),
      y2: Math.max(w.y1, w.y2),
      x: w.x1,
    }))

  const rooms: { x: number; y: number; width: number; height: number }[] = []

  for (const h of horiz) {
    for (const v of vert) {
      if (v.x < h.x1 || v.x > h.x2) continue
      if (h.y < v.y1 || h.y > v.y2) continue

      const cx = v.x
      const cy = h.y

      for (const h2 of horiz) {
        if (h2.y <= cy + 0.01) continue
        for (const v2 of vert) {
          if (v2.x <= cx + 0.01) continue

          if (v2.x < h2.x1 || v2.x > h2.x2) continue
          if (h2.y < v2.y1 || h2.y > v2.y2) continue

          const topOk = horiz.some(
            (hh) =>
              Math.abs(hh.y - cy) < 0.01 && hh.x1 <= cx + 0.01 && hh.x2 >= v2.x - 0.01,
          )
          const bottomOk = horiz.some(
            (hh) =>
              Math.abs(hh.y - h2.y) < 0.01 && hh.x1 <= cx + 0.01 && hh.x2 >= v2.x - 0.01,
          )
          const leftOk = vert.some(
            (vv) =>
              Math.abs(vv.x - cx) < 0.01 && vv.y1 <= cy + 0.01 && vv.y2 >= h2.y - 0.01,
          )
          const rightOk = vert.some(
            (vv) =>
              Math.abs(vv.x - v2.x) < 0.01 && vv.y1 <= cy + 0.01 && vv.y2 >= h2.y - 0.01,
          )

          if (topOk && bottomOk && leftOk && rightOk) {
            const w = v2.x - cx
            const hgt = h2.y - cy
            if (w > 0.1 && hgt > 0.1) {
              rooms.push({ x: cx, y: cy, width: w, height: hgt })
            }
          }
        }
      }
    }
  }

  const unique: typeof rooms = []
  for (const r of rooms) {
    const dup = unique.some(
      (u) =>
        Math.abs(u.x - r.x) < 0.05 &&
        Math.abs(u.y - r.y) < 0.05 &&
        Math.abs(u.width - r.width) < 0.05 &&
        Math.abs(u.height - r.height) < 0.05,
    )
    if (!dup) unique.push(r)
  }

  return unique
}

export async function detectWallsFromImage(
  imageDataUrl: string,
  pxPerMetre: number,
  options?: {
    adaptiveBlockSize?: number
    houghThreshold?: number
    minLineLength?: number
    maxLineGap?: number
  },
): Promise<DetectionResult> {
  if (pxPerMetre <= 0) {
    return {
      walls: [],
      rooms: [],
      confidence: 'low',
      detectedLines: 0,
      message: 'Set the scale first for accurate detection.',
    }
  }

  try {
    const cv = await loadOpenCv()

    const img = new Image()
    img.src = imageDataUrl
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image failed to load'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    const binary = new cv.Mat()
    cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, options?.adaptiveBlockSize ?? 11, 2)

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
    const denoised = new cv.Mat()
    cv.morphologyEx(binary, denoised, cv.MORPH_CLOSE, kernel)

    const linesMat = new cv.Mat()
    cv.HoughLinesP(denoised, linesMat, 1, Math.PI / 180, options?.houghThreshold ?? 80, options?.minLineLength ?? 30, options?.maxLineGap ?? 10)

    const rawSegments: DetectedSegment[] = []
    for (let i = 0; i < linesMat.rows; i++) {
      const ptr = linesMat.data32S.subarray(i * 4, i * 4 + 4)
      rawSegments.push({ x1: ptr[0], y1: ptr[1], x2: ptr[2], y2: ptr[3] })
    }

    src.delete()
    gray.delete()
    binary.delete()
    kernel.delete()
    denoised.delete()
    linesMat.delete()

    const detectedLines = rawSegments.length

    const merged = mergeCollinearSegments(rawSegments)
    const snapped = merged.map((s) => snapToAxis(s))
    const inMetres = snapped.map((s) => pixelsToMetresSegment(s, pxPerMetre))

    const rooms = deriveRooms(inMetres)
    const confidence = computeConfidence(detectedLines, img.width, img.height)

    segmentsToPlan(inMetres, pxPerMetre)

    const messages: Record<string, string> = {
      low: 'Low confidence detection. Try adjusting brightness or contrast.',
      medium: 'Moderate confidence. Review detected walls manually.',
      high: `Detected ${detectedLines} wall segments successfully.`,
    }

    return {
      walls: inMetres,
      rooms,
      confidence,
      detectedLines,
      message: messages[confidence],
    }
  } catch {
    return {
      walls: [],
      rooms: [],
      confidence: 'low',
      detectedLines: 0,
      message: 'Wall detection unavailable. Trace walls manually over the backdrop.',
    }
  }
}

export default detectWallsFromImage
