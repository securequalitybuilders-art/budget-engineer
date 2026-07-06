// ── Line weights (CAD convention) ──
export const CAD_HEAVY = 2
export const CAD_MEDIUM = 1.2
export const CAD_THIN = 0.6
export const CAD_HAIR = 0.4

// ── Ink and paper ──
export const INK = '#1a1a1a'
export const PAPER = '#ffffff'

// ── Helpers ──
export function metresToMm(m: number): string {
  return Math.round(m * 1000).toString()
}
