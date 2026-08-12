// Generic, dependency-free state machine — the local-first analogue of
// LangGraph's StateGraph.
//
// Both the KPI2 agent orchestrator (`graph.ts`) and the generative design
// pipeline (`generativeDesignPipeline.ts`) run on this engine.
//
// Semantics (LangGraph-inspired):
//   - nodes are keyed by name; a node returns its next node explicitly, or the
//     machine follows fixed / conditional edges
//   - an `interrupt` outcome pauses the run at the node it routed to (HITL);
//     `interruptBefore` auto-pauses on entry to the listed nodes
//   - an `error` outcome / thrown node triggers the retry-with-error policy
//     (`retry` is fed the error message so an LLM-based node can correct), up
//     to `maxRetries`; otherwise the run continues on the error edge
//   - `onNodeStart` fires before every node so callers can stream progress
//   - `onStep` fires after every node so callers can checkpoint (Dexie)

import type { Interrupt } from './types'

export interface NodeOutcome<S> {
  state: S
  next?: string
  interrupt?: Interrupt
  error?: string
}

export interface NodeDefinition<S, C = unknown> {
  name: string
  run: (state: S, ctx: C) => Promise<NodeOutcome<S>>
}

export interface StepResult<S> {
  state: S
  node: string
  interrupted: boolean
  interrupt?: Interrupt
  done: boolean
  error?: string
}

export interface MachineRunResult<S> {
  state: S
  node: string
  interrupted: boolean
  interrupt?: Interrupt
  steps: number
}

export type OnStep<S> = (step: { from: string; node: string; state: S; stepCount: number }) => void | Promise<void>

/** Fires just before a node runs. `node` is the node about to execute. */
export type OnNodeStart = (node: string, stepCount: number) => void | Promise<void>

export interface StateMachineConfig<S, C = unknown> {
  nodes: Record<string, NodeDefinition<S, C>>
  start: string
  end: string
  edges?: Record<string, string>
  conditionalEdges?: Record<string, (state: S, ctx: C) => string>
  interruptBefore?: string[]
  maxSteps?: number
  maxRetries?: number
  /** Base retry delay in ms; each retry attempt waits base * 2^(attempt-1). */
  retryDelayMs?: number
  retry?: (state: S, ctx: C, node: string, error: string) => Promise<S>
  onNodeStart?: OnNodeStart
  onStep?: OnStep<S>
}

export interface StateMachine<S, C = unknown> {
  readonly config: StateMachineConfig<S, C>
  nextFor: (node: string, state: S, ctx: C) => string
  step: (node: string, state: S, ctx: C) => Promise<StepResult<S>>
  run: (
    state: S,
    ctx: C,
    opts?: { maxSteps?: number; startAt?: string; onNodeStart?: OnNodeStart; onStep?: OnStep<S> },
  ) => Promise<MachineRunResult<S>>
}

/** Exponential backoff delay for retry attempt `attempt` (0-indexed). */
export function backoffDelayMs(attempt: number, baseMs: number, maxMs = 1000): number {
  if (!Number.isFinite(baseMs) || baseMs <= 0) return 0
  return Math.min(baseMs * 2 ** Math.max(0, attempt), maxMs)
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function createStateMachine<S, C = unknown>(config: StateMachineConfig<S, C>): StateMachine<S, C> {
  const maxSteps = config.maxSteps ?? 20
  const maxRetries = config.maxRetries ?? 0
  const retryDelayMs = config.retryDelayMs ?? 0

  function nextFor(node: string, state: S, ctx: C): string {
    const conditional = config.conditionalEdges?.[node]
    if (conditional) return conditional(state, ctx)
    return config.edges?.[node] ?? config.end
  }

  async function runNodeOnce(
    node: string,
    def: NodeDefinition<S, C>,
    state: S,
    ctx: C,
  ): Promise<{ ok: true; outcome: NodeOutcome<S> } | { ok: false; error: string }> {
    let current = state
    for (let attempt = 0; ; attempt++) {
      try {
        return { ok: true, outcome: await def.run(current, ctx) }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        if (config.retry && attempt < maxRetries) {
          if (retryDelayMs > 0) {
            const delay = backoffDelayMs(attempt, retryDelayMs)
            if (delay > 0) await sleep(delay)
          }
          current = await config.retry(current, ctx, node, error)
          continue
        }
        return { ok: false, error }
      }
    }
  }

  async function step(node: string, state: S, ctx: C): Promise<StepResult<S>> {
    const def = config.nodes[node]
    if (!def) throw new Error(`Unknown state-machine node "${node}"`)

    const attempt = await runNodeOnce(node, def, state, ctx)
    if (!attempt.ok) {
      const next = nextFor(node, state, ctx)
      return { state, node: next, interrupted: false, done: next === config.end, error: attempt.error }
    }

    const outcome = attempt.outcome
    const interrupted = !!outcome.interrupt
    const next = outcome.next ?? nextFor(node, outcome.state, ctx)

    if (!interrupted && config.interruptBefore?.includes(next)) {
      return {
        state: outcome.state,
        node: next,
        interrupted: true,
        interrupt: { reason: 'validation-required', message: `Gate "${next}" requires human approval before the run may continue.` },
        done: false,
      }
    }

    return {
      state: outcome.state,
      node: next,
      interrupted,
      interrupt: outcome.interrupt,
      done: !interrupted && next === config.end,
      error: outcome.error,
    }
  }

  async function run(
    state: S,
    ctx: C,
    opts?: { maxSteps?: number; startAt?: string; onNodeStart?: OnNodeStart; onStep?: OnStep<S> },
  ): Promise<MachineRunResult<S>> {
    const limit = opts?.maxSteps ?? maxSteps
    const onNodeStart = opts?.onNodeStart ?? config.onNodeStart
    const onStep = opts?.onStep ?? config.onStep
    let current = state
    let node = opts?.startAt ?? config.start
    let count = 0
    for (let i = 0; i < limit; i++) {
      const stepNumber = count + 1
      await onNodeStart?.(node, stepNumber)
      const result = await step(node, current, ctx)
      current = result.state
      count += 1
      await onStep?.({ from: node, node: result.node, state: current, stepCount: count })
      if (result.interrupted) {
        return { state: current, node: result.node, interrupted: true, interrupt: result.interrupt, steps: count }
      }
      if (result.done) return { state: current, node: result.node, interrupted: false, steps: count }
      node = result.node
    }
    throw new Error(`Exceeded ${limit} step limit`)
  }

  return { config, nextFor, step, run }
}
