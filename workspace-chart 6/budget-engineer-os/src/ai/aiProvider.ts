// ============================================================================
// Stage 70 — AI provider abstraction for brief parsing.
// Two engines, same output (ParsedBrief):
//   'local-rules' — deterministic offline parser (default, always works)
//   'webllm'      — in-browser local LLM via @mlc-ai/web-llm (opt-in, lazy)
// The webllm path ALWAYS falls back to local-rules on any failure (no WebGPU,
// load error, malformed JSON), so generation never breaks. No paid API.
// ============================================================================

import { ParsedBrief, parseBrief } from './briefParser';

export type AiEngine = 'local-rules' | 'webllm';

export interface ParseResult extends ParsedBrief {
  engineUsed: AiEngine;        // which engine actually produced this
  fellBack?: boolean;          // true if webllm was requested but local-rules ran
  fallbackReason?: string;
}

/** Validate + coerce an untrusted object into a safe ParsedBrief. */
export function coerceBrief(obj: unknown, raw: string): ParsedBrief {
  const o = (obj ?? {}) as Record<string, unknown>;
  const int = (v: unknown, def: number, min: number, max: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def;
  };
  const str = (v: unknown, def: string) => (typeof v === 'string' && v.trim() ? v.trim() : def);
  const fallback = parseBrief(raw); // use rules result to fill any gaps
  return {
    buildingType: str(o.buildingType, fallback.buildingType),
    bedrooms: int(o.bedrooms, fallback.bedrooms, 0, 20),
    bathrooms: int(o.bathrooms, fallback.bathrooms, 0, 20),
    floors: int(o.floors, fallback.floors, 1, 6),
    approxAreaM2: int(o.approxAreaM2, fallback.approxAreaM2, 20, 5000),
    budget: o.budget != null && Number.isFinite(Number(o.budget)) ? Number(o.budget) : fallback.budget,
    features: Array.isArray(o.features) ? o.features.map(String).slice(0, 20) : fallback.features,
    raw,
  };
}

/** Extract the first balanced JSON object from a model's free-text reply. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('no JSON object in model output');
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
  }
  throw new Error('unbalanced JSON in model output');
}

export const BRIEF_PROMPT = (brief: string) =>
  `You are an architectural brief parser. Read the brief and reply with ONLY a JSON object, no prose.
Schema: {"buildingType":string,"bedrooms":int,"bathrooms":int,"floors":int,"approxAreaM2":int,"budget":int|null,"features":string[]}
Brief: "${brief}"
JSON:`;

/**
 * Parse a brief with the requested engine. Always resolves to a ParseResult;
 * webllm failures degrade silently to local-rules.
 */
export async function parseWithEngine(text: string, engine: AiEngine): Promise<ParseResult> {
  if (engine === 'local-rules') {
    return { ...parseBrief(text), engineUsed: 'local-rules' };
  }
  // webllm — lazy import so the model runtime never touches the critical path
  try {
    const { parseWithWebLLM } = await import('./webllmParser');
    const parsed = await parseWithWebLLM(text);
    return { ...parsed, engineUsed: 'webllm' };
  } catch (err) {
    return {
      ...parseBrief(text),
      engineUsed: 'local-rules',
      fellBack: true,
      fallbackReason: err instanceof Error ? err.message : String(err),
    };
  }
}
