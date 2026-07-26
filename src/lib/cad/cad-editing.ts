import type { CadDocument, CadPoint, CadTool } from '../../domain/cad'

const GRID = 0.2

export function setActiveTool(doc: CadDocument, tool: CadTool): CadDocument {
  return { ...doc, activeTool: tool }
}

export function toggleLayer(doc: CadDocument, layerId: string): CadDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) => layer.id === layerId ? { ...layer, visible: !layer.visible } : layer),
  }
}

export function moveWallEndpoint(doc: CadDocument, wallId: string, endpoint: 'start' | 'end', next: CadPoint): CadDocument {
  return {
    ...doc,
    walls: doc.walls.map((wall) => {
      if (wall.id !== wallId) return wall
      return {
        ...wall,
        [endpoint]: {
          x: snap(next.x),
          y: snap(next.y),
        },
      }
    }),
  }
}

export function moveOpeningOffset(doc: CadDocument, openingId: string, nextOffsetRatio: number): CadDocument {
  return {
    ...doc,
    openings: doc.openings.map((opening) => opening.id === openingId ? { ...opening, offsetRatio: clamp(nextOffsetRatio, 0.1, 0.9) } : opening),
  }
}

export function moveAnnotation(doc: CadDocument, annotationId: string, next: CadPoint): CadDocument {
  return {
    ...doc,
    annotations: doc.annotations.map((annotation) => annotation.id === annotationId
      ? { ...annotation, position: { x: snap(next.x), y: snap(next.y) } }
      : annotation),
  }
}

function snap(value: number) {
  return Number((Math.round(value / GRID) * GRID).toFixed(2))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
