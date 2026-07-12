import type { BuildingGraph, Wall, Space } from '../../domain/building'

export interface DiffChange {
  type: 'added' | 'removed' | 'modified'
  entityType: 'wall' | 'slab' | 'opening' | 'space' | 'level' | 'column' | 'beam' | 'stair' | 'roof'
  id: string
  details: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export interface BuildingGraphDiff {
  changes: DiffChange[]
  wallCountDelta: number
  spaceCountDelta: number
  openingCountDelta: number
  levelCountDelta: number
  gfaDelta: number
}

function wallKey(w: Wall): string {
  return `${w.start.x},${w.start.y},${w.start.z}-${w.end.x},${w.end.y},${w.end.z}`
}

function wallFields(w: Wall): Record<string, unknown> {
  return { role: w.role, thickness: w.thickness, height: w.height, material: w.material }
}

function spaceFields(s: Space): Record<string, unknown> {
  return { programme: s.programme, areaM2: s.areaM2, name: s.name, levelId: s.levelId }
}

export function diffBuildingGraphs(a: BuildingGraph, b: BuildingGraph): BuildingGraphDiff {
  const changes: DiffChange[] = []

  const aWalls = new Map(a.walls.map((w) => [w.id, w]))
  const bWalls = new Map(b.walls.map((w) => [w.id, w]))
  for (const [id, wall] of aWalls) {
    if (!bWalls.has(id)) {
      changes.push({ type: 'removed', entityType: 'wall', id, details: `Wall ${id} removed (${wallKey(wall)})`, before: wallFields(wall) })
    }
  }
  for (const [id, wall] of bWalls) {
    if (!aWalls.has(id)) {
      changes.push({ type: 'added', entityType: 'wall', id, details: `Wall ${id} added (${wallKey(wall)})`, after: wallFields(wall) })
    }
  }

  const aSpaces = new Map(a.spaces.map((s) => [s.id, s]))
  const bSpaces = new Map(b.spaces.map((s) => [s.id, s]))
  for (const [id, space] of aSpaces) {
    if (!bSpaces.has(id)) {
      changes.push({ type: 'removed', entityType: 'space', id, details: `Space ${space.name} removed`, before: spaceFields(space) })
    }
  }
  for (const [id, space] of bSpaces) {
    if (!aSpaces.has(id)) {
      changes.push({ type: 'added', entityType: 'space', id, details: `Space ${space.name} added`, after: spaceFields(space) })
    } else {
      const orig = aSpaces.get(id)!
      if (orig.programme !== space.programme || Math.abs(orig.areaM2 - space.areaM2) > 0.01) {
        changes.push({ type: 'modified', entityType: 'space', id, details: `Space ${space.name} modified`, before: spaceFields(orig), after: spaceFields(space) })
      }
    }
  }

  const aOpenings = new Map(a.openings.map((o) => [o.id, o]))
  const bOpenings = new Map(b.openings.map((o) => [o.id, o]))
  for (const [id, op] of aOpenings) {
    if (!bOpenings.has(id)) changes.push({ type: 'removed', entityType: 'opening', id, details: `Opening ${id} (${op.kind}) removed` })
  }
  for (const [id, op] of bOpenings) {
    if (!aOpenings.has(id)) changes.push({ type: 'added', entityType: 'opening', id, details: `Opening ${id} (${op.kind}) added` })
  }

  if (a.levels.length !== b.levels.length) {
    changes.push({ type: 'modified', entityType: 'level', id: 'levels', details: `Levels: ${a.levels.length} → ${b.levels.length}` })
  }

  const aCols = a.columns.length
  const bCols = b.columns.length
  if (aCols !== bCols) {
    changes.push({ type: aCols > bCols ? 'removed' : 'added', entityType: 'column', id: 'columns', details: `Columns: ${aCols} → ${bCols}` })
  }

  const aBeams = a.beams.length
  const bBeams = b.beams.length
  if (aBeams !== bBeams) {
    changes.push({ type: aBeams > bBeams ? 'removed' : 'added', entityType: 'beam', id: 'beams', details: `Beams: ${aBeams} → ${bBeams}` })
  }

  const aStairs = a.stairs.length
  const bStairs = b.stairs.length
  if (aStairs !== bStairs) {
    changes.push({ type: aStairs > bStairs ? 'removed' : 'added', entityType: 'stair', id: 'stairs', details: `Stairs: ${aStairs} → ${bStairs}` })
  }

  const aRoof = !!a.roof
  const bRoof = !!b.roof
  if (aRoof !== bRoof) {
    changes.push({ type: bRoof ? 'added' : 'removed', entityType: 'roof', id: 'roof', details: `Roof ${bRoof ? 'added' : 'removed'}` })
  }

  const aGfa = a.spaces.reduce((s, sp) => s + sp.areaM2, 0)
  const bGfa = b.spaces.reduce((s, sp) => s + sp.areaM2, 0)

  return {
    changes,
    wallCountDelta: b.walls.length - a.walls.length,
    spaceCountDelta: b.spaces.length - a.spaces.length,
    openingCountDelta: b.openings.length - a.openings.length,
    levelCountDelta: b.levels.length - a.levels.length,
    gfaDelta: Math.round((bGfa - aGfa) * 100) / 100,
  }
}

export function formatGraphDiff(diff: BuildingGraphDiff): string {
  const lines: string[] = [`Changes: ${diff.changes.length}`]
  if (diff.wallCountDelta !== 0) lines.push(`Walls: ${diff.wallCountDelta > 0 ? '+' : ''}${diff.wallCountDelta}`)
  if (diff.spaceCountDelta !== 0) lines.push(`Spaces: ${diff.spaceCountDelta > 0 ? '+' : ''}${diff.spaceCountDelta}`)
  if (diff.gfaDelta !== 0) lines.push(`GFA: ${diff.gfaDelta > 0 ? '+' : ''}${diff.gfaDelta} m²`)
  for (const c of diff.changes) {
    lines.push(`  ${c.type === 'added' ? '[+]' : c.type === 'removed' ? '[-]' : '[~]'} ${c.entityType} ${c.id}: ${c.details}`)
  }
  return lines.join('\n')
}
