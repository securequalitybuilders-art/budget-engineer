import { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

import { registerSnapshotCapture, unregisterSnapshotCapture } from '@/lib/3d-snapshot'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { planTo3d, DEFAULT_STOREY_HEIGHT } from '@/adapters/planTo3d'
import type { PlanTo3dResult, WallPier, FloorSlab, Opening3d, RoofParams, CeilingSlab } from '@/adapters/planTo3d'
import { Button } from '@/components/ui/Button'
import { Download, ArrowLeft } from 'lucide-react'
import { computeVisibility } from './viewMode'
import type { ViewMode } from './viewMode'
import { computeRoomFocus } from './roomFocus'
import { computeWalkStart, clampToFootprint } from './walkthrough'

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
  color: '#7dd3fc',
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  side: THREE.DoubleSide,
  roughness: 0.1,
  metalness: 0.0,
  emissive: '#06b6d4',
  emissiveIntensity: 0.15,
})
const WINDOW_FRAME_MAT = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  roughness: 0.7,
  metalness: 0.0,
})
const ROOF_MAT = new THREE.MeshStandardMaterial({
  color: '#a0522d', roughness: 0.85, metalness: 0.0,
})
const CEILING_MAT = new THREE.MeshStandardMaterial({
  color: '#334155', roughness: 0.9, metalness: 0.0,
})

interface BimModel3DProps {
  plan: PlanModel | null
  design: DesignOption | null
  height?: number
  viewMode?: ViewMode
  visibleStorey?: number | 'all'
  focusedRoomId?: string | null
  onBack?: () => void
  onExitWalk?: () => void
}

// ── Mesh sub-components ──

