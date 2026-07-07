// ── Types ──

export interface CanopyParams {
  spanX: number
  spanZ: number
  rise: number
  cellDensity: number
  seed: number
  heightAboveBuilding: number
}

export interface CanopyCell {
  vertices3d: [number, number, number][]
  centroid: [number, number, number]
  edges: [[number, number, number], [number, number, number]][]
}

export interface CanopyResult {
  cells: CanopyCell[]
  allEdges: [[number, number, number], [number, number, number]][]
}

interface Point2D {
  x: number
  y: number
}

interface Triangle {
  a: number
  b: number
  c: number
}

interface VoronoiCell2D {
  seedIndex: number
  vertices: Point2D[]
}

// ── Seeded PRNG (mulberry32) ──

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// ── Surface point ──

export function surfacePoint(u: number, v: number, params: CanopyParams): [number, number, number] {
  const x = (u - 0.5) * params.spanX
  const z = (v - 0.5) * params.spanZ
  const y = params.heightAboveBuilding + params.rise * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
  return [x, y, z]
}

// ── Seed point generation (jittered grid) ──

export function generateSeedPoints(params: CanopyParams): Point2D[] {
  const count = Math.max(3, Math.round(params.cellDensity))
  const gridSize = Math.ceil(Math.sqrt(count))
  const rng = mulberry32(params.seed)
  const points: Point2D[] = []
  const cellW = 1 / gridSize

  for (let gi = 0; gi < gridSize && points.length < count; gi++) {
    for (let gj = 0; gj < gridSize && points.length < count; gj++) {
      const jx = rng() * cellW * 0.8
      const jy = rng() * cellW * 0.8
      const x = Math.min(0.99, Math.max(0.01, (gi + 0.1 + jx) / gridSize))
      const y = Math.min(0.99, Math.max(0.01, (gj + 0.1 + jy) / gridSize))
      points.push({ x, y })
    }
  }

  return points
}

// ── Circumcircle test ──

function circumcircleContains(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  px: number, py: number,
): boolean {
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  if (Math.abs(d) < 1e-10) return false

  const a2 = ax * ax + ay * ay
  const b2 = bx * bx + by * by
  const c2 = cx * cx + cy * cy

  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d
  const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d

  const r2 = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy)
  const dx = px - ux
  const dy = py - uy

  return dx * dx + dy * dy < r2
}

// ── Circumcenter ──

function circumcenter(a: Point2D, b: Point2D, c: Point2D): Point2D {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-10) return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 }

  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y

  return {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d,
  }
}

// ── Bowyer-Watson Delaunay triangulation ──

