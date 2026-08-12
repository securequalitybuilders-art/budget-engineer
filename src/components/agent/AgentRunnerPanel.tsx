import { useEffect, useMemo, useState } from 'react';
import { Bot, Play, RotateCcw, CheckCircle2, XCircle, Clock, Search, ShieldCheck, Calculator, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { runBudgetAgent, resumeAgent, type BudgetAgentResult, type AgentStreamEvent } from '@/engine/agents';
import { listAgentRuns, type AgentRunRow } from '@/engine/agents/checkpoint';
import { buildDefaultRagIndex } from '@/engine/rag/codeCorpus';
import { GRAPH_NODES } from '@/engine/agents/graph';

const PRESET_QUERIES = [
  'minimum ceiling height',
  'Calculate bricks for 10m boundary wall 230mm thick 2.4m high SAZ 7MPa',
  'travel distance to an exit',
  'party wall fire resistance',
  'natural ventilation',
];

const NODE_ICONS: Record<string, typeof Search> = {
  researcher: Search,
  calculator: Calculator,
  validator: ShieldCheck,
  supervisor: BarChart3,
  hitl: Clock,
  done: CheckCircle2,
};

export interface AgentRunnerPanelProps {
  projectId?: string;
  onInterrupt?: (result: BudgetAgentResult) => void;
}

export function AgentRunnerPanel({ projectId, onInterrupt }: AgentRunnerPanelProps) {
  const [query, setQuery] = useState('');
  const [contractUsd, setContractUsd] = useState('');
  const [planId, setPlanId] = useState('');
  const [architectReg, setArchitectReg] = useState('');
  const [baselineUsd, setBaselineUsd] = useState('');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<BudgetAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const [runs, setRuns] = useState<AgentRunRow[]>([]);
  const [stream, setStream] = useState<AgentStreamEvent[]>([]);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const ragIndex = useMemo(() => buildDefaultRagIndex(), []);

  const refreshRuns = async () => {
    const rows = await listAgentRuns(projectId);
    setRuns(rows);
  };

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await listAgentRuns(projectId);
        if (!cancelled) setRuns(rows);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const handleRun = async () => {
    if (!query.trim()) return;
    setPhase('running');
    setError(null);
    setResult(null);
    setStream([]);
    setActiveNode(null);
    try {
      const res = await runBudgetAgent({
        query: query.trim(),
        jurisdiction: 'zimbabwe',
        projectId,
        context: {
          ragIndex,
          contractValueCents: contractUsd ? Math.round(Number(contractUsd) * 100) : undefined,
          planId: planId || undefined,
          architectRegistrationNumber: architectReg || undefined,
          historicalBaseline: baselineUsd
            ? { avgCostCents: Math.round(Number(baselineUsd) * 100) }
            : undefined,
        },
        onEvent: (event) => {
          if (event.type === 'node-start') {
            setActiveNode(event.node);
          } else if (event.type === 'node-end' || event.type === 'interrupt' || event.type === 'done') {
            setActiveNode(null);
          }
          setStream((prev) => [...prev, event]);
        },
      });
      setResult(res);
      setPhase('done');
      if (res.interrupt) onInterrupt?.(res);
      void refreshRuns().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const handleResume = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!result) return;
    setResuming(true);
    try {
      const { state } = await resumeAgent(result.state, decision);
      const next = { ...result, state, interrupted: false, interrupt: undefined };
      setResult(next);
      if (state.status === 'awaiting-input') onInterrupt?.({ ...next, interrupted: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResuming(false);
    }
  };

  const visitedNodes = useMemo(() => {
    const visited = new Set<string>(['researcher']);
    for (const e of stream) if (e.type === 'node-start') visited.add(e.node);
    if (activeNode) visited.add(activeNode);
    if (!result) return visited;
    for (const call of result.state.toolCalls) visited.add(call.node);
    if (result.state.node === 'hitl') visited.add('hitl');
    if (result.state.node === 'done' || result.state.status === 'completed') visited.add('done');
    return visited;
  }, [result, stream, activeNode]);

  const statusColor =
    !result
      ? 'text-stone-400'
      : result.state.status === 'completed'
        ? 'text-green-400'
        : result.state.status === 'awaiting-input'
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="space-y-5">
      {/* Pipeline legend */}
      <div className="flex flex-wrap items-center gap-1.5">
        {GRAPH_NODES.map((node, i) => {
          const Icon = NODE_ICONS[node] ?? CheckCircle2;
          const active = visitedNodes.has(node);
          const current = activeNode === node;
          return (
            <div key={node} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--text-tertiary)]">→</span>}
              <span
                data-testid={`node-chip-${node}`}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                  current
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                    : active
                      ? 'border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]'
                      : 'border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}
              >
                <Icon size={10} />
                {node}
              </span>
            </div>
          );
        })}
      </div>

      {/* Query input */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <label htmlFor="agent-query" className="mb-1.5 block text-[10px] font-medium text-[var(--text-muted)]">
          Question for the budget engineer agent
        </label>
        <Textarea
          id="agent-query"
          data-testid="agent-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Calculate bricks for 10m boundary wall 230mm thick 2.4m high SAZ 7MPa"
          rows={3}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESET_QUERIES.map((p) => (
            <button
              key={p}
              type="button"
              data-testid={`preset-${p.slice(0, 12)}`}
              onClick={() => setQuery(p)}
              className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[9px] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-accent)]/40 hover:text-[var(--brand-accent)]"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Context inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-[9px] text-[var(--text-muted)]">Contract value (USD)</span>
          <Input
            type="number"
            min="0"
            data-testid="ctx-contract"
            value={contractUsd}
            onChange={(e) => setContractUsd(e.target.value)}
            placeholder="50000"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] text-[var(--text-muted)]">Plan ID (SI 56 gate)</span>
          <Input
            type="text"
            data-testid="ctx-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            placeholder="plan-123"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] text-[var(--text-muted)]">Architect reg no.</span>
          <Input
            type="text"
            data-testid="ctx-architect"
            value={architectReg}
            onChange={(e) => setArchitectReg(e.target.value)}
            placeholder="ACZ-0001"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[9px] text-[var(--text-muted)]">Historical baseline (USD)</span>
          <Input
            type="number"
            min="0"
            data-testid="ctx-baseline"
            value={baselineUsd}
            onChange={(e) => setBaselineUsd(e.target.value)}
            placeholder="45000"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="brand" size="sm" onClick={() => void handleRun()} disabled={phase === 'running' || !query.trim()}>
          <Play size={14} className="mr-1.5" />
          {phase === 'running' ? 'Running…' : 'Run agent'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setResult(null); setError(null); setPhase('idle'); }}>
          <RotateCcw size={14} className="mr-1.5" />
          Reset
        </Button>
      </div>

      {phase === 'running' && (
        <div data-testid="live-panel" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <Clock size={14} className="animate-spin" />
            <span data-testid="live-active-node">
              {activeNode ? `Running node: ${activeNode}…` : 'Running agent…'}
            </span>
          </div>
          {stream.length > 0 && (
            <ul className="space-y-1 font-mono text-[9px] text-[var(--text-secondary)]">
              {stream.map((e, i) => (
                <li key={i} data-testid="live-event">
                  {e.type === 'node-start' && `→ ${e.node} (step ${e.stepCount})`}
                  {e.type === 'node-end' && `done ${e.node}`}
                  {e.type === 'tool' && `${e.ok ? 'ok' : 'fail'} ${e.tool} @${e.node} — ${e.result.slice(0, 60)}`}
                  {e.type === 'interrupt' && `interrupt (${e.interrupt.reason}) — ${e.interrupt.message.slice(0, 80)}`}
                  {e.type === 'done' && 'completed'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {phase === 'error' && error && (
        <div className="rounded-xl border border-red-600/20 bg-red-600/10 p-4 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div data-testid="agent-result" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span data-testid="agent-status" className={`text-[10px] font-semibold uppercase ${statusColor}`}>
              {result.state.status}
            </span>
            {result.state.decision && (
              <span
                data-testid="agent-decision"
                className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                  result.state.decision === 'GO' || result.state.decision === 'APPROVED'
                    ? 'border-green-600/30 bg-green-600/10 text-green-400'
                    : result.state.decision === 'PENDING'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-red-600/30 bg-red-600/10 text-red-400'
                }`}
              >
                {result.state.decision}
              </span>
            )}
            <span className="text-[9px] text-[var(--text-tertiary)]">run {result.runId}</span>
            {result.state.rewrittenQuery && (
              <span className="text-[9px] text-[var(--text-tertiary)]">
                rewrite: “{result.state.rewrittenQuery}”
              </span>
            )}
          </div>

          {result.interrupt && result.interrupt.message && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-amber-400">
                <Clock size={12} />
                Human-in-the-loop · {result.interrupt.reason}
              </div>
              <p data-testid="agent-interrupt" className="mb-3 text-[11px] text-amber-200">
                {result.interrupt.message}
              </p>
              <div className="flex gap-2">
                <Button variant="brand" size="sm" data-testid="agent-approve" disabled={resuming} onClick={() => void handleResume('APPROVED')}>
                  <CheckCircle2 size={14} className="mr-1.5" /> Approve
                </Button>
                <Button variant="destructive" size="sm" data-testid="agent-reject" disabled={resuming} onClick={() => void handleResume('REJECTED')}>
                  <XCircle size={14} className="mr-1.5" /> Reject
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Retrieved evidence */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                Retrieved evidence ({result.state.retrievedDocs.length})
              </h3>
              <div className="space-y-2">
                {result.state.retrievedDocs.map((doc) => (
                  <div key={doc.chunkId} className="rounded-lg bg-[var(--bg-tertiary)] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-[var(--text-primary)]">
                        [{doc.chapter ?? '?'}] {doc.heading}
                      </span>
                      <span className="shrink-0 text-[9px] text-[var(--text-tertiary)]">
                        {doc.score.toFixed(3)}
                      </span>
                    </div>
                    <p className="mt-1 text-[9px] text-[var(--text-secondary)]">{doc.text}</p>
                    <div className="mt-0.5 text-[8px] text-[var(--text-tertiary)]">
                      {doc.docTitle ?? doc.docId} · {doc.sectionId}
                    </div>
                  </div>
                ))}
                {result.state.retrievedDocs.length === 0 && (
                  <div className="text-[10px] text-[var(--text-muted)]">No code sections matched.</div>
                )}
              </div>
            </div>

            {/* Tool calls */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                Tool calls ({result.state.toolCalls.length})
              </h3>
              <div className="space-y-2">
                {result.state.toolCalls.map((call) => (
                  <div key={call.id} data-testid="tool-call" className="rounded-lg bg-[var(--bg-tertiary)] p-2.5">
                    <div className="flex items-center gap-1.5">
                      {call.ok ? (
                        <CheckCircle2 size={11} className="text-green-400" />
                      ) : (
                        <XCircle size={11} className="text-red-400" />
                      )}
                      <span className="text-[10px] font-medium text-[var(--text-primary)]">{call.tool}</span>
                      <span className="text-[9px] text-[var(--text-tertiary)]">@{call.node}</span>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap text-[9px] text-[var(--text-secondary)]">
                      {call.result.slice(0, 220)}
                    </pre>
                  </div>
                ))}
                {result.state.toolCalls.length === 0 && (
                  <div className="text-[10px] text-[var(--text-muted)]">No tools invoked.</div>
                )}
              </div>
            </div>
          </div>

          {/* Trace */}
          {result.trace.spans.length > 0 && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                Trace ({result.trace.spans.length} spans)
              </h3>
              <div className="space-y-1">
                {result.trace.spans.map((span, i) => (
                  <div key={i} className="flex items-center gap-2 text-[9px]">
                    <span className="font-mono text-[var(--text-tertiary)]">{span.durationMs}ms</span>
                    <span className="text-[var(--text-secondary)]">{span.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past runs */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
          <Bot size={12} /> Recent runs ({runs.length})
        </h3>
        <div className="space-y-1.5">
          {runs.map((run) => (
            <div key={run.id} data-testid="agent-run-row" className="flex items-center gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2">
              <span className={`shrink-0 text-[9px] font-medium ${run.status === 'completed' ? 'text-green-400' : run.status === 'awaiting-input' ? 'text-amber-400' : run.status === 'failed' ? 'text-red-400' : 'text-cyan-400'}`}>
                {run.status}
              </span>
              <span className="flex-1 truncate text-[9px] text-[var(--text-secondary)]">{run.query}</span>
              {run.decision && (
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[8px] text-[var(--text-muted)]">
                  {run.decision}
                </span>
              )}
              <span className="shrink-0 text-[8px] text-[var(--text-tertiary)]">@{run.node}</span>
            </div>
          ))}
          {runs.length === 0 && (
            <div className="text-[10px] text-[var(--text-muted)]">No agent runs yet — run one above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
