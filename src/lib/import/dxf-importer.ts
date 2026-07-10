import type { PlanModel, Point, WallSegment, RoomRect } from '@/domain/plan'

const uid = () => Math.random().toString(36).slice(2, 8)

interface DxfEntity {
  type: string
  layer: string
  vertices: Point[]
  closed: boolean
}

function tokenize(dxf: string): Array<{ code: number; value: string }> {
  const lines = dxf.split(/\r?\n/)
  const tokens: Array<{ code: number; value: string }> = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed === '') continue
    const code = parseInt(trimmed, 10)
    if (isNaN(code)) continue
    i++
    if (i >= lines.length) break
    tokens.push({ code, value: lines[i].trim() })
  }
  return tokens
}

function extractEntities(tokens: Array<{ code: number; value: string }>): DxfEntity[] {
  const entities: DxfEntity[] = []
  let i = 0

  while (i < tokens.length) {
    if (tokens[i].code === 0 && tokens[i].value === 'SECTION') {
      i++
      if (i < tokens.length && tokens[i].code === 2 && tokens[i].value === 'ENTITIES') {
        i++
        while (i < tokens.length) {
          if (tokens[i].code === 0 && tokens[i].value === 'ENDSEC') break
          if (tokens[i].code === 0) {
            const entityType = tokens[i].value
            i++
            const entity = readEntity(entityType, tokens, i)
            if (entity) entities.push(entity)
            i = entity ? entity._nextIndex : i
          } else {
            i++
          }
        }
      }
    }
    i++
  }
  return entities
}

function readEntity(
  type: string,
  tokens: Array<{ code: number; value: string }>,
  startIndex: number,
): (DxfEntity & { _nextIndex: number }) | null {
  let layer = '0'
  let vertices: Point[] = []
  let closed = false
  let currentVertex: Point | null = null
  let i = startIndex

  while (i < tokens.length) {
    const t = tokens[i]
    if (t.code === 0) break

    if (t.code === 8) {
      layer = t.value
    }

    if (type === 'LINE') {
      if (t.code === 10) {
        const x = parseFloat(t.value)
        const y = i + 1 < tokens.length && tokens[i + 1].code === 20 ? parseFloat(tokens[i + 1].value) : 0
        currentVertex = { x, y }
        i += tokens[i + 1]?.code === 20 ? 2 : 1
        continue
      }
      if (t.code === 11) {
        const x = parseFloat(t.value)
        const y = i + 1 < tokens.length && tokens[i + 1].code === 21 ? parseFloat(tokens[i + 1].value) : 0
        if (currentVertex) {
          vertices = [currentVertex, { x, y }]
        }
        i += tokens[i + 1]?.code === 21 ? 2 : 1
        continue
      }
    }

    if (type === 'LWPOLYLINE') {
      if (t.code === 90) {
        const count = parseInt(t.value, 10)
        vertices = []
        i++
        let vertRead = 0
        while (i < tokens.length && vertRead < count) {
          if (tokens[i].code === 10) {
            const vx = parseFloat(tokens[i].value)
            const vy = i + 1 < tokens.length && tokens[i + 1].code === 20 ? parseFloat(tokens[i + 1].value) : 0
            vertices.push({ x: vx, y: vy })
            vertRead++
            i += tokens[i + 1]?.code === 20 ? 2 : 1
          } else if (tokens[i].code === 70) {
            closed = (parseInt(tokens[i].value, 10) & 1) !== 0
            i++
          } else if (tokens[i].code === 0) {
            break
          } else {
            i++
          }
        }
        continue
      }
      if (t.code === 70) {
        closed = (parseInt(t.value, 10) & 1) !== 0
      }
    }

    if (type === 'POLYLINE') {
      if (t.code === 70) {
        closed = (parseInt(t.value, 10) & 1) !== 0
      }
      i++
      vertices = []
      while (i < tokens.length) {
        if (tokens[i].code === 0 && tokens[i].value === 'VERTEX') {
          i++
          let vx = 0, vy = 0
          while (i < tokens.length) {
            if (tokens[i].code === 0) break
            if (tokens[i].code === 10) vx = parseFloat(tokens[i].value)
            if (tokens[i].code === 20) vy = parseFloat(tokens[i].value)
            i++
          }
          vertices.push({ x: vx, y: vy })
          continue
        }
        if (tokens[i].code === 0 && tokens[i].value === 'SEQEND') break
        i++
      }
      continue
    }

    i++
  }

  if (vertices.length < 2) return null

  return { type, layer, vertices, closed, _nextIndex: i }
}

function applyUnitHeuristic(vertices: Point[]): Point[] {
  let maxDim = 0
  for (const v of vertices) {
    maxDim = Math.max(maxDim, Math.abs(v.x), Math.abs(v.y))
  }
  if (maxDim > 1000) {
    return vertices.map((v) => ({ x: v.x / 1000, y: v.y / 1000 }))
  }
  return vertices
}

