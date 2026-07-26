import type { BenchmarkReference, BenchmarkMetric, CalibrationScorecard } from './validationEngine';

export type TransparencyLabel = 'assumed' | 'heuristic' | 'unverified' | 'verified';

export interface TransparencyAnnotation {
  label: TransparencyLabel;
  prefix: string;
  description: string;
  requiresConfirmation: boolean;
  confirmationNote?: string;
}

export const TRANSPARENCY_LABELS: Record<TransparencyLabel, TransparencyAnnotation> = {
  assumed: {
    label: 'assumed',
    prefix: '[ASSUMED]',
    description: 'Value is assumed based on typical industry defaults. No project-specific data was provided.',
    requiresConfirmation: true,
    confirmationNote: 'CONFIRM WITH ACTUAL PROJECT DATA BEFORE CONSTRUCTION',
  },
  heuristic: {
    label: 'heuristic',
    prefix: '[HEURISTIC]',
    description: 'Value is derived from heuristic rules and empirical formulas. Accuracy depends on typology match.',
    requiresConfirmation: false,
  },
  unverified: {
    label: 'unverified',
    prefix: '[UNVERIFIED]',
    description: 'Output has not been verified against real project data or expert review.',
    requiresConfirmation: true,
    confirmationNote: 'CONFIRM BEFORE CONSTRUCTION',
  },
  verified: {
    label: 'verified',
    prefix: '[VERIFIED]',
    description: 'Value has been verified against benchmark references or expert review.',
    requiresConfirmation: false,
  },
};

export interface AnnotatedMetric {
  metric: BenchmarkMetric;
  transparency: TransparencyLabel;
  annotatedName: string;
}

export interface AnnotatedScorecard {
  scorecard: CalibrationScorecard;
  annotations: AnnotatedMetric[];
  overallTransparency: TransparencyLabel;
}

const HEURISTIC_METRIC_PATTERNS = [
  /load.*esti/i,
  /weight/i,
  /span/i,
  /thickness/i,
  /demand/i,
  /circuit.*load/i,
  /breaker/i,
];

const ASSUMED_METRIC_PATTERNS = [
  /score/i,
  /recommendation/i,
  /diagram/i,
  /count/i,
];

const UNVERIFIED_BENCHMARK_PATTERNS = [
  /bm-(plan|site|interior|structural|mep|review|delivery|boq|sched|code)-\d+/i,
  /bm-(site|interior|structural|mep|review|delivery|boq|sched)-(terrain|adjacent|wardrobe|export|slab|loading|demand|circuit|bad|good|signoff|register)/i,
];

export function annotateMetric(metric: BenchmarkMetric, benchmarkId: string): AnnotatedMetric {
  let transparency: TransparencyLabel = 'verified';

  if (HEURISTIC_METRIC_PATTERNS.some(p => p.test(metric.name))) {
    transparency = 'heuristic';
  } else if (ASSUMED_METRIC_PATTERNS.some(p => p.test(metric.name))) {
    transparency = 'assumed';
  }

  if (transparency === 'verified' && UNVERIFIED_BENCHMARK_PATTERNS.some(p => p.test(benchmarkId))) {
    transparency = 'unverified';
  }

  const annotation = TRANSPARENCY_LABELS[transparency];
  const annotatedName = `${annotation.prefix} ${metric.name}`;

  return { metric, transparency, annotatedName };
}

export function annotateScorecard(scorecard: CalibrationScorecard): AnnotatedScorecard {
  const annotations = scorecard.metrics.map(m => annotateMetric(m, scorecard.benchmarkId));
  const labels = annotations.map(a => a.transparency);
  const overallTransparency: TransparencyLabel =
    labels.includes('unverified') ? 'unverified' :
    labels.includes('heuristic') ? 'heuristic' :
    labels.includes('assumed') ? 'assumed' :
    'verified';

  return { scorecard, annotations, overallTransparency };
}

export function annotateBenchmarks(benchmarks: BenchmarkReference[]): BenchmarkReference[] {
  return benchmarks.map(b => {
    const isUnverified = UNVERIFIED_BENCHMARK_PATTERNS.some(p => p.test(b.id));
    if (isUnverified && b.sourceType === 'reference-design') {
      return { ...b, notes: `${TRANSPARENCY_LABELS.unverified.prefix} ${b.notes} ${TRANSPARENCY_LABELS.unverified.confirmationNote}` };
    }
    const isHeuristic = b.sourceType === 'published-data' || b.sourceType === 'qs-estimate';
    if (isHeuristic) {
      return { ...b, notes: `${TRANSPARENCY_LABELS.heuristic.prefix} ${b.notes}` };
    }
    const isAssumed = b.sourceType === 'expert-review';
    if (isAssumed) {
      return { ...b, notes: `${TRANSPARENCY_LABELS.assumed.prefix} ${b.notes}` };
    }
    if (b.sourceType === 'real-project') {
      return { ...b, notes: `${TRANSPARENCY_LABELS.verified.prefix} ${b.notes}` };
    }
    return b;
  });
}

export function formatTransparencyHtml(annotatedScorecards: AnnotatedScorecard[]): string {
  let html = `<div style="font-family:sans-serif;font-size:10px;margin-top:12px">
<h4 style="font-size:11px;margin:0 0 6px">Calibration Transparency</h4>
<p style="font-size:9px;color:#666;margin:0 0 8px">Each benchmark metric is labelled with its evidence basis:
<span style="background:#22c55e20;color:#22c55e;padding:1px 4px;border-radius:2px">[VERIFIED]</span>
<span style="background:#f59e0b20;color:#f59e0b;padding:1px 4px;border-radius:2px">[HEURISTIC]</span>
<span style="background:#6366f120;color:#6366f1;padding:1px 4px;border-radius:2px">[ASSUMED]</span>
<span style="background:#ef444420;color:#ef4444;padding:1px 4px;border-radius:2px">[UNVERIFIED]</span>
</p>`;

  for (const asc of annotatedScorecards) {
    const colorMap: Record<string, string> = { verified: '#22c55e', heuristic: '#f59e0b', assumed: '#6366f1', unverified: '#ef4444' };
    const color = colorMap[asc.overallTransparency] ?? '#999';
    html += `<div style="margin-bottom:8px;border:1px solid #eee;border-radius:4px;padding:6px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
<strong style="font-size:10px">${asc.scorecard.benchmarkName}</strong>
<span style="font-size:8px;background:${color}20;color:${color};padding:1px 4px;border-radius:2px">${TRANSPARENCY_LABELS[asc.overallTransparency].prefix}</span>
</div>`;
    for (const a of asc.annotations) {
      const mColor = colorMap[a.transparency] ?? '#999';
      html += `<div style="display:flex;justify-content:space-between;font-size:9px;padding:1px 0">
<span><span style="color:${mColor}">${TRANSPARENCY_LABELS[a.transparency].prefix}</span> ${a.metric.name}</span>
<span>${a.metric.actual} / ${a.metric.expected} (${a.metric.deviationPct}%)</span>
</div>`;
    }
    html += `</div>`;
  }

  html += `<p style="font-size:8px;color:#999;margin-top:8px">Transparency labels indicate the evidence basis for each metric. [UNVERIFIED] items require expert confirmation before construction.</p>`;
  html += `</div>`;
  return html;
}
