import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isVagueQuery, deterministicRewrite, resolveHistory, rewriteQuery, REWRITE_PROMPT } from '@/engine/rag/queryRewrite'
import { createTracer, summarizeTraces, persistTrace, listTraces, tracesToGoldenInputs } from '@/engine/rag/tracing'
import { analyzeCompliance } from '@/engine/rag/analysis'
import { parseCodeDocument } from '@/engine/rag/extraction'
import { createIndex } from '@/engine/rag/ragIndex'
import { runBudgetAgent, resumeAgent, createInitialState } from '@/engine/agents'
import { callTool } from '@/engine/agents/graph'
import { findTool, toolsFor, validateToolArgs } from '@/engine/agents/tools'
import { loadLatestCheckpoint, listAgentRuns, getAgentRun } from '@/engine/agents/checkpoint'
import { calculateConcrete } from '@/engine/estimation/concreteCalculator'
import { db } from '@/db/db'

const CODE_TEXT = `
1 General Requirements
1.1 A habitable room shall have a minimum floor area of 6 m2.
1.2 Minimum ceiling height shall not be less than 2.4 m.

2 Ventilation
2.1 Every habitable room shall be provided with natural ventilation.
2.2 See clause 1.1 for room area requirements.
`

beforeEach(async () => {
  await db.agentRuns.clear()
  await db.agentCheckpoints.clear()
  await db.traces.clear()
})

describe('KPI1 — query rewriting layer', () => {
  it('detects vague queries', () => {
    expect(isVagueQuery('what are the requirements?')).toBe(true)
    expect(isVagueQuery('is it ok')).toBe(true)
    expect(isVagueQuery('zbc')).toBe(true)
    expect(isVagueQuery('what')).toBe(true)
    expect(isVagueQuery('minimum ceiling height under SANS 10400-K')).toBe(false)
    expect(isVagueQuery('Model Building By-Laws 1977 minimum wall thickness')).toBe(false)
  })

  it('expands abbreviations and strips filler deterministically', () => {
    const { rewritten, rationale } = deterministicRewrite('please tell me the zbc reqs for wall thickness', { jurisdiction: 'zimbabwe' })
    expect(rewritten.toLowerCase()).toContain('model building by-laws 1977')
    expect(rewritten.toLowerCase()).toContain('requirements')
    expect(rewritten.toLowerCase()).toContain('zimbabwe')
    expect(rewritten).not.toMatch(/please|tell me/i)
    expect(rationale.length).toBeGreaterThan(0)
  })

  it('adds jurisdiction context when missing', () => {
    const { rewritten } = deterministicRewrite('minimum ceiling height', { jurisdiction: 'zimbabwe' })
    expect(rewritten).toContain('(zimbabwe)')
    const identity = deterministicRewrite('minimum ceiling height zimbabwe', { jurisdiction: 'zimbabwe' })
    expect(identity.rewritten).not.toContain('(zimbabwe)')
  })

  it('resolves anaphora against conversation history', () => {
    const history = [
      { role: 'user' as const, content: 'What is the minimum wall thickness?' },
      { role: 'assistant' as const, content: 'Clause 3.2: boundary walls are 230 mm.' },
    ]
    const { resolved, rationale } = resolveHistory('is it required here too?', history)
    expect(resolved).toContain('boundary walls')
    expect(rationale[0]).toContain('resolved anaphora against prior subject')
  })

  it('returns identity when no history exists', () => {
    const { resolved, rationale } = resolveHistory('minimum ceiling height', [])
    expect(resolved).toBe('minimum ceiling height')
    expect(rationale[0]).toContain('no history')
  })

  it('produces a full rewritten query object with method=identity for already-precise queries', async () => {
    const result = await rewriteQuery('minimum ceiling height zimbabwe', { jurisdiction: 'zimbabwe' })
    expect(result.original).toBe('minimum ceiling height zimbabwe')
    expect(result.rewritten).toBe('minimum ceiling height zimbabwe')
    expect(result.vague).toBe(false)
    expect(['identity', 'local']).toContain(result.method)
  })

  it('uses the remote LLM path when a provider + key are supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"rewritten":"SANS 10400-K minimum wall thickness","vague":false,"rationale":["made precise"]}' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await rewriteQuery('wall thickness?', { engine: 'gemini', apiKey: 'k' })
    expect(result.method).toBe('remote')
    expect(result.rewritten).toBe('SANS 10400-K minimum wall thickness')
    expect(fetchMock).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('falls back to local rewrite when the remote call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    const result = await rewriteQuery('zbc reqs', { engine: 'gemini', apiKey: 'k' })
    expect(result.method).toBe('local')
    expect(result.rewritten).toContain('Model Building By-Laws')
    vi.unstubAllGlobals()
  })

  it('builds a prompt including history and jurisdiction', () => {
    const prompt = REWRITE_PROMPT('is it required?', [{ role: 'user', content: 'what is the minimum ceiling height?' }], 'zimbabwe')
    expect(prompt).toContain('is it required?')
    expect(prompt).toContain('zimbabwe')
    expect(prompt).toContain('USER: what is the minimum ceiling height?')
  })
})

