import { describe, it, expect } from 'vitest'
import { generateLayoutParameters, generateFloorPlans } from '@/engine/tier3/layoutEngine'
import type { PlacedRoom } from '@/engine/tier3/layoutEngine'
import { parseBrief } from '@/engine/parseBrief'
import { generateDesignConcept } from '@/engine/tier2/conceptEngine'

function roomsIntersect(a: PlacedRoom, b: PlacedRoom): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function assertNoOverlaps(rooms: PlacedRoom[], label: string) {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      expect(roomsIntersect(rooms[i], rooms[j]),
        `${label}: "${rooms[i].name}" overlaps "${rooms[j].name}"`
      ).toBe(false)
    }
  }
}

function checkZbcMinimums(rooms: PlacedRoom[], label: string) {
  for (const r of rooms) {
    expect(r.width, `${label}: "${r.name}" width >= 2`).toBeGreaterThanOrEqual(2)
    expect(r.height, `${label}: "${r.name}" height >= 2`).toBeGreaterThanOrEqual(2)
  }
}

function checkFiniteDimensions(rooms: PlacedRoom[], label: string) {
  for (const r of rooms) {
    expect(Number.isFinite(r.x), `${label}: "${r.name}" x finite`).toBe(true)
    expect(Number.isFinite(r.y), `${label}: "${r.name}" y finite`).toBe(true)
    expect(Number.isFinite(r.width), `${label}: "${r.name}" width finite`).toBe(true)
    expect(Number.isFinite(r.height), `${label}: "${r.name}" height finite`).toBe(true)
    expect(r.width, `${label}: "${r.name}" width > 0`).toBeGreaterThan(0)
    expect(r.height, `${label}: "${r.name}" height > 0`).toBeGreaterThan(0)
  }
}

function checkNamesMatchProgram(rooms: PlacedRoom[], label: string, programNames: string[]) {
  for (const pn of programNames) {
    const found = rooms.some(r => r.name.startsWith(pn))
    expect(found, `${label}: program room "${pn}" should appear in plan`).toBe(true)
  }
}

