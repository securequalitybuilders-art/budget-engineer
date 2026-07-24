import { describe, it, expect } from 'vitest'
import { generateBriefText } from '@/components/ai/EnhancedBriefPanel'

describe('generateBriefText', () => {
  it('generates text containing bedroom count', () => {
    const text = generateBriefText({
      buildingType: 'house-residential', siteWidth: 30, siteDepth: 25,
      bedrooms: 3, bathrooms: 2, livingAreas: 1,
      kitchen: true, garage: false, verandah: false, store: false,
      style: 'modern', roof: 'gable', floors: 1,
      solar: false, rainwater: false, borehole: false, notes: '',
      budgetUsd: 50000,
    })
    expect(text).toContain('3 bedrooms')
  })

  it('includes building type and site dimensions', () => {
    const text = generateBriefText({
      buildingType: 'clinic-health', siteWidth: 40, siteDepth: 30,
      bedrooms: 2, bathrooms: 2, livingAreas: 1,
      kitchen: true, garage: false, verandah: false, store: true,
      style: 'modern', roof: 'flat', floors: 2,
      solar: true, rainwater: false, borehole: false, notes: 'accessibility ramp',
      budgetUsd: 120000,
    })
    expect(text).toContain('clinic health')
    expect(text).toContain('site 40×30 m')
    expect(text).toContain('2-storey')
    expect(text).toContain('store room')
    expect(text).toContain('solar ready')
    expect(text).toContain('flat roof')
    expect(text).toContain('accessibility ramp')
    expect(text).toContain('budget $120000')
  })

  it('includes optional features only when enabled', () => {
    const full = generateBriefText({
      buildingType: 'house-residential', siteWidth: 20, siteDepth: 20,
      bedrooms: 2, bathrooms: 1, livingAreas: 1,
      kitchen: true, garage: true, verandah: true, store: true,
      style: 'vernacular', roof: 'hip', floors: 1,
      solar: true, rainwater: true, borehole: true, notes: '',
      budgetUsd: 80000,
    })
    expect(full).toContain('garage')
    expect(full).toContain('verandah')
    expect(full).toContain('rainwater harvesting')
    expect(full).toContain('borehole')

    const minimal = generateBriefText({
      buildingType: 'apartment-multi', siteWidth: 25, siteDepth: 20,
      bedrooms: 1, bathrooms: 1, livingAreas: 0,
      kitchen: false, garage: false, verandah: false, store: false,
      style: 'contemporary', roof: 'flat', floors: 3,
      solar: false, rainwater: false, borehole: false, notes: '',
      budgetUsd: 200000,
    })
    expect(minimal).not.toContain('garage')
    expect(minimal).not.toContain('verandah')
    expect(minimal).not.toContain('rainwater')
  })
})
