// Local-first Langfuse-style observability client.
//
// Every trace is persisted to the app's own IndexedDB (`telemetryEvents`) so
// RAG/agent/tool behaviour is inspectable offline. A remote Langfuse sink is
// optional and NEVER enabled by default — it only ships when the
// `VITE_LANGFUSE_ENABLED/PUBLIC_KEY/SECRET_KEY/HOST` env vars are present
// (the no-backend constitution: the app never self-initiates telemetry to a
// third party). The local copy is always the authoritative record.

import type { Table } from 'dexie';
import { db } from '@/db/db';

export type TelemetryEventType =
  | 'hybrid-search'
  | 'rerank'
  | 'llm-gen'
  | 'thought-trajectory'
  | 'rag'
  | 'tool-call'
  | 'agent-node';

export type FailureRootCause = 'poor-retrieval' | 'outdated-doc' | 'hallucination' | 'none';

export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  projectId?: string;
  runId?: string;
  query?: string;
  latencyMs?: number;
  createdAt: string;
  payload: Record<string, unknown>;
  rootCause?: FailureRootCause;
}

export interface LangfuseClientConfig {
  /** Langfuse base URL (cloud or self-host). */
  host?: string;
  publicKey?: string;
  secretKey?: string;
  /** Master switch for the REMOTE sink only; local persistence always runs. */
  enabled?: boolean;
}

export interface TraceHybridSearchInput {
  query: string;
  k?: number;
  latencyMs: number;
  hitCount: number;
  topDocIds?: string[];
  projectId?: string;
  runId?: string;
}

export interface TraceRerankInput {
  query: string;
  method: 'transformers' | 'bytez' | 'lexical';
  confidence: number;
  threshold: number;
  needsClarification: boolean;
  latencyMs: number;
  hitCount?: number;
  projectId?: string;
  runId?: string;
}

export interface TraceLlmGenInput {
  query: string;
  method: 'remote' | 'local';
  model?: string;
  latencyMs: number;
  tokenEstimate?: number;
  fellBack?: boolean;
  fallbackReason?: string;
  projectId?: string;
  runId?: string;
}

export interface TraceTrajectoryInput {
  query: string;
  trajectory: string[];
  decision?: string;
  interrupted?: boolean;
  durationMs: number;
  projectId?: string;
  runId?: string;
}

const DEFAULT_LANGFUSE_HOST = 'https://cloud.langfuse.com';

export function telemetryEventId(prefix = 'evt'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface RootCauseInput {
  confidence: number;
  threshold: number;
  needsClarification: boolean;
  hitCount: number;
  citedDocIds?: string[];
  knownDocIds?: string[];
  citedInAnswer?: boolean;
}

export function classifyRootCause(input: RootCauseInput): FailureRootCause {
  if (input.hitCount === 0 || (input.needsClarification && input.confidence < input.threshold)) {
    return 'poor-retrieval';
  }
  const known = new Set(input.knownDocIds ?? []);
  const hasUnknownCitation = (input.citedDocIds ?? []).some((id) => id && !known.has(id));
  if (hasUnknownCitation) return 'outdated-doc';
  if (input.citedInAnswer === false) return 'hallucination';
  return 'none';
}

export class LangfuseClient {
  constructor(private readonly cfg: LangfuseClientConfig = {}) {}

  get remoteEnabled(): boolean {
    return Boolean(this.cfg.enabled && this.cfg.publicKey && this.cfg.secretKey);
  }

  async trace(event: TelemetryEvent): Promise<void> {
    await this.persistLocal(event);
    await this.shipRemote(event);
  }

  private async persistLocal(event: TelemetryEvent): Promise<void> {
    try {
      await db.telemetryEvents.put(event);
    } catch {
      // telemetry must never break the caller
    }
  }

  private async shipRemote(event: TelemetryEvent): Promise<void> {
    if (!this.remoteEnabled) return;
    try {
      const body = {
        batch: [
          {
            id: event.id,
            timestamp: event.createdAt,
            type: 'observation-create',
            metadata: { ...event.payload, eventType: event.type, rootCause: event.rootCause },
            input: JSON.stringify(event.payload),
          },
        ],
      };
      await fetch(`${this.cfg.host ?? DEFAULT_LANGFUSE_HOST}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${this.cfg.publicKey}:${this.cfg.secretKey}`)}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      // offline / key rotation — the local copy remains authoritative
    }
  }

  async traceHybridSearch(input: TraceHybridSearchInput): Promise<void> {
    const event: TelemetryEvent = {
      id: telemetryEventId('hs'),
      type: 'hybrid-search',
      projectId: input.projectId,
      runId: input.runId,
      query: input.query,
      latencyMs: input.latencyMs,
      createdAt: new Date().toISOString(),
      payload: { k: input.k, hitCount: input.hitCount, topDocIds: input.topDocIds ?? [] },
      rootCause: input.hitCount === 0 ? 'poor-retrieval' : 'none',
    };
    await this.trace(event);
  }

  async traceRerank(input: TraceRerankInput): Promise<void> {
    const event: TelemetryEvent = {
      id: telemetryEventId('rr'),
      type: 'rerank',
      projectId: input.projectId,
      runId: input.runId,
      query: input.query,
      latencyMs: input.latencyMs,
      createdAt: new Date().toISOString(),
      payload: {
        method: input.method,
        confidence: input.confidence,
        threshold: input.threshold,
        needsClarification: input.needsClarification,
        hitCount: input.hitCount ?? 0,
      },
      rootCause: classifyRootCause({
        confidence: input.confidence,
        threshold: input.threshold,
        needsClarification: input.needsClarification,
        hitCount: input.hitCount ?? 0,
      }),
    };
    await this.trace(event);
  }

  async traceLLMGen(input: TraceLlmGenInput): Promise<void> {
    const event: TelemetryEvent = {
      id: telemetryEventId('llm'),
      type: 'llm-gen',
      projectId: input.projectId,
      runId: input.runId,
      query: input.query,
      latencyMs: input.latencyMs,
      createdAt: new Date().toISOString(),
      payload: {
        method: input.method,
        model: input.model,
        tokenEstimate: input.tokenEstimate,
        fellBack: input.fellBack ?? false,
        fallbackReason: input.fallbackReason,
      },
    };
    await this.trace(event);
  }

  async traceThoughtTrajectory(input: TraceTrajectoryInput): Promise<void> {
    const event: TelemetryEvent = {
      id: telemetryEventId('tr'),
      type: 'thought-trajectory',
      projectId: input.projectId,
      runId: input.runId,
      query: input.query,
      latencyMs: input.durationMs,
      createdAt: new Date().toISOString(),
      payload: {
        trajectory: input.trajectory,
        decision: input.decision,
        interrupted: input.interrupted ?? false,
      },
    };
    await this.trace(event);
  }
}

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;

