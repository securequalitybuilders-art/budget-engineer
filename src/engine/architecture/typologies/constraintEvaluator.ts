import type {
  TypologyConstraints,
  ConstraintFinding,
  ConstraintEvaluation,
  ConstraintEvaluatorInput,
  ConstraintDomain,
  ConstraintSeverity,
} from './types'
import { officeTypologyConstraints } from './office'
import { houseTypologyConstraints } from './house'
import { apartmentTypologyConstraints } from './apartment'
import { duplexTypologyConstraints } from './duplex'
import { townhouseTypologyConstraints } from './townhouse'
import { clinicTypologyConstraints } from './clinic'
import { schoolTypologyConstraints } from './school'
import { churchTypologyConstraints } from './church'
import { communityHallTypologyConstraints } from './communityHall'
import { retailTypologyConstraints } from './retail'
import { hotelTypologyConstraints } from './hotel'
import { restaurantTypologyConstraints } from './restaurant'
import { warehouseTypologyConstraints } from './warehouse'
import { marketTypologyConstraints } from './market'
import { petrolTypologyConstraints } from './petrol'
import { mixedUseTypologyConstraints } from './mixedUse'

const CONSTRAINT_REGISTRY: Record<string, TypologyConstraints> = {
  'office-commercial': officeTypologyConstraints,
  'house-residential': houseTypologyConstraints,
  'apartment-multi': apartmentTypologyConstraints,
  duplex: duplexTypologyConstraints,
  townhouse: townhouseTypologyConstraints,
  'clinic-health': clinicTypologyConstraints,
  'school-classroom': schoolTypologyConstraints,
  'church-worship': churchTypologyConstraints,
  'community-hall': communityHallTypologyConstraints,
  'retail-shop': retailTypologyConstraints,
  'hotel-fullservice': hotelTypologyConstraints,
  restaurant: restaurantTypologyConstraints,
  'warehouse-industrial': warehouseTypologyConstraints,
  market: marketTypologyConstraints,
  'petrol-station': petrolTypologyConstraints,
  'mixed-use': mixedUseTypologyConstraints,
}

export function getConstraintsForTypology(typologyId: string): TypologyConstraints | undefined {
  return CONSTRAINT_REGISTRY[typologyId]
}

export function listTypologyIds(): string[] {
  return Object.keys(CONSTRAINT_REGISTRY)
}

export function listAllConstraints(): TypologyConstraints[] {
  return Object.values(CONSTRAINT_REGISTRY)
}

function matchRoom(roomName: string, patterns: string[]): boolean {
  const lower = roomName.toLowerCase()
  return patterns.some((p) => lower.includes(p.toLowerCase()))
}

function findMatchingRooms(rooms: { name: string }[], patterns: string[]): { name: string; index: number }[] {
  return rooms
    .map((r, i) => (matchRoom(r.name, patterns) ? { name: r.name, index: i } : null))
    .filter((r): r is { name: string; index: number } => r !== null)
}

function addFinding(
  findings: ConstraintFinding[],
  domain: ConstraintDomain,
  severity: ConstraintSeverity,
  rule: string,
  message: string,
  extra?: Partial<ConstraintFinding>,
): void {
  findings.push({ domain, severity, rule, message, ...extra })
}

