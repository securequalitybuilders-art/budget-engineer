import type { BuildingGraph } from '../../domain/building'

export interface CardinalSolarMetrics {
  orientation: 'North' | 'East' | 'South' | 'West'
  wallArea: number
  windowArea: number
  wwrPct: number
  peakIrradianceWm2: number
  peakCoolingLoadKw: number
}

export interface SolarAnalysisSummary {
  cardinalMetrics: CardinalSolarMetrics[]
  totalWallArea: number
  totalWindowArea: number
  overallWwrPct: number
  totalPeakCoolingLoadKw: number
  efficiencyRating: 'Optimized' | 'Standard' | 'High Exposure Warning'
  recommendations: string[]
}

const PEAK_IRRADIANCE: Record<string, number> = {
  North: 280,
  East: 380,
  South: 120,
  West: 450,
}

function wallOrientation(
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number }
): 'North' | 'East' | 'South' | 'West' {
  const dx = end.x - start.x
  const dy = end.z - start.z
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return 'North'
  const angleRad = Math.atan2(-dx, dy)
  let deg = (angleRad * 180) / Math.PI
  if (deg < 0) deg += 360

  if (deg >= 45 && deg < 135) return 'East'
  if (deg >= 135 && deg < 225) return 'South'
  if (deg >= 225 && deg < 315) return 'West'
  return 'North'
}

export function buildingGraphToSolarAnalysis(graph: BuildingGraph): SolarAnalysisSummary {
  const metrics: Record<'North' | 'East' | 'South' | 'West', { wallArea: number; windowArea: number }> = {
    North: { wallArea: 0, windowArea: 0 },
    East: { wallArea: 0, windowArea: 0 },
    South: { wallArea: 0, windowArea: 0 },
    West: { wallArea: 0, windowArea: 0 },
  }

  for (const wall of graph.walls) {
    const dx = wall.end.x - wall.start.x
    const dz = wall.end.z - wall.start.z
    const len = Math.hypot(dx, dz)
    const area = len * wall.height
    const orient = wallOrientation(wall.start, wall.end)
    metrics[orient].wallArea += area

    const hostedWindows = graph.openings.filter(
      (o) => o.wallId === wall.id && o.kind === 'window'
    )
    for (const win of hostedWindows) {
      metrics[orient].windowArea += win.width * win.height
    }
  }

  const cardinalList: CardinalSolarMetrics[] = (['North', 'East', 'South', 'West'] as const).map((orient) => {
    const m = metrics[orient]
    const wwrPct = m.wallArea > 0 ? (m.windowArea / m.wallArea) * 100 : 0
    const peakKw = (m.windowArea * PEAK_IRRADIANCE[orient]) / 1000
    return {
      orientation: orient,
      wallArea: Math.round(m.wallArea * 100) / 100,
      windowArea: Math.round(m.windowArea * 100) / 100,
      wwrPct: Math.round(wwrPct * 100) / 100,
      peakIrradianceWm2: PEAK_IRRADIANCE[orient],
      peakCoolingLoadKw: Math.round(peakKw * 100) / 100,
    }
  })

  const totalWallArea = cardinalList.reduce((acc, c) => acc + c.wallArea, 0)
  const totalWindowArea = cardinalList.reduce((acc, c) => acc + c.windowArea, 0)
  const overallWwrPct = totalWallArea > 0 ? (totalWindowArea / totalWallArea) * 100 : 0
  const totalPeakCoolingLoadKw = cardinalList.reduce((acc, c) => acc + c.peakCoolingLoadKw, 0)

  const westWin = cardinalList.find((c) => c.orientation === 'West')?.windowArea || 0
  let rating: SolarAnalysisSummary['efficiencyRating'] = 'Optimized'
  const recs: string[] = []

  if (westWin > 3 || totalPeakCoolingLoadKw > 2.0) {
    rating = 'High Exposure Warning'
    recs.push('High West solar radiation detected. Apply Low-E tinted glazing or external louvers.')
  } else if (overallWwrPct > 35) {
    rating = 'Standard'
    recs.push('Envelope glazing exceeds 35%. Consider double glazing for thermal offset.')
  } else {
    recs.push('Solar envelope exposure is well optimized for tropical/subtropical climates.')
  }

  return {
    cardinalMetrics: cardinalList,
    totalWallArea: Math.round(totalWallArea * 100) / 100,
    totalWindowArea: Math.round(totalWindowArea * 100) / 100,
    overallWwrPct: Math.round(overallWwrPct * 100) / 100,
    totalPeakCoolingLoadKw: Math.round(totalPeakCoolingLoadKw * 100) / 100,
    efficiencyRating: rating,
    recommendations: recs,
  }
}
