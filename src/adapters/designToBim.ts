import type { DesignOption } from '@/domain/boq'
import type { BimModel, BimElement, BimSlab, BimWall, BimRoof } from '@/domain/bim'
import { uuid } from '@/lib/utils'

function safeSqrt(n: number): number {
  return n > 0 ? Math.sqrt(n) : 0
}

export function designOptionToBimModel(design: DesignOption | null): BimModel | null {
  if (!design || design.grossFloorArea <= 0) return null

  const dim = safeSqrt(design.grossFloorArea)
  const floorHeight = 3

  const bimFloors: { id: string; name: string; elevation: number; height: number }[] = []
  const elements: BimElement[] = []

  for (let i = 0; i < design.floors; i++) {
    const floorId = `f${i + 1}`
    bimFloors.push({
      id: floorId,
      name: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
      elevation: i * floorHeight,
      height: floorHeight,
    })

    const zOffset = i * floorHeight

    // Slab (2x perimeter ratio for aspect)
    const slab: BimSlab = {
      id: `slab-${floorId}`,
      projectId: '',
      floorId,
      name: `${bimFloors[bimFloors.length - 1].name} slab`,
      ifcClass: 'IfcSlab',
      material: 'concrete',
      properties: { area: design.grossFloorArea },
      type: 'slab',
      origin: { x: 0, y: zOffset, z: 0 },
      width: dim * 2,
      depth: dim,
      thickness: 0.15,
    }
    elements.push(slab)

    // Perimeter walls
    const walls: [number, number, number, number][] = [
      [0, 0, dim * 2, 0],
      [dim * 2, 0, dim * 2, dim],
      [dim * 2, dim, 0, dim],
      [0, dim, 0, 0],
    ]
    for (let wi = 0; wi < walls.length; wi++) {
      const [x1, z1, x2, z2] = walls[wi]
      const wall: BimWall = {
        id: `wall-${floorId}-${wi + 1}`,
        projectId: '',
        floorId,
        name: `Perimeter wall ${wi + 1}`,
        ifcClass: 'IfcWall',
        material: 'concrete',
        properties: {},
        type: 'wall',
        start: { x: x1, y: zOffset, z: z1 },
        end: { x: x2, y: zOffset, z: z2 },
        thickness: 0.23,
        height: floorHeight,
      }
      elements.push(wall)
    }
  }

  // Roof slab
  const roofFloorIndex = design.floors
  const roofZ = roofFloorIndex * floorHeight
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
    width: dim * 2,
    depth: dim,
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
