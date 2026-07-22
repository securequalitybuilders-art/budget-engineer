import { generatePlanModel } from '../src/engine/plan-generator'
import { convertPlanModelToWs6Cad } from '../src/adapters/planModelToWs6Cad'
import { getEntranceOpening } from '../src/lib/drawings/frontage-mapper'

const plan = generatePlanModel({ id: 't', name: 't', buildingType: 'house', grossFloorArea: 80, floors: 1, elements: [] })
const cad = convertPlanModelToWs6Cad(plan, 1, 3)
if (!cad) { console.log('No cad'); process.exit(0) }

const entrance = getEntranceOpening(cad)
console.log('Entrance:', JSON.stringify(entrance, null, 2))

if (entrance) {
  const wall = cad.walls.find(w => w.id === entrance.openingId.replace(/_fl0$/, ''))
  console.log('Opening wallId:', entrance.openingId)
  // Find the actual wall
  const wall2 = cad.walls.find(w => w.id === entrance.openingId)
  console.log('Wall from opId:', wall2 ? `(${wall2.start.x},${wall2.start.y})-(${wall2.end.x},${wall2.end.y})` : 'not found')
  
  // Check if the door opening exists
  const door = cad.openings.find(o => o.id === entrance.openingId)
  console.log('Door opening:', door ? `${door.kind} off=${door.offset} w=${door.width} wall=${door.wallId}` : 'not found')
  
  // Check the wall the door is on
  const doorWall = cad.walls.find(w => w.id === door?.wallId)
  console.log('Door wall:', doorWall ? `(${doorWall.start.x},${doorWall.start.y})-(${doorWall.end.x},${doorWall.end.y})` : 'not found')
  
  console.log('computed entrance pos:', entrance.pos)
}
