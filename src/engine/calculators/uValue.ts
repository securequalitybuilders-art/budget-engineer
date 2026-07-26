export interface MaterialLayer {
  thicknessM: number
  thermalConductivity: number
  description?: string
}

export interface UValueInput {
  layers: MaterialLayer[]
  insideSurfaceResistance?: number
  outsideSurfaceResistance?: number
}

export interface UValueResult {
  uValue: number
  totalResistance: number
  layerResistances: number[]
  passes: boolean
  targetUValue: number | null
  warnings: string[]
}

export const DEFAULT_RSI = 0.13
export const DEFAULT_RSO = 0.04

export function computeUValue(input: UValueInput, targetUValue?: number): UValueResult {
  const warnings: string[] = []

  if (!input.layers || input.layers.length === 0) {
    return { uValue: 0, totalResistance: 0, layerResistances: [], passes: false, targetUValue: targetUValue ?? null, warnings: ['No layers provided'] }
  }

  const invalidLayer = input.layers.find((l) => l.thicknessM <= 0 || l.thermalConductivity <= 0)
  if (invalidLayer) {
    warnings.push(`Invalid layer${invalidLayer.description ? ` "${invalidLayer.description}"` : ''}: thickness and conductivity must be positive`)
  }

  const rsi = input.insideSurfaceResistance ?? DEFAULT_RSI
  const rso = input.outsideSurfaceResistance ?? DEFAULT_RSO

  if (rsi < 0) {
    warnings.push('Inside surface resistance is negative; using default')
  }
  if (rso < 0) {
    warnings.push('Outside surface resistance is negative; using default')
  }

  const safeRsi = rsi >= 0 ? rsi : DEFAULT_RSI
  const safeRso = rso >= 0 ? rso : DEFAULT_RSO

  const layerResistances = input.layers.map((l) => {
    if (l.thicknessM <= 0 || l.thermalConductivity <= 0) return 0
    return Number((l.thicknessM / l.thermalConductivity).toFixed(4))
  })

  const totalResistance = Number((safeRsi + layerResistances.reduce((s, r) => s + r, 0) + safeRso).toFixed(4))

  const uValue = totalResistance > 0 ? Number((1 / totalResistance).toFixed(4)) : 0

  if (totalResistance <= 0) {
    warnings.push('Total thermal resistance is zero or negative; check layer inputs')
  }

  const target = targetUValue ?? null
  const passes = target !== null ? uValue <= target : true

  return { uValue, totalResistance, layerResistances, passes, targetUValue: target, warnings }
}

export const DEFAULTS = { DEFAULT_RSI, DEFAULT_RSO } as const
