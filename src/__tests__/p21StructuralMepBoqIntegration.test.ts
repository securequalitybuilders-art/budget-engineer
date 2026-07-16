import { describe, it, expect } from 'vitest';
import type { StructuralPreDesignOutput } from '@/engine/structural/structuralPreDesignEngine';
import type { MepPreDesignOutput } from '@/engine/mep/mepPreDesignEngine';
import { structuralBoqToLineItems, mepBoqToLineItems, mergeWithCentralBoq, buildStructuralMepBoq, computeAdditionalSummary } from '@/adapters/integration/structuralMepToBoq';
import type { BOQ, BOQLineItem } from '@/lib/boq/boq-types';

function makeMockStructural(overrides?: Partial<StructuralPreDesignOutput>): StructuralPreDesignOutput {
  return {
    slabSystem: { system: 'flat-plate', thicknessMm: 180, spanM: 4.5, reinforcement: 'Y12 @ 200', weightKpa: 4.8, assumptionTag: 'test' },
    beams: [
      { id: 'bm-1', startX: 0, startY: 0, endX: 6, endY: 0, widthMm: 200, depthMm: 400, spanM: 6, material: 'concrete', assumptionTag: 'test' },
      { id: 'bm-2', startX: 0, startY: 5, endX: 6, endY: 5, widthMm: 200, depthMm: 400, spanM: 6, material: 'concrete', assumptionTag: 'test' },
    ],
    columns: [
      { id: 'col-1', x: 0, y: 0, type: 'square', widthMm: 300, depthMm: 300, heightM: 3, loadEstimateKn: 120, reinforcement: '4Y16', material: 'concrete', assumptionTag: 'test' },
      { id: 'col-2', x: 6, y: 0, type: 'square', widthMm: 300, depthMm: 300, heightM: 3, loadEstimateKn: 120, reinforcement: '4Y16', material: 'concrete', assumptionTag: 'test' },
      { id: 'col-3', x: 0, y: 5, type: 'square', widthMm: 300, depthMm: 300, heightM: 3, loadEstimateKn: 120, reinforcement: '4Y16', material: 'concrete', assumptionTag: 'test' },
      { id: 'col-4', x: 6, y: 5, type: 'square', widthMm: 300, depthMm: 300, heightM: 3, loadEstimateKn: 120, reinforcement: '4Y16', material: 'concrete', assumptionTag: 'test' },
    ],
    footings: [
      { id: 'ftg-1', x: 0, y: 0, type: 'isolated-pad', widthM: 1.2, depthM: 1.2, thicknessMm: 300, bearingKpa: 150, loadKn: 120, assumptionTag: 'test' },
      { id: 'ftg-2', x: 6, y: 0, type: 'isolated-pad', widthM: 1.2, depthM: 1.2, thicknessMm: 300, bearingKpa: 150, loadKn: 120, assumptionTag: 'test' },
      { id: 'ftg-3', x: 0, y: 5, type: 'isolated-pad', widthM: 1.2, depthM: 1.2, thicknessMm: 300, bearingKpa: 150, loadKn: 120, assumptionTag: 'test' },
      { id: 'ftg-4', x: 6, y: 5, type: 'isolated-pad', widthM: 1.2, depthM: 1.2, thicknessMm: 300, bearingKpa: 150, loadKn: 120, assumptionTag: 'test' },
    ],
    schedules: { slabSchedule: '', beamSchedule: '', columnSchedule: '', footingSchedule: '' },
    drawings: { foundationSvg: '', columnLayoutSvg: '', loadPathSvg: '' },
    boq: { concreteM3: 12.5, reinforcementKg: 1250, formworkM2: 48.3, notes: [] },
    reviewRequiredLabel: 'test',
    ...overrides,
  };
}

function makeMockMep(overrides?: Partial<MepPreDesignOutput>): MepPreDesignOutput {
  return {
    plumbing: { fixtures: [], stacks: [], zones: [], scheduleHtml: '' },
    electrical: { points: [], circuits: [], db: { id: 'db', location: '', circuits: [], totalLoadKva: 0, mainBreakerA: 0, spareWays: 0 }, scheduleHtml: '' },
    hvac: { units: [], shafts: [], scheduleHtml: '' },
    drawings: { plumbingSvg: '', electricalSvg: '', hvacSvg: '', shaftCoordinationSvg: '' },
    boq: { fixtureCounts: {}, pointCounts: {}, hvacUnits: 0, shaftServices: 0, estimatedCostCents: 0, notes: [] },
    reviewLabel: 'test',
    ...overrides,
  };
}

