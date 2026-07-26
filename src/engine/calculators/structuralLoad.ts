export interface StructuralLoadInput {
  area: number
  occupancy?: StructuralOccupancy
  deadLoadOverride?: number
  liveLoadOverride?: number
  tributaryWidthM?: number
  tributaryLengthM?: number
  floors?: number
}

export interface StructuralLoadResult {
  deadLoadKnm2: number
  liveLoadKnm2: number
  totalLoadKnm2: number
  deadLoadTotalKn: number
  liveLoadTotalKn: number
  grandTotalKn: number
  occupancy: StructuralOccupancy
  tributaryLoadKn?: number
  isPreliminary: true
  warnings: string[]
}

export type StructuralOccupancy = 'residential' | 'office' | 'retail' | 'industrial' | 'storage' | 'roof' | 'educational' | 'institutional'

export const DEAD_LOADS: Record<StructuralOccupancy, number> = {
  residential: 4.0,
  office: 4.0,
  retail: 5.0,
  industrial: 6.0,
  storage: 5.0,
  roof: 2.0,
  educational: 4.5,
  institutional: 4.5,
}

export const LIVE_LOADS: Record<StructuralOccupancy, number> = {
  residential: 1.92,
  office: 2.40,
  retail: 4.79,
  industrial: 6.0,
  storage: 6.0,
  roof: 1.0,
  educational: 2.40,
  institutional: 2.40,
}

export function computeGravityLoads(input: StructuralLoadInput): StructuralLoadResult {
  const warnings: string[] = []

  const occupancy = input.occupancy ?? 'residential'

  if (input.area < 0) {
    warnings.push('Area is negative; using absolute value')
  }
  const area = Math.abs(input.area)

  const deadLoadKnm2 = input.deadLoadOverride ?? DEAD_LOADS[occupancy]
  const liveLoadKnm2 = input.liveLoadOverride ?? LIVE_LOADS[occupancy]

  if (deadLoadKnm2 < 0) {
    warnings.push('Dead load override is negative; using default')
  }
  if (liveLoadKnm2 < 0) {
    warnings.push('Live load override is negative; using default')
  }

  const safeDead = deadLoadKnm2 >= 0 ? deadLoadKnm2 : DEAD_LOADS[occupancy]
  const safeLive = liveLoadKnm2 >= 0 ? liveLoadKnm2 : LIVE_LOADS[occupancy]

  const totalLoadKnm2 = Number((safeDead + safeLive).toFixed(2))

  const floorCount = input.floors ?? 1
  const totalFloorArea = area * Math.max(1, floorCount)

  const deadLoadTotalKn = Number((safeDead * totalFloorArea).toFixed(2))
  const liveLoadTotalKn = Number((safeLive * totalFloorArea).toFixed(2))
  const grandTotalKn = Number((deadLoadTotalKn + liveLoadTotalKn).toFixed(2))

  let tributaryLoadKn: number | undefined
  if (input.tributaryWidthM != null && input.tributaryLengthM != null) {
    if (input.tributaryWidthM > 0 && input.tributaryLengthM > 0) {
      const tribArea = input.tributaryWidthM * input.tributaryLengthM
      tributaryLoadKn = Number((tribArea * totalLoadKnm2).toFixed(2))
    } else {
      warnings.push('Tributary dimensions must be positive; skipping tributary load')
    }
  }

  if (area === 0) {
    warnings.push('Area is zero; all loads are zero')
  }

  warnings.push('This is a PRELIMINARY structural load estimate — not a stamped engineering design')

  return {
    deadLoadKnm2: safeDead,
    liveLoadKnm2: safeLive,
    totalLoadKnm2,
    deadLoadTotalKn,
    liveLoadTotalKn,
    grandTotalKn,
    occupancy,
    tributaryLoadKn,
    isPreliminary: true,
    warnings,
  }
}

export const DEFAULTS = { DEAD_LOADS, LIVE_LOADS } as const
