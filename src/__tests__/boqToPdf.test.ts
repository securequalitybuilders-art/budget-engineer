import { describe, it, expect, vi } from 'vitest'
import { isValidPngDataUrl, captureSnapshot, registerSnapshotCapture, unregisterSnapshotCapture } from '@/lib/3d-snapshot'
import { embedSnapshotInPdf } from '@/adapters/boqToPdf'

// ── isValidPngDataUrl ──

describe('isValidPngDataUrl', () => {
  it('returns true for a valid base64 PNG data URL', () => {
    const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    expect(isValidPngDataUrl(url)).toBe(true)
  })

  it('returns false for undefined', () => {
    expect(isValidPngDataUrl(undefined)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidPngDataUrl(null)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isValidPngDataUrl('')).toBe(false)
  })

  it('returns false for a non-PNG data URL', () => {
    expect(isValidPngDataUrl('data:image/jpeg;base64,/9j/')).toBe(false)
  })

  it('returns false for a plain string', () => {
    expect(isValidPngDataUrl('hello-world')).toBe(false)
  })

  it('returns false for a data URL that is too short', () => {
    expect(isValidPngDataUrl('data:image/png;base64,')).toBe(false)
  })
})

// ── embedSnapshotInPdf ──

describe('embedSnapshotInPdf', () => {
  const VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  it('embeds a valid PNG data URL and returns advanced y', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, VALID_PNG, y, 14, 182)
    expect(doc.addImage).toHaveBeenCalledTimes(1)
    expect(doc.addImage).toHaveBeenCalledWith(VALID_PNG, 'PNG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number))
    expect(result).toBeGreaterThan(y)
  })

  it('returns original y when snapshotDataUrl is undefined', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, undefined, y, 14, 182)
    expect(doc.addImage).not.toHaveBeenCalled()
    expect(result).toBe(y)
  })

  it('returns original y when snapshotDataUrl is an invalid string', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, 'not-a-valid-url', y, 14, 182)
    expect(doc.addImage).not.toHaveBeenCalled()
    expect(result).toBe(y)
  })

  it('gracefully skips when addImage throws', () => {
    const doc = { addImage: vi.fn().mockImplementation(() => { throw new Error('corrupt image') }) }
    const y = 100
    const result = embedSnapshotInPdf(doc, VALID_PNG, y, 14, 182)
    expect(doc.addImage).toHaveBeenCalledTimes(1)
    expect(result).toBe(y)
  })

  it('returns original y for empty string', () => {
    const doc = { addImage: vi.fn() }
    const y = 100
    const result = embedSnapshotInPdf(doc, '', y, 14, 182)
    expect(doc.addImage).not.toHaveBeenCalled()
    expect(result).toBe(y)
  })
})

// ── capture registry ──

describe('capture registry', () => {
  it('returns null when no capture function is registered', () => {
    unregisterSnapshotCapture()
    expect(captureSnapshot()).toBeNull()
  })

  it('calls the registered function and returns its result', () => {
    registerSnapshotCapture(() => 'data:image/png;base64,abc123')
    expect(captureSnapshot()).toBe('data:image/png;base64,abc123')
    unregisterSnapshotCapture()
  })

  it('returns null after unregistering', () => {
    registerSnapshotCapture(() => 'data:image/png;base64,abc123')
    unregisterSnapshotCapture()
    expect(captureSnapshot()).toBeNull()
  })

  it('replaces the previous capture when registering a new one', () => {
    registerSnapshotCapture(() => 'first')
    registerSnapshotCapture(() => 'second')
    expect(captureSnapshot()).toBe('second')
    unregisterSnapshotCapture()
  })
})
