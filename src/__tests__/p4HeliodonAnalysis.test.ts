import { describe, it, expect } from 'vitest';

// ─── heliodon ─────────────────────────────────────────────────────
import { computeSunPosition, computeSunPath, computeAnnualExposure } from '@/engine/analysis/heliodon';

describe('heliodon', () => {
  it('sun is above horizon at noon in summer', () => {
    const pos = computeSunPosition(-26, 28, new Date(2026, 0, 15), 12);
    expect(pos.elevation).toBeGreaterThan(0);
    expect(pos.azimuth).toBeGreaterThanOrEqual(0);
    expect(pos.azimuth).toBeLessThanOrEqual(360);
  });

  it('sun elevation at equator equinox noon is high', () => {
    const pos = computeSunPosition(0, 0, new Date(2026, 2, 20), 12);
    expect(pos.elevation).toBeGreaterThan(80);
  });

  it('sun is below horizon at midnight', () => {
    const pos = computeSunPosition(-26, 28, new Date(2026, 5, 15), 0);
    expect(pos.elevation).toBeLessThan(0);
  });

  it('sun path returns multiple daytime positions', () => {
    const path = computeSunPath(-26, 28, new Date(2026, 5, 15));
    expect(path.length).toBeGreaterThan(0);
    for (const p of path) {
      expect(p.elevation).toBeGreaterThan(0);
    }
  });

  it('sun path returns fewer points at high latitude winter', () => {
    const summer = computeSunPath(60, 0, new Date(2026, 5, 15));
    const winter = computeSunPath(60, 0, new Date(2026, 11, 15));
    expect(winter.length).toBeLessThan(summer.length);
  });

  it('annual exposure returns non-negative values', () => {
    const exp = computeAnnualExposure(-26, 180);
    expect(exp.annualKwhM2).toBeGreaterThanOrEqual(0);
    expect(exp.peakSunHours).toBeGreaterThanOrEqual(0);
  });

  it('north-facing gets more sun in southern hemisphere', () => {
    const north = computeAnnualExposure(-26, 0);
    const south = computeAnnualExposure(-26, 180);
    expect(north.annualKwhM2).toBeGreaterThan(south.annualKwhM2);
  });

  it('azimuth is within 0-360 range', () => {
    for (let h = 6; h <= 18; h++) {
      const pos = computeSunPosition(-26, 28, new Date(2026, 5, 15), h);
      expect(pos.azimuth).toBeGreaterThanOrEqual(0);
      expect(pos.azimuth).toBeLessThanOrEqual(360);
    }
  });

  it('sun azimuth is within 0-360 range at dawn', () => {
    const pos = computeSunPosition(0, 0, new Date(2026, 2, 20), 6);
    expect(pos.azimuth).toBeGreaterThanOrEqual(0);
    expect(pos.azimuth).toBeLessThanOrEqual(360);
  });
});

// ─── shadowCast ──────────────────────────────────────────────────
import { computeShadowPolygon, computeDailyShadowStudy, computeBuildingHeightFromFloors } from '@/engine/analysis/shadowCast';
import type { Point2D, SunPosition } from '@/domain/site';

describe('shadowCast', () => {
  const building = {
    vertices: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ] as Point2D[],
    height: 10,
  };

  const noonSun: SunPosition = {
    azimuth: 0,
    elevation: 60,
    time: new Date(2026, 5, 15, 12),
  };

  it('returns polygon with vertices', () => {
    const shadow = computeShadowPolygon(building, noonSun, noonSun.time);
    expect(shadow.vertices.length).toBeGreaterThan(0);
    expect(shadow.color).toBe('#1a1a2e');
  });

  it('opacity decreases as sun rises', () => {
    const lowSun: SunPosition = { azimuth: 180, elevation: 10, time: new Date(2026, 5, 15, 7) };
    const highSun: SunPosition = { azimuth: 180, elevation: 60, time: new Date(2026, 5, 15, 12) };
    const low = computeShadowPolygon(building, lowSun, lowSun.time);
    const high = computeShadowPolygon(building, highSun, highSun.time);
    expect(low.opacity).toBeGreaterThan(high.opacity);
  });

  it('shadow is displaced opposite to sun direction', () => {
    const northSun: SunPosition = { azimuth: 0, elevation: 45, time: new Date() };
    const eastSun: SunPosition = { azimuth: 90, elevation: 45, time: new Date() };
    const northShadow = computeShadowPolygon(building, northSun, northSun.time);
    const eastShadow = computeShadowPolygon(building, eastSun, eastSun.time);
    // Centroid should be different
    const nc = centroid(northShadow.vertices);
    const ec = centroid(eastShadow.vertices);
    const dist = Math.abs(nc.x - ec.x) + Math.abs(nc.y - ec.y);
    expect(dist).toBeGreaterThan(1);
  });

  it('daily shadow study filters out night positions', () => {
    const positions: SunPosition[] = [
      { azimuth: 0, elevation: -10, time: new Date() },
      { azimuth: 0, elevation: 45, time: new Date() },
    ];
    const study = computeDailyShadowStudy(building, 0, 0, new Date(), positions);
    expect(study.length).toBe(1);
  });

  it('computeBuildingHeightFromFloors gives correct height', () => {
    expect(computeBuildingHeightFromFloors(3)).toBe(9);
    expect(computeBuildingHeightFromFloors(5)).toBe(15);
    expect(computeBuildingHeightFromFloors(2, 3.5)).toBe(7);
  });
});

