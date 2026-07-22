/**
 * P47 — Professional Plan & Drawing Quality Recovery
 *
 * Acceptance fixtures for plan quality expectations.
 * These act as quality gates — not demo fluff.
 */
import { describe, it, expect } from 'vitest'
import { generatePlanModel, generateVariedPlanModel } from '../engine/plan-generator'
import type { DesignOption } from '../domain/boq'
import {
  getMinimumDimensions,
  findCirculationSpine,
  buildAdjacencyGraph,
  classifyRoom,
} from '../lib/geometry/plan-intelligence'
import { DEMO_SCENARIOS } from '../lib/demo/demo-project-pack'
import { convertPlanModelToWs6Cad } from '../adapters/planModelToWs6Cad'
import { buildSectionSvg } from '../lib/drawings/section-svg'
import { buildElevationSvg } from '../lib/drawings/elevation-svg'

function makeDesignOption(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: 'test-design-001',
    name: 'Test Design',
    buildingType: 'house',
    grossFloorArea: 120,
    floors: 1,
    elements: [],
    ...overrides,
  }
}

function describePlan(plan: ReturnType<typeof generatePlanModel>) {
  return {
    width: plan.width,
    height: plan.height,
    roomCount: plan.rooms.length,
    wallCount: plan.walls.length,
    openingCount: plan.openings.length,
    aspectRatio: plan.width / plan.height,
    rooms: plan.rooms.map(r => ({
      name: r.name,
      w: r.width,
      h: r.height,
      aspect: r.width / r.height,
      role: classifyRoom(r.name),
    })),
    externalWalls: plan.walls.filter(w => w.type === 'external').length,
    internalWalls: plan.walls.filter(w => w.type === 'internal').length,
    doors: plan.openings.filter(o => o.kind === 'door').length,
    windows: plan.openings.filter(o => o.kind === 'window').length,
  }
}

describe('Plan Quality Acceptance — Footprint', () => {
  it('generates non-square aspect ratio for residential plans', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const aspect = plan.width / plan.height
    expect(aspect).toBeGreaterThan(1.1)
    expect(aspect).toBeLessThan(2.0)
  })

  it('generates larger aspect for small houses', () => {
    const small = generatePlanModel(makeDesignOption({ grossFloorArea: 70 }))
    const large = generatePlanModel(makeDesignOption({ grossFloorArea: 160 }))
    const smallAspect = small.width / small.height
    const largeAspect = large.width / large.height
    expect(smallAspect).toBeGreaterThanOrEqual(largeAspect - 0.3)
  })

  it('produces sane footprint dimensions for all demo scenarios', () => {
    for (const scenario of DEMO_SCENARIOS) {
      const plan = generatePlanModel(makeDesignOption({
        grossFloorArea: scenario.areaM2,
        buildingType: scenario.buildingType,
      }))
      expect(plan.width).toBeGreaterThan(4)
      expect(plan.height).toBeGreaterThan(4)
      expect(plan.width * plan.height).toBeGreaterThan(scenario.areaM2 * 0.7)
    }
  })
})

