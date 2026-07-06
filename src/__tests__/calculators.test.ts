import { describe, it, expect } from 'vitest'
import { computeAreaSchedule } from '@/engine/calculators/areaSchedule'
import { computeUValue } from '@/engine/calculators/uValue'
import { estimateDaylightFactor } from '@/engine/calculators/daylight'
import { computeOccupancyAndEgress } from '@/engine/calculators/egress'
import { computeGravityLoads } from '@/engine/calculators/structuralLoad'
import { estimateEnergyDemand } from '@/engine/calculators/energyDemand'
import { estimateCost } from '@/engine/calculators/costEstimate'
import { buildBoqFromDesignOption, getCostPerM2 } from '@/adapters/designToBoq'
import type { DesignOption } from '@/domain/boq'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-1', name: 'Test House',
    grossFloorArea: 150, floors: 1, buildingType: 'house',
    elements: [],
    ...overrides,
  }
}

describe('areaSchedule', () => {
  it('computes schedule for standard rooms', () => {
    const rooms = [
      { area: 25, name: 'Living', type: 'living' },
      { area: 15, name: 'Bedroom 1', type: 'bedroom' },
      { area: 10, name: 'Kitchen', type: 'kitchen' },
      { area: 6, name: 'Bathroom', type: 'bathroom' },
      { area: 8, name: 'Hallway', type: 'circulation' },
    ]
    const r = computeAreaSchedule(rooms, 75)
    expect(r.netUsableArea).toBe(64)
    expect(r.grossFloorArea).toBe(75)
    expect(r.circulationArea).toBe(11)
    expect(r.roomCount).toBe(5)
    expect(r.efficiencyRatio).toBeCloseTo(0.8533, 3)
  })

  it('estimates gross floor area when not provided', () => {
    const rooms = [{ area: 50 }, { area: 30 }]
    const r = computeAreaSchedule(rooms)
    expect(r.netUsableArea).toBe(80)
    expect(r.grossFloorArea).toBeCloseTo(106.67, 1)
    expect(r.efficiencyRatio).toBeCloseTo(0.75, 2)
  })

  it('returns zero result for empty rooms', () => {
    const r = computeAreaSchedule([])
    expect(r.grossFloorArea).toBe(0)
    expect(r.roomCount).toBe(0)
    expect(r.warnings).toContain('No rooms provided')
  })

  it('handles negative room area', () => {
    const rooms = [{ area: 20 }, { area: -5 }]
    const r = computeAreaSchedule(rooms)
    expect(r.netUsableArea).toBe(20)
    expect(r.roomCount).toBe(1)
    expect(r.warnings.some((w) => w.includes('negative'))).toBe(true)
  })
})

describe('uValue', () => {
  it('computes U-value for a standard brick cavity wall', () => {
    const r = computeUValue({
      layers: [
        { thicknessM: 0.105, thermalConductivity: 0.77, description: 'Brick outer' },
        { thicknessM: 0.05, thermalConductivity: 0.04, description: 'Cavity insulation' },
        { thicknessM: 0.1, thermalConductivity: 0.15, description: 'Block inner' },
        { thicknessM: 0.013, thermalConductivity: 0.5, description: 'Plaster' },
      ],
    })
    expect(r.layerResistances.length).toBe(4)
    expect(r.totalResistance).toBeGreaterThan(0)
    expect(r.uValue).toBeGreaterThan(0)
    expect(r.uValue).toBeLessThan(1)
    expect(r.passes).toBe(true)
  })

  it('fails against a strict target', () => {
    const r = computeUValue({
      layers: [{ thicknessM: 0.2, thermalConductivity: 1.0, description: 'Concrete' }],
    }, 0.3)
    expect(r.passes).toBe(false)
    expect(r.uValue).toBeGreaterThan(0.3)
  })

  it('returns zero for empty layers', () => {
    const r = computeUValue({ layers: [] })
    expect(r.uValue).toBe(0)
    expect(r.warnings).toContain('No layers provided')
  })

  it('handles negative Rsi/Rso gracefully', () => {
    const r = computeUValue({ layers: [{ thicknessM: 0.2, thermalConductivity: 0.5 }], insideSurfaceResistance: -1, outsideSurfaceResistance: -1 })
    expect(r.uValue).toBeGreaterThan(0)
    expect(r.warnings.some((w) => w.includes('surface'))).toBe(true)
  })
})

describe('daylight', () => {
  it('estimates average daylight factor for a typical room', () => {
    const r = estimateDaylightFactor({ roomArea: 20, glazingArea: 4 })
    expect(r.averageDaylightFactor).toBeGreaterThan(0)
    expect(r.glazingToFloorRatio).toBe(0.2)
    expect(r.passes).toBe(r.averageDaylightFactor >= 2)
  })

  it('fails for small glazing relative to room', () => {
    const r = estimateDaylightFactor({ roomArea: 100, glazingArea: 2 })
    expect(r.averageDaylightFactor).toBeLessThan(2)
    expect(r.passes).toBe(false)
  })

  it('returns zero for zero room area', () => {
    const r = estimateDaylightFactor({ roomArea: 0, glazingArea: 5 })
    expect(r.averageDaylightFactor).toBe(0)
    expect(r.warnings).toContain('Room area must be positive')
  })

  it('returns zero for negative glazing', () => {
    const r = estimateDaylightFactor({ roomArea: 20, glazingArea: -1 })
    expect(r.averageDaylightFactor).toBe(0)
    expect(r.warnings).toContain('Glazing area cannot be negative')
  })

  it('respects custom target DF', () => {
    const r = estimateDaylightFactor({ roomArea: 20, glazingArea: 4 }, 5)
    expect(r.targetDf).toBe(5)
    expect(r.passes).toBe(r.averageDaylightFactor >= 5)
  })
})