describe('KPI1/KPI3 — RAG analysis emits traces', () => {
  it('records retrieval + rerank spans and cited doc ids', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    let capturedTrace: import('@/engine/rag/tracing').Trace | undefined
    const report = await analyzeCompliance(index, {
      query: 'minimum ceiling height',
      onTrace: (t) => {
        capturedTrace = t
      },
    })
    expect(report.findings.length).toBeGreaterThan(0)
    expect(capturedTrace).toBeDefined()
    expect(capturedTrace?.spans.map((s) => s.name)).toContain('retrieval')
    expect(capturedTrace?.spans.map((s) => s.name)).toContain('rerank')
    expect(capturedTrace?.citedDocIds?.length).toBeGreaterThan(0)
  })
})

describe('KPI3 — tracing / observability', () => {
  it('createTracer snapshots spans with durations', () => {
    const tracer = createTracer({ source: 'agent', query: 'q' })
    const close = tracer.start('retrieval', { k: 5 })
    close()
    const trace = tracer.snapshot()
    expect(trace.spans.length).toBe(1)
    expect(trace.spans[0].name).toBe('retrieval')
    expect(trace.spans[0].durationMs).toBeGreaterThanOrEqual(0)
    expect(trace.totalMs).toBeGreaterThanOrEqual(0)
    expect(trace.query).toBe('q')
  })

  it('persists and lists traces from Dexie', async () => {
    await persistTrace({
      id: 't1',
      source: 'rag-analysis',
      query: 'min ceiling height',
      rerankConfidence: 0.92,
      citedDocIds: ['a', 'b'],
      spans: [{ name: 'x', startedAtMs: 1, durationMs: 2 }],
      totalMs: 2,
      createdAt: new Date().toISOString(),
    })
    const listed = await listTraces()
    expect(listed.length).toBe(1)
    expect(listed[0].rerankConfidence).toBe(0.92)
  })

  it('summarizes traces for the golden-loop', () => {
    const base = (id: string, extra: Partial<import('@/engine/rag/tracing').Trace>) =>
      ({
        id,
        source: 'rag-analysis',
        query: `q-${id}`,
        spans: [],
        totalMs: id === 'slow' ? 500 : 10,
        createdAt: new Date().toISOString(),
        ...extra,
      }) as import('@/engine/rag/tracing').Trace
    const summary = summarizeTraces([
      base('slow', { needsClarification: true, rerankConfidence: 0.4, fellBack: true }),
      base('ok', { rerankConfidence: 0.95 }),
      base('hitl', { hitlInterrupts: ['high-value'], decision: 'APPROVED' }),
    ])
    expect(summary.totalTraces).toBe(3)
    expect(summary.lowConfidenceCount).toBe(1)
    expect(summary.fallbackCount).toBe(1)
    expect(summary.hitlCount).toBe(1)
    expect(summary.decisions['APPROVED']).toBe(1)
    expect(summary.slowestQueries[0].query).toBe('q-slow')
    expect(summary.lowConfidenceQueries).toContain('q-slow')
  })

  it('converts traced queries into golden-dataset inputs', () => {
    const mk = (overrides: Partial<import('@/engine/rag/tracing').Trace>) =>
      ({ id: 'a', source: 'rag-analysis' as const, query: 'q', spans: [], totalMs: 1, createdAt: new Date().toISOString(), ...overrides })
    const inputs = tracesToGoldenInputs([
      mk({ citedDocIds: ['sec-1'] }),
      mk({ needsClarification: true }),
    ])
    expect(inputs.length).toBe(1)
    expect(inputs[0].citation).toBe('sec-1')
  })
})

