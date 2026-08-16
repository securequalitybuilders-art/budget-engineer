// Multi-provider free-tier router — registry, request shaping, parse shapes,
// key resolution, chain fallback and per-provider isolation.
//
// The pinned single-provider semantics (429 retry/backoff/circuit/budget) are
// covered by free-router-rate-limit.test.ts. This file covers the
// provider-generic surface added by the multi-provider rewrite: the
// 5-provider registry, per-provider request/parse contracts, env + override
// key resolution, and the bytez -> nvidia fallback chain.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PROVIDER_CONFIGS,
  BYTEZ_MODELS,
  BYTEZ_RATE_LIMIT,
  NVIDIA_RATE_LIMIT,
  HF_RATE_LIMIT,
  OPENROUTER_RATE_LIMIT,
  GROQ_RATE_LIMIT,
  generateFree,
  embedFree,
  resolveProviderKey,
  resolveNvidiaKey,
  resolveHuggingFaceKey,
  resolveOpenRouterKey,
  resolveGroqKey,
  resolveBytezKey,
  bytezAvailable,
  nvidiaAvailable,
  huggingFaceAvailable,
  openRouterAvailable,
  groqAvailable,
  circuitStats,
  getRateLimitState,
  resetRateLimitState,
  type FreeProviderId,
} from '@/lib/llm/freeRouter'

const MSG = [{ role: 'user' as const, content: 'hello' }]

type ResponseLike = {
  ok: boolean
  status: number
  headers: { get: (k: string) => string | null }
  json: () => Promise<unknown>
  text: () => Promise<string>
}

function respond(body: unknown, status = 200, headers: Record<string, string> = {}): ResponseLike {
  return {
    ok: status >= 200 && status < 400,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : ''),
  }
}

