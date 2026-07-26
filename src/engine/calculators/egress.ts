import type { RoomAreaInput } from './areaSchedule'

export interface EgressInput {
  rooms?: RoomAreaInput[]
  area?: number
  occupantLoadFactor?: number
  useType?: UseType
  maxTravelDistanceM?: number
}

export interface EgressResult {
  occupantLoad: number
  occupantLoadFactor: number
  requiredExitWidthM: number
  numberOfExits: number
  exitCapacity: number
  maxTravelDistanceM: number
  travelDistanceOk: boolean
  actualTravelDistanceM?: number
  warnings: string[]
}

export type UseType = 'assembly-concentrated' | 'assembly-less-concentrated' | 'business' | 'educational' | 'industrial' | 'institutional' | 'mercantile' | 'residential' | 'storage'

export const OCCUPANT_LOAD_FACTORS: Record<UseType, number> = {
  'assembly-concentrated': 0.65,
  'assembly-less-concentrated': 1.4,
  business: 9.3,
  educational: 1.85,
  industrial: 9.3,
  institutional: 22.3,
  mercantile: 2.8,
  residential: 18.6,
  storage: 27.9,
}

export const MAX_TRAVEL_DISTANCES: Record<UseType, number> = {
  'assembly-concentrated': 45,
  'assembly-less-concentrated': 45,
  business: 60,
  educational: 45,
  industrial: 60,
  institutional: 45,
  mercantile: 45,
  residential: 45,
  storage: 60,
}

function computeExits(count: number): number {
  if (count <= 49) return 1
  if (count <= 500) return 2
  if (count <= 1000) return 3
  return 4
}

export function computeOccupancyAndEgress(input: EgressInput): EgressResult {
  const warnings: string[] = []

  const useType = input.useType ?? 'residential'
  const occupantLoadFactor = input.occupantLoadFactor ?? OCCUPANT_LOAD_FACTORS[useType]

  let occupantLoad: number
  if (input.rooms && input.rooms.length > 0) {
    const totalArea = input.rooms.reduce((s, r) => s + Math.max(0, r.area), 0)
    occupantLoad = occupantLoadFactor > 0 ? Math.ceil(totalArea / occupantLoadFactor) : 0
  } else if (input.area != null && input.area >= 0) {
    occupantLoad = occupantLoadFactor > 0 ? Math.ceil(input.area / occupantLoadFactor) : 0
  } else {
    warnings.push('No area provided for occupant load calculation')
    occupantLoad = 0
  }

  if (occupantLoadFactor <= 0) {
    warnings.push('Occupant load factor must be positive; using residential default')
  }

  occupantLoad = occupantLoad > 0 ? occupantLoad : 0

  const requiredExitWidthM = occupantLoad > 0 ? Number((occupantLoad * 0.0076).toFixed(3)) : 0
  const numberOfExits = computeExits(occupantLoad)
  const exitCapacity = numberOfExits * 0.33

  const maxTravelDistanceM = MAX_TRAVEL_DISTANCES[useType]
  const actualTravelDistanceM = input.maxTravelDistanceM
  const travelDistanceOk = actualTravelDistanceM != null ? actualTravelDistanceM <= maxTravelDistanceM : true

  return {
    occupantLoad,
    occupantLoadFactor,
    requiredExitWidthM,
    numberOfExits,
    exitCapacity: Number(exitCapacity.toFixed(4)),
    maxTravelDistanceM,
    travelDistanceOk,
    actualTravelDistanceM,
    warnings,
  }
}

export const DEFAULTS = { OCCUPANT_LOAD_FACTORS, MAX_TRAVEL_DISTANCES } as const
