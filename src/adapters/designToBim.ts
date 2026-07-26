import type { DesignOption } from '@/domain/boq'
import type { BimModel, BimElement, BimSlab, BimWall, BimOpening, BimRoomZone } from '@/domain/bim'
import { buildDesignGeometry } from './designGeometryAdapter'
import { uuid } from '@/lib/utils'
import { assignLevelSlabs } from '@/lib/structure/slab-system'
import { computeStructuralBridge } from '@/lib/structure/structural-bridge'
import { generateBuildingChassis } from '@/lib/layout/vertical-chassis'

const FLOOR_HEIGHT = 3

function getLevelLabel(i: number, total: number): string {
  if (i === 0) return 'Ground Floor'
  if (i === total - 1) return 'Roof Level'
  return `Floor ${i + 1}`
}

export function designOptionToBimModel(design: DesignOption | null): BimModel | null {
  if (!design || design.grossFloorArea <= 0) return null

  const geo = buildDesignGeometry(design)
  if (geo.walls.length === 0) return null

  const bimFloors: { id: string; name: string; elevation: number; height: number }[] = []
  const elements: BimElement[] = []

  // Try to compute chassis for multi-storey differentiation
  let slabAssignments = null
  let structuralBridge = null
  if (design.floors > 1) {
    try {
      const area = design.grossFloorArea
      const width = Math.sqrt(area * 1.18)
      const depth = area / width
      const chassis = generateBuildingChassis({
        typology: design.buildingType || 'house',
        storeyCount: design.floors,
        buildingWidth: Math.round(width * 10) / 10,
        buildingDepth: Math.round(depth * 10) / 10,
        floorToFloorHeight: FLOOR_HEIGHT,
        wallThickness: 0.2,
        structuralSystem: design.floors <= 2 ? 'masonry' : 'rc-frame',
        maxStructuralSpan: 6.0,
        hasLift: design.floors >= 3,
        hasDuplex: design.buildingType === 'duplex',
        hasMixedUse: design.buildingType === 'mixed-use',
        programmes: Array(design.floors).fill(design.buildingType || 'residential'),
      })
      slabAssignments = assignLevelSlabs(chassis)
      structuralBridge = computeStructuralBridge(chassis)
    } catch {
      // Fallback: uniform slabs
    }
  }

  for (let i = 0; i < design.floors; i++) {
    const floorId = `f${i + 1}`
    const slabInfo = slabAssignments?.[i]
    const structuralLevel = structuralBridge?.levels[i]
    const slabThickness = slabInfo?.slabSpec.thickness ?? 0.15
    const slabMaterial = slabInfo?.slabSpec.material ?? 'concrete'

    bimFloors.push({
      id: floorId,
      name: getLevelLabel(i, design.floors),
      elevation: i * FLOOR_HEIGHT,
      height: FLOOR_HEIGHT,
    })

    const zOffset = i * FLOOR_HEIGHT

    const slab: BimSlab = {
      id: `slab-${floorId}`,
      projectId: '',
      floorId,
      name: slabInfo?.label ?? `${getLevelLabel(i, design.floors)} slab`,
      ifcClass: i === design.floors - 1 ? 'IfcRoof' : 'IfcSlab',
      material: slabMaterial,
      properties: {
        area: geo.width * geo.depth,
        slabType: slabInfo?.slabSpec.slabType ?? 'suspended',
        loadingClass: slabInfo?.slabSpec.loadingClass ?? 'domestic',
      },
      type: 'slab' as const,
      origin: { x: 0, y: zOffset, z: 0 },
      width: geo.width,
      depth: geo.depth,
      thickness: slabThickness,
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

    // Add structural columns from bridge
    if (structuralLevel) {
      for (const col of structuralLevel.columns) {
        elements.push({
          id: `col-${col.id}`,
          projectId: '',
          floorId,
          name: `Column ${col.gridLabel}`,
          ifcClass: 'IfcColumn',
          material: col.material,
          properties: {
            axisA: col.axisA,
            axisB: col.axisB,
            levelIndex: col.levelIndex,
          },
          type: 'block',
          kind: 'column',
          position: { x: col.x, y: zOffset, z: col.z },
          width: col.width,
          depth: col.depth,
          height: col.height,
        } as BimElement)
      }

      for (const beam of structuralLevel.beams) {
        elements.push({
          id: `beam-${beam.id}`,
          projectId: '',
          floorId,
          name: `Beam ${beam.id.slice(0, 6)}`,
          ifcClass: 'IfcBeam',
          material: beam.material,
          properties: {
            span: beam.span,
            axisLabel: beam.supportAxisLabel,
          },
          type: 'wall',
          start: { x: beam.startX, y: zOffset, z: beam.startZ },
          end: { x: beam.endX, y: zOffset, z: beam.endZ },
          thickness: beam.width,
          height: beam.depth,
        } as BimWall)
      }
    }
  }

  return {
    id: uuid(),
    projectId: '',
    name: design.name,
    floors: bimFloors,
    elements,
  }
}
