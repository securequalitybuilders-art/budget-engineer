import type { PlacedRoom, FloorPlan } from './layoutEngine'
import { classifyRoom } from './roomClassifier'
import { dimForRoom } from './layoutEngine'

// ── Construction defaults ──

export const CONSTRUCTION_DEFAULTS = {
  externalWallThickness: 0.230,
  internalLoadBearingThickness: 0.230,
  partitionThickness: 0.115,
  internalDoorW: 0.900,
  internalDoorH: 2.100,
  externalDoorW: 1.000,
  externalDoorH: 2.100,
  standardWindowW: 1.200,
  standardWindowH: 1.200,
  windowSill: 0.900,
  bathroomWindowW: 0.600,
  bathroomWindowH: 0.600,
  bathroomWindowSill: 1.500,
  maxRiser: 0.175,
  minGoing: 0.250,
  maxMasonrySpan: 6.0,
  minGlazingRatio: 0.10,
  maxWetCoreSpread: 6.0,
  stairMinWidth: 1.0,
  stairInstitutionalMinWidth: 1.5,
} as const

// ── Validation result ──

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationFinding {
  check: string
  severity: ValidationSeverity
  message: string
  roomId?: string
  roomName?: string
}

export interface StandingValidationResult {
  valid: boolean
  findings: ValidationFinding[]
}

// ── Checks ──

function significantDigits(a: number, b: number, places: number = 2): boolean {
  return Math.abs(a - b) < 10 ** -places
}

export function checkWallThicknesses(rooms: PlacedRoom[], walls?: Array<{ thickness: number }>): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  if (!walls || walls.length === 0) {
    findings.push({
      check: 'wall-thickness',
      severity: 'warning',
      message: 'Wall thicknesses not provided — cannot verify buildable thicknesses',
    })
    return findings
  }
  const validThicknesses = [
    CONSTRUCTION_DEFAULTS.externalWallThickness,
    CONSTRUCTION_DEFAULTS.internalLoadBearingThickness,
    CONSTRUCTION_DEFAULTS.partitionThickness,
  ]
  for (const wall of walls) {
    const isValid = validThicknesses.some(t => significantDigits(wall.thickness, t))
    if (!isValid) {
      findings.push({
        check: 'wall-thickness',
        severity: 'error',
        message: `Wall thickness ${(wall.thickness * 1000).toFixed(0)}mm is non-standard (expected 115mm, 230mm)`,
      })
    }
  }
  return findings
}

export function checkStructuralSupport(rooms: PlacedRoom[], floorCount: number): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  if (floorCount <= 1) return findings
  const nonPartition = rooms.filter(r => {
    const cls = classifyRoom(r.name)
    return cls.zone !== 'circulation'
  })
  for (const room of nonPartition) {
    if (room.width > CONSTRUCTION_DEFAULTS.maxMasonrySpan + 0.1) {
      findings.push({
        check: 'structural-span',
        severity: 'warning',
        message: `Room "${room.name}" width ${room.width.toFixed(1)}m exceeds max masonry span ${CONSTRUCTION_DEFAULTS.maxMasonrySpan}m — add beam or structural support`,
        roomName: room.name,
      })
    }
    if (room.height > CONSTRUCTION_DEFAULTS.maxMasonrySpan + 0.1) {
      findings.push({
        check: 'structural-span',
        severity: 'warning',
        message: `Room "${room.name}" depth ${room.height.toFixed(1)}m exceeds max masonry span ${CONSTRUCTION_DEFAULTS.maxMasonrySpan}m — add beam or structural support`,
        roomName: room.name,
      })
    }
  }
  return findings
}

