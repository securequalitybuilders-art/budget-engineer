export type WallPurpose = 'boundary' | 'internal'

export interface BrickSize {
  lengthMm: number
  heightMm: number
  widthMm: number
}

export interface BrickCalcParams {
  lengthM: number
  heightM: number
  wallThicknessMm: number
  purpose?: WallPurpose
  brickSize?: BrickSize
  wastagePct?: number
}

export interface BrickCalcSuccess {
  valid: true
  quantity: number
  areaM2: number
  bricksPerM2: number
  wastagePct: number
  brickSizeLabel: string
  wallThicknessMm: number
  purpose: WallPurpose
  compliant: true
  calculation: string[]
  citation: string
  constructionNote?: string
}

export interface BrickCalcRefusal {
  valid: false
  error: string
  reasons: string[]
  nonCompliant?: boolean
}

export type BrickCalcResult = BrickCalcSuccess | BrickCalcRefusal

export const DEFAULT_BRICK_SIZE: BrickSize = { lengthMm: 400, heightMm: 200, widthMm: 200 }
export const MORTAR_JOINT_MM = 10
export const BOUNDARY_MIN_THICKNESS_MM = 230
export const INTERNAL_MIN_THICKNESS_MM = 90
export const DEFAULT_WASTAGE_PCT = 5
export const MAX_WASTAGE_PCT = 50

function assertPositiveNumber(value: unknown, name: string, reasons: string[]): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    reasons.push(`${name} must be a positive float, not ${typeof value === 'string' ? `string "${value}"` : JSON.stringify(value)}`)
    return null
  }
  if (value <= 0) {
    reasons.push(`${name} must be a positive float, got ${value}`)
    return null
  }
  return value
}

export function brickSizeLabel(size: BrickSize): string {
  return `${size.lengthMm}x${size.heightMm}x${size.widthMm}mm`
}

export function calculateBricks(params: BrickCalcParams): BrickCalcResult {
  const reasons: string[] = []
  const lengthM = assertPositiveNumber(params.lengthM, 'lengthM', reasons)
  const heightM = assertPositiveNumber(params.heightM, 'heightM', reasons)
  const wallThicknessMm = assertPositiveNumber(params.wallThicknessMm, 'wallThicknessMm', reasons)
  const purpose = params.purpose ?? 'boundary'
  const brickSize = params.brickSize ?? DEFAULT_BRICK_SIZE
  if (typeof brickSize.lengthMm !== 'number' || brickSize.lengthMm <= 0) reasons.push('brickSize.lengthMm must be a positive float')
  if (typeof brickSize.heightMm !== 'number' || brickSize.heightMm <= 0) reasons.push('brickSize.heightMm must be a positive float')
  if (typeof brickSize.widthMm !== 'number' || brickSize.widthMm <= 0) reasons.push('brickSize.widthMm must be a positive float')

  const wastagePct = params.wastagePct ?? DEFAULT_WASTAGE_PCT
  if (typeof wastagePct !== 'number' || !Number.isFinite(wastagePct)) {
    reasons.push(`wastagePct must be a positive float, not ${typeof wastagePct === 'string' ? `string "${wastagePct}"` : JSON.stringify(wastagePct)}`)
  } else if (wastagePct < 0 || wastagePct > MAX_WASTAGE_PCT) {
    reasons.push(`wastagePct must be between 0 and ${MAX_WASTAGE_PCT}%, got ${wastagePct}`)
  }

  if (reasons.length > 0 || lengthM === null || heightM === null || wallThicknessMm === null) {
    return { valid: false, error: 'Invalid brick calculation parameters', reasons }
  }

  const thicknessLimit = purpose === 'boundary' ? BOUNDARY_MIN_THICKNESS_MM : INTERNAL_MIN_THICKNESS_MM
  if (wallThicknessMm < thicknessLimit) {
    return {
      valid: false,
      error: `Non-compliant specification: a ${purpose} masonry wall must be at least ${thicknessLimit}mm thick, got ${wallThicknessMm}mm`,
      reasons: [`${purpose} wall thickness ${wallThicknessMm}mm is below the ${thicknessLimit}mm minimum`],
      nonCompliant: true,
    }
  }

  const modularLengthM = (brickSize.lengthMm + MORTAR_JOINT_MM) / 1000
  const modularHeightM = (brickSize.heightMm + MORTAR_JOINT_MM) / 1000
  const bricksPerM2 = 1 / (modularLengthM * modularHeightM)
  const areaM2 = lengthM * heightM
  const quantity = Math.ceil(areaM2 * bricksPerM2 * (1 + wastagePct / 100))

  const sizeLabel = brickSizeLabel(brickSize)
  const constructionNote =
    wallThicknessMm > brickSize.widthMm
      ? `Wall is ${wallThicknessMm}mm thick but the ${sizeLabel} block is only ${brickSize.widthMm}mm wide — allow a wider block or multi-skin construction to meet the thickness.`
      : undefined

  return {
    valid: true,
    quantity,
    areaM2,
    bricksPerM2,
    wastagePct,
    brickSizeLabel: sizeLabel,
    wallThicknessMm,
    purpose,
    compliant: true,
    constructionNote,
    calculation: [
      `wall area = ${lengthM}m x ${heightM}m = ${areaM2.toFixed(2)} m2`,
      `blocks per m2 (${sizeLabel} + ${MORTAR_JOINT_MM}mm joint) = 1 / (${modularLengthM.toFixed(2)} x ${modularHeightM.toFixed(2)}) = ${bricksPerM2.toFixed(2)}`,
      `quantity = ${areaM2.toFixed(2)} m2 x ${bricksPerM2.toFixed(2)} x (1 + ${wastagePct}% wastage) = ${quantity}`,
      'per ZIQS SMM (Section 3 - Brickwork & Blockwork)',
    ],
    citation: 'SAZ 7MPa common brick - ZIQS SMM Section 3',
  }
}
