import { describe, it, expect } from 'vitest'
import { parseBrief } from '@/engine/parseBrief'

describe('parseBrief — uiOverrides.buildingType behavior', () => {

  it('auto override + hotel text yields hotel-fullservice typology', () => {
    const parsed = parseBrief('Build a 20-room hotel in Victoria Falls', { buildingType: 'auto' })
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('hotel-fullservice')
  })

  it('no override (undefined) + hotel text yields hotel-fullservice typology', () => {
    const parsed = parseBrief('Build a 20-room hotel in Victoria Falls')
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('hotel-fullservice')
  })

  it('explicit hotel-fullservice override yields hotel-fullservice typology', () => {
    const parsed = parseBrief('Build a 20-room hotel in Victoria Falls', { buildingType: 'hotel-fullservice' })
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('hotel-fullservice')
  })

  it('explicit house override + hotel text yields house-residential (override wins when chosen)', () => {
    const parsed = parseBrief('Build a 20-room hotel in Victoria Falls', { buildingType: 'house-residential' })
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('house-residential')
  })

  it('explicit health clinic override yields clinic-health typology', () => {
    const parsed = parseBrief('Build a clinic', { buildingType: 'clinic-health' })
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('clinic-health')
  })

  it('auto + clinic text yields clinic-health typology (detection wins)', () => {
    const parsed = parseBrief('Build a clinic with 4 consultation rooms', { buildingType: 'auto' })
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('clinic-health')
  })

  it('explicit house override + clinic text yields house-residential', () => {
    const parsed = parseBrief('Build a clinic with 4 consultation rooms', { buildingType: 'house-residential' })
    expect(parsed.typology).not.toBeNull()
    expect(parsed.typology?.id).toBe('house-residential')
  })

  it('non-matching text with auto override yields null typology (no false positive)', () => {
    const parsed = parseBrief('Build something', { buildingType: 'auto' })
    // No typology keywords in 'something', so typology should be null
    expect(parsed.typology).toBeNull()
  })
})
