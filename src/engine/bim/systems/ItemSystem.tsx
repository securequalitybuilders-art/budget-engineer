import { useRef } from 'react'
import * as THREE from 'three'
import { useRegistry } from '../sceneRegistry'
import type { ItemNode } from '../sceneStore'

const ITEM_COLORS: Record<string, string> = {
  door: '#d4a574',
  window: '#38bdf8',
  light: '#fbbf24',
}

interface ItemSystemProps {
  items: ItemNode[]
  visible: boolean
}

export function ItemSystem({ items, visible }: ItemSystemProps) {
  if (!visible) return null
  return (
    <group data-system="items">
      {items.map((i) => (
        <ItemMesh key={i.id} node={i} />
      ))}
    </group>
  )
}

function ItemMesh({ node }: { node: ItemNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useRegistry(node.id, 'item', ref)

  const color = ITEM_COLORS[node.itemType] ?? '#94a3b8'
  const isDoor = node.itemType === 'door'
  const isWindow = node.itemType === 'window'

  return (
    <mesh
      ref={ref}
      position={[node.offsetAlongWall, isDoor ? node.height / 2 : node.height, 0]}
      data-item-id={node.id}
      data-item-type={node.itemType}
    >
      <boxGeometry args={[node.width, node.height, isWindow ? 0.05 : 0.08]} />
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={isWindow ? 0.3 : 0.05}
        transparent
        opacity={isWindow ? 0.5 : 0.85}
      />
    </mesh>
  )
}
