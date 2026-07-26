import { describe, it, expect } from 'vitest'
import { computeVisibility } from '@/components/bim/viewMode'

describe('computeVisibility', () => {
  it('full mode shows everything with all storeys', () => {
    const r = computeVisibility('full', 'all', 2)
    expect(r).toEqual({ showRoof: true, wallOpacity: 1, showCeilings: true, storeysToShow: 'all' })
  })

  it('full mode with specific storey returns that storey', () => {
    const r = computeVisibility('full', 0, 2)
    expect(r.showRoof).toBe(true)
    expect(r.wallOpacity).toBe(1)
    expect(r.showCeilings).toBe(true)
    expect(r.storeysToShow).toEqual([0])
  })

  it('noRoof mode hides roof but keeps walls opaque and ceilings visible', () => {
    const r = computeVisibility('noRoof', 'all', 1)
    expect(r).toEqual({ showRoof: false, wallOpacity: 1, showCeilings: true, storeysToShow: 'all' })
  })

  it('dollhouse mode hides roof, sets wall opacity < 1, hides ceilings', () => {
    const r = computeVisibility('dollhouse', 'all', 3)
    expect(r.showRoof).toBe(false)
    expect(r.wallOpacity).toBeLessThan(1)
    expect(r.wallOpacity).toBeGreaterThan(0)
    expect(r.showCeilings).toBe(false)
    expect(r.storeysToShow).toBe('all')
  })

  it('dollhouse wallOpacity is 0.4', () => {
    const r = computeVisibility('dollhouse', 'all', 1)
    expect(r.wallOpacity).toBe(0.4)
  })

  it('clamps visibleStorey to valid range', () => {
    const r = computeVisibility('full', 99, 3)
    expect(r.storeysToShow).toEqual([2])
  })

  it('clamps negative visibleStorey to 0', () => {
    const r = computeVisibility('full', -5, 3)
    expect(r.storeysToShow).toEqual([0])
  })

  it('single storey — all storeysToShow === "all"', () => {
    const r = computeVisibility('full', 'all', 1)
    expect(r.storeysToShow).toBe('all')
  })

  it('full mode — wallOpacity is exactly 1', () => {
    const r = computeVisibility('full', 0, 1)
    expect(r.wallOpacity).toBe(1)
  })

  it('noRoof mode — wallOpacity is exactly 1', () => {
    const r = computeVisibility('noRoof', 0, 1)
    expect(r.wallOpacity).toBe(1)
  })

  it('storey count 0 (edge) — storeysToShow clamps to [0]', () => {
    const r = computeVisibility('full', 0, 0)
    expect(r.storeysToShow).toEqual([0])
  })

  it('all three modes produce correct showRoof', () => {
    expect(computeVisibility('full', 'all', 1).showRoof).toBe(true)
    expect(computeVisibility('dollhouse', 'all', 1).showRoof).toBe(false)
    expect(computeVisibility('noRoof', 'all', 1).showRoof).toBe(false)
  })
})
