// KPI1 — Query rewriting layer.
//
// Vague / conversational / multi-turn queries are rewritten into precise
// retrieval queries before they hit the RAG index. The deterministic local
// path is always available (no network); an optional free-tier remote LLM
// path (Gemini / Groq / GitHub Models / OpenRouter via `remote-providers`)
// can produce a deeper rewrite when a key is configured.

import { getRemoteProvider, completeChat } from '@/lib/ai/remote-providers'
import type { AiRemoteProvider } from '@/lib/ai/ai-types'

export interface RewriteOptions {
  jurisdiction?: string
  engine?: AiRemoteProvider
  apiKey?: string
}

export interface RewrittenQuery {
  original: string
  rewritten: string
  vague: boolean
  method: 'local' | 'remote' | 'identity'
  rationale: string[]
}

// ---------------------------------------------------------------------------
// Vague-query detection
// ---------------------------------------------------------------------------

const PRONOUNS = /^(it|its|they|them|their|there|this|that|those|these|what|which|how|do|does|can|could|should|is|are|any|the|a|an)\b/i

const VAGUE_MARKERS = [
  'requirements?',
  'standards?',
  'rules?',
  'regulations?',
  'what do i need',
  'what are the',
  'is it ok',
  'is this ok',
  'allowed',
  'permitted',
  'compliance',
  'building code',
  'zbc',
  'sans',
]

export function isVagueQuery(query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  // Very short queries are inherently ambiguous.
  if (q.split(/\s+/).length <= 2) return true
  // Starts with a pronoun / interrogative without a concrete term.
  if (PRONOUNS.test(q) && !/\d/.test(q)) return true
  // Matches a generic ask but carries no specific regulation/clause.
  if (VAGUE_MARKERS.some((m) => q.includes(m)) && !/clause|section|part|schedule|chapter|^\d/.test(q)) {
    // "sans" alone is vague; "sans 10400-k wall" is not.
    if (q === 'sans' || q === 'zbc') return true
    return !/\b(10400|10160|10400-[a-z]|wall|room|ceiling|ventilation|fire|window|stair)/.test(q)
  }
  return false
}

// ---------------------------------------------------------------------------
// Deterministic local rewriting
// ---------------------------------------------------------------------------

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\b(?:zbc)\b/i, 'Model Building By-Laws 1977 Zimbabwe'],
  [/\b(?:by.?laws?|byelaws?)\b/i, 'Model Building By-Laws 1977'],
  [/\b(?:sans)\b/i, 'SANS'],
  [/\b(?:reqs?)\b/i, 'requirements'],
  [/\b(?:max)\b/i, 'maximum'],
  [/\b(?:min)\b/i, 'minimum'],
  [/\b(?:room)\b/i, 'room'],
  [/\b(?:mm|m)\b/i, 'millimetres'],
  [/\b(?:sq ?m|m2|m²)\b/i, 'square metres'],
  [/\b(?:e\.?g\.?)\b/i, ''],
]

const FILLER = /\b(please|tell me|i want to know|i need to know|kindly|just|basically|regarding|about the)\b/gi

export function deterministicRewrite(raw: string, opts: RewriteOptions = {}): { rewritten: string; rationale: string[] } {
  let text = raw.trim()
  const rationale: string[] = []
  const before = text

  text = text.replace(FILLER, (m) => {
    rationale.push(`removed filler "${m.trim()}"`)
    return ''
  })
  for (const [re, replacement] of ABBREVIATIONS) {
    if (re.test(text)) {
      const prior = text
      text = text.replace(re, replacement)
      if (prior !== text) rationale.push(`expanded abbreviation "${prior.match(re)?.[0] ?? ''}" -> "${replacement}"`)
    }
  }

  if (opts.jurisdiction && !/\bzimbabwe|south africa|south-africa\b/i.test(text)) {
    rationale.push(`added jurisdiction context "${opts.jurisdiction}"`)
    text = `${text} (${opts.jurisdiction})`
  }

  text = text.replace(/\s+/g, ' ').trim()
  if (text === before) rationale.push('no changes needed')
  return { rewritten: text, rationale }
}

