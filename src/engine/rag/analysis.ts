import type { RagComplianceFinding, RagComplianceReport, SearchResult } from './types'
import type { RagIndex } from './ragIndex'
import { extractConstraintsFromChunks } from './constraints'
import { extractJson } from '@/lib/ai/brief-coercion'
import { getRemoteProvider, completeChat } from '@/lib/ai/remote-providers'
import { useAiSettingsStore } from '@/stores/aiSettingsStore'
import type { AiRemoteProvider } from '@/lib/ai/ai-types'

export interface AnalyzeOptions {
  query: string
  jurisdiction?: string
  k?: number
  minScore?: number
  engine?: AiRemoteProvider
  apiKey?: string
}

export interface CompliancePromptContext {
  query: string
  sources: SearchResult[]
}

export function buildComplianceContext(ctx: CompliancePromptContext): string {
  return ctx.sources
    .map((s, i) => `[${i + 1}] ${s.heading} (section ${s.sectionId}, score ${s.score.toFixed(3)})\n${s.text.slice(0, 400)}`)
    .join('\n\n')
}

export const COMPLIANCE_PROMPT = (ctx: CompliancePromptContext) =>
  `You are a SADC building compliance analyst. Using ONLY the retrieved code sections below, answer the design question and report findings.

Schema:
{"findings":[{"ruleId":string,"title":string,"status":"pass"|"warn"|"fail","actual":string,"required":string,"note":string,"sources":[string]}],"score":int,"warnings":[string]}

Question: "${ctx.query}"

Retrieved code sections:
${buildComplianceContext(ctx)}

Reply with ONLY the JSON object, no prose.
JSON:`

function localFindings(_query: string, sources: SearchResult[]): { findings: RagComplianceFinding[]; warnings: string[] } {
  const constraints = extractConstraintsFromChunks(
    sources.map((s) => ({ id: s.chunkId, docId: s.docId, sectionId: s.sectionId, heading: s.heading, path: [s.heading], text: s.text })),
  )
  const findings: RagComplianceFinding[] = constraints.map((c) => ({
    ruleId: c.id,
    title: c.rule.category,
    status: 'warn',
    actual: 'not checked',
    required: `${c.rule.operator === 'min' ? 'min' : c.rule.operator === 'max' ? 'max' : '='} ${c.rule.value}${c.rule.unit ? ` ${c.rule.unit}` : ''}`,
    note: c.sourceText,
    sources: [c.clauseRef],
  }))
  const warnings = sources.length === 0 ? ['No code sections retrieved for the query'] : []
  return { findings, warnings }
}

export async function analyzeCompliance(index: RagIndex, opts: AnalyzeOptions): Promise<RagComplianceReport> {
  const sources = index.search(opts.query, { k: opts.k ?? 5, minScore: opts.minScore ?? 0 })
  const base = { query: opts.query, jurisdiction: opts.jurisdiction ?? 'zimbabwe', sources }

  const providerId = opts.engine ?? useAiSettingsStore.getState().engine
  const config = providerId && providerId !== 'local-rules' && providerId !== 'webllm' ? getRemoteProvider(providerId as AiRemoteProvider) : undefined
  const apiKey = opts.apiKey ?? useAiSettingsStore.getState().apiKeys[providerId as AiRemoteProvider]

  if (config && apiKey) {
    try {
      const content = await completeChat(config, apiKey, [{ role: 'user', content: COMPLIANCE_PROMPT({ query: opts.query, sources }) }])
      const json = extractJson(content) as {
        findings?: RagComplianceFinding[]
        score?: number
        warnings?: string[]
      }
      const findings = Array.isArray(json.findings) ? json.findings : []
      const total = findings.length
      const passed = findings.filter((f) => f.status === 'pass').length
      return {
        ...base,
        findings,
        score: json.score ?? (total > 0 ? Math.round((passed / total) * 100) : 0),
        totalRules: total,
        passedRules: passed,
        warnings: Array.isArray(json.warnings) ? json.warnings : [],
        engineUsed: config.id,
        sources,
      }
    } catch (err) {
      const local = localFindings(opts.query, sources)
      return {
        ...base,
        findings: local.findings,
        score: 0,
        totalRules: local.findings.length,
        passedRules: 0,
        warnings: [...local.warnings, err instanceof Error ? err.message : String(err)],
        engineUsed: 'local-rules',
        fellBack: true,
        fallbackReason: err instanceof Error ? err.message : String(err),
        sources,
      }
    }
  }

  const local = localFindings(opts.query, sources)
  const total = local.findings.length
  const passed = local.findings.filter((f) => f.status === 'pass').length
  return {
    ...base,
    findings: local.findings,
    score: total > 0 ? Math.round((passed / total) * 100) : 0,
    totalRules: total,
    passedRules: passed,
    warnings: local.warnings,
    engineUsed: providerId === 'webllm' ? 'local-rules' : config?.id ?? 'local-rules',
    fellBack: !!(config && providerId !== 'local-rules'),
    fallbackReason: config && providerId !== 'local-rules' ? 'No API key configured — using local constraint extraction' : undefined,
    sources,
  }
}