function WallPierMesh({ pier, wallOpacity }: { pier: WallPier; wallOpacity: number }) {
  const dx = pier.endX - pier.startX
  const dz = pier.endZ - pier.startZ
  const length = Math.hypot(dx, dz) || 0.001
  const midX = (pier.startX + pier.endX) / 2
  const midZ = (pier.startZ + pier.endZ) / 2
  const midY = pier.height / 2 + pier.storeyIndex * DEFAULT_STOREY_HEIGHT
  const angle = Math.atan2(dz, dx)
  const mat = useMemo(() => {
    const col = pier.type === 'external' ? '#94a3b8' : '#cbd5e1'
    if (wallOpacity >= 1) return pier.type === 'external' ? WALL_EXT_MAT : WALL_INT_MAT
    const m = new THREE.MeshStandardMaterial({
      color: col, roughness: 0.7, metalness: pier.type === 'external' ? 0.05 : 0.0,
      transparent: true, opacity: wallOpacity, depthWrite: false,
    })
    return m
  }, [pier.type, wallOpacity])

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

function CeilingMesh({ ceiling }: { ceiling: CeilingSlab }) {
  return (
    <mesh position={[ceiling.centerX, ceiling.yOffset + ceiling.thickness / 2, ceiling.centerZ]} material={CEILING_MAT}>
      <boxGeometry args={[ceiling.width, ceiling.thickness, ceiling.depth]} />
    </mesh>
  )
}

function DoorMesh({ op }: { op: Opening3d }) {
  const leafH = op.height - 0.05
  const leafW = op.width - 0.06
  const frameDepth = 0.06
  const jambW = 0.06

  return (
    <group position={[op.centerX, op.centerY, op.centerZ]} rotation={[0, op.wallAngle, 0]}>
      <mesh position={[0, leafH / 2, 0]} castShadow material={DOOR_LEAF_MAT}>
        <boxGeometry args={[leafW, leafH, op.wallThickness * 0.9]} />
      </mesh>
      <mesh position={[-op.width / 2 + jambW / 2, op.height / 2, 0]} material={DOOR_FRAME_MAT}>
        <boxGeometry args={[jambW, op.height, frameDepth]} />
      </mesh>
      <mesh position={[op.width / 2 - jambW / 2, op.height / 2, 0]} material={DOOR_FRAME_MAT}>
        <boxGeometry args={[jambW, op.height, frameDepth]} />
      </mesh>
      <mesh position={[0, op.height - jambW / 2, 0]} material={DOOR_FRAME_MAT}>
        <boxGeometry args={[op.width, jambW, frameDepth]} />
      </mesh>
    </group>
  )
}

function WindowMesh({ op }: { op: Opening3d }) {
  const glassZ = op.wallThickness * 0.5
  const glassY = op.sillHeight + op.height / 2
  const ft = 0.06
  const hh = op.height
  const ww = op.width
  const ss = op.sillHeight
  return (
    <group position={[op.centerX, op.centerY, op.centerZ]} rotation={[0, op.wallAngle, 0]}>
      <mesh position={[0, glassY, 0]} renderOrder={1} material={WINDOW_GLASS_MAT}>
        <boxGeometry args={[ww, hh, glassZ]} />
      </mesh>
      <mesh position={[0, ss + hh - ft / 2, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[ww + ft * 2, ft, ft]} />
      </mesh>
      <mesh position={[0, ss + ft / 2, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[ww + ft * 2, ft, ft]} />
      </mesh>
      <mesh position={[-ww / 2 - ft / 2, ss + hh / 2, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[ft, hh + ft * 2, ft]} />
      </mesh>
      <mesh position={[ww / 2 + ft / 2, ss + hh / 2, 0]} material={WINDOW_FRAME_MAT}>
        <boxGeometry args={[ft, hh + ft * 2, ft]} />
      </mesh>
    </group>
  )
}

function RoofMesh({ roof }: { roof: RoofParams }) {
  const geometry = useMemo(() => {
    const { ridgeAxis, overhang, eaveY, pitchHeight, buildingWidth, buildingDepth } = roof
    const apexY = eaveY + pitchHeight
    const oh = overhang
    const bw = buildingWidth
    const bd = buildingDepth
    const vertices: number[] = []
    const indices: number[] = []

    if (ridgeAxis === 'x') {
      const zRidge = bd / 2
      const v = [
        -oh, eaveY, -oh,
        bw + oh, eaveY, -oh,
        bw + oh, eaveY, bd + oh,
        -oh, eaveY, bd + oh,
        -oh, apexY, zRidge,
        bw + oh, apexY, zRidge,
      ]
      vertices.push(...v)
      indices.push(0, 1, 5, 0, 5, 4)
      indices.push(3, 2, 5, 3, 5, 4)
      indices.push(0, 3, 4)
      indices.push(1, 2, 5)
    } else {
      const xRidge = bw / 2
      const v = [
        -oh, eaveY, -oh,
        bw + oh, eaveY, -oh,
        bw + oh, eaveY, bd + oh,
        -oh, eaveY, bd + oh,
        xRidge, apexY, -oh,
        xRidge, apexY, bd + oh,
      ]
      vertices.push(...v)
      indices.push(1, 2, 5, 1, 5, 4)
      indices.push(0, 3, 5, 0, 5, 4)
      indices.push(0, 1, 4)
      indices.push(3, 2, 5)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [roof])

  return <mesh geometry={geometry} material={ROOF_MAT} castShadow receiveShadow />
}

function SnapshotCapture() {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    registerSnapshotCapture(() => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    })
    return () => unregisterSnapshotCapture()
  }, [gl, scene, camera])

  return null
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

// ── WalkController ──

interface WalkControllerProps {
  bounds: { width: number; depth: number }
  plan: PlanModel | null
  onPointerLockChange: (locked: boolean) => void
}

function WalkController({ bounds, plan, onPointerLockChange }: WalkControllerProps) {
  const camera = useThree(s => s.camera)
  const gl = useThree(s => s.gl)
  const invalidate = useThree(s => s.invalidate)
  const keysRef = useRef<Set<string>>(new Set())
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const isLockedRef = useRef(false)
  const initDoneRef = useRef(false)

  // Place camera at walk start on mount
  useEffect(() => {
    const start = computeWalkStart(plan)
    if (start) {
      camera.position.set(start.position[0], start.position[1], start.position[2])
    } else {
      const cx = bounds.width / 2
      const cz = bounds.depth / 2
      camera.position.set(cx, 1.6, cz)
    }
    // Face toward centre of bounds
    const dx = bounds.width / 2 - camera.position.x
    const dz = bounds.depth / 2 - camera.position.z
    yawRef.current = Math.atan2(-dx, -dz)
    pitchRef.current = 0
    initDoneRef.current = true
    invalidate()
  }, [bounds, plan, camera, invalidate])

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current.add(e.code) }
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.code) }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Pointer lock change
  useEffect(() => {
    const canvas = gl.domElement
    const onChange = () => {
      const locked = document.pointerLockElement === canvas
      isLockedRef.current = locked
      onPointerLockChange(locked)
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [gl, onPointerLockChange])

  // Mouse look (relative movement while pointer locked)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isLockedRef.current) return
      yawRef.current -= e.movementX * 0.002
      pitchRef.current -= e.movementY * 0.002
      pitchRef.current = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitchRef.current))
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Click canvas to lock pointer
  useEffect(() => {
    const canvas = gl.domElement
    const onClick = () => {
      if (!isLockedRef.current) {
        canvas.requestPointerLock()
      }
    }
    canvas.addEventListener('click', onClick)
    return () => canvas.removeEventListener('click', onClick)
  }, [gl])

  // Movement + camera update each frame
  useFrame((_, delta) => {
    if (!initDoneRef.current) return

    const speed = 3
    const keys = keysRef.current
    const forward = new THREE.Vector3(-Math.sin(yawRef.current), 0, -Math.cos(yawRef.current))
    const right = new THREE.Vector3(forward.z, 0, -forward.x)

    const move = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp')) move.add(forward)
    if (keys.has('KeyS') || keys.has('ArrowDown')) move.sub(forward)
    if (keys.has('KeyA') || keys.has('ArrowLeft')) move.sub(right)
    if (keys.has('KeyD') || keys.has('ArrowRight')) move.add(right)

    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed * delta)
      camera.position.add(move)
    }

    // Clamp to footprint
    const clamped = clampToFootprint(
      [camera.position.x, camera.position.y, camera.position.z],
      bounds,
    )
    camera.position.x = clamped[0]
    camera.position.y = 1.6
    camera.position.z = clamped[2]

    // Camera look direction
    const euler = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ')
    camera.quaternion.setFromEuler(euler)

    invalidate()
  })

  return null
}

