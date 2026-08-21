import { describe, it, expect } from 'vitest';
import { buildCriticalPath, findCriticalPath, toGanttRows, cashflowCurve, buildWbsDictionary, buildRiskRegister, buildScheduleOfValues, monthlyCashflowProjection } from '@/engine/sitehawk/criticalPath';
import { buildResourceSchedule, TRADE_LABOUR_RATES, tradeFromWbs, createLogisticsRecord, advanceLogistics, logisticsSummary, aggregateJobCosts } from '@/engine/sitehawk/resourceScheduling';
import { createTwinSnapshot, createVerificationReport, twinSummary, milestoneProgressFor } from '@/engine/sitehawk/digitalTwin';
import {
  createEscrowMilestone, transitionEscrowMilestone, createReleaseRecord, escrowSummary, ESCROW_STATE_FLOW,
  createCheckpoint, createAlert, buildWorkStartedAlert, buildWeeklyDigestAlert,
  buildMilestoneCompleteAlert, buildFundsReleasedAlert, buildSupplierPaidAlert, buildConcernAlert,
  createSupplierPayment, transitionSupplierPayment, flagConcern, resolveConcern, scopeRework,
  createBuildGuideMessage, conciergeResponse, HITL_GATES,
} from '@/engine/sitehawk/escrowTrigger';
import { analyzeVariation, variationTotals, processChangeOrder, computeReversalBreakdown, VARIATION_LENSES, REVERSAL_PENALTY_RATE, MAX_PENALTY_PCT, SUPPLIER_RESTOCKING_PCT, LABOR_REALLOCATION_PCT, CONTRACTOR_OVERHEAD_PCT } from '@/engine/sitehawk/variationVault';
import { alertLevelFor, buildWipaaEntry, buildPnl, analyzeGainFade, buildHandoverPack, wipaaSummary, WIPAA_ALERT_THRESHOLDS, solvencyRatioFor, solvencyTrend, contingencySpendDown, contingencyAlertLevel, monthlyCashflow, buildHandoverChecklist, signOffHandover } from '@/engine/sitehawk/wipaaMonitor';
import type { ScheduleRecord } from '@/domain/sitehawk';

const now = new Date('2026-06-15T09:00:00Z');
const ISO = '2026-06-15T09:00:00.000Z';

const CANONICAL_TASKS = [
  { id: 'f', name: 'Foundation & Bones', wbsCode: '02.01', durationDays: 5, predecessors: [], costCents: 1400000 },
  { id: 's', name: 'Wall Plate & Shell', wbsCode: '03.01', durationDays: 10, predecessors: ['f'], costCents: 1650000 },
  { id: 'r', name: 'Finishes & Keys', wbsCode: '04.01', durationDays: 4, predecessors: ['s'], costCents: 1070000 },
  { id: 'p', name: 'Plaster patching', wbsCode: '05.01', durationDays: 3, predecessors: [], costCents: 100000 },
];

