import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import type { BimModel, BimElement } from '../../domain/bim'

interface BimViewerProps {
  model: BimModel | null
  activeFloorId?: string | null
  selectedElementId?: string | null
  onSelectElement?: (id: string | null) => void
  diffHighlightIds?: string[]
  ghostElementIds?: string[]
  removedElementIds?: string[]
  height?: number
}

const ELEMENT_COLORS: Record<string, string> = {
  wall: '#6366f1',
  slab: '#22c55e',
  roof: '#f59e0b',
  opening: '#ef4444',
  block: '#8b5cf6',
  roomZone: '#06b6d4',
}

export function BimViewer({
  model,
  activeFloorId,
  selectedElementId,
  onSelectElement,
  diffHighlightIds,
  ghostElementIds,
  removedElementIds,
  height = 480,
}: BimViewerProps) {
  const filteredElements = useMemo(() => {
    if (!model) return []
    let elems = model.elements
    if (activeFloorId) elems = elems.filter((e) => e.floorId === activeFloorId)
    return elems
  }, [model, activeFloorId])

  if (!model) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60" style={{ height }}>
        <p className="text-sm text-slate-400">No BIM model loaded. Generate a BIM model from a CAD document to view in 3D.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <Canvas camera={{ position: [15, 12, 15], fov: 45 }} style={{ height }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} />
        <OrbitControls enableDamping />
        <gridHelper args={[30, 20]} position={[0, -0.1, 0]} />
        {filteredElements.map((element) => (
          <BimElementMesh
            key={element.id}
            element={element}
            color={ELEMENT_COLORS[element.type] ?? '#94a3b8'}
            selected={selectedElementId === element.id}
            highlighted={diffHighlightIds?.includes(element.id)}
            ghost={ghostElementIds?.includes(element.id)}
            removed={removedElementIds?.includes(element.id)}
            onClick={() => onSelectElement?.(element.id)}
          />
        ))}
      </Canvas>
    </div>
  )
}

function BimElementMesh({
  element,
  color,
  selected,
  highlighted,
  ghost,
  removed,
  onClick,
}: {
  element: BimElement
  color: string
  selected: boolean
  highlighted?: boolean
  ghost?: boolean
  removed?: boolean
  onClick: () => void
}) {
  const opacity = ghost || removed ? 0.25 : 1
  const outlineColor = selected ? '#22d3ee' : highlighted ? '#facc15' : removed ? '#ef4444' : 'transparent'

  const mesh = useMemo(() => {
    if (element.type === 'wall') {
      const dx = element.end.x - element.start.x
      const dz = element.end.z - element.start.z
      const length = Math.sqrt(dx * dx + dz * dz) || 0.01
      const midX = (element.start.x + element.end.x) / 2
      const midZ = (element.start.z + element.end.z) / 2
      return (
        <mesh position={[midX, element.height / 2, midZ]} rotation={[0, -Math.atan2(dx, dz), 0]} onClick={onClick}>
          <boxGeometry args={[length, element.height, element.thickness]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      )
    }
    if (element.type === 'slab' || element.type === 'roof') {
      return (
        <mesh position={[element.origin.x + element.width / 2, element.origin.y + element.thickness / 2, element.origin.z + element.depth / 2]} onClick={onClick}>
          <boxGeometry args={[element.width, element.thickness, element.depth]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      )
    }
    if (element.type === 'roomZone') {
      return (
        <mesh position={[element.origin.x + element.width / 2, element.origin.y + element.height / 2, element.origin.z + element.depth / 2]} onClick={onClick}>
          <boxGeometry args={[element.width, element.height, element.depth]} />
          <meshStandardMaterial color={color} wireframe transparent opacity={0.3} />
        </mesh>
      )
    }
    if (element.type === 'block') {
      return (
        <mesh position={[element.position.x, element.position.y + element.height / 2, element.position.z]} rotation={[0, element.rotation ?? 0, 0]} onClick={onClick}>
          <boxGeometry args={[element.width, element.height, element.depth]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      )
    }
    return null
  }, [element, color, opacity, onClick])

  if (!mesh) return null

  return (
    <group>
      {mesh}
      {selected && (
        <Html center>
          <div className="rounded bg-cyan-500/80 px-2 py-0.5 text-[10px] text-white">{element.name}</div>
        </Html>
      )}
      {outlineColor !== 'transparent' && (
        <lineSegments>
          <edgesGeometry attach="geometry" args={[mesh.props.children?.[0]?.geometry]} />
          <lineBasicMaterial color={outlineColor} />
        </lineSegments>
      )}
    </group>
  )
}