// ---------------------------------------------------------------------------
// Conversational / multi-turn history resolution
// ---------------------------------------------------------------------------

export interface HistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Resolve anaphora ("it", "those", "the above", "the wall") against the prior
 * turn so a follow-up question is self-contained for retrieval.
 */
export function resolveHistory(raw: string, history: HistoryTurn[] = []): { resolved: string; rationale: string[] } {
  const q = raw.trim()
  const rationale: string[] = []
  if (history.length === 0) return { resolved: q, rationale: ['no history — identity'] }
  const lastUser = [...history].reverse().find((t) => t.role === 'user')
  const lastAssistant = [...history].reverse().find((t) => t.role === 'assistant')
  if (!lastUser) return { resolved: q, rationale: ['no prior user turn — identity'] }

  const previous = lastAssistant?.content ?? lastUser.content
  // Prefer the content that follows a clause/section reference ("Clause 3.2:
  // boundary walls are 230 mm." -> "boundary walls are 230 mm").
  const subjectMatch = previous.match(/(?:clause|section|part|chapter)\s+[\d.]+[:-]?\s+([A-Za-z0-9 .-]{3,60})/i)
  const subject = subjectMatch?.[1]?.trim()
    ?? previous.match(/\b(wall|room|window|stair|foundation|roof|ventilation|fire)[a-z ]{0,30}\b/i)?.[0]?.trim()
    ?? undefined
  const hasAnaphora = /\b(it|its|they|them|their|those|these|that|the above|the following|as well|too|also)\b/i.test(q)
  if (hasAnaphora && subject) {
    rationale.push(`resolved anaphora against prior subject "${subject}"`)
    return { resolved: `${q} ${subject}`, rationale }
  }
  return { resolved: q, rationale: ['no resolvable anaphora — identity'] }
}

// ---------------------------------------------------------------------------
// Remote LLM rewriting (free-tier providers, graceful local fallback)
// ---------------------------------------------------------------------------

export const REWRITE_PROMPT = (query: string, history: HistoryTurn[], jurisdiction?: string) =>
  `You are a SADC building-code retrieval librarian. Rewrite the user question into a precise, self-contained retrieval query suitable for a RAG search over the Model Building By-Laws 1977, SANS 10400, SANS 10160 and ZBC statutes. Expand abbreviations, resolve pronouns against the conversation, and keep technical terms exact.

Schema:
{"rewritten":string,"vague":boolean,"rationale":[string]}

Conversation history (newest last):
${history.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n') || '(none)'}

Jurisdiction: ${jurisdiction ?? 'zimbabwe'}

Question: "${query}"

Reply with ONLY the JSON object, no prose.
JSON:`

export async function rewriteQuery(
  query: string,
  opts: RewriteOptions = {},
  history: HistoryTurn[] = [],
): Promise<RewrittenQuery> {
  const { resolved, rationale: historyRationale } = resolveHistory(query, history)
  const { rewritten: local, rationale: localRationale } = deterministicRewrite(resolved, { jurisdiction: opts.jurisdiction })
  const vague = isVagueQuery(resolved)

  // Attempt remote rewrite when a provider + key are supplied.
  const config = opts.engine ? getRemoteProvider(opts.engine) : undefined
  if (config && opts.apiKey) {
    try {
      const content = await completeChat(config, opts.apiKey, [
        { role: 'user', content: REWRITE_PROMPT(query, history, opts.jurisdiction) },
      ])
      const json = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)) as {
        rewritten?: string
        vague?: boolean
        rationale?: string[]
      }
      if (typeof json.rewritten === 'string' && json.rewritten.trim().length > 0) {
        return {
          original: query,
          rewritten: json.rewritten.trim(),
          vague: json.vague ?? vague,
          method: 'remote',
          rationale: [...historyRationale, ...localRationale, ...(json.rationale ?? ['remote rewrite']), 'remote LLM rewrite'],
        }
      }
    } catch {
      // fall through to local
    }
  }

  const method: RewrittenQuery['method'] = local === resolved ? (resolved === query ? 'identity' : 'local') : 'local'
  return { original: query, rewritten: local, vague, method, rationale: [...historyRationale, ...localRationale] }
}
