import type { SiteContext, SiteAnalysisResult } from '@/domain/site';
import { computeSiteAnalysis } from './siteAnalysis';
import { generateAllSiteDiagrams } from './sixDiagrams';

export interface SiteAnalysisOutput {
  analysis: SiteAnalysisResult;
  diagrams: ReturnType<typeof generateAllSiteDiagrams>;
  summary: {
    orientationScore: number;
    optimalGlazingDirection: string;
    windProtectionNeeded: boolean;
    terrainChallenge: 'none' | 'moderate' | 'significant';
    adjacentBuildingImpact: number;
    recommendations: string[];
  };
}

function optimalDirectionLabel(angle: number): string {
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(angle / 45) % 8;
  return labels[idx];
}

function computeTerrainChallenge(terrain: string): 'none' | 'moderate' | 'significant' {
  switch (terrain) {
    case 'steep': return 'significant';
    case 'sloping': return 'moderate';
    default: return 'none';
  }
}

export function computeFullSiteAnalysis(site: SiteContext): SiteAnalysisOutput {
  const analysis = computeSiteAnalysis(site);
  const diagrams = generateAllSiteDiagrams(site);

  const orientationScore = Math.round((1 - Math.abs(site.orientation - analysis.optimalOrientation) / 180) * 100);

  const topWind = [...analysis.windExposure].sort((a, b) => (b.windExposure ?? 0) - (a.windExposure ?? 0))[0];
  const windProtectionNeeded = (topWind?.windExposure ?? 0) > 5;

  const recs: string[] = [];
  recs.push(`Optimal building axis: ${analysis.optimalOrientation}° (${optimalDirectionLabel(analysis.optimalOrientation)}) for solar gain.`);
  recs.push(`Current orientation is ${Math.abs(site.orientation - analysis.optimalOrientation)}° from optimal.`);

  if (windProtectionNeeded) {
    recs.push(`High wind exposure from ${topWind?.label ?? 'unknown'} direction. Consider windbreaks or sheltered outdoor areas.`);
  }

  if (site.terrain !== 'flat') {
    recs.push(`${site.terrain === 'steep' ? 'Significant' : 'Moderate'} topography — plan for cut/fill analysis and stepped foundations.`);
  }

  if (site.adjacentBuildings.length > 0) {
    recs.push(`${site.adjacentBuildings.length} adjacent structure(s) — review shadow impact and privacy sightlines.`);
  }

  return {
    analysis,
    diagrams,
    summary: {
      orientationScore: Math.min(100, Math.max(0, orientationScore)),
      optimalGlazingDirection: optimalDirectionLabel(analysis.optimalOrientation),
      windProtectionNeeded,
      terrainChallenge: computeTerrainChallenge(site.terrain),
      adjacentBuildingImpact: site.adjacentBuildings.length,
      recommendations: recs,
    }
  };
}

export function createDefaultSiteContext(projectId: string): SiteContext {
  return {
    projectId,
    lat: -26.2041,
    lng: 28.0473,
    orientation: 15,
    terrain: 'flat',
    adjacentBuildings: [],
    accessEdges: [
      { type: 'vehicle', location: [{ x: 0, y: 0 }, { x: 5, y: 0 }], width: 6 },
      { type: 'pedestrian', location: [{ x: 0, y: 5 }, { x: 3, y: 5 }], width: 1.5 },
    ],
    noiseSources: [
      { type: 'road', location: [{ x: 0, y: 0 }, { x: 50, y: 0 }], levelDba: 65 },
    ],
    plotBoundary: [
      { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 25 }, { x: 0, y: 25 },
    ],
    windRose: {
      sectors: [
        { direction: 0, speed: 5.2, frequency: 0.15 },
        { direction: 45, speed: 4.1, frequency: 0.10 },
        { direction: 90, speed: 3.8, frequency: 0.12 },
        { direction: 135, speed: 4.5, frequency: 0.08 },
        { direction: 180, speed: 6.1, frequency: 0.20 },
        { direction: 225, speed: 5.5, frequency: 0.18 },
        { direction: 270, speed: 3.2, frequency: 0.10 },
        { direction: 315, speed: 4.0, frequency: 0.07 },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
