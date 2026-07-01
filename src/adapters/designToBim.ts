import type { DesignOption } from '@/domain/boq'
import type { BimModel, BimElement, BimSlab, BimWall, BimRoof, BimOpening, BimRoomZone } from '@/domain/bim'
import { buildDesignGeometry } from './designGeometryAdapter'
import { uuid } from '@/lib/utils'

const FLOOR_HEIGHT = 3

export function designOptionToBimModel(design: DesignOption | null): BimModel | null {
  if (!design || design.grossFloorArea <= 0) return null

  const geo = buildDesignGeometry(design)
  if (geo.walls.length === 0) return null

  const bimFloors: { id: string; name: string; elevation: number; height: number }[] = []
  const elements: BimElement[] = []

  for (let i = 0; i < design.floors; i++) {
    const floorId = `f${i + 1}`
    bimFloors.push({
      id: floorId,
      name: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
      elevation: i * FLOOR_HEIGHT,
      height: FLOOR_HEIGHT,
    })

    const zOffset = i * FLOOR_HEIGHT

    const slab: BimSlab = {
      id: `slab-${floorId}`,
      projectId: '',
      floorId,
      name: `${bimFloors[bimFloors.length - 1].name} slab`,
      ifcClass: 'IfcSlab',
      material: 'concrete',
      properties: { area: geo.width * geo.depth },
      type: 'slab',
      origin: { x: 0, y: zOffset, z: 0 },
      width: geo.width,
      depth: geo.depth,
      thickness: 0.15,
    }
    elements.push(slab)

    for (const gw of geo.walls.filter((w) => w.floorIndex === i)) {
      const wall: BimWall = {
        id: gw.id,
        projectId: '',
        floorId,
        name: gw.kind === 'external' ? `External wall ${gw.id}` : `Partition ${gw.id}`,
        ifcClass: 'IfcWall',
        material: 'concrete',
        properties: { role: gw.kind, length: Math.hypot(gw.end.x - gw.start.x, gw.end.y - gw.start.y) },
        type: 'wall',
        start: { x: gw.start.x, y: zOffset, z: gw.start.y },
        end: { x: gw.end.x, y: zOffset, z: gw.end.y },
        thickness: gw.thickness,
        height: gw.height,
      }
      elements.push(wall)
    }

    for (const go of geo.openings.filter((o) => o.floorIndex === i)) {
      const wall = geo.walls.find((w) => w.id === go.wallId)
      if (!wall) continue
      const wlen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 1
      const ratio = wlen > 0 ? (go.offset + go.width / 2) / wlen : 0.5
      const cx = wall.start.x + (wall.end.x - wall.start.x) * ratio
      const cz = wall.start.y + (wall.end.y - wall.start.y) * ratio
      const opening: BimOpening = {
        id: go.id,
        projectId: '',
        floorId,
        name: go.type === 'door' ? 'Door' : 'Window',
        ifcClass: go.type === 'door' ? 'IfcDoor' : 'IfcWindow',
        material: go.type === 'door' ? 'timber' : 'glass',
        properties: { kind: go.type, wallId: go.wallId },
        type: 'opening',
        wallId: go.wallId,
        center: { x: cx, y: zOffset, z: cz },
        width: go.width,
        height: go.height,
        sillHeight: go.sillHeight ?? 0,
      }
      elements.push(opening)
    }

    for (const room of geo.rooms.filter((r) => r.floorIndex === i)) {
      const zone: BimRoomZone = {
        id: `zone-${room.id}`,
        projectId: '',
        floorId,
        name: room.name,
        ifcClass: 'IfcSpace',
        material: 'generic',
        properties: { program: room.type, area: room.area },
        type: 'roomZone',
        origin: { x: room.x, y: zOffset, z: room.y },
        width: room.width,
        depth: room.depth,
        height: FLOOR_HEIGHT,
      }
      elements.push(zone)
    }
  }

  const roofFloorIndex = design.floors
  const roofZ = roofFloorIndex * FLOOR_HEIGHT
  const roof: BimRoof = {
    id: 'roof',
    projectId: '',
    floorId: bimFloors[roofFloorIndex - 1]?.id ?? 'f1',
    name: 'Roof slab',
    ifcClass: 'IfcRoof',
    material: 'concrete',
    properties: {},
    type: 'roof',
    origin: { x: 0, y: roofZ, z: 0 },
    width: geo.width,
    depth: geo.depth,
    thickness: 0.15,
  }
  elements.push(roof)

  return {
    id: uuid(),
    projectId: '',
    name: design.name,
    floors: bimFloors,
    elements,
  }
}
