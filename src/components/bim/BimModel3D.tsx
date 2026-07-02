import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { planTo3d, DEFAULT_STOREY_HEIGHT } from '@/adapters/planTo3d'
import type { PlanTo3dResult, WallPier, FloorSlab, Opening3d } from '@/adapters/planTo3d'

// ── Brand palette materials (PBR) ──
const WALL_EXT_MAT = new THREE.MeshStandardMaterial({
  color: '#94a3b8', roughness: 0.7, metalness: 0.05,
})
const WALL_INT_MAT = new THREE.MeshStandardMaterial({
  color: '#cbd5e1', roughness: 0.8, metalness: 0.0,
})
const SLAB_MAT = new THREE.MeshStandardMaterial({
  color: '#475569', roughness: 0.9, metalness: 0.0,
})
const DOOR_LEAF_MAT = new THREE.MeshStandardMaterial({
  color: '#d4a574', roughness: 0.6, metalness: 0.05,
})
const DOOR_FRAME_MAT = new THREE.MeshStandardMaterial({
  color: '#78716c', roughness: 0.7, metalness: 0.0,
})
const WINDOW_GLASS_MAT = new THREE.MeshStandardMaterial({
  color: '#06b6d4', roughness: 0.1, metalness: 0.0,
  transparent: true, opacity: 0.35,
})
const WINDOW_FRAME_MAT = new THREE.MeshStandardMaterial({
  color: '#57534e', roughness: 0.7, metalness: 0.05,
})

interface BimModel3DProps {
  plan: PlanModel | null
  design: DesignOption | null
  height?: number
}

// — Mesh sub-components —

function WallPierMesh({ pier }: { pier: WallPier }) {
  const dx = pier.endX - pier.startX
  const dz = pier.endZ - pier.startZ
  const length = Math.hypot(dx, dz) || 0.001
  const midX = (pier.startX + pier.endX) / 2
  const midZ = (pier.startZ + pier.endZ) / 2
  const midY = pier.height / 2 + pier.storeyIndex * DEFAULT_STOREY_HEIGHT
  const angle = -Math.atan2(dx, dz)
  const mat = pier.type === 'external' ? WALL_EXT_MAT : WALL_INT_MAT

  return (
    <mesh position={[midX, midY, midZ]} rotation={[0, angle, 0]} castShadow receiveShadow material={mat}>
      <boxGeometry args={[length, pier.height, pier.thickness]} />
    </mesh>
  )
}

function SlabMesh({ slab }: { slab: FloorSlab }) {
  return (
    <mesh position={[slab.centerX, slab.yOffset + slab.thickness / 2, slab.centerZ]} receiveShadow material={SLAB_MAT}>
      <boxGeometry args={[slab.width, slab.thickness, slab.depth]} />
    </mesh>
  )
}

function DoorMesh({ op }: { op: Opening3d }) {
  // Door leaf: thin rectangle within the opening, floor to height
  const leafH = op.height - 0.05 // small gap at top
  const leafW = op.width - 0.06
  const leafY = op.centerY + leafH / 2

  // Frame: two vertical jambs + header
  const frameDepth = 0.05
  const jambW = 0.03

  return (
    <group position={[op.centerX, 0, op.centerZ]} rotation={[0, op.wallAngle, 0]}>
      {/* Door leaf */}
      <mesh position={[0, leafY, 0]} castShadow material={DOOR_LEAF_MAT}>
        <boxGeometry args={[leafW, leafH, op.wallThickness * 0.9]} />
      </mesh>
      {/* Left jamb */}
      <mesh position={[-op.width / 2 + jambW / 2, op.centerY + op.height / 2, 0]} material={DOOR_FRAME_MAT}>
        <boxGeometry args={[jambW, op.height, frameDepth]} />
      </mesh>
      {/* Right jamb */}
      <mesh position={[op.width / 2 - jambW / 2, op.centerY + op.height / 2, 0]} material={DOOR_FRAME_MAT}>
        <boxGeometry args={[jambW, op.height, frameDepth]} />
      </mesh>
      {/* Header */}
      <mesh position={[0, op.centerY + op.height - jambW / 2, 0]} material={DOOR_FRAME_MAT}>
        <boxGeometry args={[op.width, jambW, frameDepth]} />
      </mesh>
    </group>
  )
}

