import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useRegistry } from '../sceneRegistry'
import type { WallNode } from '../sceneStore'
import { useViewer } from '../viewerStore'

const WALL_EXT_COLOR = '#94a3b8'

interface WallSystemProps {
  walls: WallNode[]
  visible: boolean
}

export function WallSystem({ walls, visible }: WallSystemProps) {
  if (!visible) return null
  return (
    <group data-system="walls">
      {walls.map((w) => (
        <WallSegment key={w.id} node={w} />
      ))}
    </group>
  )
}

function WallSegment({ node }: { node: WallNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useRegistry(node.id, 'wall', ref)

  const selection = useViewer((s) => s.selection.wallId)
  const isSelected = selection === node.id

  const { geometry, position, rotation } = useMemo(() => {
    const sx = node.startX, sy = node.startY
    const ex = node.endX, ey = node.endY
    const dx = ex - sx, dy = ey - sy
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const geo = new THREE.BoxGeometry(length, node.height, node.thickness)
    const pos = new THREE.Vector3(
      (sx + ex) / 2,
      node.height / 2,
      -(sy + ey) / 2,
    )
    const rot = new THREE.Euler(0, -angle, 0)

    return { geometry: geo, position: pos, rotation: rot }
  }, [node])

  const color = node.fireRating === 'Grade A' ? '#ef4444' :
    node.fireRating === 'Grade B' ? '#f59e0b' :
    isSelected ? '#d4a574' : WALL_EXT_COLOR

  return (
    <mesh
      ref={ref}
      position={position}
      rotation={rotation}
      data-wall-id={node.id}
      data-fire-rating={node.fireRating || undefined}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.05}
        emissive={isSelected ? '#d4a574' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  )
}

export function wallMiterDirection(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { dx: number; dy: number; length: number } {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return { dx, dy, length: Math.sqrt(dx * dx + dy * dy) }
}

export function wallThicknessOffset(
  thickness: number,
  angle: number,
): { offX: number; offY: number } {
  const half = thickness / 2
  return {
    offX: Math.sin(angle) * half,
    offY: Math.cos(angle) * half,
  }
}