// ── Helpers ──

function shouldShowStorey(
  item: { storeyIndex: number },
  storeysToShow: number[] | 'all',
): boolean {
  return storeysToShow === 'all' || storeysToShow.includes(item.storeyIndex)
}

// ── Scene ──

interface SceneProps {
  result: PlanTo3dResult
  buildingRef: React.MutableRefObject<THREE.Group | null>
  wallOpacity: number
  showRoof: boolean
  showCeilings: boolean
  storeysToShow: number[] | 'all'
  viewMode: ViewMode
  focusedRoomId: string | null | undefined
  plan: PlanModel | null
  onPointerLockChange?: (locked: boolean) => void
}

function Scene({ result, buildingRef, wallOpacity, showRoof, showCeilings, storeysToShow, viewMode, focusedRoomId, plan, onPointerLockChange }: SceneProps) {
  const camera = useThree(s => s.camera)
  const invalidate = useThree(s => s.invalidate)
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls> | null>(null)

  const target = useMemo(
    () => new THREE.Vector3(result.bounds.width / 2, result.bounds.totalHeight / 2, result.bounds.depth / 2),
    [result],
  )

  // ── Room focus camera animation ──
  const animRef = useRef<{
    startTime: number
    fromTarget: THREE.Vector3
    toTarget: THREE.Vector3
    fromPos: THREE.Vector3
    toPos: THREE.Vector3
  } | null>(null)
  const wasFocused = useRef(false)

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return

    if (focusedRoomId && plan) {
      const storeyIdx = storeysToShow === 'all' ? 0 : storeysToShow[0]
      const focus = computeRoomFocus(plan, focusedRoomId, storeyIdx)
      if (!focus) return

      wasFocused.current = true
      animRef.current = {
        startTime: performance.now(),
        fromTarget: c.target.clone(),
        toTarget: new THREE.Vector3(...focus.target),
        fromPos: camera.position.clone(),
        toPos: new THREE.Vector3(...focus.cameraPos),
      }
      invalidate()
    } else if (!focusedRoomId && wasFocused.current) {
      wasFocused.current = false
      const b = result.bounds
      const cx = b.width / 2
      const cz = b.depth / 2
      const maxDim = Math.max(b.width, b.depth, 5)
      const tx = cx
      let ty = b.totalHeight / 2
      const tz = cz
      let px = cx + maxDim * 0.6
      let py = b.totalHeight * 0.5 + maxDim * 0.3
      let pz = cz + maxDim * 0.6

      if (viewMode === 'dollhouse') {
        ty = b.totalHeight * 0.3
        px = cx + maxDim * 0.1
        py = b.totalHeight + maxDim * 0.8
        pz = cz + maxDim * 0.6
      }

      animRef.current = {
        startTime: performance.now(),
        fromTarget: c.target.clone(),
        toTarget: new THREE.Vector3(tx, ty, tz),
        fromPos: camera.position.clone(),
        toPos: new THREE.Vector3(px, py, pz),
      }
      invalidate()
    }
  }, [focusedRoomId, plan, camera, invalidate, result.bounds, viewMode, storeysToShow])

  // Adjust camera when view mode changes (skip if room focus is active or walk mode)
  useEffect(() => {
    if (focusedRoomId || animRef.current || viewMode === 'walk') return
    const c = controlsRef.current
    if (!c) return
    const b = result.bounds
    const cx = b.width / 2
    const cz = b.depth / 2
    const maxDim = Math.max(b.width, b.depth, 5)

    if (viewMode === 'dollhouse') {
      c.target.set(cx, b.totalHeight * 0.3, cz)
      camera.position.set(
        cx + maxDim * 0.1,
        b.totalHeight + maxDim * 0.8,
        cz + maxDim * 0.6,
      )
    } else {
      c.target.set(cx, b.totalHeight / 2, cz)
      camera.position.set(
        cx + maxDim * 0.6,
        b.totalHeight * 0.5 + maxDim * 0.3,
        cz + maxDim * 0.6,
      )
    }
    c.update()
    invalidate()
  }, [viewMode, result.bounds, camera, invalidate, focusedRoomId])

  // Camera lerp on each frame during animation
  useFrame(() => {
    const anim = animRef.current
    if (!anim) return
    const c = controlsRef.current
    if (!c) return

    const elapsed = (performance.now() - anim.startTime) / 1000
    const t = Math.min(elapsed / 0.6, 1)
    // smoothstep
    const ease = t * t * (3 - 2 * t)

    c.target.lerpVectors(anim.fromTarget, anim.toTarget, ease)
    camera.position.lerpVectors(anim.fromPos, anim.toPos, ease)
    c.update()
    invalidate()

    if (t >= 1) {
      animRef.current = null
    }
  })

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[result.bounds.width / 2, -0.01, result.bounds.depth / 2]} receiveShadow>
        <planeGeometry args={[Math.max(result.bounds.width * 3, 30), Math.max(result.bounds.depth * 3, 30)]} />
        <meshStandardMaterial color="#1e293b" roughness={1} />
      </mesh>

      <gridHelper
        args={[Math.max(result.bounds.width * 2, 30), 20, '#334155', '#1e293b']}
        position={[result.bounds.width / 2, 0, result.bounds.depth / 2]}
      />

      <group ref={buildingRef}>
        {result.slabs
          .filter((s) => shouldShowStorey(s, storeysToShow))
          .map((s) => <SlabMesh key={`slab-${s.storeyIndex}`} slab={s} />)}

        {result.ceilings
          .filter((c) => showCeilings && shouldShowStorey(c, storeysToShow))
          .map((c) => <CeilingMesh key={`ceil-${c.roomId}-${c.storeyIndex}`} ceiling={c} />)}

        {result.walls
          .filter((w) => shouldShowStorey(w, storeysToShow))
          .map((w) => <WallPierMesh key={`${w.pierId}-${w.storeyIndex}`} pier={w} wallOpacity={wallOpacity} />)}

        {result.openings
          .filter((o) => o.kind === 'door' && shouldShowStorey(o, storeysToShow))
          .map((o) => <DoorMesh key={`door-${o.openingId}-s${o.storeyIndex}`} op={o} />)}

        {result.openings
          .filter((o) => o.kind === 'window' && shouldShowStorey(o, storeysToShow))
          .map((o) => <WindowMesh key={`win-${o.openingId}-s${o.storeyIndex}`} op={o} />)}

        {showRoof && result.roof && <RoofMesh roof={result.roof} />}
      </group>

      <AccentEdges result={result} />

      {viewMode === 'walk' ? (
        <WalkController bounds={result.bounds} plan={plan} onPointerLockChange={onPointerLockChange ?? (() => {})} />
      ) : (
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.12} target={target} minDistance={1} maxDistance={60} />
      )}

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

