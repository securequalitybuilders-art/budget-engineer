import { describe, it, expect } from 'vitest'
import {
  ROOM_STANDARDS,
  getMinimumDimensions,
  getRoomStandard,
  listSpecStandards,
} from '@/engine/standards/roomStandards'
import { getMinimumDimensions as planGetMinimumDimensions } from '@/lib/geometry/plan-intelligence'
import { classifyRoom, dimForRoom } from '@/engine/tier3/roomClassifier'
import { getTypology, getAllTypologies } from '@/engine/typology-kb'

describe('Room Standards — Zimbabwe §5 table (authority)', () => {
  const rows: Array<{
    name: string
    minAreaM2?: number
    minWidth: number
    minDepth: number
    minCeilingHeight: number
    naturalLightM2?: number
    ventilation?: boolean
  }> = [
    { name: 'Master Bedroom', minAreaM2: 14, minWidth: 3.5, minDepth: 4.0, minCeilingHeight: 2.4, naturalLightM2: 1.4, ventilation: true },
    { name: 'Bedroom', minAreaM2: 7.5, minWidth: 2.7, minDepth: 3.0, minCeilingHeight: 2.4, naturalLightM2: 0.75, ventilation: true },
    { name: 'Kitchen', minAreaM2: 5, minWidth: 2.1, minDepth: 2.4, minCeilingHeight: 2.4, naturalLightM2: 0.5, ventilation: true },
    { name: 'Bathroom', minAreaM2: 2.8, minWidth: 1.5, minDepth: 1.8, minCeilingHeight: 2.1, ventilation: true },
    { name: 'Living Room', minAreaM2: 10, minWidth: 3.0, minDepth: 3.5, minCeilingHeight: 2.4, naturalLightM2: 1.0, ventilation: true },
    { name: 'Dining Room', minAreaM2: 8, minWidth: 2.7, minDepth: 3.0, minCeilingHeight: 2.4, naturalLightM2: 0.8, ventilation: true },
    { name: 'Toilet', minAreaM2: 1.0, minWidth: 0.8, minDepth: 1.2, minCeilingHeight: 2.1, ventilation: true },
    { name: 'Corridor', minWidth: 0.9, minDepth: 2.0, minCeilingHeight: 2.1 },
    { name: 'Staircase', minAreaM2: 2.2, minWidth: 0.9, minDepth: 2.4, minCeilingHeight: 2.1 },
    { name: 'Classroom', minAreaM2: 42, minWidth: 6.0, minDepth: 7.0, minCeilingHeight: 2.7, naturalLightM2: 4.2, ventilation: true },
    { name: 'Consultation Room', minAreaM2: 10, minWidth: 3.0, minDepth: 3.5, minCeilingHeight: 2.4, naturalLightM2: 1.0, ventilation: true },
    { name: 'Guest Room', minAreaM2: 16, minWidth: 3.5, minDepth: 4.5, minCeilingHeight: 2.4, naturalLightM2: 1.6, ventilation: true },
    { name: 'Office', minAreaM2: 8, minWidth: 2.5, minDepth: 3.0, minCeilingHeight: 2.4, naturalLightM2: 0.8, ventilation: true },
  ]

  it('encodes all 13 §5 rooms with full spec values', () => {
    for (const row of rows) {
      const std = getRoomStandard(row.name)
      expect(std.name).toBe(row.name)
      expect(std.minWidth).toBe(row.minWidth)
      expect(std.minDepth).toBe(row.minDepth)
      expect(std.minCeilingHeight).toBe(row.minCeilingHeight)
      expect(std.ventilation).toBe(row.ventilation ?? false)
      if (row.naturalLightM2 !== undefined) expect(std.naturalLightM2).toBe(row.naturalLightM2)
      if (row.minAreaM2 !== undefined) expect(std.minAreaM2).toBe(row.minAreaM2)
    }
  })

  it('listSpecStandards returns exactly the §5 rows', () => {
    const specs = listSpecStandards()
    expect(specs).toHaveLength(13)
    for (const name of rows.map((r) => r.name)) {
      expect(specs.some((s) => s.name === name)).toBe(true)
    }
  })

  it('natural-light rooms carry a glazing minimum; non-lit rooms do not', () => {
    expect(getRoomStandard('Master Bedroom').naturalLightM2).toBe(1.4)
    expect(getRoomStandard('Bathroom').naturalLightM2).toBeUndefined()
    expect(getRoomStandard('Toilet').naturalLightM2).toBeUndefined()
  })
})