function WindowMesh({ op }: { op: Opening3d }) {
  const glassY = op.centerY + op.sillHeight + op.height / 2
  const frameDepth = 0.04
  const frameW = 0.03

  return (
    <group position={[op.centerX, 0, op.centerZ]} rotation={[0, op.wallAngle, 0]}>
      {/* Glass pane */}
      <mesh position={[0, glassY, 0]} material={WINDOW_GLASS_MAT}>
        <boxGeometry args={[op.width - 0.06, op.height - 0.06, op.wallThickness * 0.85]} />
      </mesh>
      {/* Frame – left jamb */}
      <mesh position={[-op.width / 2 + frameW / 2, glassY, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[frameW, op.height, frameDepth]} />
      </mesh>
      {/* Frame – right jamb */}
      <mesh position={[op.width / 2 - frameW / 2, glassY, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[frameW, op.height, frameDepth]} />
      </mesh>
      {/* Frame – sill (bottom) */}
      <mesh position={[0, op.centerY + op.sillHeight + frameW / 2, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[op.width, frameW, frameDepth]} />
      </mesh>
      {/* Frame – header (top) */}
      <mesh position={[0, op.centerY + op.sillHeight + op.height - frameW / 2, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[op.width, frameW, frameDepth]} />
      </mesh>
    </group>
  )
}

function AccentEdges({ result }: { result: PlanTo3dResult }) {
  const edgesRef = useRef<THREE.LineSegments>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pts: THREE.Vector3[] = []
    const storeyCount = result.slabs.length
    for (let si = 0; si < storeyCount; si++) {
      const yBase = si * DEFAULT_STOREY_HEIGHT
      const w = result.bounds.width
      const d = result.bounds.depth
      const ys = [yBase, yBase + DEFAULT_STOREY_HEIGHT]
      for (const y of ys) {
        pts.push(new THREE.Vector3(0, y, 0), new THREE.Vector3(w, y, 0))
        pts.push(new THREE.Vector3(w, y, 0), new THREE.Vector3(w, y, d))
        pts.push(new THREE.Vector3(w, y, d), new THREE.Vector3(0, y, d))
        pts.push(new THREE.Vector3(0, y, d), new THREE.Vector3(0, y, 0))
      }
      pts.push(
        new THREE.Vector3(0, yBase, 0), new THREE.Vector3(0, yBase + DEFAULT_STOREY_HEIGHT, 0),
        new THREE.Vector3(w, yBase, 0), new THREE.Vector3(w, yBase + DEFAULT_STOREY_HEIGHT, 0),
        new THREE.Vector3(w, yBase, d), new THREE.Vector3(w, yBase + DEFAULT_STOREY_HEIGHT, d),
        new THREE.Vector3(0, yBase, d), new THREE.Vector3(0, yBase + DEFAULT_STOREY_HEIGHT, d),
      )
    }
    const positions = new Float32Array(pts.flatMap((v) => [v.x, v.y, v.z]))
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [result])

  return (
    <lineSegments ref={edgesRef} geometry={geometry}>
      <lineBasicMaterial color="#8B5CF6" opacity={0.35} transparent />
    </lineSegments>
  )
}

// — Scene —

function Scene({ result }: { result: PlanTo3dResult }) {
  const target = useMemo(
    () => new THREE.Vector3(result.bounds.width / 2, result.bounds.totalHeight / 2, result.bounds.depth / 2),
    [result],
  )

  return (
    <>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[result.bounds.width / 2, -0.01, result.bounds.depth / 2]} receiveShadow>
        <planeGeometry args={[Math.max(result.bounds.width * 3, 30), Math.max(result.bounds.depth * 3, 30)]} />
        <meshStandardMaterial color="#1e293b" roughness={1} />
      </mesh>

      <gridHelper
        args={[Math.max(result.bounds.width * 2, 30), 20, '#334155', '#1e293b']}
        position={[result.bounds.width / 2, 0, result.bounds.depth / 2]}
      />

      {/* Slabs */}
      {result.slabs.map((s) => <SlabMesh key={`slab-${s.storeyIndex}`} slab={s} />)}

      {/* Wall piers (split to create openings) */}
      {result.walls.map((w) => <WallPierMesh key={`${w.pierId}-${w.storeyIndex}`} pier={w} />)}

      {/* Doors */}
      {result.openings.filter((o) => o.kind === 'door').map((o) => (
        <DoorMesh key={`door-${o.openingId}`} op={o} />
      ))}

      {/* Windows */}
      {result.openings.filter((o) => o.kind === 'window').map((o) => (
        <WindowMesh key={`win-${o.openingId}`} op={o} />
      ))}

      <AccentEdges result={result} />

      <OrbitControls enableDamping dampingFactor={0.12} target={target} minDistance={3} maxDistance={60} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[15, 20, 10]} intensity={1.2} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
      />
      <hemisphereLight args={['#94a3b8', '#1e293b', 0.4]} />
    </>
  )
}

// — Main component —

export function BimModel3D({ plan, design, height = 480 }: BimModel3DProps) {
  const numberOfStoreys = design?.floors ?? 1

  const result = useMemo(() => planTo3d(plan, numberOfStoreys), [plan, numberOfStoreys])

  // Empty state
  if (!plan || result.walls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60" style={{ height }}>
        <p className="max-w-md text-center text-sm text-slate-400">
          Select a design and generate a floor plan to view the 3D BIM model
        </p>
        <span className="text-[10px] text-cyan-400/60">
          Use the AI Brief panel to describe your project, then select a design option
        </span>
      </div>
    )
  }

  const maxDim = Math.max(result.bounds.width, result.bounds.depth, 5)
  const camDist = maxDim * 1.8
  const camHeight = result.bounds.totalHeight + camDist * 0.5

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <Canvas
        camera={{
          position: [result.bounds.width / 2 + camDist * 0.6, camHeight, result.bounds.depth / 2 + camDist * 0.6],
          fov: 40,
        }}
        shadows
        style={{ height }}
        gl={{ antialias: true }}
      >
        <Scene result={result} />
      </Canvas>
    </div>
  )
}
