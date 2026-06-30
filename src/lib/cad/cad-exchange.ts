import type { CadDocument } from '../../domain/cad'

export function exportIfcLikeJson(doc: CadDocument): string {
  return JSON.stringify({
    schema: 'IFC-LIKE-JSON',
    projectId: doc.projectId,
    designId: doc.designId,
    floors: doc.floors,
    walls: doc.walls,
    openings: doc.openings,
    blocks: doc.blocks,
  }, null, 2)
}

export function exportCobieLikeJson(doc: CadDocument): string {
  return JSON.stringify({
    schema: 'COBIE-LIKE-JSON',
    floors: doc.floors.map((f) => ({ name: f.name, elevation: f.elevation })),
    components: [
      ...doc.walls.map((w) => ({ type: w.bim.classification, name: w.bim.typeName ?? w.id, level: w.bim.levelName })),
      ...doc.openings.map((o) => ({ type: o.bim.classification, name: o.bim.typeName ?? o.id, level: o.bim.levelName })),
      ...doc.blocks.map((b) => ({ type: b.bim.classification, name: b.bim.typeName ?? b.id, level: b.bim.levelName })),
    ],
  }, null, 2)
}