describe('egress', () => {
  it('computes occupant load for residential area', () => {
    const r = computeOccupancyAndEgress({ area: 186, useType: 'residential' })
    expect(r.occupantLoad).toBe(10)
    expect(r.occupantLoadFactor).toBe(18.6)
    expect(r.numberOfExits).toBe(1)
    expect(r.requiredExitWidthM).toBeGreaterThan(0)
  })

  it('computes occupant load from rooms array', () => {
    const r = computeOccupancyAndEgress({ rooms: [{ area: 100 }, { area: 86 }], useType: 'residential' })
    expect(r.occupantLoad).toBe(10)
  })

  it('handles assembly occupancy with large area', () => {
    const r = computeOccupancyAndEgress({ area: 500, useType: 'assembly-concentrated' })
    expect(r.occupantLoad).toBe(770)
    expect(r.numberOfExits).toBe(3)
  })

  it('checks travel distance', () => {
    const r = computeOccupancyAndEgress({ area: 100, useType: 'business', maxTravelDistanceM: 70 })
    expect(r.travelDistanceOk).toBe(false)
    expect(r.maxTravelDistanceM).toBe(60)
  })

  it('returns safe result for no area', () => {
    const r = computeOccupancyAndEgress({})
    expect(r.occupantLoad).toBe(0)
    expect(r.warnings.some((w) => w.includes('No area'))).toBe(true)
  })
})

describe('structuralLoad', () => {
  it('computes gravity loads for residential', () => {
    const r = computeGravityLoads({ area: 150, occupancy: 'residential' })
    expect(r.deadLoadKnm2).toBe(4.0)
    expect(r.liveLoadKnm2).toBe(1.92)
    expect(r.totalLoadKnm2).toBeCloseTo(5.92, 2)
    expect(r.grandTotalKn).toBeGreaterThan(0)
    expect(r.isPreliminary).toBe(true)
  })

  it('computes tributary load', () => {
    const r = computeGravityLoads({ area: 200, occupancy: 'office', tributaryWidthM: 4, tributaryLengthM: 5 })
    expect(r.tributaryLoadKn).toBeGreaterThan(0)
  })

  it('handles zero area', () => {
    const r = computeGravityLoads({ area: 0 })
    expect(r.grandTotalKn).toBe(0)
    expect(r.warnings.some((w) => w.includes('zero'))).toBe(true)
  })

  it('handles negative area gracefully', () => {
    const r = computeGravityLoads({ area: -100 })
    expect(r.grandTotalKn).toBeGreaterThan(0)
  })
})

describe('energyDemand', () => {
  it('estimates annual heating and cooling demand', () => {
    const r = estimateEnergyDemand({
      grossFloorArea: 150,
      envelopeUValue: 0.5,
      envelopeArea: 300,
    })
    expect(r.annualHeatingDemandKwh).toBeGreaterThan(0)
    expect(r.annualCoolingDemandKwh).toBeGreaterThan(0)
    expect(r.annualHeatingDemandKwhM2).toBeGreaterThan(0)
    expect(r.annualCoolingDemandKwhM2).toBeGreaterThan(0)
    expect(r.method).toBe('degree-day-envelope')
  })

  it('returns zero for zero floor area', () => {
    const r = estimateEnergyDemand({ grossFloorArea: 0, envelopeUValue: 0.5, envelopeArea: 0 })
    expect(r.annualHeatingDemandKwh).toBe(0)
    expect(r.warnings).toContain('Gross floor area must be positive')
  })

  it('handles custom degree days', () => {
    const r = estimateEnergyDemand({ grossFloorArea: 150, envelopeUValue: 0.5, envelopeArea: 300, heatingDegreeDays: 2000, coolingDegreeDays: 1000 })
    expect(r.annualHeatingDemandKwh).toBeGreaterThan(0)
    expect(r.annualHeatingDemandKwh).toBeGreaterThan(0)
  })
})

describe('costEstimate', () => {
  it('returns cost summary reusing existing BOQ engine', () => {
    const design = makeDesign()
    const r = estimateCost({ design })
    expect(r.grandTotal).toBeGreaterThan(0)
    expect(r.costPerM2).toBeGreaterThan(0)
    expect(r.currency).toBe('USD')
    expect(r.boqReused).toBe(true)
    expect(r.warnings).toHaveLength(0)
  })

  it('matches the existing BOQ total for a sample design', () => {
    const design = makeDesign()
    const direct = buildBoqFromDesignOption(design, 'zimbabwe')
    const wrapper = estimateCost({ design, region: 'zimbabwe' })
    expect(direct).not.toBeNull()
    expect(wrapper.grandTotal).toBe(direct!.summary.grandTotal)
    expect(wrapper.costPerM2).toBe(getCostPerM2(direct!, design.grossFloorArea))
  })

  it('returns zero for null design', () => {
    const r = estimateCost({ design: null as unknown as DesignOption })
    expect(r.grandTotal).toBe(0)
    expect(r.warnings).toContain('No valid design provided')
  })

  it('returns zero for zero-area design', () => {
    const r = estimateCost({ design: makeDesign({ grossFloorArea: 0 }) })
    expect(r.grandTotal).toBe(0)
  })
})