describe('Room Standards — getMinimumDimensions resolution', () => {
  it('resolves numbered variants via exact-name stripping', () => {
    expect(getMinimumDimensions('Bedroom 4')).toEqual({ minWidth: 2.7, minDepth: 3.0 })
    expect(getMinimumDimensions('Bathroom 3')).toEqual({ minWidth: 1.5, minDepth: 1.8 })
    expect(getMinimumDimensions('Office 2')).toEqual({ minWidth: 2.5, minDepth: 3.0 })
  })

  it('never lets a generic prefix shadow a specialised name', () => {
    expect(getMinimumDimensions('Toilet (Public)')).toEqual({ minWidth: 2.0, minDepth: 2.5 })
    expect(getMinimumDimensions('Toilet Block')).toEqual({ minWidth: 3.0, minDepth: 4.0 })
    expect(getMinimumDimensions('Customer Toilet')).toEqual({ minWidth: 1.8, minDepth: 2.2 })
    expect(getMinimumDimensions('Staircase / Lift Core')).toEqual({ minWidth: 3.0, minDepth: 5.0 })
    expect(getMinimumDimensions('Stair Hall')).toEqual({ minWidth: 1.8, minDepth: 2.5 })
  })

  it('resolves keywords and aliases', () => {
    expect(getMinimumDimensions('Open Plan Office')).toEqual({ minWidth: 6.0, minDepth: 8.0 })
    expect(getMinimumDimensions('Commercial Kitchen')).toEqual({ minWidth: 4.0, minDepth: 5.0 })
    expect(getMinimumDimensions('Fuel Bay')).toEqual({ minWidth: 6.0, minDepth: 10.0 })
    expect(getMinimumDimensions('Stairwell')).toEqual({ minWidth: 0.9, minDepth: 2.4 })
    expect(getMinimumDimensions('Lobby')).toEqual({ minWidth: 4.0, minDepth: 4.5 })
    expect(getMinimumDimensions('Waiting')).toEqual({ minWidth: 4.0, minDepth: 4.5 })
    expect(getMinimumDimensions('Service Corridor')).toEqual({ minWidth: 0.9, minDepth: 2.0 })
    expect(getMinimumDimensions('Living')).toEqual({ minWidth: 3.0, minDepth: 3.5 })
  })

  it('falls back to a 2.0×2.0 default for unknown rooms', () => {
    expect(getMinimumDimensions('Spatial Pod')).toEqual({ minWidth: 2.0, minDepth: 2.0 })
  })
})

describe('Room Standards — consolidation', () => {
  it('plan-intelligence delegates to the single authority', () => {
    for (const name of ['Master Bedroom', 'Bedroom', 'Bathroom', 'Kitchen', 'Living Room', 'Office', 'Toilet', 'Corridor', 'Staircase']) {
      expect(planGetMinimumDimensions(name)).toEqual(getMinimumDimensions(name))
    }
    expect(planGetMinimumDimensions('Bedroom 2')).toEqual({ minWidth: 2.7, minDepth: 3.0 })
  })

  it('tier3 roomClassifier derives zones and dims from the authority', () => {
    expect(classifyRoom('Master Bedroom')).toEqual({ zone: 'private', isWetCore: false, minWidth: 3.5, minDepth: 4.0 })
    expect(classifyRoom('Kitchen')).toEqual({ zone: 'service', isWetCore: true, minWidth: 2.1, minDepth: 2.4 })
    expect(classifyRoom('Bathroom')).toEqual({ zone: 'service', isWetCore: true, minWidth: 1.5, minDepth: 1.8 })
    expect(classifyRoom('Corridor')).toEqual({ zone: 'circulation', isWetCore: false, minWidth: 0.9, minDepth: 2.0 })
    expect(classifyRoom('Toilet')).toEqual({ zone: 'service', isWetCore: true, minWidth: 0.8, minDepth: 1.2 })
  })

  it('dimForRoom prefers explicit map then falls back to the authority', () => {
    const map = { 'Living Room': { minWidth: 4, minDepth: 5 } }
    expect(dimForRoom('Living Room', map)).toEqual({ minWidth: 4, minDepth: 5 })
    expect(dimForRoom('Kitchen', map)).toEqual({ minWidth: 2.1, minDepth: 2.4 })
    expect(dimForRoom('Bedroom 1', map)).toEqual({ minWidth: 2.7, minDepth: 3.0 })
  })

  it('typology layer enforces the registry floor (never undercuts)', () => {
    const duplex = getTypology('duplex')
    expect(duplex).toBeDefined()
    expect(duplex!.minRoomDimensions['Master Bedroom']).toEqual({ minWidth: 3.5, minDepth: 4.0 })
    expect(duplex!.minRoomDimensions['Bedroom']).toEqual({ minWidth: 3.0, minDepth: 3.2 })
    const house = getTypology('house-residential')
    expect(house!.minRoomDimensions['Bedroom']).toEqual({ minWidth: 3.0, minDepth: 3.5 })
    expect(house!.minRoomDimensions['Bathroom']).toEqual({ minWidth: 1.8, minDepth: 2.2 })
    const hotel = getTypology('hotel-fullservice')
    expect(hotel!.minRoomDimensions['Guest Room']).toEqual({ minWidth: 3.5, minDepth: 5.5 })
  })

  it('all typologies resolve floor values for their listed rooms without NaN', () => {
    for (const t of getAllTypologies()) {
      for (const [name, dim] of Object.entries(t.minRoomDimensions ?? {})) {
        expect(Number.isFinite(dim.minWidth)).toBe(true)
        expect(Number.isFinite(dim.minDepth)).toBe(true)
        expect(dim.minWidth).toBeGreaterThan(0)
        expect(dim.minDepth).toBeGreaterThan(0)
        const base = getMinimumDimensions(name)
        expect(dim.minWidth).toBeGreaterThanOrEqual(base.minWidth)
        expect(dim.minDepth).toBeGreaterThanOrEqual(base.minDepth)
      }
    }
  })

  it('every registry key resolves to an existing canonical entry (no orphans)', () => {
    for (const name of Object.keys(ROOM_STANDARDS)) {
      const std = getRoomStandard(name)
      expect(ROOM_STANDARDS[std.name]).toBeDefined()
      expect(std.minWidth).toBeGreaterThan(0)
      expect(std.minDepth).toBeGreaterThan(0)
    }
  })
})