function stubFetch(impl: (url: string) => Promise<ResponseLike> | ResponseLike): ReturnType<typeof vi.fn> {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

function requestInfo() {
  const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
  const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
  return { url, init, body: JSON.parse(init.body ?? '{}') as Record<string, unknown> }
}

// Deterministic timers/tracing: no real sleeps, no telemetry writes.
const quiet = { sleep: async () => {}, jitterMs: () => 0, trace: false }

beforeEach(() => {
  resetRateLimitState()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('registry', () => {
  it('exposes the five providers in registry order with bytez first', () => {
    expect(PROVIDER_CONFIGS.map((p) => p.id)).toEqual(['bytez', 'nvidia', 'huggingface', 'openrouter', 'groq'])
  })

  it('gives every provider the required contract surface', () => {
    for (const p of PROVIDER_CONFIGS) {
      expect(typeof p.label).toBe('string')
      expect(p.envKey).toMatch(/^VITE_/)
      expect(p.kinds.length).toBeGreaterThan(0)
      expect(typeof p.chatModel).toBe('string')
      expect(typeof p.auth).toBe('function')
      expect(typeof p.chatUrl).toBe('function')
      expect(typeof p.chatBody).toBe('function')
      expect(typeof p.parseChat).toBe('function')
    }
  })

  it('marks bytez/nvidia/huggingface as embed-capable and openrouter/groq as chat-only', () => {
    const embedCapable = new Set<FreeProviderId>(['bytez', 'nvidia', 'huggingface'])
    for (const p of PROVIDER_CONFIGS) {
      expect(p.kinds.includes('embed')).toBe(embedCapable.has(p.id))
      if (embedCapable.has(p.id)) {
        expect(typeof p.embedModel).toBe('string')
        expect(typeof p.embedUrl).toBe('function')
        expect(typeof p.embedBody).toBe('function')
        expect(typeof p.parseEmbed).toBe('function')
      } else {
        expect(p.embedModel).toBeUndefined()
        expect(p.parseEmbed).toBeUndefined()
      }
    }
  })

  it('pins the bytez defaults (backward-compat surface)', () => {
    const bytez = PROVIDER_CONFIGS.find((p) => p.id === 'bytez')!
    expect(BYTEZ_MODELS.chat).toBe('Qwen/Qwen3-4B')
    expect(bytez.chatModel).toBe(BYTEZ_MODELS.chat)
    expect(bytez.embedModel).toBe(BYTEZ_MODELS.embed)
    expect(bytez.envKey).toBe('VITE_BYTEZ_API_KEY')
    expect(bytez.rateLimit).toBe(BYTEZ_RATE_LIMIT)
  })

  it('pins the per-provider free-tier rate limits', () => {
    expect(BYTEZ_RATE_LIMIT).toEqual({ requestsPerWindow: 60, windowMs: 60_000, maxTokensPerWindow: 40_000 })
    expect(NVIDIA_RATE_LIMIT).toEqual({ requestsPerWindow: 60, windowMs: 60_000, maxTokensPerWindow: 40_000 })
    expect(OPENROUTER_RATE_LIMIT).toEqual({ requestsPerWindow: 60, windowMs: 60_000, maxTokensPerWindow: 40_000 })
    expect(HF_RATE_LIMIT).toEqual({ requestsPerWindow: 30, windowMs: 60_000, maxTokensPerWindow: 20_000 })
    expect(GROQ_RATE_LIMIT).toEqual({ requestsPerWindow: 30, windowMs: 60_000, maxTokensPerWindow: 30_000 })
  })
})

describe('key resolution', () => {
  it('prefers an explicit override over the env var', () => {
    vi.stubEnv('VITE_NVIDIA_API_KEY', 'env-nv')
    expect(resolveProviderKey('nvidia', '  nv-key ')).toBe('nv-key')
  })

  it('reads the provider env var when no override is given', () => {
    vi.stubEnv('VITE_NVIDIA_API_KEY', 'env-nv')
    vi.stubEnv('VITE_GROQ_API_KEY', 'env-groq')
    expect(resolveProviderKey('nvidia')).toBe('env-nv')
    expect(resolveNvidiaKey()).toBe('env-nv')
    expect(nvidiaAvailable()).toBe(true)
    expect(resolveGroqKey()).toBe('env-groq')
    expect(groqAvailable()).toBe(true)
  })

  it('reports unavailable when no key is configured', () => {
    expect(resolveProviderKey('nvidia')).toBeUndefined()
    expect(resolveBytezKey()).toBeUndefined()
    expect(bytezAvailable()).toBe(false)
    expect(nvidiaAvailable()).toBe(false)
    expect(huggingFaceAvailable()).toBe(false)
    expect(openRouterAvailable()).toBe(false)
    expect(groqAvailable()).toBe(false)
  })

  it('exposes per-provider resolvers that honour their override', () => {
    expect(resolveBytezKey('b')).toBe('b')
    expect(resolveNvidiaKey('n')).toBe('n')
    expect(resolveHuggingFaceKey('h')).toBe('h')
    expect(resolveOpenRouterKey('o')).toBe('o')
    expect(resolveGroqKey('g')).toBe('g')
  })
})

describe('request shaping', () => {
  it('shapes the bytez chat request (raw key auth, params body, no top-level model)', async () => {
    const fetchMock = stubFetch(async () => respond({ error: null, output: { role: 'assistant', content: 'hello' } }))
    const res = await generateFree(MSG, { apiKey: 'test-key', ...quiet })
    expect(res.text).toBe('hello')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, init, body } = requestInfo()
    expect(url).toBe('https://api.bytez.com/models/v2/Qwen%2FQwen3-4B')
    expect(init.method).toBe('POST')
    expect(init.headers?.Authorization).toBe('test-key')
    expect(body.messages).toEqual(MSG)
    expect(body.params).toEqual({ temperature: 0, max_tokens: 512 })
    expect('model' in body).toBe(false)
  })

  it('shapes the bytez embed request (raw key auth, text body)', async () => {
    const fetchMock = stubFetch(async () => respond({ error: null, output: [0.1, 0.2] }))
    const res = await embedFree('wall', { apiKey: 'test-key', ...quiet })
    expect(res.embedding).toEqual([0.1, 0.2])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, body } = requestInfo()
    expect(url).toBe('https://api.bytez.com/models/v2/BAAI%2Fbge-m3')
    expect(body).toEqual({ text: 'wall' })
  })

  it('shapes the nvidia chat request (Bearer auth, OpenAI-style body)', async () => {
    const fetchMock = stubFetch(async () => respond({ choices: [{ message: { content: '  nv  ' } }] }))
    const res = await generateFree(MSG, { provider: 'nvidia', apiKey: 'nv-key', ...quiet })
    expect(res.text).toBe('nv')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, init, body } = requestInfo()
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(init.headers?.Authorization).toBe('Bearer nv-key')
    expect(body.model).toBe('meta/llama-3.3-70b-instruct')
    expect(body.messages).toEqual(MSG)
    expect(body.temperature).toBe(0)
    expect(body.max_tokens).toBe(512)
  })

  it('shapes the nvidia embed request (model + input array, data[].embedding parse)', async () => {
    const fetchMock = stubFetch(async () => respond({ data: [{ embedding: [1, 2, 3] }] }))
    const res = await embedFree('soil', { provider: 'nvidia', apiKey: 'nv-key', ...quiet })
    expect(res.embedding).toEqual([1, 2, 3])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, body } = requestInfo()
    expect(url).toBe('https://integrate.api.nvidia.com/v1/embeddings')
    expect(body.model).toBe('nvidia/nv-embed-qa-4')
    expect(body.input).toEqual(['soil'])
  })

  it('shapes the huggingface chat request', async () => {
    const fetchMock = stubFetch(async () => respond({ choices: [{ message: { content: 'hf' } }] }))
    const res = await generateFree(MSG, { provider: 'huggingface', apiKey: 'hf-key', ...quiet })
    expect(res.text).toBe('hf')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, init, body } = requestInfo()
    expect(url).toBe(
      'https://api-inference.huggingface.co/models/mistralai%2FMistral-7B-Instruct-v0.3/v1/chat/completions',
    )
    expect(init.headers?.Authorization).toBe('Bearer hf-key')
    expect(body.model).toBe('mistralai/Mistral-7B-Instruct-v0.3')
  })

  it('shapes the huggingface embed request (inputs body, direct-array parse)', async () => {
    const fetchMock = stubFetch(async () => respond([0.4, 0.5]))
    const res = await embedFree('cement', { provider: 'huggingface', apiKey: 'hf', ...quiet })
    expect(res.embedding).toEqual([0.4, 0.5])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const { url, body } = requestInfo()
    expect(url).toBe('https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI%2Fbge-m3')
    expect(body).toEqual({ inputs: 'cement' })
  })

  it('shapes the openrouter chat request with the :free model', async () => {
    stubFetch(async () => respond({ choices: [{ message: { content: 'or' } }] }))
    const res = await generateFree(MSG, { provider: 'openrouter', apiKey: 'or-key', ...quiet })
    expect(res.text).toBe('or')
    const { url, init, body } = requestInfo()
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(init.headers?.Authorization).toBe('Bearer or-key')
    expect(body.model).toBe('meta-llama/llama-3.3-70b-instruct:free')
  })

  it('shapes the groq chat request with llama-3.3-70b-versatile', async () => {
    stubFetch(async () => respond({ choices: [{ message: { content: 'g' } }] }))
    const res = await generateFree(MSG, { provider: 'groq', apiKey: 'g-key', ...quiet })
    expect(res.text).toBe('g')
    const { url, body } = requestInfo()
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(body.model).toBe('llama-3.3-70b-versatile')
  })

  it('passes model/temperature/maxTokens through to the provider body', async () => {
    stubFetch(async () => respond({ choices: [{ message: { content: 'x' } }] }))
    const res = await generateFree(MSG, { provider: 'nvidia', apiKey: 'k', model: 'custom-model', temperature: 0.7, maxTokens: 100, ...quiet })
    expect(res.text).toBe('x')
    const { body } = requestInfo()
    expect(body.model).toBe('custom-model')
    expect(body.temperature).toBe(0.7)
    expect(body.max_tokens).toBe(100)
  })
})