function wallsFromLine(entity: DxfEntity, thickness: number): WallSegment[] {
  if (entity.type !== 'LINE' || entity.vertices.length < 2) return []
  const [start, end] = entity.vertices
  if (start.x === end.x && start.y === end.y) return []
  return [{
    id: uid(),
    start: { x: Number(start.x.toFixed(4)), y: Number(start.y.toFixed(4)) },
    end: { x: Number(end.x.toFixed(4)), y: Number(end.y.toFixed(4)) },
    thickness,
    type: 'external',
  }]
}

function wallsFromPolyline(entity: DxfEntity, thickness: number): WallSegment[] {
  if (entity.type !== 'LWPOLYLINE' && entity.type !== 'POLYLINE') return []
  const pts = entity.vertices
  if (pts.length < 2) return []
  const walls: WallSegment[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const s = pts[i], e = pts[i + 1]
    if (s.x === e.x && s.y === e.y) continue
    walls.push({
      id: uid(),
      start: { x: Number(s.x.toFixed(4)), y: Number(s.y.toFixed(4)) },
      end: { x: Number(e.x.toFixed(4)), y: Number(e.y.toFixed(4)) },
      thickness,
      type: 'external',
    })
  }
  if (entity.closed && pts.length > 2) {
    const s = pts[pts.length - 1], e = pts[0]
    if (!(s.x === e.x && s.y === e.y)) {
      walls.push({
        id: uid(),
        start: { x: Number(s.x.toFixed(4)), y: Number(s.y.toFixed(4)) },
        end: { x: Number(e.x.toFixed(4)), y: Number(e.y.toFixed(4)) },
        thickness,
        type: 'external',
      })
    }
  }
  return walls
}

function computeBoundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 10 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

function normalizePoints(points: Point[], bb: { minX: number; minY: number; maxX: number; maxY: number }): Point[] {
  const w = bb.maxX - bb.minX
  const h = bb.maxY - bb.minY
  if (w === 0 && h === 0) return points.map(() => ({ x: 0, y: 0 }))
  return points.map((p) => ({
    x: Number(((p.x - bb.minX)).toFixed(4)),
    y: Number(((p.y - bb.minY)).toFixed(4)),
  }))
}

function deriveRooms(walls: WallSegment[], bb: { width: number; height: number }, closedPolylines: Point[][]): RoomRect[] {
  const rooms: RoomRect[] = []

  for (const poly of closedPolylines) {
    if (poly.length < 3) continue
    const bb2 = computeBoundingBox(poly)
    const rw = bb2.maxX - bb2.minX
    const rh = bb2.maxY - bb2.minY
    if (rw > 0.1 && rh > 0.1) {
      rooms.push({
        id: uid(),
        name: rooms.length === 0 ? 'Main Area' : `Room ${rooms.length + 1}`,
        x: Number(bb2.minX.toFixed(4)),
        y: Number(bb2.minY.toFixed(4)),
        width: Number(rw.toFixed(4)),
        height: Number(rh.toFixed(4)),
        color: ['#1d4ed8', '#0f766e', '#7c3aed', '#9a3412', '#0369a1'][rooms.length % 5],
      })
    }
  }

  if (rooms.length === 0 && walls.length > 0) {
    rooms.push({
      id: uid(),
      name: 'Imported Plan',
      x: 0,
      y: 0,
      width: Number(bb.width.toFixed(4)),
      height: Number(bb.height.toFixed(4)),
      color: '#1d4ed8',
    })
  }

  return rooms
}

export function parseDxfToPlan(dxfText: string): PlanModel | null {
  try {
    const tokens = tokenize(dxfText)
    if (tokens.length < 10) return null

    const entities = extractEntities(tokens)
    if (entities.length === 0) return null

    const wallThickness = 0.23
    const allPoints: Point[] = []
    const walls: WallSegment[] = []
    const closedPolylines: Point[][] = []

    for (const entity of entities) {
      const scaledVerts = applyUnitHeuristic(entity.vertices)
      entity.vertices = scaledVerts

      if (entity.type === 'LINE') {
        const ws = wallsFromLine(entity, wallThickness)
        walls.push(...ws)
        for (const v of entity.vertices) allPoints.push(v)
      }

      if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const ws = wallsFromPolyline(entity, wallThickness)
        walls.push(...ws)
        for (const v of entity.vertices) allPoints.push(v)
        if (entity.closed && entity.vertices.length >= 3) {
          closedPolylines.push(entity.vertices)
        }
      }
    }

    if (walls.length === 0) return null

    const bb = computeBoundingBox(allPoints)
    const width = bb.maxX - bb.minX
    const height = bb.maxY - bb.minY

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null

    for (const wall of walls) {
      wall.start = normalizePoints([wall.start], bb)[0]
      wall.end = normalizePoints([wall.end], bb)[0]
    }

    const normalizedClosedPolylines = closedPolylines.map(
      (poly) => normalizePoints(poly, bb)
    )

    const rooms = deriveRooms(walls, { width, height }, normalizedClosedPolylines)

    const planWidth = Number(width.toFixed(4))
    const planHeight = Number(height.toFixed(4))

    return {
      id: uid(),
      designOptionId: '',
      width: planWidth > 0 ? planWidth : 10,
      height: planHeight > 0 ? planHeight : 10,
      wallThickness,
      rooms,
      walls,
      openings: [],
      scaleLabel: '1:100',
    }
  } catch {
    return null
  }
}
