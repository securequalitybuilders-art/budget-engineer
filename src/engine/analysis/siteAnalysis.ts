import type { SiteContext, FacadeExposure, SiteAnalysisResult } from '@/domain/site';
import { computeAnnualExposure } from '@/engine/analysis/heliodon';
import { computeAllFacadeWindExposure } from '@/engine/analysis/windAnalysis';

const FACADE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const FACADE_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function computeSiteAnalysis(site: SiteContext): SiteAnalysisResult {
  const solarExposure: FacadeExposure[] = FACADE_ANGLES.map((angle, i) => {
    const { annualKwhM2, peakSunHours } = computeAnnualExposure(site.lat, angle);
    return {
      angle,
      label: FACADE_LABELS[i],
      annualKwhM2,
      peakSunHours,
    };
  });

  const windExposure = computeAllFacadeWindExposure(site.windRose);

  const totalAnnualKwh = solarExposure.reduce((s, f) => s + f.annualKwhM2, 0);
  const totalPeakSunHours = solarExposure.reduce((s, f) => s + f.peakSunHours, 0);

  const bestSolar = [...solarExposure].sort((a, b) => b.annualKwhM2 - a.annualKwhM2)[0];

  return {
    orientation: site.orientation,
    optimalOrientation: bestSolar.angle,
    solarExposure,
    windExposure,
    totalAnnualKwh: Math.round(totalAnnualKwh * 100) / 100,
    totalPeakSunHours: Math.round(totalPeakSunHours * 100) / 100,
  };
}

export function orientationScore(
  currentOrientation: number,
  optimalOrientation: number
): number {
  const diff = Math.abs(currentOrientation - optimalOrientation);
  const normalized = Math.min(diff, 360 - diff);
  return Math.round((1 - normalized / 180) * 100);
}