function makeBaseBoq(): BOQ {
  return {
    id: 'boq-base-1',
    projectId: 'proj-1',
    currency: 'USD',
    items: [
      { id: 'base-1', quantityRef: 'prelim', category: 'Preliminaries', description: 'Site establishment', unit: 'lump', quantity: 1, rate: 2500, total: 2500 },
      { id: 'base-2', quantityRef: 'substrate', category: 'Substructure', description: 'Excavation', unit: 'm³', quantity: 15, rate: 18, total: 270 },
    ],
    summary: { subtotal: 2770, contingency: 138.5, professionalFees: 193.9, vat: 465.36, grandTotal: 3567.76 },
  };
}

describe('structuralBoqToLineItems', () => {
  it('should convert structural BOQ to BOQLineItem[] with split concrete', () => {
    const structural = makeMockStructural();
    const items = structuralBoqToLineItems(structural, 'zimbabwe');

    expect(items.length).toBe(6);
    expect(items[0].category).toBe('Substructure');
    expect(items[0].quantityRef).toBe('structural-concrete-footings');
    expect(items[0].unit).toBe('m³');
    expect(items[1].category).toBe('Superstructure');
    expect(items[1].quantityRef).toBe('structural-concrete-columns');
    expect(items[2].category).toBe('Superstructure');
    expect(items[2].quantityRef).toBe('structural-concrete-beams');
    const rebar = items.find(i => i.quantityRef === 'structural-rebar');
    expect(rebar).toBeDefined();
    expect(rebar!.unit).toBe('tonne');
    expect(rebar!.quantity).toBeCloseTo(1.25, 2);
    const formwork = items.find(i => i.quantityRef === 'structural-formwork');
    expect(formwork).toBeDefined();
    expect(formwork!.unit).toBe('m²');
    expect(formwork!.quantity).toBe(48.3);
  });

  it('should return empty array for zero quantities with empty arrays', () => {
    const structural = makeMockStructural({
      boq: { concreteM3: 0, reinforcementKg: 0, formworkM2: 0, notes: [] },
    });
    const items = structuralBoqToLineItems(structural, 'zimbabwe');
    expect(items.length).toBe(0);
  });

  it('should produce only non-concrete items when concrete is zero but arrays exist', () => {
    const structural = makeMockStructural({
      beams: [], columns: [], footings: [],
      boq: { concreteM3: 0, reinforcementKg: 500, formworkM2: 0, notes: [] },
    });
    const items = structuralBoqToLineItems(structural, 'zimbabwe');
    expect(items.length).toBe(1);
    expect(items[0].quantityRef).toBe('structural-rebar');
  });

  it('should resolve rates from rate card', () => {
    const structural = makeMockStructural({
      boq: { concreteM3: 1, reinforcementKg: 1000, formworkM2: 10, notes: [] },
    });
    const items = structuralBoqToLineItems(structural, 'zimbabwe');
    const rebar = items.find(i => i.quantityRef === 'structural-rebar');
    expect(rebar).toBeDefined();
    expect(rebar!.rate).toBe(1200);
    expect(rebar!.total).toBe(1200);
    const formwork = items.find(i => i.quantityRef === 'structural-formwork');
    expect(formwork).toBeDefined();
    expect(formwork!.rate).toBe(32);
    expect(formwork!.total).toBe(320);
    const footings = items.find(i => i.quantityRef === 'structural-concrete-footings');
    expect(footings).toBeDefined();
    expect(footings!.rate).toBeGreaterThan(0);
  });

  it('should use fallback rates for unknown region', () => {
    const structural = makeMockStructural({
      boq: { concreteM3: 1, reinforcementKg: 0, formworkM2: 0, notes: [] },
    });
    const items = structuralBoqToLineItems(structural, 'unknown-region');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.rate).toBeGreaterThan(0);
    }
  });
});

