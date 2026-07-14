// ── Legacy line weights (backward compatible) ──
export const CAD_HEAVY = 2
export const CAD_MEDIUM = 1.2
export const CAD_THIN = 0.6
export const CAD_HAIR = 0.4

// ── Professional pen-weight family (ISO 128-20) ──
export const PEN_013 = 0.13
export const PEN_018 = 0.18
export const PEN_025 = 0.25
export const PEN_035 = 0.35
export const PEN_050 = 0.50
export const PEN_070 = 0.70
export const PEN_100 = 1.00

export const PEN_NAMES: Record<number, string> = {
  0.13: '0.13',
  0.18: '0.18',
  0.25: '0.25',
  0.35: '0.35',
  0.50: '0.50',
  0.70: '0.70',
  1.00: '1.00',
}

export const PEN_FAMILY = [PEN_013, PEN_018, PEN_025, PEN_035, PEN_050, PEN_070, PEN_100] as const
export type PenWeight = (typeof PEN_FAMILY)[number]

export const LEGACY_TO_PEN: Record<string, PenWeight> = {
  HEAVY: PEN_070,
  MEDIUM: PEN_035,
  THIN: PEN_025,
  HAIR: PEN_018,
}

export function legacyToPen(name: string): PenWeight {
  const key = name.toUpperCase()
  return LEGACY_TO_PEN[key] ?? PEN_018
}

export function penToLegacy(pen: PenWeight): string | undefined {
  for (const [legacy, p] of Object.entries(LEGACY_TO_PEN)) {
    if (p === pen) return legacy
  }
  return undefined
}

// ── Ink and paper ──
export const INK = '#1a1a1a'
export const PAPER = '#ffffff'

// ── Professional colours ──
export const INK_CUT = '#000000'
export const INK_OUTLINE = '#1a1a1a'
export const INK_DIMENSION = '#555555'
export const INK_ANNOTATION = '#444444'
export const INK_GRID = '#888888'
export const INK_HIDDEN = '#999999'
export const FILL_CUT_WALL = '#d4c9b8'
export const FILL_CUT_SLAB = '#c8bdb0'
export const FILL_POCHE = '#e8e0d0'
export const FILL_PAPER = PAPER

// ── Helpers ──
export function metresToMm(m: number): string {
  return Math.round(m * 1000).toString()
}

export function matchesPen(pen: PenWeight, legacy: number): boolean {
  const mapped = legacyToPen(legacy.toString())
  return Math.abs(mapped - pen) < 0.05
}
