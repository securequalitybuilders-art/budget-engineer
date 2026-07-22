import { generatePlanModel } from '../src/engine/plan-generator'

const plan = generatePlanModel({ id: 't', name: 't', buildingType: 'house', grossFloorArea: 80, floors: 1, elements: [] })

console.log('Plan walls:', plan.walls.length)
console.log('External wall IDs:', plan.walls.filter(w => w.type === 'external').map(w => `${w.id}: (${w.start.x.toFixed(2)},${w.start.y.toFixed(2)})-(${w.end.x.toFixed(2)},${w.end.y.toFixed(2)})`).join('\n  '))

console.log('\nAll openings:')
for (const o of plan.openings) {
  const wall = plan.walls.find(w => w.id === o.wallId)
  const wallInfo = wall ? `(x:${wall.start.x.toFixed(1)}→${wall.end.x.toFixed(1)}, y:${wall.start.y.toFixed(1)}→${wall.end.y.toFixed(1)})` : 'WALL NOT FOUND'
  console.log(`  ${o.kind} wall=${o.wallId} ${wallInfo} off=${o.offset.toFixed(3)} w=${o.width.toFixed(2)}`)
}

console.log('\nExternal walls check:')
const extWalls = plan.walls.filter(w => w.type === 'external')
for (const ew of extWalls) {
  console.log(`  ${ew.id}: (${ew.start.x.toFixed(2)},${ew.start.y.toFixed(2)})-(${ew.end.x.toFixed(2)},${ew.end.y.toFixed(2)})`)
}

// Check if any opening references an external wall
console.log('\nOpenings on external walls:')
for (const o of plan.openings) {
  const extWall = extWalls.find(w => w.id === o.wallId)
  if (extWall) {
    console.log(`  ${o.kind} on ${extWall.id} (EXTERNAL)`)
  } else {
    const wall = plan.walls.find(w => w.id === o.wallId)
    if (wall) {
      console.log(`  ${o.kind} on ${wall.id} (INTERNAL type=${wall.type})`)
    } else {
      console.log(`  ${o.kind} on ${o.wallId} (NOT FOUND)`)
    }
  }
}
