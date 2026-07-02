import type { PlanModel, WallSegment } from '@/domain/plan'
import type { CadDocument, CadWall, CadOpening, CadFloor } from '@/domain/cad'

function clamp(val: number, min: number, max: number): number {
  if (typeof val !== 'number' || isNaN(val)) return min
  return Math.max(min, Math.min(max, val))
}

function safeWallLength(w: WallSegment): number {
  const dx = w.end.x - w.start.x
  const dy = w.end.y - w.start.y
  const len = Math.hypot(dx, dy)
  return len > 0.001 ? len : 1
}

export function convertPlanModelToCadDocument(input: {
  plan: PlanModel | null
  projectId?: string
  designId?: string
}): {
  cad: CadDocument | null
  source: 'persisted-cad' | 'invalid-plan'
  warnings: string[]
} {
  const { plan, projectId, designId } = input
  const warnings: string[] = []

  if (!plan) {
    return { cad: null, source: 'invalid-plan', warnings: ['PlanModel is null'] }
  }

  if (!plan.walls || plan.walls.length === 0) {
    return { cad: null, source: 'invalid-plan', warnings: ['PlanModel has no walls'] }
  }

  const floorId = 'f1'
  const floor: CadFloor = {
    id: floorId,
    name: 'Ground Floor',
    elevation: 0,
    bim: { classification: 'Ground Floor' },
  }

  const walls: CadWall[] = plan.walls.map((w) => ({
    id: w.id,
    floorId,
    start: { x: clamp(w.start.x, -1e6, 1e6), y: clamp(w.start.y, -1e6, 1e6) },
    end: { x: clamp(w.end.x, -1e6, 1e6), y: clamp(w.end.y, -1e6, 1e6) },
    thickness: clamp(w.thickness, 0.01, 10),
    structuralRole: w.type === 'external' ? 'external' : 'internal',
    layerId: 'walls',
    bim: { classification: w.type === 'external' ? 'external wall' : 'internal partition' },
  }))

  const wallMap = new Map(plan.walls.map((w) => [w.id, w]))

  const openings: CadOpening[] = (plan.openings || []).map((o) => {
    const wall = wallMap.get(o.wallId)
    const wlen = wall ? safeWallLength(wall) : 1
    const offsetRatio = clamp((o.offset + (o.width || 0.9) / 2) / wlen, 0, 1)

    return {
      id: o.id,
      floorId,
      wallId: o.wallId,
      kind: o.kind,
      offsetRatio,
      width: clamp(o.width, 0.1, 10),
      sillHeight: o.kind === 'window' ? 0.9 : undefined,
      headHeight: o.kind === 'door' ? 2.1 : 2.1,
      layerId: 'openings',
      bim: { classification: o.kind },
    }
  })

  const cad: CadDocument = {
    id: plan.id || `cad-${designId || 'unknown'}`,
    projectId: projectId || '',
    designId: designId || plan.designOptionId || '',
    activeFloorId: floorId,
    activeTool: 'select',
    floors: [floor],
    layers: [
      { id: 'grid', name: 'Grid', visible: false, color: '#64748b' },
      { id: 'walls', name: 'Walls', visible: true, color: '#1a365d' },
      { id: 'openings', name: 'Openings', visible: true, color: '#d4a574' },
      { id: 'annotations', name: 'Annotations', visible: true, color: '#fbbf24' },
      { id: 'rooms', name: 'Rooms', visible: true, color: '#22c55e' },
      { id: 'dimensions', name: 'Dimensions', visible: true, color: '#a855f7' },
    ],
    walls,
    openings,
    annotations: [],
    blocks: [],
  }

  return { cad, source: 'persisted-cad', warnings }
}
