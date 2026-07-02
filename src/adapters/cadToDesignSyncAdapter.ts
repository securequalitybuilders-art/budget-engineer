import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import type { BimModel } from '@/domain/bim'
import type { AnalysisResult } from '@/adapters/designToAnalysis'
import type { BoqResult } from '@/adapters/designToBoq'
import { designOptionToBimModel } from '@/adapters/designToBim'
import { buildAnalysisFromDesignOption } from '@/adapters/designToAnalysis'
import { buildBoqFromDesignOption } from '@/adapters/designToBoq'

export type GeometrySource = 'generated-design' | 'persisted-cad' | 'fallback-generated'

export interface CadSyncMetadata {
  source: GeometrySource
  hasSavedPlan: boolean
  hasCadEdits: boolean
}

export function buildCadSyncMetadata(
  savedPlanExists: boolean,
  planMatchesGenerated: boolean,
): CadSyncMetadata {
  if (savedPlanExists && !planMatchesGenerated) {
    return { source: 'persisted-cad', hasSavedPlan: true, hasCadEdits: true }
  }
  if (savedPlanExists) {
    return { source: 'generated-design', hasSavedPlan: true, hasCadEdits: false }
  }
  return { source: 'generated-design', hasSavedPlan: false, hasCadEdits: false }
}

export function deriveBimFromCadOrDesign(input: {
  plan?: PlanModel | null
  design: DesignOption | null
  source: GeometrySource
}): BimModel | null {
  return designOptionToBimModel(input.design)
}

export function deriveBoqFromCadOrDesign(input: {
  plan?: PlanModel | null
  design: DesignOption | null
  region?: string
  source: GeometrySource
}): BoqResult | null {
  return buildBoqFromDesignOption(input.design, input.region)
}

export function deriveAnalysisFromCadOrDesign(input: {
  plan?: PlanModel | null
  design: DesignOption | null
  source: GeometrySource
}): AnalysisResult {
  return buildAnalysisFromDesignOption(input.design)
}
