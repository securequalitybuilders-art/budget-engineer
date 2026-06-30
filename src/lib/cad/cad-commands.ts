import type { CadAnnotation, CadDocument, CadFloor, CadOpening, CadPoint, CadWall, OpeningKind } from '../../domain/cad'

const uid = () => Math.random().toString(36).slice(2, 10)
const snap = (value: number) => Number((Math.round(value / 0.2) * 0.2).toFixed(2))

export function addWall(doc: CadDocument, floorId: string, start: CadPoint, end: CadPoint, structuralRole: 'external' | 'internal' = 'internal'): CadDocument {
  const floor = doc.floors.find((item) => item.id === floorId)
  const wall: CadWall = {
    id: uid(),
    floorId,
    start: { x: snap(start.x), y: snap(start.y) },
    end: { x: snap(end.x), y: snap(end.y) },
    thickness: structuralRole === 'external' ? 0.2 : 0.12,
    structuralRole,
    layerId: 'walls',
    bim: {
      classification: structuralRole === 'external' ? 'IfcWallStandardCase' : 'IfcWall',
      family: 'Basic Wall',
      typeName: structuralRole === 'external' ? 'Exterior Wall' : 'Interior Partition',
      material: structuralRole === 'external' ? 'Masonry' : 'Gypsum / Masonry',
      loadBearing: structuralRole === 'external',
      levelName: floor?.name,
    },
  }
  return { ...doc, walls: [...doc.walls, wall] }
}

export function deleteWall(doc: CadDocument, wallId: string): CadDocument {
  return {
    ...doc,
    walls: doc.walls.filter((wall) => wall.id !== wallId),
    openings: doc.openings.filter((opening) => opening.wallId !== wallId),
  }
}

export function addOpening(doc: CadDocument, wallId: string, kind: OpeningKind = 'door'): CadDocument {
  const floor = doc.floors.find((item) => item.id === doc.activeFloorId)
  const opening: CadOpening = {
    id: uid(),
    floorId: doc.activeFloorId,
    wallId,
    kind,
    offsetRatio: 0.5,
    width: kind === 'door' ? 0.9 : 1.5,
    layerId: 'openings',
    bim: {
      classification: kind === 'door' ? 'IfcDoor' : 'IfcWindow',
      family: kind === 'door' ? 'Single-Flush' : 'Fixed Window',
      typeName: kind === 'door' ? 'Door Type A' : 'Window Type A',
      levelName: floor?.name,
    },
  }
  return { ...doc, openings: [...doc.openings, opening] }
}

export function deleteOpening(doc: CadDocument, openingId: string): CadDocument {
  return { ...doc, openings: doc.openings.filter((opening) => opening.id !== openingId) }
}

export function addAnnotation(doc: CadDocument, text: string, position: CadPoint): CadDocument {
  const annotation: CadAnnotation = {
    id: uid(),
    floorId: doc.activeFloorId,
    position: { x: snap(position.x), y: snap(position.y) },
    text,
    kind: 'note',
    layerId: 'annotations',
    bim: { classification: 'Annotation', comments: 'User note' },
  }
  return { ...doc, annotations: [...doc.annotations, annotation] }
}

export function setActiveFloor(doc: CadDocument, floorId: string): CadDocument {
  return { ...doc, activeFloorId: floorId }
}

export function addFloor(doc: CadDocument, name: string, elevation: number): CadDocument {
  const floor: CadFloor = {
    id: uid(),
    name,
    elevation,
    bim: { classification: 'Level', levelName: name },
  }
  return { ...doc, floors: [...doc.floors, floor], activeFloorId: floor.id }
}
