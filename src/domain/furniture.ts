export type BlockCategory = 'furniture' | 'sanitary' | 'kitchen' | 'structural' | 'stair' | 'lighting'

export interface FurnitureDef {
  id: string
  name: string
  category: BlockCategory
  width: number
  depth: number
  height: number
  symbol: string
  mounting: 'floor' | 'wall' | 'ceiling' | 'counter'
  tags: string[]
  svgHint?: string
}

export interface PlacedBlock {
  instanceId: string
  defId: string
  x: number
  y: number
  rotation: number
  roomId?: string
  flipped: boolean
}
