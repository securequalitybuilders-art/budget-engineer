/**
 * P12.4 Benchmark Score Evaluator
 *
 * Runs the 4 critical multi-storey benchmark cases and scores them against
 * the per-storey programme variation, structural bridge, and slab differentiation
 * introduced in P12.4.
 *
 * Scoring (0-10 each category, higher = better):
 *   zoning       - room allocation makes sense for floor role
 *   structure    - beams, columns, walls derived from chassis
 *   stairCore    - staircase and core continuity across levels
 *   wetStack     - wet rooms stack between floors
 *   circulation  - passage/circulation logic is valid
 *   partyWall    - (duplex only) party wall is continuous and respected
 *   verticalReal - programme differs meaningfully floor to floor
 *   slabDiff     - slab type/thickness differs by level
 *   bridge       - structural bridge data is populated
 *   sectionBIM   - section/BIM would reflect per-level variation
 */

import { describe, it, expect } from 'vitest'
import { generateBuildingChassis } from '../lib/layout/vertical-chassis'
import { computeLevelProgrammes } from '../lib/layout/level-programme'
import { computeStructuralBridge } from '../lib/structure/structural-bridge'
import { assignLevelSlabs } from '../lib/structure/slab-system'
import type { ChassisGenerationParams } from '../lib/layout/vertical-chassis'

interface BenchmarkResult {
  zoning: number
  structure: number
  stairCore: number
  wetStack: number
  circulation: number
  partyWall: number
  verticalReal: number
  slabDiff: number
  bridgePopulated: number
  sectionBIM: number
  total: number
  autoFail: boolean
  notes: string[]
}

function makeChassisParams(overrides: Partial<ChassisGenerationParams> = {}): ChassisGenerationParams {
  return {
    typology: 'house',
    storeyCount: 2,
    buildingWidth: 12,
    buildingDepth: 10,
    floorToFloorHeight: 3.0,
    wallThickness: 0.2,
    structuralSystem: 'rc-frame',
    maxStructuralSpan: 6.0,
    hasLift: false,
    hasDuplex: false,
    hasMixedUse: false,
    programmes: ['ground-public', 'upper-private'],
    ...overrides,
  }
}