// ── Main component ──

export function BimModel3D({ plan, design, height = 480, viewMode = 'full', visibleStorey = 'all', focusedRoomId, onBack, onExitWalk }: BimModel3DProps) {
  const numberOfStoreys = design?.floors ?? 1
  const buildingRef = useRef<THREE.Group | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const [pointerLocked, setPointerLocked] = useState(false)
  const isWalkMode = viewMode === 'walk'

  const handleCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    const canvas = state.gl.domElement
    const onContextLost = (e: Event) => {
      e.preventDefault()
      setContextLost(true)
    }
    const onContextRestored = () => {
      setContextLost(false)
    }
    ;(canvas as unknown as EventTarget).addEventListener('webglcontextlost', onContextLost)
    ;(canvas as unknown as EventTarget).addEventListener('webglcontextrestored', onContextRestored)
  }, [])

  const result = useMemo(() => planTo3d(plan, numberOfStoreys), [plan, numberOfStoreys])

  const vis = useMemo(
    () => computeVisibility(viewMode, visibleStorey, numberOfStoreys),
    [viewMode, visibleStorey, numberOfStoreys],
  )

  const handleExport = useCallback(async () => {
    if (!buildingRef.current) return
    setIsExporting(true)
    try {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter')
      const exporter = new GLTFExporter()
      exporter.parse(
        buildingRef.current,
          (glb) => {
            const blob = new Blob([glb as ArrayBuffer], { type: 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `bim-model-${plan?.id ?? 'export'}.glb`
          a.click()
          URL.revokeObjectURL(url)
          setIsExporting(false)
        },
        (error: Error) => {
          console.error('GLTF export failed:', error)
          setIsExporting(false)
        },
        { binary: true },
      )
    } catch (err) {
      console.error('GLTFExporter load failed:', err)
      setIsExporting(false)
    }
  }, [plan?.id])

  const handleBack = useCallback(() => {
    onBack?.()
  }, [onBack])

  const handlePointerLockChange = useCallback((locked: boolean) => {
    setPointerLocked(locked)
  }, [])

  const handleExitWalk = useCallback(() => {
    onExitWalk?.()
  }, [onExitWalk])

  if (contextLost) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/80 p-6"
        style={{ height }}
      >
        <p className="max-w-md text-center text-sm text-stone-300">
          3D rendering context was lost. Your drawings, 2D plan, BOQ, and exports still work.
        </p>
        <p className="max-w-md text-center text-xs text-stone-400">
          Reload the page or switch to the Plan or Drawings view.
        </p>
      </div>
    )
  }

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
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <Canvas
        camera={{
          position: [result.bounds.width / 2 + camDist * 0.6, camHeight, result.bounds.depth / 2 + camDist * 0.6],
          fov: 40,
        }}
        shadows
        style={{ height }}
        onCreated={handleCreated}
        frameloop="demand"
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
      >
        <Scene
          result={result}
          buildingRef={buildingRef}
          wallOpacity={vis.wallOpacity}
          showRoof={vis.showRoof}
          showCeilings={vis.showCeilings}
          storeysToShow={vis.storeysToShow}
          viewMode={viewMode}
          focusedRoomId={focusedRoomId}
          plan={plan}
          onPointerLockChange={handlePointerLockChange}
        />
        <SnapshotCapture />
      </Canvas>

      {/* Walk mode overlay when pointer is not locked */}
      {isWalkMode && !pointerLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-[2px]">
          <p className="text-sm text-stone-200">Click the 3D view to enter walk mode</p>
          <p className="text-[11px] text-stone-400">WASD / Arrow keys to move · Mouse to look around</p>
          <button
            onClick={handleExitWalk}
            className="rounded-md bg-cyan-700 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-cyan-600"
            aria-label="Exit walkthrough mode"
          >
            Exit Walkthrough
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/10 px-4 py-2">
        {isWalkMode ? (
          <button
            onClick={handleExitWalk}
            className="rounded-md bg-cyan-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-cyan-600"
            aria-label="Exit walkthrough mode"
          >
            Exit Walkthrough
          </button>
        ) : focusedRoomId && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 text-[11px]"
            onClick={handleBack}
            title="Return to full building view"
          >
            <ArrowLeft size={14} />
            Back
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 text-[11px]"
          onClick={handleExport}
          disabled={isExporting}
          title="Download 3D BIM model (opens in Blender, Windows 3D Viewer, etc.)"
        >
          <Download size={14} />
          {isExporting ? 'Preparing model...' : 'Download 3D model (.glb)'}
        </Button>
      </div>
    </div>
  )
}
