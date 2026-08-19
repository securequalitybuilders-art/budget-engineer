import { describe, it, expect } from 'vitest';
import { buildResourceHub, buildDemandRadar, tradeForDescription, lockedUntilFor, isLocked } from '@/engine/greenflag/resourceHub';
import { bestFitContractor, generateContract, ASSEMBLY_PATHS, MILESTONE_SPLIT } from '@/engine/greenflag/teamAssembly';
import { certifyEntity, buildContractorScorecard, buildSupplierScorecard, tierForScore, rebateForTier, TIER_THRESHOLDS, CREDENTIAL_CHECKS } from '@/engine/greenflag/certification';
import { valueDrivenQuote, createForwardCommitment, commitmentTotals } from '@/engine/greenflag/bulkProcurement';
import { tagBoqWithWbs, dynamicCostBuildUp, redPenAudit, valueEngineeringSuggestions, lockCostBaseline, ZIQS_WBS_TEMPLATE, RED_PEN_THRESHOLD_PCT } from '@/engine/greenflag/costClarification';
import type { BoqItem } from '@/domain/greenflag';
import type { ContractorCandidate } from '@/domain/greenflag';
import type { BoqResult } from '@/adapters/designToBoq';

const now = new Date('2026-06-01T10:00:00Z');
const ISO = '2026-06-01T10:00:00.000Z';

const CANONICAL_CANDIDATES: ContractorCandidate[] = [
  {
    id: 'c1',
    name: 'Kudakwashe Moyo',
    specialization: 'Residential Construction',
    rating: 4.9,
    reviews: 127,
    distanceKm: 8,
    availableFrom: '2026-06-15',
    wipaaPct: 94,
    trueProfitabilityPct: 14,
    projectCount: 22,
    avgProjectCents: 1950000,
    verified: true,
  },
  {
    id: 'c2',
    name: 'Tendai Ncube',
    specialization: 'Residential Construction',
    rating: 4.2,
    reviews: 41,
    distanceKm: 21,
    availableFrom: '2026-08-01',
    wipaaPct: 78,
    trueProfitabilityPct: 9,
    projectCount: 9,
    avgProjectCents: 1400000,
    verified: true,
  },
];

function makeBoq(): BoqResult {
  return {
    id: 'boq-1',
    projectId: 'p1',
    currency: 'USD',
    items: [
      { id: 'b1', quantityRef: 'q1', category: 'Masonry', description: '230mm masonry wall', unit: 'm2', quantity: 120, rate: 18, total: 2160 },
      { id: 'b2', quantityRef: 'q2', category: 'Roofing', description: 'IBR roof sheets', unit: 'm2', quantity: 140, rate: 12, total: 1680 },
    ],
    summary: { subtotal: 3840, contingency: 345.6, professionalFees: 0, vat: 0, grandTotal: 4185.6 },
  } as unknown as BoqResult;
}

function makeBoqItems(): BoqItem[] {
  return [
    { id: 'b1', projectId: 'p1', lineIndex: 0, wbsCode: '03.01', description: '230mm masonry wall', unit: 'm2', quantity: 120, unitCostCents: 1800, totalCents: 216000, source: 'boq' },
    { id: 'b2', projectId: 'p1', lineIndex: 1, wbsCode: '04.01', description: 'IBR roof sheets', unit: 'm2', quantity: 140, unitCostCents: 1200, totalCents: 168000, source: 'boq' },
  ];
}

