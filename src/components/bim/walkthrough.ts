import type { PlanModel } from '@/domain/plan'

export interface WalkStart {
  position: [number, number, number]
}

export function computeWalkStart(
  plan: PlanModel | null | undefined,
): WalkStart | null {
  if (!plan || plan.rooms.length === 0) return null

  const largest = plan.rooms.reduce((a, b) => {
    const areaA = a.width * a.height
    const areaB = b.width * b.height
    return areaB > areaA ? b : a
  })
  const cx = largest.x + largest.width / 2
  const cz = largest.y + largest.height / 2
  return { position: [cx, 1.6, cz] }
}

export function clampToFootprint(
  position: [number, number, number],
  bounds: { width: number; depth: number },
  margin?: number,
): [number, number, number] {
  const m = margin ?? 0.5
  const [x, y, z] = position
  return [
    Math.max(m, Math.min(bounds.width - m, x)),
    y,
    Math.max(m, Math.min(bounds.depth - m, z)),
  ]
}
