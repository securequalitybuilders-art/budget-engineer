// Headless agent runner CLI.
//
// Usage:
//   node --import tsx scripts/run-agent.ts --query "Calculate bricks for 10m boundary wall 230mm thick 2.4m high SAZ 7MPa"
//
// Options:
//   --query <text>          The question for the budget engineer agent (required)
//   --jurisdiction <id>     zimbabwe | south-africa (default zimbabwe)
//   --project <id>          Project id attached to the run/trace (optional)
//   --contract-usd <n>      Contract value in USD (feeds the high-value HITL gate)
//   --baseline-usd <n>      Historical baseline avg cost in USD (feeds GO/NO-GO)
//   --plan <id>             Plan id for the SI 56/2025 architect gate
//   --architect <reg>       Architect registration number (SI 56/2025)
//   --decision <APPROVED|REJECTED>
//                          Auto-resume a human-in-the-loop interrupt with this decision
//   --persist               Persist run/checkpoints/trace to IndexedDB (loads
//                          fake-indexeddb first — safe in CI/Node)
//   --run-id <id>           Explicit run id
//
// Streaming: every agent event is printed as a `[event]` line as it fires
// (node-start/node-end/tool/interrupt/done) — the CLI analogue of an SSE/LLM
// streaming API route, fully offline.
//
// Exit codes: 0 = completed, 2 = awaiting human-in-the-loop input, 1 = error.
//
// Not part of the browser bundle or the tsc include set; verified manually.

import 'fake-indexeddb/auto'
import { buildDefaultRagIndex } from '../src/engine/rag/codeCorpus'
import { runBudgetAgent, resumeAgent, type AgentStreamEvent } from '../src/engine/agents'

function usage(): void {
  console.error(
    'Usage: node --import tsx scripts/run-agent.ts --query "…" [--jurisdiction id] [--project id] [--contract-usd n] [--baseline-usd n] [--plan id] [--architect reg] [--decision APPROVED|REJECTED] [--persist] [--run-id id]',
  )
  process.exit(1)
}

const args = process.argv.slice(2)
const flags: Record<string, string | boolean> = {}
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--persist') {
    flags.persist = true
  } else if (arg.startsWith('--')) {
    const next = args[i + 1]
    if (next === undefined || next.startsWith('--')) usage()
    flags[arg.slice(2)] = next
    i++
  } else {
    usage()
  }
}

if (typeof flags.query !== 'string' || flags.query.trim() === '') {
  console.error('--query is required')
  usage()
}

async function main(): Promise<number> {
  const ragIndex = buildDefaultRagIndex()
  const onEvent = (event: AgentStreamEvent) => {
    const line =
      event.type === 'node-start'
        ? `→ ${event.node} (step ${event.stepCount})`
        : event.type === 'node-end'
          ? `done ${event.node}`
          : event.type === 'tool'
            ? `${event.ok ? 'ok' : 'fail'} ${event.tool} @${event.node} — ${event.result.slice(0, 80)}`
            : event.type === 'interrupt'
              ? `interrupt (${event.interrupt.reason}) — ${event.interrupt.message}`
              : 'completed'
    console.log(`[event] ${line}`)
  }

  const result = await runBudgetAgent({
    query: String(flags.query),
    jurisdiction: typeof flags.jurisdiction === 'string' ? flags.jurisdiction : 'zimbabwe',
    projectId: typeof flags.project === 'string' ? flags.project : undefined,
    runId: typeof flags.runId === 'string' ? flags.runId : undefined,
    persist: flags.persist === true,
    context: {
      ragIndex,
      contractValueCents: typeof flags['contract-usd'] === 'string' ? Math.round(Number(flags['contract-usd']) * 100) : undefined,
      planId: typeof flags.plan === 'string' ? flags.plan : undefined,
      architectRegistrationNumber: typeof flags.architect === 'string' ? flags.architect : undefined,
      historicalBaseline:
        typeof flags['baseline-usd'] === 'string'
          ? { avgCostCents: Math.round(Number(flags['baseline-usd']) * 100) }
          : undefined,
    },
    onEvent,
  })

  const s = result.state
  console.log('')
  console.log(`runId:        ${result.runId}`)
  console.log(`status:       ${s.status}`)
  console.log(`node:         ${s.node}`)
  console.log(`decision:     ${s.decision ?? '-'}`)
  console.log(`rewritten:    ${s.rewrittenQuery ?? '-'}`)
  console.log(`evidence:     ${s.retrievedDocs.length} sections`)
  console.log(`tools:        ${s.toolCalls.length}`)
  console.log(`spans:        ${result.trace.spans.length}`)

  if (result.interrupted && result.interrupt) {
    console.log('')
    console.log(`HITL: ${result.interrupt.reason} — ${result.interrupt.message}`)
    if (typeof flags.decision === 'string') {
      const decision = flags.decision === 'APPROVED' || flags.decision === 'REJECTED' ? flags.decision : null
      if (!decision) usage()
      console.log(`resuming with ${decision}…`)
      await resumeAgent(result.state, decision)
      console.log(`resumed: ${decision}`)
      return 0
    }
    console.log('resume: pass --decision APPROVED|REJECTED to auto-resume')
    return 2
  }

  return s.status === 'completed' ? 0 : 1
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
