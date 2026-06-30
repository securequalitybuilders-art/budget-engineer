import type { PlanModel } from '../../domain/plan'
import type { CadAnnotation, CadBlockInstance, CadDocument, CadFloor, CadLayer, CadOpening, CadWall } from '../../domain/cad'

const uid = () => Math.random().toString(36).slice(2, 10)

export function seedCadDocument(projectId: string, designId: string, plan: PlanModel): CadDocument {
  const floor: CadFloor = {
    id: 'floor-1',
    name: 'Ground Floor',
    elevation: 0,
    bim: { classification: 'Level', levelName: 'Ground Floor' },
  }
  const layers: CadLayer[] = [
    { id: 'grid', name: 'Grid', visible: true, color: '#334155', dxfLayerName: 'A-GRID' },
    { id: 'walls', name: 'Walls', visible: true, color: '#f8fafc', dxfLayerName: 'A-WALL-FULL' },
    { id: 'openings', name: 'Openings', visible: true, color: '#38bdf8', dxfLayerName: 'A-DOOR-WIND' },
    { id: 'annotations', name: 'Annotations', visible: true, color: '#f59e0b', dxfLayerName: 'A-ANNO-TEXT' },
    { id: 'rooms', name: 'Rooms', visible: true, color: '#6366f1', dxfLayerName: 'A-AREA-ROOM' },
    { id: 'dimensions', name: 'Dimensions', visible: true, color: '#67e8f9', dxfLayerName: 'A-ANNO-DIMS' },
  ]

  const walls: CadWall[] = plan.walls.map((wall) => ({
    id: uid(),
    floorId: floor.id,
    start: { ...wall.start },
    end: { ...wall.end },
    thickness: wall.thickness,
    structuralRole: wall.type,
    layerId: 'walls',
    bim: {
      classification: wall.type === 'external' ? 'IfcWallStandardCase' : 'IfcWall',
      family: 'Basic Wall',
      typeName: wall.type === 'external' ? 'Exterior Wall' : 'Interior Partition',
      material: wall.type === 'external' ? 'Masonry' : 'Gypsum / Masonry',
      loadBearing: wall.type === 'external',
      levelName: floor.name,
    },
  }))

  const openings: CadOpening[] = plan.openings.map((opening) => ({
    id: uid(),
    floorId: floor.id,
    wallId: walls[Math.max(0, plan.walls.findIndex((w) => w.id === opening.wallId))]?.id ?? walls[0]?.id ?? uid(),
    kind: opening.kind,
    offsetRatio: opening.offset,
    width: opening.width,
    layerId: 'openings',
    bim: {
      classification: opening.kind === 'door' ? 'IfcDoor' : 'IfcWindow',
      family: opening.kind === 'door' ? 'Single-Flush' : 'Fixed Window',
      typeName: opening.kind === 'door' ? 'Door Type A' : 'Window Type A',
      levelName: floor.name,
    },
  }))

  const annotations: CadAnnotation[] = plan.rooms.map((room) => ({
    id: uid(),
    floorId: floor.id,
    position: { x: room.x + room.width / 2, y: room.y + room.height / 2 },
    text: room.name,
    kind: 'label',
    layerId: 'annotations',
    bim: { classification: 'Annotation', comments: 'Seeded room label' },
  }))

  const blocks: CadBlockInstance[] = []

  return {
    id: uid(),
    projectId,
    designId,
    activeFloorId: floor.id,
    activeTool: 'select',
    floors: [floor],
    layers,
    walls,
    openings,
    annotations,
    blocks,
  }
}
