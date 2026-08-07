import { ParsedBrief, AiEngine } from './ai-types';
import { parseBrief } from './brief-parser';
import { getRemoteProvider, parseWithRemoteProvider } from './remote-providers';
import { useAiSettingsStore } from '@/stores/aiSettingsStore';

export { coerceBrief, extractJson, BRIEF_PROMPT } from './brief-coercion';
export { REMOTE_PROVIDERS, getRemoteProvider, completeChat } from './remote-providers';
export type { RemoteProviderConfig } from './remote-providers';
export type { AiEngine, AiRemoteProvider } from './ai-types';

export interface ParseResult extends ParsedBrief {
  engineUsed: AiEngine;
  fellBack?: boolean;
  fallbackReason?: string;
}

export async function parseWithEngine(
  text: string,
  engine: AiEngine,
  opts?: { apiKey?: string },
): Promise<ParseResult> {
  if (engine === 'local-rules') {
    return { ...parseBrief(text), engineUsed: 'local-rules' };
  }
  if (engine === 'webllm') {
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
  const config = getRemoteProvider(engine);
  const apiKey = opts?.apiKey ?? useAiSettingsStore.getState().apiKeys[engine];
  if (!config) {
    return {
      ...parseBrief(text),
      engineUsed: 'local-rules',
      fellBack: true,
      fallbackReason: `Unknown engine: ${engine}`,
    };
  }
  if (!apiKey) {
    return {
      ...parseBrief(text),
      engineUsed: 'local-rules',
      fellBack: true,
      fallbackReason: `${config.label} requires an API key — add one in AI settings`,
    };
  }
  try {
    const parsed = await parseWithRemoteProvider(text, config, apiKey);
    return { ...parsed, engineUsed: engine };
  } catch (err) {
    return {
      ...parseBrief(text),
      engineUsed: 'local-rules',
      fellBack: true,
      fallbackReason: err instanceof Error ? err.message : String(err),
    };
  }
}
