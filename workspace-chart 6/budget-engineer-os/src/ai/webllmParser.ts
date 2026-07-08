// ============================================================================
// Stage 70 — WebLLM adapter (in-browser local LLM, free/OSS, no API).
// Lazy-imported ONLY from aiProvider.ts so @mlc-ai/web-llm is never on the
// initial critical path. Loads a small instruct model via WebGPU on first use,
// caches the engine, and converts the brief to a validated ParsedBrief.
// Throws on any problem; the caller (parseWithEngine) falls back to rules.
// ============================================================================

import { ParsedBrief } from './briefParser';
import { BRIEF_PROMPT, extractJson, coerceBrief } from './aiProvider';

// A small, fast instruct model suitable for in-browser JSON extraction.
const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

// cached engine + a hook so the UI can show load progress
type Engine = { chat: { completions: { create: (o: unknown) => Promise<unknown> } } };
let enginePromise: Promise<Engine> | null = null;

export type ProgressFn = (pct: number, text: string) => void;
let progressCb: ProgressFn | null = null;
export function setWebLLMProgress(cb: ProgressFn | null) { progressCb = cb; }

async function getEngine(): Promise<Engine> {
  if (typeof navigator === 'undefined' || !(navigator as Navigator & { gpu?: unknown }).gpu) {
    throw new Error('WebGPU not available in this browser');
  }
  if (!enginePromise) {
    enginePromise = (async () => {
      const webllm = await import('@mlc-ai/web-llm');
      return webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (r: { progress: number; text: string }) =>
          progressCb?.(Math.round((r.progress ?? 0) * 100), r.text ?? ''),
      }) as unknown as Engine;
    })().catch((e) => { enginePromise = null; throw e; });
  }
  return enginePromise;
}

export async function parseWithWebLLM(text: string): Promise<ParsedBrief> {
  const engine = await getEngine();
  const res = (await engine.chat.completions.create({
    messages: [{ role: 'user', content: BRIEF_PROMPT(text) }],
    temperature: 0,
    max_tokens: 256,
  })) as { choices?: { message?: { content?: string } }[] };
  const content = res.choices?.[0]?.message?.content ?? '';
  const json = extractJson(content); // throws if no/invalid JSON
  return coerceBrief(json, text);    // validates + fills gaps from rules
}
