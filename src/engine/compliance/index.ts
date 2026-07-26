import type { ComplianceInput, ComplianceReport, ComplianceResult } from './types'
import { evaluateZbcRules } from './zimbabwe'

export const SUPPORTED_JURISDICTIONS = [
  { value: 'zimbabwe', label: 'Zimbabwe (ZBC)' },
  { value: 'south-africa', label: 'South Africa (SANS 10400)' },
  { value: 'zambia', label: 'Zambia (Public Health Act CAP 295)' },
  { value: 'botswana', label: 'Botswana (Building Control Regs)' },
] as const

export function getJurisdictionLabel(value: string): string {
  return SUPPORTED_JURISDICTIONS.find((j) => j.value === value)?.label ?? value
}
import { evaluateSouthAfricaRules } from './southAfrica'
import { evaluateZambiaRules } from './zambia'
import { evaluateBotswanaRules } from './botswana'

export function runCompliance(jurisdiction: string, input: ComplianceInput): ComplianceReport {
  const warnings: string[] = []
  let results: ComplianceResult[] = []

  try {
    switch (jurisdiction) {
      case 'zimbabwe':
        results = evaluateZbcRules(input)
        break
      case 'south-africa':
        results = evaluateSouthAfricaRules(input)
        break
      case 'zambia':
        results = evaluateZambiaRules(input)
        break
      case 'botswana':
        results = evaluateBotswanaRules(input)
        break
      default: {
        warnings.push(`Unknown jurisdiction "${jurisdiction}". No compliance rules available.`)
        results = []
      }
    }
  } catch {
    warnings.push('Compliance engine failed')
    results = []
  }

  const totalRules = results.length
  const passedRules = results.filter((r) => r.status === 'pass').length
  const score = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0

  return { jurisdiction, results, score, totalRules, passedRules, warnings }
}

export function emptyCompliance(jurisdiction = 'zimbabwe'): ComplianceReport {
  return { jurisdiction, results: [], score: 0, totalRules: 0, passedRules: 0, warnings: ['No design data'] }
}

export function summarizeCompliance(report: ComplianceReport) {
  const passCount = report.results.filter((r) => r.status === 'pass').length
  const warnCount = report.results.filter((r) => r.status === 'warn').length
  const failCount = report.results.filter((r) => r.status === 'fail').length
  return { passCount, warnCount, failCount, hasCompliance: report.results.length > 0 }
}
