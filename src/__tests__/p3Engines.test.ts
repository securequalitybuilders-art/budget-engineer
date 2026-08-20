/**
 * P3 Digital Twin engine tests.
 */
import { describe, it, expect } from 'vitest';
import {
  createTwinSnapshot,
  createVerificationReport,
  twinSummary,
  milestoneProgressFor,
  buildInspectionChecklist,
  toggleChecklistItem,
  signOffChecklist,
  checklistCompletionPct,
  evaluateEscrowTrigger,
  photoTimeline,
} from '@/engine/sitehawk/digitalTwin';
import {
  extractFeatures,
  fnvHash,
  matchPhotoToPlan,
  INSPECTION_TEMPLATES,
  checklistTemplateFor,
} from '@/engine/sitehawk/computerVision';
import {
  wbsBva,
  totalBudgetVariance,
  grossMargin,
  buildProgressStatus,
  buildMilestoneHolds,
} from '@/engine/sitehawk/progressTracker';

const NOW = new Date('2026-08-15T10:00:00Z');

// ── digitalTwin.ts ─────────────────────────────────────────────────────────

describe('createTwinSnapshot', () => {
  it('creates a valid snapshot with clamped coords', () => {
    const s = createTwinSnapshot({ projectId: 'p1', geoLat: -17.8292, geoLng: 31.0522, note: 'Foundations', progressPct: 25, now: NOW });
    expect(s).not.toBeNull();
    expect(s!.projectId).toBe('p1');
    expect(s!.geoLat).toBe(-17.8292);
    expect(s!.progressPct).toBe(25);
    expect(s!.status).toBe('pending');
    expect(s!.milestoneId).toBeNull();
  });

  it('rejects non-finite coords', () => {
    expect(createTwinSnapshot({ projectId: 'p1', geoLat: NaN, geoLng: 31, note: 'x', progressPct: 0 })).toBeNull();
    expect(createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: Infinity, note: 'x', progressPct: 0 })).toBeNull();
  });

  it('clamps progress to 0-100', () => {
    const s1 = createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: 0, note: 'x', progressPct: -5, now: NOW });
    expect(s1!.progressPct).toBe(0);
    const s2 = createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: 0, note: 'x', progressPct: 150, now: NOW });
    expect(s2!.progressPct).toBe(100);
  });

  it('stores milestoneId when provided', () => {
    const s = createTwinSnapshot({ projectId: 'p1', milestoneId: 'm1', geoLat: 0, geoLng: 0, note: 'x', progressPct: 10, now: NOW });
    expect(s!.milestoneId).toBe('m1');
  });

  it('accepts photo fields', () => {
    const s = createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: 0, note: 'Photo', progressPct: 50, now: NOW });
    expect(s).not.toBeNull();
  });
});

describe('createVerificationReport', () => {
  it('creates a valid report with clamped confidence', () => {
    const r = createVerificationReport({ projectId: 'p1', method: 'ai-vision', verdict: 'pass', confidence: 92, details: 'Looks good', now: NOW });
    expect(r.method).toBe('ai-vision');
    expect(r.verdict).toBe('pass');
    expect(r.confidence).toBe(92);
  });

  it('clamps confidence to 0-100', () => {
    const r = createVerificationReport({ projectId: 'p1', method: 'drone', verdict: 'fail', confidence: 150, details: 'x', now: NOW });
    expect(r.confidence).toBe(100);
  });
});

describe('twinSummary', () => {
  it('returns empty state', () => {
    expect(twinSummary({ snapshots: [], reports: [] })).toEqual({ snapshots: 0, verified: 0, avgConfidence: 0, latestProgressPct: 0 });
  });

  it('computes verified count and avg confidence', () => {
    const reports = [
      createVerificationReport({ projectId: 'p1', method: 'ai-vision', verdict: 'pass', confidence: 90, details: '', now: NOW }),
      createVerificationReport({ projectId: 'p1', method: 'manual', verdict: 'fail', confidence: 80, details: '', now: NOW }),
      createVerificationReport({ projectId: 'p1', method: 'drone', verdict: 'pass', confidence: 85, details: '', now: NOW }),
    ];
    const snaps = [
      createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: 0, note: 'a', progressPct: 20, now: NOW })!,
      createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: 0, note: 'b', progressPct: 60, now: NOW })!,
    ];
    const s = twinSummary({ snapshots: snaps, reports });
    expect(s.snapshots).toBe(2);
    expect(s.verified).toBe(2); // two pass
    expect(s.avgConfidence).toBe(85); // (90+80+85)/3=85
    expect(s.latestProgressPct).toBe(60);
  });
});

