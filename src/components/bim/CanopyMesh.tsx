import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import {
  computeCanopy,
  computePerimeterEdges,
  computeSupports,
  computeSpineRibs,
  clampCanopyParams,
} from '@/engine/canopy/canopyGeometry'
import type { CanopyParams } from '@/engine/canopy/canopyGeometry'

// ── Module-level materials (never recreated) ──

const PANEL_MAT = new THREE.MeshStandardMaterial({
  color: '#06B6D4',
  roughness: 0.3,
  metalness: 0.05,
  transparent: true,
  opacity: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false,
})

const RIB_MAT = new THREE.LineBasicMaterial({
  color: '#14b8a6',
  transparent: true,
  opacity: 0.9,
})

const SPINE_MAT = new THREE.MeshStandardMaterial({
  color: '#0d9488',
  roughness: 0.5,
  metalness: 0.3,
})

const BEAM_MAT = new THREE.MeshStandardMaterial({
  color: '#475569',
  roughness: 0.7,
  metalness: 0.3,
})

const COLUMN_MAT = new THREE.MeshStandardMaterial({
  color: '#64748b',
  roughness: 0.6,
  metalness: 0.2,
})

// ── Helpers ──

function disposeBufferAttribute(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null | undefined) {
  if (attr && 'dispose' in attr && typeof attr.dispose === 'function') {
    attr.dispose()
  }
}

function disposeGeometry(geo: THREE.BufferGeometry | null | undefined) {
  if (!geo) return
  disposeBufferAttribute(geo.getAttribute('position'))
  disposeBufferAttribute(geo.getAttribute('normal'))
  disposeBufferAttribute(geo.getAttribute('uv'))
  if (geo.index) {
    disposeBufferAttribute(geo.index)
  }
  geo.dispose()
}

// ── Component ──

interface CanopyMeshProps {
  params: CanopyParams
}