describe('parse shapes', () => {
  it('parses bytez chat output and trims content', async () => {
    stubFetch(async () => respond({ error: null, output: { role: 'assistant', content: '  hello  ' } }))
    const res = await generateFree(MSG, { apiKey: 'test-key', ...quiet })
    expect(res.text).toBe('hello')
  })

  it('surfaces a bytez error field as a miss', async () => {
    stubFetch(async () => respond({ error: 'backend failure', output: null }))
    const res = await generateFree(MSG, { apiKey: 'test-key', ...quiet })
    expect(res.text).toBeNull()
    expect(res.error).toContain('backend failure')
  })

  it('rejects a non-array bytez embedding as invalid', async () => {
    stubFetch(async () => respond({ error: null, output: { nope: true } }))
    const res = await embedFree('x', { apiKey: 'test-key', ...quiet })
    expect(res.embedding).toBeNull()
    expect(res.error).toContain('Invalid embedding')
  })

  it('parses the nvidia embedding payload', async () => {
    stubFetch(async () => respond({ data: [{ embedding: [7, 8, 9] }] }))
    const res = await embedFree('x', { provider: 'nvidia', apiKey: 'k', ...quiet })
    expect(res.embedding).toEqual([7, 8, 9])
  })

  it('parses both huggingface embedding payload forms', async () => {
    stubFetch(async () => respond([3, 2, 1]))
    expect((await embedFree('x', { provider: 'huggingface', apiKey: 'k', ...quiet })).embedding).toEqual([3, 2, 1])
    stubFetch(async () => respond({ embedding: [9] }))
    expect((await embedFree('x', { provider: 'huggingface', apiKey: 'k', ...quiet })).embedding).toEqual([9])
  })

  it('reports an empty chat response', async () => {
    stubFetch(async () => respond({ error: null, output: { role: 'assistant', content: '' } }))
    const res = await generateFree(MSG, { apiKey: 'test-key', ...quiet })
    expect(res.text).toBeNull()
    expect(res.error).toContain('Empty response')
  })
})

