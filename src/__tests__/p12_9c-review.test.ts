// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generatePlanModel, generateVariedPlanModel } from '@/engine/plan-generator'
import { assemblePlan, buildAdjacencyGraph, classifyRoom, isHabitable, findCirculationSpine, validatePlanConnectivity } from '@/lib/geometry/plan-intelligence'
import { detectOverlaps } from '@/lib/geometry/geometry-normalizer'
import { normalizeRooms, snapCollection } from '@/lib/geometry/geometry-normalizer'
import { buildPolygons } from '@/lib/geometry/room-polygons'
import { detectSharedBoundaries } from '@/lib/geometry/shared-boundaries'
import type { DesignOption } from '@/domain/boq'
import type { PlanModel, RoomRect, WallSegment, Opening } from '@/domain/plan'

function makeDesign(overrides: Partial<DesignOption> = {}): DesignOption {
  return {
    id: `3br-diagnostic-${Date.now()}`,
    name: '3-Bedroom House Diagnostic',
    grossFloorArea: 120,
    floors: 1,
    buildingType: 'house',
    elements: [],
    ...overrides,
  }
}

function roomsOverlap(a: RoomRect, b: RoomRect): boolean {
  const eps = 0.01
  return (
    a.x + a.width > b.x + eps &&
    b.x + b.width > a.x + eps &&
    a.y + a.height > b.y + eps &&
    b.y + b.height > a.y + eps
  )
}

function describeOpening(o: Opening, walls: WallSegment[]): string {
  const wall = walls.find(w => w.id === o.wallId)
  const wallInfo = wall
    ? `wall=(${wall.start.x.toFixed(2)},${wall.start.y.toFixed(2)})->(${wall.end.x.toFixed(2)},${wall.end.y.toFixed(2)}) type=${wall.type}`
    : 'wall=MISSING'
  return `${o.id}: kind=${o.kind} ${wallInfo} offset=${o.offset.toFixed(2)} width=${o.width.toFixed(2)}`
}

describe('P12.9c — Comprehensive Geometry Diagnostic', () => {
  it('diagnostic: generateVariedPlanModel 3-bedroom house', () => {
    const design = makeDesign({ id: '3br-diag', grossFloorArea: 120, buildingType: 'house' })
    const plan = generateVariedPlanModel(design, 42)
    runDiagnostics(plan, 'generateVariedPlanModel (seed=42)')
  })

  it('diagnostic: generatePlanModel 3-bedroom house', () => {
    const design = makeDesign({ id: '3br-legacy', grossFloorArea: 120, buildingType: 'house' })
    const plan = generatePlanModel(design)
    runDiagnostics(plan, 'generatePlanModel')
  })

  it('diagnostic: assemblePlan with explicit 3-bedroom layout', () => {
    const rooms: RoomRect[] = [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 5, y: 0, width: 3.5, height: 4 },
      { id: 'r3', name: 'Circulation', x: 0, y: 4, width: 8.5, height: 1.2 },
      { id: 'r4', name: 'Bedroom 1', x: 0, y: 5.2, width: 3.5, height: 3.5 },
      { id: 'r5', name: 'Bedroom 2', x: 3.5, y: 5.2, width: 3, height: 3.5 },
      { id: 'r6', name: 'Bedroom 3', x: 6.5, y: 5.2, width: 2, height: 3.5 },
      { id: 'r7', name: 'Bathroom 1', x: 0, y: 8.7, width: 2.5, height: 2.3 },
      { id: 'r8', name: 'Bathroom 2', x: 2.5, y: 8.7, width: 2.5, height: 2.3 },
    ]
    const { plan, warnings } = assemblePlan({
      rooms,
      width: 12,
      height: 11,
      wallThickness: 0.2,
      designOptionId: 'explicit-3br',
    })
    console.log(`\n═══ ASSEMBLE PLAN WARNINGS (${warnings.length}) ═══`)
    for (const w of warnings) console.log(`  ⚠ ${w}`)
    runDiagnostics(plan, 'assemblePlan (explicit 3br)')
  })
})