describe('mepBoqToLineItems', () => {
  it('should convert plumbing fixture counts to BOQLineItem[]', () => {
    const mep = makeMockMep({
      boq: {
        fixtureCounts: { wc: 3, basin: 3, shower: 2, sink: 1 },
        pointCounts: {},
        hvacUnits: 0,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });
    const items = mepBoqToLineItems(mep, 'zimbabwe');
    expect(items.length).toBeGreaterThan(0);

    const wcItems = items.filter(i => i.description.includes('WC pan'));
    expect(wcItems.length).toBeGreaterThan(0);
    expect(wcItems[0].quantity).toBe(3);
  });

  it('should convert electrical point counts to BOQLineItem[]', () => {
    const mep = makeMockMep({
      boq: {
        fixtureCounts: {},
        pointCounts: { light: 10, socket: 8, switch: 10, data: 3 },
        hvacUnits: 0,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });
    const items = mepBoqToLineItems(mep, 'zimbabwe');

    const lightItems = items.filter(i => i.description.includes('Light point'));
    expect(lightItems.length).toBeGreaterThan(0);
    expect(lightItems[0].quantity).toBe(10);

    const socketItems = items.filter(i => i.description.includes('Socket outlet'));
    expect(socketItems.length).toBeGreaterThan(0);
    expect(socketItems[0].quantity).toBe(8);
  });

  it('should convert HVAC units to BOQLineItem[]', () => {
    const mep = makeMockMep({
      hvac: {
        units: [
          { id: 'hvac-1', type: 'split-unit', roomId: 'r1', x: 5, y: 5, capacityKw: 3.5, servedAreaM2: 20, supplyAir: true, returnAir: true },
          { id: 'hvac-2', type: 'split-unit', roomId: 'r2', x: 6, y: 6, capacityKw: 2.5, servedAreaM2: 15, supplyAir: true, returnAir: true },
          { id: 'hvac-3', type: 'extract-fan', roomId: 'r3', x: 3, y: 3, capacityKw: 0.1, servedAreaM2: 5, supplyAir: false, returnAir: false },
        ],
        shafts: [],
        scheduleHtml: '',
      },
      boq: {
        fixtureCounts: {},
        pointCounts: {},
        hvacUnits: 3,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });
    const items = mepBoqToLineItems(mep, 'zimbabwe');

    const splitItems = items.filter(i => i.quantityRef === 'mep-hvac-split');
    expect(splitItems.length).toBe(1);
    expect(splitItems[0].quantity).toBe(2);

    const extractItems = items.filter(i => i.quantityRef === 'mep-hvac-extract');
    expect(extractItems.length).toBe(1);
    expect(extractItems[0].quantity).toBe(1);
  });

  it('should include pipe/conduit allowances', () => {
    const mep = makeMockMep({
      boq: {
        fixtureCounts: { wc: 1 },
        pointCounts: { light: 1 },
        hvacUnits: 0,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });
    const items = mepBoqToLineItems(mep, 'zimbabwe');

    const pipeItems = items.filter(i => i.quantityRef.startsWith('mep-plumbing-pipe'));
    expect(pipeItems.length).toBe(1);
    expect(pipeItems[0].quantity).toBe(3);

    const conduitItems = items.filter(i => i.quantityRef.startsWith('mep-electrical-conduit'));
    expect(conduitItems.length).toBe(1);
    expect(conduitItems[0].quantity).toBe(8);
  });
});

describe('buildStructuralMepBoq', () => {
  it('should produce a complete BOQ with structural + MEP items', () => {
    const structural = makeMockStructural();
    const mep = makeMockMep({
      boq: {
        fixtureCounts: { wc: 2, basin: 2, shower: 1 },
        pointCounts: { light: 6, socket: 4, switch: 6 },
        hvacUnits: 2,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });

    const boq = buildStructuralMepBoq(structural, mep, 'zimbabwe', 'proj-1');
    expect(boq.projectId).toBe('proj-1');
    expect(boq.currency).toBe('USD');
    expect(boq.items.length).toBeGreaterThan(0);
    expect(boq.summary.subtotal).toBeGreaterThan(0);
    expect(boq.summary.grandTotal).toBeGreaterThan(boq.summary.subtotal);
  });

  it('should use region-specific rates', () => {
    const structural = makeMockStructural({
      beams: [], columns: [], footings: [],
      boq: { concreteM3: 0, reinforcementKg: 1000, formworkM2: 0, notes: [] },
    });
    const mep = makeMockMep();

    const zimBoq = buildStructuralMepBoq(structural, mep, 'zimbabwe', 'p1');
    const saBoq = buildStructuralMepBoq(structural, mep, 'southafrica', 'p1');
    expect(saBoq.currency).toBe('ZAR');
    expect(zimBoq.items[0].total).not.toEqual(saBoq.items[0].total);
  });
});

describe('mergeWithCentralBoq', () => {
  it('should merge additional items and recalculate summary', () => {
    const base = makeBaseBoq();
    const extra: BOQLineItem[] = [
      { id: 'extra-1', quantityRef: 'structural-concrete', category: 'Substructure', description: 'Extra concrete', unit: 'm³', quantity: 5, rate: 380, total: 1900 },
    ];

    const merged = mergeWithCentralBoq(base, extra, 'zimbabwe');
    expect(merged.items.length).toBe(3);
    expect(merged.summary.subtotal).toBe(4670);
    expect(merged.summary.grandTotal).toBeCloseTo(merged.summary.subtotal + merged.summary.contingency + merged.summary.professionalFees + merged.summary.vat, 2);
  });

  it('should preserve base BOQ properties', () => {
    const base = makeBaseBoq();
    const merged = mergeWithCentralBoq(base, [], 'zimbabwe');
    expect(merged.id).toBe('boq-base-1');
    expect(merged.projectId).toBe('proj-1');
    expect(merged.currency).toBe('USD');
  });
});

describe('computeAdditionalSummary', () => {
  it('should compute full BOQ summary with fees and taxes', () => {
    const items: BOQLineItem[] = [
      { id: 'a', quantityRef: 'x', category: 'Test', description: 'Item A', unit: 'each', quantity: 10, rate: 100, total: 1000 },
      { id: 'b', quantityRef: 'y', category: 'Test', description: 'Item B', unit: 'each', quantity: 5, rate: 200, total: 1000 },
    ];

    const summary = computeAdditionalSummary(items, 'zimbabwe');
    expect(summary.subtotal).toBe(2000);
    expect(summary.contingency).toBe(100);
    expect(summary.professionalFees).toBe(140);
    expect(summary.vat).toBe(336);
    expect(summary.grandTotal).toBe(2576);
  });
});

describe('end-to-end integration', () => {
  it('should produce realistic costs for a typical residential project', () => {
    const structural = makeMockStructural({
      beams: [{ id: 'bm-1', startX: 0, startY: 0, endX: 5, endY: 0, widthMm: 200, depthMm: 350, spanM: 5, material: 'concrete', assumptionTag: 'test' }],
      columns: [{ id: 'col-1', x: 0, y: 0, type: 'square', widthMm: 250, depthMm: 250, heightM: 3, loadEstimateKn: 80, reinforcement: '4Y12', material: 'concrete', assumptionTag: 'test' }],
      footings: [{ id: 'ftg-1', x: 0, y: 0, type: 'isolated-pad', widthM: 1, depthM: 1, thicknessMm: 250, bearingKpa: 150, loadKn: 80, assumptionTag: 'test' }],
      boq: { concreteM3: 8.4, reinforcementKg: 840, formworkM2: 32.5, notes: [] },
    });
    const mep = makeMockMep({
      hvac: {
        units: [
          { id: 'hvac-1', type: 'split-unit', roomId: 'r1', x: 5, y: 5, capacityKw: 3.5, servedAreaM2: 20, supplyAir: true, returnAir: true },
        ],
        shafts: [],
        scheduleHtml: '',
      },
      boq: {
        fixtureCounts: { wc: 2, basin: 2, shower: 2, sink: 1 },
        pointCounts: { light: 12, socket: 10, switch: 12, data: 2, extractor: 3 },
        hvacUnits: 1,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });

    const boq = buildStructuralMepBoq(structural, mep, 'zimbabwe', 'house-1');
    expect(boq.items.length).toBeGreaterThan(15);
    expect(boq.summary.subtotal).toBeGreaterThan(5000);
    expect(boq.summary.subtotal).toBeLessThan(100000);
    expect(boq.summary.grandTotal).toBeGreaterThan(boq.summary.subtotal);
    expect(boq.estimateDepth).toBe('detailed');
  });

  it('should produce realistic costs for a commercial project (SA rates)', () => {
    const structural = makeMockStructural({
      beams: [
        { id: 'bm-1', startX: 0, startY: 0, endX: 8, endY: 0, widthMm: 300, depthMm: 500, spanM: 8, material: 'concrete', assumptionTag: 'test' },
        { id: 'bm-2', startX: 0, startY: 6, endX: 8, endY: 6, widthMm: 300, depthMm: 500, spanM: 8, material: 'concrete', assumptionTag: 'test' },
      ],
      columns: [
        { id: 'col-1', x: 0, y: 0, type: 'square', widthMm: 400, depthMm: 400, heightM: 3, loadEstimateKn: 250, reinforcement: '4Y20', material: 'concrete', assumptionTag: 'test' },
        { id: 'col-2', x: 8, y: 0, type: 'square', widthMm: 400, depthMm: 400, heightM: 3, loadEstimateKn: 250, reinforcement: '4Y20', material: 'concrete', assumptionTag: 'test' },
        { id: 'col-3', x: 0, y: 6, type: 'square', widthMm: 400, depthMm: 400, heightM: 3, loadEstimateKn: 250, reinforcement: '4Y20', material: 'concrete', assumptionTag: 'test' },
        { id: 'col-4', x: 8, y: 6, type: 'square', widthMm: 400, depthMm: 400, heightM: 3, loadEstimateKn: 250, reinforcement: '4Y20', material: 'concrete', assumptionTag: 'test' },
      ],
      footings: [
        { id: 'ftg-1', x: 0, y: 0, type: 'isolated-pad', widthM: 1.5, depthM: 1.5, thicknessMm: 350, bearingKpa: 150, loadKn: 250, assumptionTag: 'test' },
        { id: 'ftg-2', x: 8, y: 0, type: 'isolated-pad', widthM: 1.5, depthM: 1.5, thicknessMm: 350, bearingKpa: 150, loadKn: 250, assumptionTag: 'test' },
        { id: 'ftg-3', x: 0, y: 6, type: 'isolated-pad', widthM: 1.5, depthM: 1.5, thicknessMm: 350, bearingKpa: 150, loadKn: 250, assumptionTag: 'test' },
        { id: 'ftg-4', x: 8, y: 6, type: 'isolated-pad', widthM: 1.5, depthM: 1.5, thicknessMm: 350, bearingKpa: 150, loadKn: 250, assumptionTag: 'test' },
      ],
      boq: { concreteM3: 45, reinforcementKg: 5400, formworkM2: 180, notes: [] },
    });
    const mep = makeMockMep({
      hvac: {
        units: [
          { id: 'hvac-1', type: 'split-unit', roomId: 'r1', x: 5, y: 5, capacityKw: 7, servedAreaM2: 40, supplyAir: true, returnAir: true },
          { id: 'hvac-2', type: 'split-unit', roomId: 'r2', x: 6, y: 6, capacityKw: 5, servedAreaM2: 30, supplyAir: true, returnAir: true },
          { id: 'hvac-3', type: 'split-unit', roomId: 'r3', x: 7, y: 7, capacityKw: 7, servedAreaM2: 40, supplyAir: true, returnAir: true },
        ],
        shafts: [],
        scheduleHtml: '',
      },
      boq: {
        fixtureCounts: { wc: 6, basin: 6, shower: 0, sink: 2, urinal: 2 },
        pointCounts: { light: 40, socket: 30, switch: 20, data: 8, extractor: 6 },
        hvacUnits: 3,
        shaftServices: 0,
        estimatedCostCents: 0,
        notes: [],
      },
    });

    const boq = buildStructuralMepBoq(structural, mep, 'southafrica', 'office-1');
    expect(boq.currency).toBe('ZAR');
    expect(boq.summary.subtotal).toBeGreaterThan(300000);
    expect(boq.summary.grandTotal).toBeGreaterThan(boq.summary.subtotal);
  });
});
