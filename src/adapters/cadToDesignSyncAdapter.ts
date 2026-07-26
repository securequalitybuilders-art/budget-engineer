import type { DesignOption } from '@/domain/boq'
import type { PlanModel } from '@/domain/plan'
import type { CadDocument } from '@/domain/cad'
import type { BimModel } from '@/domain/bim'
import type { AnalysisResult } from '@/adapters/designToAnalysis'
import type { BoqResult, BoqSourceMetadata } from '@/adapters/designToBoq'
import { designOptionToBimModel } from '@/adapters/designToBim'
import { buildCadFromDesignOption } from '@/adapters/designToAnalysis'
import { buildBoqFromDesignOption } from '@/adapters/designToBoq'
import { convertPlanModelToCadDocument } from '@/adapters/planModelToCadAdapter'
import { extractCadDocumentQuantities } from '@/adapters/cadQuantitiesAdapter'
import { detectBimClashes } from '@/lib/analysis/clash-checker'
import { computeSolarAnalysis } from '@/lib/analysis/solar-analyzer'
import { computeMepTakeoff } from '@/lib/quantities/mep-takeoff'

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
  projectId?: string
}): BoqResult | null {
  const { plan, design, region, source, projectId } = input

  if (!design || design.grossFloorArea <= 0) return null

  let cad: import('@/domain/cad').CadDocument | null = null
  const sourceWarnings: string[] = []
  let geometrySource: GeometrySource = source
  let quantitySourceLabel = 'Generated design geometry'
  let cadQuantities: import('@/adapters/cadQuantitiesAdapter').CadQuantities | null = null

  if (plan) {
    const result = convertPlanModelToCadDocument({ plan, projectId, designId: design.id })
    if (result.cad && result.source === 'persisted-cad') {
      cad = result.cad
      geometrySource = 'persisted-cad'
      quantitySourceLabel = 'Edited CAD / persisted plan'
      cadQuantities = extractCadDocumentQuantities(cad)
    } else {
      sourceWarnings.push(...result.warnings)
    }
  }

  if (!cad && sourceWarnings.length > 0) {
    geometrySource = 'fallback-generated'
    quantitySourceLabel = 'Fallback generated geometry'
    sourceWarnings.push('Using generated-design fallback for BOQ geometry')
  }

  const computedAt = new Date().toISOString()

  const sourceMetadata: BoqSourceMetadata = {
    geometrySource,
    quantitySourceLabel,
    sourceWarnings: sourceWarnings.length > 0 ? sourceWarnings : undefined,
    computedAt,
    designId: design.id,
    projectId: projectId ?? undefined,
    cadDocumentId: cad?.id,
  }

  const boq = buildBoqFromDesignOption(design, region, sourceMetadata, cadQuantities)

  return boq
}

export function deriveAnalysisFromCadOrDesign(input: {
  plan?: PlanModel | null
  design: DesignOption | null
  source: GeometrySource
}): AnalysisResult {
  const { plan, design } = input

  if (!design || design.grossFloorArea <= 0) {
    return { bim: null, cad: null, clashes: null, solar: null, mep: null, warnings: [] }
  }

  const bim = designOptionToBimModel(design)
  const warnings: string[] = []

  let cad: CadDocument | null = null

  if (plan) {
    const result = convertPlanModelToCadDocument({ plan, projectId: '', designId: design.id })
    if (result.cad && result.source === 'persisted-cad') {
      cad = result.cad
      warnings.push(...result.warnings)
    } else {
      warnings.push(...result.warnings)
    }
  }

  if (!cad) {
    try {
      const fallbackCad = buildCadFromDesignOption(design)
      if (fallbackCad) {
        cad = fallbackCad
        warnings.push('Using generated-design fallback for CAD geometry')
      } else {
        warnings.push('Could not build CAD model for clash/solar analysis')
      }
    } catch {
      warnings.push('Error building CAD model from design')
    }
  }

  const enrichedBim = bim
    ? { ...bim, elements: [...bim.elements] }
    : null

  const clashes = bim && cad
    ? (() => { try { return detectBimClashes(cad) } catch { return null } })()
    : null

  const solar = cad
    ? (() => { try { return computeSolarAnalysis(cad) } catch { return null } })()
    : null

  const mep = enrichedBim
    ? (() => { try { return computeMepTakeoff(enrichedBim) } catch { return null } })()
    : null

  if (!bim) warnings.push('Could not build BIM model for analysis')
  if (clashes === null && cad) warnings.push('Clash detection encountered an error')
  if (solar === null && cad) warnings.push('Solar analysis encountered an error')
  if (mep === null) warnings.push('MEP takeoff encountered an error')

  return {
    bim,
    cad,
    clashes,
    solar,
    mep,
    warnings,
  }
}

export function deriveCadFromPlan(plan: PlanModel | null, designId?: string): CadDocument | null {
  const result = convertPlanModelToCadDocument({ plan, designId })
  return result.source === 'persisted-cad' ? result.cad : null
}
