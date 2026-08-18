/**
 * IFC4 STEP export — deterministic, dependency-free emitter.
 *
 * Driven by `PlanModel` topological/spatial data (rooms, walls, openings,
 * structural grid, core layout, adjacency graph, bubble diagram).  The
 * emitter follows the exact boilerplate pattern from
 * `src/adapters/canonical/building-to-ifc.ts` and does NOT modify that file.
 *
 * Emits:
 * - `IfcSpace` per room (occupancy class, design population, area, daylight
 *   factor, fire compartment)
 * - `IfcRelSpaceBoundary` per adjacency edge (room-to-room, lenient typing)
 * - `IfcWallStandardCase` per wall segment (thickness, material name, fire
 *   rating)
 * - `IfcDoor` / `IfcWindow` per opening (overall dimensions, fire rating)
 * - `IfcOpeningElement` + `IfcRelVoidsElement` per wall penetration
 *
 * Additional exports: `resolveUseTypeForBuilding`, `designPopulationForPlan`,
 * `ifcSpaceLongName`, `formatFireRating`.
 */

import type { PlanModel } from '@/domain/plan'
import { classifyOccupancy, fireRatingMinForClass } from '../compliance/occupancyMatrix'
import { computeOccupancyAndEgress, type UseType } from '../calculators/egress'
import { getRoomStandard } from '../standards/roomStandards'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface IfcDesignContext {
  buildingType?: string
  storeys?: number
  projectName?: string
  projectNumber?: string
  siteName?: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_STOREY_HEIGHT = 3
const DEFAULT_WALL_THICKNESS_EXT = 0.23
const DEFAULT_WALL_THICKNESS_INT = 0.115
const MATERIAL_NAME = 'Common Brick 7 MPa SAZ 70'

const GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'

const USE_TYPE_MAP: [string[], UseType][] = [
  [['warehouse', 'storage'], 'storage'],
  [['office', 'commercial'], 'business'],
  [['school', 'college', 'university', 'classroom'], 'educational'],
  [['church', 'chapel', 'mosque', 'assembly', 'hall', 'community'], 'assembly-less-concentrated'],
  [['shop', 'retail', 'market', 'store'], 'mercantile'],
  [['hotel', 'lodge', 'guest'], 'residential'],
  [['factory', 'industrial', 'manufacturing'], 'industrial'],
  [['clinic', 'hospital', 'health', 'medical', 'care'], 'institutional'],
  [['restaurant', 'cafe', 'bar', 'dining'], 'mercantile'],
  [['house', 'residential', 'duplex', 'townhouse'], 'residential'],
]

/* ------------------------------------------------------------------ */
/*  GUID + escaping (identical to building-to-ifc.ts)                   */
/* ------------------------------------------------------------------ */

function guid(): string {
  let s = ''
  for (let i = 0; i < 22; i++) s += GUID_CHARS[Math.floor(Math.random() * 64)]
  return s
}

function escapeStep(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function nowStamp(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, '')
}

/* ------------------------------------------------------------------ */
/*  Public helpers                                                      */
/* ------------------------------------------------------------------ */

/** Map a free-text `buildingType` to the IFC4 `IfcOccupantTypeEnum` use-type. */
export function resolveUseTypeForBuilding(buildingType?: string): UseType {
  if (!buildingType) return 'residential'
  const bt = buildingType.toLowerCase()
  for (const [keywords, useType] of USE_TYPE_MAP) {
    if (keywords.some((k) => bt.includes(k))) return useType
  }
  return 'residential'
}

/** Compute design population for the whole plan (sum of room areas / load factor). */
export function designPopulationForPlan(plan: PlanModel, useType?: UseType): number {
  const ut = useType ?? resolveUseTypeForBuilding()
  const totalArea = plan.rooms.reduce((s, r) => s + r.width * r.height, 0)
  return computeOccupancyAndEgress({ area: totalArea, useType: ut }).occupantLoad
}

/** IFC long name for a space: "Living Room 12.0m²" */
export function ifcSpaceLongName(room: { name: string; width: number; height: number }): string {
  return `${room.name} ${(room.width * room.height).toFixed(1)}m²`
}

/** Format fire-rating minutes to code-style string (240→"4HR", 120→"2HR", etc). */
export function formatFireRating(minutes: number): string {
  if (minutes >= 240) return '4HR'
  if (minutes >= 120) return '2HR'
  if (minutes >= 60) return '1HR'
  if (minutes >= 30) return '0.5HR'
  return 'NONE'
}

/** Map a room zone to a daylight-factor proxy (%). */
function daylightFactorForZone(room: { name: string }): number {
  const std = getRoomStandard(room.name)
  if (std.naturalLightM2) return 2.0
  switch (std.zone) {
    case 'public': return 2.0
    case 'private': return 1.5
    case 'service': return 1.0
    case 'circulation': return 0.5
    default: return 1.5
  }
}

/* ------------------------------------------------------------------ */
/*  Main emitter                                                       */
/* ------------------------------------------------------------------ */

/**
 * Export a `PlanModel` to IFC4 STEP format.
 *
 * Returns `null` when the plan has no rooms (nothing to export).
 */
export function planModelToIfcStep(plan: PlanModel, ctx?: IfcDesignContext): string | null {
  if (plan.rooms.length === 0) return null

  const useType = resolveUseTypeForBuilding(ctx?.buildingType)
  const buildingType = ctx?.buildingType ?? 'residential'
  const projectName = ctx?.projectName ?? 'Budget Engineer Project'
  const siteName = ctx?.siteName ?? 'Site'

  const occClass = classifyOccupancy(buildingType)
  const fireRating = fireRatingMinForClass(occClass)
  const fireRatingStr = formatFireRating(fireRating)

  let id = 0
  const lines: string[] = []
  const push = (body: string): string => {
    id += 1
    lines.push(`#${id}= ${body};`)
    return String(id)
  }

  // ── Header ──
  const header = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('Budget Engineer OS IFC4 export'),'2;1');",
    `FILE_NAME('${escapeStep(projectName)}.ifc','${nowStamp()}',(''),(''),'Budget Engineer OS','Budget Engineer OS','');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
  ]

  // ── Owner history chain (identical to building-to-ifc.ts) ──
  const person = push("IFCPERSON($,$,'Budget Engineer',$,$,$,$,$)")
  const org = push("IFCORGANIZATION($,'Budget Engineer OS',$,$,$)")
  const personOrg = push(`IFCPERSONANDORGANIZATION(#${person},#${org},$)`)
  const app = push(`IFCAPPLICATION(#${org},'1.0','Budget Engineer OS','BEOS')`)
  const ownerHistory = push(`IFCOWNERHISTORY(#${personOrg},#${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`)

  // ── Geometry context + units ──
  const axis = push('IFCDIRECTION((0.,0.,1.))')
  const refDir = push('IFCDIRECTION((1.,0.,0.))')
  const origin = push('IFCCARTESIANPOINT((0.,0.,0.))')
  const placement = push(`IFCAXIS2PLACEMENT3D(#${axis},#${origin},#${refDir})`)
  const worldCtx = push(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#${placement},$)`)
  const lenUnit = push('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)')
  const areaUnit = push('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)')
  const volUnit = push('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)')
  const unitAssign = push(`IFCUNITASSIGNMENT((#${lenUnit},#${areaUnit},#${volUnit}))`)
  const projPlacement = push(`IFCLOCALPLACEMENT($,#${placement})`)

  // ── Spatial hierarchy ──
  const projectRef = push(`IFCPROJECT('${guid()}',#${ownerHistory},'${escapeStep(projectName)}',$,$,$,$,(#${worldCtx}),#${unitAssign})`)
  const siteRef = push(`IFCSITE('${guid()}',#${ownerHistory},'${escapeStep(siteName)}',$,$,#${projPlacement},$,$,.ELEMENT.,$,$,$,$,$)`)
  const buildingRef = push(`IFCBUILDING('${guid()}',#${ownerHistory},'${escapeStep(projectName)}',$,$,#${projPlacement},$,$,.ELEMENT.,$,$,$)`)
  push(`IFCRELAGGREGATES('${guid()}',#${ownerHistory},$,$,#${projectRef},(#${siteRef}))`)
  push(`IFCRELAGGREGATES('${guid()}',#${ownerHistory},$,$,#${siteRef},(#${buildingRef}))`)

  // ── Building storey ──
  const storeyRef = push(`IFCBUILDINGSTOREY('${guid()}',#${ownerHistory},'Ground Floor',$,$,#${projPlacement},$,$,.ELEMENT.,0)`)

  // ── IFCSPACE per room ──
  const spaceRefs: string[] = []
  const wallRefs: string[] = []
  const openingElementRefs: string[] = []

  for (const room of plan.rooms) {
    const areaM2 = Math.round(room.width * room.height * 100) / 100
    const elevation = 0
    const height = DEFAULT_STOREY_HEIGHT
    const roomPlacement = push(
      `IFCLOCALPLACEMENT(#${projPlacement},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${room.x},${elevation},${room.y})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`,
    )
    const spaceRef = push(
      `IFCSPACE('${guid()}',#${ownerHistory},'${escapeStep(room.name)}',$,$,#${roomPlacement},$,.ELEMENT.,${areaM2})`,
    )
    spaceRefs.push(spaceRef)

    // Pset_SpaceCommon
    const designPop = computeOccupancyAndEgress({
      area: areaM2,
      useType,
    }).occupantLoad
    const df = daylightFactorForZone(room)

    const psetRef = buildPset('SpaceCommon', {
      OccupancyClass: occClass,
      DesignPopulation: designPop,
      DaylightFactor: df,
      FireCompartment: fireRatingStr,
    })
    push(`IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistory},$,$,(#${spaceRef}),#${psetRef})`)

    // Qto_SpaceBaseQuantities
    const qtoRef = push(
      `IFCELEMENTQUANTITY('${guid()}',#${ownerHistory},'SpaceBaseQuantities',$,$,(#${push(`IFCQUANTITYLENGTH('NetFloorArea',$,$,${areaM2},$,$)`)},#${push(`IFCQUANTITYLENGTH('Height',$,$,${height},$,$)`)}))`,
    )
    push(`IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistory},$,$,(#${spaceRef}),#${qtoRef})`)
  }

  // ── IFCWALLSTANDARDCASE per wall segment ──
  for (const wall of plan.walls) {
    const isExternal = wall.type === 'external'
    const thickness = wall.thickness || (isExternal ? DEFAULT_WALL_THICKNESS_EXT : DEFAULT_WALL_THICKNESS_INT)
    const midX = (wall.start.x + wall.end.x) / 2
    const midY = (wall.start.y + wall.end.y) / 2
    const wallPlace = push(
      `IFCLOCALPLACEMENT(#${projPlacement},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${midX},0,${midY})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`,
    )
    const wallRef = push(
      `IFCWALLSTANDARDCASE('${guid()}',#${ownerHistory},'${escapeStep(wall.id)}',$,$,#${wallPlace},$,IFCPOSITIVELENGTHMEASURE(${thickness}),${isExternal ? '.EXTERNAL.' : '.INTERNAL.'})`,
    )
    wallRefs.push(wallRef)

    // Pset_WallCommon
    const psetRef = buildPset('WallCommon', {
      FireRating: fireRatingStr,
      IsExternal: isExternal,
      Reference: MATERIAL_NAME,
    })
    push(`IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistory},$,$,(#${wallRef}),#${psetRef})`)

    // Qto_WallBaseQuantities
    const qtoRef = push(
      `IFCELEMENTQUANTITY('${guid()}',#${ownerHistory},'WallBaseQuantities',$,$,(#${push(`IFCQUANTITYLENGTH('Length',$,$,${Math.round(Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2) * 100) / 100},$,$)`)}),#${push(`IFCQUANTITYLENGTH('Width',$,$,${thickness},$,$)`)},#${push(`IFCQUANTITYLENGTH('Height',$,$,${DEFAULT_STOREY_HEIGHT},$,$)`)}))`,
    )
    push(`IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistory},$,$,(#${wallRef}),#${qtoRef})`)
  }

  // ── IFCOPENINGELEMENT + IFCDOOR / IFCWINDOW per opening ──
  for (const opening of plan.openings) {
    const wall = plan.walls.find((w) => w.id === opening.wallId)
    const wallRef = wall ? wallRefs[plan.walls.indexOf(wall)] : wallRefs[0]
    if (!wallRef) continue

    // Compute opening centre from wall offset ratio
    const wallStart = wall?.start ?? plan.walls[0].start
    const wallEnd = wall?.end ?? plan.walls[0].end
    const cx = wallStart.x + (wallEnd.x - wallStart.x) * opening.offset
    const cz = wallStart.y + (wallEnd.y - wallStart.y) * opening.offset
    const openingWidth = opening.width
    const openingHeight = opening.height ?? (opening.kind === 'door' ? 2.1 : 1.2)
    const sillHeight = opening.sillHeight ?? (opening.kind === 'door' ? 0 : 0.9)

    // IfcOpeningElement — the void carved into the wall
    const openingPlace = push(
      `IFCLOCALPLACEMENT(#${projPlacement},IFCAXIS2PLACEMENT3D(IFCCARTESIANPOINT((${cx},0,${cz})),IFCDIRECTION((0,0,1)),IFCDIRECTION((1,0,0))))`,
    )
    const openingRef = push(
      `IFCOPENINGELEMENT('${guid()}',#${ownerHistory},'${escapeStep(opening.id)}',$,$,#${openingPlace},$)`,
    )
    // IfcRelVoidsElement — connects opening to its parent wall
    push(`IFCRELVOIDSELEMENT('${guid()}',#${ownerHistory},$,$,#${wallRef},#${openingRef})`)

    // IfcDoor or IfcWindow
    const elementPlace = openingPlace
    let doorWindowRef: string
    if (opening.kind === 'door') {
      doorWindowRef = push(
        `IFCDOOR('${guid()}',#${ownerHistory},'${escapeStep(opening.id)}',$,$,#${elementPlace},$,IFCDOORTYPEENUM(.DOOR.),IFCPOSITIVELENGTHMEASURE(${openingWidth}),IFCPOSITIVELENGTHMEASURE(${openingHeight}))`,
      )
      // Pset_DoorCommon
      const psetRef = buildPset('DoorCommon', {
        FireRating: fireRatingStr,
        IsExternal: wall?.type === 'external',
        Reference: MATERIAL_NAME,
      })
      push(`IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistory},$,$,(#${doorWindowRef}),#${psetRef})`)
    } else {
      doorWindowRef = push(
        `IFCWINDOW('${guid()}',#${ownerHistory},'${escapeStep(opening.id)}',$,$,#${elementPlace},$,IFCWINDOWTYPEENUM(.WINDOW.),IFCPOSITIVELENGTHMEASURE(${openingWidth}),IFCPOSITIVELENGTHMEASURE(${openingHeight}))`,
      )
      // Pset_WindowCommon
      const psetRef = buildPset('WindowCommon', {
        FireRating: fireRatingStr,
        IsExternal: wall?.type === 'external',
        Reference: 'Glazing',
        SillHeight: sillHeight,
      })
      push(`IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistory},$,$,(#${doorWindowRef}),#${psetRef})`)
    }

    // IfcRelContainedInSpatialStructure — opening + door/window in the storey
    push(
      `IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',#${ownerHistory},$,$,(#${openingRef},#${doorWindowRef}),#${storeyRef})`,
    )
    openingElementRefs.push(openingRef, doorWindowRef)
  }

  // ── IFCRELCONTAINEDINSPATIALSTRUCTURE (rooms in storey) ──
  if (spaceRefs.length > 0) {
    push(
      `IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',#${ownerHistory},$,$,(#${spaceRefs.join(',#')}),#${storeyRef})`,
    )
  }

  // ── IFCRELSPACEBOUNDARY per adjacency edge ──
  const edges = plan.bubbleDiagram?.edges ?? plan.adjacencyGraph?.rules?.map((r) => ({ from: r.from, to: r.to, weight: r.weight })) ?? []
  for (const edge of edges) {
    const roomA = plan.rooms.find((r) => r.name === edge.from || r.id === edge.from)
    const roomB = plan.rooms.find((r) => r.name === edge.to || r.id === edge.to)
    if (!roomA || !roomB) continue
    const spaceA = spaceRefs[plan.rooms.indexOf(roomA)]
    const spaceB = spaceRefs[plan.rooms.indexOf(roomB)]
    if (!spaceA || !spaceB) continue

    // Lenient typing: RelatedBuildingElement = IFCSPACE of room B
    push(
      `IFCRELSPACEBOUNDARY('${guid()}',#${ownerHistory},$,$,#${spaceA},#${spaceB},${('weight' in edge && (edge as { weight: number }).weight >= 2) ? '.PHYSICAL.' : '.INTERNAL.'})`,
    )
  }

  // ── Footer ──
  lines.push('ENDSEC;', 'END-ISO-10303-21;')

  return [...header, ...lines].join('\n')

  /* --------------------------------------------------------------- */
  /*  Inner helpers                                                   */
  /* --------------------------------------------------------------- */

  function buildPset(name: string, props: Record<string, string | number | boolean>): string {
    const propRefs: string[] = []
    for (const [k, v] of Object.entries(props)) {
      const val = typeof v === 'number'
        ? `IFCREAL(${v})`
        : typeof v === 'boolean'
          ? `IFCBOOLEAN(${v ? '.T.' : '.F.'})`
          : `IFCTEXT('${escapeStep(String(v))}')`
      propRefs.push(`#${push(`IFCPROPERTYSINGLEVALUE('${k}',$,${val},$)`)}`)
    }
    return push(`IFCPROPERTYSET('${guid()}',#${ownerHistory},'${escapeStep(name)}',$,(${propRefs.join(',')}))`)
  }
}
