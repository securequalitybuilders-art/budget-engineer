import type { ComplianceInput, ComplianceReport, ComplianceResult } from './types'
import { evaluateZbcRules } from './zimbabwe'

/**
 * Run compliance checks for a given jurisdiction.
 *
 * To add a new jurisdiction (e.g. 'south-africa'):
 * 1. Create src/engine/compliance/southAfrica.ts exporting `evaluateSouthAfricaRules(input): ComplianceResult[]`
 * 2. Import it here and add a case in the switch below.
 */
export function runCompliance(jurisdiction: string, input: ComplianceInput): ComplianceReport {
  const warnings: string[] = []
  let results: ComplianceResult[] = []

  try {
    switch (jurisdiction) {
      case 'zimbabwe':
        results = evaluateZbcRules(input)
        break
      // TODO: Add south-africa (SANS 10400), zambia, botswana, etc.
      //   case 'south-africa':
      //     results = evaluateSouthAfricaRules(input)
      //     break
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
