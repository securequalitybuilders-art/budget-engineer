export interface DaylightInput {
  roomArea: number
  glazingArea: number
  visibleSkyAngle?: number
  glassTransmittance?: number
  maintenanceFactor?: number
  surfaceReflectance?: number
}

export interface DaylightResult {
  averageDaylightFactor: number
  passes: boolean
  targetDf: number
  glazingToFloorRatio: number
  warnings: string[]
}

export const DEFAULT_VISIBLE_SKY_ANGLE = 45
export const DEFAULT_GLASS_TRANSMITTANCE = 0.85
export const DEFAULT_MAINTENANCE_FACTOR = 0.9
export const DEFAULT_SURFACE_REFLECTANCE = 0.5
export const DEFAULT_TARGET_DF = 2

function computeAverageDaylightFactor(df: number, passes: boolean, targetDf: number, glazingToFloorRatio: number, warnings: string[]): DaylightResult {
  return { averageDaylightFactor: Number(df.toFixed(2)), passes, targetDf, glazingToFloorRatio: Number(glazingToFloorRatio.toFixed(4)), warnings }
}

export function estimateDaylightFactor(input: DaylightInput, targetDf?: number): DaylightResult {
  const warnings: string[] = []

  if (input.roomArea <= 0) {
    return computeAverageDaylightFactor(0, false, targetDf ?? DEFAULT_TARGET_DF, 0, ['Room area must be positive'])
  }
  if (input.glazingArea < 0) {
    return computeAverageDaylightFactor(0, false, targetDf ?? DEFAULT_TARGET_DF, 0, ['Glazing area cannot be negative'])
  }

  const a = input.roomArea
  const w = input.glazingArea
  const theta = input.visibleSkyAngle ?? DEFAULT_VISIBLE_SKY_ANGLE
  const tau = input.glassTransmittance ?? DEFAULT_GLASS_TRANSMITTANCE
  const m = input.maintenanceFactor ?? DEFAULT_MAINTENANCE_FACTOR
  const r = input.surfaceReflectance ?? DEFAULT_SURFACE_REFLECTANCE

  if (theta <= 0 || theta > 90) {
    warnings.push('Visible sky angle out of range (0–90°); using default')
  }
  if (tau <= 0 || tau > 1) {
    warnings.push('Glass transmittance out of range (0–1); using default')
  }
  if (m <= 0 || m > 1) {
    warnings.push('Maintenance factor out of range (0–1); using default')
  }
  if (r < 0 || r >= 1) {
    warnings.push('Surface reflectance out of range (0–1); using default')
  }

  const safeTheta = theta > 0 && theta <= 90 ? theta : DEFAULT_VISIBLE_SKY_ANGLE
  const safeTau = tau > 0 && tau <= 1 ? tau : DEFAULT_GLASS_TRANSMITTANCE
  const safeM = m > 0 && m <= 1 ? m : DEFAULT_MAINTENANCE_FACTOR
  const safeR = r >= 0 && r < 1 ? r : DEFAULT_SURFACE_REFLECTANCE

  const glazingToFloorRatio = w / a

  const df = w > 0 && a > 0
    ? (w * safeTheta * safeTau * safeM) / (a * (1 - safeR * safeR))
    : 0

  const target = targetDf ?? DEFAULT_TARGET_DF
  const passes = df >= target

  return computeAverageDaylightFactor(df, passes, target, glazingToFloorRatio, warnings)
}

export const DEFAULTS = { DEFAULT_VISIBLE_SKY_ANGLE, DEFAULT_GLASS_TRANSMITTANCE, DEFAULT_MAINTENANCE_FACTOR, DEFAULT_SURFACE_REFLECTANCE, DEFAULT_TARGET_DF } as const
