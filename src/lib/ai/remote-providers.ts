import type { AiRemoteProvider, ParsedBrief } from './ai-types';
import { BRIEF_PROMPT, coerceBrief, extractJson } from './brief-coercion';

export interface RemoteProviderConfig {
  id: AiRemoteProvider;
  label: string;
  model: string;
  baseUrl: string;
  rateLimit: string;
  signupUrl: string;
  kind: 'gemini' | 'openai-compatible';
}

export const REMOTE_PROVIDERS: RemoteProviderConfig[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    model: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    rateLimit: '1,500 req/day',
    signupUrl: 'https://aistudio.google.com/apikey',
    kind: 'gemini',
  },
  {
    id: 'groq',
    label: 'Groq',
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    rateLimit: '30 req/min',
    signupUrl: 'https://console.groq.com/keys',
    kind: 'openai-compatible',
  },
  {
    id: 'github-models',
    label: 'GitHub Models',
    model: 'gpt-4o-mini',
    baseUrl: 'https://models.github.ai/inference/v1/chat/completions',
    rateLimit: '150 req/day',
    signupUrl: 'https://github.com/settings/tokens',
    kind: 'openai-compatible',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    rateLimit: '200 req/hr',
    signupUrl: 'https://openrouter.ai/keys',
    kind: 'openai-compatible',
  },
];

export function getRemoteProvider(id: AiRemoteProvider): RemoteProviderConfig | undefined {
  return REMOTE_PROVIDERS.find((p) => p.id === id);
}

const REQUEST_TIMEOUT_MS = 30_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function completeChat(
  config: RemoteProviderConfig,
  apiKey: string,
  messages: ChatMessage[],
): Promise<string> {
  if (!apiKey) throw new Error(`No API key provided for ${config.label}`);
  if (config.kind === 'gemini') {
    const url = `${config.baseUrl}/${config.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const data = (await postJson(
      url,
      { 'Content-Type': 'application/json' },
      {
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0, maxOutputTokens: 512 },
      },
    )) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
    if (data.error?.message) throw new Error(data.error.message);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error(`Empty response from ${config.label}`);
    return text;
  }
  const data = (await postJson(
    config.baseUrl,
    { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    { model: config.model, messages, temperature: 0, max_tokens: 512 },
  )) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  if (data.error?.message) throw new Error(data.error.message);
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error(`Empty response from ${config.label}`);
  return text;
}

export async function parseWithRemoteProvider(
  text: string,
  config: RemoteProviderConfig,
  apiKey: string,
): Promise<ParsedBrief> {
  const content = await completeChat(config, apiKey, [{ role: 'user', content: BRIEF_PROMPT(text) }]);
  const json = extractJson(content);
  return coerceBrief(json, text);
}
