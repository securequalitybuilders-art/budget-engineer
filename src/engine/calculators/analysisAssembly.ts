import type { PlanModel, RoomRect } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { BOQ } from '@/lib/boq/boq-types'
import { roomArea } from '@/lib/geometry/plan-geometry'
import { computeAreaSchedule, type RoomAreaInput, type AreaScheduleResult } from './areaSchedule'
import { computeUValue, type MaterialLayer, type UValueResult } from './uValue'
import { estimateDaylightFactor, type DaylightResult } from './daylight'
import { computeOccupancyAndEgress, type EgressResult, type UseType } from './egress'
import { computeGravityLoads, type StructuralLoadResult, type StructuralOccupancy } from './structuralLoad'
import { estimateEnergyDemand, type EnergyDemandResult } from './energyDemand'
import { estimateCost, type CostEstimateResult } from './costEstimate'

export interface AnalysisInput {
  plan: PlanModel | null
  design: DesignOption | null
  boq: BOQ | null
  buildingType: string
}

export interface DefaultEnvelopeAssembly {
  wallLayers: MaterialLayer[]
  roofLayers: MaterialLayer[]
  targetUValue: number
}

export interface EnvelopeResult {
  wall: UValueResult
  roof: UValueResult
}

export interface AnalysisResult {
  areaSchedule: AreaScheduleResult
  envelope: EnvelopeResult | null
  daylight: DaylightResult | null
  egress: EgressResult
  structural: StructuralLoadResult
  energy: EnergyDemandResult
  cost: CostEstimateResult
  roomDaylightFlags: number
  warnings: string[]
}

export const DEFAULT_WALL_ASSEMBLY: MaterialLayer[] = [
  { thicknessM: 0.105, thermalConductivity: 0.77, description: 'Brick outer' },
  { thicknessM: 0.05, thermalConductivity: 0.04, description: 'Cavity insulation' },
  { thicknessM: 0.1, thermalConductivity: 0.15, description: 'Block inner' },
  { thicknessM: 0.013, thermalConductivity: 0.5, description: 'Plaster' },
]

export const DEFAULT_ROOF_ASSEMBLY: MaterialLayer[] = [
  { thicknessM: 0.01, thermalConductivity: 1.0, description: 'Roof tiles' },
  { thicknessM: 0.1, thermalConductivity: 0.04, description: 'Insulation' },
  { thicknessM: 0.01, thermalConductivity: 0.5, description: 'Ceiling board' },
]

const WALL_TARGETS: Record<string, number> = {
  house: 0.45,
  apartment: 0.45,
  office: 0.50,
  school: 0.45,
  clinic: 0.45,
  retail: 0.50,
  industrial: 0.55,
  storage: 0.55,
}

const OCCUPANCY_MAP: Record<string, StructuralOccupancy> = {
  house: 'residential',
  apartment: 'residential',
  office: 'office',
  school: 'educational',
  clinic: 'institutional',
  retail: 'retail',
  industrial: 'industrial',
  storage: 'storage',
}

const USE_TYPE_MAP: Record<string, UseType> = {
  house: 'residential',
  apartment: 'residential',
  office: 'business',
  school: 'educational',
  clinic: 'institutional',
  retail: 'mercantile',
  industrial: 'industrial',
  storage: 'storage',
}

export function getDefaultEnvelope(buildingType: string): DefaultEnvelopeAssembly {
  const target = WALL_TARGETS[buildingType] ?? 0.50
  return { wallLayers: DEFAULT_WALL_ASSEMBLY, roofLayers: DEFAULT_ROOF_ASSEMBLY, targetUValue: target }
}

export function roomsToAreaInputs(rooms: RoomRect[]): RoomAreaInput[] {
  return rooms.map((r) => ({ area: roomArea(r), name: r.name, type: r.name }))
}

export function estimateEnvelope(buildingType: string): EnvelopeResult {
  const env = getDefaultEnvelope(buildingType)
  const wall = computeUValue({ layers: env.wallLayers }, env.targetUValue)
  const roof = computeUValue({ layers: env.roofLayers }, env.targetUValue)
  return { wall, roof }
}

