import type { DesignOption } from '@/domain/boq'
import { buildBoqFromDesignOption, getCostPerM2 } from '@/adapters/designToBoq'

export interface CostEstimateInput {
  design: DesignOption
  region?: string
}

export interface CostEstimateResult {
  grandTotal: number
  costPerM2: number
  currency: string
  subtotal: number
  contingency: number
  professionalFees: number
  vat: number
  boqReused: boolean
  warnings: string[]
}

export function estimateCost(input: CostEstimateInput): CostEstimateResult {
  if (!input.design || input.design.grossFloorArea <= 0) {
    return {
      grandTotal: 0, costPerM2: 0, currency: 'USD',
      subtotal: 0, contingency: 0, professionalFees: 0, vat: 0,
      boqReused: true,
      warnings: ['No valid design provided'],
    }
  }

  const region = input.region ?? 'zimbabwe'
  const boq = buildBoqFromDesignOption(input.design, region)

  if (!boq) {
    return {
      grandTotal: 0, costPerM2: 0, currency: 'USD',
      subtotal: 0, contingency: 0, professionalFees: 0, vat: 0,
      boqReused: true,
      warnings: ['BOQ engine returned null'],
    }
  }

  const costPerM2 = getCostPerM2(boq, input.design.grossFloorArea)

  return {
    grandTotal: boq.summary.grandTotal,
    costPerM2,
    currency: boq.currency,
    subtotal: boq.summary.subtotal,
    contingency: boq.summary.contingency,
    professionalFees: boq.summary.professionalFees,
    vat: boq.summary.vat,
    boqReused: true,
    warnings: [],
  }
}
