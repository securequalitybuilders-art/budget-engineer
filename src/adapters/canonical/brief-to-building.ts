import type { BuildingGraph, BuildingMeta, Level, Space, Wall, Opening } from '../../domain/building'
import type { DerivationResult, DerivationMeta } from '../../domain/building'

interface ParsedBriefLike {
  buildingType: string
  floors: number
  bedrooms?: number
  bathrooms?: number
  areaM2?: number
  location?: string
  features?: string[]
  summary?: string
  raw?: string
}

const PROGRAMME_MAP: Record<string, import('../../domain/building').RoomProgramme> = {
  bedroom: 'bedroom', bathroom: 'bathroom', kitchen: 'kitchen',
  living: 'living', lounge: 'living', dining: 'dining',
  study: 'study', office: 'office', laundry: 'laundry',
  garage: 'storage', store: 'storage', pantry: 'pantry',
  hallway: 'hallway', entry: 'entry', balcony: 'balcony',
}

function programmeForName(name: string): import('../../domain/building').RoomProgramme {
  const lower = name.toLowerCase()
  for (const [kw, prog] of Object.entries(PROGRAMME_MAP)) {
    if (lower.includes(kw)) return prog
  }
  return 'other'
}

function estimateRoomArea(programme: string, totalArea: number, roomCount: number): number {
  const wetRatio = ['bathroom', 'ensuite', 'kitchen', 'laundry'].includes(programme) ? 0.12 : 0.88
  const bonus = programme === 'living' || programme === 'dining' ? 1.5 : 1
  return (totalArea / Math.max(roomCount, 1)) * wetRatio * bonus
}

const FEATURE_TO_SPACE: Record<string, string> = {
  garage: 'Garage', veranda: 'Veranda', balcony: 'Balcony',
  porch: 'Porch', carport: 'Carport', store: 'Store Room',
  pantry: 'Pantry', study: 'Study', lounge: 'Lounge',
}

