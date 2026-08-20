import { describe, it, expect } from 'vitest';
import { buildCriticalPath, findCriticalPath, toGanttRows, cashflowCurve, buildWbsDictionary, buildRiskRegister, buildScheduleOfValues, monthlyCashflowProjection } from '@/engine/sitehawk/criticalPath';
import { buildResourceSchedule, TRADE_LABOUR_RATES, tradeFromWbs, createLogisticsRecord, advanceLogistics, logisticsSummary, aggregateJobCosts } from '@/engine/sitehawk/resourceScheduling';
import { createTwinSnapshot, createVerificationReport, twinSummary, milestoneProgressFor } from '@/engine/sitehawk/digitalTwin';
import { createEscrowMilestone, transitionEscrowMilestone, createReleaseRecord, escrowSummary, ESCROW_STATE_FLOW } from '@/engine/sitehawk/escrowTrigger';
import { analyzeVariation, variationTotals, VARIATION_LENSES, REVERSAL_PENALTY_RATE, MAX_PENALTY_PCT } from '@/engine/sitehawk/variationVault';
import { alertLevelFor, buildWipaaEntry, buildPnl, analyzeGainFade, buildHandoverPack, wipaaSummary, WIPAA_ALERT_THRESHOLDS } from '@/engine/sitehawk/wipaaMonitor';
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
    expect(ESCROW_STATE_FLOW).toEqual(['pending', 'verified', 'released', 'disputed', 'appeal']);
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
});