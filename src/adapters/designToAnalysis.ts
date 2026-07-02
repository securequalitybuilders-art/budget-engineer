import type { DesignOption } from '@/domain/boq'
import type { CadDocument, CadFloor, CadWall, CadOpening, CadBlockInstance } from '@/domain/cad'
import { buildDesignGeometry } from './designGeometryAdapter'
import { designOptionToBimModel } from './designToBim'
import { detectBimClashes } from '@/lib/analysis/clash-checker'
import { computeSolarAnalysis } from '@/lib/analysis/solar-analyzer'
import { computeMepTakeoff } from '@/lib/quantities/mep-takeoff'
import type { ClashReportSummary } from '@/lib/analysis/clash-checker'
import type { SolarAnalysisSummary } from '@/lib/analysis/solar-analyzer'
import type { MepTakeoffSummary } from '@/lib/quantities/mep-takeoff'

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

export function buildCadFromDesignOption(design: DesignOption): CadDocument | null {
  if (!design || design.grossFloorArea <= 0) return null

  const geo = buildDesignGeometry(design)
  if (geo.walls.length === 0) return null

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

    for (const gw of geo.walls.filter((w) => w.floorIndex === i)) {
      walls.push({
        id: gw.id,
        floorId,
        start: { x: gw.start.x, y: gw.start.y },
        end: { x: gw.end.x, y: gw.end.y },
        thickness: gw.thickness,
        structuralRole: gw.kind,
        layerId: 'walls',
        bim: { classification: gw.kind === 'external' ? 'external wall' : 'internal partition' },
      })
    }

    for (const go of geo.openings.filter((o) => o.floorIndex === i)) {
      const wall = geo.walls.find((w) => w.id === go.wallId)
      if (!wall) continue
      const wlen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y) || 1
      const offsetRatio = wlen > 0 ? (go.offset + go.width / 2) / wlen : 0.5
      openings.push({
        id: go.id,
        floorId,
        wallId: go.wallId,
        kind: go.type,
        offsetRatio,
        width: go.width,
        sillHeight: go.sillHeight,
        headHeight: go.height,
        layerId: 'openings',
        bim: { classification: go.type },
      })
    }
  }

  return {
    id: `cad-${design.id}`,
    projectId: '',
    designId: design.id,
    activeFloorId: floors[0]?.id ?? 'f1',
    activeTool: 'select',
    floors,
    layers: [
      { id: 'walls', name: 'Walls', visible: true, color: '#1a365d' },
      { id: 'openings', name: 'Openings', visible: true, color: '#d4a574' },
    ],
    walls,
    openings,
    annotations: [],
    blocks,
  }
}

export interface AnalysisResult {
  cad: CadDocument | null
  bim: ReturnType<typeof designOptionToBimModel>
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

  const enrichedBim = bim
    ? { ...bim, elements: [...bim.elements] }
    : null

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
