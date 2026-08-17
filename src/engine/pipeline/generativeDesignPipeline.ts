import type { EnhancedBrief } from '../tier1/briefEnhancer'
import type { OptimizerResult, TopologyCandidate, WeightProfileId } from '../tier3/multiObjectiveOptimizer'
import type { CouncilPackage } from '../tier1/councilPackageAssembler'
import type { PlanModel } from '../../domain/plan'
import type { BuildingElement, DesignOption } from '../../domain/boq'
import type { Tier1ParsedBrief } from '../tier1-types'
import type { ComplianceReport, ComplianceInput } from '../compliance/types'
import type { ConstraintEvaluation } from '../architecture/typologies/types'
import { createStateMachine, type NodeDefinition, type NodeOutcome, type StateMachine } from '../agents/stateMachine'

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
  constraintEvaluation: ConstraintEvaluation | null
  designOption: DesignOption | null
  steps: PipelineStep[]
  errors: string[]
}

// The pipeline runs on the shared checkpointable state machine
// (`src/engine/agents/stateMachine.ts`), the same engine as the KPI2 agent
// orchestrator. Each stage is a node; the machine records `running`/`passed`/
// `failed` steps and routes around failures via conditional edges (an
// optimizer failure skips compliance/package, a brief-parse failure skips
// everything — exactly the pre-rewrite behaviour).

interface PipelineNodeState {
  steps: PipelineStep[]
  errors: string[]
  brief: Tier1ParsedBrief | null
  enhancedBrief: EnhancedBrief | null
  designOption: DesignOption | null
  optimizerResult: OptimizerResult | null
  selectedCandidate: TopologyCandidate | null
  planModel: PlanModel | null
  councilPackage: CouncilPackage | null
  complianceReport: ComplianceReport | null
  constraintEvaluation: ConstraintEvaluation | null
}

const NODE_PARSE = 'parseBriefNode'
const NODE_ENHANCE = 'enhanceBriefNode'
const NODE_OPTIMIZE = 'optimizeNode'
const NODE_COMPLIANCE = 'complianceNode'
const NODE_PACKAGE = 'packageNode'
const NODE_DONE = 'doneNode'

type TimerHandle = ReturnType<typeof performance.now>

function elapsed(from: TimerHandle): number {
  return Math.round(performance.now() - from)
}

function makeStep(name: string, status: PipelineStep['status'], durationMs?: number, error?: string): PipelineStep {
  return { name, status, durationMs, error }
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const t0 = performance.now()
  const initialState: PipelineNodeState = {
    steps: [],
    errors: [],
    brief: null,
    enhancedBrief: null,
    designOption: null,
    optimizerResult: null,
    selectedCandidate: null,
    planModel: null,
    councilPackage: null,
    complianceReport: null,
    constraintEvaluation: null,
  }
  const machine = createPipelineMachine(input, t0)
  const { state } = await machine.run(initialState, input, { maxSteps: 10 })

  return {
    success: state.errors.length === 0,
    brief: state.brief,
    enhancedBrief: state.enhancedBrief,
    optimizerResult: state.optimizerResult,
    selectedCandidate: state.selectedCandidate,
    planModel: state.planModel,
    councilPackage: state.councilPackage,
    complianceReport: state.complianceReport,
    constraintEvaluation: state.constraintEvaluation,
    designOption: state.designOption,
    steps: state.steps,
    errors: state.errors,
  }
}

