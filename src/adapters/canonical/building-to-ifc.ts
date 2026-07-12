import type { BuildingGraph } from '../../domain/building'
import { getLevelsSorted, getSpacesOnLevel, getWallsOnLevel, getOpeningsOnLevel } from '../../domain/building'

function nowStamp(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, '')
}

const GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'

function guid(): string {
  let s = ''
  for (let i = 0; i < 22; i++) s += GUID_CHARS[Math.floor(Math.random() * 64)]
  return s
}

function escapeStep(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function buildingGraphToIfcStep(graph: BuildingGraph): string | null {
  if (graph.levels.length === 0) return null

  let id = 0
  const lines: string[] = []
  const push = (body: string): string => { id += 1; lines.push(`#${id}= ${body};`); return String(id) }

  const header = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('Budget Engineer OS IFC export'),'2;1');",
    `FILE_NAME('${graph.meta.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.ifc','${nowStamp()}',(''),(''),'Budget Engineer OS','Budget Engineer OS','');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
  ]

  const person = push("IFCPERSON($,$,'Budget Engineer',$,$,$,$,$)")
  const org = push("IFCORGANIZATION($,'Budget Engineer OS',$,$,$)")
  const personOrg = push(`IFCPERSONANDORGANIZATION(${ref(person)},${ref(org)},$)`)
  const app = push("IFCAPPLICATION($," + ref(org) + ",'1.0','Budget Engineer OS','BEOS')")
  const ownerHistory = push(`IFCOWNERHISTORY(${ref(personOrg)},${ref(app)},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`)

  const axis = push('IFCDIRECTION((0.,0.,1.))')
  const refDir = push('IFCDIRECTION((1.,0.,0.))')
  const origin = push('IFCCARTESIANPOINT((0.,0.,0.))')
  const placement = push(`IFCAXIS2PLACEMENT3D(${ref(origin)},${ref(axis)},${ref(refDir)})`)
  const worldCtx = push(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,${ref(placement)},$)`)
  const lenUnit = push('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)')
  const areaUnit = push('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)')
  const volUnit = push('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)')
  const unitAssign = push(`IFCUNITASSIGNMENT((${ref(lenUnit)},${ref(areaUnit)},${ref(volUnit)}))`)
  const projPlacement = push(`IFCLOCALPLACEMENT($,${ref(placement)})`)

  const projectRef = push(`IFCPROJECT('${guid()}',${ref(ownerHistory)},'${escapeStep(graph.meta.name)}',$,$,$,$,(${ref(worldCtx)}),${ref(unitAssign)})`)
  const siteRef = push(`IFCSITE('${guid()}',${ref(ownerHistory)},'Site',$,$,${ref(projPlacement)},$,$,.ELEMENT.,$,$,$,$,$)`)
  const buildingRef = push(`IFCBUILDING('${guid()}',${ref(ownerHistory)},'${escapeStep(graph.meta.name)}',$,$,${ref(projPlacement)},$,$,.ELEMENT.,$,$,$)`)
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(projectRef)},(${ref(siteRef)}))`)
  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(siteRef)},(${ref(buildingRef)}))`)

  const sortedLevels = getLevelsSorted(graph)
  const storeyRefs: string[] = []

  for (const level of sortedLevels) {
    const storeyRef = push(`IFCBUILDINGSTOREY('${guid()}',${ref(ownerHistory)},'${escapeStep(level.name)}',$,$,${ref(projPlacement)},$,$,.ELEMENT.,${Number(level.elevation)})`)
    storeyRefs.push(storeyRef)

    const contained: string[] = []

    for (const wall of getWallsOnLevel(graph, level.id)) {
      const wallPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${wall.start.x},${wall.start.y},${wall.start.z})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
      const e = push(`IFCWALLSTANDARDCASE('${guid()}',${ref(ownerHistory)},'${escapeStep(wall.id)}',$,$,${ref(wallPlace)},$,IFCPOSITIVELENGTHMEASURE(${wall.thickness}),$)`)
      push(pset('WallProperties', { wallId: wall.id, role: wall.role, material: wall.material, ifcClass: wall.ifcClass, height: wall.height, length: distance(wall.start, wall.end) }))
      contained.push(e)
    }

    for (const slab of graph.slabs.filter((s) => s.levelId === level.id)) {
      const slabPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((0,${level.elevation},0)),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
      const e = push(`IFCSLAB('${guid()}',${ref(ownerHistory)},'${escapeStep(level.name)} Slab',$,$,${ref(slabPlace)},$,IFCSLABTYPE.FLOOR.)`)
      push(pset('SlabProperties', { slabId: slab.id, material: slab.material, thickness: slab.thickness }))
      contained.push(e)
    }

    for (const opening of getOpeningsOnLevel(graph, level.id)) {
      const wall = graph.walls.find((w) => w.id === opening.wallId)
      if (!wall) continue
      const cx = wall.start.x + (wall.end.x - wall.start.x) * opening.offsetRatio
      const cz = wall.start.z + (wall.end.z - wall.start.z) * opening.offsetRatio
      const opPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${cx},${level.elevation},${cz})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
      const cls = opening.kind === 'door' ? 'IFCDOOR' : opening.kind === 'window' ? 'IFCWINDOW' : 'IFCOPENINGELEMENT'
      const e = push(`${cls}('${guid()}',${ref(ownerHistory)},'${escapeStep(opening.kind)}',$,$,${ref(opPlace)},$,IFCPOSITIVELENGTHMEASURE(${opening.width}),IFCPOSITIVELENGTHMEASURE(${opening.height}))`)
      push(pset('OpeningProperties', { openingId: opening.id, kind: opening.kind, wallId: opening.wallId, width: opening.width, height: opening.height, sillHeight: opening.sillHeight, material: opening.material }))
      contained.push(e)
    }

    for (const space of getSpacesOnLevel(graph, level.id)) {
      const spacePlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${space.bbox.minX},${level.elevation},${space.bbox.minY})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
      const e = push(`IFCSPACE('${guid()}',${ref(ownerHistory)},'${escapeStep(space.name)}',$,$,${ref(spacePlace)},$,.ELEMENT.,${space.areaM2})`)
      push(pset('SpaceProperties', { spaceId: space.id, programme: space.programme, areaM2: space.areaM2, wallFinish: space.finishSpec.wallFinish, floorFinish: space.finishSpec.floorFinish, ceilingFinish: space.finishSpec.ceilingFinish }))
      contained.push(e)
    }

    for (const column of graph.columns.filter((c) => c.levelId === level.id)) {
      const colPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${column.position.x},${level.elevation},${column.position.y})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
      const e = push(`IFCCOLUMN('${guid()}',${ref(ownerHistory)},'${escapeStep('Column ' + column.id)}',$,$,${ref(colPlace)},$,IFCPOSITIVELENGTHMEASURE(${column.height}),$)`)
      push(pset('ColumnProperties', { columnId: column.id, material: column.material, width: column.width, depth: column.depth }))
      contained.push(e)
    }

    for (const beam of graph.beams.filter((b) => b.levelId === level.id)) {
      const mx = (beam.start.x + beam.end.x) / 2
      const mz = (beam.start.z + beam.end.z) / 2
      const beamPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${mx},${level.elevation},${mz})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
      const e = push(`IFCBEAM('${guid()}',${ref(ownerHistory)},'${escapeStep('Beam ' + beam.id)}',$,$,${ref(beamPlace)},$,IFCPOSITIVELENGTHMEASURE(${beam.depth}),IFCPOSITIVELENGTHMEASURE(${beam.width}))`)
      push(pset('BeamProperties', { beamId: beam.id, material: beam.material, width: beam.width, depth: beam.depth }))
      contained.push(e)
    }

    if (contained.length > 0) {
      push(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',${ref(ownerHistory)},$,$,(${contained.join(',')}),${ref(storeyRef)})`)
    }
  }

  push(`IFCRELAGGREGATES('${guid()}',${ref(ownerHistory)},$,$,${ref(buildingRef)},(${storeyRefs.join(',')}))`)

  for (const stair of graph.stairs) {
    const level = sortedLevels.find((l) => l.id === stair.levelId)
    if (!level) continue
    const stairPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((0,${level.elevation},0)),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
    const e = push(`IFCSTAIR('${guid()}',${ref(ownerHistory)},'${escapeStep('Stair ' + stair.id)}',$,$,${ref(stairPlace)},$,'${stair.stairType}')`)
    push(pset('StairProperties', { stairId: stair.id, stairType: stair.stairType, width: stair.width, treadCount: stair.treadCount, rise: stair.rise, going: stair.going }))
    push(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',${ref(ownerHistory)},$,$,(${e}),${ref('storey-' + stair.levelId)})`)
  }

  if (graph.roof) {
    const topLevel = sortedLevels[sortedLevels.length - 1]
    const roofPlace = push(`IFCLOCALPLACEMENT(${ref(projPlacement)},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((0,${topLevel.elevation + (topLevel.floorHeight || 3)},0)),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`)
    push(`IFCROOF('${guid()}',${ref(ownerHistory)},'Roof',$,$,${ref(roofPlace)},$,.FLAT_ROOF.)`)
    push(pset('RoofProperties', { roofId: graph.roof.id, roofType: graph.roof.roofType, pitch: graph.roof.pitch, material: graph.roof.material, thickness: graph.roof.thickness }))
  }

  lines.push('ENDSEC;', 'END-ISO-10303-21;')
  return [...header, ...lines].join('\n')

  function ref(s: string): string {
    return `#${s}`
  }

  function pset(name: string, props: Record<string, string | number | boolean>): string {
    const propRefs = Object.entries(props).map(([k, v]) => {
      const val = typeof v === 'number' ? `IFCREAL(${Number(v)})` : `IFCTEXT('${escapeStep(String(v))}')`
      return ref(push(`IFCPROPERTYSINGLEVALUE('${k}',$,${val},$)`))
    })
    return push(`IFCPROPERTYSET('${guid()}',${ref(ownerHistory)},'${escapeStep(name)}',$,(${propRefs.join(',')}))`)
  }
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.round(Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2) * 100) / 100
}
