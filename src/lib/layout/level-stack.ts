import type { BuildingChassis, LevelModel, PlanConstraint } from './vertical-chassis'

const uid = () => Math.random().toString(36).slice(2, 10)

// ── Level stack computation ────────────────────────────────────

export interface LevelAssignment {
  level: LevelModel
  programme: string
  supportWalls: SupportWallRef[]
  shaftsAbove: string[]
  shaftsBelow: string[]
}

export interface SupportWallRef {
  axisId: string
  position: number
  orientation: 'horizontal' | 'vertical'
  wallId: string
  mustStack: boolean
}

export interface LevelStackResult {
  assignments: LevelAssignment[]
  alignmentWarnings: string[]
}

function computeSupportWallsForLevel(
  chassis: BuildingChassis,
  levelIndex: number,
): SupportWallRef[] {
  const walls: SupportWallRef[] = []

  for (const axis of chassis.supportAxes) {
    if (!axis.loadBearing) continue

    // Ground floor has no support walls from below
    if (levelIndex === 0) {
      walls.push({
        axisId: axis.id,
        position: axis.position,
        orientation: axis.orientation,
        wallId: uid(),
        mustStack: false,
      })
    } else {
      // Upper floors must stack on ground-floor walls
      walls.push({
        axisId: axis.id,
        position: axis.position,
        orientation: axis.orientation,
        wallId: uid(),
        mustStack: true,
      })
    }
  }

  return walls
}

function computeShaftAlignment(
  chassis: BuildingChassis,
  levelIndex: number,
): { above: string[]; below: string[] } {
  const above: string[] = []
  const below: string[] = []

  for (const shaft of chassis.shafts) {
    if (levelIndex > shaft.floorFrom && levelIndex <= shaft.floorTo) {
      below.push(shaft.id)
    }
    if (levelIndex >= shaft.floorFrom && levelIndex < shaft.floorTo) {
      above.push(shaft.id)
    }
  }

  return { above, below }
}

export function computeLevelStack(chassis: BuildingChassis): LevelStackResult {
  const assignments: LevelAssignment[] = []
  const alignmentWarnings: string[] = []

  for (let i = 0; i < chassis.storeyCount; i++) {
    const level = chassis.levels[i]
    if (!level) continue

    const supportWalls = computeSupportWallsForLevel(chassis, i)
    const shaftAlignment = computeShaftAlignment(chassis, i)

    // Check support wall alignment (upper floors must align with ground)
    if (i > 0 && chassis.supportAxes.length > 0) {
      const groundWalls = computeSupportWallsForLevel(chassis, 0)
      for (const upperWall of supportWalls) {
        if (!upperWall.mustStack) continue
        const groundMatch = groundWalls.find(
          gw => gw.axisId === upperWall.axisId && gw.orientation === upperWall.orientation,
        )
        if (!groundMatch) {
          alignmentWarnings.push(
            `Level ${i}: support wall on axis ${upperWall.axisId} has no matching support below`,
          )
        }
      }
    }

    assignments.push({
      level,
      programme: level.assignedProgramme,
      supportWalls,
      shaftsAbove: shaftAlignment.above,
      shaftsBelow: shaftAlignment.below,
    })
  }

  return { assignments, alignmentWarnings }
}

// ── Programme distribution across levels ───────────────────────

export interface ProgrammeAssignment {
  levelIndex: number
  programme: string
  isGround: boolean
  isRoof: boolean
}

export function distributeProgramme(
  storeyCount: number,
  groundProgramme: string,
  upperProgramme: string,
): ProgrammeAssignment[] {
  const result: ProgrammeAssignment[] = []

  for (let i = 0; i < storeyCount; i++) {
    result.push({
      levelIndex: i,
      programme: i === 0 ? groundProgramme : upperProgramme,
      isGround: i === 0,
      isRoof: i === storeyCount - 1,
    })
  }

  return result
}

// ── Constraints propagation ────────────────────────────────────

export function propagateConstraintsToLevel(
  chassis: BuildingChassis,
  levelIndex: number,
): PlanConstraint[] {
  const level = chassis.levels[levelIndex]
  if (!level) return []

  const constraints: PlanConstraint[] = [...level.planConstraints]

  // Add party wall constraints for upper levels
  for (const pw of chassis.partyWalls) {
    if (levelIndex >= pw.floorFrom && levelIndex <= pw.floorTo) {
      constraints.push({
        type: 'party-wall',
        x: pw.startX,
        y: pw.startY,
        width: Math.abs(pw.endX - pw.startX) || 0.2,
        depth: Math.abs(pw.endY - pw.startY) || 0.2,
        label: 'Party Wall',
      })
    }
  }

  // Add wet-stack zone constraints
  for (const shaft of chassis.shafts) {
    if (!shaft.wetStack) continue
    if (levelIndex >= shaft.floorFrom && levelIndex <= shaft.floorTo) {
      const existingWet = constraints.find(
        c => c.type === 'wet-zone' && Math.abs(c.x - shaft.x) < 0.5,
      )
      if (!existingWet) {
        constraints.push({
          type: 'wet-zone',
          x: shaft.x - 0.5,
          y: Math.max(0, shaft.y - 1.5),
          width: shaft.width + 1.0,
          depth: shaft.depth + 3.0,
          label: 'Stacked Wet Zone',
        })
      }
    }
  }

  // Add circulation zone constraints for mixed-use
  if (chassis.circulationModel.separated) {
    if (levelIndex === 0) {
      constraints.push({
        type: 'circulation-zone',
        x: 0,
        y: 0,
        width: chassis.width,
        depth: 2.0,
        label: 'Public Circulation (ground)',
      })
    } else {
      constraints.push({
        type: 'circulation-zone',
        x: 0,
        y: 0,
        width: chassis.width,
        depth: 2.0,
        label: 'Private Circulation (upper)',
      })
    }
  }

  // Add core reserve constraints
  for (const core of chassis.cores) {
    if (levelIndex >= core.floorFrom && levelIndex <= core.floorTo) {
      const existing = constraints.find(
        c => c.type === 'core-reserve' && Math.abs(c.x - core.x) < 0.5 && Math.abs(c.y - core.y) < 0.5,
      )
      if (!existing) {
        constraints.push({
          type: 'core-reserve',
          x: core.x,
          y: core.y,
          width: core.width,
          depth: core.depth,
          label: `${core.type === 'combined' ? 'Stair+Lift' : core.type === 'stair' ? 'Stair' : 'Lift'} Core`,
        })
      }
    }
  }

  return constraints
}