describe('milestoneProgressFor', () => {
  it('returns verified true when any report passes', () => {
    const state = {
      snapshots: [createTwinSnapshot({ projectId: 'p1', milestoneId: 'm1', geoLat: 0, geoLng: 0, note: 'x', progressPct: 55, now: NOW })!],
      reports: [createVerificationReport({ projectId: 'p1', method: 'manual', verdict: 'pass', confidence: 90, details: '', now: NOW })],
    };
    const result = milestoneProgressFor([{ name: 'M1', pct: 35 }, { name: 'M2', pct: 40 }], state);
    expect(result[0].verified).toBe(true);
    expect(result[1].verified).toBe(true);
    expect(result[0].progressPct).toBe(55);
  });

  it('returns progress 0 with no snapshots', () => {
    const result = milestoneProgressFor([{ name: 'M1', pct: 35 }], { snapshots: [], reports: [] });
    expect(result[0].progressPct).toBe(0);
    expect(result[0].verified).toBe(false);
  });
});

describe('inspection checklists', () => {
  it('builds a checklist with all items unchecked', () => {
    const cl = buildInspectionChecklist({ projectId: 'p1', category: 'structural', milestoneName: 'Foundations', items: ['Item A', 'Item B'], now: NOW });
    expect(cl.items).toHaveLength(2);
    expect(cl.items[0].checked).toBe(false);
    expect(cl.signedOff).toBe(false);
    expect(cl.category).toBe('structural');
  });

  it('toggles an item', () => {
    const cl = buildInspectionChecklist({ projectId: 'p1', category: 'mep', milestoneName: 'Rough-in', items: ['Pipe', 'Conduit'], now: NOW });
    const toggled = toggleChecklistItem(cl, cl.items[0].id);
    expect(toggled.items[0].checked).toBe(true);
    expect(toggled.items[1].checked).toBe(false);
  });

  it('signs off when all items checked', () => {
    const cl = buildInspectionChecklist({ projectId: 'p1', category: 'roof', milestoneName: 'Roof', items: ['A'], now: NOW });
    const checked = toggleChecklistItem(cl, cl.items[0].id);
    const signed = signOffChecklist(checked, 'QS Mandla', NOW);
    expect(signed).not.toBeNull();
    expect(signed!.signedOff).toBe(true);
    expect(signed!.signedOffBy).toBe('QS Mandla');
  });

  it('rejects sign-off when items unchecked', () => {
    const cl = buildInspectionChecklist({ projectId: 'p1', category: 'final', milestoneName: 'Handover', items: ['A', 'B'], now: NOW });
    expect(signOffChecklist(cl, 'QS')).toBeNull();
  });

  it('computes completion percentage', () => {
    const cl = buildInspectionChecklist({ projectId: 'p1', category: 'structural', milestoneName: 'M', items: ['A', 'B', 'C', 'D'], now: NOW });
    expect(checklistCompletionPct(cl)).toBe(0);
    const t1 = toggleChecklistItem(cl, cl.items[0].id);
    const t2 = toggleChecklistItem(t1, cl.items[1].id);
    expect(checklistCompletionPct(t2)).toBe(50);
  });
});

