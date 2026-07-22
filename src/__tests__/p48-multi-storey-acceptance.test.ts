import { describe, it, expect, vi } from 'vitest'
import { generatePlanModel } from '../engine/plan-generator'
import { getMinimumDimensions } from '../lib/geometry/plan-intelligence'

function makeOption(area: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors: 2, elements: [] }
}

interface SeedResult {
  area: number
  seed: number
  groundRooms: number
  upperRooms: number
  overlaps: number
  dimIssues: string[]
  aspectIssues: string[]
  fallback: boolean
  rejected: boolean
  hasCoreGround: boolean
  hasCoreUpper: boolean
  upperMinRooms: boolean
  valid: boolean
}

function analyze(area: number, seed: number): SeedResult {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(seed)

  const plan = generatePlanModel(makeOption(area))

  warnSpy.mockRestore(); errorSpy.mockRestore(); dateSpy.mockRestore()

  const fallback = warnSpy.mock.calls.some(c => c[0]?.includes?.('(fallback)'))
  const rejected = errorSpy.mock.calls.some(c => c[0]?.includes?.('PLAN REJECTED'))

  // Detect floor boundary from room Y coordinates using the known offset pattern
  const footprintHeight = plan.height / 2 // planHeight = footprint.height * floors * 1.1
  const floorBoundary = footprintHeight / 2 // midpoint of floor 0 and floor 1

  const groundRooms = plan.rooms.filter(r => r.y < floorBoundary)
  const upperRooms = plan.rooms.filter(r => r.y >= floorBoundary)

  let overlaps = 0
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j]
      if (a.name === 'Circulation' || b.name === 'Circulation') continue
      if (a.name.startsWith('[') || b.name.startsWith('[')) continue
      // Skip comparisons across floors (different Y bands)
      const aFloor = Math.floor(a.y / (plan.height / 2))
      const bFloor = Math.floor(b.y / (plan.height / 2))
      if (aFloor !== bFloor) continue
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlaps++
    }
  }

  const dimIssues: string[] = []
  for (const r of plan.rooms) {
    if (r.name.startsWith('[')) continue // skip constraint markers
    const d = getMinimumDimensions(r.name)
    if (r.width < d.minWidth - 0.01) dimIssues.push(`${r.name} w=${r.width.toFixed(2)}<${d.minWidth}`)
    else if (r.height < d.minDepth - 0.01) dimIssues.push(`${r.name} d=${r.height.toFixed(2)}<${d.minDepth}`)
  }

  const aspectIssues: string[] = []
  for (const r of plan.rooms) {
    if ((r.name.startsWith('Bedroom') || r.name === 'Master Bedroom' || r.name === 'Family Lounge' || r.name === 'Lounge / Dining' || r.name === 'Living / Kitchen / Dining') && !r.name.startsWith('[')) {
      const asp = Math.max(r.width / r.height, r.height / r.width)
      if (asp > 3.5) aspectIssues.push(r.name)
    }
  }

  // Core/shaft continuity: constraint markers on both floors
  // Check constraint markers exist on each floor
  const hasCoreGround = plan.rooms.some(r => r.name.startsWith('[') && r.y < floorBoundary)
  const hasCoreUpper = plan.rooms.some(r => r.name.startsWith('[') && r.y >= floorBoundary)

  // Upper floor meaningfully populated: at least 5 rooms (the required ones from upperPrivateRooms)
  const upperMinRooms = upperRooms.length >= 5

  return {
    area, seed,
    groundRooms: groundRooms.length,
    upperRooms: upperRooms.length,
    overlaps, dimIssues, aspectIssues,
    fallback, rejected,
    hasCoreGround, hasCoreUpper,
    upperMinRooms,
    valid: overlaps === 0 && dimIssues.length === 0 && aspectIssues.length === 0 && !rejected && hasCoreGround && hasCoreUpper && upperMinRooms,
  }
}

describe('P48.5 — Multi-Storey Core/Shaft Constraint Recovery', () => {
  const SEEDS = [42, 97, 133, 256, 511, 777, 1024, 2048, 4096, 8192]
  const AREAS = [140, 160]

  // Run all analyses eagerly
  const allResults: SeedResult[] = []
  for (const area of AREAS)
    for (const seed of SEEDS)
      allResults.push(analyze(area, seed))

  for (const area of AREAS) {
    const areaResults = allResults.filter(r => r.area === area)
    const passed = areaResults.filter(r => r.valid).length
    const total = areaResults.length

    describe(`${area}m² 2-storey acceptance`, () => {
      it(`passes ≥90% of seeds (${passed}/${total})`, () => {
        expect(passed / total).toBeGreaterThanOrEqual(0.9)
      })

      it('never has interior overlaps', () => {
        for (const r of areaResults) expect(r.overlaps).toBe(0)
      })

      it('never has dimension issues', () => {
        for (const r of areaResults) expect(r.dimIssues.length).toBe(0)
      })

      it('never has aspect ratio issues', () => {
        for (const r of areaResults) expect(r.aspectIssues.length).toBe(0)
      })

      it('never triggers fallback', () => {
        for (const r of areaResults) expect(r.fallback).toBe(false)
      })

      it('never triggers rejection', () => {
        for (const r of areaResults) expect(r.rejected).toBe(false)
      })

      it('has core/shaft markers on every floor', () => {
        for (const r of areaResults) {
          expect(r.hasCoreGround).toBe(true)
          expect(r.hasCoreUpper).toBe(true)
        }
      })

      it('upper floor is meaningfully populated (≥5 rooms)', () => {
        for (const r of areaResults) {
          expect(r.upperRooms).toBeGreaterThanOrEqual(5)
        }
      })

      it('reports detail', () => {
        console.log(`\n${area}m² 2-storey: ${passed}/${total} valid`)
        for (const r of areaResults) {
          const flags: string[] = []
          if (r.overlaps > 0) flags.push(`overlaps=${r.overlaps}`)
          if (r.dimIssues.length > 0) flags.push(`${r.dimIssues.length} dim (${r.dimIssues[0]})`)
          if (r.aspectIssues.length > 0) flags.push(`${r.aspectIssues.length} aspect`)
          if (r.fallback) flags.push('fallback')
          if (r.rejected) flags.push('REJECTED')
          if (!r.hasCoreGround) flags.push('no-ground-core')
          if (!r.hasCoreUpper) flags.push('no-upper-core')
          if (!r.upperMinRooms) flags.push(`upper-rooms=${r.upperRooms}`)
          console.log(`  seed=${r.seed} ground=${r.groundRooms} upper=${r.upperRooms} ${flags.length > 0 ? flags.join(' ') : '✓'}`)
        }
      })
    })
  }
})
