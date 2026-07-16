export type BenchmarkCategory = 'plan' | 'boq' | 'schedule' | 'programme' | 'code-check';
export type AcceptanceLevel = 'pass' | 'marginal' | 'fail' | 'not-rated';

export interface BenchmarkReference {
  id: string;
  name: string;
  category: BenchmarkCategory;
  source: string;
  sourceType: 'real-project' | 'qs-estimate' | 'published-data' | 'reference-design' | 'expert-review';
  date: string;
  notes: string;
}

export interface BenchmarkMetric {
  name: string;
  actual: number;
  expected: number;
  unit: string;
  tolerancePct: number;
  deviationPct: number;
  acceptance: AcceptanceLevel;
}

export interface CalibrationScorecard {
  id: string;
  benchmarkId: string;
  benchmarkName: string;
  category: BenchmarkCategory;
  metrics: BenchmarkMetric[];
  overallScore: number;
  overallAcceptance: AcceptanceLevel;
  calibratedAt: string;
  notes: string;
}

export interface KnownWeakness {
  id: string;
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  affectedCategories: BenchmarkCategory[];
  mitigation: string;
  status: 'open' | 'mitigated' | 'resolved';
}

export interface RegressionRecord {
  id: string;
  feature: string;
  benchmarkId: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  detectedAt: string;
  status: 'investigating' | 'accepted' | 'fixed';
  notes: string;
}

export interface ValidationReport {
  id: string;
  runAt: string;
  totalBenchmarks: number;
  passed: number;
  marginal: number;
  failed: number;
  notRated: number;
  overallScore: number;
  scorecards: CalibrationScorecard[];
  regressionRecords: RegressionRecord[];
  weaknesses: KnownWeakness[];
  summary: string;
}

