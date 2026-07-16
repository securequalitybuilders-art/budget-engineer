import { describe, it, expect } from 'vitest';
import { generateAllSiteDiagrams } from '@/engine/analysis/sixDiagrams';
import { computeFullSiteAnalysis, createDefaultSiteContext } from '@/engine/analysis/siteAnalysisEngine';
import { computeSiteAnalysis, orientationScore } from '@/engine/analysis/siteAnalysis';
import type { SiteContext } from '@/domain/site';

function makeSite(overrides?: Partial<SiteContext>): SiteContext {
  return { ...createDefaultSiteContext('test-project'), ...overrides };
}

describe('P14 — Site Analysis & Heliodon Studio', () => {
  describe('createDefaultSiteContext', () => {
    it('creates a valid site context with project id', () => {
      const site = createDefaultSiteContext('p14-test');
      expect(site.projectId).toBe('p14-test');
      expect(site.lat).toBeCloseTo(-26.2041);
      expect(site.accessEdges).toHaveLength(2);
      expect(site.noiseSources).toHaveLength(1);
      expect(site.plotBoundary).toHaveLength(4);
    });
  });

  describe('computeSiteAnalysis', () => {
    it('returns orientation metrics', () => {
      const result = computeSiteAnalysis(makeSite());
      expect(result.optimalOrientation).toBeGreaterThanOrEqual(0);
      expect(result.totalAnnualKwh).toBeGreaterThan(0);
      expect(result.solarExposure).toHaveLength(8);
      expect(result.windExposure).toHaveLength(8);
    });

    it('computes orientationScore', () => {
      const score = orientationScore(15, 180);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles different latitudes', () => {
      const equator = computeSiteAnalysis(makeSite({ lat: 0 }));
      const tropic = computeSiteAnalysis(makeSite({ lat: -23.5 }));
      expect(equator.totalAnnualKwh).toBeGreaterThan(0);
      expect(tropic.totalAnnualKwh).toBeGreaterThan(0);
    });
  });

  describe('computeFullSiteAnalysis', () => {
    it('returns comprehensive site analysis output', () => {
      const site = makeSite({ adjacentBuildings: [{ id: 'b1', vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 0, y: 8 }], height: 6, name: 'Block A' }] });
      const output = computeFullSiteAnalysis(site);
      expect(output.analysis).toBeDefined();
      expect(output.diagrams).toHaveLength(6);
      expect(output.summary.orientationScore).toBeGreaterThanOrEqual(0);
      expect(output.summary.adjacentBuildingImpact).toBe(1);
      expect(output.summary.recommendations.length).toBeGreaterThanOrEqual(1);
    });

    it('identifies terrain challenges', () => {
      const flat = computeFullSiteAnalysis(makeSite({ terrain: 'flat' }));
      const steep = computeFullSiteAnalysis(makeSite({ terrain: 'steep' }));
      expect(flat.summary.terrainChallenge).toBe('none');
      expect(steep.summary.terrainChallenge).toBe('significant');
    });
  });

  describe('generateAllSiteDiagrams', () => {
    it('generates all 6 diagram types', () => {
      const diagrams = generateAllSiteDiagrams(makeSite());
      expect(diagrams).toHaveLength(6);
      const types = diagrams.map(d => d.type);
      expect(types).toContain('sun-wind-path');
      expect(types).toContain('access-noise');
      expect(types).toContain('figure-ground');
      expect(types).toContain('natural-features');
      expect(types).toContain('permeability-transport');
      expect(types).toContain('concept-urban-context');
    });

    it('each diagram has SVG content', () => {
      const diagrams = generateAllSiteDiagrams(makeSite());
      for (const d of diagrams) {
        expect(d.svgContent).toContain('<svg');
        expect(d.svgContent).toContain('</svg>');
        expect(d.label.length).toBeGreaterThan(0);
      }
    });

    it('sun-wind-path diagram contains sun path data', () => {
      const diagrams = generateAllSiteDiagrams(makeSite({ lat: -26 }));
      const sunWind = diagrams.find(d => d.type === 'sun-wind-path');
      expect(sunWind).toBeDefined();
      expect(sunWind!.data).toHaveProperty('sunPositions');
      expect(sunWind!.data).toHaveProperty('optimalOrientation');
    });

    it('figure-ground diagram contains coverage data', () => {
      const diagrams = generateAllSiteDiagrams(makeSite());
      const fg = diagrams.find(d => d.type === 'figure-ground');
      expect(fg).toBeDefined();
      expect(typeof (fg!.data as any).coveragePct).toBe('number');
      expect(typeof (fg!.data as any).far).toBe('number');
    });
  });

  describe('handles edge cases', () => {
    it('works with minimal site data', () => {
      const minimalSite = createDefaultSiteContext('minimal');
      const output = computeFullSiteAnalysis(minimalSite);
      expect(output.diagrams).toHaveLength(6);
      expect(output.summary).toBeDefined();
    });

    it('works with extreme latitudes', () => {
      const arctic = computeSiteAnalysis(makeSite({ lat: 70 }));
      expect(arctic.totalAnnualKwh).toBeGreaterThanOrEqual(0);

      const antarctic = computeSiteAnalysis(makeSite({ lat: -70 }));
      expect(antarctic.totalAnnualKwh).toBeGreaterThanOrEqual(0);
    });
  });
});