describe('KPI2 — agent orchestrator tools', () => {
  it('scopes tools to their nodes', () => {
    const researcher = toolsFor('researcher').map((t) => t.id)
    const calculator = toolsFor('calculator').map((t) => t.id)
    const validator = toolsFor('validator').map((t) => t.id)
    const supervisor = toolsFor('supervisor').map((t) => t.id)
    expect(researcher).toContain('search-codes')
    expect(researcher).not.toContain('calculate-bricks')
    expect(calculator).toContain('calculate-bricks')
    expect(calculator).toContain('compute-tco')
    expect(validator).toContain('validate-plan-si56')
    expect(supervisor).toContain('gono-go-decision')
  })

  it('refuses tools outside the active node scope', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    const s0 = createInitialState({ runId: 'r1', query: 'q', jurisdiction: 'zimbabwe' })
    const out = await callTool(s0, { ragIndex: index }, 'calculate-bricks', { lengthM: 10, heightM: 3, wallThicknessMm: 230 })
    expect(out.result).toContain('not scoped to node')
    expect(out.state.toolCalls[0].ok).toBe(false)
  })

  it('validates tool args by schema', () => {
    const tool = findTool('compute-tco')
    expect(tool).toBeDefined()
    expect(validateToolArgs(tool!, { priceCents: 'bad' })).toContain('priceCents must be a number')
    expect(validateToolArgs(tool!, { priceCents: 100 })).toEqual([])
  })

  it('calculate-concrete returns volumes and materials', () => {
    const result = calculateConcrete({ lengthM: 10, widthM: 5, thicknessM: 0.15 })
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.volumeM3).toBeCloseTo(7.5)
      expect(result.cementBags).toBeGreaterThan(0)
      expect(result.sandM3).toBeGreaterThan(0)
      expect(result.aggregateM3).toBeGreaterThan(0)
    }
  })
})

describe('KPI2 — agent graph + HITL', () => {
  it('runs to completion with a baseline in tolerance', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    const result = await runBudgetAgent({
      query: 'minimum ceiling height',
      jurisdiction: 'zimbabwe',
      context: { ragIndex: index, historicalBaseline: { avgCostCents: 1000000 }, contractValueCents: 900000 },
      persist: false,
    })
    expect(result.state.status).toBe('completed')
    expect(result.state.decision).toBe('GO')
    expect(result.state.rewrittenQuery).toBeDefined()
    expect(result.state.retrievedDocs.length).toBeGreaterThan(0)
    expect(result.state.spans.length).toBeGreaterThan(0)
    expect(result.interrupted).toBe(false)
  })

  it('interrupts for high-value contracts (> threshold)', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    const result = await runBudgetAgent({
      query: 'ventilation requirements',
      jurisdiction: 'zimbabwe',
      context: { ragIndex: index, valueInterruptThresholdCents: 500000, contractValueCents: 600000 },
      persist: false,
    })
    expect(result.interrupted).toBe(true)
    expect(result.state.node).toBe('hitl')
    expect(result.state.status).toBe('awaiting-input')
    expect(result.interrupt?.reason).toBe('high-value')
  })

  it('resumes a HITL interrupt to APPROVED or REJECTED', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    const run = await runBudgetAgent({
      query: 'minimum ceiling height',
      jurisdiction: 'zimbabwe',
      context: { ragIndex: index, valueInterruptThresholdCents: 1, contractValueCents: 100 },
      persist: false,
    })
    expect(run.interrupted).toBe(true)
    const approved = await resumeAgent(run.state, 'APPROVED', 'board approved')
    expect(approved.state.status).toBe('completed')
    expect(approved.state.decision).toBe('APPROVED')
    const rejected = await resumeAgent(run.state, 'REJECTED')
    expect(rejected.state.status).toBe('failed')
    expect(rejected.state.decision).toBe('REJECTED')
  })

  it('checkpoints each step and persists the run to Dexie', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    await runBudgetAgent({
      runId: 'checkpointed-run',
      query: 'minimum ceiling height',
      jurisdiction: 'zimbabwe',
      context: { ragIndex: index },
      persist: true,
    })
    const checkpoints = await db.agentCheckpoints.where('runId').equals('checkpointed-run').toArray()
    expect(checkpoints.length).toBeGreaterThan(0)
    const run = await getAgentRun('checkpointed-run')
    expect(run?.status).toBe('completed')
    const runs = await listAgentRuns()
    expect(runs.some((r) => r.id === 'checkpointed-run')).toBe(true)
    const loaded = await loadLatestCheckpoint('checkpointed-run')
    expect(loaded?.decision).toBe('GO')
  })

  it('persists a KPI3 trace alongside the run', async () => {
    const index = createIndex([parseCodeDocument({ id: 'code', title: 'ZBC', text: CODE_TEXT })])
    await runBudgetAgent({
      runId: 'traced-run',
      query: 'ventilation requirements',
      jurisdiction: 'zimbabwe',
      context: { ragIndex: index },
      persist: true,
    })
    const trace = await db.traces.get(`trace-traced-run`)
    expect(trace).toBeDefined()
    expect(trace?.runId).toBe('traced-run')
    expect(trace?.spans.length).toBeGreaterThan(0)
    expect(trace?.citedDocIds?.length).toBeGreaterThan(0)
  })
})
