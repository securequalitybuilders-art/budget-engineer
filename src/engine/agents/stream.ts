// Streaming wire adapter — the local-first analogue of LangChain's
// `LangChainAdapter.toDataStreamResponse`.
//
// `agentEventsToDataStream` / `toDataStreamLines` encode the progressive
// `AgentStreamEvent`s a run emits into Vercel-AI Data Stream Protocol lines
// (the wire format a Next.js `toDataStreamResponse` would serve over SSE).
// `consumeDataStream` parses the same text back into typed parts, so a headless
// CLI or test harness can exercise the exact bytes a client would receive —
// without a backend, websocket, or HTTP route.

import type { AgentStreamEvent, Interrupt } from './types'

export type DataStreamPart =
  | { type: 'text'; text: string }
  | { type: 'node'; node: string; stepCount: number }
  | { type: 'tool'; tool: string; node: string; ok: boolean }
  | { type: 'interrupt'; interrupt: Interrupt }
  | { type: 'done'; decision: string | null; status: string }

const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '')

function lineFor(event: AgentStreamEvent): string {
  switch (event.type) {
    case 'node-start':
      return `0:"[node-start] ${event.node} (step ${event.stepCount})"`
    case 'node-end':
      return `0:"[node-end] ${event.node}"`
    case 'tool':
      return `d:${JSON.stringify({ type: 'tool', tool: event.tool, node: event.node, ok: event.ok })}`
    case 'interrupt':
      return `d:${JSON.stringify({ type: 'interrupt', reason: event.interrupt.reason, message: event.interrupt.message })}`
    case 'done':
      return `d:${JSON.stringify({ type: 'done', decision: event.state.decision, status: event.state.status })}`
  }
}

/** Encode events as Data Stream Protocol text (one line per frame). */
export function toDataStreamLines(events: AgentStreamEvent[]): string[] {
  const lines = events.map(lineFor)
  lines.push('e:{"finishReason":"stop"}')
  return lines
}

/** Join Data Stream Protocol lines into a single transferable string. */
export function agentEventsToDataStream(events: AgentStreamEvent[]): string {
  return toDataStreamLines(events).join('\n')
}

/** Parse Data Stream Protocol text back into typed parts (round-trip helper). */
export function consumeDataStream(text: string): DataStreamPart[] {
  const parts: DataStreamPart[] = []
  for (const line of text.split('\n')) {
    if (!line) continue
    if (line.startsWith('0:')) {
      const raw = line.slice(2)
      const parsed = raw.startsWith('"') ? raw.slice(1, -1) : raw
      parts.push({ type: 'text', text: parsed.replace(/\\n/g, '\n').replace(/\\"/g, '"') })
      continue
    }
    if (line.startsWith('d:')) {
      try {
        const data = JSON.parse(line.slice(2)) as Record<string, unknown>
        if (data.type === 'tool') {
          parts.push({ type: 'tool', tool: String(data.tool ?? ''), node: String(data.node ?? ''), ok: Boolean(data.ok) })
        } else if (data.type === 'interrupt') {
          parts.push({
            type: 'interrupt',
            interrupt: {
              reason: (data.reason as Interrupt['reason']) ?? 'validation-required',
              message: String(data.message ?? ''),
            },
          })
        } else if (data.type === 'done') {
          parts.push({ type: 'done', decision: data.decision == null ? null : String(data.decision), status: String(data.status ?? '') })
        }
      } catch {
        // malformed data frame — skip (matches a resilient SSE client)
      }
      continue
    }
    if (line.startsWith('e:')) {
      try {
        const data = JSON.parse(line.slice(2)) as { finishReason?: string }
        parts.push({ type: 'text', text: `[finish] ${data.finishReason ?? 'stop'}` })
      } catch {
        parts.push({ type: 'text', text: '[finish] stop' })
      }
    }
  }
  return parts
}

export { esc as escapeDataStreamText }
