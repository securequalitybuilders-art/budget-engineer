import type { CadAnnotation, CadDocument } from '../../domain/cad'
import { wallMidpoint } from './cad-topology'

const uid = () => Math.random().toString(36).slice(2, 10)

export function generateDimensionAnnotations(doc: CadDocument): CadDocument {
  const generated: CadAnnotation[] = doc.walls
    .filter((wall) => wall.floorId === doc.activeFloorId)
    .map((wall) => {
      const mid = wallMidpoint(wall)
      const length = Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2)
      return {
        id: uid(),
        floorId: doc.activeFloorId,
        position: { x: mid.x, y: mid.y - 0.3 },
        text: `${length.toFixed(2)}m`,
        kind: 'dimension',
        layerId: 'dimensions',
      }
    })

  const nonDimensions = doc.annotations.filter((annotation) => annotation.kind !== 'dimension' || annotation.floorId !== doc.activeFloorId)
  return {
    ...doc,
    annotations: [...nonDimensions, ...generated],
  }
}