describe('C1 Resource Hub', () => {
  it('builds resources from the BOQ with 30-day lock', () => {
    const rates = [{ id: 'r1', description: 'Cement 50kg', baseRateCents: 850, unit: 'bag', region: 'zimbabwe' as const, code: 'CEM-50', source: 'zimbabwe' as const, year: 2026 }];
    const hub = buildResourceHub(makeBoq(), rates, { projectId: 'p1', now });
    expect(hub.resources.length).toBeGreaterThanOrEqual(3);
    expect(hub.lockedUntil).toBe('2026-07-01');
    expect(hub.resources[0].name).toBe('230mm masonry wall');
    expect(hub.resources[0].baseRateCents).toBe(1800);
    expect(hub.resources[0].lockedUntil).toBe('2026-07-01');
    expect(hub.resources.every((r) => r.createdAt === ISO)).toBe(true);
  });

  it('appends rate-catalogue resources as verified', () => {
    const rates = [{ id: 'r1', description: 'Cement 50kg', baseRateCents: 850, unit: 'bag', region: 'zimbabwe' as const, code: 'CEM-50', source: 'zimbabwe' as const, year: 2026 }];
    const hub = buildResourceHub(null, rates, { projectId: 'p1', now });
    expect(hub.resources).toHaveLength(1);
    expect(hub.resources[0].verified).toBe(true);
    expect(hub.resources[0].source).toBe('market-index');
  });

  it('classifies trades from descriptions', () => {
    expect(tradeForDescription('Cement 50kg')).toBe('Cement & Concrete');
    expect(tradeForDescription('face bricks')).toBe('Brick & Block');
    expect(tradeForDescription('12mm rebar')).toBe('Steel & Reinforcement');
    expect(tradeForDescription('random thing')).toBe('General Materials');
  });

  it('emits the deterministic demand radar (Bricks 500k Q3 2026)', () => {
    const radar = buildDemandRadar(now, 'zimbabwe');
    const bricksNext = radar.entries.find((e) => e.material === 'Bricks' && e.quarter === 'Q3 2026');
    expect(bricksNext).toBeDefined();
    expect(bricksNext!.demandUnits).toBeGreaterThanOrEqual(500000);
    expect(bricksNext!.demandUnits).toBeLessThan(600000);
    expect(bricksNext!.activeProjects).toBeGreaterThanOrEqual(12);
    expect(bricksNext!.activeProjects).toBeLessThan(16);
    expect(radar.generatedAt).toBe(ISO);
  });

  it('privacy guardrail: demand radar never reveals identity/location/budget', () => {
    const radar = buildDemandRadar(now, 'zimbabwe');
    const json = JSON.stringify(radar);
    expect(json).not.toMatch(/owner|budget|lat|lng|projectName|projectId/i);
  });

  it('lock helpers respect the 30-day window', () => {
    const until = lockedUntilFor(now);
    expect(until).toBe('2026-07-01');
    expect(isLocked(until, new Date('2026-06-15T00:00:00Z'))).toBe(true);
    expect(isLocked(until, new Date('2026-07-02T00:00:00Z'))).toBe(false);
  });
});

describe('C2 Team Assembly', () => {
  it('offers the three assembly paths with the correct toolbelt', () => {
    expect(ASSEMBLY_PATHS.map((p) => p.id)).toEqual(['alone', 'together', 'for-them']);
    const alone = ASSEMBLY_PATHS.find((p) => p.id === 'alone')!;
    expect(alone.includes).toEqual(['P4P Calculator', 'WIPAA Monitor', 'Red Pen Audit $50', 'Ghost Materials', 'Group Buy Aggregator', 'My Must-Haves']);
    const forThem = ASSEMBLY_PATHS.find((p) => p.id === 'for-them')!;
    expect(forThem.includes.some((i) => i.includes('12-15%'))).toBe(true);
    expect(forThem.includes.some((i) => i.includes('45 minutes'))).toBe(true);
    expect(forThem.description).toContain('Fortress turnkey');
  });

  it('picks the canonical best-fit contractor (Kudakwashe Moyo, 8km)', () => {
    const best = bestFitContractor(CANONICAL_CANDIDATES, { specialization: 'Residential Construction', availableFrom: '2026-06-15' });
    expect(best).not.toBeNull();
    expect(best!.candidate.name).toBe('Kudakwashe Moyo');
    expect(best!.candidate.distanceKm).toBe(8);
    expect(best!.candidate.wipaaPct).toBe(94);
    expect(best!.score).toBe(86);
    expect(best!.reasons).toContain('8km — within the 8km radius');
    expect(best!.reasons).toContain('WIPAA variance 94%');
    expect(best!.reasons).toContain('Rated 4.9★ (127 reviews)');
  });

  it('ranks proximity below 8km and penalizes beyond it', () => {
    const far: ContractorCandidate = { ...CANONICAL_CANDIDATES[1] };
    const near: ContractorCandidate = { ...CANONICAL_CANDIDATES[0], distanceKm: 3 };
    const best = bestFitContractor([far, near], { specialization: 'Residential Construction', availableFrom: '2026-06-15' });
    expect(best!.candidate.id).toBe('c1');
  });

  it('returns null without candidates', () => {
    expect(bestFitContractor([], { specialization: 'x', availableFrom: '2026-01-01' })).toBeNull();
  });

  it('generates the contract with 35/40/25 milestone split and DZ ref', () => {
    const contract = generateContract({
      projectId: 'p1',
      path: 'together',
      ownerName: 'R. Chirwa',
      projectName: 'House 1',
      contractor: CANONICAL_CANDIDATES[0],
      totalCents: 4120000,
      now,
    });
    expect(contract.assignment.contractRef).toMatch(/^DZ-\d{8}-\d+$/);
    expect(MILESTONE_SPLIT).toEqual([
      { name: 'Foundation & Bones', pct: 35 },
      { name: 'Wall Plate & Shell', pct: 40 },
      { name: 'Finishes & Keys', pct: 25 },
    ]);
    expect(contract.assignment.milestoneSplit).toEqual(MILESTONE_SPLIT);
    expect(contract.terms.some((t) => t.includes('35%'))).toBe(true);
    expect(contract.terms.some((t) => t.includes('Kudakwashe Moyo'))).toBe(true);
    expect(contract.terms.some((t) => t.includes('Retention: 10%'))).toBe(true);
  });

  it('for-them path adds the Fortress fee term', () => {
    const contract = generateContract({
      projectId: 'p1',
      path: 'for-them',
      ownerName: 'R. Chirwa',
      projectName: 'House 1',
      contractor: null,
      totalCents: 4120000,
      now,
    });
    expect(contract.terms.some((t) => t.includes('12-15%'))).toBe(true);
  });
});