export function triangulateDelaunay(points: Point2D[]): Triangle[] {
  const n = points.length
  if (n < 3) return []

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  const dx = maxX - minX || 1
  const dy = maxY - minY || 1
  const dmax = Math.max(dx, dy) * 20
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  const pts: Point2D[] = [
    ...points,
    { x: cx - dmax, y: cy - dmax },
    { x: cx + dmax, y: cy - dmax },
    { x: cx, y: cy + dmax },
  ]

  const superA = n
  const superB = n + 1
  const superC = n + 2

  let triangles: Triangle[] = [{ a: superA, b: superB, c: superC }]

  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const badSet = new Set<number>()
    const edgeCount = new Map<string, number>()

    for (let t = 0; t < triangles.length; t++) {
      const tri = triangles[t]
      if (circumcircleContains(
        pts[tri.a].x, pts[tri.a].y,
        pts[tri.b].x, pts[tri.b].y,
        pts[tri.c].x, pts[tri.c].y,
        p.x, p.y,
      )) {
        badSet.add(t)
        const addEdge = (v1: number, v2: number) => {
          const key = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`
          edgeCount.set(key, (edgeCount.get(key) || 0) + 1)
        }
        addEdge(tri.a, tri.b)
        addEdge(tri.b, tri.c)
        addEdge(tri.c, tri.a)
      }
    }

    const newTriangles: Triangle[] = []
    for (let t = 0; t < triangles.length; t++) {
      if (!badSet.has(t)) {
        newTriangles.push(triangles[t])
      }
    }

    for (const [key, count] of edgeCount) {
      if (count === 1) {
        const [v1, v2] = key.split(',').map(Number)
        newTriangles.push({ a: v1, b: v2, c: i })
      }
    }

    triangles = newTriangles
  }

  return triangles.filter(t =>
    t.a < n && t.b < n && t.c < n,
  )
}

// ── Voronoi cells from Delaunay dual ──

export function computeVoronoiCells(seeds: Point2D[]): VoronoiCell2D[] {
  if (seeds.length < 3) return seeds.map((_, i) => ({ seedIndex: i, vertices: [] }))

  const triangles = triangulateDelaunay(seeds)

  const seedTriangles: number[][] = seeds.map(() => [])
  for (let i = 0; i < triangles.length; i++) {
    const t = triangles[i]
    seedTriangles[t.a].push(i)
    seedTriangles[t.b].push(i)
    seedTriangles[t.c].push(i)
  }

  const cells: VoronoiCell2D[] = seeds.map((seed, i) => {
    const tris = seedTriangles[i]
    if (tris.length < 2) return { seedIndex: i, vertices: [] }

    const centers: Point2D[] = tris.map(ti => {
      const t = triangles[ti]
      return circumcenter(seeds[t.a], seeds[t.b], seeds[t.c])
    })

    centers.sort((a, b) =>
      Math.atan2(a.y - seed.y, a.x - seed.x) -
      Math.atan2(b.y - seed.y, b.x - seed.x),
    )

    return { seedIndex: i, vertices: clipToUnitSquare(centers) }
  })

  return cells
}

// ── Sutherland-Hodgman polygon clipping to [0,1]×[0,1] ──

function clipToUnitSquare(poly: Point2D[]): Point2D[] {
  if (poly.length < 3) return []
  let result = poly.slice()

  const clipEdges: { axis: 'x' | 'y'; side: 'min' | 'max' }[] = [
    { axis: 'x', side: 'min' },
    { axis: 'x', side: 'max' },
    { axis: 'y', side: 'min' },
    { axis: 'y', side: 'max' },
  ]

  for (const edge of clipEdges) {
    if (result.length < 3) return []
    const input = result
    result = []

    for (let i = 0; i < input.length; i++) {
      const curr = input[i]
      const prev = input[(i - 1 + input.length) % input.length]

      const currInside = edge.axis === 'x'
        ? (edge.side === 'min' ? curr.x >= 0 : curr.x <= 1)
        : (edge.side === 'min' ? curr.y >= 0 : curr.y <= 1)

      const prevInside = edge.axis === 'x'
        ? (edge.side === 'min' ? prev.x >= 0 : prev.x <= 1)
        : (edge.side === 'min' ? prev.y >= 0 : prev.y <= 1)

      if (currInside) {
        if (!prevInside) {
          const t = edge.axis === 'x'
            ? (edge.side === 'min' ? -prev.x : (1 - prev.x)) / (curr.x - prev.x)
            : (edge.side === 'min' ? -prev.y : (1 - prev.y)) / (curr.y - prev.y)
          result.push({
            x: prev.x + t * (curr.x - prev.x),
            y: prev.y + t * (curr.y - prev.y),
          })
        }
        result.push(curr)
      } else if (prevInside) {
        const t = edge.axis === 'x'
          ? (edge.side === 'min' ? -prev.x : (1 - prev.x)) / (curr.x - prev.x)
          : (edge.side === 'min' ? -prev.y : (1 - prev.y)) / (curr.y - prev.y)
        result.push({
          x: prev.x + t * (curr.x - prev.x),
          y: prev.y + t * (curr.y - prev.y),
        })
      }
    }
  }

  return result
}

// ── Project cells to 3D surface ──

export function projectCellsToSurface(cells2d: VoronoiCell2D[], params: CanopyParams): CanopyResult {
  const canopyCells: CanopyCell[] = []
  const allEdges: [[number, number, number], [number, number, number]][] = []

  for (const cell2d of cells2d) {
    if (cell2d.vertices.length < 3) continue

    const vertices3d: [number, number, number][] = cell2d.vertices.map(v => surfacePoint(v.x, v.y, params))

    const centroid2d: Point2D = {
      x: cell2d.vertices.reduce((s, v) => s + v.x, 0) / cell2d.vertices.length,
      y: cell2d.vertices.reduce((s, v) => s + v.y, 0) / cell2d.vertices.length,
    }
    const centroid: [number, number, number] = surfacePoint(centroid2d.x, centroid2d.y, params)

    const edges: [[number, number, number], [number, number, number]][] = []
    for (let i = 0; i < vertices3d.length; i++) {
      const j = (i + 1) % vertices3d.length
      edges.push([vertices3d[i], vertices3d[j]])
      allEdges.push([vertices3d[i], vertices3d[j]])
    }

    canopyCells.push({ vertices3d, centroid, edges })
  }

  return { cells: canopyCells, allEdges }
}

// ── Main entry ──

export function computeCanopy(params: CanopyParams): CanopyResult {
  if (params.spanX <= 0 || params.spanZ <= 0 || params.rise < 0 || params.cellDensity < 3) {
    return { cells: [], allEdges: [] }
  }

  try {
    const seeds = generateSeedPoints(params)
    const voronoiCells = computeVoronoiCells(seeds)
    return projectCellsToSurface(voronoiCells, params)
  } catch {
    return { cells: [], allEdges: [] }
  }
}