export function checkDoorClashes(rooms: PlacedRoom[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const doorWidth = CONSTRUCTION_DEFAULTS.internalDoorW
  for (const room of rooms) {
    const cls = classifyRoom(room.name)
    if (cls.zone === 'circulation') continue
    const adjacent = rooms.filter(other =>
      other.name !== room.name &&
      !(room.x + room.width <= other.x || other.x + other.width <= room.x ||
        room.y + room.height <= other.y || other.y + other.height <= room.y),
    )
    for (const other of adjacent) {
      const sharedW = Math.min(room.x + room.width, other.x + other.width) - Math.max(room.x, other.x)
      const sharedH = Math.min(room.y + room.height, other.y + other.height) - Math.max(room.y, other.y)
      if (sharedW > 0 && sharedH > 0) continue
      const isVertical = sharedW > sharedH
      if (isVertical && sharedW < doorWidth + 0.3) {
        findings.push({
          check: 'door-clash',
          severity: 'warning',
          message: `Door between "${room.name}" and "${other.name}" on narrow wall (${sharedW.toFixed(1)}m) — may be too narrow for ${(doorWidth * 1000).toFixed(0)}mm door`,
          roomName: room.name,
        })
      }
    }
  }
  return findings
}

export function checkDaylight(rooms: PlacedRoom[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const habitableKeywords = ['Bedroom', 'Living', 'Dining', 'Kitchen', 'Office', 'Study', 'Classroom', 'Reception', 'Guest', 'Lounge']
  for (const room of rooms) {
    const isHabitable = habitableKeywords.some(k => room.name.startsWith(k))
    if (!isHabitable) continue
    const glazingArea = room.width * room.height * CONSTRUCTION_DEFAULTS.minGlazingRatio
    const hasExternalExposure = room.x === 0 || Math.abs(room.x + room.width - 0) < 0.01 ||
      room.y === 0 || Math.abs(room.y + room.height - 0) < 0.01
    if (!hasExternalExposure && room.width * room.height > 8) {
      findings.push({
        check: 'daylight',
        severity: 'warning',
        message: `Habitable room "${room.name}" (${(room.width * room.height).toFixed(1)}m²) has no exterior wall — daylight/ventilation may be inadequate`,
        roomName: room.name,
      })
    }
  }
  return findings
}

export function checkWetCoreClustering(rooms: PlacedRoom[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const wetCores = rooms.filter(r => r.isWetCore)
  if (wetCores.length <= 1) return findings
  for (let i = 0; i < wetCores.length; i++) {
    for (let j = i + 1; j < wetCores.length; j++) {
      const dx = wetCores[i].x - wetCores[j].x
      const dy = wetCores[i].y - wetCores[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > CONSTRUCTION_DEFAULTS.maxWetCoreSpread) {
        findings.push({
          check: 'wet-core-clustering',
          severity: 'warning',
          message: `Wet rooms "${wetCores[i].name}" and "${wetCores[j].name}" are ${dist.toFixed(1)}m apart — should be within ${CONSTRUCTION_DEFAULTS.maxWetCoreSpread}m for plumbing efficiency`,
          roomName: wetCores[i].name,
        })
      }
    }
  }
  return findings
}

export function checkAccessIndependence(rooms: PlacedRoom[]): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const circulationNames = ['Circulation', 'Gallery', 'Corridor', 'Hall', 'Lobby', 'Stairwell']
  for (const room of rooms) {
    const cls = classifyRoom(room.name)
    if (cls.zone === 'circulation') continue
    if (room.name === 'Stairwell' || room.name === 'Courtyard' || room.name === 'Roof Terrace') continue
    const adjacent = rooms.filter(other =>
      other.name !== room.name &&
      !(room.x + room.width <= other.x || other.x + other.width <= room.x ||
        room.y + room.height <= other.y || other.y + other.height <= room.y),
    ).filter(other => !circulationNames.some(c => other.name.startsWith(c)))
    if (adjacent.length === 1 && room.width * room.height > 8) {
      findings.push({
        check: 'access-independence',
        severity: 'warning',
        message: `Room "${room.name}" touches only "${adjacent[0].name}" — access may require passing through another room`,
        roomName: room.name,
      })
    }
  }
  return findings
}

// ── Run all checks ──

export function validatePlan(
  plan: FloorPlan,
  floorCount: number,
): StandingValidationResult {
  const findings: ValidationFinding[] = [
    ...checkWallThicknesses(plan.rooms),
    ...checkStructuralSupport(plan.rooms, floorCount),
    ...checkDoorClashes(plan.rooms),
    ...checkDaylight(plan.rooms),
    ...checkWetCoreClustering(plan.rooms),
    ...checkAccessIndependence(plan.rooms),
  ]

  return {
    valid: findings.every(f => f.severity !== 'error'),
    findings,
  }
}

export function validateAllPlans(
  plans: FloorPlan[][],
  floorCount: number,
): StandingValidationResult {
  const allFindings: ValidationFinding[] = []
  for (let fi = 0; fi < plans.length; fi++) {
    for (const plan of plans[fi]) {
      const result = validatePlan(plan, floorCount)
      for (const finding of result.findings) {
        allFindings.push({
          ...finding,
          message: `[Floor ${fi} ${plan.topology}] ${finding.message}`,
        })
      }
    }
  }
  return {
    valid: allFindings.every(f => f.severity !== 'error'),
    findings: allFindings,
  }
}
