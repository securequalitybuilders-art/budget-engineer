import type { RagComplianceFinding, RagComplianceReport, SearchResult } from './types'
import type { RagIndex } from './ragIndex'
import { extractConstraintsFromChunks } from './constraints'
import { hybridSearch } from './hybrid'
import { attachCitations } from './citation'
import { DEFAULT_RERANK_THRESHOLD, clarificationPrompt, rerankResults } from './rerank'
import { extractJson } from '@/lib/ai/brief-coercion'
import { getRemoteProvider, completeChat } from '@/lib/ai/remote-providers'
import { useAiSettingsStore } from '@/stores/aiSettingsStore'
import type { AiEngine, AiRemoteProvider } from '@/lib/ai/ai-types'
import { ziqsSmmSystem } from '@/lib/ai/prompts/ziqs_smm_prompt'
import { createTracer, type Trace } from './tracing'
import { NOT_FOUND_REASON, applyDegradationPolicy } from './gracefulDegradation'
import { logRAG } from '@/lib/observability/telemetry'

export interface AnalyzeOptions {
  query: string
  jurisdiction?: string
  k?: number
  minScore?: number
  hybrid?: boolean
  rerank?: boolean
  rerankThreshold?: number
  engine?: AiEngine
  apiKey?: string
  onTrace?: (trace: Trace) => void
  projectId?: string
  runId?: string
}

export interface CompliancePromptContext {
  query: string
  sources: SearchResult[]
}

export function buildComplianceContext(ctx: CompliancePromptContext): string {
  return ctx.sources
    .map((s, i) => `[${i + 1}] ${s.heading} (section ${s.sectionId}, score ${s.score.toFixed(3)})${s.citation ? ` ${s.citation}` : ''}\n${s.text.slice(0, 400)}`)
    .join('\n\n')
}

export const COMPLIANCE_PROMPT = (ctx: CompliancePromptContext) =>
  `${ziqsSmmSystem()}
You are a SADC building compliance analyst. Using ONLY the retrieved code sections below, answer the design question and report findings. Ground every finding in the regulations above; do not contradict the grounding with retrieved text.

Schema:
{"findings":[{"ruleId":string,"title":string,"status":"pass"|"warn"|"fail","actual":string,"required":string,"note":string,"sources":[string]}],"score":int,"warnings":[string]}

Question: "${ctx.query}"

Retrieved code sections:
${buildComplianceContext(ctx)}

Reply with ONLY the JSON object, no prose.
JSON:`

function localFindings(_query: string, sources: SearchResult[], degraded: boolean): { findings: RagComplianceFinding[]; warnings: string[] } {
  const constraints = extractConstraintsFromChunks(
    sources.map((s) => ({ id: s.chunkId, docId: s.docId, sectionId: s.sectionId, heading: s.heading, path: [s.heading], text: s.text })),
  )
  const findings: RagComplianceFinding[] = constraints.map((c) => ({
    ruleId: c.id,
    title: c.rule.category,
    status: degraded ? 'warn' : 'warn',
    actual: 'not checked',
    required: `${c.rule.operator === 'min' ? 'min' : c.rule.operator === 'max' ? 'max' : '='} ${c.rule.value}${c.rule.unit ? ` ${c.rule.unit}` : ''}`,
    note: degraded ? `Unverified — retrieval confidence below threshold. ${c.sourceText}` : c.sourceText,
    sources: [c.clauseRef],
  }))
  const warnings = sources.length === 0 ? ['No code sections retrieved for the query'] : []
  return { findings, warnings }
}

function citedSectionsFrom(findings: RagComplianceFinding[]): string[] {
  return Array.from(new Set(findings.flatMap((f) => f.sources).filter(Boolean)))
}

