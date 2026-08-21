import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useRegistry } from '../sceneRegistry'
import type { SlabNode } from '../sceneStore'
import { useViewer } from '../viewerStore'

const SLAB_COLOR = '#475569'

interface SlabSystemProps {
  slabs: SlabNode[]
  visible: boolean
}

export function SlabSystem({ slabs, visible }: SlabSystemProps) {
  if (!visible) return null
  return (
    <group data-system="slabs">
      {slabs.map((s) => (
        <SlabMesh key={s.id} node={s} />
      ))}
    </group>
  )
}

function SlabMesh({ node }: { node: SlabNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useRegistry(node.id, 'slab', ref)

  const selection = useViewer((s) => s.selection.levelId)
  const isSelected = selection === node.parentId

  const geometry = useMemo(() => {
    if (node.polygon.length < 3) {
      return new THREE.BoxGeometry(1, node.thickness, 1)
    }
    const shape = new THREE.Shape()
    shape.moveTo(node.polygon[0].x, -node.polygon[0].y)
    for (let i = 1; i < node.polygon.length; i++) {
      shape.lineTo(node.polygon[i].x, -node.polygon[i].y)
    }
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, {
      depth: node.thickness,
      bevelEnabled: false,
    })
  }, [node])

  return (
    <mesh
      ref={ref}
      position={[0, node.elevation, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      data-slab-id={node.id}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={isSelected ? '#d4a574' : SLAB_COLOR}
        roughness={0.9}
        metalness={0}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}