const PLANNING_BENCHMARKS: BenchmarkReference[] = [
  { id: 'bm-plan-1', name: 'Single-Storey House (3BR)', category: 'plan', source: 'Reference design set A', sourceType: 'reference-design', date: '2025-01-15', notes: 'Detached 3-bedroom house, 120m²' },
  { id: 'bm-plan-2', name: 'Duplex (2 units)', category: 'plan', source: 'Built project B', sourceType: 'real-project', date: '2025-03-20', notes: 'Semi-detached duplex with shared party wall' },
  { id: 'bm-boq-1', name: 'Residential BOQ', category: 'boq', source: 'QS estimate C', sourceType: 'qs-estimate', date: '2025-02-10', notes: 'Bill of quantities for 150m² residence' },
  { id: 'bm-sched-1', name: 'Construction Schedule', category: 'schedule', source: 'Published data D', sourceType: 'published-data', date: '2025-04-05', notes: 'Typical 6-month residential build schedule' },
  { id: 'bm-code-1', name: 'SANS 10400 Compliance', category: 'code-check', source: 'Expert review E', sourceType: 'expert-review', date: '2025-05-01', notes: 'Code compliance check for residential project' },
  { id: 'bm-site-1', name: 'Site Analysis Outputs', category: 'plan', source: 'Budget Engineer P14', sourceType: 'reference-design', date: '2025-07-01', notes: 'Site analysis orientation score, diagram count, and recommendation quality' },
  { id: 'bm-interior-1', name: 'Interior Documentation Outputs', category: 'plan', source: 'Budget Engineer P15', sourceType: 'reference-design', date: '2025-07-01', notes: 'Finish schedule generation, elevation data, and FFE schedule completeness' },
  { id: 'bm-structural-1', name: 'Structural Pre-Design Outputs', category: 'plan', source: 'Budget Engineer P16', sourceType: 'reference-design', date: '2025-07-01', notes: 'Slab system, beam/column/footing candidates, and structural BOQ quantities' },
  { id: 'bm-mep-1', name: 'MEP Pre-Design Outputs', category: 'plan', source: 'Budget Engineer P17', sourceType: 'reference-design', date: '2025-07-01', notes: 'Plumbing fixture/stack generation, electrical point/circuit layout, HVAC sizing' },
  { id: 'bm-review-1', name: 'Code Review Engine Outputs', category: 'code-check', source: 'Budget Engineer P18', sourceType: 'reference-design', date: '2025-07-01', notes: 'Issue detection, severity classification, and review decision quality' },
  { id: 'bm-delivery-1', name: 'Delivery Workflow Outputs', category: 'schedule', source: 'Budget Engineer P20', sourceType: 'reference-design', date: '2025-07-01', notes: 'Sheet revision workflow, package creation, and transmittal generation' },
  { id: 'bm-site-terrain', name: 'Site Analysis — Terrain Detection', category: 'plan', source: 'Budget Engineer P14', sourceType: 'reference-design', date: '2025-07-01', notes: 'Verifies steep terrain is identified and recommendations adjust accordingly' },
  { id: 'bm-site-adjacent', name: 'Site Analysis — Adjacent Building Impact', category: 'plan', source: 'Budget Engineer P14', sourceType: 'reference-design', date: '2025-07-01', notes: 'Adjacent building impact factor computed correctly from building geometry' },
  { id: 'bm-interior-wardrobe', name: 'Interior — Wardrobe Joinery', category: 'plan', source: 'Budget Engineer P15', sourceType: 'reference-design', date: '2025-07-01', notes: 'Wardrobe elevation generation with joinery definitions and instances' },
  { id: 'bm-interior-export', name: 'Interior — Export Formats', category: 'plan', source: 'Budget Engineer P15', sourceType: 'reference-design', date: '2025-07-01', notes: 'CSV and HTML export of finish and FFE schedules' },
  { id: 'bm-structural-slab', name: 'Structural — Slab Thickness Consistency', category: 'plan', source: 'Budget Engineer P16', sourceType: 'reference-design', date: '2025-07-01', notes: 'Slab thickness within expected range for residential spans' },
  { id: 'bm-structural-loading', name: 'Structural — Column Load Estimates', category: 'plan', source: 'Budget Engineer P16', sourceType: 'reference-design', date: '2025-07-01', notes: 'Column load estimates are positive and proportional to tributary area' },
  { id: 'bm-mep-demand', name: 'MEP — Water Demand Calculation', category: 'plan', source: 'Budget Engineer P17', sourceType: 'reference-design', date: '2025-07-01', notes: 'Plumbing zone water demand computed correctly from fixture types' },
  { id: 'bm-mep-circuit', name: 'MEP — Circuit Loading', category: 'plan', source: 'Budget Engineer P17', sourceType: 'reference-design', date: '2025-07-01', notes: 'Electrical circuit loads do not exceed breaker capacity' },
  { id: 'bm-review-bad', name: 'Review — Failing Design Detection', category: 'code-check', source: 'Budget Engineer P18', sourceType: 'reference-design', date: '2025-07-01', notes: 'Deliberately non-compliant design triggers critical failures' },
  { id: 'bm-review-good', name: 'Review — Compliant Design Pass', category: 'code-check', source: 'Budget Engineer P18', sourceType: 'reference-design', date: '2025-07-01', notes: 'Compliant design passes all rule checks with minimal issues' },
  { id: 'bm-delivery-signoff', name: 'Delivery — Sign-off Workflow', category: 'schedule', source: 'Budget Engineer P20', sourceType: 'reference-design', date: '2025-07-01', notes: 'Sheet sign-off by checker and approver with status transitions' },
  { id: 'bm-delivery-register', name: 'Delivery — Drawing Register', category: 'schedule', source: 'Budget Engineer P20', sourceType: 'reference-design', date: '2025-07-01', notes: 'Drawing register generated from multiple sheets with revision tracking' },
];

export function getBenchmarks(category?: BenchmarkCategory): BenchmarkReference[] {
  return category ? PLANNING_BENCHMARKS.filter(b => b.category === category) : [...PLANNING_BENCHMARKS];
}