describe('Tier 3 — generateLayoutParameters', () => {
  it('returns LayoutParameters for a house brief', () => {
    const brief = parseBrief('Build a 3-bedroom house in Harare on a 20x25 site', { buildingType: 'house' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    expect(params.topologies).toContain('rectangle')
    expect(params.topologies).toContain('l-shape')
    expect(params.topologies).toContain('split-wing')
    expect(params.siteWidth).toBeGreaterThan(0)
    expect(params.siteDepth).toBeGreaterThan(0)
    expect(params.wallThickness).toBe(0.2)
    expect(params.corridorWidth).toBe(1.5)
  })

  it('includes courtyard topology for hotel typology', () => {
    const brief = parseBrief('Build a hotel in Victoria Falls', { buildingType: 'hotel' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    expect(params.topologies).toContain('courtyard')
  })
})

describe('Tier 3 — generateFloorPlans (house)', () => {
  const getPlans = () => {
    const brief = parseBrief('Build a 3-bedroom house in Harare on a 20x25 site with veranda', { buildingType: 'house' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    return generateFloorPlans(params, brief)
  }

  it('returns exactly 3 floor plans', () => {
    const plans = getPlans()
    expect(plans.length).toBe(3)
  })

  it('all plans have topology and rooms', () => {
    const plans = getPlans()
    for (const p of plans) {
      expect(p.topology).toBeDefined()
      expect(p.rooms.length).toBeGreaterThan(0)
    }
  })

  it('topologies are distinct (rectangle, l-shape, split-wing)', () => {
    const plans = getPlans()
    const topos = plans.map(p => p.topology)
    expect(topos).toContain('rectangle')
    expect(topos).toContain('l-shape')
    expect(topos).toContain('split-wing')
    expect(new Set(topos).size).toBe(3)
  })

  it('room arrangements are different across plans', () => {
    const plans = getPlans()
    const rect = plans.find(p => p.topology === 'rectangle')!
    const lshape = plans.find(p => p.topology === 'l-shape')!
    const split = plans.find(p => p.topology === 'split-wing')!

    const rectKey = rect.rooms.map(r => `${r.name}:${r.x.toFixed(1)}`).join('|')
    const lshapeKey = lshape.rooms.map(r => `${r.name}:${r.x.toFixed(1)}`).join('|')
    const splitKey = split.rooms.map(r => `${r.name}:${r.x.toFixed(1)}`).join('|')

    expect(rectKey).not.toBe(lshapeKey)
    expect(lshapeKey).not.toBe(splitKey)
  })

  it('no overlapping rooms in any plan', () => {
    const plans = getPlans()
    for (const p of plans) {
      assertNoOverlaps(p.rooms, `House ${p.topology}`)
    }
  })

  it('all rooms meet ZBC minimum dimensions', () => {
    const plans = getPlans()
    for (const p of plans) {
      checkZbcMinimums(p.rooms, `House ${p.topology}`)
    }
  })

  it('all rooms have finite positive dimensions', () => {
    const plans = getPlans()
    for (const p of plans) {
      checkFiniteDimensions(p.rooms, `House ${p.topology}`)
    }
  })

  it('program rooms appear in plans', () => {
    const plans = getPlans()
    const programNames = ['Bedroom']
    for (const p of plans) {
      checkNamesMatchProgram(p.rooms, `House ${p.topology}`, programNames)
    }
  })

  it('plan names contain topology keywords not Compact/Standard/Spacious', () => {
    const plans = getPlans()
    for (const p of plans) {
      expect(p.name.toLowerCase()).toContain(p.topology === 'l-shape' ? 'l-shape' : p.topology)
      expect(p.name).not.toMatch(/compact|standard|spacious/i)
    }
  })
})

describe('Tier 3 — generateFloorPlans (clinic)', () => {
  const getPlans = () => {
    const brief = parseBrief('Build a clinic in Harare with 4 consultation rooms', { buildingType: 'clinic' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    return generateFloorPlans(params, brief)
  }

  it('returns exactly 3 floor plans', () => {
    const plans = getPlans()
    expect(plans.length).toBe(3)
  })

  it('no overlapping rooms', () => {
    const plans = getPlans()
    for (const p of plans) {
      assertNoOverlaps(p.rooms, `Clinic ${p.topology}`)
    }
  })

  it('all rooms have finite positive dimensions', () => {
    const plans = getPlans()
    for (const p of plans) {
      checkFiniteDimensions(p.rooms, `Clinic ${p.topology}`)
    }
  })

  it('clinic program rooms appear', () => {
    const plans = getPlans()
    const programNames = ['Consultation Room']
    for (const p of plans) {
      checkNamesMatchProgram(p.rooms, `Clinic ${p.topology}`, programNames)
    }
  })

  it('plan names contain topology keywords not Compact/Standard/Spacious', () => {
    const plans = getPlans()
    for (const p of plans) {
      expect(p.name.toLowerCase()).toContain(p.topology === 'l-shape' ? 'l-shape' : p.topology)
      expect(p.name).not.toMatch(/compact|standard|spacious/i)
    }
  })
})

describe('Tier 3 — generateFloorPlans (hotel with courtyard)', () => {
  const getPlans = () => {
    const brief = parseBrief('Build a 20-room hotel in Victoria Falls on a 40x60 site', { buildingType: 'hotel' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    return generateFloorPlans(params, brief)
  }

  it('returns exactly 4 floor plans including courtyard', () => {
    const plans = getPlans()
    expect(plans.length).toBe(4)
    const topos = plans.map(p => p.topology)
    expect(topos).toContain('courtyard')
  })

  it('no overlapping rooms in any plan', () => {
    const plans = getPlans()
    for (const p of plans) {
      assertNoOverlaps(p.rooms, `Hotel ${p.topology}`)
    }
  })

  it('courtyard option with 20 rooms has no overlaps and all finite dimensions', () => {
    const plans = getPlans()
    const courtyard = plans.find(p => p.topology === 'courtyard')
    expect(courtyard).toBeDefined()
    if (courtyard) {
      assertNoOverlaps(courtyard.rooms, 'Hotel courtyard')
      checkFiniteDimensions(courtyard.rooms, 'Hotel courtyard')
    }
  })

  it('all plans have finite positive dimensions', () => {
    const plans = getPlans()
    for (const p of plans) {
      checkFiniteDimensions(p.rooms, `Hotel ${p.topology}`)
    }
  })

  it('every non-courtyard plan passes ZBC', () => {
    const plans = getPlans()
    for (const p of plans) {
      if (p.topology !== 'courtyard') {
        checkZbcMinimums(p.rooms, `Hotel ${p.topology}`)
      }
    }
  })

  it('fallback rectangle from courtyard degrade has no NaN dimensions', () => {
    const plans = getPlans()
    const degrade = plans.find(p => p.topology === 'courtyard' && p.name.startsWith('Fallback Rectangle'))
    expect(degrade).toBeDefined()
    if (degrade) {
      checkFiniteDimensions(degrade.rooms, 'Hotel courtyard degrade')
      assertNoOverlaps(degrade.rooms, 'Hotel courtyard degrade')
      expect(degrade.rooms.length).toBeGreaterThan(0)
    }
  })

  it('non-courtyard plan names contain topology keywords not Compact/Standard/Spacious', () => {
    const plans = getPlans()
    for (const p of plans) {
      if (p.topology !== 'courtyard') {
        expect(p.name.toLowerCase()).toContain(p.topology === 'l-shape' ? 'l-shape' : p.topology)
        expect(p.name).not.toMatch(/compact|standard|spacious/i)
      }
    }
  })
})

describe('Tier 3 — degrade safety (zero-area program, small site)', () => {
  const getPlans = () => {
    const brief = parseBrief('Build a small shop in a 5x5 site', { buildingType: 'retail' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    return generateFloorPlans(params, brief)
  }

  it('returns 3 plans without throwing', () => {
    const plans = getPlans()
    expect(plans.length).toBeGreaterThanOrEqual(3)
  })

  it('all plans have only finite positive dimensions', () => {
    const plans = getPlans()
    for (const p of plans) {
      checkFiniteDimensions(p.rooms, `Retail ${p.topology}`)
    }
  })

  it('no overlapping rooms', () => {
    const plans = getPlans()
    for (const p of plans) {
      assertNoOverlaps(p.rooms, `Retail ${p.topology}`)
    }
  })

  it('all rooms meet ZBC minimum dimensions', () => {
    const plans = getPlans()
    for (const p of plans) {
      checkZbcMinimums(p.rooms, `Retail ${p.topology}`)
    }
  })
})

describe('Tier 3 — regenerate idempotency (no duplicates)', () => {
  it('calling generateFloorPlans twice returns same count (3 each)', () => {
    const brief = parseBrief('Build a 3-bedroom house in Harare on a 20x25 site', { buildingType: 'house' })
    const concept = generateDesignConcept(brief)
    const params = generateLayoutParameters(concept, brief)
    const first = generateFloorPlans(params, brief)
    const second = generateFloorPlans(params, brief)
    expect(first.length).toBe(3)
    expect(second.length).toBe(3)
    // Distinct call, same params: same topology set
    expect(first.map(p => p.topology).sort()).toEqual(second.map(p => p.topology).sort())
  })
})

describe('Tier 3 — distinct plans per topology', () => {
  const brief = parseBrief('Build a 3-bedroom house in Harare on a 20x25 site', { buildingType: 'house' })
  const concept = generateDesignConcept(brief)
  const params = generateLayoutParameters(concept, brief)
  const plans = generateFloorPlans(params, brief)

  it('each topology produces a different room layout signature', () => {
    const keys = plans.map(p => p.rooms.map(r => `${r.name}@${r.x.toFixed(1)},${r.y.toFixed(1)}`).join('|'))
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        expect(keys[i]).not.toBe(keys[j])
      }
    }
  })

  it('each room in every plan has finite positive coordinates', () => {
    for (const p of plans) {
      for (const r of p.rooms) {
        expect(Number.isFinite(r.x)).toBe(true)
        expect(Number.isFinite(r.y)).toBe(true)
        expect(Number.isFinite(r.width)).toBe(true)
        expect(Number.isFinite(r.height)).toBe(true)
        expect(r.width).toBeGreaterThan(0)
        expect(r.height).toBeGreaterThan(0)
      }
    }
  })
})