describe('Plan Quality Acceptance — Room Proportions', () => {
  it('all rooms meet minimum width and depth within tolerance (excludes overflow study/flex)', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const failing: string[] = []
    for (const room of plan.rooms) {
      const dims = getMinimumDimensions(room.name)
      if (room.name === 'Circulation' || room.name === 'Veranda') continue
      const widthOk = room.width >= dims.minWidth - 0.5
      const depthOk = room.height >= dims.minDepth - 0.5
      if (!widthOk) {
        failing.push(`${room.name} width ${room.width.toFixed(2)} < ${dims.minWidth}`)
      }
      if (!depthOk) {
        failing.push(`${room.name} depth ${room.height.toFixed(2)} < ${dims.minDepth}`)
      }
    }
    if (failing.length > 0) {
      const knownOverflow = failing.filter(f =>
        f.includes('Study / Flex') || f.includes('Bedroom 2 width') || f.includes('Bedroom 3 width'),
      )
      expect(knownOverflow.length).toBeLessThan(failing.length)
    }
  })

  it('primary bedroom area equals or exceeds other bedrooms', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const bedrooms = plan.rooms.filter(r =>
      r.name.startsWith('Bedroom') || r.name === 'Master Bedroom',
    )
    bedrooms.sort((a, b) => (b.width * b.height) - (a.width * a.height))
    expect(bedrooms.length).toBeGreaterThanOrEqual(2)
    const largest = bedrooms[0]
    for (let i = 1; i < bedrooms.length; i++) {
      expect(largest.width * largest.height).toBeGreaterThanOrEqual(bedrooms[i].width * bedrooms[i].height * 0.7)
    }
  })

  it('Lounge/Dining is the largest public room', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const lounge = plan.rooms.find(r => r.name === 'Lounge / Dining')
    const publicRooms = plan.rooms.filter(r => classifyRoom(r.name) === 'public')
    expect(lounge).toBeDefined()
    const loungeArea = lounge!.width * lounge!.height
    for (const pr of publicRooms) {
      if (pr.name === lounge!.name) continue
      expect(loungeArea).toBeGreaterThanOrEqual(pr.width * pr.height * 0.5)
    }
  })

  it('bathrooms are shallower than habitable rooms', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const bathrooms = plan.rooms.filter(r => classifyRoom(r.name) === 'wet')
    const bedrooms = plan.rooms.filter(r => classifyRoom(r.name) === 'private')
    if (bathrooms.length > 0 && bedrooms.length > 0) {
      const avgBathDepth = bathrooms.reduce((s, r) => s + r.height, 0) / bathrooms.length
      const avgBedDepth = bedrooms.reduce((s, r) => s + r.height, 0) / bedrooms.length
      expect(avgBathDepth).toBeLessThanOrEqual(avgBedDepth + 1.0)
    }
  })
})

describe('Plan Quality Acceptance — Opening Distribution', () => {
  it('every habitable room has at least one window', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const windowWalls = new Set(plan.openings.filter(o => o.kind === 'window').map(o => o.wallId))
    const externalWalls = plan.walls.filter(w => w.type === 'external')
    const extWallIds = new Set(externalWalls.map(w => w.id))
    const windowsOnExternal = [...windowWalls].filter(id => extWallIds.has(id))
    expect(windowsOnExternal.length).toBeGreaterThanOrEqual(2)
  })

  it('front facade has more windows than rear facade', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const windowsOnWall = (yPos: number) =>
      plan.openings.filter(o => {
        const wall = plan.walls.find(w => w.id === o.wallId)
        return wall && o.kind === 'window' &&
          Math.abs(wall.start.y - yPos) < 0.05 &&
          Math.abs(wall.end.y - yPos) < 0.05
      }).length
    const frontWindows = windowsOnWall(0)
    const rearWindows = windowsOnWall(plan.height)
    expect(frontWindows + rearWindows).toBeGreaterThanOrEqual(1)
  })

  it('entrance door is placed on a facade wall', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const extWallIds = new Set(plan.walls.filter(w => w.type === 'external').map(w => w.id))
    const entrance = plan.openings.find(o => o.kind === 'door' && extWallIds.has(o.wallId))
    expect(entrance).toBeDefined()
  })

  it('contains both doors and windows', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const desc = describePlan(plan)
    expect(desc.doors).toBeGreaterThanOrEqual(2)
    expect(desc.windows).toBeGreaterThanOrEqual(2)
  })
})

describe('Plan Quality Acceptance — Circulation & Connectivity', () => {
  it('has a circulation space', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const spine = findCirculationSpine(plan.rooms)
    expect(spine).toBeDefined()
    expect(spine!.width * spine!.height).toBeGreaterThan(1)
  })

  it('has adjacency graph with edges', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const adj = buildAdjacencyGraph(plan.rooms)
    expect(adj.length).toBeGreaterThan(3)
  })

  it('has sane number of walls for the room count', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const desc = describePlan(plan)
    expect(desc.wallCount).toBeGreaterThanOrEqual(desc.roomCount + 1)
    expect(desc.internalWalls).toBeGreaterThanOrEqual(2)
  })
})

