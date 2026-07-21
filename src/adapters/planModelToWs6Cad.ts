import type { PlanModel } from '@/domain/plan'
import type {
  CadDocument,
  CadWall,
  CadOpening,
  CadFloor,
  RoomProgramme,
} from '@/domain/ws6-types'

const DOOR_DEFAULT_HEIGHT = 2.1
const WINDOW_DEFAULT_HEIGHT = 1.2
const WINDOW_DEFAULT_SILL = 0.9

function makeFloorId(index: number): string {
  return `f${index + 1}`
}

function wallLen(w: { start: { x: number; y: number }; end: { x: number; y: number } }): number {
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)
}

export function convertPlanModelToWs6Cad(
  plan: PlanModel,
  floors: number,
  storeyHeight: number,
): CadDocument | null {
  if (!plan || !plan.walls || plan.walls.length === 0 || floors < 1) return null

  const cadFloors: CadFloor[] = []
  for (let i = 0; i < floors; i++) {
    cadFloors.push({
      id: makeFloorId(i),
      name: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
      elevation: i * storeyHeight,
      height: storeyHeight,
    })
  }

  const cadWalls: CadWall[] = []
  const cadOpenings: CadOpening[] = []

  for (let fi = 0; fi < floors; fi++) {
    const floorId = makeFloorId(fi)
    const baseElevation = fi * storeyHeight

    for (const w of plan.walls) {
      const len = wallLen(w)
      if (len < 0.01) continue

      const wallId = `${w.id}_fl${fi}`
      cadWalls.push({
        id: wallId,
        floorId,
        start: { x: w.start.x, y: w.start.y },
        end: { x: w.end.x, y: w.end.y },
        thickness: w.thickness || plan.wallThickness || 0.23,
        height: storeyHeight,
        name: `Wall ${w.id} - ${w.type}`,
        structural: w.type === 'external',
        metadata: {
          ifcClass: w.type === 'external' ? 'IfcWallStandardCase' : 'IfcWall',
          category: w.type === 'external' ? 'external wall' : 'internal partition',
          properties: { type: w.type, floor: floorId },
        },
      })

      for (const o of plan.openings) {
        if (o.wallId !== w.id) continue

        const absOffset = o.offset * len
        const opH = o.height ?? (o.kind === 'door' ? DOOR_DEFAULT_HEIGHT : WINDOW_DEFAULT_HEIGHT)
        const opSill = o.sillHeight ?? (o.kind === 'door' ? 0 : WINDOW_DEFAULT_SILL)
        const opHead = opSill + opH

        cadOpenings.push({
          id: `${o.id}_fl${fi}`,
          wallId,
          floorId,
          kind: o.kind,
          offset: absOffset,
          width: o.width,
          height: opH,
          sillHeight: opSill,
          headHeight: opHead,
          name: `${o.kind === 'door' ? 'Door' : 'Window'} ${o.id}`,
          metadata: {
            ifcClass: o.kind === 'door' ? 'IfcDoor' : 'IfcWindow',
            category: o.kind,
            typeName: 'hinged',
            properties: {
              width: o.width,
              height: opH,
              heightAboveFloor: baseElevation + opSill,
            },
          },
        })
      }
    }
  }

  const roomProgramme: Record<string, RoomProgramme> = {}
  for (const r of plan.rooms) {
    roomProgramme[r.id] = r.name as RoomProgramme
  }

  const cad: CadDocument = {
    id: plan.id || 'cad-from-plan',
    projectId: '',
    name: 'Elevation from PlanModel',
    materialSystem: 'concrete',
    floors: cadFloors,
    walls: cadWalls,
    openings: cadOpenings,
    blocks: [],
    boundaries: [],
    roomProgramme: Object.keys(roomProgramme).length > 0 ? roomProgramme : undefined,
  }

  return cad
}
