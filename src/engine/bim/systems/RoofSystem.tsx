import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useRegistry } from '../sceneRegistry'
import type { RoofNode } from '../sceneStore'
const ROOF_COLOR = '#64748b'

interface RoofSystemProps {
  roofs: RoofNode[]
  visible: boolean
}

export function RoofSystem({ roofs, visible }: RoofSystemProps) {
  if (!visible) return null
  return (
    <group data-system="roofs">
      {roofs.map((r) => (
        <RoofMesh key={r.id} node={r} />
      ))}
    </group>
  )
}

function RoofMesh({ node }: { node: RoofNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useRegistry(node.id, 'roof', ref)

  const geometry = useMemo(() => {
    if (node.polygon.length < 3) {
      return new THREE.BoxGeometry(1, 0.2, 1)
    }
    const shape = new THREE.Shape()
    shape.moveTo(node.polygon[0].x, -node.polygon[0].y)
    for (let i = 1; i < node.polygon.length; i++) {
      shape.lineTo(node.polygon[i].x, -node.polygon[i].y)
    }
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: false,
    })
  }, [node])

  const roofElevation = (node.metadata as Record<string, unknown>).elevation as number ?? 6

  return (
    <mesh
      ref={ref}
      position={[0, roofElevation, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      data-roof-id={node.id}
      data-pitch={node.pitch}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={ROOF_COLOR}
        roughness={0.6}
        metalness={0.15}
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function roofPitchHeight(pitchDeg: number, span: number): number {
  const rad = (pitchDeg * Math.PI) / 180
  return Math.tan(rad) * (span / 2)
}
