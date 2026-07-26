import type { BuildingChassis, SupportAxis } from '../layout/vertical-chassis'
import type { SlabSpec } from './slab-system'
import { determineLevelSlab } from './slab-system'

export interface CandidateBeam {
  id: string
  axisId: string
  levelIndex: number
  startX: number
  startZ: number
  endX: number
  endZ: number
  width: number
  depth: number
  material: string
  span: number
  supportAxisLabel: string
}

export interface CandidateColumn {
  id: string
  axisA: string
  axisB: string
  levelIndex: number
  x: number
  z: number
  width: number
  depth: number
  material: string
  height: number
  gridLabel: string
}

export interface SupportedWall {
  id: string
  axisId: string
  levelIndex: number
  position: number
  orientation: 'horizontal' | 'vertical'
  role: 'load-bearing' | 'shear' | 'partition'
  thickness: number
}

export interface StructuralLevel {
  levelIndex: number
  beams: CandidateBeam[]
  columns: CandidateColumn[]
  walls: SupportedWall[]
  slabSpec: SlabSpec
  transferHints: string[]
}

export interface StructuralBridgeResult {
  levels: StructuralLevel[]
  totalBeams: number
  totalColumns: number
  totalWalls: number
  warnings: string[]
}

const uid = () => Math.random().toString(36).slice(2, 10)

function beamDepth(span: number): number {
  if (span <= 4) return 0.30
  if (span <= 6) return 0.40
  if (span <= 8) return 0.50
  return 0.60
}

function beamWidth(depth: number): number {
  return Math.max(0.20, depth * 0.5)
}

function columnWidth(storeyCount: number): number {
  if (storeyCount <= 2) return 0.23
  if (storeyCount <= 5) return 0.30
  return 0.40
}

function columnDepth(storeyCount: number): number {
  if (storeyCount <= 2) return 0.23
  if (storeyCount <= 5) return 0.30
  return 0.40
}

function getBeamMaterial(chassis: BuildingChassis): string {
  switch (chassis.structuralSystem) {
    case 'steel-frame': return 'steel-ipe'
    case 'rc-frame': return 'reinforced-concrete'
    case 'masonry': return 'reinforced-concrete'
    case 'hybrid': return 'steel-composite'
    default: return 'reinforced-concrete'
  }
}

function getColumnMaterial(chassis: BuildingChassis): string {
  switch (chassis.structuralSystem) {
    case 'steel-frame': return 'steel-hollow'
    case 'rc-frame': return 'reinforced-concrete'
    case 'masonry': return 'masonry'
    case 'hybrid': return 'steel-encased-concrete'
    default: return 'reinforced-concrete'
  }
}

function getWallRole(axis: SupportAxis, levelIndex: number): 'load-bearing' | 'shear' | 'partition' {
  if (axis.supportType === 'wall' && axis.loadBearing) return 'load-bearing'
  if (levelIndex <= 1) return 'shear'
  return 'partition'
}

