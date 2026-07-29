import { useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import { planTo3d, DEFAULT_STOREY_HEIGHT } from '@/adapters/planTo3d'
import type { PlanTo3dResult, Opening3d } from '@/adapters/planTo3d'

const WALL_EXT_MAT = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.7, metalness: 0.05 })
const WALL_INT_MAT = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.8, metalness: 0.0 })
const SLAB_MAT = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.9, metalness: 0.0 })
const DOOR_LEAF_MAT = new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.6, metalness: 0.05 })
const DOOR_FRAME_MAT = new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.7, metalness: 0.0 })
const WINDOW_GLASS_MAT = new THREE.MeshStandardMaterial({
  color: '#7dd3fc', transparent: true, opacity: 0.5, depthWrite: false,
  side: THREE.DoubleSide, roughness: 0.1, metalness: 0.0,
  emissive: '#06b6d4', emissiveIntensity: 0.15,
})
const WINDOW_FRAME_MAT = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.7, metalness: 0.0 })
const ROOF_MAT = new THREE.MeshStandardMaterial({ color: '#a0522d', roughness: 0.85, metalness: 0.0 })
const CEILING_MAT = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9, metalness: 0.0 })

function buildScene(result: PlanTo3dResult): THREE.Group {
  const group = new THREE.Group()

  for (const slab of result.slabs) {
    const geo = new THREE.BoxGeometry(slab.width, slab.thickness, slab.depth)
    const mesh = new THREE.Mesh(geo, SLAB_MAT)
    mesh.position.set(slab.centerX, slab.yOffset, slab.centerZ)
    mesh.userData.type = 'slab'
    mesh.userData.storeyIndex = slab.storeyIndex
    group.add(mesh)
  }

  for (const pier of result.walls) {
    const dx = pier.endX - pier.startX
    const dz = pier.endZ - pier.startZ
    const length = Math.hypot(dx, dz) || 0.001
    const midX = (pier.startX + pier.endX) / 2
    const midZ = (pier.startZ + pier.endZ) / 2
    const midY = pier.height / 2 + pier.storeyIndex * DEFAULT_STOREY_HEIGHT
    const angle = Math.atan2(dz, dx)

    const geo = new THREE.BoxGeometry(length, pier.height, pier.thickness)
    const mat = pier.type === 'external' ? WALL_EXT_MAT : WALL_INT_MAT
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(midX, midY, midZ)
    mesh.rotation.y = -angle
    mesh.userData.type = 'wall'
    mesh.userData.storeyIndex = pier.storeyIndex
    group.add(mesh)
  }

  for (const ceil of result.ceilings) {
    const geo = new THREE.BoxGeometry(ceil.width, 0.1, ceil.depth)
    const mesh = new THREE.Mesh(geo, CEILING_MAT)
    mesh.position.set(ceil.centerX, ceil.yOffset, ceil.centerZ)
    mesh.userData.type = 'ceiling'
    mesh.userData.storeyIndex = ceil.storeyIndex
    group.add(mesh)
  }

  for (const opening of result.openings) {
    const doorMesh = _buildDoorMesh(opening)
    if (doorMesh) group.add(doorMesh)
    const winMesh = _buildWindowMesh(opening)
    if (winMesh) group.add(winMesh)
  }

  if (result.roof) {
    const r = result.roof
    const apexY = r.eaveY + r.pitchHeight
    const oh = r.overhang
    const bw = r.buildingWidth
    const bd = r.buildingDepth

    const roofGroup = new THREE.Group()
    const vertices: number[] = []
    const indices: number[] = []

    if (r.ridgeAxis === 'x') {
      const zRidge = bd / 2
      vertices.push(
        -oh, r.eaveY, -oh,
        bw + oh, r.eaveY, -oh,
        bw + oh, r.eaveY, bd + oh,
        -oh, r.eaveY, bd + oh,
        -oh, apexY, zRidge,
        bw + oh, apexY, zRidge,
      )
      indices.push(0, 1, 5, 0, 5, 4, 3, 2, 5, 3, 5, 4, 0, 3, 4, 1, 2, 5)
    } else {
      const xRidge = bw / 2
      vertices.push(
        -oh, r.eaveY, -oh,
        bw + oh, r.eaveY, -oh,
        bw + oh, r.eaveY, bd + oh,
        -oh, r.eaveY, bd + oh,
        xRidge, apexY, -oh,
        xRidge, apexY, bd + oh,
      )
      indices.push(1, 2, 5, 1, 5, 4, 0, 3, 5, 0, 5, 4, 0, 1, 4, 3, 2, 5)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, ROOF_MAT)
    roofGroup.add(mesh)
    roofGroup.position.set(0, 0, 0)
    group.add(roofGroup)
  }

  return group
}