export function assembleAnalysis(input: AnalysisInput): AnalysisResult {
  const warnings: string[] = []
  const { plan, design, boq, buildingType } = input

  const bt = buildingType || 'house'

  const rooms = plan?.rooms ?? []
  const roomInputs = roomsToAreaInputs(rooms)

  const areaSchedule = computeAreaSchedule(
    roomInputs,
    design?.grossFloorArea ? design.grossFloorArea : undefined,
  )

  let envelope: EnvelopeResult | null = null
  try {
    envelope = estimateEnvelope(bt)
  } catch {
    warnings.push('Envelope U-value calculation failed')
  }

  let daylight: DaylightResult | null = null
  let roomDaylightFlags = 0
  if (rooms.length > 0) {
    try {
      const totalGlazing = Math.max(0.1, rooms.length * 2)
      const totalRoomArea = areaSchedule.netUsableArea || design?.grossFloorArea || 150
      daylight = estimateDaylightFactor({ roomArea: totalRoomArea, glazingArea: totalGlazing })
      if (!daylight.passes) roomDaylightFlags++
      for (const r of rooms) {
        const ra = roomArea(r)
        if (ra > 0) {
          const roomDf = estimateDaylightFactor({ roomArea: ra, glazingArea: Math.max(0.5, ra * 0.12) })
          if (!roomDf.passes) roomDaylightFlags++
        }
      }
    } catch {
      warnings.push('Daylight analysis failed')
    }
  }

  let egress: EgressResult
  try {
    const useType = USE_TYPE_MAP[bt] ?? 'residential'
    egress = computeOccupancyAndEgress({ rooms: roomInputs.length > 0 ? roomInputs : undefined, area: design?.grossFloorArea, useType })
  } catch {
    egress = computeOccupancyAndEgress({ area: 0 })
    warnings.push('Egress calculation failed')
  }

  let structural: StructuralLoadResult
  try {
    const occupancy = OCCUPANCY_MAP[bt] ?? 'residential'
    structural = computeGravityLoads({ area: design?.grossFloorArea ?? 0, occupancy, floors: design?.floors ?? 1 })
  } catch {
    structural = computeGravityLoads({ area: 0 })
    warnings.push('Structural load calculation failed')
  }

  let energy: EnergyDemandResult
  try {
    const area = design?.grossFloorArea ?? areaSchedule.grossFloorArea
    const envU = envelope?.wall.uValue ?? 0.5
    const envArea = area * 2.8 * 4
    energy = estimateEnergyDemand({ grossFloorArea: area, envelopeUValue: envU, envelopeArea: envArea })
  } catch {
    energy = estimateEnergyDemand({ grossFloorArea: 0, envelopeUValue: 0, envelopeArea: 0 })
    warnings.push('Energy demand calculation failed')
  }

  let cost: CostEstimateResult
  if (boq && design) {
    try {
      cost = estimateCost({ design, region: 'zimbabwe' })
    } catch {
      cost = { grandTotal: 0, costPerM2: 0, currency: 'USD', subtotal: 0, contingency: 0, professionalFees: 0, vat: 0, boqReused: true, warnings: ['Cost estimate failed'] }
      warnings.push('Cost estimate failed')
    }
  } else if (design) {
    try {
      cost = estimateCost({ design, region: 'zimbabwe' })
    } catch {
      cost = { grandTotal: 0, costPerM2: 0, currency: 'USD', subtotal: 0, contingency: 0, professionalFees: 0, vat: 0, boqReused: true, warnings: ['Cost estimate failed'] }
      warnings.push('Cost estimate failed')
    }
  } else {
    cost = { grandTotal: 0, costPerM2: 0, currency: 'USD', subtotal: 0, contingency: 0, professionalFees: 0, vat: 0, boqReused: true, warnings: ['No design available'] }
  }

  return { areaSchedule, envelope, daylight, egress, structural, energy, cost, roomDaylightFlags, warnings }
}

export function emptyAnalysis(): AnalysisResult {
  return {
    areaSchedule: { grossFloorArea: 0, netUsableArea: 0, circulationArea: 0, circulationPercent: 0, roomCount: 0, areaPerRoom: [], efficiencyRatio: 0, warnings: ['No design'] },
    envelope: null,
    daylight: null,
    egress: computeOccupancyAndEgress({ area: 0 }),
    structural: computeGravityLoads({ area: 0 }),
    energy: estimateEnergyDemand({ grossFloorArea: 0, envelopeUValue: 0, envelopeArea: 0 }),
    cost: { grandTotal: 0, costPerM2: 0, currency: 'USD', subtotal: 0, contingency: 0, professionalFees: 0, vat: 0, boqReused: true, warnings: ['No design'] },
    roomDaylightFlags: 0,
    warnings: [],
  }
}
