import { generatePlanModel } from '../src/engine/plan-generator'
import { convertPlanModelToWs6Cad } from '../src/adapters/planModelToWs6Cad'

function analyze(area: number) {
  const plan = generatePlanModel({ id: 't', name: 't', buildingType: 'house', grossFloorArea: area, floors: 1, elements: [] })
  console.log(`\n=== ${area}m² ===`)
  console.log('Plan rooms:', plan.rooms.length)
  console.log('Room names:', plan.rooms.map(r => r.name).join(', '))
  console.log('Plan openings:', plan.openings?.length)

  const cad = convertPlanModelToWs6Cad(plan, 1, 3)
  if (!cad) { console.log('No CadDocument'); return }

  console.log('Cad walls:', cad.walls.length)
  for (const w of cad.walls) {
    if (w.structural) {
      console.log(`  wall ${w.id} start=(${w.start.x.toFixed(2)},${w.start.y.toFixed(2)}) end=(${w.end.x.toFixed(2)},${w.end.y.toFixed(2)})`)
    }
  }

  console.log('Cad openings:', cad.openings.length)
  for (const o of cad.openings) {
    console.log(`  ${o.kind} wall=${o.wallId} off=${o.offset.toFixed(3)} w=${o.width.toFixed(2)} h=${o.height}`)
  }
}

analyze(80)
analyze(100)
analyze(140)
