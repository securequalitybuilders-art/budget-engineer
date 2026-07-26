import type { CadDocument } from '../../domain/cad';

const DEFAULT_WALL_HEIGHT = 3;

export interface CardinalSolarMetrics {
  orientation: 'North' | 'East' | 'South' | 'West';
  wallArea: number;
  windowArea: number;
  wwrPct: number;
  peakIrradianceWm2: number;
  peakCoolingLoadKw: number;
}

export interface SolarAnalysisSummary {
  cardinalMetrics: CardinalSolarMetrics[];
  totalWallArea: number;
  totalWindowArea: number;
  overallWwrPct: number;
  totalPeakCoolingLoadKw: number;
  efficiencyRating: 'Optimized' | 'Standard' | 'High Exposure Warning';
  recommendations: string[];
}

export function computeSolarAnalysis(cad: CadDocument): SolarAnalysisSummary {
  const metrics: Record<'North' | 'East' | 'South' | 'West', { wallArea: number; windowArea: number; peakWm2: number }> = {
    North: { wallArea: 0, windowArea: 0, peakWm2: 280 },
    East: { wallArea: 0, windowArea: 0, peakWm2: 380 },
    South: { wallArea: 0, windowArea: 0, peakWm2: 120 },
    West: { wallArea: 0, windowArea: 0, peakWm2: 450 }
  };

  for (const w of cad.walls) {
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy);
    const area = len * DEFAULT_WALL_HEIGHT;

    const angleRad = Math.atan2(-dx, dy);
    let deg = (angleRad * 180) / Math.PI;
    if (deg < 0) deg += 360;

    let orient: 'North' | 'East' | 'South' | 'West' = 'North';
    if (deg >= 45 && deg < 135) orient = 'East';
    else if (deg >= 135 && deg < 225) orient = 'South';
    else if (deg >= 225 && deg < 315) orient = 'West';

    metrics[orient].wallArea += area;

    const hostedWindows = cad.openings.filter(o => o.wallId === w.id && o.kind === 'window');
    for (const win of hostedWindows) {
      const winArea = win.width * (win.headHeight || 2.1);
      metrics[orient].windowArea += winArea;
    }
  }

  const cardinalList: CardinalSolarMetrics[] = (['North', 'East', 'South', 'West'] as const).map(orient => {
    const m = metrics[orient];
    const wwrPct = m.wallArea > 0 ? (m.windowArea / m.wallArea) * 100 : 0;
    const peakKw = (m.windowArea * m.peakWm2) / 1000;
    return {
      orientation: orient,
      wallArea: m.wallArea,
      windowArea: m.windowArea,
      wwrPct,
      peakIrradianceWm2: m.peakWm2,
      peakCoolingLoadKw: peakKw
    };
  });

  const totalWallArea = cardinalList.reduce((acc, c) => acc + c.wallArea, 0);
  const totalWindowArea = cardinalList.reduce((acc, c) => acc + c.windowArea, 0);
  const overallWwrPct = totalWallArea > 0 ? (totalWindowArea / totalWallArea) * 100 : 0;
  const totalPeakCoolingLoadKw = cardinalList.reduce((acc, c) => acc + c.peakCoolingLoadKw, 0);

  const westWin = cardinalList.find(c => c.orientation === 'West')?.windowArea || 0;
  let rating: SolarAnalysisSummary['efficiencyRating'] = 'Optimized';
  const recs: string[] = [];

  if (westWin > 3 || totalPeakCoolingLoadKw > 2.0) {
    rating = 'High Exposure Warning';
    recs.push('High West solar radiation detected. Apply Low-E tinted glazing or external louvers.');
  } else if (overallWwrPct > 35) {
    rating = 'Standard';
    recs.push('Envelope glazing exceeds 35%. Consider double glazing for thermal offset.');
  } else {
    recs.push('Solar envelope exposure is well optimized for tropical/subtropical climates.');
  }

  return {
    cardinalMetrics: cardinalList,
    totalWallArea,
    totalWindowArea,
    overallWwrPct,
    totalPeakCoolingLoadKw,
    efficiencyRating: rating,
    recommendations: recs
  };
}
