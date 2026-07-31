import type { EnhancedBrief } from '../tier1/briefEnhancer'
import type { OptimizerResult, TopologyCandidate, WeightProfileId } from '../tier3/multiObjectiveOptimizer'
import type { CouncilPackage } from '../tier1/councilPackageAssembler'
import type { PlanModel } from '../../domain/plan'
import type { BuildingElement, DesignOption } from '../../domain/boq'
import type { Tier1ParsedBrief } from '../tier1-types'
import type { ComplianceReport, ComplianceInput } from '../compliance/types'

export interface PipelineInput {
  rawBriefText: string
  projectName?: string
  jurisdiction?: string
  uiBuildingType?: string
  weightProfile?: WeightProfileId
  siteWidthM?: number
  siteDepthM?: number
}

export interface PipelineStep {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  durationMs?: number
  error?: string
}

export interface PipelineResult {
  success: boolean
  brief: Tier1ParsedBrief | null
  enhancedBrief: EnhancedBrief | null
  optimizerResult: OptimizerResult | null
  selectedCandidate: TopologyCandidate | null
  planModel: PlanModel | null
  councilPackage: CouncilPackage | null
  complianceReport: ComplianceReport | null
  designOption: DesignOption | null
  steps: PipelineStep[]
  errors: string[]
}

type TimerHandle = ReturnType<typeof performance.now>

function elapsed(from: TimerHandle): number {
  return Math.round(performance.now() - from)
}

