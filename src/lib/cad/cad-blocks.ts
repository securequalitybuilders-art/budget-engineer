import type { CadBlockInstance, CadDocument } from '../../domain/cad'

const uid = () => Math.random().toString(36).slice(2, 10)

export function addBlock(doc: CadDocument, blockType: CadBlockInstance['blockType'], x: number, y: number): CadDocument {
  const block: CadBlockInstance = {
    id: uid(),
    floorId: doc.activeFloorId,
    blockType,
    position: { x, y },
    width: blockType === 'bed' ? 2 : blockType === 'sofa' ? 2.2 : blockType === 'stair' ? 2.4 : 1.2,
    height: blockType === 'bed' ? 1.6 : blockType === 'sofa' ? 0.9 : blockType === 'stair' ? 4 : 1.2,
    rotation: 0,
    bim: {
      classification: blockType === 'stair' ? 'IfcStair' : blockType === 'core' ? 'IfcBuildingElementProxy' : 'IfcFurnishingElement',
      family: blockType,
      typeName: blockType,
      levelName: doc.floors.find((f) => f.id === doc.activeFloorId)?.name,
    },
  }
  return { ...doc, blocks: [...doc.blocks, block] }
}
