import { describe, it, expect } from 'vitest'
import { getAllTypologies } from '@/engine/typology-kb'
import { classifyOccupancy, OCCUPANCY_CLASSES } from '@/engine/compliance/occupancyMatrix'
import { fireRatingMinForClass, maxTravelDistanceForClass } from '@/engine/compliance/occupancyMatrix'

function kbCode(t: { sans10400Class: string }): string {
  const m = /^([A-Z]\d(?:\/[A-Z]\d)?)/.exec(t.sans10400Class)
  if (!m) throw new Error(`no A-code prefix in: ${t.sans10400Class}`)
  return m[1]
}

const DUAL_OCCUPANCY = new Set(['mixed-use'])

describe('typology KB ↔ SANS 10400-A occupancy matrix agreement', () => {
  it('every typology carries an A-code prefix that is a known matrix class (or a documented dual)', () => {
    const all = getAllTypologies()
    expect(all.length).toBeGreaterThanOrEqual(14)
    for (const t of all) {
      const code = kbCode(t)
      if (DUAL_OCCUPANCY.has(t.id)) {
        expect(code, t.id).toBe('B2/E1')
      } else {
        expect(OCCUPANCY_CLASSES, t.id).toContain(code as never)
      }
    }
  })

  it('classifyOccupancy on each typology id agrees with its KB code (single-occupancy typologies)', () => {
    const all = getAllTypologies()
    for (const t of all) {
      if (DUAL_OCCUPANCY.has(t.id)) continue
      const expected = kbCode(t)
      expect(classifyOccupancy(t.id), `${t.id}: classifier should resolve to ${expected}`).toBe(expected)
    }
  })

  it('mixed-use stays dual (no single class in gemini §3)', () => {
    const mixed = getAllTypologies().find((t) => t.id === 'mixed-use')
    expect(mixed).toBeDefined()
    expect(kbCode(mixed!)).toBe('B2/E1')
    // classifier default is F1 (generic) since neither retail nor dwelling dominates
    expect(classifyOccupancy('mixed-use')).toBe('F1')
  })

  it('fire-rating and travel-distance fields match the matrix for typologies that declare them', () => {
    const all = getAllTypologies()
    const withFire = all.filter((t) => t.fireResistanceMin != null || t.maxTravelDistanceM != null)
    expect(withFire.length).toBeGreaterThanOrEqual(2)
    for (const t of withFire) {
      const code = kbCode(t) as 'B2' | 'A2'
      if (t.fireResistanceMin != null) {
        expect(t.fireResistanceMin, `${t.id} fire rating`).toBe(fireRatingMinForClass(code))
      }
      if (t.maxTravelDistanceM != null) {
        expect(t.maxTravelDistanceM, `${t.id} travel distance`).toBe(maxTravelDistanceForClass(code))
      }
    }
  })

  it('residential typologies resolve to dwelling classes in the matrix', () => {
    const ids = ['house-residential', 'apartment-multi', 'duplex', 'townhouse']
    for (const id of ids) {
      const t = getAllTypologies().find((x) => x.id === id)
      expect(t, id).toBeDefined()
      expect(kbCode(t!).startsWith('B'), id).toBe(true)
      expect(classifyOccupancy(id).startsWith('B'), id).toBe(true)
    }
  })
})