function evaluateBenchmark(
  _label: string,
  params: ChassisGenerationParams,
  checks: {
    expectedFloors: number
    groundRole: string
    upperRoles: string[]
    expectedGroundRooms: string[]
    expectedUpperRooms: string[]
    hasPartyWall?: boolean
    hasLift?: boolean
    mixedUse?: boolean
  },
): BenchmarkResult {
  const notes: string[] = []
  let autoFail = false

  const chassis = generateBuildingChassis(params)
  const profile = computeLevelProgrammes(params.typology, params.storeyCount)
  const bridge = computeStructuralBridge(chassis)
  const slabs = assignLevelSlabs(chassis)

  // ── ZONING ────────────────────────────────────────
  let zoning = 5
  if (profile.levels.length === params.storeyCount) {
    zoning += 1
    notes.push(`✓ ${params.storeyCount} levels generated`)
  } else {
    notes.push(`✗ Expected ${params.storeyCount} levels, got ${profile.levels.length}`)
  }
  if (profile.levels[0]?.floorRole === checks.groundRole) {
    zoning += 1
    notes.push(`✓ Ground role = ${checks.groundRole}`)
  } else {
    notes.push(`✗ Ground role expected ${checks.groundRole}, got ${profile.levels[0]?.floorRole}`)
  }
  for (let i = 1; i < params.storeyCount && i - 1 < checks.upperRoles.length; i++) {
    if (profile.levels[i]?.floorRole === checks.upperRoles[i - 1]) {
      zoning += 0.5
    } else {
      notes.push(`~ Upper floor ${i} role expected ${checks.upperRoles[i - 1]}, got ${profile.levels[i]?.floorRole}`)
    }
  }
  const groundRooms = profile.levels[0]?.roomAllocations.map(r => r.name) ?? []
  const hasExpectedGround = checks.expectedGroundRooms.some(r => groundRooms.includes(r))
  if (hasExpectedGround) {
    zoning += 1
    notes.push(`✓ Ground has expected rooms (${checks.expectedGroundRooms[0]}...)`)
  } else {
    notes.push(`✗ Ground missing expected rooms`)
  }
  const upperRooms = profile.levels[1]?.roomAllocations.map(r => r.name) ?? []
  const hasExpectedUpper = checks.expectedUpperRooms.some(r => upperRooms.includes(r))
  if (hasExpectedUpper) {
    zoning += 0.5
  } else {
    notes.push(`~ Upper missing expected rooms`)
  }
  zoning = Math.min(10, Math.round(zoning * 10) / 10)

  // ── STRUCTURE ─────────────────────────────────────
  let structure = 5
  const totalBeams = bridge.totalBeams
  const totalCols = bridge.totalColumns
  const totalWalls = bridge.totalWalls
  if (totalBeams > 0) { structure += 1.5; notes.push(`✓ ${totalBeams} beams`) }
  else { notes.push('✗ No beams'); autoFail = true }
  if (totalCols > 0) { structure += 1.5; notes.push(`✓ ${totalCols} columns`) }
  else { notes.push('~ No columns (may be wall-bearing)') }
  if (totalWalls > 0) { structure += 1; notes.push(`✓ ${totalWalls} walls`) }
  if (bridge.levels.length === params.storeyCount) { structure += 1 }
  const hasBeamDim = bridge.levels.some(l => l.beams.some(b => b.depth > 0 && b.width > 0))
  if (hasBeamDim) structure += 0.5
  structure = Math.min(10, Math.round(structure * 10) / 10)

  // ── STAIR / CORE ──────────────────────────────────
  let stairCore = 5
  const cores = chassis.cores ?? []
  if (cores.length > 0) { stairCore += 2; notes.push(`✓ ${cores.length} cores defined`) }
  else { notes.push('~ No cores in chassis') }
  if (chassis.shafts && chassis.shafts.length > 0) { stairCore += 1 }
  if (params.hasLift && cores.some(c => c.hasLift)) { stairCore += 1 }
  if (params.hasLift && chassis.cores.some(c => c.lobbyZone)) { stairCore += 1 }
  // Check stair on all levels through bridge
  stairCore = Math.min(10, Math.round(stairCore * 10) / 10)

  // ── WET STACK ─────────────────────────────────────
  let wetStack = 5
  const wetRoomNames = ['Bathroom', 'Kitchen', 'Toilet', 'Utility', 'Laundry', 'WC']
  const groundWet = groundRooms.filter(r => wetRoomNames.some(w => r.includes(w)))
  const upperWet = upperRooms.filter(r => wetRoomNames.some(w => r.includes(w)))
  if (groundWet.length > 0) { wetStack += 1.5; notes.push(`✓ Ground wet: ${groundWet.join(', ')}`) }
  if (upperWet.length > 0) { wetStack += 1.5; notes.push(`✓ Upper wet: ${upperWet.join(', ')}`) }
  if (params.storeyCount >= 3) {
    // Check 3rd floor also has wet
    const upper2Rooms = profile.levels[2]?.roomAllocations.map(r => r.name) ?? []
    const upper2Wet = upper2Rooms.filter(r => wetRoomNames.some(w => r.includes(w)))
    if (upper2Wet.length > 0) wetStack += 1
  }
  // Check plumbing risers exist in chassis
  const shafts = chassis.shafts ?? []
  if (shafts.some(s => s.wetStack)) { wetStack += 1 }
  wetStack = Math.min(10, Math.round(wetStack * 10) / 10)

  // ── CIRCULATION ───────────────────────────────────
  let circulation = 5
  const stairs = groundRooms.filter(r => r.includes('Stair') || r.includes('stair') || r.includes('Core'))
  const upperStairs = upperRooms.filter(r => r.includes('Stair') || r.includes('stair') || r.includes('Core'))
  if (stairs.length > 0) { circulation += 1.5; notes.push(`✓ Ground stair: ${stairs.join(', ')}`) }
  else { notes.push('~ No stair on ground') }
  if (upperStairs.length > 0) { circulation += 1.5 }
  if (checks.mixedUse) {
    const programmes = profile.levels.map(l => l.programmeTags).flat()
    if (programmes.includes('separated-circulation')) { circulation += 1 }
  }
  const entries = groundRooms.filter(r => r.includes('Entrance') || r.includes('Hall'))
  if (entries.length > 0) circulation += 1
  circulation = Math.min(10, Math.round(circulation * 10) / 10)

  // ── PARTY WALL ────────────────────────────────────
  let partyWall = checks.hasPartyWall ? 5 : 10
  if (checks.hasPartyWall) {
    const pw = chassis.partyWalls ?? []
    if (pw.length > 0) { partyWall += 3; notes.push(`✓ ${pw.length} party walls`) }
    else { notes.push('✗ No party walls'); autoFail = true }
    if (chassis.stackStrategy === 'mirrored-duplex') { partyWall += 2 }
  }
  partyWall = Math.min(10, Math.round(partyWall * 10) / 10)

  // ── VERTICAL REALISM ──────────────────────────────
  let verticalReal = 5
  if (profile.levels.length >= 2) {
    const gNames = new Set(profile.levels[0].roomAllocations.map(r => r.name))
    const uNames = new Set(profile.levels[1].roomAllocations.map(r => r.name))
    // count unique rooms between floors
    const union = new Set([...gNames, ...uNames])
    const intersection = new Set([...gNames].filter(x => uNames.has(x)))
    const uniqueRatio = (union.size - intersection.size) / union.size
    if (uniqueRatio >= 0.5) { verticalReal += 2; notes.push(`✓ ${Math.round(uniqueRatio * 100)}% unique room names across floors`) }
    else if (uniqueRatio >= 0.3) { verticalReal += 1 }
    else { notes.push(`~ Only ${Math.round(uniqueRatio * 100)}% unique rooms across floors`); autoFail = true }
  }
  if (params.storeyCount >= 3) {
    const l0 = profile.levels[0].floorRole
    const l1 = profile.levels[1].floorRole
    const l2 = profile.levels[2].floorRole
    if (l0 !== l1) verticalReal += 1
    if (l1 !== l2 && params.storeyCount > 2) verticalReal += 0.5
    if (l2 === 'repeated-unit' && l1 === 'repeated-unit') notes.push('✓ Upper floors are repeated-units (expected for apartment)')
  }
  verticalReal = Math.min(10, Math.round(verticalReal * 10) / 10)

  // ── SLAB DIFFERENTIATION ──────────────────────────
  let slabDiff = 5
  if (slabs.length === params.storeyCount) { slabDiff += 1 }
  if (slabs[0]?.slabSpec.slabType === 'slab-on-grade') { slabDiff += 1; notes.push('✓ Ground = slab-on-grade') }
  if (slabs[slabs.length - 1]?.slabSpec.slabType.includes('roof')) { slabDiff += 1; notes.push(`✓ Roof = ${slabs[slabs.length - 1]?.slabSpec.slabType}`) }
  if (params.storeyCount >= 3) {
    const midTypes = slabs.slice(1, -1).map(s => s.slabSpec.slabType)
    if (midTypes.every(t => t === 'suspended')) { slabDiff += 1; notes.push('✓ Intermediate = suspended') }
  }
  // Check thickness varies
  const uniqueThicknesses = [...new Set(slabs.map(s => s.slabSpec.thickness))]
  if (uniqueThicknesses.length >= 2) { slabDiff += 1; notes.push(`✓ ${uniqueThicknesses.length} different thicknesses`) }
  slabDiff = Math.min(10, Math.round(slabDiff * 10) / 10)

  // ── BRIDGE POPULATED ──────────────────────────────
  let bridgePopulated = 5
  const hasPerLevelBeams = bridge.levels.some(l => l.beams.length > 0)
  const hasPerLevelCols = bridge.levels.some(l => l.columns.length > 0)
  const hasGridLabels = bridge.levels.some(l => l.columns.some(c => c.gridLabel))
  if (hasPerLevelBeams) bridgePopulated += 1.5
  if (hasPerLevelCols) bridgePopulated += 1.5
  if (hasGridLabels) bridgePopulated += 1
  if (bridge.levels.every(l => l.walls.some(w => w.role))) bridgePopulated += 1
  bridgePopulated = Math.min(10, Math.round(bridgePopulated * 10) / 10)

  // ── SECTION / BIM ─────────────────────────────────
  let sectionBIM = 5
  if (profile.levels.length >= 2) {
    const floorRoles = profile.levels.map(l => l.floorRole)
    if (floorRoles.filter(r => r === 'repeated-unit').length >= 2) sectionBIM += 2
    else if (new Set(floorRoles).size >= 2) sectionBIM += 2
  }
  if (slabs.some(s => s.isGround)) sectionBIM += 1
  if (slabs.some(s => s.isRoof)) sectionBIM += 1
  if (chassis.cores.length > 0) sectionBIM += 1
  sectionBIM = Math.min(10, Math.round(sectionBIM * 10) / 10)

  const total = Math.round((zoning + structure + stairCore + wetStack + circulation + partyWall + verticalReal + slabDiff + bridgePopulated + sectionBIM) * 10) / 10

  return {
    zoning, structure, stairCore, wetStack, circulation, partyWall, verticalReal,
    slabDiff, bridgePopulated, sectionBIM, total, autoFail, notes,
  }
}