export function CanopyMesh({ params }: CanopyMeshProps) {
  const safe = useMemo(() => clampCanopyParams(params), [params])

  // Build all geometries in one memo
  const geos = useMemo(() => {
    const result = computeCanopy(safe)
    const perimeterEdges = computePerimeterEdges(safe)
    const supports = computeSupports(safe)
    const spineRibs = computeSpineRibs(safe)

    let surfaceGeo: THREE.BufferGeometry | null = null
    let ribGeo: THREE.BufferGeometry | null = null
    let perimeterGeo: THREE.BufferGeometry | null = null
    let spineGeo: THREE.BufferGeometry | null = null
    const columnGeos: THREE.BufferGeometry[] = []

    // Surface panels
    if (result.cells.length > 0) {
      const positions: number[] = []
      const indices: number[] = []
      let vertOffset = 0

      for (const cell of result.cells) {
        const v3d = cell.vertices3d
        const c = cell.centroid
        const n = v3d.length
        if (n < 3) continue

        positions.push(c[0], c[1], c[2])
        for (let i = 0; i < n; i++) {
          positions.push(v3d[i][0], v3d[i][1], v3d[i][2])
        }
        for (let i = 0; i < n; i++) {
          const next = (i + 1) % n
          indices.push(vertOffset, vertOffset + 1 + i, vertOffset + 1 + next)
        }
        vertOffset += 1 + n
      }

      if (positions.length > 0) {
        surfaceGeo = new THREE.BufferGeometry()
        surfaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        surfaceGeo.setIndex(indices)
        surfaceGeo.computeVertexNormals()
      }
    }

    // Ribs (voronoi edges as line segments)
    if (result.allEdges.length > 0) {
      const edgePts: number[] = []
      for (const [a, b] of result.allEdges) {
        edgePts.push(a[0], a[1], a[2], b[0], b[1], b[2])
      }
      ribGeo = new THREE.BufferGeometry()
      ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3))
    }

    // Perimeter beam (rectangular tube around canopy edge)
    if (perimeterEdges.length > 0) {
      const beamPositions: number[] = []
      const beamIndices: number[] = []
      const beamRad = 0.06
      let bvOffset = 0

      for (const edge of perimeterEdges) {
        const dx = edge.end[0] - edge.start[0]
        const dz = edge.end[2] - edge.start[2]
        const len = Math.hypot(dx, dz)
        if (len < 0.01) continue

        // Direction perpendicular to edge in XY and ZY planes
        const dirX = dx / len
        const dirZ = dz / len
        const upY = 1

        // 4 corners of the rectangular cross-section
        const halfH = beamRad
        const halfW = beamRad
        const offsets: [number, number, number][] = [
          [-halfW, -halfH, 0],
          [halfW, -halfH, 0],
          [halfW, halfH, 0],
          [-halfW, halfH, 0],
        ]

        // For a box along the edge direction, we need to orient the cross-section
        // Cross-section is in the plane perpendicular to the edge direction
        // Simple: create 8 vertices (4 start face, 4 end face) and connect them
        const perpX = -dirZ
        const perpZ = dirX

        // Local cross-section points in the perpendicular plane
        const cs: [number, number, number][] = offsets.map(([ox, oy]) => [
          ox * perpX,
          oy * upY,
          ox * perpZ,
        ])

        for (const [lx, ly, lz] of cs) {
          beamPositions.push(
            edge.start[0] + lx, edge.start[1] + ly, edge.start[2] + lz,
          )
        }
        for (const [lx, ly, lz] of cs) {
          beamPositions.push(
            edge.end[0] + lx, edge.end[1] + ly, edge.end[2] + lz,
          )
        }

        // Indices for the box segment
        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4
          // Start face
          beamIndices.push(bvOffset + i, bvOffset + next, bvOffset + 4 + i)
          beamIndices.push(bvOffset + 4 + i, bvOffset + next, bvOffset + 4 + next)
        }
        // End caps (start and end faces — not needed for visual, skip for perf)

        bvOffset += 8
      }

      if (beamPositions.length > 0) {
        perimeterGeo = new THREE.BufferGeometry()
        perimeterGeo.setAttribute('position', new THREE.Float32BufferAttribute(beamPositions, 3))
        perimeterGeo.setIndex(beamIndices)
        perimeterGeo.computeVertexNormals()
      }
    }

    // Spine ribs (primary structural ribs, thicker than Voronoi edges)
    if (spineRibs.length > 0) {
      const spinePositions: number[] = []
      const spineIndices: number[] = []
      const spineRad = 0.03
      let svOffset = 0

      for (const rib of spineRibs) {
        const dx = rib.end[0] - rib.start[0]
        const dy = rib.end[1] - rib.start[1]
        const dz = rib.end[2] - rib.start[2]
        const len = Math.hypot(dx, dy, dz)
        if (len < 0.01) continue

        const dirX = dx / len
        const dirY = dy / len
        const dirZ = dz / len

        // Perpendicular vectors for cross-section
        const up = Math.abs(dirY) < 0.9
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0)
        const perp = new THREE.Vector3(dirX, dirY, dirZ).cross(up).normalize()
        const perp2 = new THREE.Vector3(dirX, dirY, dirZ).cross(perp).normalize()

        const halfW = spineRad
        const halfH = spineRad * 0.5
        const csOffsets = [
          perp.clone().multiplyScalar(-halfW).add(perp2.clone().multiplyScalar(-halfH)),
          perp.clone().multiplyScalar(halfW).add(perp2.clone().multiplyScalar(-halfH)),
          perp.clone().multiplyScalar(halfW).add(perp2.clone().multiplyScalar(halfH)),
          perp.clone().multiplyScalar(-halfW).add(perp2.clone().multiplyScalar(halfH)),
        ]

        for (const off of csOffsets) {
          spinePositions.push(
            rib.start[0] + off.x, rib.start[1] + off.y, rib.start[2] + off.z,
          )
        }
        for (const off of csOffsets) {
          spinePositions.push(
            rib.end[0] + off.x, rib.end[1] + off.y, rib.end[2] + off.z,
          )
        }

        for (let i = 0; i < 4; i++) {
          const next = (i + 1) % 4
          spineIndices.push(svOffset + i, svOffset + next, svOffset + 4 + i)
          spineIndices.push(svOffset + 4 + i, svOffset + next, svOffset + 4 + next)
        }
        svOffset += 8
      }

      if (spinePositions.length > 0) {
        spineGeo = new THREE.BufferGeometry()
        spineGeo.setAttribute('position', new THREE.Float32BufferAttribute(spinePositions, 3))
        spineGeo.setIndex(spineIndices)
        spineGeo.computeVertexNormals()
      }
    }

    // Support columns
    const colRadius = 0.04
    const colSeg = 6
    for (const sup of supports) {
      const dx = sup.top[0] - sup.base[0]
      const dy = sup.top[1] - sup.base[1]
      const dz = sup.top[2] - sup.base[2]
      const len = Math.hypot(dx, dy, dz)
      if (len < 0.01) continue

      const colGeo = new THREE.CylinderGeometry(colRadius, colRadius, len, colSeg)
      const midX = (sup.top[0] + sup.base[0]) / 2
      const midY = (sup.top[1] + sup.base[1]) / 2
      const midZ = (sup.top[2] + sup.base[2]) / 2

      // Rotate cylinder to align with the column direction
      const dir = new THREE.Vector3(dx, dy, dz).normalize()
      const up = new THREE.Vector3(0, 1, 0)
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
      const euler = new THREE.Euler().setFromQuaternion(quat)

      colGeo.translate(midX, midY, midZ)
      colGeo.rotateX(euler.x)
      colGeo.rotateY(euler.y)
      colGeo.rotateZ(euler.z)

      columnGeos.push(colGeo)
    }

    return { surfaceGeo, ribGeo, perimeterGeo, spineGeo, columnGeos }
  }, [safe])

  // ── Dispose old geometries on unmount or change ──
  const prevGeosRef = useRef(geos)

  useEffect(() => {
    const prev = prevGeosRef.current
    if (prev !== geos) {
      disposeGeometry(prev.surfaceGeo)
      disposeGeometry(prev.ribGeo)
      disposeGeometry(prev.perimeterGeo)
      disposeGeometry(prev.spineGeo)
      for (const cg of prev.columnGeos) disposeGeometry(cg)
      prevGeosRef.current = geos
    }
    return () => {
      disposeGeometry(geos.surfaceGeo)
      disposeGeometry(geos.ribGeo)
      disposeGeometry(geos.perimeterGeo)
      disposeGeometry(geos.spineGeo)
      for (const cg of geos.columnGeos) disposeGeometry(cg)
    }
  }, [geos])

  if (!geos.ribGeo) return null

  return (
    <group>
      {/* Background panels (ETFE-like, behind ribs) */}
      {geos.surfaceGeo && (
        <mesh geometry={geos.surfaceGeo} material={PANEL_MAT} />
      )}

      {/* Support columns */}
      {geos.columnGeos.map((cg, i) => (
        <mesh key={`col-${i}`} geometry={cg} material={COLUMN_MAT} />
      ))}

      {/* Spine ribs (primary structural ribs) */}
      {geos.spineGeo && (
        <mesh geometry={geos.spineGeo} material={SPINE_MAT} />
      )}

      {/* Perimeter beam */}
      {geos.perimeterGeo && (
        <mesh geometry={geos.perimeterGeo} material={BEAM_MAT} />
      )}

      {/* Ribs (Voronoi edge lattice, secondary ribs) */}
      <lineSegments geometry={geos.ribGeo} material={RIB_MAT} />
    </group>
  )
}