describe('chain fallback', () => {
  it('falls back bytez -> nvidia when bytez is rate limited', async () => {
    const fetchMock = stubFetch(async (url) =>
      url.includes('integrate.api.nvidia.com') ? respond({ choices: [{ message: { content: 'nv hello' } }] }) : respond({}, 429),
    )
    const res = await generateFree(MSG, { providers: ['bytez', 'nvidia'], apiKey: 'key', maxRetries: 0, ...quiet })
    expect(res.text).toBe('nv hello')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('api.bytez.com')
    expect(fetchMock.mock.calls[1][0]).toContain('integrate.api.nvidia.com')
  })

  it('records budget per provider (bytez and nvidia counted separately)', async () => {
    stubFetch(async (url) => (url.includes('nvidia') ? respond({ choices: [{ message: { content: 'x' } }] }) : respond({}, 429)))
    await generateFree(MSG, { providers: ['bytez', 'nvidia'], apiKey: 'key', maxRetries: 0, ...quiet })
    expect(getRateLimitState('bytez')?.requests).toBe(1)
    expect(getRateLimitState('nvidia')?.requests).toBe(1)
  })

  it('auto-chains env-keyed providers in registry order (bytez first)', async () => {
    vi.stubEnv('VITE_BYTEZ_API_KEY', 'b-env')
    vi.stubEnv('VITE_NVIDIA_API_KEY', 'n-env')
    const fetchMock = stubFetch(async (url) => (url.includes('nvidia') ? respond({ choices: [{ message: { content: 'nv' } }] }) : respond({}, 429)))
    const res = await generateFree(MSG, { maxRetries: 0, ...quiet })
    expect(res.text).toBe('nv')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('api.bytez.com')
    expect(fetchMock.mock.calls[1][0]).toContain('integrate.api.nvidia.com')
  })

  it('skips chat-only providers in the embed chain', async () => {
    const fetchMock = stubFetch(async () => respond({ data: [{ embedding: [5, 6] }] }))
    const res = await embedFree('x', { providers: ['openrouter', 'nvidia'], apiKey: 'k', ...quiet })
    expect(res.embedding).toEqual([5, 6])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('/embeddings')
  })

  it('returns the last error when every provider fails', async () => {
    const fetchMock = stubFetch(async () => respond({}, 500))
    const res = await generateFree(MSG, { providers: ['bytez', 'nvidia'], apiKey: 'key', maxRetries: 0, ...quiet })
    expect(res.text).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(res.error).toContain('500')
  })
})

describe('per-provider isolation', () => {
  it('trips only the bytez breaker after 3x 429 and blocks bytez pre-network', async () => {
    const fetchMock = stubFetch(async () => respond({}, 429))
    for (let i = 0; i < 3; i++) {
      const res = await generateFree(MSG, { apiKey: 'test-key', maxRetries: 0, ...quiet })
      expect(res.error).toContain('429')
    }
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(circuitStats('bytez').opened).toBe(true)
    expect(circuitStats('nvidia').opened).toBe(false)
    expect(getRateLimitState('nvidia')).toBeUndefined()
    const blocked = await generateFree(MSG, { apiKey: 'test-key', maxRetries: 0, ...quiet })
    expect(blocked.error).toContain('circuit open')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('clears the breaker on reset', async () => {
    stubFetch(async () => respond({}, 429))
    for (let i = 0; i < 3; i++) await generateFree(MSG, { apiKey: 'test-key', maxRetries: 0, ...quiet })
    expect(circuitStats('bytez').opened).toBe(true)
    resetRateLimitState()
    expect(circuitStats('bytez').opened).toBe(false)
  })
})