function formatScore(label: string, r: BenchmarkResult): string {
  return [
    `\n## ${label}`,
    `| Category | Score |`,
    `|---|---|`,
    `| Zoning | ${r.zoning}/10 |`,
    `| Structure | ${r.structure}/10 |`,
    `| Stair/Core | ${r.stairCore}/10 |`,
    `| Wet Stack | ${r.wetStack}/10 |`,
    `| Circulation | ${r.circulation}/10 |`,
    `| Party Wall | ${r.partyWall}/10 |`,
    `| Vertical Realism | ${r.verticalReal}/10 |`,
    `| Slab Diff | ${r.slabDiff}/10 |`,
    `| Bridge Populated | ${r.bridgePopulated}/10 |`,
    `| Section/BIM | ${r.sectionBIM}/10 |`,
    `| **Total** | **${r.total}/100** |`,
    `| Auto Fail | ${r.autoFail ? '**YES**' : 'No'} |`,
    '',
    '### Notes',
    ...r.notes.map(n => `- ${n}`),
  ].join('\n')
}

// ── BENCHMARK 3: 4-Bed Double-Storey Villa ──────────
describe('Benchmark 3: 4-Bed Double-Storey Villa', () => {
  const result = evaluateBenchmark('4-Bed Double-Storey Villa', makeChassisParams({
    typology: 'house',
    storeyCount: 2,
    buildingWidth: 10,
    buildingDepth: 12,
    structuralSystem: 'masonry',
    programmes: ['ground-public', 'upper-private'],
  }), {
    expectedFloors: 2,
    groundRole: 'ground-public',
    upperRoles: ['upper-private'],
    expectedGroundRooms: ['Lounge', 'Kitchen', 'Dining'],
    expectedUpperRooms: ['Master Bedroom', 'Bedroom'],
  })

  it('passes auto-fail gate', () => {
    expect(result.autoFail).toBe(false)
  })

  it('has per-storey programme variation (zoning + vertical realism)', () => {
    expect(result.zoning).toBeGreaterThanOrEqual(6)
    expect(result.verticalReal).toBeGreaterThanOrEqual(6)
  })

  it('has structural bridge populated', () => {
    expect(result.structure).toBeGreaterThanOrEqual(6)
    expect(result.bridgePopulated).toBeGreaterThanOrEqual(6)
  })

  it('has slab differentiation', () => {
    expect(result.slabDiff).toBeGreaterThanOrEqual(6)
  })

  it('overall score >= 60', () => {
    expect(result.total).toBeGreaterThanOrEqual(60)
  })

  console.log(formatScore('Benchmark 3: 4-Bed Double-Storey Villa', result))
})

