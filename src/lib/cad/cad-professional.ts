import type { CadDocument, CadPoint, CadWall } from '../../domain/cad'

const snap = (value: number) => Number((Math.round(value / 0.2) * 0.2).toFixed(2))

export function offsetWall(doc: CadDocument, wallId: string, distance = 0.2): CadDocument {
  return {
    ...doc,
    walls: doc.walls.map((wall) => wall.id === wallId ? offsetSingleWall(wall, distance) : wall),
  }
}

export function trimWallToBounds(doc: CadDocument, wallId: string, width: number, height: number): CadDocument {
  return {
    ...doc,
    walls: doc.walls.map((wall) => {
      if (wall.id !== wallId) return wall
      return {
        ...wall,
        start: { x: clamp(snap(wall.start.x), 0, width), y: clamp(snap(wall.start.y), 0, height) },
        end: { x: clamp(snap(wall.end.x), 0, width), y: clamp(snap(wall.end.y), 0, height) },
      }
    }),
  }
}

export function moveAnnotationText(doc: CadDocument, annotationId: string, text: string): CadDocument {
  return {
    ...doc,
    annotations: doc.annotations.map((annotation) => annotation.id === annotationId ? { ...annotation, text } : annotation),
  }
}

export function moveDimensionAnnotation(doc: CadDocument, annotationId: string, position: CadPoint): CadDocument {
  return {
    ...doc,
    annotations: doc.annotations.map((annotation) => annotation.id === annotationId
      ? { ...annotation, position: { x: snap(position.x), y: snap(position.y) } }
      : annotation),
  }
}

function offsetSingleWall(wall: CadWall, distance: number): CadWall {
  const horizontal = Math.abs(wall.start.y - wall.end.y) < 0.01
  const vertical = Math.abs(wall.start.x - wall.end.x) < 0.01
  if (horizontal) {
    return {
      ...wall,
      start: { ...wall.start, y: snap(wall.start.y + distance) },
      end: { ...wall.end, y: snap(wall.end.y + distance) },
    }
  }
  if (vertical) {
    return {
      ...wall,
      start: { ...wall.start, x: snap(wall.start.x + distance) },
      end: { ...wall.end, x: snap(wall.end.x + distance) },
    }
  }
  return wall
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