function createPipelineMachine(input: PipelineInput, t0: TimerHandle): StateMachine<PipelineNodeState, PipelineInput> {
  const errorOf = (e: unknown): string => (e instanceof Error ? e.message : String(e))

  const failStep = (state: PipelineNodeState, steps: PipelineStep[], name: string, message: string): NodeOutcome<PipelineNodeState> => ({
    state: {
      ...state,
      steps: [...steps, makeStep(name, 'failed', elapsed(t0), message)],
      errors: [...state.errors, `[${name}] ${message}`],
    },
  })

  const parseBriefNode: NodeDefinition<PipelineNodeState, PipelineInput> = {
    name: NODE_PARSE,
    run: async (state) => {
      const steps = [...state.steps, makeStep('Parse Brief', 'running')]
      try {
        const { parseBrief } = await import('../parseBrief')
        const brief = parseBrief(input.rawBriefText, { buildingType: input.uiBuildingType })
        brief.siteInfo = {
          widthM: input.siteWidthM ?? brief.siteInfo.widthM,
          depthM: input.siteDepthM ?? brief.siteInfo.depthM,
          areaM2: input.siteWidthM && input.siteDepthM ? input.siteWidthM * input.siteDepthM : brief.siteInfo.areaM2,
          aspect: input.siteWidthM && input.siteDepthM ? (input.siteWidthM / input.siteDepthM).toFixed(2) : brief.siteInfo.aspect,
        }
        return { state: { ...state, brief, steps: [...steps, makeStep('Parse Brief', 'passed', elapsed(t0))] } }
      } catch (e) {
        return failStep(state, steps, 'Parse Brief', `Brief parsing failed: ${errorOf(e)}`)
      }
    },
  }

  const enhanceBriefNode: NodeDefinition<PipelineNodeState, PipelineInput> = {
    name: NODE_ENHANCE,
    run: async (state) => {
      const steps = [...state.steps, makeStep('Enhance Brief', 'running')]
      try {
        const { enhanceBrief } = await import('../tier1/briefEnhancer')
        const enhancedBrief = enhanceBrief(state.brief!)
        return {
          state: {
            ...state,
            enhancedBrief,
            designOption: buildDesignOption(state.brief!, enhancedBrief),
            steps: [...steps, makeStep('Enhance Brief', 'passed', elapsed(t0))],
          },
        }
      } catch (e) {
        const message = `Brief enhancement failed: ${errorOf(e)}`
        const enhancedBrief: EnhancedBrief = { ...state.brief!, spatialConstraints: [] }
        return {
          state: {
            ...state,
            enhancedBrief,
            designOption: buildDesignOption(state.brief!, enhancedBrief),
            steps: [...steps, makeStep('Enhance Brief', 'failed', elapsed(t0), message)],
            errors: [...state.errors, `[Enhance Brief] ${message}`],
          },
        }
      }
    },
  }

  const optimizeNode: NodeDefinition<PipelineNodeState, PipelineInput> = {
    name: NODE_OPTIMIZE,
    run: async (state) => {
      const steps = [...state.steps, makeStep('Multi-Objective Optimization', 'running')]
      try {
        const mod = await import('../tier3/multiObjectiveOptimizer')
        const optimizerResult = await mod.optimize(state.brief!, state.designOption!)
        const top = mod.selectByProfile(optimizerResult, input.weightProfile ?? 'balanced', 1)
        const selectedCandidate = top[0] ?? optimizerResult.paretoFront[0] ?? null
        if (selectedCandidate) {
          return {
            state: {
              ...state,
              optimizerResult,
              selectedCandidate,
              planModel: selectedCandidate.planModel,
              constraintEvaluation: selectedCandidate.planModel?.constraintEvaluation ?? null,
              steps: [...steps, makeStep('Multi-Objective Optimization', 'passed', elapsed(t0))],
            },
          }
        }
        const message = 'No valid candidates generated across all topology/seed combinations'
        return {
          state: {
            ...state,
            optimizerResult,
            steps: [...steps, makeStep('Multi-Objective Optimization', 'failed', elapsed(t0), message)],
            errors: [...state.errors, `[Multi-Objective Optimization] ${message}`],
          },
        }
      } catch (e) {
        return failStep(state, steps, 'Multi-Objective Optimization', `Optimization failed: ${errorOf(e)}`)
      }
    },
  }

  const complianceNode: NodeDefinition<PipelineNodeState, PipelineInput> = {
    name: NODE_COMPLIANCE,
    run: async (state) => {
      const steps = [...state.steps, makeStep('Compliance Check', 'running')]
      try {
        const jurisdiction = input.jurisdiction ?? 'south-africa'
        const complianceInput: ComplianceInput = {
          plan: state.planModel!,
          design: state.designOption!,
          analysis: null,
          buildingType: state.brief?.typology?.id ?? 'house',
        }
        const { runCompliance } = await import('../compliance')
        const complianceReport = runCompliance(jurisdiction, complianceInput)
        return { state: { ...state, complianceReport, steps: [...steps, makeStep('Compliance Check', 'passed', elapsed(t0))] } }
      } catch (e) {
        return failStep(state, steps, 'Compliance Check', `Compliance check failed: ${errorOf(e)}`)
      }
    },
  }

  const packageNode: NodeDefinition<PipelineNodeState, PipelineInput> = {
    name: NODE_PACKAGE,
    run: async (state) => {
      const steps = [...state.steps, makeStep('Council Package Assembly', 'running')]
      try {
        const { assembleCouncilPackage } = await import('../tier1/councilPackageAssembler')
        const councilPackage = assembleCouncilPackage(state.planModel!, state.designOption!, state.enhancedBrief!, state.selectedCandidate!, state.complianceReport, input.projectName)
        return { state: { ...state, councilPackage, steps: [...steps, makeStep('Council Package Assembly', 'passed', elapsed(t0))] } }
      } catch (e) {
        return failStep(state, steps, 'Council Package Assembly', `Package assembly failed: ${errorOf(e)}`)
      }
    },
  }

  return createStateMachine<PipelineNodeState, PipelineInput>({
    nodes: { [NODE_PARSE]: parseBriefNode, [NODE_ENHANCE]: enhanceBriefNode, [NODE_OPTIMIZE]: optimizeNode, [NODE_COMPLIANCE]: complianceNode, [NODE_PACKAGE]: packageNode },
    start: NODE_PARSE,
    end: NODE_DONE,
    edges: {
      [NODE_ENHANCE]: NODE_OPTIMIZE,
      [NODE_COMPLIANCE]: NODE_PACKAGE,
      [NODE_PACKAGE]: NODE_DONE,
    },
    conditionalEdges: {
      [NODE_PARSE]: (s) => (s.brief ? NODE_ENHANCE : NODE_DONE),
      [NODE_OPTIMIZE]: (s) => (s.planModel ? NODE_COMPLIANCE : NODE_DONE),
    },
    maxSteps: 10,
    maxRetries: 0,
  })
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
  if (result.constraintEvaluation) {
    const ce = result.constraintEvaluation
    lines.push(`── Typology Constraints (${ce.typologyId}) ──`)
    lines.push(`  Score: ${(ce.score * 100).toFixed(0)}% (${ce.summary.passed}/${ce.summary.totalRules} passed)`)
    lines.push(`  Errors: ${ce.summary.errors}  Warnings: ${ce.summary.warnings}  Info: ${ce.summary.info}`)
    const errors = ce.findings.filter(f => f.severity === 'error')
    if (errors.length > 0) {
      lines.push('  Errors:')
      for (const e of errors) lines.push(`    • [${e.domain}] ${e.message}`)
    }
    const warnings = ce.findings.filter(f => f.severity === 'warning')
    if (warnings.length > 0) {
      lines.push('  Warnings:')
      for (const w of warnings) lines.push(`    • [${w.domain}] ${w.message}`)
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
