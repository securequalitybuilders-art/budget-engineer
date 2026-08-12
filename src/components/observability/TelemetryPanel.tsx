// Local-first telemetry dashboard: lists the Langfuse-style RAG / agent / tool
// events persisted to IndexedDB (`telemetryEvents`), summarizes latency,
// fallback rate and rerank confidence, and flags the classified failure root
// cause per event (poor-retrieval / outdated-doc / hallucination / none).

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  clearTelemetryEvents,
  listTelemetryEvents,
  summarizeTelemetry,
  type FailureRootCause,
  type TelemetryEvent,
  type TelemetryEventType,
} from '@/lib/observability/langfuseClient';

const TYPE_LABELS: Record<TelemetryEventType, string> = {
  'hybrid-search': 'Hybrid search',
  rerank: 'Rerank',
  'llm-gen': 'LLM generation',
  'thought-trajectory': 'Agent trajectory',
  rag: 'RAG analysis',
  'tool-call': 'Tool call',
  'agent-node': 'Agent node',
};

const ROOT_CAUSE_LABELS: Record<FailureRootCause, string> = {
  'poor-retrieval': 'Poor retrieval',
  'outdated-doc': 'Outdated doc',
  hallucination: 'Hallucination',
  none: 'None',
};

const ROOT_CAUSE_COLORS: Record<FailureRootCause, string> = {
  'poor-retrieval': 'bg-amber-500/15 text-amber-300',
  'outdated-doc': 'bg-orange-500/15 text-orange-300',
  hallucination: 'bg-rose-500/15 text-rose-300',
  none: 'bg-emerald-500/15 text-emerald-300',
};

function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{value}</div>
      {detail ? <div className="mt-0.5 text-[11px] text-cyan-400">{detail}</div> : null}
    </div>
  );
}

function EventRow({ event }: { event: TelemetryEvent }) {
  const payloadEntries = Object.entries(event.payload)
    .filter(([, value]) => value !== undefined && value !== null && !(Array.isArray(value) && (value as unknown[]).length === 0))
    .slice(0, 5);
  const extra = payloadEntries.length > 0 ? payloadEntries.map(([k, value]) => `${k}=${JSON.stringify(value)}`).join(' · ') : '';
  return (
    <li className="flex flex-col gap-1 border-b border-[var(--border-color)] px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-300">{TYPE_LABELS[event.type]}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{new Date(event.createdAt).toLocaleString()}</span>
        <span className="text-[10px] text-[var(--text-muted)]">{formatLatency(event.latencyMs ?? 0)}</span>
        {event.rootCause ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROOT_CAUSE_COLORS[event.rootCause]}`}>
            {ROOT_CAUSE_LABELS[event.rootCause]}
          </span>
        ) : null}
      </div>
      {event.query ? <div className="text-xs font-medium text-[var(--text-primary)]">“{event.query}”</div> : null}
      {extra ? <div className="truncate text-[10px] text-[var(--text-muted)]" title={extra}>{extra}</div> : null}
    </li>
  );
}

export function TelemetryPanel({ projectId }: { projectId?: string }) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rows = await listTelemetryEvents({ projectId, limit: 300 });
      if (!cancelled) {
        setEvents(rows);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const summary = useMemo(() => summarizeTelemetry(events), [events]);

  const rootCauseCounts = useMemo(() => {
    const counts = new Map<FailureRootCause, number>();
    for (const e of events) {
      if (e.rootCause) counts.set(e.rootCause, (counts.get(e.rootCause) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const handleRefresh = async () => {
    setLoading(true);
    const rows = await listTelemetryEvents({ projectId, limit: 300 });
    setEvents(rows);
    setLoading(false);
  };

  const handleClear = async () => {
    await clearTelemetryEvents();
    setEvents([]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Observability events</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="touch-target flex items-center gap-1 rounded-lg bg-[var(--bg-tertiary)] px-3 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleClear()}
            className="touch-target flex items-center gap-1 rounded-lg bg-[var(--bg-tertiary)] px-3 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <Trash2 size={12} />
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Events" value={String(summary.total)} detail="local IndexedDB" />
        <StatCard label="Avg latency" value={formatLatency(summary.avgLatencyMs)} />
        <StatCard label="Fallback rate" value={formatPct(summary.fallbackRate)} detail="remote→local" />
        <StatCard label="Avg rerank conf" value={summary.avgConfidence.toFixed(3)} />
        <StatCard label="Clarifications" value={String(summary.clarifications)} detail="needsClarification" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <BarChart3 size={12} />
            By event type
          </div>
          {Object.entries(summary.byType).length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No events recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {Object.entries(summary.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <li key={type} className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>{TYPE_LABELS[type as TelemetryEventType] ?? type}</span>
                    <span className="font-semibold text-cyan-300">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <AlertTriangle size={12} />
            Failure root cause
          </div>
          {rootCauseCounts.size === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No classified failures yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {[...rootCauseCounts.entries()].map(([cause, count]) => (
                <li key={cause} className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>{ROOT_CAUSE_LABELS[cause]}</span>
                  <span className={`font-semibold ${cause === 'none' ? 'text-emerald-300' : 'text-amber-300'}`}>{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            <Activity size={12} />
            Live feed
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Each event is persisted locally before any optional cloud sink. Context docs and prompt params are stored inside
            the event payload so retrieval failures can be replayed.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-6 text-xs text-[var(--text-muted)]">
          <Search size={14} />
          Reading telemetry events…
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-8 text-center text-xs text-[var(--text-muted)]">
          No telemetry events yet — run a compliance query, a tool call or the budget agent to populate this view.
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)]">
          <ul>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