export function calibrateAgainst(
  benchmarkId: string,
  actualValues: Record<string, number>,
  expectedValues: Record<string, number>,
  tolerances: Record<string, number>,
  notes = ''
): CalibrationScorecard {
  const benchmark = PLANNING_BENCHMARKS.find(b => b.id === benchmarkId);
  const metrics: BenchmarkMetric[] = Object.keys(actualValues).map(key => {
    const actual = actualValues[key] ?? 0;
    const expected = expectedValues[key] ?? 1;
    const tolerancePct = tolerances[key] ?? 15;
    const deviationPct = expected !== 0 ? Math.round(((actual - expected) / expected) * 1000) / 10 : 0;
    const acceptance: AcceptanceLevel = Math.abs(deviationPct) <= tolerancePct ? 'pass' : Math.abs(deviationPct) <= tolerancePct * 2 ? 'marginal' : 'fail';
    return { name: key, actual, expected, unit: 'various', tolerancePct, deviationPct, acceptance };
  });

  const weights = metrics.map(m => ({ weight: m.acceptance === 'pass' ? 1 : m.acceptance === 'marginal' ? 0.5 : 0, count: 1 }));
  const overallScore = metrics.length > 0 ? Math.round(weights.reduce((s, w) => s + w.weight, 0) / metrics.length * 100) : 0;
  const failCount = metrics.filter(m => m.acceptance === 'fail').length;
  const overallAcceptance: AcceptanceLevel = failCount > 0 ? 'fail' : overallScore >= 80 ? 'pass' : 'marginal';

  return {
    id: `scorecard-${benchmarkId}-${Date.now()}`,
    benchmarkId,
    benchmarkName: benchmark?.name ?? benchmarkId,
    category: benchmark?.category ?? 'plan',
    metrics,
    overallScore,
    overallAcceptance,
    calibratedAt: new Date().toISOString(),
    notes,
  };
}

export const KNOWN_WEAKNESSES: KnownWeakness[] = [
  { id: 'wk-1', area: 'Apartment core planning', description: 'Apartment core configurations (scissor stairs, dual cores) need broader validation.', impact: 'medium', affectedCategories: ['plan'], mitigation: 'Expand apartment typology test suite with real-world core plan comparisons.', status: 'open' },
  { id: 'wk-2', area: 'Mixed-use ground floor', description: 'Mixed-use ground floor planning (retail + residential access) is less tested.', impact: 'medium', affectedCategories: ['plan'], mitigation: 'Develop mixed-use benchmark references for ground floor configuration.', status: 'open' },
  { id: 'wk-3', area: 'BOQ accuracy in non-residential', description: 'BOQ accuracy for non-residential typologies (clinics, schools) is less validated.', impact: 'high', affectedCategories: ['boq'], mitigation: 'Calibrate BOQ against QS estimates for non-residential projects.', status: 'open' },
  { id: 'wk-4', area: 'Schedule critical path', description: 'Construction schedule critical path logic is simplified for pre-design.', impact: 'low', affectedCategories: ['programme'], mitigation: 'Enhance CPM logic with dependency mapping.', status: 'mitigated' },
  { id: 'wk-5', area: 'Code check breadth', description: 'Code rule packs cover only southern African jurisdictions.', impact: 'high', affectedCategories: ['code-check'], mitigation: 'Add rule packs for UK, EU, and US jurisdictions.', status: 'open' },
];

export function getKnownWeaknesses(): KnownWeakness[] {
  return [...KNOWN_WEAKNESSES];
}

export function detectRegressions(
  previousScorecards: CalibrationScorecard[],
  currentScorecards: CalibrationScorecard[]
): RegressionRecord[] {
  const regressions: RegressionRecord[] = [];

  for (const current of currentScorecards) {
    const previous = previousScorecards.find(p => p.benchmarkId === current.benchmarkId);
    if (previous && current.overallScore < previous.overallScore) {
      regressions.push({
        id: `reg-${current.benchmarkId}-${Date.now()}`,
        feature: current.benchmarkName,
        benchmarkId: current.benchmarkId,
        previousScore: previous.overallScore,
        currentScore: current.overallScore,
        delta: current.overallScore - previous.overallScore,
        detectedAt: new Date().toISOString(),
        status: 'investigating',
        notes: `Regression detected in ${current.benchmarkName}: ${previous.overallScore}% → ${current.overallScore}%`,
      });
    }
  }

  return regressions;
}

export function generateValidationReport(
  scorecards: CalibrationScorecard[],
  previousScorecards: CalibrationScorecard[],
  weaknesses: KnownWeakness[]
): ValidationReport {
  const passed = scorecards.filter(s => s.overallAcceptance === 'pass').length;
  const marginal = scorecards.filter(s => s.overallAcceptance === 'marginal').length;
  const failed = scorecards.filter(s => s.overallAcceptance === 'fail').length;
  const notRated = scorecards.filter(s => s.overallAcceptance === 'not-rated').length;
  const overallScore = scorecards.length > 0
    ? Math.round(scorecards.reduce((s, c) => s + c.overallScore, 0) / scorecards.length)
    : 0;

  const regressionRecords = detectRegressions(previousScorecards, scorecards);
  const openWeaknesses = weaknesses.filter(w => w.status === 'open');

  const summary = [
    `Validation run: ${scorecards.length} benchmarks evaluated. Overall score: ${overallScore}%.`,
    `${passed} passed, ${marginal} marginal, ${failed} failed, ${notRated} not rated.`,
    regressionRecords.length > 0 ? `${regressionRecords.length} regression(s) detected.` : 'No regressions detected.',
    openWeaknesses.length > 0 ? `${openWeaknesses.length} known weakness(es) open: ${openWeaknesses.map(w => w.area).join(', ')}.` : 'All known weaknesses addressed.',
  ].join(' ');

  return {
    id: `val-${Date.now()}`,
    runAt: new Date().toISOString(),
    totalBenchmarks: scorecards.length,
    passed, marginal, failed, notRated,
    overallScore,
    scorecards,
    regressionRecords,
    weaknesses,
    summary,
  };
}

