import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseWithEngine } from '@/lib/ai/ai-provider';
import { REMOTE_PROVIDERS, getRemoteProvider, parseWithRemoteProvider, completeChat } from '@/lib/ai/remote-providers';
import { useAiSettingsStore } from '@/stores/aiSettingsStore';

const openAiJson = JSON.stringify({
  choices: [{ message: { content: '{"buildingType":"clinic","bedrooms":4,"bathrooms":2,"floors":1,"approxAreaM2":150}' } }],
});

const geminiJson = JSON.stringify({
  candidates: [{ content: { parts: [{ text: '{"buildingType":"clinic","bedrooms":4,"bathrooms":2,"floors":1,"approxAreaM2":150}' }] } }],
});

function okResponse(body: string): Response {
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
}

const fetchMock = vi.fn();

describe('remote-providers — free-tier LLM registry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAiSettingsStore.getState().clearApiKey('gemini');
    useAiSettingsStore.getState().clearApiKey('groq');
    useAiSettingsStore.getState().clearApiKey('github-models');
    useAiSettingsStore.getState().clearApiKey('openrouter');
  });

  it('registers all 4 free-tier providers with correct models', () => {
    expect(REMOTE_PROVIDERS).toHaveLength(4);
    const byId = Object.fromEntries(REMOTE_PROVIDERS.map((p) => [p.id, p]));
    expect(byId['gemini'].model).toBe('gemini-2.0-flash');
    expect(byId['groq'].model).toBe('llama-3.3-70b-versatile');
    expect(byId['github-models'].model).toBe('gpt-4o-mini');
    expect(byId['openrouter'].model).toBe('meta-llama/llama-3.3-70b-instruct:free');
  });

  it('includes rate limits and signup URLs', () => {
    expect(getRemoteProvider('gemini')?.rateLimit).toBe('1,500 req/day');
    expect(getRemoteProvider('gemini')?.signupUrl).toContain('aistudio.google.com');
    expect(getRemoteProvider('groq')?.signupUrl).toContain('console.groq.com');
    expect(getRemoteProvider('openrouter')?.signupUrl).toContain('openrouter.ai');
  });

  it('sends OpenAI-compatible request for groq and parses response', async () => {
    fetchMock.mockResolvedValue(okResponse(openAiJson));
    const config = getRemoteProvider('groq')!;
    const parsed = await parseWithRemoteProvider('A 4-bedroom clinic in Harare', config, 'test-key');
    expect(parsed.buildingType).toBe('clinic');
    expect(parsed.bedrooms).toBe(4);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('api.groq.com');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-key' });
  });

  it('sends Gemini-style request with key in query and parses response', async () => {
    fetchMock.mockResolvedValue(okResponse(geminiJson));
    const config = getRemoteProvider('gemini')!;
    const parsed = await parseWithRemoteProvider('A 4-bedroom clinic in Harare', config, 'g-key');
    expect(parsed.buildingType).toBe('clinic');
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('generativelanguage.googleapis.com');
    expect(String(url)).toContain('key=g-key');
  });

  it('throws a friendly error when the API returns non-OK', async () => {
    fetchMock.mockResolvedValue(new Response('rate limit', { status: 429, statusText: 'Too Many Requests' }));
    const config = getProvider('groq')!;
    await expect(completeChat(config, 'k', [{ role: 'user', content: 'hi' }])).rejects.toThrow(/429|rate limit/i);
  });

  it('throws when no API key provided', async () => {
    const config = getProvider('groq')!;
    await expect(completeChat(config, '', [{ role: 'user', content: 'hi' }])).rejects.toThrow(/API key/i);
  });
});

describe('parseWithEngine — remote routing + fallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    useAiSettingsStore.setState({ engine: 'local-rules', apiKeys: {} });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAiSettingsStore.setState({ engine: 'local-rules', apiKeys: {} });
  });

  it('uses a remote engine when an API key is configured in the store', async () => {
    fetchMock.mockResolvedValue(okResponse(openAiJson));
    useAiSettingsStore.getState().setApiKey('groq', 'store-key');
    useAiSettingsStore.getState().setEngine('groq');
    const result = await parseWithEngine('A 4-bedroom clinic', 'groq');
    expect(result.engineUsed).toBe('groq');
    expect(result.fellBack).toBeUndefined();
    expect(result.buildingType).toBe('clinic');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('api.groq.com');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer store-key' });
  });

  it('accepts an explicit apiKey override for remote engines', async () => {
    fetchMock.mockResolvedValue(okResponse(openAiJson));
    const result = await parseWithEngine('A 4-bedroom clinic', 'openrouter', { apiKey: 'explicit-key' });
    expect(result.engineUsed).toBe('openrouter');
    expect(result.buildingType).toBe('clinic');
  });

  it('falls back to local-rules when the remote provider has no API key', async () => {
    const result = await parseWithEngine('A 4-bedroom clinic', 'groq');
    expect(result.engineUsed).toBe('local-rules');
    expect(result.fellBack).toBe(true);
    expect(result.fallbackReason).toContain('API key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to local-rules when the remote request fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await parseWithEngine('A 4-bedroom clinic', 'gemini', { apiKey: 'k' });
    expect(result.engineUsed).toBe('local-rules');
    expect(result.fellBack).toBe(true);
    expect(result.fallbackReason).toContain('network down');
  });
});

function getProvider(id: 'groq' | 'gemini') {
  const config = getRemoteProvider(id);
  if (!config) throw new Error(`missing provider ${id}`);
  return config;
}
