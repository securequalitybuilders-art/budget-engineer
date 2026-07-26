export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export const DRAWING_ZOOM_MIN = 0.5
export const DRAWING_ZOOM_MAX = 5