export function generateValidationReportHtml(report: ValidationReport): string {
  let html = `<div style="font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px">
<h1 style="font-size:16px">Validation & Calibration Report</h1>
<p style="font-size:11px;color:#666">${report.runAt}</p>
<p style="font-size:11px">${report.summary}</p>

<div style="display:flex;gap:12px;margin:16px 0">
<div style="background:#f0fdf4;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:24px;font-weight:bold;color:#22c55e">${report.passed}</div>
<div style="font-size:10px;color:#666">Passed</div>
</div>
<div style="background:#fff7ed;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:24px;font-weight:bold;color:#f59e0b">${report.marginal}</div>
<div style="font-size:10px;color:#666">Marginal</div>
</div>
<div style="background:#fef2f2;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:24px;font-weight:bold;color:#ef4444">${report.failed}</div>
<div style="font-size:10px;color:#666">Failed</div>
</div>
<div style="background:#f0f0f0;border-radius:6px;padding:10px;text-align:center;flex:1">
<div style="font-size:24px;font-weight:bold;color:#111">${report.overallScore}%</div>
<div style="font-size:10px;color:#666">Score</div>
</div>
</div>`;

  for (const scorecard of report.scorecards) {
    html += `<h3 style="font-size:13px;margin:12px 0 4px">${scorecard.benchmarkName} <span style="font-size:10px;color:${
      scorecard.overallAcceptance === 'pass' ? '#22c55e' : scorecard.overallAcceptance === 'marginal' ? '#f59e0b' : '#ef4444'
    }">(${scorecard.overallAcceptance})</span></h3>`;
    html += `<p style="font-size:10px;color:#666">Score: ${scorecard.overallScore}%</p>`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:10px">
<thead><tr style="background:#f0f0f0;font-weight:600">
<th style="padding:4px;border:1px solid #ddd;text-align:left">Metric</th>
<th style="padding:4px;border:1px solid #ddd;text-align:right">Actual</th>
<th style="padding:4px;border:1px solid #ddd;text-align:right">Expected</th>
<th style="padding:4px;border:1px solid #ddd;text-align:right">Dev %</th>
<th style="padding:4px;border:1px solid #ddd;text-align:left">Status</th>
</tr></thead><tbody>`;
    for (const m of scorecard.metrics) {
      html += `<tr>
<td style="padding:3px;border:1px solid #ddd">${m.name}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${m.actual}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${m.expected}</td>
<td style="padding:3px;border:1px solid #ddd;text-align:right">${m.deviationPct}%</td>
<td style="padding:3px;border:1px solid #ddd;color:${
        m.acceptance === 'pass' ? '#22c55e' : m.acceptance === 'marginal' ? '#f59e0b' : '#ef4444'
      }">${m.acceptance}</td>
</tr>`;
    }
    html += '</tbody></table>';
  }

  if (report.regressionRecords.length > 0) {
    html += `<h3 style="font-size:13px;margin:16px 0 4px;color:#ef4444">Regressions Detected</h3>`;
    for (const r of report.regressionRecords) {
      html += `<p style="font-size:10px">${r.notes} [Status: ${r.status}]</p>`;
    }
  }

  html += `<h3 style="font-size:13px;margin:16px 0 4px">Known Weaknesses</h3>`;
  for (const w of report.weaknesses) {
    html += `<p style="font-size:10px;margin:2px 0"><strong>${w.area}</strong> (${w.impact} impact): ${w.description} [${w.status}]</p>`;
  }

  html += `<p style="font-size:9px;color:#999;margin-top:16px">This report is for internal validation and calibration purposes. It supports release decisions and claim discipline.</p></div>`;
  return html;
}
