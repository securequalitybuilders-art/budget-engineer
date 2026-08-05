import { describe, it, expect, vi } from 'vitest'
import {
  classifyStorage,
  getStorageHealth,
  getStorageEstimate,
  formatBytes,
  WARNING_THRESHOLD_PCT,
  CRITICAL_THRESHOLD_PCT,
} from '@/lib/offline/storageHealth'

describe('storageHealth — classification', () => {
  it('reports ok below the warning threshold', () => {
    const health = classifyStorage(1000 * 1024 * 1024, 100 * 1024 * 1024)
    expect(health.level).toBe('ok')
    expect(health.usagePct).toBe(10)
    expect(health.remainingBytes).toBe(900 * 1024 * 1024)
    expect(health.supported).toBe(true)
  })

  it('flags warning at the warning threshold', () => {
    const quota = 1000 * 1024 * 1024
    const health = classifyStorage(quota, Math.round((quota * WARNING_THRESHOLD_PCT) / 100))
    expect(health.level).toBe('warning')
  })

  it('flags critical at the critical threshold', () => {
    const quota = 1000 * 1024 * 1024
    const health = classifyStorage(quota, Math.round((quota * CRITICAL_THRESHOLD_PCT) / 100))
    expect(health.level).toBe('critical')
  })

  it('handles a zero quota without dividing by zero', () => {
    const health = classifyStorage(0, 50)
    expect(health.level).toBe('ok')
    expect(health.usagePct).toBe(0)
  })
})

describe('storageHealth — estimate', () => {
  it('returns null when the Storage API is unsupported', async () => {
    vi.stubGlobal('navigator', {})
    expect(await getStorageEstimate()).toBeNull()
    vi.unstubAllGlobals()
  })

  it('maps a real estimate through getStorageHealth', async () => {
    const estimate = { quota: 2 * 1024 * 1024 * 1024, usage: 2 * 1024 * 1024 * 1024 * 0.9 }
    vi.stubGlobal('navigator', { storage: { estimate: vi.fn(async () => estimate) } })
    const health = await getStorageHealth()
    expect(health.supported).toBe(true)
    expect(health.usagePct).toBe(90)
    expect(health.level).toBe('warning')
    vi.unstubAllGlobals()
  })

  it('degrades to unsupported when estimate rejects', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn(async () => { throw new Error('denied') }) },
    })
    const health = await getStorageHealth()
    expect(health.supported).toBe(false)
    expect(health.level).toBe('ok')
    vi.unstubAllGlobals()
  })
})

describe('storageHealth — formatting', () => {
  it('formats bytes into human units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.05 kB')
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.5 MB')
    expect(formatBytes(2.5 * 1e9)).toBe('2.50 GB')
  })

  it('guards non-finite input', () => {
    expect(formatBytes(Number.NaN)).toBe('0 B')
    expect(formatBytes(-5)).toBe('0 B')
  })
})
