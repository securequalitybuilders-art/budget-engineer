// Observability facade — guarded, fire-and-forget loggers for the production
// RAG / agent / tool paths. Every call is non-blocking: the underlying client
// never throws and persistence failures are swallowed, so telemetry can never
// degrade the engine it observes.

import {
  classifyRootCause,
  telemetryClient,
  telemetryEventId,
  type FailureRootCause,
  type TelemetryEvent,
  type TelemetryEventType,
} from './langfuseClient';

export interface LogRagInput {
  query: string;
  jurisdiction?: string;
  engineUsed?: string;
  fellBack?: boolean;
  fallbackReason?: string;
  latencyMs: number;
  confidence?: number;
  rerankThreshold?: number;
  hitCount?: number;
  citedDocIds?: string[];
  knownDocIds?: string[];
  citedInAnswer?: boolean;
  needsClarification?: boolean;
  projectId?: string;
  runId?: string;
}

export async function logRAG(input: LogRagInput): Promise<void> {
  const rootCause: FailureRootCause = classifyRootCause({
    confidence: input.confidence ?? 0,
    threshold: input.rerankThreshold ?? 0,
    needsClarification: input.needsClarification ?? false,
    hitCount: input.hitCount ?? 0,
    citedDocIds: input.citedDocIds,
    knownDocIds: input.knownDocIds,
    citedInAnswer: input.citedInAnswer,
  });
  const event: TelemetryEvent = {
    id: telemetryEventId('rag'),
    type: 'rag',
    projectId: input.projectId,
    runId: input.runId,
    query: input.query,
    latencyMs: input.latencyMs,
    createdAt: new Date().toISOString(),
    payload: {
      jurisdiction: input.jurisdiction,
      engineUsed: input.engineUsed,
      fellBack: input.fellBack ?? false,
      fallbackReason: input.fallbackReason,
      confidence: input.confidence,
      rerankThreshold: input.rerankThreshold,
      hitCount: input.hitCount ?? 0,
      citedDocIds: input.citedDocIds ?? [],
      needsClarification: input.needsClarification ?? false,
    },
    rootCause,
  };
  await telemetryClient.trace(event);
}

export interface LogToolCallInput {
  tool: string;
  node?: string;
  ok: boolean;
  error?: string;
  latencyMs: number;
  args?: Record<string, unknown>;
  projectId?: string;
  runId?: string;
}

export async function logToolCall(input: LogToolCallInput): Promise<void> {
  const event: TelemetryEvent = {
    id: telemetryEventId('tc'),
    type: 'tool-call',
    projectId: input.projectId,
    runId: input.runId,
    latencyMs: input.latencyMs,
    createdAt: new Date().toISOString(),
    payload: {
      tool: input.tool,
      node: input.node,
      ok: input.ok,
      error: input.error,
      args: input.args ?? {},
    },
  };
  await telemetryClient.trace(event);
}

export interface LogAgentNodeInput {
  node: string;
  status: 'start' | 'end';
  runId?: string;
  projectId?: string;
  durationMs?: number;
  outcome?: string;
}

export async function logAgentNode(input: LogAgentNodeInput): Promise<void> {
  const event: TelemetryEvent = {
    id: telemetryEventId('an'),
    type: 'agent-node',
    runId: input.runId,
    projectId: input.projectId,
    latencyMs: input.durationMs,
    createdAt: new Date().toISOString(),
    payload: { node: input.node, status: input.status, outcome: input.outcome },
  };
  await telemetryClient.trace(event);
}

/** Fire-and-forget guard: never await, never throw. */
export function voidLog(promise: Promise<unknown>): void {
  void promise.catch(() => {});
}

export interface LogThoughtTrajectoryInput {
  query: string;
  trajectory: string[];
  decision?: string;
  interrupted?: boolean;
  durationMs: number;
  projectId?: string;
  runId?: string;
}

export async function logThoughtTrajectory(input: LogThoughtTrajectoryInput): Promise<void> {
  await telemetryClient.traceThoughtTrajectory({
    query: input.query,
    trajectory: input.trajectory,
    decision: input.decision,
    interrupted: input.interrupted,
    durationMs: input.durationMs,
    projectId: input.projectId,
    runId: input.runId,
  });
}

export { telemetryClient, classifyRootCause };
export type { FailureRootCause, TelemetryEvent, TelemetryEventType };