describe('C3 Certification', () => {
  it('runs the 9-point KYC/AML checklist', () => {
    expect(CREDENTIAL_CHECKS).toHaveLength(9);
    expect(CREDENTIAL_CHECKS.map((c) => c.id)).toContain('architect-registry');
    expect(CREDENTIAL_CHECKS.map((c) => c.id)).toContain('zimra');
    expect(CREDENTIAL_CHECKS.map((c) => c.id)).toContain('nssa');
  });

  it('certifies a registered architect to gold+ (SI 56/2025)', () => {
    const result = certifyEntity({
      projectId: 'p1',
      entityId: 'e1',
      entityName: 'G. Maseko',
      credentials: {
        companyRegistration: true,
        taxClearance: true,
        zimra: true,
        bankDetails: true,
        insurance: true,
        architectRegistrationNumber: 'ACZ-00817',
        prazIndemnity: true,
        tradeCertificates: true,
        nssa: true,
      },
      rating: 4.9,
      projectCount: 22,
      onTimeDeliveryPct: 96,
      wipaaPct: 94,
      kind: 'contractor',
      now,
    });
    expect(result.architectRegistered).toBe(true);
    expect(result.architectName).toBe('Chiedza Ncube');
    expect(result.score).toBeGreaterThanOrEqual(TIER_THRESHOLDS.gold);
    expect(result.checks).toContain('Architect Registry License (SI 56/2025)');
    expect(result.rebatePct).toBe(rebateForTier(result.tier));
  });

  it('fails an unregistered architect check (SI 56/2025 gate)', () => {
    const result = certifyEntity({
      projectId: 'p1',
      entityId: 'e2',
      entityName: 'Fake Architect',
      credentials: {
        companyRegistration: true,
        taxClearance: true,
        zimra: true,
        bankDetails: true,
        insurance: true,
        architectRegistrationNumber: 'ACZ-0000-0000',
      },
      rating: 3,
      projectCount: 1,
      onTimeDeliveryPct: 50,
      kind: 'contractor',
      now,
    });
    expect(result.architectRegistered).toBe(false);
    expect(result.architectName).toBeNull();
    expect(result.score).toBeLessThan(TIER_THRESHOLDS.gold);
    expect(result.tier).toBe('silver');
  });

  it('maps tiers to dual-source rebates', () => {
    expect(rebateForTier('silver')).toBe(0.75);
    expect(rebateForTier('gold')).toBe(1.25);
    expect(rebateForTier('platinum')).toBe(1.75);
    expect(tierForScore(59)).toBe('silver');
    expect(tierForScore(80)).toBe('gold');
    expect(tierForScore(95)).toBe('platinum');
  });

  it('builds persisted scorecard records', () => {
    const input = {
      projectId: 'p1',
      entityId: 'e1',
      entityName: 'G. Maseko',
      credentials: { companyRegistration: true, taxClearance: true, zimra: true, bankDetails: true, insurance: true, architectRegistrationNumber: 'ACZ-00817' },
      rating: 4.9,
      projectCount: 22,
      onTimeDeliveryPct: 96,
      kind: 'contractor' as const,
      now,
    };
    const card = buildContractorScorecard(input);
    expect(card.contractorId).toBe('e1');
    expect(card.id).toBe('cs-p1-e1');
    expect(card.createdAt).toBe(ISO);
    const supplier = buildSupplierScorecard({ ...input, kind: 'supplier' });
    expect(supplier.supplierId).toBe('e1');
    expect(supplier.id).toBe('ss-p1-e1');
  });
});

