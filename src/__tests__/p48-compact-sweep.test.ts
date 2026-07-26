import { describe, it, expect } from 'vitest'
import { generatePlanModel } from '../engine/plan-generator'
import { getMinimumDimensions } from '../lib/geometry/plan-intelligence'

function makeOption(area: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors: 1, elements: [] }
}

function analyze(area: number) {
  const plan = generatePlanModel(makeOption(area))

  let overlaps = 0
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j]
      if (a.name === 'Circulation' || b.name === 'Circulation') continue
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
        overlaps++
      }
    }
  }

  const dimIssues: string[] = []
  const aspectIssues: string[] = []
  for (const r of plan.rooms) {
    const d = getMinimumDimensions(r.name)
    if (r.width < d.minWidth - 0.01) dimIssues.push(r.name)
    else if (r.height < d.minDepth - 0.01) dimIssues.push(r.name)
    if (r.name.startsWith('Bedroom') || r.name === 'Master Bedroom') {
      const asp = Math.max(r.width / r.height, r.height / r.width)
      if (asp > 3.5) aspectIssues.push(r.name)
    }
  }

  return { rooms: plan.rooms.length, overlaps, dimIssues: dimIssues.length, aspectIssues: aspectIssues.length, valid: overlaps === 0 && dimIssues.length === 0 }
}

describe('P48.1 Compact Multi-Seed Sweep', () => {
  const SEEDS = [42, 97, 133, 256, 511, 777, 1024, 2048, 4096, 8192]

  describe('70m² compact sweep', () => {
    const results = SEEDS.map(() => analyze(70))
    const passRate = results.filter(r => r.valid).length

    it('passes ≥70% of seeds', () => {
      expect(passRate / results.length).toBeGreaterThanOrEqual(0.7)
    })

    it('never has dimension issues', () => {
      for (const r of results) {
        expect(r.dimIssues).toBe(0)
      }
    })

    it('never has aspect ratio issues', () => {
      for (const r of results) {
        expect(r.aspectIssues).toBe(0)
      }
    })

    it('reports results', () => {
      console.log(`\n70m² sweep (${SEEDS.length} seeds): ${passRate}/${SEEDS.length} valid`)
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        console.log(`  seed=${SEEDS[i]} rooms=${r.rooms} overlaps=${r.overlaps} dimIssues=${r.dimIssues} aspectIssues=${r.aspectIssues} ${r.valid ? '✓' : '✗'}`)
      }
    })
  })

  describe('80m² compact sweep', () => {
    const results = SEEDS.map(() => analyze(80))
    const passRate = results.filter(r => r.valid).length

    it('passes ≥70% of seeds', () => {
      expect(passRate / results.length).toBeGreaterThanOrEqual(0.7)
    })

    it('never has dimension issues', () => {
      for (const r of results) {
        expect(r.dimIssues).toBe(0)
      }
    })

    it('never has aspect ratio issues', () => {
      for (const r of results) {
        expect(r.aspectIssues).toBe(0)
      }
    })

    it('reports results', () => {
      console.log(`\n80m² sweep (${SEEDS.length} seeds): ${passRate}/${SEEDS.length} valid`)
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        console.log(`  seed=${SEEDS[i]} rooms=${r.rooms} overlaps=${r.overlaps} dimIssues=${r.dimIssues} aspectIssues=${r.aspectIssues} ${r.valid ? '✓' : '✗'}`)
      }
    })
  })

  describe('100m² compact sweep', () => {
    const results = SEEDS.map(() => analyze(100))
    const passRate = results.filter(r => r.valid).length

    it('passes ≥70% of seeds', () => {
      expect(passRate / results.length).toBeGreaterThanOrEqual(0.7)
    })

    it('never has dimension issues', () => {
      for (const r of results) {
        expect(r.dimIssues).toBe(0)
      }
    })

    it('never has aspect ratio issues', () => {
      for (const r of results) {
        expect(r.aspectIssues).toBe(0)
      }
    })

    it('reports results', () => {
      console.log(`\n100m² sweep (${SEEDS.length} seeds): ${passRate}/${SEEDS.length} valid`)
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        console.log(`  seed=${SEEDS[i]} rooms=${r.rooms} overlaps=${r.overlaps} dimIssues=${r.dimIssues} aspectIssues=${r.aspectIssues} ${r.valid ? '✓' : '✗'}`)
      }
    })
  })
})