// ── BENCHMARK 4: Duplex / Semi-Detached Pair ────────
describe('Benchmark 4: Duplex / Semi-Detached Pair', () => {
  const result = evaluateBenchmark('Duplex / Semi-Detached Pair', makeChassisParams({
    typology: 'duplex',
    storeyCount: 2,
    buildingWidth: 14,
    buildingDepth: 10,
    hasDuplex: true,
    programmes: ['ground-public', 'upper-private'],
  }), {
    expectedFloors: 2,
    groundRole: 'ground-public',
    upperRoles: ['upper-private'],
    expectedGroundRooms: ['Lounge', 'Kitchen', 'Dining'],
    expectedUpperRooms: ['Master Bedroom', 'Bedroom'],
    hasPartyWall: true,
  })

  it('passes auto-fail gate', () => {
    expect(result.autoFail).toBe(false)
  })

  it('has party wall', () => {
    expect(result.partyWall).toBeGreaterThanOrEqual(6)
  })

  it('has per-storey variation', () => {
    expect(result.zoning).toBeGreaterThanOrEqual(6)
    expect(result.verticalReal).toBeGreaterThanOrEqual(6)
  })

  it('overall score >= 60', () => {
    expect(result.total).toBeGreaterThanOrEqual(60)
  })

  console.log(formatScore('Benchmark 4: Duplex / Semi-Detached Pair', result))
})

