import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import type { AnalysisResult } from '@/engine/calculators/analysisAssembly'

export type ComplianceStatus = 'pass' | 'warn' | 'fail'

export interface ComplianceRuleDef {
  id: string
  jurisdiction: string
  category: string
  title: string
  requirement: string
  evaluate(input: ComplianceInput): ComplianceResult
}

export interface ComplianceResult {
  ruleId: string
  category: string
  title: string
  status: ComplianceStatus
  actual: string
  required: string
  note: string
}

export interface ComplianceInput {
  plan: PlanModel | null
  design: DesignOption | null
  analysis: AnalysisResult | null
  buildingType: string
}

export interface ComplianceReport {
  jurisdiction: string
  results: ComplianceResult[]
  score: number
  totalRules: number
  passedRules: number
  warnings: string[]
}

export interface ComplianceSummary {
  passCount: number
  warnCount: number
  failCount: number
  hasCompliance: boolean
}