describe('C4 Bulk Procurement', () => {
  it('ranks quotes by TCO and applies the group-buy bulk discount', () => {
    const result = valueDrivenQuote(
      [
        { id: 'q1', name: 'Willdale', material: 'Bricks', priceCents: 120000, freightCents: 5000, onTimeDeliveryPct: 98, defectRatePct: 1, laborDowntimeCostCentsPerDay: 40000, leadDays: 3, typicalLeadDays: 7 },
        { id: 'q2', name: 'Zim Brick', material: 'Bricks', priceCents: 115000, freightCents: 12000, onTimeDeliveryPct: 70, defectRatePct: 6, laborDowntimeCostCentsPerDay: 40000, leadDays: 12, typicalLeadDays: 7 },
      ],
      10000,
    );
    expect(result.tcoRows).toHaveLength(2);
    expect(result.bestId).toBe('q1');
    expect(result.tcoRows.find((r) => r.id === 'q1')!.result.totalCostCents).toBeLessThan(
      result.tcoRows.find((r) => r.id === 'q2')!.result.totalCostCents,
    );
    expect(result.bulk.discountPct).toBeGreaterThanOrEqual(6);
  });

  it('creates forward commitments and totals them', () => {
    const fc = createForwardCommitment({
      projectId: 'p1',
      material: 'Bricks',
      quantity: 10000,
      unit: 'units',
      priceCents: 25,
      supplierId: 's1',
      commitmentDate: '2026-07-01',
      now,
    });
    expect(fc.status).toBe('proposed');
    expect(fc.id).toMatch(/^fc-p1-/);
    const totals = commitmentTotals([fc, { ...fc, quantity: 5000, priceCents: 20 }]);
    expect(totals.totalCents).toBe(10000 * 25 + 5000 * 20);
    expect(totals.lockedCents).toBe(0);
    expect(totals.materialCount).toBe(2);
  });
});

describe('C5 Cost Clarification', () => {
  it('tags BOQ lines with ZIQS SMM WBS codes', () => {
    const tagged = tagBoqWithWbs(makeBoqItems());
    expect(tagged[0].wbsCode).toBe('03.01');
    expect(tagged[1].wbsCode).toBe('04.01');
    expect(ZIQS_WBS_TEMPLATE.some((w) => w.code === '03.01' && w.name === 'Masonry (115mm units)')).toBe(true);
  });

  it('builds the dynamic cost build-up rollup', () => {
    const buildUp = dynamicCostBuildUp(makeBoqItems());
    expect(buildUp).toHaveLength(2);
    expect(buildUp[0].code).toBe('03.01');
    expect(buildUp[0].costCents).toBe(216000);
  });

  it('red pen audit flags >15% variance with leakage', () => {
    const audit = redPenAudit(
      makeBoqItems(),
      [{ description: 'masonry wall', rateCents: 1400 }],
      now,
    );
    expect(RED_PEN_THRESHOLD_PCT).toBe(15);
    const flagged = audit.variances.find((v) => v.flagged);
    expect(flagged).toBeDefined();
    expect(flagged!.varianceCents).toBe(216000 - 1400 * 120);
    expect(flagged!.leakageCents).toBe(216000 - 1400 * 120);
    expect(audit.totalLeakageCents).toBe(216000 - 1400 * 120);
    expect(audit.auditDate).toBe(ISO);
  });

  it('suggests value engineering on high-quantity lines', () => {
    const suggestions = valueEngineeringSuggestions(makeBoqItems());
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].description).toBe('IBR roof sheets');
    expect(suggestions[0].savingCents).toBe(10080);
    expect(suggestions[0].rationale).toContain('group-buy');
  });

  it('locks the baseline with the 9% contingency', () => {
    const baseline = lockCostBaseline({
      projectId: 'p1',
      lines: makeBoqItems(),
      contingencyCents: 37958,
      now,
    });
    expect(baseline.totalCents).toBe(384000 + 37958);
    expect(baseline.contingencyPct).toBe(9.0);
    expect(baseline.status).toBe('locked');
    expect(baseline.lockedAt).toBe(ISO);
    expect(baseline.lines).toHaveLength(2);
  });
});