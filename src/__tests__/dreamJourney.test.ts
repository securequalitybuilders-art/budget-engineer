import { describe, it, expect } from 'vitest';
import {
  DREAM_PHASES,
  JOURNEY_STEPS,
  FUNDING_SOURCES,
  FINISH_CATALOG,
  MATERIALS_LINES,
  SPEND_DOWN_OPTIONS,
  buildBuildPlan,
  buildConceptOptions,
  buildMilestoneSplit,
  contractorMatch,
  estimateGrossAreaM2,
  feasibilityVerdict,
  finishLinePrice,
  formatMoney,
  rateBand,
  romEstimateForType,
  romPerM2Cents,
} from '@/engine/onboarding/dreamJourney';

describe('dreamJourney phases & steps', () => {
  it('has 5 phases in the DREAM→MOVE IN order', () => {
    expect(DREAM_PHASES.map((p) => p.label)).toEqual(['Dream', 'Plan', 'Pick', 'Build', 'Move In']);
  });

  it('has 14 journey steps covering all 5 phases', () => {
    expect(JOURNEY_STEPS).toHaveLength(14);
    expect(new Set(JOURNEY_STEPS.map((s) => s.phase))).toEqual(new Set(DREAM_PHASES.map((p) => p.id)));
    expect(JOURNEY_STEPS.map((s) => s.title)).toContain('Who is building?');
    expect(JOURNEY_STEPS.map((s) => s.title)).toContain('Your matched contractor');
    expect(JOURNEY_STEPS.map((s) => s.title)).toContain('Move In');
  });

  it('keeps step ids unique and ordered', () => {
    const ids = JOURNEY_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('dream-welcome');
    expect(ids[ids.length - 1]).toBe('move-in-handover');
  });
});

describe('dreamJourney ROM estimation', () => {
  it('computes gross area from the building typology programme', () => {
    const area = estimateGrossAreaM2('house-residential');
    expect(area).toBeGreaterThan(0);
    expect(estimateGrossAreaM2('duplex')).toBeGreaterThan(0);
  });

  it('returns a regional per-m² baseline in cents', () => {
    expect(romPerM2Cents('zimbabwe')).toBe(75_000);
    expect(romPerM2Cents('south-africa')).toBeGreaterThan(romPerM2Cents('zimbabwe'));
    expect(romPerM2Cents('unknown-region')).toBe(romPerM2Cents('other'));
  });

  it('builds a low/best/high ROM band around the best estimate', () => {
    const rom = romEstimateForType('house-residential', 'zimbabwe');
    expect(rom.romLowCents).toBeLessThan(rom.romBestCents);
    expect(rom.romHighCents).toBeGreaterThan(rom.romBestCents);
    expect(rom.romBestCents).toBe(rom.grossAreaM2 * rom.perM2Cents);
  });
});

describe('dreamJourney feasibility verdict', () => {
  it('verdicts go when the budget covers 110%+ of ROM', () => {
    const rom = romEstimateForType('house-residential', 'zimbabwe').romBestCents;
    const v = feasibilityVerdict({ buildingType: 'house-residential', region: 'zimbabwe', budgetCents: Math.round(rom * 1.2) });
    expect(v.verdict).toBe('go');
    expect(v.coveragePct).toBeGreaterThanOrEqual(110);
  });

  it('verdicts cautious between 85-110%', () => {
    const rom = romEstimateForType('house-residential', 'zimbabwe').romBestCents;
    const v = feasibilityVerdict({ buildingType: 'house-residential', region: 'zimbabwe', budgetCents: Math.round(rom * 0.9) });
    expect(v.verdict).toBe('cautious');
  });

  it('verdicts no-go below 85% and reports the gap', () => {
    const rom = romEstimateForType('house-residential', 'zimbabwe').romBestCents;
    const budgetCents = Math.round(rom * 0.5);
    const v = feasibilityVerdict({ buildingType: 'house-residential', region: 'zimbabwe', budgetCents });
    expect(v.verdict).toBe('no-go');
    expect(v.gapCents).toBe(rom - budgetCents);
  });

  it('treats a missing budget as cautious', () => {
    const v = feasibilityVerdict({ buildingType: 'house-residential', region: 'zimbabwe', budgetCents: 0 });
    expect(v.verdict).toBe('cautious');
  });
});

