import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { planTo3d, DEFAULT_STOREY_HEIGHT } from '@/adapters/planTo3d'
import type { PlanTo3dResult, WallSolid, FloorSlab } from '@/adapters/planTo3d'

// ── Brand palette materials (PBR) ──
const WALL_EXTERIOR_MAT = new THREE.MeshStandardMaterial({
  color: '#94a3b8',
  roughness: 0.7,
  metalness: 0.05,
})

const WALL_INTERIOR_MAT = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  roughness: 0.8,
  metalness: 0.0,
})

const SLAB_MAT = new THREE.MeshStandardMaterial({
  color: '#475569',
  roughness: 0.9,
  metalness: 0.0,
})

interface BimModel3DProps {
  plan: PlanModel | null
  design: DesignOption | null
  height?: number
}

function WallMesh({ wall }: { wall: WallSolid }) {
  const dx = wall.endX - wall.startX
  const dz = wall.endZ - wall.startZ
  const length = Math.sqrt(dx * dx + dz * dz) || 0.01
  const midX = (wall.startX + wall.endX) / 2
  const midZ = (wall.startZ + wall.endZ) / 2
  const midY = wall.height / 2 + wall.storeyIndex * DEFAULT_STOREY_HEIGHT
  const angle = -Math.atan2(dx, dz)

  const mat = wall.type === 'external' ? WALL_EXTERIOR_MAT : WALL_INTERIOR_MAT

  return (
    <mesh
      position={[midX, midY, midZ]}
      rotation={[0, angle, 0]}
      castShadow
      receiveShadow
      material={mat}
    >
      <boxGeometry args={[length, wall.height, wall.thickness]} />
    </mesh>
  )
}

function SlabMesh({ slab }: { slab: FloorSlab }) {
  return (
    <mesh
      position={[slab.centerX, slab.yOffset + slab.thickness / 2, slab.centerZ]}
      receiveShadow
      material={SLAB_MAT}
    >
      <boxGeometry args={[slab.width, slab.thickness, slab.depth]} />
    </mesh>
  )
}

function AccentEdges({ result }: { result: PlanTo3dResult }) {
  const edgesRef = useRef<THREE.LineSegments>(null)

  // Build a single set of edge lines for the outer bounding box per storey
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pts: THREE.Vector3[] = []
    // Determine how many storeys from result slabs
    const storeyCount = result.slabs.length
    for (let si = 0; si < storeyCount; si++) {
      const yBase = si * DEFAULT_STOREY_HEIGHT
      const w = result.bounds.width
      const d = result.bounds.depth
      // Bottom and top rectangle at each storey
      const ys = [yBase, yBase + DEFAULT_STOREY_HEIGHT]
      for (const y of ys) {
        pts.push(new THREE.Vector3(0, y, 0))
        pts.push(new THREE.Vector3(w, y, 0))
        pts.push(new THREE.Vector3(w, y, 0))
        pts.push(new THREE.Vector3(w, y, d))
        pts.push(new THREE.Vector3(w, y, d))
        pts.push(new THREE.Vector3(0, y, d))
        pts.push(new THREE.Vector3(0, y, d))
        pts.push(new THREE.Vector3(0, y, 0))
      }
      // Vertical corners
      pts.push(new THREE.Vector3(0, yBase, 0))
      pts.push(new THREE.Vector3(0, yBase + DEFAULT_STOREY_HEIGHT, 0))
      pts.push(new THREE.Vector3(w, yBase, 0))
      pts.push(new THREE.Vector3(w, yBase + DEFAULT_STOREY_HEIGHT, 0))
      pts.push(new THREE.Vector3(w, yBase, d))
      pts.push(new THREE.Vector3(w, yBase + DEFAULT_STOREY_HEIGHT, d))
      pts.push(new THREE.Vector3(0, yBase, d))
      pts.push(new THREE.Vector3(0, yBase + DEFAULT_STOREY_HEIGHT, d))
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

function Scene({ result }: { result: PlanTo3dResult }) {
  // Auto-frame camera via OrbitControls target at building center
  const target = useMemo(() => {
    return new THREE.Vector3(
      result.bounds.width / 2,
      result.bounds.totalHeight / 2,
      result.bounds.depth / 2,
    )
  }, [result])

  return (
    <>
      {/* Ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[result.bounds.width / 2, -0.01, result.bounds.depth / 2]}
        receiveShadow
      >
        <planeGeometry args={[Math.max(result.bounds.width * 3, 30), Math.max(result.bounds.depth * 3, 30)]} />
        <meshStandardMaterial color="#1e293b" roughness={1} />
      </mesh>

      {/* Grid */}
      <gridHelper
        args={[Math.max(result.bounds.width * 2, 30), 20, '#334155', '#1e293b']}
        position={[result.bounds.width / 2, 0, result.bounds.depth / 2]}
      />

      {/* Slabs */}
      {result.slabs.map((s) => (
        <SlabMesh key={`slab-${s.storeyIndex}`} slab={s} />
      ))}

      {/* Walls */}
      {result.walls.map((w) => (
        <WallMesh key={`${w.wallId}-${w.storeyIndex}`} wall={w} />
      ))}

      {/* Violet accent edges */}
      <AccentEdges result={result} />

      {/* Camera orbit */}
      <OrbitControls
        enableDamping
        dampingFactor={0.12}
        target={target}
        minDistance={3}
        maxDistance={60}
      />

      {/* Ambient + directional light with shadows */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight args={['#94a3b8', '#1e293b', 0.4]} />
    </>
  )
}

export function BimModel3D({ plan, design, height = 480 }: BimModel3DProps) {
  const numberOfStoreys = design?.floors ?? 1

  const result = useMemo(
    () => planTo3d(plan, numberOfStoreys),
    [plan, numberOfStoreys],
  )

  // Empty state
  if (!plan || result.walls.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60"
        style={{ height }}
      >
        <p className="max-w-md text-center text-sm text-slate-400">
          Select a design and generate a floor plan to view the 3D BIM model
        </p>
        <span className="text-[10px] text-cyan-400/60">
          Use the AI Brief panel to describe your project, then select a design option
        </span>
      </div>
    )
  }

  // Camera position based on building size
  const maxDim = Math.max(result.bounds.width, result.bounds.depth, 5)
  const camDist = maxDim * 1.8
  const camHeight = result.bounds.totalHeight + camDist * 0.5

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <Canvas
        camera={{
          position: [
            result.bounds.width / 2 + camDist * 0.6,
            camHeight,
            result.bounds.depth / 2 + camDist * 0.6,
          ],
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
