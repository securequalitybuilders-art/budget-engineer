import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useRegistry } from '../sceneRegistry'
import type { ZoneNode } from '../sceneStore'
import { useViewer } from '../viewerStore'

const ZONE_OPACITY = 0.15

const ZONE_COLORS: Record<string, string> = {
  public: '#3b82f6',
  private: '#22c55e',
  service: '#f59e0b',
  circulation: '#a855f7',
  unknown: '#94a3b8',
}

interface ZoneSystemProps {
  zones: ZoneNode[]
  visible: boolean
}

export function ZoneSystem({ zones, visible }: ZoneSystemProps) {
  if (!visible) return null
  return (
    <group data-system="zones">
      {zones.map((z) => (
        <ZoneMesh key={z.id} node={z} />
      ))}
    </group>
  )
}

function ZoneMesh({ node }: { node: ZoneNode }) {
  const ref = useRef<THREE.Mesh>(null)
  useRegistry(node.id, 'zone', ref)

  const selection = useViewer((s) => s.selection.zoneId)
  const isSelected = selection === node.id

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
    return new THREE.ShapeGeometry(shape)
  }, [node])

  const zoneColor = ZONE_COLORS[node.label.toLowerCase()] ?? ZONE_COLORS.unknown

  return (
    <mesh
      ref={ref}
      position={[0, 0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      data-zone-id={node.id}
      data-zone-label={node.label}
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={isSelected ? '#d4a574' : zoneColor}
        roughness={1}
        metalness={0}
        transparent
        opacity={isSelected ? 0.3 : ZONE_OPACITY}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
