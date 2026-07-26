import { describe, it, expect, vi } from 'vitest'
import { generatePlanModel } from '../engine/plan-generator'
import { getMinimumDimensions } from '../lib/geometry/plan-intelligence'

function makeOption(area: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors: 1, elements: [] }
}

interface SeedResult {
  area: number; seed: number; rooms: number; overlaps: number
  dimIssues: string[]; aspectIssues: string[]
  fallback: boolean; rejected: boolean; valid: boolean
}

function analyze(area: number, seed: number): SeedResult {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(seed)
  const plan = generatePlanModel(makeOption(area))
  warnSpy.mockRestore(); errorSpy.mockRestore(); dateSpy.mockRestore()
  const fallback = warnSpy.mock.calls.some(c => c[0]?.includes?.('(fallback)'))
  const rejected = errorSpy.mock.calls.some(c => c[0]?.includes?.('PLAN REJECTED'))
  let overlaps = 0
  for (let i = 0; i < plan.rooms.length; i++)
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j]
      if (a.name === 'Circulation' || b.name === 'Circulation') continue
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlaps++
    }
  const dimIssues: string[] = []
  for (const r of plan.rooms) {
    const d = getMinimumDimensions(r.name)
    if (r.width < d.minWidth - 0.01) dimIssues.push(`${r.name} w=${r.width.toFixed(2)}<${d.minWidth}`)
    else if (r.height < d.minDepth - 0.01) dimIssues.push(`${r.name} d=${r.height.toFixed(2)}<${d.minDepth}`)
  }
  const aspectIssues: string[] = []
  for (const r of plan.rooms) {
    if (r.name.startsWith('Bedroom') || r.name === 'Master Bedroom') {
      const asp = Math.max(r.width / r.height, r.height / r.width)
      if (asp > 3.5) aspectIssues.push(r.name)
    }
  }
  return { area, seed, rooms: plan.rooms.length, overlaps, dimIssues, aspectIssues, fallback, rejected, valid: overlaps === 0 && dimIssues.length === 0 && aspectIssues.length === 0 && !rejected }
}

describe('P48.4 — L_PLAN Shoulder Stabilization', () => {
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

    describe(`${area}m² shoulder`, () => {
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

      it('reports detail', () => {
        console.log(`\n${area}m² shoulder: ${passed}/${total} valid`)
        for (const r of areaResults) {
          const flags = []
          if (r.overlaps > 0) flags.push(`overlaps=${r.overlaps}`)
          if (r.dimIssues.length > 0) flags.push(`${r.dimIssues.length} dim`)
          if (r.aspectIssues.length > 0) flags.push(`${r.aspectIssues.length} aspect`)
          if (r.fallback) flags.push('fallback')
          if (r.rejected) flags.push('REJECTED')
          console.log(`  seed=${r.seed} rooms=${r.rooms} ${flags.length > 0 ? flags.join(' ') : '✓'}`)
        }
      })
    })
  }
})
