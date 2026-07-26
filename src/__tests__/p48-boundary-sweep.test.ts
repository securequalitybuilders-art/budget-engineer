import { describe, it, expect, vi } from 'vitest'
import { generatePlanModel } from '../engine/plan-generator'
import { getMinimumDimensions } from '../lib/geometry/plan-intelligence'

function makeOption(area: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors: 1, elements: [] }
}

interface SeedResult {
  area: number
  seed: number
  rooms: number
  roomNames: string[]
  overlaps: number
  dimIssues: number
  dimIssueDetails: string[]
  aspectIssues: number
  aspectIssueDetails: string[]
  fallback: boolean
  rejected: boolean
  kitchenBelowMin: boolean
  bathroomBelowMin: boolean
  valid: boolean
}

function analyze(area: number, seed: number): SeedResult {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  // Use deterministic "seed" by manipulating Date.now mock
  const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(seed)

  const plan = generatePlanModel(makeOption(area))

  warnSpy.mockRestore()
  errorSpy.mockRestore()
  dateSpy.mockRestore()

  const fallback = warnSpy.mock.calls.some(c => c[0]?.includes?.('(fallback)'))
  const rejected = errorSpy.mock.calls.some(c => c[0]?.includes?.('PLAN REJECTED'))

  let overlaps = 0
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j]
      if (a.name === 'Circulation' || b.name === 'Circulation') continue
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlaps++
    }
  }

  const dimIssueDetails: string[] = []
  const aspectIssueDetails: string[] = []
  for (const r of plan.rooms) {
    const d = getMinimumDimensions(r.name)
    const wOk = r.width >= d.minWidth - 0.01
    const hOk = r.height >= d.minDepth - 0.01
    if (!wOk) dimIssueDetails.push(`${r.name} w=${r.width.toFixed(2)}<${d.minWidth}`)
    else if (!hOk) dimIssueDetails.push(`${r.name} d=${r.height.toFixed(2)}<${d.minDepth}`)
    if (r.name.startsWith('Bedroom') || r.name === 'Master Bedroom') {
      const asp = Math.max(r.width / r.height, r.height / r.width)
      if (asp > 3.5) aspectIssueDetails.push(r.name)
    }
  }

  const kitchen = plan.rooms.find(r => r.name === 'Kitchen' || r.name === 'Living / Kitchen / Dining' || r.name === 'Kitchenette')
  const kitchenMin = kitchen ? getMinimumDimensions(kitchen.name) : null
  const kitchenBelowMin = kitchenMin ? (kitchen.width < kitchenMin.minWidth - 0.01 || kitchen.height < kitchenMin.minDepth - 0.01) : false

  const bathrooms = plan.rooms.filter(r => r.name.startsWith('Bathroom'))
  const bathroomBelowMin = bathrooms.length > 0 && bathrooms.some(b => {
    const bm = getMinimumDimensions(b.name)
    return b.width < bm.minWidth - 0.01 || b.height < bm.minDepth - 0.01
  })

  return {
    area,
    seed,
    rooms: plan.rooms.length,
    roomNames: plan.rooms.map(r => r.name),
    overlaps,
    dimIssues: dimIssueDetails.length,
    dimIssueDetails,
    aspectIssues: aspectIssueDetails.length,
    aspectIssueDetails,
    fallback,
    rejected,
    kitchenBelowMin,
    bathroomBelowMin,
    valid: overlaps === 0 && dimIssueDetails.length === 0 && aspectIssueDetails.length === 0 && !rejected,
  }
}

