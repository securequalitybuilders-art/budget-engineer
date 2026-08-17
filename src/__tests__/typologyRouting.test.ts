import { describe, it, expect } from 'vitest'
import { getStrategy, generateLayoutByTypology } from '../lib/layout/typology-router'

const KB_TYPOLOGY_ROUTES: [string, string][] = [
  ['house-residential', 'house'],
  ['apartment-multi', 'apartment'],
  ['townhouse', 'townhouse'],
  ['clinic-health', 'clinic'],
  ['school-classroom', 'school'],
  ['hotel-fullservice', 'hotel'],
  ['office-commercial', 'office'],
  ['retail-shop', 'retail'],
  ['restaurant', 'restaurant'],
  ['church-worship', 'worship'],
  ['warehouse-industrial', 'warehouse'],
  ['community-hall', 'hall'],
  ['market', 'market'],
  ['petrol-station', 'petrol'],
  ['mixed-use', 'mixed-use'],
  ['duplex', 'duplex'],
]

describe('getStrategy', () => {
  it('routes every typology-kb id to its expected strategy', () => {
    for (const [id, expected] of KB_TYPOLOGY_ROUTES) {
      expect(getStrategy(id).id).toBe(expected)
    }
  })

  it('never silently falls back to house for a non-house KB id', () => {
    for (const [id] of KB_TYPOLOGY_ROUTES) {
      if (id === 'house-residential') continue
      expect(getStrategy(id).id).not.toBe('house')
    }
  })

  it('does not swallow townhouse with the house substring', () => {
    expect(getStrategy('townhouse').id).toBe('townhouse')
  })

  it('does not swallow warehouse-industrial with the house substring', () => {
    expect(getStrategy('warehouse-industrial').id).toBe('warehouse')
  })

  it('normalises case and whitespace for the new keys', () => {
    expect(getStrategy('Hotel-FullService').id).toBe('hotel')
    expect(getStrategy(' Community Hall ').id).toBe('hall')
    expect(getStrategy('RETAIL-SHOP').id).toBe('retail')
  })

  it('prefers the exact token over a shared substring (commercial vs retail)', () => {
    expect(getStrategy('commercial').id).toBe('commercial')
    expect(getStrategy('retail-shop').id).toBe('retail')
  })

  it('still falls back to house for unknown types', () => {
    expect(getStrategy('unknown').id).toBe('house')
    expect(getStrategy('').id).toBe('house')
  })

  it('routes an empty/undefined building type to house', () => {
    expect(getStrategy(undefined as unknown as string).id).toBe('house')
  })
})

describe('new strategy generators', () => {
  const cases: { id: string; program: { name: string; ratio: number }[] }[] = [
    { id: 'hotel', program: [{ name: 'Guest Room', ratio: 1 }, { name: 'Corridor', ratio: 0.15 }, { name: 'Toilet', ratio: 0.05 }] },
    { id: 'retail', program: [{ name: 'Sales Floor', ratio: 1 }, { name: 'Store', ratio: 0.3 }] },
    { id: 'restaurant', program: [{ name: 'Dining', ratio: 1 }, { name: 'Kitchen', ratio: 0.4 }] },
    { id: 'hall', program: [{ name: 'Main Hall', ratio: 1 }, { name: 'Store', ratio: 0.2 }] },
    { id: 'market', program: [{ name: 'Sales Floor', ratio: 1 }, { name: 'Store', ratio: 0.3 }] },
    { id: 'petrol', program: [{ name: 'Shop', ratio: 1 }, { name: 'Store', ratio: 0.3 }] },
  ]

  it.each(cases)('$id packs its program into rooms via generateLayoutByTypology', ({ id, program }) => {
    const result = generateLayoutByTypology(id, program, 18, 14, 7)
    expect(result.rooms.length).toBeGreaterThan(0)
  })

  it('townhouse and warehouse now generate from their own templates', () => {
    const townhouse = generateLayoutByTypology('townhouse', [{ name: 'Living Room', ratio: 1 }, { name: 'Kitchen', ratio: 0.4 }], 16, 10, 3)
    expect(townhouse.rooms.length).toBeGreaterThan(0)
    const warehouse = generateLayoutByTypology('warehouse-industrial', [{ name: 'Warehouse', ratio: 1 }, { name: 'Office', ratio: 0.2 }], 24, 14, 5)
    expect(warehouse.rooms.length).toBeGreaterThan(0)
  })
})

describe('bubble diagram emission', () => {
  const PROGRAM = [{ name: 'Living Room', ratio: 1 }, { name: 'Kitchen', ratio: 0.4 }, { name: 'Bedroom', ratio: 0.6 }]

  it('stamps a bubbleDiagram on every typology-kb layout', () => {
    for (const [id] of KB_TYPOLOGY_ROUTES) {
      const result = generateLayoutByTypology(id, PROGRAM, 18, 14, 7)
      expect(result.rooms.length).toBeGreaterThan(0)
      expect(result.bubbleDiagram).toBeDefined()
      expect(result.bubbleDiagram!.nodes.length).toBe(result.rooms.length)
      expect(result.bubbleDiagram!.nodes[0].areaM2).toBeGreaterThan(0)
      expect(result.bubbleDiagram!.programSummary!.roomCount).toBe(result.rooms.length)
    }
  })

  it('keeps the rich strategy stamp for office layouts (rules-based edges, no generic fallback)', () => {
    const result = generateLayoutByTypology('office-commercial', [{ name: 'Open Plan', ratio: 1 }, { name: 'Reception', ratio: 0.15 }, { name: 'Corridor', ratio: 0.2 }], 24, 24, 0)
    expect(result.bubbleDiagram).toBeDefined()
    expect(result.bubbleDiagram!.typologyId).toBe('office-commercial')
    expect(result.bubbleDiagram!.edges.length).toBeGreaterThan(0)
  })
})
