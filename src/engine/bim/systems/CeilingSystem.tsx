import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useRegistry } from '../sceneRegistry'
import type { CeilingNode } from '../sceneStore'

const CEILING_COLOR = '#e2e8f0'

interface CeilingSystemProps {
  ceilings: CeilingNode[]
  visible: boolean
}

export function CeilingSystem({ ceilings, visible }: CeilingSystemProps) {
  if (!visible) return null
  return (
    <group data-system="ceilings">
      {ceilings.map((c) => (
        <CeilingMesh key={c.id} node={c} />
      ))}
    </group>
  )
}

function CeilingMesh({ node }: { node: CeilingNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useRegistry(node.id, 'ceiling', ref)

  const geometry = useMemo(() => {
    if (node.polygon.length < 3) {
      return new THREE.PlaneGeometry(1, 1)
    }
    const shape = new THREE.Shape()
    shape.moveTo(node.polygon[0].x, -node.polygon[0].y)
    for (let i = 1; i < node.polygon.length; i++) {
      shape.lineTo(node.polygon[i].x, -node.polygon[i].y)
    }
    shape.closePath()
    const geo = new THREE.ShapeGeometry(shape)
    return geo
  }, [node])

  return (
    <mesh
      ref={ref}
      position={[0, node.elevation, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      data-ceiling-id={node.id}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={CEILING_COLOR}
        roughness={0.95}
        metalness={0}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
