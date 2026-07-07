import { useMemo } from 'react'
import * as THREE from 'three'
import { computeCanopy } from '@/engine/canopy/canopyGeometry'
import type { CanopyParams } from '@/engine/canopy/canopyGeometry'

const SURFACE_MAT = new THREE.MeshStandardMaterial({
  color: '#8B5CF6',
  roughness: 0.4,
  metalness: 0.2,
  transparent: true,
  opacity: 0.25,
  side: THREE.DoubleSide,
  depthWrite: false,
})

const EDGE_MAT = new THREE.LineBasicMaterial({
  color: '#06B6D4',
  opacity: 0.8,
  transparent: true,
})

interface CanopyMeshProps {
  params: CanopyParams
}

export function CanopyMesh({ params }: CanopyMeshProps) {
  const { surfaceGeo, edgePositions } = useMemo(() => {
    const result = computeCanopy(params)

    if (result.cells.length === 0) {
      return { surfaceGeo: null, edgePositions: null }
    }

    const positions: number[] = []
    const indices: number[] = []
    let vertOffset = 0

    for (const cell of result.cells) {
      const v3d = cell.vertices3d
      const c = cell.centroid
      const n = v3d.length

      if (n < 3) continue

      // Centroid vertex
      positions.push(c[0], c[1], c[2])

      // Cell vertices
      for (let i = 0; i < n; i++) {
        positions.push(v3d[i][0], v3d[i][1], v3d[i][2])
      }

      // Triangles: centroid + (i, i+1)
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        indices.push(vertOffset, vertOffset + 1 + i, vertOffset + 1 + next)
      }

      vertOffset += 1 + n
    }

    const surfaceGeo = new THREE.BufferGeometry()
    surfaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    surfaceGeo.setIndex(indices)
    surfaceGeo.computeVertexNormals()

    // Edges: flat line list from allEdges
    const edgePts: number[] = []
    for (const [a, b] of result.allEdges) {
      edgePts.push(a[0], a[1], a[2], b[0], b[1], b[2])
    }
    const edgePositions = edgePts.length > 0
      ? new THREE.Float32BufferAttribute(edgePts, 3)
      : null

    return { surfaceGeo, edgePositions }
  }, [params])

  if (!surfaceGeo) return null

  return (
    <group>
      <mesh geometry={surfaceGeo} material={SURFACE_MAT} castShadow receiveShadow />
      {edgePositions && (
        <lineSegments geometry={new THREE.BufferGeometry().setAttribute('position', edgePositions)} material={EDGE_MAT} />
      )}
    </group>
  )
}
