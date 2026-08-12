// Answer generation over retrieved hybrid hits.
//
// Synthesizes a grounded answer with `[statute Ch.X Cl.Y]` citations. The
// deterministic local path always works (lead line + per-hit bullets with
// citations); an optional free Bytez chat completes a full answer and parses
// it back into the same shape. Language-aware (en / sn / nd) via the i18n
// layer. Empty or failed retrievals return the degradation protocol's explicit
// not-found message — never a fabricated clause.

import type { HybridHit } from './hybridSearch'
import { citationForChunk } from './citation'
import { generateFree } from '@/lib/llm/freeRouter'
import { ziqsSmmSystem } from '@/lib/ai/prompts/ziqs_smm_prompt'
import { extractJson } from '@/lib/ai/brief-coercion'
import { getLocale, type Locale } from '@/lib/i18n/i18n'
import { NOT_FOUND_MESSAGE, NOT_FOUND_REASON } from './gracefulDegradation'
import { telemetryClient } from '@/lib/observability/langfuseClient'

export interface GenerateOptions {
  jurisdiction?: string
  language?: Locale
  apiKey?: string
  model?: string
}

export interface GenerateResult {
  answer: string
  citations: string[]
  method: 'remote' | 'local'
  fellBack: boolean
  fallbackReason?: string
}

export function citeHit(hit: HybridHit): string {
  return citationForChunk({
    docId: hit.docId,
    docTitle: hit.docTitle,
    sectionId: hit.sectionId,
    path: hit.path,
    chapter: hit.chapter,
  })
}

export interface ParentRef {
  hit: HybridHit
  parentText: string
  citation: string
}

export const DEFAULT_MAX_PARENTS = 6

export function topParents(hits: HybridHit[], max = DEFAULT_MAX_PARENTS): ParentRef[] {
  const seen = new Set<string>()
  const out: ParentRef[] = []
  const sorted = [...hits].sort((a, b) => (b.rerankScore ?? b.rrf) - (a.rerankScore ?? a.rrf))
  for (const hit of sorted) {
    if (out.length >= max) break
    const parent = hit.text_parent?.trim()
    if (!parent) continue
    if (seen.has(hit.sectionId)) continue
    seen.add(hit.sectionId)
    out.push({ hit, parentText: parent, citation: citeHit(hit) })
  }
  return out
}

function leadLine(count: number, language: Locale): string {
  if (language === 'sn') return `Zvinoenderana ne${count} nongedzero dzinotevera:`
  if (language === 'nd') return `Ngokwe${count} okulandelayo okutholakele:`
  return `Based on ${count} retrieved reference${count === 1 ? '' : 's'}:`
}

export function buildLocalAnswer(_query: string, hits: HybridHit[], language: Locale = 'en'): { answer: string; citations: string[] } {
  const citations = hits.map(citeHit)
  const body = hits
    .map((hit, i) => `${i + 1}. ${hit.heading} — ${hit.text_child.trim().slice(0, 320)} ${citeHit(hit)}`)
    .join('\n')
  const parents = topParents(hits)
  const parentBlock =
    parents.length > 0
      ? `\n\nReferenced code passages:\n${parents
          .map((p) => `— ${p.citation}\n${p.parentText.trim().slice(0, 600)}`)
          .join('\n')}`
      : ''
  return { answer: `${leadLine(hits.length, language)}\n${body}${parentBlock}`, citations }
}

export const GENERATE_ANSWER_PROMPT = (query: string, hits: HybridHit[]) =>
  `Answer the design question using ONLY the retrieved code references. Ground every claim in the citations; never invent a clause, value, or standard not present in the references. Do not mention the absence of a source when one is present.

Schema:
{"answer":string,"citations":[string]}

Question: "${query}"

Retrieved references:
${hits.map((h, i) => `[${i + 1}] ${h.heading} (${citeHit(h)})\n${h.text_child.trim().slice(0, 400)}`).join('\n\n')}

Referenced parent passages (full regulatory context for the child references above):
${topParents(hits)
  .map((p) => `— ${p.citation}\n${p.parentText.trim().slice(0, 1000)}`)
  .join('\n\n')}

Reply with ONLY the JSON object, no prose.
JSON:`

function parseAnswer(text: string): { answer?: string; citations?: string[] } | null {
  try {
    return extractJson(text) as { answer?: string; citations?: string[] } | null
  } catch {
    return null
  }
}

export async function generateAnswer(query: string, hits: HybridHit[], opts: GenerateOptions = {}): Promise<GenerateResult> {
  const startedAt = Date.now()
  const language = opts.language ?? getLocale()
  const finish = (result: GenerateResult): GenerateResult => {
    void telemetryClient
      .traceLLMGen({
        query,
        method: result.method,
        model: opts.model,
        latencyMs: Date.now() - startedAt,
        tokenEstimate: estimateTokens(result.answer, hits),
        fellBack: result.fellBack,
        fallbackReason: result.fallbackReason,
      })
      .catch(() => {})
    return result
  }
  if (hits.length === 0) {
    return finish({ answer: NOT_FOUND_MESSAGE, citations: [], method: 'local', fellBack: true, fallbackReason: NOT_FOUND_REASON })
  }
  const local = buildLocalAnswer(query, hits, language)

  const result = await generateFree(
    [
      { role: 'system', content: ziqsSmmSystem(language) },
      { role: 'user', content: GENERATE_ANSWER_PROMPT(query, hits) },
    ],
    { apiKey: opts.apiKey, model: opts.model },
  )

  if (result.text) {
    const parsed = parseAnswer(result.text)
    const answer = parsed?.answer?.trim()
    if (answer && parsed) {
      return finish({
        answer,
        citations: Array.isArray(parsed.citations) && parsed.citations.length > 0 ? parsed.citations : local.citations,
        method: 'remote',
        fellBack: false,
      })
    }
  }

  return finish({
    ...local,
    method: 'local',
    fellBack: true,
    fallbackReason: result.error ?? 'Remote answer could not be parsed — local synthesis used',
  })
}

function estimateTokens(answer: string, hits: HybridHit[]): number {
  const chars = answer.length + hits.reduce((sum, h) => sum + h.text_child.length, 0)
  return Math.max(0, Math.round(chars / 4))
}