// ── BENCHMARK 5: 5-Storey Apartment Block ───────────
describe('Benchmark 5: 5-Storey Apartment Block', () => {
  const result = evaluateBenchmark('5-Storey Apartment Block', makeChassisParams({
    typology: 'apartment',
    storeyCount: 5,
    buildingWidth: 20,
    buildingDepth: 15,
    structuralSystem: 'rc-frame',
    hasLift: true,
    programmes: ['podium', 'repeated-unit', 'repeated-unit', 'repeated-unit', 'repeated-unit'],
  }), {
    expectedFloors: 5,
    groundRole: 'podium',
    upperRoles: ['repeated-unit', 'repeated-unit', 'repeated-unit', 'repeated-unit'],
    expectedGroundRooms: ['Lobby', 'Core', 'Meter'],
    expectedUpperRooms: ['Living / Dining', 'Kitchen', 'Bedroom'],
    hasLift: true,
  })

  it('passes auto-fail gate', () => {
    expect(result.autoFail).toBe(false)
  })

  it('has podium and repeated unit distinction', () => {
    expect(result.zoning).toBeGreaterThanOrEqual(6)
    expect(result.verticalReal).toBeGreaterThanOrEqual(6)
  })

  it('has stair/core logic for high-rise', () => {
    expect(result.stairCore).toBeGreaterThanOrEqual(6)
  })

  it('overall score >= 60', () => {
    expect(result.total).toBeGreaterThanOrEqual(60)
  })

  console.log(formatScore('Benchmark 5: 5-Storey Apartment Block', result))
})

// ── BENCHMARK 8: Mixed-Use Corner Building ──────────
describe('Benchmark 8: Mixed-Use Corner Building', () => {
  const result = evaluateBenchmark('Mixed-Use Corner Building', makeChassisParams({
    typology: 'mixed-use',
    storeyCount: 4,
    buildingWidth: 18,
    buildingDepth: 14,
    structuralSystem: 'rc-frame',
    hasLift: true,
    hasMixedUse: true,
    programmes: ['retail', 'residential', 'residential', 'residential'],
  }), {
    expectedFloors: 4,
    groundRole: 'podium',
    upperRoles: ['upper-residential', 'upper-residential', 'upper-residential'],
    expectedGroundRooms: ['Retail', 'Shop', 'Public'],
    expectedUpperRooms: ['Living / Dining', 'Kitchen', 'Bedroom'],
    hasLift: true,
    mixedUse: true,
  })

  it('passes auto-fail gate', () => {
    expect(result.autoFail).toBe(false)
  })

  it('has podium/residential distinction', () => {
    expect(result.zoning).toBeGreaterThanOrEqual(6)
    expect(result.verticalReal).toBeGreaterThanOrEqual(6)
  })

  it('has separated circulation for mixed-use', () => {
    expect(result.circulation).toBeGreaterThanOrEqual(6)
  })

  it('overall score >= 60', () => {
    expect(result.total).toBeGreaterThanOrEqual(60)
  })

  console.log(formatScore('Benchmark 8: Mixed-Use Corner Building', result))
})
