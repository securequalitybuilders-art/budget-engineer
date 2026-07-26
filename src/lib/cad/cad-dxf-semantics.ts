import type { CadDocument } from '../../domain/cad'

export function applyProfessionalDxfLayerSemantics(doc: CadDocument): CadDocument {
  return {
    ...doc,
    layers: doc.layers.map((layer) => ({
      ...layer,
      dxfLayerName: mapLayerName(layer.id),
    })),
  }
}

function mapLayerName(layerId: string): string {
  switch (layerId) {
    case 'walls': return 'A-WALL-FULL'
    case 'openings': return 'A-DOOR-WIND'
    case 'annotations': return 'A-ANNO-TEXT'
    case 'dimensions': return 'A-ANNO-DIMS'
    case 'rooms': return 'A-AREA-ROOM'
    case 'grid': return 'A-GRID'
    default: return `A-MISC-${layerId.toUpperCase()}`
  }
}