function centroid(vertices: Point2D[]): Point2D {
  const cx = vertices.reduce((s, v) => s + v.x, 0) / vertices.length;
  const cy = vertices.reduce((s, v) => s + v.y, 0) / vertices.length;
  return { x: cx, y: cy };
}

// ─── windAnalysis ─────────────────────────────────────────────────
import { computeWindExposure, computeAllFacadeWindExposure, computeWindProtection, createDefaultWindRose } from '@/engine/analysis/windAnalysis';

describe('windAnalysis', () => {
  const windRose = createDefaultWindRose();

  it('default wind rose has 12 sectors', () => {
    expect(windRose.sectors.length).toBe(12);
  });

  it('sector frequencies sum to ~1.0', () => {
    const total = windRose.sectors.reduce((s, sec) => s + sec.frequency, 0);
    expect(total).toBeCloseTo(1.0, 1);
  });

  it('north facade has non-zero exposure', () => {
    const exp = computeWindExposure(0, windRose);
    expect(exp).toBeGreaterThan(0);
  });

  it('all 8 facade exposures return valid results', () => {
    const exposures = computeAllFacadeWindExposure(windRose);
    expect(exposures.length).toBe(8);
    const labels = exposures.map(e => e.label);
    expect(labels).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
    for (const e of exposures) {
      expect(e.windExposure).toBeGreaterThanOrEqual(0);
    }
  });

  it('wind protection is positive', () => {
    const protection = computeWindProtection(20, 10, windRose);
    expect(protection).toBeGreaterThan(0);
  });

  it('larger building has higher protection', () => {
    const small = computeWindProtection(10, 5, windRose);
    const large = computeWindProtection(30, 15, windRose);
    expect(large).toBeGreaterThan(small);
  });
});

// ─── siteAnalysis ─────────────────────────────────────────────────
import { computeSiteAnalysis, orientationScore } from '@/engine/analysis/siteAnalysis';
import type { SiteContext, WindRose } from '@/domain/site';

describe('siteAnalysis', () => {
  const mockSite: SiteContext = {
    projectId: 'test-1',
    lat: -26,
    lng: 28,
    orientation: 180,
    terrain: 'flat',
    adjacentBuildings: [],
    windRose: createDefaultWindRose(),
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  it('returns analysis result', () => {
    const result = computeSiteAnalysis(mockSite);
    expect(result.orientation).toBe(180);
    expect(result.solarExposure.length).toBe(8);
    expect(result.windExposure.length).toBe(8);
  });

  it('total annual kWh is positive', () => {
    const result = computeSiteAnalysis(mockSite);
    expect(result.totalAnnualKwh).toBeGreaterThan(0);
  });

  it('optimal orientation exists', () => {
    const result = computeSiteAnalysis(mockSite);
    expect(result.optimalOrientation).toBeGreaterThanOrEqual(0);
  });

  it('orientation score is 0-100 (perfect alignment)', () => {
    expect(orientationScore(180, 180)).toBe(100);
  });

  it('orientation score is 0 for opposite orientation', () => {
    expect(orientationScore(0, 180)).toBe(0);
  });

  it('orientation score handles 90-degree difference', () => {
    expect(orientationScore(90, 180)).toBe(50);
  });
});