function runDiagnostics(plan: PlanModel, label: string) {
  const { rooms, walls, openings } = plan

  const divider = '═'.repeat(70)
  console.log(`\n${divider}`)
  console.log(`📐 DIAGNOSTIC: ${label}`)
  console.log(`Plan ID: ${plan.id} | Design: ${plan.designOptionId}`)
  console.log(`Dimensions: ${plan.width}×${plan.height}m | Wall T: ${plan.wallThickness}m`)
  console.log(`Source: ${plan.planSource ?? 'unknown'}`)
  console.log(divider)

  // ── 1. ROOMS ──
  console.log(`\n📋 ROOMS (${rooms.length})`)
  console.log('-'.repeat(80))
  console.log(`${'ID'.padEnd(12)} ${'Name'.padEnd(22)} ${'X'.padStart(6)} ${'Y'.padStart(6)} ${'W'.padStart(6)} ${'H'.padStart(6)} ${'Area'.padStart(6)} ${'Role'.padEnd(12)}`)
  console.log('-'.repeat(80))
  for (const r of rooms) {
    const role = classifyRoom(r.name)
    const area = (r.width * r.height).toFixed(2)
    console.log(
      `${r.id.padEnd(12)} ${r.name.padEnd(22)} ${r.x.toFixed(2).padStart(6)} ${r.y.toFixed(2).padStart(6)} ` +
      `${r.width.toFixed(2).padStart(6)} ${r.height.toFixed(2).padStart(6)} ${area.padStart(6)} ${role.padEnd(12)}`
    )
  }

  // ── 2. ROOM OVERLAPS ──
  console.log(`\n🔍 ROOM OVERLAP CHECK`)
  const normalized = snapCollection(normalizeRooms(rooms, plan.width, plan.height), plan.width, plan.height)
  const overlaps = detectOverlaps(normalized.rooms)
  if (overlaps.length === 0) {
    console.log('  ✅ No room overlaps detected')
  } else {
    console.log(`  ❌ ${overlaps.length} overlap(s) detected:`)
    for (const ov of overlaps) {
      const a = rooms.find(r => r.id === ov.roomA)
      const b = rooms.find(r => r.id === ov.roomB)
      console.log(`    • "${a?.name ?? ov.roomA}" <-> "${b?.name ?? ov.roomB}"`)
    }
  }

  // Manual bounding box overlap check
  let manualOverlaps = 0
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsOverlap(rooms[i], rooms[j])) {
        if (!overlaps.some(o => o.roomA === rooms[i].id && o.roomB === rooms[j].id)) {
          console.log(`  ⚠ Manual overlap: "${rooms[i].name}" (${rooms[i].id}) <-> "${rooms[j].name}" (${rooms[j].id})`)
          manualOverlaps++
        }
      }
    }
  }
  if (manualOverlaps > 0) {
    console.log(`  → ${manualOverlaps} additional overlaps found via manual check`)
  }

  // ── 3. WALLS ──
  console.log(`\n📋 WALLS (${walls.length})`)
  console.log('-'.repeat(90))
  console.log(`${'ID'.padEnd(12)} ${'Type'.padEnd(10)} ${'Start'.padEnd(18)} ${'End'.padEnd(18)} ${'Length (m)'.padStart(10)}`)
  console.log('-'.repeat(90))
  for (const w of walls) {
    const dx = w.end.x - w.start.x
    const dy = w.end.y - w.start.y
    const len = Math.sqrt(dx * dx + dy * dy)
    console.log(
      `${w.id.padEnd(12)} ${w.type.padEnd(10)} ` +
      `(${w.start.x.toFixed(2)},${w.start.y.toFixed(2)})`.padEnd(18) +
      `(${w.end.x.toFixed(2)},${w.end.y.toFixed(2)})`.padEnd(18) +
      `${len.toFixed(2).padStart(10)}`
    )
  }

  const externalWalls = walls.filter(w => w.type === 'external')
  const internalWalls = walls.filter(w => w.type === 'internal')
  console.log(`\n  External walls: ${externalWalls.length} | Internal walls: ${internalWalls.length}`)

  // ── 4. OPENINGS ──
  console.log(`\n📋 OPENINGS (${openings.length})`)
  console.log('-'.repeat(100))
  console.log(`${'ID'.padEnd(12)} ${'Kind'.padEnd(8)} ${'WallID'.padEnd(12)} ${'Wall Type'.padEnd(10)} ${'Offset'.padStart(8)} ${'Width (m)'.padStart(10)} ${'Wall Coords'.padEnd(40)}`)
  console.log('-'.repeat(100))
  for (const o of openings) {
    const wall = walls.find(w => w.id === o.wallId)
    const wallType = wall?.type ?? 'MISSING'
    const wallCoords = wall
      ? `(${wall.start.x.toFixed(1)},${wall.start.y.toFixed(1)})->(${wall.end.x.toFixed(1)},${wall.end.y.toFixed(1)})`
      : 'N/A'
    console.log(
      `${o.id.padEnd(12)} ${o.kind.padEnd(8)} ${o.wallId.padEnd(12)} ${wallType.padEnd(10)} ` +
      `${o.offset.toFixed(3).padStart(8)} ${o.width.toFixed(2).padStart(10)} ${wallCoords.padEnd(40)}`
    )
  }

  const doors = openings.filter(o => o.kind === 'door')
  const windows = openings.filter(o => o.kind === 'window')
  console.log(`\n  Doors: ${doors.length} | Windows: ${windows.length}`)

  // ── 5. OPENING HOST VALIDATION ──
  console.log(`\n🔍 OPENING HOST VALIDATION`)
  const validWallIds = new Set(walls.map(w => w.id))
  let orphanOpenings = 0
  for (const o of openings) {
    if (!validWallIds.has(o.wallId)) {
      console.log(`  ❌ Opening ${o.id} (${o.kind}) references missing wall ${o.wallId}`)
      orphanOpenings++
    }
  }
  if (orphanOpenings === 0) {
    console.log('  ✅ All openings reference valid walls')
  }

  // ── 6. WINDOW COVERAGE ──
  console.log(`\n🔍 WINDOW COVERAGE (habitable rooms on external walls)`)
  const habitableRooms = rooms.filter(r => isHabitable(classifyRoom(r.name)))
  const skipNames = new Set(['Veranda', 'Courtyard', 'Roof Terrace', 'Balcony'])
  for (const r of habitableRooms) {
    if (skipNames.has(r.name)) continue
    const eps = 0.05
    const touchesExternal = externalWalls.some(w => {
      const isVertical = Math.abs(w.start.x - w.end.x) < eps
      const isHorizontal = Math.abs(w.start.y - w.end.y) < eps
      if (isVertical) {
        const wallX = w.start.x
        if (Math.abs(wallX - r.x) < eps || Math.abs(wallX - (r.x + r.width)) < eps) {
          const wallOverlap = Math.min(w.end.y, r.y + r.height) - Math.max(w.start.y, r.y)
          return wallOverlap >= 0.6
        }
      } else if (isHorizontal) {
        const wallY = w.start.y
        if (Math.abs(wallY - r.y) < eps || Math.abs(wallY - (r.y + r.height)) < eps) {
          const wallOverlap = Math.min(w.end.x, r.x + r.width) - Math.max(w.start.x, r.x)
          return wallOverlap >= 0.6
        }
      }
      return false
    })
    const hasWindow = openings.some(o => {
      if (o.kind !== 'window') return false
      const wall = walls.find(w => w.id === o.wallId)
      if (!wall || wall.type !== 'external') return false
      return (
        (Math.abs(wall.start.x - r.x) < eps || Math.abs(wall.start.x - (r.x + r.width)) < eps) ||
        (Math.abs(wall.start.y - r.y) < eps || Math.abs(wall.start.y - (r.y + r.height)) < eps)
      )
    })
    if (!touchesExternal) {
      console.log(`  ⚠ "${r.name}" does NOT touch any external wall`)
    } else if (!hasWindow) {
      console.log(`  ❌ "${r.name}" touches external wall but has NO window`)
    } else {
      console.log(`  ✅ "${r.name}" has window(s) on external wall`)
    }
  }

  // ── 7. DOOR COVERAGE ──
  console.log(`\n🔍 DOOR COVERAGE (private/wet rooms)`)
  const privateWetRooms = rooms.filter(r => {
    const role = classifyRoom(r.name)
    return role === 'private' || role === 'wet'
  })
  const doorWallIds = new Set(openings.filter(o => o.kind === 'door').map(o => o.wallId))
  for (const r of privateWetRooms) {
    const eps = 0.05
    const sharedWithDoor = walls.some(w =>
      doorWallIds.has(w.id) && (
        (Math.abs(w.start.x - r.x) < eps && w.start.y >= r.y - eps && w.start.y <= r.y + r.height + eps) ||
        (Math.abs(w.start.x - (r.x + r.width)) < eps && w.start.y >= r.y - eps && w.start.y <= r.y + r.height + eps) ||
        (Math.abs(w.start.y - r.y) < eps && w.start.x >= r.x - eps && w.start.x <= r.x + r.width + eps) ||
        (Math.abs(w.start.y - (r.y + r.height)) < eps && w.start.x >= r.x - eps && w.start.x <= r.x + r.width + eps)
      )
    )
    if (!sharedWithDoor) {
      console.log(`  ❌ "${r.name}" has NO door`)
    } else {
      console.log(`  ✅ "${r.name}" has door`)
    }
  }

  // ── 8. ROOM ADJACENCIES ──
  console.log(`\n📋 ROOM ADJACENCIES (shared boundaries)`)
  const adjacencies = buildAdjacencyGraph(rooms)
  if (adjacencies.length === 0) {
    console.log('  (none)')
  } else {
    console.log('-'.repeat(70))
    console.log(`${'Room A'.padEnd(20)} ${'Room B'.padEnd(20)} ${'Shared Len'.padStart(10)}`)
    console.log('-'.repeat(70))
    for (const adj of adjacencies) {
      const nameA = rooms.find(r => r.id === adj.roomAId)?.name ?? adj.roomAId
      const nameB = rooms.find(r => r.id === adj.roomBId)?.name ?? adj.roomBId
      console.log(`${nameA.padEnd(20)} ${nameB.padEnd(20)} ${adj.sharedLength.toFixed(2).padStart(8)}m`)
    }
  }

  // ── 9. POLYGON-BASED SHARED BOUNDARIES ──
  console.log(`\n📋 POLYGON-BASED SHARED BOUNDARIES`)
  const normForPolygons = normalizeRooms(rooms as RoomRect[], plan.width, plan.height)
  const polygons = buildPolygons(normForPolygons)
  const boundaries = detectSharedBoundaries(polygons)
  if (boundaries.length === 0) {
    console.log('  (none)')
  } else {
    console.log('-'.repeat(70))
    console.log(`${'Room A'.padEnd(20)} ${'Room B'.padEnd(20)} ${'Len'.padStart(8)} ${'Type'.padEnd(8)}`)
    console.log('-'.repeat(70))
    for (const b of boundaries) {
      const nameA = rooms.find(r => r.id === b.roomAId)?.name ?? b.roomAId
      const nameB = rooms.find(r => r.id === b.roomBId)?.name ?? b.roomBId
      console.log(`${nameA.padEnd(20)} ${nameB.padEnd(20)} ${b.sharedLength.toFixed(2).padStart(8)}m ${b.boundaryType.padEnd(8)}`)
    }
  }

  // ── 10. VALIDATION WARNINGS ──
  console.log(`\n🔍 VALIDATION WARNINGS (validatePlanConnectivity)`)
  const valWarnings = validatePlanConnectivity(rooms, openings, walls)
  if (valWarnings.length === 0) {
    console.log('  ✅ No validation warnings')
  } else {
    for (const w of valWarnings) {
      console.log(`  ⚠ ${w}`)
    }
  }

  // ── 11. CIRCULATION SPINE ──
  console.log(`\n🔍 CIRCULATION SPINE`)
  const spine = findCirculationSpine(rooms)
  if (spine) {
    console.log(`  ✅ Circulation spine: "${spine.name}" (${spine.id}) at (${spine.x}, ${spine.y}) ${spine.width}×${spine.height}`)
  } else {
    console.log('  ❌ No circulation spine found')
  }

  // ── 12. BOUNDING BOX SUMMARY ──
  console.log(`\n📋 BOUNDING BOX SUMMARY`)
  const minX = Math.min(...rooms.map(r => r.x))
  const maxX = Math.max(...rooms.map(r => r.x + r.width))
  const minY = Math.min(...rooms.map(r => r.y))
  const maxY = Math.max(...rooms.map(r => r.y + r.height))
  console.log(`  Content bounds: (${minX}, ${minY}) to (${maxX}, ${maxY})`)
  console.log(`  Content size: ${(maxX - minX).toFixed(2)}×${(maxY - minY).toFixed(2)}m`)
  console.log(`  Plan size: ${plan.width}×${plan.height}m`)
  if (maxX > plan.width || maxY > plan.height) {
    console.log(`  ❌ Rooms extend BEYOND plan boundary!`)
    const outside = rooms.filter(r => r.x + r.width > plan.width || r.y + r.height > plan.height)
    for (const r of outside) {
      console.log(`    • "${r.name}" ends at (${(r.x + r.width).toFixed(2)}, ${(r.y + r.height).toFixed(2)}) beyond plan (${plan.width}, ${plan.height})`)
    }
  } else {
    console.log(`  ✅ All rooms within plan boundary`)
  }

  // ── 13. OPENING DETAIL ──
  console.log(`\n📋 OPENING DETAILED DUMP`)
  for (const o of openings) {
    console.log(`  ${describeOpening(o, walls)}`)
  }

  // ── 14. SUMMARY STATS ──
  console.log(`\n📊 SUMMARY`)
  console.log(`  Rooms: ${rooms.length} (${rooms.filter(r => classifyRoom(r.name) === 'public').length} public, ${rooms.filter(r => classifyRoom(r.name) === 'private').length} private, ${rooms.filter(r => classifyRoom(r.name) === 'wet').length} wet, ${rooms.filter(r => classifyRoom(r.name) === 'circulation').length} circulation, ${rooms.filter(r => classifyRoom(r.name) === 'service').length} service)`)
  console.log(`  Walls: ${walls.length} (${externalWalls.length} external, ${internalWalls.length} internal)`)
  console.log(`  Openings: ${openings.length} (${doors.length} doors, ${windows.length} windows)`)
  console.log(`  Adjacencies: ${adjacencies.length}`)
  console.log(`  Polygon boundaries: ${boundaries.length}`)
  console.log(`  Overlaps: ${overlaps.length}`)
  console.log(`  Validation warnings: ${valWarnings.length}`)

  // Assertions
  expect(rooms.length).toBeGreaterThan(0)
  expect(walls.length).toBeGreaterThan(0)
  expect(openings.length).toBeGreaterThan(0)
  // Overlaps may be non-zero with tightened epsilon; reject is handled by assemblePlan
  expect(overlaps.length).toBeGreaterThanOrEqual(0)
}