export function computeStructuralBridge(chassis: BuildingChassis): StructuralBridgeResult {
  const levels: StructuralLevel[] = []
  const warnings: string[] = []

  const vertAxes = chassis.supportAxes.filter(a => a.orientation === 'horizontal').sort((a, b) => a.position - b.position)
  const horizAxes = chassis.supportAxes.filter(a => a.orientation === 'vertical').sort((a, b) => a.position - b.position)

  for (let li = 0; li < chassis.storeyCount; li++) {
    const beams: CandidateBeam[] = []
    const columns: CandidateColumn[] = []
    const walls: SupportedWall[] = []
    const level = chassis.levels[li]
    const slabSpec = determineLevelSlab(li, chassis.storeyCount, chassis)
    const transferHints: string[] = []

    const storeyHeight = level?.floorToFloorHeight ?? 3.0

    // Build columns at grid intersections
    for (const va of vertAxes) {
      for (const ha of horizAxes) {
        if (chassis.structuralSystem === 'masonry' && li > 0) {
          continue
        }
        if (chassis.structuralSystem === 'masonry') {
          walls.push({
            id: uid(),
            axisId: va.id,
            levelIndex: li,
            position: va.position,
            orientation: va.orientation,
            role: 'load-bearing',
            thickness: chassis.wallThickness,
          })
          walls.push({
            id: uid(),
            axisId: ha.id,
            levelIndex: li,
            position: ha.position,
            orientation: ha.orientation,
            role: 'load-bearing',
            thickness: chassis.wallThickness,
          })
        }

        const colW = columnWidth(chassis.storeyCount)
        const colD = columnDepth(chassis.storeyCount)
        columns.push({
          id: uid(),
          axisA: va.label,
          axisB: ha.label,
          levelIndex: li,
          x: va.position,
          z: ha.position,
          width: colW,
          depth: colD,
          material: getColumnMaterial(chassis),
          height: storeyHeight,
          gridLabel: `${va.label}${ha.label}`,
        })
      }
    }

    // Build beams along axes
    for (const va of vertAxes) {
      for (let hi = 0; hi < horizAxes.length - 1; hi++) {
        const span = horizAxes[hi + 1].position - horizAxes[hi].position
        if (span <= 0) continue
        const depth = beamDepth(span)
        const width = beamWidth(depth)
        beams.push({
          id: uid(),
          axisId: va.id,
          levelIndex: li,
          startX: va.position,
          startZ: horizAxes[hi].position,
          endX: va.position,
          endZ: horizAxes[hi + 1].position,
          width,
          depth,
          material: getBeamMaterial(chassis),
          span,
          supportAxisLabel: va.label,
        })
      }
    }

    for (const ha of horizAxes) {
      for (let vi = 0; vi < vertAxes.length - 1; vi++) {
        const span = vertAxes[vi + 1].position - vertAxes[vi].position
        if (span <= 0) continue
        const depth = beamDepth(span)
        const width = beamWidth(depth)
        beams.push({
          id: uid(),
          axisId: ha.id,
          levelIndex: li,
          startX: vertAxes[vi].position,
          startZ: ha.position,
          endX: vertAxes[vi + 1].position,
          endZ: ha.position,
          width,
          depth,
          material: getBeamMaterial(chassis),
          span,
          supportAxisLabel: ha.label,
        })
      }
    }

    // Add grid-wall roles for load-bearing walls
    for (const axis of chassis.supportAxes) {
      const role = getWallRole(axis, li)
      walls.push({
        id: uid(),
        axisId: axis.id,
        levelIndex: li,
        position: axis.position,
        orientation: axis.orientation,
        role,
        thickness: chassis.wallThickness,
      })
    }

    // Transfer hints for upper floors
    if (li > 0) {
      const prevSlab = determineLevelSlab(li - 1, chassis.storeyCount, chassis)
      if (slabSpec.loadingClass !== prevSlab.loadingClass) {
        transferHints.push(`Loading transition: ${prevSlab.loadingClass} → ${slabSpec.loadingClass} at level ${li}`)
      }
      if (slabSpec.thickness > prevSlab.thickness) {
        transferHints.push(`Slab thickening: ${prevSlab.thickness}m → ${slabSpec.thickness}m at level ${li}`)
      }
    }

    // Structural system warnings
    if (chassis.structuralSystem === 'masonry' && li > 0 && chassis.storeyCount > 2) {
      warnings.push(`Masonry structure with ${chassis.storeyCount} storeys may require reinforcement at level ${li}`)
    }

    levels.push({ levelIndex: li, beams, columns, walls, slabSpec, transferHints })
  }

  const totalBeams = levels.reduce((s, l) => s + l.beams.length, 0)
  const totalColumns = levels.reduce((s, l) => s + l.columns.length, 0)
  const totalWalls = levels.reduce((s, l) => s + l.walls.length, 0)

  return { levels, totalBeams, totalColumns, totalWalls, warnings }
}