export function briefToBuildingGraph(
  brief: ParsedBriefLike,
  meta?: Partial<BuildingMeta>,
): DerivationResult<BuildingGraph> {
  const floorCount = Math.max(1, brief.floors || 1)
  const bedrooms = brief.bedrooms ?? 2
  const bathrooms = brief.bathrooms ?? 1
  const totalArea = brief.areaM2 ?? (bedrooms * 35 + 60)
  const areaPerFloor = totalArea / floorCount
  const footprintWidth = Math.sqrt(areaPerFloor * 1.3)
  const footprintDepth = areaPerFloor / footprintWidth

  const levelId = 'level-1'

  const levels: Level[] = [
    {
      id: levelId,
      name: 'Ground Floor',
      number: 0,
      elevation: 0,
      floorHeight: 3.0,
    },
  ]

  for (let i = 1; i < floorCount; i++) {
    levels.push({
      id: `level-${i + 1}`,
      name: `Floor ${i + 1}`,
      number: i,
      elevation: i * 3.0,
      floorHeight: 3.0,
    })
  }

  const roomDefinitions: Array<{ name: string; programme: import('../../domain/building').RoomProgramme; areaM2: number }> = []

  for (let i = 0; i < bedrooms; i++) {
    roomDefinitions.push({
      name: i === 0 ? 'Master Bedroom' : `Bedroom ${i + 1}`,
      programme: 'bedroom',
      areaM2: estimateRoomArea('bedroom', areaPerFloor, bedrooms + bathrooms + 3),
    })
  }

  for (let i = 0; i < bathrooms; i++) {
    roomDefinitions.push({
      name: i === 0 ? 'Bathroom' : `Bathroom ${i + 1}`,
      programme: 'bathroom',
      areaM2: estimateRoomArea('bathroom', areaPerFloor, bedrooms + bathrooms + 3),
    })
  }

  roomDefinitions.push(
    { name: 'Living Room', programme: 'living', areaM2: estimateRoomArea('living', areaPerFloor, bedrooms + bathrooms + 3) },
    { name: 'Kitchen', programme: 'kitchen', areaM2: estimateRoomArea('kitchen', areaPerFloor, bedrooms + bathrooms + 3) },
    { name: 'Dining', programme: 'dining', areaM2: estimateRoomArea('dining', areaPerFloor, bedrooms + bathrooms + 3) },
  )

  const features = brief.features ?? []
  for (const f of features) {
    const spaceName = FEATURE_TO_SPACE[f.toLowerCase()]
    if (spaceName && !roomDefinitions.some((r) => r.name.toLowerCase() === spaceName.toLowerCase())) {
      roomDefinitions.push({
        name: spaceName,
        programme: programmeForName(spaceName),
        areaM2: 12,
      })
    }
  }

  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0

  const spaces: Space[] = roomDefinitions.map((rd, i) => {
    const w = Math.sqrt(rd.areaM2 * (rd.programme === 'living' || rd.programme === 'dining' ? 1.6 : 1))
    const h = rd.areaM2 / w

    if (cursorX + w > footprintWidth * 0.9) {
      cursorX = 0
      cursorY += rowHeight + 0.3
      rowHeight = 0
    }

    const space: Space = {
      id: `space-brief-${i + 1}`,
      levelId,
      name: rd.name,
      programme: rd.programme,
      boundary: {
        vertices: [
          { x: cursorX, y: cursorY },
          { x: cursorX + w, y: cursorY },
          { x: cursorX + w, y: cursorY + h },
          { x: cursorX, y: cursorY + h },
        ],
      },
      bbox: { minX: cursorX, minY: cursorY, maxX: cursorX + w, maxY: cursorY + h },
      areaM2: rd.areaM2,
      finishSpec: {
        wallMaterialId: null,
        floorMaterialId: null,
        ceilingMaterialId: null,
        wallFinish: rd.programme === 'bathroom' || rd.programme === 'kitchen' ? 'tiled' : 'painted plaster',
        floorFinish: rd.programme === 'bathroom' || rd.programme === 'kitchen' ? 'ceramic tiles' : 'vinyl/tiles',
        ceilingFinish: 'painted plaster',
      },
      fixtures: [],
      notes: '',
    }

    if (h > rowHeight) rowHeight = h
    cursorX += w + 0.3

    return space
  })

  const walls: Wall[] = []
  const openings: Opening[] = []

  for (const space of spaces) {
    const b = space.bbox

    const segs: Array<{ start: { x: number; y: number }; end: { x: number; y: number }; role: 'external' | 'internal' }> = [
      { start: { x: b.minX, y: b.minY }, end: { x: b.maxX, y: b.minY }, role: 'internal' },
      { start: { x: b.maxX, y: b.minY }, end: { x: b.maxX, y: b.maxY }, role: 'internal' },
      { start: { x: b.maxX, y: b.maxY }, end: { x: b.minX, y: b.maxY }, role: 'internal' },
      { start: { x: b.minX, y: b.maxY }, end: { x: b.minX, y: b.minY }, role: 'internal' },
    ]

    const isPerimeter = (x: number, y: number) =>
      Math.abs(x) < 0.01 || Math.abs(y) < 0.01 ||
      Math.abs(x - footprintWidth) < 0.01 || Math.abs(y - footprintDepth) < 0.01

    for (const seg of segs) {
      if (isPerimeter(seg.start.x, seg.start.y) || isPerimeter(seg.end.x, seg.end.y)) {
        seg.role = 'external'
      }
      const wallId = `wall-brief-${space.id}-${walls.length}`
      walls.push({
        id: wallId,
        levelId,
        role: seg.role,
        start: { x: seg.start.x, y: seg.start.y, z: 0 },
        end: { x: seg.end.x, y: seg.end.y, z: 0 },
        thickness: seg.role === 'external' ? 0.23 : 0.115,
        height: 3.0,
        material: seg.role === 'external' ? 'concrete-block' : 'plasterboard',
        ifcClass: seg.role === 'external' ? 'IfcCurtainWall' : 'IfcWall',
        properties: {},
      })

      if (seg.role === 'external' && Math.random() < 0.4) {
        openings.push({
          id: `opening-brief-${space.id}-${openings.length}`,
          levelId,
          wallId,
          kind: Math.random() < 0.5 ? 'door' : 'window',
          offsetRatio: 0.5,
          width: 0.9,
          height: 2.1,
          sillHeight: 0,
          material: 'timber',
          ifcClass: 'IfcDoor',
          properties: {},
        })
      }
    }
  }

  const graph: BuildingGraph = {
    meta: {
      id: `canonical-brief-${Date.now()}`,
      projectId: `brief-${brief.summary?.slice(0, 20) ?? 'project'}`,
      name: meta?.name ?? brief.summary ?? 'Brief-derived Design',
      category: meta?.category ?? (brief.buildingType as import('@/domain/building').BuildingCategory) ?? 'residential',
      description: brief.summary ?? '',
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    },
    site: null,
    levels,
    spaces,
    walls,
    slabs: [],
    openings,
    columns: [],
    beams: [],
    stairs: [],
    roof: null,
    structural: null,
    serviceZones: [],
  }

  const derivation: DerivationMeta = {
    source: 'prompt',
    confidence: 0.55,
    warnings: [
      'Brief-derived graph uses estimated geometry — no slab/roof/structural data',
      'Opening placement is randomized for visualization',
    ],
    derivedAt: new Date().toISOString(),
  }

  return { graph, derivation }
}
