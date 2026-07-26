import { describe, it, expect } from 'vitest'
import { generateDesignOptionsFromBriefText, generateDefaultDesignOption } from '@/adapters/aiDesignAdapter'

describe('aiDesignAdapter', () => {
  it('residential brief returns 3 design options', () => {
    const result = generateDesignOptionsFromBriefText(
      'Design a 3 bedroom affordable family house in Harare, 150 square meters, one floor, brick walls, zinc roof, 2 bathrooms',
    )
    expect(result.designOptions.length).toBe(3)
  })

  it('design options have required fields', () => {
    const result = generateDesignOptionsFromBriefText('2 bedroom house 100 m2')
    for (const opt of result.designOptions) {
      expect(opt.id).toBeTruthy()
      expect(opt.name).toBeTruthy()
      expect(opt.grossFloorArea).toBeGreaterThan(0)
      expect(opt.floors).toBeGreaterThan(0)
      expect(Array.isArray(opt.elements)).toBe(true)
    }
  })

  it('vague brief still returns safe default options', () => {
    const result = generateDesignOptionsFromBriefText('build something')
    expect(result.designOptions.length).toBeGreaterThanOrEqual(1)
    for (const opt of result.designOptions) {
      expect(opt.grossFloorArea).toBeGreaterThan(0)
      expect(opt.floors).toBeGreaterThan(0)
    }
  })

  it('generates diagnostics with building type', () => {
    const result = generateDesignOptionsFromBriefText('clinic 200 m2')
    expect(result.diagnostics.length).toBeGreaterThan(0)
    expect(result.diagnostics.some((d) => d.toLowerCase().includes('type'))).toBe(true)
  })

  it('duplex brief produces 2 floors', () => {
    const result = generateDesignOptionsFromBriefText(
      'Create a two storey 240 square meter duplex with four bedrooms, three bathrooms, open plan kitchen and lounge',
    )
    const opts = result.designOptions.filter((o) => o.floors === 2)
    expect(opts.length).toBeGreaterThanOrEqual(1)
  })

  it('generateDefaultDesignOption returns a valid option', () => {
    const opt = generateDefaultDesignOption()
    expect(opt.id).toBeTruthy()
    expect(opt.grossFloorArea).toBeGreaterThan(0)
    expect(opt.floors).toBeGreaterThan(0)
  })
})
