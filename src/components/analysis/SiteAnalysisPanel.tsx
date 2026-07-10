import { useMemo } from 'react';
import type { SiteContext } from '@/domain/site';
import { computeSiteAnalysis, orientationScore } from '@/engine/analysis/siteAnalysis';

interface SiteAnalysisPanelProps {
  site: SiteContext;
  className?: string;
}

export function SiteAnalysisPanel({ site, className = '' }: SiteAnalysisPanelProps) {
  const analysis = useMemo(() => computeSiteAnalysis(site), [site]);

  const orientationScoreValue = useMemo(
    () => orientationScore(site.orientation, analysis.optimalOrientation),
    [site.orientation, analysis.optimalOrientation]
  );

  const bestFacade = useMemo(
    () => [...analysis.solarExposure].sort((a, b) => b.annualKwhM2 - a.annualKwhM2).slice(0, 3),
    [analysis.solarExposure]
  );

  const worstWind = useMemo(
    () => [...analysis.windExposure].sort((a, b) => (b.windExposure ?? 0) - (a.windExposure ?? 0)).slice(0, 3),
    [analysis.windExposure]
  );

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        Site Analysis
      </div>

      <div className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
        <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">Orientation</div>
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Current: {site.orientation}°</span>
          <span>Optimal: {analysis.optimalOrientation}°</span>
          <span className={`font-semibold ${orientationScoreValue >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
            Score: {orientationScoreValue}/100
          </span>
        </div>
      </div>

      <div className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
        <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">Solar Exposure</div>
        <div className="mb-1 text-xs text-[var(--text-secondary)]">
          Total: {analysis.totalAnnualKwh.toLocaleString()} kWh/m²/year · {analysis.totalPeakSunHours} peak hours
        </div>
        <div className="flex flex-col gap-1">
          {bestFacade.map((f) => (
            <div key={f.angle} className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{f.label} ({f.angle}°)</span>
              <span className="font-medium text-[var(--text-primary)]">{f.annualKwhM2} kWh/m²</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
        <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">Wind Exposure</div>
        <div className="flex flex-col gap-1">
          {worstWind.map((f) => (
            <div key={f.angle} className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{f.label} ({f.angle}°)</span>
              <span className="font-medium text-[var(--text-primary)]">
                {f.windExposure?.toFixed(1) ?? 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
        <div className="mb-2 text-xs font-medium text-[var(--text-primary)]">Site Info</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span>Latitude</span>
          <span className="text-right font-medium text-[var(--text-primary)]">{site.lat.toFixed(4)}°</span>
          <span>Longitude</span>
          <span className="text-right font-medium text-[var(--text-primary)]">{site.lng.toFixed(4)}°</span>
          <span>Terrain</span>
          <span className="text-right font-medium capitalize text-[var(--text-primary)]">{site.terrain}</span>
          <span>Adjacent buildings</span>
          <span className="text-right font-medium text-[var(--text-primary)]">{site.adjacentBuildings.length}</span>
        </div>
      </div>
    </div>
  );
}