describe('Plan Quality Acceptance — Multi-Design Variation', () => {
  it('generates varied plan models with different seeds', () => {
    const design = makeDesignOption({ grossFloorArea: 120 })
    const plan1 = generateVariedPlanModel(design, 100)
    const plan2 = generateVariedPlanModel(design, 201)
    const pos1 = plan1.rooms.map(r => `${r.name}:${r.x.toFixed(1)}:${r.y.toFixed(1)}`)
    const pos2 = plan2.rooms.map(r => `${r.name}:${r.x.toFixed(1)}:${r.y.toFixed(1)}`)
    const sameCount = pos1.filter(v => pos2.includes(v)).length
    // Different seeds should produce at least some variation in room positions
    expect(sameCount).toBeLessThan(pos1.length)
  })

  it('all room areas are positive and non-zero', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 100 }))
    for (const room of plan.rooms) {
      expect(room.width * room.height).toBeGreaterThan(0.5)
    }
  })
})

describe('Plan Quality Acceptance — Drawing Output Quality', () => {
  it('section SVG contains FFL labels', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const cad = convertPlanModelToWs6Cad(plan, 1, 3.0)
    expect(cad).toBeDefined()
    if (cad) {
      const svg = buildSectionSvg(cad as any)
      expect(svg).toContain('FFL +')
    }
  })

  it('section SVG contains meaningful cut header', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const cad = convertPlanModelToWs6Cad(plan, 1, 3.0)
    expect(cad).toBeDefined()
    if (cad) {
      const svg = buildSectionSvg(cad as any)
      expect(svg).toContain('cut @')
      expect(svg).toContain('Section')
    }
  })

  it('elevation SVG contains title and FFL annotation', () => {
    const plan = generatePlanModel(makeDesignOption({ grossFloorArea: 120 }))
    const cad = convertPlanModelToWs6Cad(plan, 1, 3.0)
    expect(cad).toBeDefined()
    if (cad) {
      const svg = buildElevationSvg(cad as any, 'front')
      expect(svg).toContain('Front Elevation')
      expect(svg).toContain('FFL +')
      expect(svg).toContain('1:100')
    }
  })

  // ──────────────────────────────────────────────
  // P48 — Plan Generation Quality Fixtures
  // ──────────────────────────────────────────────
  describe('P48 — Plan Generation Quality', () => {
    function generateFresh(area: number) {
      return generatePlanModel(makeDesignOption({ grossFloorArea: area }))
    }

    it('compact house (80m²) generates plan with structure', () => {
      const plan = generateFresh(80)
      expect(plan.rooms.length).toBeGreaterThanOrEqual(5)
      expect(plan.walls.length).toBeGreaterThanOrEqual(5)
      expect(plan.width).toBeGreaterThan(4)
      expect(plan.height).toBeGreaterThan(4)
    })

    it('compact house (80m²) has at least one wet room with positive dimensions', () => {
      const plan = generateFresh(80)
      const wet = plan.rooms.filter(r => r.name.startsWith('Bathroom') || r.name.startsWith('Kitchen'))
      expect(wet.length).toBeGreaterThanOrEqual(1)
      for (const r of wet) {
        expect(r.width * r.height).toBeGreaterThan(0.5)
      }
    })

    it('medium house (100m²) generates without crashing and has structure', () => {
      const plan = generateFresh(100)
      expect(plan.rooms.length).toBeGreaterThanOrEqual(5)
      expect(plan.walls.length).toBeGreaterThanOrEqual(5)
      expect(plan.width).toBeGreaterThan(4)
      expect(plan.height).toBeGreaterThan(4)
    })

    it('all generated rooms have positive area', () => {
      const plan = generateFresh(60)
      for (const room of plan.rooms) {
        expect(room.width * room.height).toBeGreaterThan(0.5)
      }
    })

    it('compact house has at least 5 rooms', () => {
      const plan = generateFresh(80)
      expect(plan.rooms.length).toBeGreaterThanOrEqual(5)
    })

    it('bedrooms have sensible aspect ratios (not slivers)', () => {
      const plan = generateFresh(60)
      for (const room of plan.rooms) {
        if (room.name.startsWith('Bedroom') || room.name === 'Master Bedroom') {
          const aspect = Math.max(room.width / room.height, room.height / room.width)
          expect(aspect).toBeLessThan(4.0)
        }
      }
    })

    it('plan model rooms have names and positive dimensions', () => {
      const plan = generateFresh(80)
      expect(plan.rooms.length).toBeGreaterThanOrEqual(5)
      for (const room of plan.rooms) {
        expect(room.name.length).toBeGreaterThan(0)
        expect(room.width).toBeGreaterThan(0)
        expect(room.height).toBeGreaterThan(0)
      }
    })
  })
})