function _buildDoorMesh(opening: Opening3d): THREE.Group | null {
  if (opening.kind !== 'door') return null
  const doorGroup = new THREE.Group()
  const frameDepth = 0.08
  const leafThick = 0.04
  const frameW = 0.06

  const frameMat = DOOR_FRAME_MAT
  const leafMat = DOOR_LEAF_MAT
  const h = opening.height
  const w = opening.width

  const jambGeo = new THREE.BoxGeometry(frameW, h, frameDepth)
  const leftJamb = new THREE.Mesh(jambGeo, frameMat)
  leftJamb.position.set(-w / 2 + frameW / 2, h / 2, 0)
  doorGroup.add(leftJamb)
  const rightJamb = new THREE.Mesh(jambGeo, frameMat)
  rightJamb.position.set(w / 2 - frameW / 2, h / 2, 0)
  doorGroup.add(rightJamb)

  const headerGeo = new THREE.BoxGeometry(w - frameW * 2, frameW, frameDepth)
  const header = new THREE.Mesh(headerGeo, frameMat)
  header.position.set(0, h - frameW / 2, 0)
  doorGroup.add(header)

  const leafGeo = new THREE.BoxGeometry(w - frameW * 2 - 0.01, h - frameW - 0.01, leafThick)
  const leaf = new THREE.Mesh(leafGeo, leafMat)
  leaf.position.set(0, (h - frameW) / 2, 0.01)
  doorGroup.add(leaf)

  const doorGroupPos = new THREE.Group()
  doorGroupPos.add(doorGroup)
  doorGroupPos.position.set(opening.centerX, opening.sillHeight, opening.centerZ)
  doorGroupPos.rotation.y = -opening.wallAngle
  return doorGroupPos
}

function _buildWindowMesh(opening: Opening3d): THREE.Group | null {
  if (opening.kind !== 'window') return null
  const winGroup = new THREE.Group()
  const frameW = 0.05
  const h = opening.height
  const w = opening.width

  const outerFrameMat = WINDOW_FRAME_MAT
  const glassMat = WINDOW_GLASS_MAT

  const glassGeo = new THREE.BoxGeometry(w - frameW * 2, h - frameW * 2, 0.02)
  const glass = new THREE.Mesh(glassGeo, glassMat)
  winGroup.add(glass)

  const topGeo = new THREE.BoxGeometry(w, frameW, 0.06)
  const top = new THREE.Mesh(topGeo, outerFrameMat)
  top.position.set(0, h / 2 - frameW / 2, 0)
  winGroup.add(top)
  const bottomGeo = new THREE.BoxGeometry(w, frameW, 0.06)
  const bottom = new THREE.Mesh(bottomGeo, outerFrameMat)
  bottom.position.set(0, -h / 2 + frameW / 2, 0)
  winGroup.add(bottom)
  const leftGeo = new THREE.BoxGeometry(frameW, h, 0.06)
  const left = new THREE.Mesh(leftGeo, outerFrameMat)
  left.position.set(-w / 2 + frameW / 2, 0, 0)
  winGroup.add(left)
  const rightGeo = new THREE.BoxGeometry(frameW, h, 0.06)
  const right = new THREE.Mesh(rightGeo, outerFrameMat)
  right.position.set(w / 2 - frameW / 2, 0, 0)
  winGroup.add(right)

  const winGroupPos = new THREE.Group()
  winGroupPos.add(winGroup)
  winGroupPos.position.set(opening.centerX, opening.sillHeight + opening.height / 2, opening.centerZ)
  winGroupPos.rotation.y = -opening.wallAngle
  return winGroupPos
}

export function useGlbExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [glbUrl, setGlbUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  const generate = useCallback(async (plan: PlanModel | null, design: DesignOption | null) => {
    if (!plan || !design) {
      setError('No plan or design data available')
      return null
    }

    setIsExporting(true)
    setError(null)

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }

    try {
      const result = planTo3d(plan, design.floors)
      const scene = buildScene(result)

      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter')
      const exporter = new GLTFExporter()

      const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          scene,
          (data) => resolve(data as ArrayBuffer),
          (err: Error) => reject(err),
          { binary: true },
        )
      })

      const blob = new Blob([glb], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      try { if (mountedRef.current) { setGlbUrl(url); setIsExporting(false) } } catch {}
      return url
    } catch (err) {
      try {
        if (mountedRef.current) {
          const msg = err instanceof Error ? err.message : 'GLB generation failed'
          setError(msg)
          setIsExporting(false)
        }
      } catch {}
      return null
    }
  }, [])

  const download = useCallback(async (plan: PlanModel | null, design: DesignOption | null) => {
    const url = await generate(plan, design)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `bim-model-${plan?.id ?? 'export'}.glb`
    a.click()
  }, [generate])

  const revoke = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setGlbUrl(null)
  }, [])

  return { glbUrl, isExporting, error, generate, download, revoke }
}