export const telemetryClient = new LangfuseClient({
  enabled: Boolean(env?.VITE_LANGFUSE_ENABLED),
  host: env?.VITE_LANGFUSE_HOST,
  publicKey: env?.VITE_LANGFUSE_PUBLIC_KEY,
  secretKey: env?.VITE_LANGFUSE_SECRET_KEY,
});

export interface ListTelemetryOptions {
  projectId?: string;
  type?: TelemetryEventType;
  limit?: number;
}

export async function listTelemetryEvents(opts: ListTelemetryOptions = {}): Promise<TelemetryEvent[]> {
  try {
    const table: Table<TelemetryEvent, string> = db.telemetryEvents;
    const rows = opts.projectId ? await table.where('projectId').equals(opts.projectId).toArray() : await table.toArray();
    const filtered = opts.type ? rows.filter((r) => r.type === opts.type) : rows;
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered.slice(0, opts.limit ?? 200);
  } catch {
    return [];
  }
}

export interface TelemetrySummary {
  total: number;
  byType: Record<string, number>;
  byRootCause: Record<string, number>;
  avgLatencyMs: number;
  fallbackRate: number;
  avgConfidence: number;
  clarifications: number;
}

export function summarizeTelemetry(events: TelemetryEvent[] = []): TelemetrySummary {
  const byType: Record<string, number> = {};
  const byRootCause: Record<string, number> = {};
  const latencies: number[] = [];
  const confidences: number[] = [];
  let fallbacks = 0;
  let clarifications = 0;
  for (const e of events) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
    if (e.rootCause) byRootCause[e.rootCause] = (byRootCause[e.rootCause] ?? 0) + 1;
    if (typeof e.latencyMs === 'number' && Number.isFinite(e.latencyMs)) latencies.push(e.latencyMs);
    if (e.payload.fellBack === true) fallbacks += 1;
    if (typeof e.payload.confidence === 'number' && Number.isFinite(e.payload.confidence)) confidences.push(e.payload.confidence);
    if (e.payload.needsClarification === true) clarifications += 1;
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return {
    total: events.length,
    byType,
    byRootCause,
    avgLatencyMs: Math.round(mean(latencies)),
    fallbackRate: events.length ? fallbacks / events.length : 0,
    avgConfidence: Math.round(mean(confidences) * 1000) / 1000,
    clarifications,
  };
}

export async function clearTelemetryEvents(): Promise<void> {
  try {
    await db.telemetryEvents.clear();
  } catch {
    // no-op
  }
}
