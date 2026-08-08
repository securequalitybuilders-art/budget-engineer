// KPI3 — Observability / tracing layer.
//
// The RAG pipeline and the agent orchestrator emit typed trace spans (retrieval
// latency, rerank confidence, token usage, cited doc IDs, HITL decisions).
// Traces are persisted locally (local-first analogue of Langfuse) and can be
// summarised to feed the golden-dataset improvement loop.

import { db } from '@/db/db'

export interface TraceSpan {
  name: string
  startedAtMs: number
  durationMs: number
  metadata?: Record<string, unknown>
}

export interface Trace {
  id: string
  projectId?: string
  runId?: string
  source: 'rag-analysis' | 'agent' | 'query-rewrite'
  query: string
  rewrittenQuery?: string
  jurisdiction?: string
  engineUsed?: string
  fellBack?: boolean
  fallbackReason?: string
  rerankConfidence?: number
  rerankThreshold?: number
  needsClarification?: boolean
  citedDocIds?: string[]
  hitlInterrupts?: string[]
  decision?: string | null
  spans: TraceSpan[]
  totalMs: number
  createdAt: string
}

export interface TraceSummary {
  totalTraces: number
  avgTotalMs: number
  avgRerankConfidence: number
  lowConfidenceCount: number
  fallbackCount: number
  hitlCount: number
  decisions: Record<string, number>
  slowestQueries: Array<{ query: string; totalMs: number }>
  lowConfidenceQueries: string[]
}

export function createTraceId(prefix = 'trace'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface Tracer {
  spans: TraceSpan[]
  start(name: string, metadata?: Record<string, unknown>): () => void
  snapshot(): Trace
}

export function createTracer(input: {
  id?: string
  projectId?: string
  runId?: string
  source: Trace['source']
  query: string
  jurisdiction?: string
}): Tracer {
  const spans: TraceSpan[] = []
  const startedAt = Date.now()
  return {
    spans,
    start(name: string, metadata?: Record<string, unknown>): () => void {
      const spanStartedAtMs = Date.now()
      return () => {
        spans.push({ name, startedAtMs: spanStartedAtMs, durationMs: Date.now() - spanStartedAtMs, metadata })
      }
    },
    snapshot(): Trace {
      return {
        id: input.id ?? createTraceId(),
        projectId: input.projectId,
        runId: input.runId,
        source: input.source,
        query: input.query,
        jurisdiction: input.jurisdiction,
        spans: [...spans],
        totalMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
      }
    },
  }
}

export async function persistTrace(trace: Trace): Promise<void> {
  await db.traces.put(trace)
}

export async function listTraces(projectId?: string, limit = 50): Promise<Trace[]> {
  const all = await db.traces.toArray()
  return all
    .filter((t) => (projectId ? t.projectId === projectId : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export function summarizeTraces(traces: Trace[]): TraceSummary {
  if (traces.length === 0) {
    return {
      totalTraces: 0,
      avgTotalMs: 0,
      avgRerankConfidence: 0,
      lowConfidenceCount: 0,
      fallbackCount: 0,
      hitlCount: 0,
      decisions: {},
      slowestQueries: [],
      lowConfidenceQueries: [],
    }
  }
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0)
  const confidences = traces.filter((t) => t.rerankConfidence !== undefined).map((t) => t.rerankConfidence as number)
  const decisions: Record<string, number> = {}
  for (const t of traces) {
    if (t.decision) decisions[t.decision] = (decisions[t.decision] ?? 0) + 1
  }
  const lowConf = traces.filter((t) => t.needsClarification || (t.rerankConfidence ?? 1) < 0.7)
  return {
    totalTraces: traces.length,
    avgTotalMs: Math.round(avg(traces.map((t) => t.totalMs))),
    avgRerankConfidence: Math.round(avg(confidences) * 1000) / 1000,
    lowConfidenceCount: lowConf.length,
    fallbackCount: traces.filter((t) => t.fellBack).length,
    hitlCount: traces.filter((t) => (t.hitlInterrupts?.length ?? 0) > 0).length,
    decisions,
    slowestQueries: [...traces]
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 5)
      .map((t) => ({ query: t.query, totalMs: t.totalMs })),
    lowConfidenceQueries: lowConf.slice(0, 10).map((t) => t.query),
  }
}

export function tracesToGoldenInputs(traces: Trace[]): Array<{ id: string; query: string; citation: string; expected: string }> {
  return traces
    .filter((t) => !t.needsClarification && (t.citedDocIds?.length ?? 0) > 0)
    .slice(0, 50)
    .map((t) => ({
      id: t.id,
      query: t.rewrittenQuery ?? t.query,
      citation: t.citedDocIds?.[0] ?? '',
      expected: 'retrieval should return the cited section',
    }))
}