describe('dreamJourney concept options', () => {
  it('builds 3 sketches from the typology', () => {
    const options = buildConceptOptions('house-residential');
    expect(options).toHaveLength(3);
    expect(options.map((o) => o.id)).toEqual(['compact', 'core', 'extended']);
    expect(options[0].grossAreaM2).toBeLessThan(options[1].grossAreaM2);
    expect(options[2].grossAreaM2).toBeGreaterThan(options[1].grossAreaM2);
  });

  it('carries programme + structural highlights', () => {
    const core = buildConceptOptions('house-residential')[1];
    expect(core.programmeSummary.length).toBeGreaterThan(0);
    expect(core.highlights.length).toBeGreaterThan(0);
    expect(core.budgetFitLabel).toBe('Best value');
  });
});

describe('dreamJourney finishes catalog', () => {
  it('covers floor/walls/roof/paint categories with price tags', () => {
    for (const category of ['floor', 'walls', 'roof', 'paint'] as const) {
      expect(FINISH_CATALOG[category].length).toBeGreaterThanOrEqual(3);
      for (const f of FINISH_CATALOG[category]) {
        expect(f.priceCents).toBeGreaterThan(0);
        expect(f.unit).toMatch(/\/ m²/);
      }
    }
  });

  it('computes a per-line price scaled by area', () => {
    const line = finishLinePrice(FINISH_CATALOG.floor[0], 100);
    expect(line).toBe(FINISH_CATALOG.floor[0].priceCents * 100);
  });
});

describe('dreamJourney build plan', () => {
  it('splits milestones into 35/40/25%', () => {
    const m = buildMilestoneSplit(41_200_00);
    expect(m.map((x) => x.pct)).toEqual([35, 40, 25]);
    expect(m.reduce((sum, x) => sum + x.amountCents, 0)).toBe(41_200_00);
  });

  it('adds a 9% contingency and locks the grand total', () => {
    const plan = buildBuildPlan(41_200_00);
    expect(plan.contingencyCents).toBe(Math.round(41_200_00 * 0.09));
    expect(plan.grandTotalCents).toBe(plan.baseTotalCents + plan.contingencyCents);
    expect(plan.milestones.reduce((s, m) => s + m.amountCents, 0)).toBe(plan.baseTotalCents);
  });

  it('keeps milestone amounts monotonic-safe (sum equals base)', () => {
    const plan = buildBuildPlan(1234567);
    expect(plan.milestones.reduce((s, m) => s + m.amountCents, 0)).toBe(plan.baseTotalCents);
  });
});

describe('dreamJourney contractor matching', () => {
  it('recommends the closest, specialised, healthy contractor', () => {
    const matches = contractorMatch('house-residential');
    expect(matches.length).toBeGreaterThanOrEqual(3);
    const rec = matches.find((c) => c.isRecommended);
    expect(rec).toBeDefined();
    expect(rec!.name).toBe('Kudakwashe Chirinda');
    expect(rec!.proximityKm).toBe(8);
    expect(rec!.wipaaHealth).toBeGreaterThan(80);
    expect(rec!.why.length).toBeGreaterThanOrEqual(3);
  });

  it('adapts the specialisation to the building type', () => {
    expect(contractorMatch('clinic-health')[0].specialization).toContain('General building works');
  });
});

describe('dreamJourney materials & spend-down', () => {
  it('locks Willdale and Sino with 30-day notes', () => {
    const lines = MATERIALS_LINES.filter((m) => m.supplier === 'Willdale' || m.supplier === 'Sino Zimbabwe');
    expect(lines.map((l) => l.note)).toEqual(['Locked for 30 days', 'Locked for 30 days']);
  });

  it('offers the spec spend-down options with AI/ops tagging', () => {
    const ids = SPEND_DOWN_OPTIONS.map((o) => o.id);
    expect(ids).toContain('solar-geyser');
    expect(ids).toContain('borehole');
    expect(SPEND_DOWN_OPTIONS.find((o) => o.id === 'solar-geyser')!.source).toBe('ai');
    expect(SPEND_DOWN_OPTIONS.find((o) => o.id === 'borehole')!.tag).toContain('Gweru rationing 2027');
    expect(SPEND_DOWN_OPTIONS.find((o) => o.id === 'refund')!.priceCents).toBe(0);
  });
});

describe('dreamJourney money & ratings', () => {
  it('formats cents as whole dollars', () => {
    expect(formatMoney(4120000)).toBe('$41,200');
    expect(formatMoney(0)).toBe('$0');
  });

  it('maps a 5-star rating to an Excellent band', () => {
    expect(rateBand(5).label).toBe('Excellent');
    expect(rateBand(2).label).toBe('Poor');
  });

  it('exposes funding sources for the funding-check step', () => {
    expect(FUNDING_SOURCES.length).toBeGreaterThanOrEqual(5);
    expect(FUNDING_SOURCES.map((f) => f.label)).toContain('Bank construction loan');
  });
});
