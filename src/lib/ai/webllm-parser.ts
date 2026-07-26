import { ParsedBrief } from './ai-types';
import { BRIEF_PROMPT, extractJson, coerceBrief } from './ai-provider';

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

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
      // @ts-expect-error — @mlc-ai/web-llm is opt-in; install via `npm install @mlc-ai/web-llm`
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
  const json = extractJson(content);
  return coerceBrief(json, text);
}