describe('P1 Critical Path', () => {
  it('computes the CPM forward pass (19-day critical chain)', () => {
    const result = buildCriticalPath(CANONICAL_TASKS);
    expect(result.totalDurationDays).toBe(19);
    expect(result.criticalPath).toEqual(['f', 's', 'r']);
    const byId = new Map(result.schedule.map((s) => [s.id, s]));
    expect(byId.get('f')!.critical).toBe(true);
    expect(byId.get('p')!.critical).toBe(false);
  });

  it('returns an empty path for empty tasks', () => {
    expect(buildCriticalPath([]).criticalPath).toEqual([]);
    expect(buildCriticalPath([]).totalDurationDays).toBe(0);
    expect(findCriticalPath([], new Map(), 0)).toEqual([]);
  });

  it('produces gantt rows with start/end days and progress', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const rows = toGanttRows(schedule, { f: 40 });
    const f = rows.find((r) => r.id === 'f')!;
    expect(f.startDays).toBe(0);
    expect(f.endDays).toBe(5);
    expect(f.progressPct).toBe(40);
    expect(rows.find((r) => r.id === 's')!.startDays).toBe(5);
    expect(rows.find((r) => r.id === 'r')!.startDays).toBe(15);
  });

  it('draws the cashflow S-curve ending at the locked baseline', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const curve = cashflowCurve({ totalCents: 4120000 } as never, schedule);
    expect(curve.length).toBeGreaterThan(10);
    expect(curve[0].cumulativeCents).toBe(0);
    expect(curve[curve.length - 1].cumulativeCents).toBe(4120000);
  });

  it('returns an empty curve without a baseline or schedule', () => {
    expect(cashflowCurve(null, [])).toEqual([]);
  });

  it('builds a WBS dictionary with parent-child hierarchy from schedule tasks', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const dict = buildWbsDictionary('proj-1', schedule);
    expect(dict.length).toBeGreaterThanOrEqual(4);
    const wbs02 = dict.find((d) => d.code === '02.01')!;
    expect(wbs02.level).toBe(1);
    expect(wbs02.category).toBe('section');
    expect(wbs02.projectId).toBe('proj-1');
    expect(wbs02.parent).toMatch(/^wbs-02$/);
    const div = dict.find((d) => d.code === '02');
    expect(div).toBeUndefined();
  });

  it('deduplicates WBS codes from schedule', () => {
    const schedule: ScheduleRecord[] = [
      { id: 'a', projectId: 'p1', task: 'Pour slab', wbsCode: '02.01', startDate: '2026-01-01', durationDays: 3, predecessors: [], critical: true, costCents: 100000 },
      { id: 'b', projectId: 'p1', task: 'Pour strip', wbsCode: '02.01', startDate: '2026-01-04', durationDays: 2, predecessors: ['a'], critical: true, costCents: 80000 },
    ];
    const dict = buildWbsDictionary('p1', schedule);
    expect(dict).toHaveLength(1);
    expect(dict[0].code).toBe('02.01');
  });

  it('builds a risk register with 8 standard templates', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const risks = buildRiskRegister('proj-1', schedule, { totalCents: 4120000 } as never);
    expect(risks.length).toBe(8);
    const scheduleRisk = risks.find((r) => r.category === 'Schedule')!;
    expect(scheduleRisk.score).toBeGreaterThanOrEqual(4);
    expect(scheduleRisk.contingencyCents).toBeGreaterThan(0);
    expect(scheduleRisk.id).toContain('proj-1');
    expect(risks.every((r) => r.owner.length > 0)).toBe(true);
  });

  it('escalates cost risk to critical when volatility exceeds 0.3 CV', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const risksLow = buildRiskRegister('proj-1', schedule, { totalCents: 4120000 } as never, 0.2);
    const risksHigh = buildRiskRegister('proj-1', schedule, { totalCents: 4120000 } as never, 0.4);
    const costLow = risksLow.find((r) => r.category === 'Cost')!;
    const costHigh = risksHigh.find((r) => r.category === 'Cost')!;
    expect(costHigh.score).toBeGreaterThan(costLow.score);
    expect(costHigh.probability).toBe('critical');
  });

  it('builds a schedule of values with WBS grouping and earned value', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const lines = buildScheduleOfValues('proj-1', schedule, { totalCents: 4220000 } as never);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const total = lines.reduce((s, l) => s + l.amountCents, 0);
    expect(total).toBe(4220000);
    expect(lines[0].unit).toBe('lot');
    expect(lines[0].earnedCents).toBe(0);
    expect(lines[0].retainedCents).toBe(0);
  });

  it('projects a 12-month cashflow inflow vs outflow', () => {
    const schedule = buildCriticalPath(CANONICAL_TASKS).schedule;
    const baseline = { totalCents: 4120000 } as never;
    const result = monthlyCashflowProjection(baseline, schedule, '2026-07-01', 12);
    expect(result.months).toHaveLength(12);
    expect(result.totalInflowCents).toBeGreaterThan(0);
    expect(result.totalOutflowCents).toBeGreaterThan(0);
    expect(result.nextCashflowDate).toBeTruthy();
    expect(result.nextCashflowCents).toBeGreaterThan(0);
  });

  it('returns an empty projection without a baseline', () => {
    const result = monthlyCashflowProjection(null, [], '2026-07-01', 6);
    expect(result.months).toHaveLength(0);
    expect(result.totalInflowCents).toBe(0);
    expect(result.nextCashflowDate).toBe('');
  });
});

describe('P2 Resource Scheduling', () => {
  const schedule: ScheduleRecord[] = [
    { id: 'f', projectId: 'p1', task: 'Foundation & Bones', wbsCode: '02.01', startDate: '2026-06-15', durationDays: 5, predecessors: [], critical: true, costCents: 1400000 },
    { id: 's', projectId: 'p1', task: 'Wall Plate & Shell', wbsCode: '03.01', startDate: '2026-06-20', durationDays: 2, predecessors: ['f'], critical: true, costCents: 1650000 },
  ];

  it('auto-codes labour rows per day (3 crew × 8h) with trade rates', () => {
    const rows = buildResourceSchedule(schedule);
    expect(rows).toHaveLength(7);
    const row = rows[0];
    expect(row.labourHours).toBe(24);
    expect(row.crewSize).toBe(3);
    expect(row.autoCodedWbs).toBe('02.01');
    expect(row.costCents).toBe(24 * TRADE_LABOUR_RATES['Cement & Concrete']);
    expect(rows[5].date).toBe('2026-06-20');
  });

  it('maps WBS prefixes to trades', () => {
    expect(tradeFromWbs('02.01')).toBe('Cement & Concrete');
    expect(tradeFromWbs('03.01')).toBe('Brick & Block');
    expect(tradeFromWbs('04.01')).toBe('Timber & Roofing');
    expect(tradeFromWbs('05.01')).toBe('Finishes');
    expect(tradeFromWbs('06.01')).toBe('Electrical & Solar');
    expect(tradeFromWbs('06.02')).toBe('Plumbing & Sanitary');
    expect(tradeFromWbs('99')).toBe('General Materials');
  });

  it('tracks logistics through ordered → in-transit → arrived → delivered', () => {
    const record = createLogisticsRecord({ projectId: 'p1', supplierName: 'Willdale', material: 'Bricks', etaDays: 4, now });
    expect(record.status).toBe('ordered');
    expect(record.geofenced).toBe(true);
    expect(record.updatedAt).toBe(ISO);
    const transit = advanceLogistics(record);
    expect(transit.status).toBe('in-transit');
    expect(advanceLogistics(transit).status).toBe('arrived');
    expect(advanceLogistics(advanceLogistics(transit)).status).toBe('delivered');
  });

  it('summarises the logistics fleet', () => {
    const a = createLogisticsRecord({ projectId: 'p1', supplierName: 'S1', material: 'Bricks', etaDays: 2, now });
    const b = createLogisticsRecord({ projectId: 'p1', supplierName: 'S2', material: 'Cement', etaDays: -1, now });
    const summary = logisticsSummary([a, advanceLogistics(b)]);
    expect(summary.total).toBe(2);
    expect(summary.inTransit).toBe(1);
    expect(summary.geofenced).toBe(2);
    expect(summary.overdue).toBe(1);
  });

  it('aggregates resource rows into a RealTimeJobCosting summary', () => {
    const rows = buildResourceSchedule(schedule);
    const costing = aggregateJobCosts(rows);
    expect(costing.totalCents).toBe(rows.reduce((s, r) => s + r.costCents, 0));
    expect(costing.labourCents).toBe(costing.totalCents);
    expect(costing.materialCents).toBe(0);
    expect(costing.equipmentCents).toBe(0);
    expect(Object.keys(costing.byWbs).length).toBe(2);
    expect(costing.byWbs['02.01']).toBeGreaterThan(0);
    expect(costing.byWbs['03.01']).toBeGreaterThan(0);
  });

  it('returns zero costing for empty rows', () => {
    const costing = aggregateJobCosts([]);
    expect(costing.totalCents).toBe(0);
    expect(costing.byWbs).toEqual({});
  });
});

