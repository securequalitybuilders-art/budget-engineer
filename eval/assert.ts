import type { GoldenExpect } from './golden-dataset'

export interface AssertionOutcome {
  pass: boolean
  reasons: string[]
  score: number
}

function stringifyOutput(output: unknown): string {
  if (typeof output === 'string') return output
  try {
    return JSON.stringify(output)
  } catch {
    return String(output)
  }
}

export function evaluateExpectations(output: unknown, expect: GoldenExpect): AssertionOutcome {
  const reasons: string[] = []
  const record = (output ?? {}) as Record<string, unknown>
  const text = stringifyOutput(output)

  const passIf = (condition: boolean, label: string): void => {
    if (!condition) reasons.push(label)
  }

  if (expect.validJson !== undefined) {
    let valid = true
    try {
      JSON.parse(typeof output === 'string' ? output : JSON.stringify(output))
    } catch {
      valid = false
    }
    passIf(valid === expect.validJson, expect.validJson ? 'output is not valid JSON' : 'output unexpectedly parses as JSON')
  }

  if (expect.quantity !== undefined) {
    const raw = record.quantity
    const quantity = typeof raw === 'number' ? raw : NaN
    const tolerance = (expect.quantityTolerancePct ?? 1) / 100
    const within = Number.isFinite(quantity) && Math.abs(quantity - expect.quantity) / expect.quantity <= tolerance
    passIf(within, `quantity ${quantity} is not within ${(tolerance * 100).toFixed(1)}% of ${expect.quantity}`)
  }

  for (const needle of expect.contains ?? []) {
    passIf(text.includes(needle), `output does not contain "${needle}"`)
  }

  const lowerText = text.toLowerCase()
  for (const needle of expect.notContains ?? []) {
    passIf(!lowerText.includes(needle.toLowerCase()), `output must not contain "${needle}"`)
  }

  for (const needle of expect.cites ?? []) {
    passIf(text.includes(needle), `output does not cite "${needle}"`)
  }

  if (expect.invalidInput !== undefined) {
    passIf(record.valid === false && record.nonCompliant !== true, 'input was not rejected as invalid')
  }

  if (expect.nonCompliantRefused !== undefined) {
    passIf(record.nonCompliant === true, 'non-compliant material was not refused')
  }

  if (expect.findingsNonEmpty !== undefined) {
    const findings = Array.isArray(record.findings) ? (record.findings as unknown[]) : []
    passIf(findings.length > 0 === expect.findingsNonEmpty, expect.findingsNonEmpty ? 'no compliance findings produced' : 'unexpected findings produced')
  }

  if (expect.minSources !== undefined) {
    const sources = Array.isArray(record.sources) ? (record.sources as unknown[]) : []
    passIf(sources.length >= expect.minSources, `fewer than ${expect.minSources} sources retrieved`)
  }

  if (expect.needsClarification !== undefined) {
    passIf(record.needsClarification === expect.needsClarification, `needsClarification should be ${expect.needsClarification}`)
  }

  if (expect.citationPattern !== undefined) {
    const sources = Array.isArray(record.sources) ? (record.sources as Record<string, unknown>[]) : []
    const citation = sources[0]?.citation
    const matches = typeof citation === 'string' && new RegExp(expect.citationPattern).test(citation)
    passIf(matches, `citation "${String(citation)}" does not match ${expect.citationPattern}`)
  }

  return { pass: reasons.length === 0, reasons, score: reasons.length === 0 ? 1 : 0 }
}