function summarize(results: SeedResult[]): string {
  const areas = [...new Set(results.map(r => r.area))].sort((a, b) => a - b)
  const lines: string[] = []
  lines.push('')
  lines.push('| Area | Seeds Passed | Overlaps | Dim Issues | Aspect Issues | Fallback | Kitchen OK | Bathroom OK | Verdict |')
  lines.push('|------|-------------|----------|------------|---------------|----------|------------|-------------|---------|')
  for (const area of areas) {
    const areaResults = results.filter(r => r.area === area)
    const passed = areaResults.filter(r => r.valid).length
    const total = areaResults.length
    const anyOverlaps = areaResults.some(r => r.overlaps > 0)
    const anyDim = areaResults.some(r => r.dimIssues > 0)
    const anyAspect = areaResults.some(r => r.aspectIssues > 0)
    const anyFallback = areaResults.some(r => r.fallback)
    const anyRejected = areaResults.some(r => r.rejected)
    const kitchenOk = areaResults.every(r => !r.kitchenBelowMin)
    const bathroomOk = areaResults.every(r => !r.bathroomBelowMin)

    let verdict = 'PASS'
    if (anyRejected) verdict = 'FAIL'
    else if (passed / total < 0.7) verdict = 'FAIL'
    else if (anyDim || anyAspect) verdict = 'BORDERLINE'
    else if (anyFallback) verdict = 'BORDERLINE'

    lines.push(`| ${area}m² | ${passed}/${total} | ${anyOverlaps ? 'yes' : 'no'} | ${anyDim ? 'yes' : 'no'} | ${anyAspect ? 'yes' : 'no'} | ${anyFallback ? 'yes' : 'no'} | ${kitchenOk ? 'yes' : 'no'} | ${bathroomOk ? 'yes' : 'no'} | ${verdict} |`)
  }
  return lines.join('\n')
}

function detailReport(results: SeedResult[]): string {
  const lines: string[] = []
  const areas = [...new Set(results.map(r => r.area))].sort((a, b) => a - b)
  for (const area of areas) {
    const areaResults = results.filter(r => r.area === area)
    const failed = areaResults.filter(r => !r.valid)
    lines.push(`\n## ${area}m² — ${failed.length}/${areaResults.length} failed`)
    for (const f of failed) {
      lines.push(`  seed=${f.seed} rooms=${f.rooms} [${f.roomNames.join(', ')}]`)
      if (f.overlaps > 0) lines.push(`    overlaps: ${f.overlaps}`)
      for (const d of f.dimIssueDetails) lines.push(`    dim: ${d}`)
      for (const a of f.aspectIssueDetails) lines.push(`    aspect: ${a}`)
      if (f.fallback) lines.push(`    fallback used`)
      if (f.rejected) lines.push(`    REJECTED`)
    }
  }
  return lines.join('\n')
}

describe('P48.3 Boundary Stability Sweep', () => {
  const SEEDS = [42, 97, 133, 256, 511, 777, 1024, 2048, 4096, 8192]
  const AREAS = [68, 72, 78, 80, 90, 100, 110, 140, 160]

  const allResults: SeedResult[] = []
  for (const area of AREAS) {
    for (const seed of SEEDS) {
      allResults.push(analyze(area, seed))
    }
  }

  it('reports boundary sweep matrix', () => {
    console.log(summarize(allResults))
    console.log(detailReport(allResults))
  })

  for (const area of AREAS) {
    const areaResults = allResults.filter(r => r.area === area)
    const passed = areaResults.filter(r => r.valid).length
    const total = areaResults.length

    it(`${area}m² passes ≥70% of seeds (${passed}/${total})`, () => {
      expect(passed / total).toBeGreaterThanOrEqual(0.7)
    })

    it(`${area}m² never has overlaps`, () => {
      for (const r of areaResults) expect(r.overlaps).toBe(0)
    })

    it(`${area}m² never has dimension issues`, () => {
      for (const r of areaResults) expect(r.dimIssues).toBe(0)
    })

    it(`${area}m² never has aspect ratio issues`, () => {
      for (const r of areaResults) expect(r.aspectIssues).toBe(0)
    })

    it(`${area}m² never triggers fallback`, () => {
      for (const r of areaResults) expect(r.fallback).toBe(false)
    })

    it(`${area}m² kitchen always meets minimum`, () => {
      for (const r of areaResults) expect(r.kitchenBelowMin).toBe(false)
    })

    it(`${area}m² bathroom always meets minimum`, () => {
      for (const r of areaResults) expect(r.bathroomBelowMin).toBe(false)
    })
  }
})