function evaluateFunctionalZoning(
  c: TypologyConstraints['functionalZoning'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  for (const zone of c.zones) {
    const matched = findMatchingRooms(input.rooms, zone.patterns)
    if (zone.minCount !== undefined && matched.length < zone.minCount) {
      addFinding(findings, 'functionalZoning', 'error', `zone-${zone.patterns[0]}-count`, `Expected at least ${zone.minCount} ${zone.patterns[0]} zone(s), found ${matched.length}`)
    }
    for (const m of matched) {
      const room = input.rooms[m.index]
      const area = room.width * room.height
      if (zone.minAreaM2 !== undefined && area < zone.minAreaM2) {
        addFinding(findings, 'functionalZoning', 'error', `zone-${zone.patterns[0]}-area`, `${m.name} area ${area.toFixed(1)}m² is below minimum ${zone.minAreaM2}m²`, { roomIds: [room.id], actual: area, expected: zone.minAreaM2 })
      }
      if (zone.minAreaPerUnitM2 !== undefined) {
        const count = matched.length
        const perUnit = area / count
        if (perUnit < zone.minAreaPerUnitM2) {
          addFinding(findings, 'functionalZoning', 'warning', `zone-${zone.patterns[0]}-per-unit`, `${m.name} area per unit ${perUnit.toFixed(1)}m² is below minimum ${zone.minAreaPerUnitM2}m²`, { roomIds: [room.id], actual: perUnit, expected: zone.minAreaPerUnitM2 })
        }
      }
    }
  }
}

function evaluateCorePlanning(
  c: TypologyConstraints['corePlanning'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  const stairs = findMatchingRooms(input.rooms, ['staircase', 'stair', 'fire escape', 'fire escape stair'])
  if (stairs.length < c.minStairs) {
    addFinding(findings, 'corePlanning', 'error', 'core-min-stairs', `Expected at least ${c.minStairs} stair(s), found ${stairs.length}`, { actual: stairs.length, expected: c.minStairs })
  }
  const elevators = findMatchingRooms(input.rooms, ['lift', 'elevator', 'lift core'])
  if (elevators.length < c.minElevators) {
    addFinding(findings, 'corePlanning', 'error', 'core-min-elevators', `Expected at least ${c.minElevators} elevator(s), found ${elevators.length}`, { actual: elevators.length, expected: c.minElevators })
  }
  const serviceShafts = findMatchingRooms(input.rooms, ['service shaft', 'services', 'plant'])
  if (c.serviceShaftMinAreaM2 !== undefined && serviceShafts.length > 0) {
    for (const s of serviceShafts) {
      const room = input.rooms[s.index]
      const area = room.width * room.height
      if (area < c.serviceShaftMinAreaM2) {
        addFinding(findings, 'corePlanning', 'error', 'core-shaft-area', `${s.name} area ${area.toFixed(1)}m² is below minimum ${c.serviceShaftMinAreaM2}m²`, { roomIds: [room.id], actual: area, expected: c.serviceShaftMinAreaM2 })
      }
    }
  }
}

function evaluateWorkspaceLayouts(
  c: TypologyConstraints['workspaceLayouts'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  if (c.openPlan) {
    const openRooms = findMatchingRooms(input.rooms, c.openPlan.patterns)
    if (openRooms.length > 0) {
      const totalOpenArea = openRooms.reduce((sum, r) => sum + input.rooms[r.index].width * input.rooms[r.index].height, 0)
      const perPerson = totalOpenArea / Math.max(1, openRooms.length)
      if (perPerson < c.openPlan.minAreaPerPersonM2) {
        addFinding(findings, 'workspaceLayouts', 'warning', 'workspace-open-plan', `Open-plan area per room ${perPerson.toFixed(1)}m² is below minimum ${c.openPlan.minAreaPerPersonM2}m²`, { actual: perPerson, expected: c.openPlan.minAreaPerPersonM2 })
      }
    }
  }
  if (c.private) {
    const privateRooms = findMatchingRooms(input.rooms, c.private.patterns)
    for (const pr of privateRooms) {
      const room = input.rooms[pr.index]
      const area = room.width * room.height
      if (area < c.private.minAreaM2) {
        addFinding(findings, 'workspaceLayouts', 'error', 'workspace-private', `${pr.name} area ${area.toFixed(1)}m² is below minimum ${c.private.minAreaM2}m²`, { roomIds: [room.id], actual: area, expected: c.private.minAreaM2 })
      }
    }
  }
}

function evaluateMeetingRooms(
  c: TypologyConstraints['meetingRooms'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  for (const mt of c.types) {
    const matched = findMatchingRooms(input.rooms, mt.patterns)
    for (const m of matched) {
      const room = input.rooms[m.index]
      const area = room.width * room.height
      if (area < mt.minAreaM2) {
        addFinding(findings, 'meetingRooms', 'error', `meeting-${mt.name.toLowerCase()}`, `${m.name} area ${area.toFixed(1)}m² is below minimum ${mt.minAreaM2}m²`, { roomIds: [room.id], actual: area, expected: mt.minAreaM2 })
      }
    }
  }
}

function evaluateReception(
  c: TypologyConstraints['reception'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  const matched = findMatchingRooms(input.rooms, c.patterns)
  if (c.minAreaM2 !== undefined) {
    if (matched.length === 0) {
      addFinding(findings, 'reception', 'error', 'reception-missing', 'No reception area found')
    } else {
      for (const m of matched) {
        const room = input.rooms[m.index]
        const area = room.width * room.height
        if (area < c.minAreaM2) {
          addFinding(findings, 'reception', 'error', 'reception-area', `${m.name} area ${area.toFixed(1)}m² is below minimum ${c.minAreaM2}m²`, { roomIds: [room.id], actual: area, expected: c.minAreaM2 })
        }
      }
    }
  }
}

function evaluateEmergencyExits(
  c: TypologyConstraints['emergencyExits'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  const doors = findMatchingRooms(input.rooms, ['door', 'entrance', 'exit'])
  if (doors.length < c.minExits) {
    addFinding(findings, 'emergencyExits', 'error', 'exit-count', `Expected at least ${c.minExits} exit(s), found ${doors.length}`, { actual: doors.length, expected: c.minExits })
  }
  const maxDim = Math.max(input.totalWidth, input.totalHeight)
  if (maxDim > c.maxTravelDistanceM) {
    addFinding(findings, 'emergencyExits', 'warning', 'travel-distance', `Building dimension ${maxDim.toFixed(1)}m may exceed max travel distance ${c.maxTravelDistanceM}m`, { actual: maxDim, expected: c.maxTravelDistanceM })
  }
}

function evaluateDaylighting(
  c: TypologyConstraints['daylighting'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  const windows = findMatchingRooms(input.rooms, ['window', 'glazing'])
  const exteriorWallLength = 2 * (input.totalWidth + input.totalHeight)
  const windowArea = windows.reduce((sum, w) => {
    const room = input.rooms[w.index]
    return sum + room.width * room.height * 0.3
  }, 0)
  const wallArea = exteriorWallLength * 3
  const ratio = wallArea > 0 ? windowArea / wallArea : 0
  if (ratio < c.minWindowFaceRatio) {
    addFinding(findings, 'daylighting', 'warning', 'window-ratio', `Window-to-wall ratio ${(ratio * 100).toFixed(1)}% is below minimum ${(c.minWindowFaceRatio * 100).toFixed(1)}%`, { actual: ratio, expected: c.minWindowFaceRatio })
  }
}

function evaluateAccessibility(
  c: TypologyConstraints['accessibility'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  const corridors = findMatchingRooms(input.rooms, ['corridor', 'hallway', 'passage', 'circulation'])
  for (const co of corridors) {
    const room = input.rooms[co.index]
    const minDim = Math.min(room.width, room.height)
    if (minDim < c.minCorridorWidthM) {
      addFinding(findings, 'accessibility', 'error', 'corridor-width', `${co.name} width ${minDim.toFixed(1)}m is below minimum ${c.minCorridorWidthM}m`, { roomIds: [room.id], actual: minDim, expected: c.minCorridorWidthM })
    }
  }
  const wc = findMatchingRooms(input.rooms, ['toilet', 'wc', 'lavatory', 'ablution'])
  if (c.accessibleWc && wc.length === 0) {
    addFinding(findings, 'accessibility', 'info', 'accessible-wc', 'No accessible WC found')
  }
}

function evaluateStructuralGrid(
  c: TypologyConstraints['structuralGrid'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  const maxSpan = Math.max(input.totalWidth, input.totalHeight)
  if (maxSpan > c.maxSpanM) {
    addFinding(findings, 'structuralGrid', 'warning', 'max-span', `Building span ${maxSpan.toFixed(1)}m exceeds max ${c.maxSpanM}m`, { actual: maxSpan, expected: c.maxSpanM })
  }
}

function evaluateBuildingServices(
  c: TypologyConstraints['buildingServices'],
  input: ConstraintEvaluatorInput,
  findings: ConstraintFinding[],
): void {
  if (c.plumbing) {
    const wetRooms = findMatchingRooms(input.rooms, ['bathroom', 'kitchen', 'toilet', 'laundry', 'shower', 'wash'])
    if (wetRooms.length === 0) {
      addFinding(findings, 'buildingServices', 'info', 'services-plumbing', 'No wet rooms found for plumbing services')
    }
  }
}

export function evaluateTypologyConstraints(
  typologyId: string,
  input: ConstraintEvaluatorInput,
): ConstraintEvaluation {
  const constraints = CONSTRAINT_REGISTRY[typologyId]
  if (!constraints) {
    return {
      typologyId,
      passed: false,
      score: 0,
      findings: [{ domain: 'functionalZoning', severity: 'error', rule: 'unknown-typology', message: `No constraints found for typology "${typologyId}"` }],
      summary: { totalRules: 1, errors: 1, warnings: 0, info: 0, passed: 0 },
    }
  }

  const findings: ConstraintFinding[] = []

  evaluateFunctionalZoning(constraints.functionalZoning, input, findings)
  evaluateCorePlanning(constraints.corePlanning, input, findings)
  evaluateWorkspaceLayouts(constraints.workspaceLayouts, input, findings)
  evaluateMeetingRooms(constraints.meetingRooms, input, findings)
  evaluateReception(constraints.reception, input, findings)
  evaluateEmergencyExits(constraints.emergencyExits, input, findings)
  evaluateDaylighting(constraints.daylighting, input, findings)
  evaluateAccessibility(constraints.accessibility, input, findings)
  evaluateStructuralGrid(constraints.structuralGrid, input, findings)
  evaluateBuildingServices(constraints.buildingServices, input, findings)

  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.filter((f) => f.severity === 'warning').length
  const info = findings.filter((f) => f.severity === 'info').length
  const totalRules = findings.length
  const passed = totalRules - errors - warnings - info
  const score = totalRules > 0 ? passed / totalRules : 1

  return {
    typologyId,
    passed: errors === 0,
    score,
    findings,
    summary: { totalRules, errors, warnings, info, passed },
  }
}