describe('escrow trigger evaluation', () => {
  it('returns release-ready when all conditions met', () => {
    expect(evaluateEscrowTrigger({ milestoneName: 'M1', verificationPassed: true, checklistSignedOff: true, photosCount: 3, photosVerified: 3 })).toBe('release-ready');
  });

  it('returns awaiting-verification when not verified', () => {
    expect(evaluateEscrowTrigger({ milestoneName: 'M1', verificationPassed: false, checklistSignedOff: true, photosCount: 3, photosVerified: 3 })).toBe('awaiting-verification');
  });

  it('returns awaiting-checklist when not signed off', () => {
    expect(evaluateEscrowTrigger({ milestoneName: 'M1', verificationPassed: true, checklistSignedOff: false, photosCount: 3, photosVerified: 3 })).toBe('awaiting-checklist');
  });

  it('returns insufficient-photos when no photos', () => {
    expect(evaluateEscrowTrigger({ milestoneName: 'M1', verificationPassed: true, checklistSignedOff: true, photosCount: 0, photosVerified: 0 })).toBe('insufficient-photos');
  });

  it('returns blocked when photos not all verified', () => {
    expect(evaluateEscrowTrigger({ milestoneName: 'M1', verificationPassed: true, checklistSignedOff: true, photosCount: 3, photosVerified: 1 })).toBe('blocked');
  });
});

describe('photoTimeline', () => {
  it('extracts display entries with hasPhoto flag', () => {
    const entries = [
      createTwinSnapshot({ projectId: 'p1', geoLat: -17.8, geoLng: 31.0, note: 'Foundations', progressPct: 20, now: NOW })!,
    ];
    entries[0].photoDataUrl = 'data:image/jpeg;base64,abc';
    const tl = photoTimeline(entries);
    expect(tl[0].hasPhoto).toBe(true);
    expect(tl[0].geoLabel).toContain('-17.8');
  });

  it('marks entries without photo', () => {
    const entries = [createTwinSnapshot({ projectId: 'p1', geoLat: 0, geoLng: 0, note: 'No photo', progressPct: 10, now: NOW })!];
    expect(photoTimeline(entries)[0].hasPhoto).toBe(false);
  });
});

// ── computerVision.ts ──────────────────────────────────────────────────────

describe('extractFeatures', () => {
  it('extracts structural keywords', () => {
    const f = extractFeatures('Foundation trench dug with rebar and blinding laid');
    expect(f).toContain('foundation:trench');
    expect(f).toContain('foundation:rebar');
    expect(f).toContain('foundation:blinding');
  });

  it('extracts mep keywords', () => {
    const f = extractFeatures('Conduit and DB board installed, geyser connected');
    expect(f).toContain('mep:conduit');
    expect(f).toContain('mep:db board');
    expect(f).toContain('mep:geyser');
  });

  it('returns empty for no matches', () => {
    expect(extractFeatures('Sunny day on site')).toHaveLength(0);
  });
});

