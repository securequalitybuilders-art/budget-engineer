import { describe, it } from 'vitest'
import { generatePlanModel } from '../engine/plan-generator'
import { getMinimumDimensions } from '../lib/geometry/plan-intelligence'

function makeOption(area: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors: 1, elements: [] }
}

function analyze(area: number, label: string) {
  const plan = generatePlanModel(makeOption(area))

  let overlaps = 0
  for (let i = 0; i < plan.rooms.length; i++) {
    for (let j = i + 1; j < plan.rooms.length; j++) {
      const a = plan.rooms[i], b = plan.rooms[j]
      if (a.name === 'Circulation' || b.name === 'Circulation') continue
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) overlaps++
    }
  }

  const dimIssues: string[] = []
  const aspectIssues: string[] = []
  for (const r of plan.rooms) {
    const d = getMinimumDimensions(r.name)
    if (r.width < d.minWidth - 0.01) dimIssues.push(`${r.name} w=${r.width.toFixed(2)}<${d.minWidth}`)
    else if (r.height < d.minDepth - 0.01) dimIssues.push(`${r.name} d=${r.height.toFixed(2)}<${d.minDepth}`)
    if (r.name.startsWith('Bedroom') || r.name === 'Master Bedroom') {
      const asp = Math.max(r.width / r.height, r.height / r.width)
      if (asp > 3.5) aspectIssues.push(r.name)
    }
  }

  const circ = plan.rooms.find(r => r.name === 'Circulation')

  console.log(`\n### ${label} (${area}m²) ###`)
  console.log(`  Rooms: ${plan.rooms.length}  Walls: ${plan.walls.length}  Opens: ${plan.openings.length}`)
  console.log(`  Overlaps: ${overlaps}  Dim issues: ${dimIssues.length}  Aspect issues: ${aspectIssues.length}  ${overlaps === 0 && dimIssues.length === 0 && aspectIssues.length === 0 ? '✅' : '❌'}`)
  for (const d of dimIssues.slice(0, 5)) console.log(`  ⚠ ${d}`)
  for (const a of aspectIssues.slice(0, 3)) console.log(`  ⚠ Aspect ${a}`)
  console.log(`  Circulation: ${circ ? circ.width.toFixed(2)+'×'+circ.height.toFixed(2)+'='+(circ.width*circ.height).toFixed(1)+'m²' : 'MISSING'}`)
  for (const r of plan.rooms) {
    console.log(`    ${(r.name as string).padEnd(18)} ${r.width.toFixed(2).padStart(6)}×${r.height.toFixed(2).padStart(6)}  @ (${r.x.toFixed(2)},${r.y.toFixed(2)})`)
  }
}

describe('P48.2 Large House Report', () => {
  it('140m²', () => analyze(140, 'Large 140'))
  it('150m²', () => analyze(150, 'Large 150'))
  it('160m²', () => analyze(160, 'Large 160'))
})
