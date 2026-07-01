import type { DesignOption } from '@/domain/boq'
import type { BimModel, BimRoomZone } from '@/domain/bim'
import type { CadDocument, CadFloor, CadWall, CadOpening, CadBlockInstance, CadLayer } from '@/domain/cad'
import { designOptionToBimModel } from './designToBim'
import { detectBimClashes } from '@/lib/analysis/clash-checker'
import { computeSolarAnalysis } from '@/lib/analysis/solar-analyzer'
import { computeMepTakeoff } from '@/lib/quantities/mep-takeoff'
import type { ClashReportSummary } from '@/lib/analysis/clash-checker'
import type { SolarAnalysisSummary } from '@/lib/analysis/solar-analyzer'
import type { MepTakeoffSummary } from '@/lib/quantities/mep-takeoff'


function safeSqrt(n: number): number {
  return n > 0 ? Math.sqrt(n) : 0
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

function buildCadFromDesignOption(design: DesignOption): CadDocument | null {
  if (!design || design.grossFloorArea <= 0) return null

  const dim = safeSqrt(design.grossFloorArea)
  const floorHeight = 3

  const floors: CadFloor[] = []
  const walls: CadWall[] = []
  const openings: CadOpening[] = []
  const blocks: CadBlockInstance[] = []

  for (let i = 0; i < design.floors; i++) {
    const floorId = `f${i + 1}`
    const floorName = i === 0 ? 'Ground Floor' : `Floor ${i + 1}`
    floors.push({
      id: floorId,
      name: floorName,
      elevation: i * floorHeight,
      bim: { classification: floorName },
    })

    // 4 perimeter walls (same geometry as designToBim but in 2D)
    const wallDefs: { x1: number; y1: number; x2: number; y2: number }[] = [
      { x1: 0, y1: 0, x2: dim * 2, y2: 0 },
      { x1: dim * 2, y1: 0, x2: dim * 2, y2: dim },
      { x1: dim * 2, y1: dim, x2: 0, y2: dim },
      { x1: 0, y1: dim, x2: 0, y2: 0 },
    ]

    for (let wi = 0; wi < wallDefs.length; wi++) {
      const { x1, y1, x2, y2 } = wallDefs[wi]
      const id = `wall-${floorId}-${wi + 1}`
      walls.push({
        id,
        floorId,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.23,
        structuralRole: wi === 0 ? 'external' : wi === 2 ? 'external' : 'internal',
        layerId: 'walls',
        bim: { classification: 'wall' },
      })
    }
  }

  const layer: CadLayer = {
    id: 'walls',
    name: 'Walls',
    visible: true,
    color: '#1a365d',
  }

  return {
    id: `cad-${design.id}`,
    projectId: '',
    designId: design.id,
    activeFloorId: floors[0]?.id ?? 'f1',
    activeTool: 'select',
    floors,
    layers: [layer],
    walls,
    openings,
    annotations: [],
    blocks,
  }
}

function enrichBimWithRoomZones(bim: BimModel, design: DesignOption): BimModel {
  const dim = safeSqrt(design.grossFloorArea)
  const floorHeight = 3

  const roomZones: BimRoomZone[] = []

  for (let i = 0; i < design.floors; i++) {
    const floorId = `f${i + 1}`
    const zOffset = i * floorHeight

    roomZones.push({
      id: `zone-${floorId}`,
      projectId: bim.projectId,
      floorId,
      name: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
      ifcClass: 'IfcSpace',
      material: 'generic',
      properties: { program: 'Open Plan Studio Space' },
      type: 'roomZone',
      origin: { x: 0, y: zOffset, z: 0 },
      width: dim * 2,
      depth: dim,
      height: floorHeight,
    })
  }

  return {
    ...bim,
    elements: [...bim.elements, ...roomZones],
  }
}

export interface AnalysisResult {
  bim: BimModel | null
  cad: CadDocument | null
  clashes: ClashReportSummary | null
  solar: SolarAnalysisSummary | null
  mep: MepTakeoffSummary | null
  warnings: string[]
}

export function buildAnalysisFromDesignOption(design: DesignOption | null): AnalysisResult {
  if (!design || design.grossFloorArea <= 0) {
    return { bim: null, cad: null, clashes: null, solar: null, mep: null, warnings: [] }
  }

  const bim = designOptionToBimModel(design)
  let cad: CadDocument | null = null
  const warnings: string[] = []

  cad = safe(() => buildCadFromDesignOption(design), null)
  if (!cad) warnings.push('Could not build CAD model for clash/solar analysis')

  const enrichedBim = bim ? enrichBimWithRoomZones(bim, design) : null

  const clashes = bim && cad
    ? safe(() => detectBimClashes(cad), null)
    : null

  const solar = cad
    ? safe(() => computeSolarAnalysis(cad), null)
    : null

  const mep = enrichedBim
    ? safe(() => computeMepTakeoff(enrichedBim), null)
    : null

  if (!bim) warnings.push('Could not build BIM model for analysis')
  if (clashes === undefined || clashes === null) warnings.push('Clash detection encountered an error')
  if (solar === undefined || solar === null) warnings.push('Solar analysis encountered an error')
  if (mep === undefined || mep === null) warnings.push('MEP takeoff encountered an error')

  return {
    bim,
    cad,
    clashes,
    solar,
    mep,
    warnings,
  }
}