describe('fnvHash', () => {
  it('is deterministic', () => {
    expect(fnvHash('test')).toBe(fnvHash('test'));
    expect(fnvHash('test')).not.toBe(fnvHash('other'));
  });

  it('returns a 32-bit unsigned int', () => {
    const h = fnvHash('hello world');
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('matchPhotoToPlan', () => {
  it('matches when features overlap', () => {
    const r = matchPhotoToPlan({
      photoNote: 'Foundation trench with rebar placed',
      workingDrawingRef: 'WD-001',
      workingDrawingDescription: 'Foundation details showing trench, rebar, and blinding',
    });
    expect(r.matched).toBe(true);
    expect(r.confidence).toBeGreaterThan(50);
    expect(r.matchedFeatures.length).toBeGreaterThan(0);
  });

  it('returns low confidence when no overlap', () => {
    const r = matchPhotoToPlan({
      photoNote: 'Bricklayer laying masonry',
      workingDrawingRef: 'WD-002',
      workingDrawingDescription: 'Roof truss and purlin layout',
    });
    expect(r.matched).toBe(false);
    expect(r.confidence).toBe(0);
  });

  it('respects custom threshold', () => {
    const r = matchPhotoToPlan({
      photoNote: 'door frame sill handle glazing',
      workingDrawingRef: 'WD-003',
      workingDrawingDescription: 'door frame sill handle glazing',
      thresholdPct: 90,
    });
    expect(r.confidence).toBe(100);
    expect(r.matched).toBe(true);
  });
});

describe('INSPECTION_TEMPLATES', () => {
  it('has all four categories', () => {
    expect(INSPECTION_TEMPLATES.structural).toBeDefined();
    expect(INSPECTION_TEMPLATES.mep).toBeDefined();
    expect(INSPECTION_TEMPLATES.roof).toBeDefined();
    expect(INSPECTION_TEMPLATES.final).toBeDefined();
  });

  it('each has 8 items', () => {
    expect(INSPECTION_TEMPLATES.structural).toHaveLength(8);
    expect(INSPECTION_TEMPLATES.mep).toHaveLength(8);
    expect(INSPECTION_TEMPLATES.roof).toHaveLength(8);
    expect(INSPECTION_TEMPLATES.final).toHaveLength(8);
  });
});

describe('checklistTemplateFor', () => {
  it('returns structural for unknown', () => {
    expect(checklistTemplateFor('unknown')).toBe(INSPECTION_TEMPLATES.structural);
  });

  it('returns correct template', () => {
    expect(checklistTemplateFor('roof')).toBe(INSPECTION_TEMPLATES.roof);
  });
});

// ── progressTracker.ts ─────────────────────────────────────────────────────

describe('wbsBva', () => {
  it('computes variance per line', () => {
    const lines = [{ wbsCode: '01.01', name: 'Excavation', budgetCents: 500000, spentCents: 350000 }];
    const result = wbsBva(lines);
    expect(result[0].varianceCents).toBe(150000);
    expect(result[0].variancePct).toBe(30);
  });

  it('handles zero budget', () => {
    const result = wbsBva([{ wbsCode: '01.02', name: 'Test', budgetCents: 0, spentCents: 100 }]);
    expect(result[0].variancePct).toBe(0);
  });
});

describe('totalBudgetVariance', () => {
  it('sums across lines', () => {
    const lines = [
      { wbsCode: '01', name: 'A', budgetCents: 100000, spentCents: 80000 },
      { wbsCode: '02', name: 'B', budgetCents: 200000, spentCents: 150000 },
    ];
    const r = totalBudgetVariance(lines);
    expect(r.budgetCents).toBe(300000);
    expect(r.spentCents).toBe(230000);
    expect(r.varianceCents).toBe(70000);
    expect(r.completionPct).toBe(76.7);
  });
});

describe('grossMargin', () => {
  it('computes margin percentage', () => {
    expect(grossMargin(1000000, 700000)).toBe(30);
  });

  it('returns 0 for zero contract', () => {
    expect(grossMargin(0, 50000)).toBe(0);
  });
});

describe('buildProgressStatus', () => {
  it('builds a full status snapshot', () => {
    const ps = buildProgressStatus({
      wbsLines: [{ wbsCode: '01', name: 'A', budgetCents: 500000, spentCents: 250000 }],
      contractValueCents: 1000000,
      billedToDateCents: 400000,
      incurredCents: 700000,
      revenueEarnedCents: 350000,
      overUnderBilledCents: -50000,
      wipaaStatus: 'under-billed',
      milestoneName: 'Substructure',
      milestoneStatus: 'verified',
    });
    expect(ps.completionPct).toBe(50);
    expect(ps.budgetCents).toBe(500000);
    expect(ps.varianceCents).toBe(250000);
    expect(ps.grossMarginPct).toBe(30);
    expect(ps.wipaaStatus).toBe('under-billed');
    expect(ps.milestoneStatus).toBe('verified');
  });
});

describe('buildMilestoneHolds', () => {
  it('maps statuses correctly', () => {
    const holds = buildMilestoneHolds(
      [
        { name: 'Substructure', amountCents: 500000, verified: true, released: false },
        { name: 'Superstructure', amountCents: 600000, verified: false, released: false },
        { name: 'Finishes', amountCents: 400000, verified: true, released: true },
      ],
      '2026-08-10',
      { material: 'Cement', etaDate: '2026-08-20' },
    );
    expect(holds[0].status).toBe('ready-for-approval');
    expect(holds[0].latestPhotoDate).toBe('2026-08-10');
    expect(holds[0].nextDelivery).toBe('Cement');
    expect(holds[1].status).toBe('held');
    expect(holds[1].latestPhotoDate).toBeNull();
    expect(holds[2].status).toBe('released');
  });
});
