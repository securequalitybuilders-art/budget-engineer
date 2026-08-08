// Deterministic concrete volume / material take-off estimator.
// Shared by the agent orchestrator calculator node and standalone callers.

export interface ConcreteCalcParams {
  lengthM: number
  widthM: number
  thicknessM: number
  mixRatio?: string
  wastagePct?: number
}

export interface ConcreteCalcSuccess {
  valid: true
  volumeM3: number
  dryVolumeM3: number
  cementBags: number
  sandM3: number
  aggregateM3: number
  wastagePct: number
  mixRatio: string
  calculation: string[]
  citation: string
}

export interface ConcreteCalcRefusal {
  valid: false
  error: string
  reasons: string[]
}

export type ConcreteCalcResult = ConcreteCalcSuccess | ConcreteCalcRefusal

export const DEFAULT_MIX = '1:2:4'
export const DEFAULT_WASTAGE_PCT = 5
export const MAX_WASTAGE_PCT = 50
export const CEMENT_BAG_M3 = 0.0347 // volume of one 50kg bag (1:2:4 nominal)

// Wet->dry volume factor: dry mix occupies ~1.54x the wet volume.
export const DRY_FACTOR = 1.54

function positive(value: unknown, name: string, reasons: string[]): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    reasons.push(`${name} must be a positive number, got ${JSON.stringify(value)}`)
    return null
  }
  return value
}

export function calculateConcrete(params: ConcreteCalcParams): ConcreteCalcResult {
  const reasons: string[] = []
  const lengthM = positive(params.lengthM, 'lengthM', reasons)
  const widthM = positive(params.widthM, 'widthM', reasons)
  const thicknessM = positive(params.thicknessM, 'thicknessM', reasons)
  const wastagePct = params.wastagePct ?? DEFAULT_WASTAGE_PCT
  if (typeof wastagePct !== 'number' || !Number.isFinite(wastagePct) || wastagePct < 0 || wastagePct > MAX_WASTAGE_PCT) {
    reasons.push(`wastagePct must be between 0 and ${MAX_WASTAGE_PCT}, got ${JSON.stringify(wastagePct)}`)
  }

  if (reasons.length > 0 || lengthM === null || widthM === null || thicknessM === null) {
    return { valid: false, error: 'Invalid concrete calculation parameters', reasons }
  }

  const mixRatio = params.mixRatio ?? DEFAULT_MIX
  const volumeM3 = lengthM * widthM * thicknessM
  const dryVolumeM3 = volumeM3 * DRY_FACTOR * (1 + wastagePct / 100)

  // 1:2:4 -> 1 + 2 + 4 = 7 parts. Cement occupies 1/7 of the dry volume.
  const parts = mixRatio.split(':').map(Number)
  const totalParts = parts.reduce((s, p) => s + (Number.isFinite(p) && p > 0 ? p : 0), 0)
  const cementM3 = totalParts > 0 ? dryVolumeM3 * (parts[0] ?? 1) / totalParts : dryVolumeM3
  const cementBags = Math.ceil(cementM3 / CEMENT_BAG_M3)
  const sandM3 = totalParts > 0 ? dryVolumeM3 * (parts[1] ?? 2) / totalParts : dryVolumeM3 * 0.4
  const aggregateM3 = totalParts > 0 ? dryVolumeM3 * (parts[2] ?? 4) / totalParts : dryVolumeM3 * 0.6

  return {
    valid: true,
    volumeM3,
    dryVolumeM3,
    cementBags,
    sandM3,
    aggregateM3,
    wastagePct,
    mixRatio,
    calculation: [
      `wet volume = ${lengthM}m x ${widthM}m x ${thicknessM}m = ${volumeM3.toFixed(2)} m3`,
      `dry volume = ${volumeM3.toFixed(2)} x ${DRY_FACTOR} x (1 + ${wastagePct}% wastage) = ${dryVolumeM3.toFixed(2)} m3`,
      `cement = ${cementM3.toFixed(2)} m3 / ${CEMENT_BAG_M3} m3 per bag = ${cementBags} x 50kg bags (${mixRatio})`,
      `sand = ${sandM3.toFixed(2)} m3, aggregate = ${aggregateM3.toFixed(2)} m3`,
      'per ZIQS SMM (Section 2 - Excavation & Concrete)',
    ],
    citation: 'ZIQS SMM Section 2 - nominal 1:2:4 mix',
  }
}