function makeStep(name: string, status: PipelineStep['status'], durationMs?: number, error?: string): PipelineStep {
  return { name, status, durationMs, error }
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const steps: PipelineStep[] = []
  const errors: string[] = []
  const profile: WeightProfileId = input.weightProfile ?? 'balanced'

  let brief: Tier1ParsedBrief
  let enhancedBrief: EnhancedBrief
  let optimizerResult: OptimizerResult | null = null
  let selectedCandidate: TopologyCandidate | null = null
  let planModel: PlanModel | null = null
  let councilPackage: CouncilPackage | null = null
  let complianceReport: ComplianceReport | null = null

  const t0 = performance.now()

  const fail = (stepName: string, error: string) => {
    steps.push(makeStep(stepName, 'failed', elapsed(t0), error))
    errors.push(`[${stepName}] ${error}`)
  }

  const pass = (stepName: string) => {
    steps.push(makeStep(stepName, 'passed', elapsed(t0)))
  }

  try {
    steps.push(makeStep('Parse Brief', 'running'))
    const { parseBrief } = await import('../parseBrief')
    brief = parseBrief(input.rawBriefText, { buildingType: input.uiBuildingType })
    brief.siteInfo = {
      widthM: input.siteWidthM ?? brief.siteInfo.widthM,
      depthM: input.siteDepthM ?? brief.siteInfo.depthM,
      areaM2: input.siteWidthM && input.siteDepthM ? input.siteWidthM * input.siteDepthM : brief.siteInfo.areaM2,
      aspect: input.siteWidthM && input.siteDepthM ? (input.siteWidthM / input.siteDepthM).toFixed(2) : brief.siteInfo.aspect,
    }
    pass('Parse Brief')
  } catch (e) {
    fail('Parse Brief', `Brief parsing failed: ${e instanceof Error ? e.message : String(e)}`)
    return { success: false, brief: null, enhancedBrief: null, optimizerResult: null, selectedCandidate: null, planModel: null, councilPackage: null, complianceReport: null, designOption: null, steps, errors }
  }

  try {
    steps.push(makeStep('Enhance Brief', 'running'))
    const { enhanceBrief } = await import('../tier1/briefEnhancer')
    enhancedBrief = enhanceBrief(brief)
    pass('Enhance Brief')
  } catch (e) {
    fail('Enhance Brief', `Brief enhancement failed: ${e instanceof Error ? e.message : String(e)}`)
    enhancedBrief = { ...brief, spatialConstraints: [] }
  }

  const designOption = buildDesignOption(brief, enhancedBrief)

  try {
    steps.push(makeStep('Multi-Objective Optimization', 'running'))
    const mod = await import('../tier3/multiObjectiveOptimizer')
    optimizerResult = await mod.optimize(brief, designOption)
    const top = mod.selectByProfile(optimizerResult, profile, 1)
    selectedCandidate = top[0] ?? optimizerResult.paretoFront[0] ?? null
    if (selectedCandidate) {
      planModel = selectedCandidate.planModel
      pass('Multi-Objective Optimization')
    } else {
      fail('Multi-Objective Optimization', 'No valid candidates generated across all topology/seed combinations')
    }
  } catch (e) {
    fail('Multi-Objective Optimization', `Optimization failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (planModel) {
    try {
      steps.push(makeStep('Compliance Check', 'running'))
      const jurisdiction = input.jurisdiction ?? 'south-africa'
      const complianceInput: ComplianceInput = {
        plan: planModel,
        design: designOption,
        analysis: null,
        buildingType: brief.typology?.id ?? 'house',
      }
      const { runCompliance } = await import('../compliance')
      complianceReport = runCompliance(jurisdiction, complianceInput)
      pass('Compliance Check')
    } catch (e) {
      fail('Compliance Check', `Compliance check failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      steps.push(makeStep('Council Package Assembly', 'running'))
      const { assembleCouncilPackage } = await import('../tier1/councilPackageAssembler')
      councilPackage = assembleCouncilPackage(planModel, designOption, enhancedBrief, selectedCandidate!, complianceReport, input.projectName)
      pass('Council Package Assembly')
    } catch (e) {
      fail('Council Package Assembly', `Package assembly failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const success = errors.length === 0

  return {
    success,
    brief,
    enhancedBrief,
    optimizerResult,
    selectedCandidate,
    planModel,
    councilPackage,
    complianceReport,
    designOption,
    steps,
    errors,
  }
}

function buildDesignOption(brief: Tier1ParsedBrief, _enhanced: EnhancedBrief): DesignOption {
  const grossFloorArea = brief.siteInfo.areaM2
    ? brief.siteInfo.areaM2 * 0.5
    : brief.program.reduce((s, p) => s + p.count * (p.areaM2 || 15), 0)
  const elements: BuildingElement[] = [
    { id: 'el-wall', type: 'wall', category: 'superstructure', name: 'External walls', unit: 'm2', quantity: Math.round(grossFloorArea * 0.8) },
    { id: 'el-slab', type: 'slab', category: 'substructure', name: 'Floor slab', unit: 'm2', quantity: Math.round(grossFloorArea) },
    { id: 'el-roof', type: 'roof', category: 'superstructure', name: 'Roof covering', unit: 'm2', quantity: Math.round(grossFloorArea * 1.2) },
  ]
  return {
    id: `opt-${Date.now()}`,
    name: `${brief.typology?.displayName ?? 'Design'} - Pipeline`,
    grossFloorArea,
    floors: 1,
    buildingType: brief.typology?.id ?? 'house',
    elements,
  }
}

export function formatPipelineReport(result: PipelineResult): string {
  const lines: string[] = []
  lines.push('='.repeat(60))
  lines.push('GENERATIVE DESIGN PIPELINE REPORT')
  lines.push('='.repeat(60))
  lines.push(`Status: ${result.success ? 'PASSED' : 'FAILED'}`)
  lines.push(`Errors: ${result.errors.length}`)
  lines.push('')
  lines.push('── Steps ──')
  for (const step of result.steps) {
    const icon = step.status === 'passed' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'running' ? '→' : '○'
    lines.push(`  ${icon} ${step.name} (${step.status})${step.durationMs ? ` ${step.durationMs}ms` : ''}${step.error ? `: ${step.error}` : ''}`)
  }
  lines.push('')
  lines.push('── Brief ──')
  const brief = result.brief
  lines.push(`  Typology: ${brief?.typology?.displayName ?? 'Not detected'} (${Math.round((brief?.typologyConfidence ?? 0) * 100)}%)`)
  lines.push(`  Site: ${brief?.siteInfo?.widthM ?? '?'}m x ${brief?.siteInfo?.depthM ?? '?'}m`)
  lines.push(`  Rooms: ${brief?.program?.length ?? 0}`)
  const spatialCount = result.enhancedBrief?.spatialConstraints?.length ?? 0
  lines.push(`  Spatial constraints: ${spatialCount}`)
  lines.push('')
  if (result.selectedCandidate) {
    lines.push('── Selected Candidate ──')
    lines.push(`  Topology: ${result.selectedCandidate.topology}`)
    lines.push(`  Seed: ${result.selectedCandidate.seed}`)
    const s = result.selectedCandidate.scores
    lines.push(`  Scores: efficiency=${(s.efficiency * 100).toFixed(0)}% wet-core=${(s.wetCoreClustering * 100).toFixed(0)}% structural=${(s.structuralEfficiency * 100).toFixed(0)}% circulation=${(s.circulation * 100).toFixed(0)}% daylight=${(s.daylightAccess * 100).toFixed(0)}%`)
  }
  lines.push('')
  if (result.optimizerResult) {
    lines.push(`── Optimization ──`)
    lines.push(`  Total candidates: ${result.optimizerResult.candidates.length}`)
    lines.push(`  Pareto front: ${result.optimizerResult.paretoFront.length}`)
    lines.push(`  Topologies: ${[...new Set(result.optimizerResult.candidates.map(c => c.topology))].join(', ')}`)
  }
  lines.push('')
  if (result.complianceReport) {
    const cr = result.complianceReport
    lines.push(`── Compliance (${cr.jurisdiction}) ──`)
    lines.push(`  Score: ${cr.score}% (${cr.passedRules}/${cr.totalRules} rules passed)`)
    if (cr.warnings.length > 0) {
      lines.push('  Warnings:')
      for (const w of cr.warnings) lines.push(`    • ${w}`)
    }
  }
  lines.push('')
  if (result.councilPackage) {
    const cp = result.councilPackage
    lines.push(`── Council Package ──`)
    lines.push(`  Sheets: ${cp.sheets.length} (${cp.sheets[0]?.sheetNumber ?? ''} - ${cp.sheets[cp.sheets.length - 1]?.sheetNumber ?? ''})`)
    lines.push(`  Drawing register: ${cp.drawingRegister.length} entries`)
    lines.push(`  Room schedule: ${cp.roomSchedule.length} rooms`)
    lines.push(`  BOQ: ${cp.boqSummary.currency} ${cp.boqSummary.totalCost.toLocaleString()}`)
    lines.push(`  Disciplines: ${[...new Set(cp.sheets.map(s => s.discipline))].join(', ')}`)
  }
  lines.push('')
  lines.push('='.repeat(60))
  return lines.join('\n')
}