export async function analyzeCompliance(index: RagIndex, opts: AnalyzeOptions): Promise<RagComplianceReport> {
  const tracer = createTracer({ source: 'rag-analysis', query: opts.query, jurisdiction: opts.jurisdiction ?? 'zimbabwe' })
  const k = opts.k ?? 5
  const spanRetrieval = tracer.start('retrieval', { k, hybrid: opts.hybrid !== false })
  const rawSources = opts.hybrid === false
    ? index.search(opts.query, { k, minScore: opts.minScore ?? 0 })
    : hybridSearch(index, opts.query, { k, minScore: opts.minScore ?? 0 })
  spanRetrieval()
  const sources = attachCitations(rawSources)

  const rerank = opts.rerank ?? true
  const threshold = opts.rerankThreshold ?? DEFAULT_RERANK_THRESHOLD
  const spanRerank = tracer.start('rerank', { threshold })
  const outcome = rerankResults(opts.query, sources, { enabled: rerank, threshold })
  spanRerank()
  const rankedSources = outcome.results
  const degraded = outcome.needsClarification

  const base = {
    query: opts.query,
    jurisdiction: opts.jurisdiction ?? 'zimbabwe',
    sources: rankedSources,
    confidence: outcome.confidence,
    needsClarification: degraded,
  }

  const providerId = opts.engine ?? useAiSettingsStore.getState().engine
  const config = providerId && providerId !== 'local-rules' && providerId !== 'webllm' ? getRemoteProvider(providerId as AiRemoteProvider) : undefined
  const apiKey = opts.apiKey ?? useAiSettingsStore.getState().apiKeys[providerId as AiRemoteProvider]

  const emitTrace = (report: RagComplianceReport) => {
    void logRAG({
      query: opts.query,
      jurisdiction: report.jurisdiction,
      engineUsed: report.engineUsed,
      fellBack: report.fellBack,
      fallbackReason: report.fallbackReason,
      latencyMs: 0,
      confidence: outcome.confidence,
      rerankThreshold: threshold,
      hitCount: rankedSources.length,
      citedDocIds: rankedSources.map((s) => s.chunkId),
      knownDocIds: index.knownDocIds,
      needsClarification: report.needsClarification ?? degraded,
      projectId: opts.projectId,
      runId: opts.runId,
    }).catch(() => {})
    if (!opts.onTrace) return
    const trace = tracer.snapshot()
    opts.onTrace({
      ...trace,
      engineUsed: report.engineUsed,
      fellBack: report.fellBack,
      fallbackReason: report.fallbackReason,
      rerankConfidence: outcome.confidence,
      rerankThreshold: threshold,
      needsClarification: degraded,
      citedDocIds: rankedSources.map((s) => s.chunkId),
    })
  }

  const degradation = degraded ? applyDegradationPolicy(rankedSources, outcome.confidence, threshold, opts.query) : null

  // Never silently present an empty/weak retrieval as an answer. When the
  // degradation policy finds nothing above the relevance threshold, return the
  // explicit not-found report instead of fabricated findings.
  if (degradation && !degradation.found) {
    const report: RagComplianceReport = {
      query: opts.query,
      jurisdiction: opts.jurisdiction ?? 'zimbabwe',
      findings: [],
      score: 0,
      totalRules: 0,
      passedRules: 0,
      warnings: [degradation.message, clarificationPrompt(opts.query, outcome.confidence, threshold)],
      engineUsed: 'local-rules',
      fellBack: true,
      fallbackReason: degradation.fallbackReason,
      sources: [],
      citedSections: [],
      confidence: outcome.confidence,
      needsClarification: true,
    }
    emitTrace(report)
    return report
  }

  const degradationWarning = degraded
    ? [degradation?.message ?? clarificationPrompt(opts.query, outcome.confidence, threshold), clarificationPrompt(opts.query, outcome.confidence, threshold)]
    : []

  if (config && apiKey) {
    try {
      const content = await completeChat(config, apiKey, [{ role: 'user', content: COMPLIANCE_PROMPT({ query: opts.query, sources: rankedSources }) }])
      const json = extractJson(content) as {
        findings?: RagComplianceFinding[]
        score?: number
        warnings?: string[]
      }
      const findings = Array.isArray(json.findings) ? json.findings : []
      const total = findings.length
      const passed = findings.filter((f) => f.status === 'pass').length
      const report: RagComplianceReport = {
        ...base,
        findings,
        score: json.score ?? (total > 0 ? Math.round((passed / total) * 100) : 0),
        totalRules: total,
        passedRules: passed,
        warnings: [...degradationWarning, ...(Array.isArray(json.warnings) ? json.warnings : [])],
        engineUsed: config.id,
        citedSections: citedSectionsFrom(findings),
      }
      emitTrace(report)
      return report
    } catch (err) {
      const local = localFindings(opts.query, rankedSources, degraded)
      const report: RagComplianceReport = {
        ...base,
        findings: local.findings,
        score: 0,
        totalRules: local.findings.length,
        passedRules: 0,
        warnings: [...degradationWarning, ...local.warnings, err instanceof Error ? err.message : String(err)],
        engineUsed: 'local-rules',
        fellBack: true,
        fallbackReason: err instanceof Error ? err.message : String(err),
        citedSections: citedSectionsFrom(local.findings),
      }
      emitTrace(report)
      return report
    }
  }

  const local = localFindings(opts.query, rankedSources, degraded)
  const total = local.findings.length
  const passed = local.findings.filter((f) => f.status === 'pass').length
  const report: RagComplianceReport = {
    ...base,
    findings: local.findings,
    score: total > 0 ? Math.round((passed / total) * 100) : 0,
    totalRules: total,
    passedRules: passed,
    warnings: [...degradationWarning, ...local.warnings],
    engineUsed: providerId === 'webllm' ? 'local-rules' : config?.id ?? 'local-rules',
    fellBack: degraded || !!(config && providerId !== 'local-rules'),
    fallbackReason:
      config && providerId !== 'local-rules'
        ? 'No API key configured — using local constraint extraction'
        : degraded
          ? (degradation?.fallbackReason ?? NOT_FOUND_REASON)
          : undefined,
    citedSections: citedSectionsFrom(local.findings),
  }
  emitTrace(report)
  return report
}