describe('P3 Digital Twin', () => {
  it('geo-tags snapshots with 6-decimal clamping and progress clamping', () => {
    const snap = createTwinSnapshot({
      projectId: 'p1',
      milestoneId: 'em-1',
      geoLat: -17.829200001,
      geoLng: 31.052199999,
      note: 'Foundation pour',
      progressPct: 150,
      now,
    });
    expect(snap).not.toBeNull();
    expect(snap!.geoLat).toBe(-17.8292);
    expect(snap!.geoLng).toBe(31.0522);
    expect(snap!.progressPct).toBe(100);
    expect(snap!.capturedAt).toBe(ISO);
  });

  it('rejects non-finite coordinates', () => {
    expect(createTwinSnapshot({ projectId: 'p1', geoLat: NaN, geoLng: 31, note: '', progressPct: 0, now })).toBeNull();
    expect(createTwinSnapshot({ projectId: 'p1', geoLat: -17, geoLng: Infinity, note: '', progressPct: 0, now })).toBeNull();
  });

  it('creates verification reports and summarises the twin state', () => {
    const report = createVerificationReport({ projectId: 'p1', milestoneId: 'em-1', method: 'ai-vision', verdict: 'pass', confidence: 94, details: 'Reinforcement verified', now });
    expect(report.id).toMatch(/^vr-p1-/);
    expect(report.confidence).toBe(94);
    const state = {
      snapshots: [
        createTwinSnapshot({ projectId: 'p1', milestoneId: 'em-1', geoLat: -17.8292, geoLng: 31.0522, note: '', progressPct: 12, now })!,
      ],
      reports: [report],
    };
    const summary = twinSummary(state);
    expect(summary.snapshots).toBe(1);
    expect(summary.verified).toBe(1);
    expect(summary.avgConfidence).toBe(94);
    expect(summary.latestProgressPct).toBe(12);
  });

  it('tracks the 35/40/25 milestone progress', () => {
    const split = [
      { name: 'Foundation & Bones', pct: 35 },
      { name: 'Wall Plate & Shell', pct: 40 },
      { name: 'Finishes & Keys', pct: 25 },
    ];
    const rows = milestoneProgressFor(split, {
      snapshots: [createTwinSnapshot({ projectId: 'p1', milestoneId: 'em-1', geoLat: -17.8292, geoLng: 31.0522, note: '', progressPct: 18, now })!],
      reports: [createVerificationReport({ projectId: 'p1', method: 'drone', verdict: 'pass', confidence: 90, details: '', now })],
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe('Foundation & Bones');
    expect(rows[0].pct).toBe(35);
    expect(rows[0].verified).toBe(true);
  });
});

describe('P4 Escrow Release Trigger', () => {
  it('creates pending milestones with the canonical amounts', () => {
    const m = createEscrowMilestone({ projectId: 'p1', milestoneName: 'Foundation & Bones', amountCents: 1400000, now });
    expect(m.status).toBe('pending');
    expect(m.releaseDate).toBeNull();
    expect(m.id).toMatch(/^em-p1-/);
  });

  it('verifies only on a passing report ≥60 confidence', () => {
    const pending = createEscrowMilestone({ projectId: 'p1', milestoneName: 'Foundation & Bones', amountCents: 1400000, now });
    const fail = transitionEscrowMilestone({
      milestone: pending,
      verification: createVerificationReport({ projectId: 'p1', method: 'ai-vision', verdict: 'fail', confidence: 30, details: '', now }),
      now,
    });
    expect(fail.milestone.status).toBe('pending');
    expect(fail.reason).toContain('blocked');

    const pass = transitionEscrowMilestone({
      milestone: pending,
      verification: createVerificationReport({ projectId: 'p1', method: 'ai-vision', verdict: 'pass', confidence: 88, details: '', now }),
      now,
    });
    expect(pass.milestone.status).toBe('verified');
    expect(pass.ok).toBe(true);
    expect(pass.reason).toContain('88%');
  });

  it('releases only after HITL QS approval, then disputes and appeals', () => {
    const verified = transitionEscrowMilestone({
      milestone: createEscrowMilestone({ projectId: 'p1', milestoneName: 'Wall Plate & Shell', amountCents: 1650000, now }),
      verification: createVerificationReport({ projectId: 'p1', method: 'drone', verdict: 'pass', confidence: 90, details: '', now }),
      now,
    }).milestone;
    const waiting = transitionEscrowMilestone({ milestone: verified, approval: undefined, now });
    expect(waiting.milestone.status).toBe('verified');
    expect(waiting.reason).toBe('Awaiting QS approval');

    const released = transitionEscrowMilestone({ milestone: verified, approval: 'approved', now });
    expect(released.milestone.status).toBe('released');
    expect(released.milestone.releaseDate).toBe(ISO);
    const record = createReleaseRecord({ milestone: verified, approval: 'approved', now });
    expect(record!.releasedBy).toBe('qs');
    expect(record!.amountCents).toBe(1650000);

    const disputed = transitionEscrowMilestone({ milestone: released.milestone, now });
    expect(disputed.milestone.status).toBe('disputed');
    const appeal = transitionEscrowMilestone({ milestone: disputed.milestone, now });
    expect(appeal.milestone.status).toBe('appeal');
    expect(ESCROW_STATE_FLOW).toEqual(['pending', 'verified', 'released', 'disputed', 'appeal', 'suspended']);
  });

  it('returns no release record when the milestone does not release', () => {
    const pending = createEscrowMilestone({ projectId: 'p1', milestoneName: 'X', amountCents: 1000, now });
    expect(createReleaseRecord({ milestone: pending, verification: null, now })).toBeNull();
  });

  it('summarises held vs released escrow (canonical $41,200 total)', () => {
    const make = (name: string, cents: number) => ({ ...createEscrowMilestone({ projectId: 'p1', milestoneName: name, amountCents: cents, now }), status: 'released' as const });
    const summary = escrowSummary([
      make('Foundation & Bones', 1400000),
      make('Wall Plate & Shell', 1650000),
      make('Finishes & Keys', 1070000),
    ]);
    expect(summary.releasedCents).toBe(4120000);
    expect(summary.heldCents).toBe(0);
    expect(summary.disputed).toBe(0);
  });

  it('escrowSummary counts suspended and withConcerns milestones', () => {
    const suspended = { ...createEscrowMilestone({ projectId: 'p1', milestoneName: 'S', amountCents: 500000, now }), status: 'suspended' as const, concernStatus: 'open' as const };
    const concerned = { ...createEscrowMilestone({ projectId: 'p1', milestoneName: 'C', amountCents: 300000, now }), status: 'verified' as const, concernStatus: 'open' as const };
    const released = { ...createEscrowMilestone({ projectId: 'p1', milestoneName: 'R', amountCents: 700000, now }), status: 'released' as const, concernStatus: null };
    const s = escrowSummary([suspended, concerned, released]);
    expect(s.suspended).toBe(1);
    expect(s.withConcerns).toBe(2);
    expect(s.heldCents).toBe(800000);
    expect(s.releasedCents).toBe(700000);
  });
});

describe('P4 Checkpoints & Alerts', () => {
  it('creates checkpoint with correct fields', () => {
    const cp = createCheckpoint({
      projectId: 'p1', milestoneId: 'em-1', fromState: 'pending', toState: 'verified',
      triggeredBy: 'qs', reason: 'Verification passed 88%', now,
    });
    expect(cp.id).toMatch(/^ec-em-1-/);
    expect(cp.fromState).toBe('pending');
    expect(cp.toState).toBe('verified');
    expect(cp.triggeredBy).toBe('qs');
    expect(cp.checkpointAt).toBe(ISO);
  });

  it('creates alert with random suffix', () => {
    const alert = createAlert({
      projectId: 'p1', milestoneId: 'em-1', type: 'funds-released',
      title: 'Funds released', message: '$14,000 released', now,
    });
    expect(alert.id).toMatch(/^ea-/);
    expect(alert.type).toBe('funds-released');
    expect(alert.read).toBe(false);
    expect(alert.channel).toBe('vault');
  });

  it('builds work-started alert with milestone context', () => {
    const a = buildWorkStartedAlert('p1', 'em-1', 'Foundation', now);
    expect(a.type).toBe('work-started');
    expect(a.title).toBe('🔨 Work Started');
    expect(a.message).toContain('Foundation');
    expect(a.message).toContain('commenced');
  });

  it('builds weekly digest alert with photo count', () => {
    const a = buildWeeklyDigestAlert('p1', 'em-1', 'Shell', 12, now);
    expect(a.type).toBe('weekly-digest');    expect(a.message).toContain('12');
  });

  it('builds milestone-complete alert', () => {
    const a = buildMilestoneCompleteAlert('p1', 'em-1', 'Finishes', now);
    expect(a.message).toContain('Finishes');
    expect(a.message).toContain('complete');
  });

  it('builds funds-released alert with dollar amount', () => {
    const a = buildFundsReleasedAlert('p1', 'em-1', 'Foundation', 1400000, now);
    expect(a.type).toBe('funds-released');
    expect(a.message).toContain('$14');
  });

  it('builds supplier-paid alert with name and amount', () => {
    const a = buildSupplierPaidAlert('p1', 'em-1', 'Brickworks Ltd', 500000, now);
    expect(a.type).toBe('supplier-paid');
    expect(a.message).toContain('Brickworks');
    expect(a.message).toContain('$5');
  });

  it('builds concern alert with description', () => {
    const a = buildConcernAlert('p1', 'em-1', 'Cracks in plaster', now);
    expect(a.type).toBe('concern-flagged');
    expect(a.message).toContain('Cracks');
  });
});

describe('P4 Supplier Payments', () => {
  it('creates supplier payment with pending status', () => {
    const sp = createSupplierPayment({
      projectId: 'p1', milestoneId: 'em-1', supplierName: 'Brickworks',
      supplierBankRef: 'REF-001', amountCents: 500000, now,
    });
    expect(sp.id).toMatch(/^sp-em-1-/);
    expect(sp.status).toBe('pending');
    expect(sp.amountCents).toBe(500000);
    expect(sp.proofOfFunds).toBe(false);
  });

  it('transitions supplier payment through statuses', () => {
    const sp = createSupplierPayment({
      projectId: 'p1', milestoneId: 'em-1', supplierName: 'Brickworks',
      supplierBankRef: 'REF-001', amountCents: 500000, now,
    });
    const processing = transitionSupplierPayment(sp, 'processing', now);
    expect(processing.status).toBe('processing');
    const completed = transitionSupplierPayment(processing, 'completed', now);
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toBe(ISO);
  });

  it('can transition to failed status', () => {
    const sp = createSupplierPayment({
      projectId: 'p1', milestoneId: 'em-1', supplierName: 'Brickworks',
      supplierBankRef: 'REF-001', amountCents: 500000, now,
    });
    const failed = transitionSupplierPayment(sp, 'failed', now);
    expect(failed.status).toBe('failed');
  });
});

describe('P4 Concerns & Concierge', () => {
  it('flags a concern with open status', () => {
    const result = flagConcern({
      projectId: 'p1', milestoneId: 'em-1', raisedBy: 'qs',
      description: 'Cracks in plaster', reworkEstimateCents: 150000, now,
    });
    expect(result.concern.id).toMatch(/^concern-em-1-/);
    expect(result.concern.status).toBe('open');
    expect(result.concern.description).toBe('Cracks in plaster');
    expect(result.concern.reworkEstimateCents).toBe(150000);
    expect(result.milestoneUpdate.concernStatus).toBe('open');
  });

  it('flags a concern without rework estimate', () => {
    const result = flagConcern({
      projectId: 'p1', milestoneId: 'em-1', raisedBy: 'architect',
      description: 'Paint colour mismatch', now,
    });
    expect(result.concern.reworkEstimateCents).toBeNull();
    expect(result.milestoneUpdate.concernStatus).toBe('open');
  });

  it('resolves a concern with concierge note', () => {
    const { concern } = flagConcern({
      projectId: 'p1', milestoneId: 'em-1', raisedBy: 'qs',
      description: 'Cracks in plaster', now,
    });
    const resolved = resolveConcern(concern, 'Re-plastered by subcontractor', now);
    expect(resolved.status).toBe('resolved');
    expect(resolved.conciergeNote).toBe('Re-plastered by subcontractor');
    expect(resolved.resolvedAt).toBe(ISO);
  });

  it('scopes rework with estimate', () => {
    const { concern } = flagConcern({
      projectId: 'p1', milestoneId: 'em-1', raisedBy: 'qs',
      description: 'Tile damage', now,
    });
    const scoped = scopeRework(concern, 200000, 'Replace 12m2 tiles');
    expect(scoped.status).toBe('rework-scoped');
    expect(scoped.reworkEstimateCents).toBe(200000);
    expect(scoped.conciergeNote).toBe('Replace 12m2 tiles');
  });

  it('concierge response creates a build guide message', () => {
    const msg = conciergeResponse('p1', 'em-1', 'Cracks in plaster', now);
    expect(msg.type).toBe('concierge');
    expect(msg.content).toContain('Cracks');
    expect(msg.milestoneId).toBe('em-1');
  });
});

describe('P4 Build Guide Messages', () => {
  it('creates a user message', () => {
    const msg = createBuildGuideMessage({
      projectId: 'p1', milestoneId: 'em-1', type: 'user',
      content: 'What is the brick spec?', now,
    });
    expect(msg.id).toMatch(/^bg-/);
    expect(msg.type).toBe('user');
    expect(msg.content).toBe('What is the brick spec?');
    expect(msg.read).toBe(false);
  });

  it('creates a system message', () => {
    const msg = createBuildGuideMessage({
      projectId: 'p1', milestoneId: 'em-1', type: 'system',
      content: 'Milestone verified by QS', now,
    });
    expect(msg.type).toBe('system');
  });

  it('creates a concierge message', () => {
    const msg = createBuildGuideMessage({
      projectId: 'p1', milestoneId: 'em-1', type: 'concierge',
      content: 'Regarding the plaster cracks...', now,
    });
    expect(msg.type).toBe('concierge');
  });
});

describe('P4 HITL Gates', () => {
  it('maps all transitions to correct gate types', () => {
    expect(HITL_GATES['pending→verified']).toBe('qs');
    expect(HITL_GATES['verified→released']).toBe('qs');
    expect(HITL_GATES['disputed→appeal']).toBe('architect');
    expect(HITL_GATES['suspended→pending']).toBe('concierge');
  });

  it('suspended state is in the state flow', () => {
    expect(ESCROW_STATE_FLOW).toContain('suspended');
  });

  it('TransitionResult includes checkpoint and alert fields', () => {
    const pending = createEscrowMilestone({ projectId: 'p1', milestoneName: 'Test', amountCents: 100000, now });
    const result = transitionEscrowMilestone({
      milestone: pending,
      verification: createVerificationReport({ projectId: 'p1', method: 'ai-vision', verdict: 'pass', confidence: 85, details: '', now }),
      now,
    });
    expect(result).toHaveProperty('checkpoint');
    expect(result).toHaveProperty('alert');
    expect(result.checkpoint).toHaveProperty('id');
    expect(result.checkpoint.fromState).toBe('pending');
    expect(result.checkpoint.toState).toBe('verified');
    expect(result.alert).not.toBeNull();
  });
});

describe('P5 Variation Vault', () => {
  it('runs the 4-lens analysis with median recommendation', () => {
    const result = analyzeVariation({
      projectId: 'p1',
      changeOrderId: 'co-1',
      title: 'Porcelain tile upgrade',
      lines: [{ description: 'Porcelain tile', quantity: 40, unit: 'm2', unitCostCents: 3750 }],
      declaredImpactCents: 150000,
      lensInputs: { 'red-pen': 168000, wipaa: 169000, 'true-ledger': 150000, 'budget-engineer': 192000 },
      now,
    });
    expect(VARIATION_LENSES).toEqual(['red-pen', 'wipaa', 'true-ledger', 'budget-engineer']);
    expect(result.penalties).toHaveLength(4);
    const impacts = [168000, 169000, 150000, 192000].sort((a, b) => a - b);
    expect(result.recommendedCents).toBe((impacts[1] + impacts[2]) / 2);
    expect(result.spreadCents).toBe(192000 - 150000);
    expect(result.reversalWarning).toContain(`${MAX_PENALTY_PCT}% cap`);
  });

  it('caps reversal penalties at 10% of declared', () => {
    const result = analyzeVariation({
      projectId: 'p1',
      title: 'Big gap',
      lines: [],
      declaredImpactCents: 100000,
      lensInputs: { 'red-pen': 900000 },
      now,
    });
    const redPen = result.penalties.find((p) => p.lens === 'red-pen')!;
    expect(Math.round(Math.abs(900000 - 100000) * REVERSAL_PENALTY_RATE)).toBe(200000);
    expect(redPen.penaltyCents).toBe(10000);
    expect(redPen.riskFlags).toHaveLength(1);
  });

  it('totals penalties per lens', () => {
    const result = analyzeVariation({
      projectId: 'p1',
      title: 'Tiles',
      lines: [],
      declaredImpactCents: 100000,
      lensInputs: { 'red-pen': 130000 },
      now,
    });
    const totals = variationTotals(result.penalties);
    expect(totals.totalPenaltyCents).toBe(result.penalties.reduce((s, p) => s + p.penaltyCents, 0));
    expect(totals.byLens['red-pen']).toBeDefined();
  });

  it('computes reversal penalty breakdown with 3 categories', () => {
    const breakdown = computeReversalBreakdown(10000);
    expect(breakdown.supplierRestockingCents).toBe(Math.round(10000 * SUPPLIER_RESTOCKING_PCT));
    expect(breakdown.laborReallocationCents).toBe(Math.round(10000 * LABOR_REALLOCATION_PCT));
    expect(breakdown.contractorOverheadCents).toBe(Math.round(10000 * CONTRACTOR_OVERHEAD_PCT));
    expect(breakdown.totalCents).toBe(
      breakdown.supplierRestockingCents + breakdown.laborReallocationCents + breakdown.contractorOverheadCents,
    );
    expect(breakdown.notes).toHaveLength(3);
    expect(breakdown.notes[0]).toContain('45%');
    expect(breakdown.notes[1]).toContain('35%');
    expect(breakdown.notes[2]).toContain('20%');
  });

  it('computes zero breakdown for zero penalty', () => {
    const breakdown = computeReversalBreakdown(0);
    expect(breakdown.totalCents).toBe(0);
    expect(breakdown.supplierRestockingCents).toBe(0);
    expect(breakdown.laborReallocationCents).toBe(0);
    expect(breakdown.contractorOverheadCents).toBe(0);
    expect(breakdown.notes).toHaveLength(0);
  });

  it('processChangeOrder returns full change order result', () => {
    const result = processChangeOrder({
      projectId: 'p1',
      changeOrderId: 'co-2',
      title: 'Extra blockwork',
      lines: [{ description: 'Blockwork 230mm', quantity: 400, unit: 'm2', unitCostCents: 4500 }],
      declaredImpactCents: 1800000,
      lensInputs: { 'red-pen': 1900000, wipaa: 1850000, 'true-ledger': 1750000, 'budget-engineer': 1800000 },
      lockedBaselineCents: 25000000,
      timelineDeltaDays: 7,
      wbsCode: '03.01',
      now,
    });
    expect(result.analysis.penalties).toHaveLength(4);
    expect(result.analysis.recommendedCents).toBeGreaterThan(0);
    expect(result.breakdown.totalCents).toBeGreaterThanOrEqual(0);
    expect(result.newBoqLine.description).toBe('Extra blockwork');
    expect(result.newBoqLine.totalCents).toBe(Math.round(400 * 4500));
    expect(result.revisedBaselineCents).toBe(25000000 + result.newBoqLine.totalCents);
    expect(result.timelineDeltaDays).toBe(7);
    expect(result.withinCap).toBe(true);
    expect(result.wbsCode).toBe('03.01');
    expect(result.notifications.length).toBeGreaterThan(0);
  });

  it('processChangeOrder warns when penalty exceeds cap', () => {
    const result = processChangeOrder({
      projectId: 'p1',
      title: 'Big change',
      lines: [{ description: 'Item', quantity: 1, unit: 'ls', unitCostCents: 500000 }],
      declaredImpactCents: 100000,
      lensInputs: { 'red-pen': 900000 },
      lockedBaselineCents: 5000000,
      timelineDeltaDays: 0,
      now,
    });
    expect(result.withinCap).toBe(false);
    expect(result.notifications.some((n) => n.includes('WARNING'))).toBe(true);
  });

  it('processChangeOrder generates timeline notifications', () => {
    const delay = processChangeOrder({
      projectId: 'p1',
      title: 'Delay',
      lines: [],
      declaredImpactCents: 0,
      lensInputs: {},
      lockedBaselineCents: 0,
      timelineDeltaDays: 14,
      now,
    });
    expect(delay.notifications.some((n) => n.includes('extended'))).toBe(true);
    expect(delay.notifications.some((n) => n.includes('14 days'))).toBe(true);

    const compress = processChangeOrder({
      projectId: 'p1',
      title: 'Compress',
      lines: [],
      declaredImpactCents: 0,
      lensInputs: {},
      lockedBaselineCents: 0,
      timelineDeltaDays: -5,
      now,
    });
    expect(compress.notifications.some((n) => n.includes('compressed'))).toBe(true);
  });

  it('processChangeOrder defaults WBS to 99.00.00', () => {
    const result = processChangeOrder({
      projectId: 'p1',
      title: 'No WBS',
      lines: [],
      declaredImpactCents: 0,
      lensInputs: {},
      lockedBaselineCents: 0,
      timelineDeltaDays: 0,
      now,
    });
    expect(result.wbsCode).toBe('99.00.00');
  });

  it('processChangeOrder includes escrow notification', () => {
    const result = processChangeOrder({
      projectId: 'p1',
      title: 'Escrow-linked',
      lines: [],
      declaredImpactCents: 0,
      lensInputs: {},
      lockedBaselineCents: 0,
      timelineDeltaDays: 0,
      escrowMilestoneId: 'em-1',
      now,
    });
    expect(result.notifications.some((n) => n.includes('em-1'))).toBe(true);
  });
});

describe('P6 WIPAA & Handover', () => {
  it('classifies escalation levels (green ≥90 / amber 70-89 / red <70)', () => {
    expect(WIPAA_ALERT_THRESHOLDS).toEqual({ green: 90, amber: 70 });
    expect(alertLevelFor(98)).toBe('green');
    expect(alertLevelFor(75)).toBe('amber');
    expect(alertLevelFor(40)).toBe('red');
  });

  it('builds the canonical WIPAA entry (#DZ-240615, ON TRACK 98%)', () => {
    const entry = buildWipaaEntry({
      projectId: 'p1',
      monthKey: '2026-07',
      billedCents: 1176000,
      incurredCents: 1200000,
      revenueEarnedCents: 1180000,
      overUnderBilledCents: -4000,
      status: 'on-track',
      createdAt: ISO,
    });
    expect(entry.id).toBe('we-p1-2026-07');
    expect(entry.escalationPct).toBe(98);
    expect(entry.alertLevel).toBe('green');
    expect(entry.createdAt).toBe(ISO);
  });

  it('builds P&L rows from coded ledger lines', () => {
    const rows = buildPnl(
      [{ code: '03.01', name: 'Masonry (115mm units)', category: 'Superstructure', costCents: 216000 }],
      240000,
    );
    expect(rows[0].marginCents).toBe(24000);
    expect(rows[0].marginPct).toBe(11.1);
  });

  it('classifies gain/fade per line (>5% band)', () => {
    const rows = analyzeGainFade([
      { description: 'Bricks', baselineCents: 100000, actualCents: 90000 },
      { description: 'Cement', baselineCents: 100000, actualCents: 108000 },
      { description: 'Paint', baselineCents: 100000, actualCents: 102000 },
    ]);
    expect(rows[0].verdict).toBe('gain');
    expect(rows[1].verdict).toBe('fade');
    expect(rows[2].verdict).toBe('on-target');
  });

  it('builds the digital + physical handover pack (9 items)', () => {
    const pack = buildHandoverPack({});
    expect(pack.digital).toHaveLength(5);
    expect(pack.physical).toHaveLength(4);
    expect(pack.completed).toBe(false);
    const done = buildHandoverPack(
      Object.fromEntries([...pack.digital, ...pack.physical].map((i) => [i, true])),
    );
    expect(done.completed).toBe(true);
  });

  it('summarises monthly WIPAA history', () => {
    const entries = [
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track' }),
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-07', billedCents: 1176000, incurredCents: 1200000, revenueEarnedCents: 1180000, overUnderBilledCents: -4000, status: 'on-track' }),
    ];
    const summary = wipaaSummary(entries);
    expect(summary.monthCount).toBe(2);
    expect(summary.latest!.monthKey).toBe('2026-07');
    expect(summary.alerts.green).toBe(2);
    expect(summary.totalOverUnderBilledCents).toBe(-4000);
  });

  it('computes solvency ratio from a WIPAA entry', () => {
    const entry = buildWipaaEntry({
      projectId: 'p1', monthKey: '2026-08',
      billedCents: 900000, incurredCents: 1200000,
      revenueEarnedCents: 900000, overUnderBilledCents: -300000, status: 'under-billed',
    });
    const ratio = solvencyRatioFor(entry);
    expect(ratio.ratio).toBe(0.75);
    expect(ratio.alertLevel).toBe('amber');
    expect(ratio.monthKey).toBe('2026-08');
  });

  it('solvency ratio rounds to 2dp', () => {
    const entry = buildWipaaEntry({
      projectId: 'p1', monthKey: '2026-08',
      billedCents: 333, incurredCents: 1000,
      revenueEarnedCents: 333, overUnderBilledCents: -667, status: 'under-billed',
    });
    expect(solvencyRatioFor(entry).ratio).toBe(0.33);
  });

  it('builds a solvency trend with min/max/avg/alert', () => {
    const entries = [
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-06', billedCents: 100000, incurredCents: 100000, revenueEarnedCents: 100000, overUnderBilledCents: 0, status: 'on-track' }),
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-07', billedCents: 80000, incurredCents: 120000, revenueEarnedCents: 80000, overUnderBilledCents: -40000, status: 'under-billed' }),
    ];
    const trend = solvencyTrend(entries);
    expect(trend.months).toHaveLength(2);
    expect(trend.currentRatio).toBe(0.67);
    expect(trend.avgRatio).toBe(0.84);
    expect(trend.minRatio).toBe(0.67);
    expect(trend.maxRatio).toBe(1);
    expect(trend.alertLevel).toBe('red'); // latest ratio 0.67 → 67% → below 70% amber threshold
  });

  it('solvency trend returns zeros for empty entries', () => {
    const trend = solvencyTrend([]);
    expect(trend.months).toHaveLength(0);
    expect(trend.currentRatio).toBe(0);
    expect(trend.alertLevel).toBe('red');
  });

  it('classifies contingency spend-down alert levels', () => {
    expect(contingencyAlertLevel(40)).toBe('healthy');
    expect(contingencyAlertLevel(55)).toBe('caution');
    expect(contingencyAlertLevel(75)).toBe('warning');
    expect(contingencyAlertLevel(95)).toBe('critical');
  });

  it('computes contingency spend-down trajectory', () => {
    const result = contingencySpendDown(500000, [
      { monthKey: '2026-06', spentCents: 50000 },
      { monthKey: '2026-07', spentCents: 80000 },
      { monthKey: '2026-08', spentCents: 70000 },
    ]);
    expect(result.spentCents).toBe(200000);
    expect(result.remainingCents).toBe(300000);
    expect(result.spentPct).toBe(40);
    expect(result.alertLevel).toBe('healthy');
    expect(result.monthlyBurnCents).toBe(66667);
    expect(result.projectedExhaustedMonthKey).toBe('2026-12'); // remaining 300k / 66.6k avg burn = 4 months from Aug
  });

  it('contingency with zero months returns defaults', () => {
    const result = contingencySpendDown(100000, []);
    expect(result.spentCents).toBe(0);
    expect(result.remainingCents).toBe(100000);
    expect(result.alertLevel).toBe('healthy');
    expect(result.projectedExhaustedMonthKey).toBeNull();
  });

  it('contingency at critical level when >90% spent', () => {
    const result = contingencySpendDown(100000, [
      { monthKey: '2026-06', spentCents: 50000 },
      { monthKey: '2026-07', spentCents: 45000 },
    ]);
    expect(result.spentPct).toBe(95);
    expect(result.alertLevel).toBe('critical');
    expect(result.remainingCents).toBe(5000);
  });

  it('builds a monthly cashflow projection from WIPAA entries', () => {
    const entries = [
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-06', billedCents: 1200000, incurredCents: 1000000, revenueEarnedCents: 1200000, overUnderBilledCents: 200000, status: 'on-track' }),
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-07', billedCents: 900000, incurredCents: 1100000, revenueEarnedCents: 900000, overUnderBilledCents: -200000, status: 'under-billed' }),
    ];
    const cf = monthlyCashflow(entries);
    expect(cf).toHaveLength(2);
    expect(cf[0].inflowCents).toBe(1200000);
    expect(cf[0].netCents).toBe(200000);
    expect(cf[0].cumulativeCents).toBe(200000);
    expect(cf[1].outflowCents).toBe(1100000);
    expect(cf[1].netCents).toBe(-200000);
    expect(cf[1].cumulativeCents).toBe(0);
  });

  it('cashflow projection sorts by monthKey', () => {
    const entries = [
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-09', billedCents: 50000, incurredCents: 40000, revenueEarnedCents: 50000, overUnderBilledCents: 10000, status: 'on-track' }),
      buildWipaaEntry({ projectId: 'p1', monthKey: '2026-08', billedCents: 60000, incurredCents: 60000, revenueEarnedCents: 60000, overUnderBilledCents: 0, status: 'on-track' }),
    ];
    const cf = monthlyCashflow(entries);
    expect(cf[0].monthKey).toBe('2026-08');
    expect(cf[1].monthKey).toBe('2026-09');
  });

  it('builds an interactive handover checklist', () => {
    const checklist = buildHandoverChecklist({ 'As-built floor plans & elevations': true, 'Keys (main + duplicates)': true });
    expect(checklist.totalItems).toBe(9);
    expect(checklist.checkedItems).toBe(2);
    expect(checklist.completed).toBe(false);
    expect(checklist.digitalCompletionPct).toBe(20);
    expect(checklist.physicalCompletionPct).toBe(25);
  });

  it('handover checklist is complete when all items checked', () => {
    const allChecked = Object.fromEntries([
      'As-built floor plans & elevations', 'Building model (GLB)', 'Warranty certificates',
      'O&M manuals', 'Final account & lien waivers', 'Keys (main + duplicates)',
      'Remote controls & gate transmitters', 'Water meter key', 'Electrical DB schedule',
    ].map((i) => [i, true]));
    const checklist = buildHandoverChecklist(allChecked);
    expect(checklist.completed).toBe(true);
    expect(checklist.completionPct).toBe(100);
    expect(checklist.digitalCompletionPct).toBe(100);
    expect(checklist.physicalCompletionPct).toBe(100);
  });

  it('signs off checked handover items', () => {
    const checklist = buildHandoverChecklist({ 'Keys (main + duplicates)': true });
    const signOff = signOffHandover(checklist, 'QS Moyo', ISO);
    expect(signOff.signerName).toBe('QS Moyo');
    expect(signOff.itemsSignedOff).toBe(1);
    expect(signOff.allComplete).toBe(false);
    expect(signOff.signedAt).toBe(ISO);
  });

  it('signOffHandover marks allComplete when every item is checked', () => {
    const allChecked = Object.fromEntries([
      'As-built floor plans & elevations', 'Building model (GLB)', 'Warranty certificates',
      'O&M manuals', 'Final account & lien waivers', 'Keys (main + duplicates)',
      'Remote controls & gate transmitters', 'Water meter key', 'Electrical DB schedule',
    ].map((i) => [i, true]));
    const checklist = buildHandoverChecklist(allChecked);
    const signOff = signOffHandover(checklist, 'QS Moyo');
    expect(signOff.allComplete).toBe(true);
    expect(signOff.itemsSignedOff).toBe(9);
  });
});