import { describe, it, expect } from 'vitest'
import {
  getDefaultRegionId,
  getRegionRateCard,
  getSupportedRegions,
  resolveBoqRate,
  getBoqRateAssumptions,
  getContingencyRate,
  getFeesRate,
  getVatRate,
} from '@/adapters/rateCardAdapter'

describe('rateCardAdapter', () => {
  it('listRegions includes Zimbabwe, South Africa, Kenya, Global', () => {
    const regions = getSupportedRegions()
    const ids = regions.map((r) => r.id)
    expect(ids).toContain('zimbabwe')
    expect(ids).toContain('southafrica')
    expect(ids).toContain('kenya')
    expect(ids).toContain('global')
  })

  it('default region resolves to zimbabwe', () => {
    expect(getDefaultRegionId()).toBe('zimbabwe')
  })

  it('getRegionRateCard returns valid card', () => {
    const card = getRegionRateCard('kenya')
    expect(card.currency).toBe('KES')
    expect(card.wall.concrete).toBeGreaterThan(0)
  })

  it('unknown region falls back to Zimbabwe', () => {
    const card = getRegionRateCard('nonexistent')
    expect(card.id).toBe('zimbabwe')
  })

  it('known mapped rate returns rate-card source', () => {
    const result = resolveBoqRate('zimbabwe', 'wall', 999)
    expect(result.source).toBe('rate-card')
    expect(result.rate).not.toBe(999)
    expect(result.rate).toBeGreaterThan(0)
  })

  it('door maps to opening_each from rate card', () => {
    const result = resolveBoqRate('zimbabwe', 'door', 180)
    expect(result.source).toBe('rate-card')
    expect(result.rate).toBe(250)
  })

  it('missing rate returns fallback with warning', () => {
    const result = resolveBoqRate('zimbabwe', 'unknown_item', 99)
    expect(result.source).toBe('fallback')
    expect(result.rate).toBe(99)
    expect(result.warning).toBeTruthy()
  })

  it('partition rate is ~70% of wall rate', () => {
    const wall = resolveBoqRate('zimbabwe', 'wall', 85)
    const partition = resolveBoqRate('zimbabwe', 'partition', 65)
    expect(partition.rate).toBeLessThan(wall.rate)
    expect(partition.source).toBe('rate-card')
  })

  it('getBoqRateAssumptions returns assumptions for all items', () => {
    const assumptions = getBoqRateAssumptions('zimbabwe')
    const keys = assumptions.map((a) => a.itemKey)
    expect(keys).toContain('wall')
    expect(keys).toContain('slab')
    expect(keys).toContain('roof')
    expect(keys).toContain('door')
    expect(keys).toContain('window')
    expect(keys).toContain('partition')
  })

  it('contingency/fees/vat rates vary by region', () => {
    expect(getContingencyRate('zimbabwe')).toBe(0.05)
    expect(getFeesRate('zimbabwe')).toBe(0.07)
    expect(getVatRate('zimbabwe')).toBe(0.15)
    expect(getVatRate('kenya')).toBe(0.16)
  })

  it('no NaN values', () => {
    const assumptions = getBoqRateAssumptions('zimbabwe')
    for (const a of assumptions) {
      expect(Number.isNaN(a.rate)).toBe(false)
      expect(a.rate).toBeGreaterThan(0)
    }
  })
})
