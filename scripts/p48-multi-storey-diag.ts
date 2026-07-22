import { generatePlanModel } from '../src/engine/plan-generator'

function makeOption(area: number, floors: number) {
  return { id: 'test', name: 'Test', buildingType: 'house' as const, grossFloorArea: area, floors, elements: [] }
}

for (const area of [140, 160]) {
  console.log(`\n=== ${area}m² 2-storey ===`)
  for (let seed = 0; seed < 5; seed++) {
    const origNow = Date.now
    Date.now = () => seed
    const plan = generatePlanModel(makeOption(area, 2))
    Date.now = origNow

    let overlaps = 0
    const details: string[] = []
    for (let i = 0; i < plan.rooms.length; i++) {
      for (let j = i + 1; j < plan.rooms.length; j++) {
        const a = plan.rooms[i], b = plan.rooms[j]
        if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
          overlaps++
          if (overlaps <= 5) details.push(`${a.name} & ${b.name} @ (${a.x.toFixed(2)},${a.y.toFixed(2)})`)
        }
      }
    }
    const constraints = plan.rooms.filter(r => r.name.startsWith('['))
    console.log(`seed=${seed}: ${overlaps} overlap(s), ${constraints.length} constraints — ${details.slice(0,3).join('; ')}`)
  }
}
