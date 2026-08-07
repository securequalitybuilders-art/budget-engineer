import { ParsedBrief } from './ai-types';
import { parseBrief } from './brief-parser';

export { coerceBrief, extractJson, BRIEF_PROMPT } from './brief-coercion';

export type AiEngine = 'local-rules' | 'webllm';

export interface ParseResult extends ParsedBrief {
  engineUsed: AiEngine;
  fellBack?: boolean;
  fallbackReason?: string;
}

export async function parseWithEngine(text: string, engine: AiEngine): Promise<ParseResult> {
  if (engine === 'local-rules') {
    return { ...parseBrief(text), engineUsed: 'local-rules' };
  }
  try {
    const { parseWithWebLLM } = await import('./webllm-parser');
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
