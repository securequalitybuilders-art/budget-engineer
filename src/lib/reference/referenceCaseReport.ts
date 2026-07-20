import type { ReferenceCase, ReferenceCaseSummary } from './referenceCaseModel';
import { CALIBRATION_MARKER_ANNOTATIONS } from './referenceCaseModel';
import { getReferenceCases, getCoverageSummary } from './referenceProjectPack';

export interface ReferenceCaseReportData {
  generatedAt: string;
  caseCount: number;
  cases: ReferenceCase[];
  coverageSummary: ReferenceCaseSummary[];
  weakDomains: { domain: string; caseCount: number; cases: string[] }[];
  readinessDistribution: Record<string, number>;
  humanReviewHotspots: { area: string; caseCount: number; severity: string; cases: string[] }[];
}

export function buildReportData(): ReferenceCaseReportData {
  const cases = getReferenceCases();
  const summaries = getCoverageSummary();
  const weakDomainMap = new Map<string, { count: number; cases: string[] }>();
  const reviewMap = new Map<string, { count: number; severity: string; cases: string[] }>();
  const readinessDist: Record<string, number> = {};

  for (const c of cases) {
    const tier = c.pilotReadiness.expectedTier;
    readinessDist[tier] = (readinessDist[tier] ?? 0) + 1;

    for (const link of c.validationLinks) {
      if (link.expectedOutcome.toLowerCase().includes('warning') || link.expectedOutcome.toLowerCase().includes('marginal')) {
        const entry = weakDomainMap.get(link.domain) ?? { count: 0, cases: [] };
        entry.count++;
        entry.cases.push(c.name);
        weakDomainMap.set(link.domain, entry);
      }
    }

    for (const area of c.humanReviewAreas) {
      if (area.severity === 'mandatory') {
        const prev = reviewMap.get(area.area) ?? { count: 0, severity: 'mandatory', cases: [] };
        prev.count++;
        if (!prev.cases.includes(c.name)) prev.cases.push(c.name);
        reviewMap.set(area.area, prev);
      }
    }
  }

  const weakDomains = [...weakDomainMap.entries()]
    .map(([domain, data]) => ({ domain, caseCount: data.count, cases: data.cases }))
    .sort((a, b) => b.caseCount - a.caseCount);

  const humanReviewHotspots = [...reviewMap.entries()]
    .map(([area, data]) => ({ area, caseCount: data.count, severity: data.severity, cases: data.cases }))
    .sort((a, b) => b.caseCount - a.caseCount);

  return {
    generatedAt: new Date().toISOString(),
    caseCount: cases.length,
    cases,
    coverageSummary: summaries,
    weakDomains,
    readinessDistribution: readinessDist,
    humanReviewHotspots,
  };
}

export function formatReferenceCaseHtml(report: ReferenceCaseReportData): string {
  const STYLE = `
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#222;max-width:960px;margin:0 auto;padding:20px}
h1{font-size:16px;margin:0 0 4px;color:#111;border-bottom:2px solid #ddd;padding-bottom:4px}
h2{font-size:13px;margin:16px 0 4px;color:#333}
h3{font-size:11px;margin:12px 0 2px;color:#444}
p{margin:4px 0;font-size:10px;color:#555}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:9px}
th,td{padding:4px 6px;border:1px solid #ddd;text-align:left;vertical-align:top}
th{background:#f5f5f5;font-weight:600}
.badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:7px;font-weight:600}
.badge-green{background:#e8f5e9;color:#2e7d32}
.badge-amber{background:#fff8e1;color:#f59e0b}
.badge-red{background:#fce4ec;color:#c62828}
.badge-blue{background:#e3f2fd;color:#1565c0}
.badge-gray{background:#f5f5f5;color:#666}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:8px;color:#999}
.mandatory{color:#c62828;font-weight:600}
.recommended{color:#e65100}
.info{color:#1565c0}
.confirmed{color:#2e7d32}
.heuristic{color:#e65100}
.assumed{color:#f59e0b}
.unverified{color:#c62828}
`;

  const tierBadge = (tier: string | null) => {
    if (!tier) return '<span class="badge badge-gray">—</span>';
    const map: Record<string, string> = {
      'blocked': 'badge-red',
      'internal-only': 'badge-amber',
      'supervised-professional': 'badge-blue',
      'pilot-deployment': 'badge-green',
    };
    return `<span class="badge ${map[tier] ?? 'badge-gray'}">${tier}</span>`;
  };

  const calibrationSpan = (marker: string) => {
    const cls = marker === 'confirmed-behavior' ? 'confirmed' :
      marker === 'heuristic-output' ? 'heuristic' :
      marker === 'assumed-value' ? 'assumed' : 'unverified';
    const ann = CALIBRATION_MARKER_ANNOTATIONS[marker as keyof typeof CALIBRATION_MARKER_ANNOTATIONS];
    return `<span class="${cls}">${ann?.prefix ?? marker}</span>`;
  };

  let html = `<h1>Reference Case Coverage Report</h1>
<p>${report.caseCount} reference cases · Generated ${new Date(report.generatedAt).toLocaleDateString()}</p>

<h2>Overview</h2>
<table>
<thead><tr><th>Case</th><th>Typology</th><th>Storeys</th><th>Coverage</th><th>Readiness</th><th>Review Items</th><th>Limitations</th></tr></thead><tbody>
${report.coverageSummary.map(s => `<tr>
<td><strong>${s.caseName}</strong></td>
<td>${s.typology}</td>
<td>${s.storeyProfile}</td>
<td>${s.coverageScore}%</td>
<td>${tierBadge(s.readinessTier)}</td>
<td>${s.humanReviewCount}</td>
<td>${s.limitationCount}</td>
</tr>`).join('\n')}
</tbody></table>

<h2>Readiness Distribution</h2>
<table><thead><tr><th>Tier</th><th>Cases</th></tr></thead><tbody>
${Object.entries(report.readinessDistribution).map(([tier, count]) => `<tr><td>${tierBadge(tier)}</td><td>${count}</td></tr>`).join('\n')}
</tbody></table>

<h2>Recurring Weak Domains</h2>
${report.weakDomains.length === 0 ? '<p>No recurring weak domains identified.</p>' : `
<table><thead><tr><th>Domain</th><th>Affected Cases</th><th>Cases</th></tr></thead><tbody>
${report.weakDomains.map(d => `<tr><td>${d.domain}</td><td>${d.caseCount}</td><td style="font-size:8px">${d.cases.join(', ')}</td></tr>`).join('\n')}
</tbody></table>`}

<h2>Human Review Hotspots</h2>
${report.humanReviewHotspots.length === 0 ? '<p>No mandatory human review hotspots identified.</p>' : `
<table><thead><tr><th>Area</th><th>Cases</th><th>Cases Requiring Review</th></tr></thead><tbody>
${report.humanReviewHotspots.map(h => `<tr><td><span class="mandatory">${h.area}</span></td><td>${h.caseCount}</td><td style="font-size:8px">${h.cases.join(', ')}</td></tr>`).join('\n')}
</tbody></table>`}

<h2>Case Detail</h2>
${report.cases.map(c => `<div style="margin:12px 0;padding:8px;border:1px solid #eee;border-radius:4px">
<h3>${c.name}</h3>
<p><em>${c.description}</em></p>

<p><strong>Typology:</strong> ${c.typology} · <strong>Storeys:</strong> ${c.storeyProfile} · <strong>Workflow:</strong> ${c.workflowScope.join(', ')}</p>

<p><strong>Pilot Readiness:</strong> ${tierBadge(c.pilotReadiness.expectedTier)}</p>
<p><strong>Supervision:</strong> ${c.pilotReadiness.supervisionContext}</p>

<p><strong>Expected Outputs:</strong></p>
<table><thead><tr><th>Output</th><th>Calibration</th><th>Note</th></tr></thead><tbody>
${c.expectedOutputs.map(o => `<tr><td>${o.output}</td><td>${calibrationSpan(o.calibration)}</td><td style="font-size:8px">${o.note}</td></tr>`).join('\n')}
</tbody></table>

${c.humanReviewAreas.length > 0 ? `<p><strong>Human Review Areas:</strong></p>
<table><thead><tr><th>Area</th><th>Why</th><th>Severity</th></tr></thead><tbody>
${c.humanReviewAreas.map(h => `<tr><td>${h.area}</td><td style="font-size:8px">${h.why}</td><td><span class="${h.severity}">${h.severity}</span></td></tr>`).join('\n')}
</tbody></table>` : ''}

${c.knownLimitations.length > 0 ? `<p><strong>Known Limitations:</strong></p>
<table><thead><tr><th>Area</th><th>Impact</th><th>Status</th></tr></thead><tbody>
${c.knownLimitations.map(l => `<tr><td style="font-size:9px"><strong>${l.area}</strong><br><span style="font-size:8px;color:#888">${l.description}</span></td><td>${l.impact}</td><td>${l.status}</td></tr>`).join('\n')}
</tbody></table>` : ''}
</div>`).join('\n')}

<div class="footer">Generated by Budget Engineer v4.0.0 — ${new Date().toISOString()}</div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reference Case Coverage</title><style>${STYLE}</style></head><body>${html}</body></html>`;
}

export function formatReferenceCaseJson(report: ReferenceCaseReportData): string {
  return JSON.stringify(report, null, 2);
}

export function formatReferenceCaseText(report: ReferenceCaseReportData): string {
  const lines: string[] = [
    'REFERENCE CASE COVERAGE REPORT',
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Total Cases: ${report.caseCount}`,
    '',
    'COVERAGE SUMMARY',
    '────────────────',
  ];

  for (const s of report.coverageSummary) {
    lines.push(`  ${s.caseName}`);
    lines.push(`    Typology: ${s.typology} · Storeys: ${s.storeyProfile} · Coverage: ${s.coverageScore}% · Readiness: ${s.readinessTier ?? '—'} · Human Review: ${s.humanReviewCount} items · Limitations: ${s.limitationCount}`);
    if (s.recommendedFor.length > 0) lines.push(`    Recommended for: ${s.recommendedFor.join(', ')}`);
    if (s.notRecommendedFor.length > 0) lines.push(`    Not recommended for: ${s.notRecommendedFor.join(', ')}`);
    lines.push('');
  }

  lines.push('READINESS DISTRIBUTION');
  lines.push('────────────────');
  for (const [tier, count] of Object.entries(report.readinessDistribution)) {
    lines.push(`  ${tier}: ${count}`);
  }
  lines.push('');

  if (report.weakDomains.length > 0) {
    lines.push('RECURRING WEAK DOMAINS');
    lines.push('────────────────');
    for (const d of report.weakDomains) {
      lines.push(`  ${d.domain} — ${d.caseCount} case(s): ${d.cases.join(', ')}`);
    }
    lines.push('');
  }

  if (report.humanReviewHotspots.length > 0) {
    lines.push('HUMAN REVIEW HOTSPOTS (Mandatory)');
    lines.push('───────────────────────────');
    for (const h of report.humanReviewHotspots) {
      lines.push(`  ${h.area} — ${h.caseCount} case(s): ${h.cases.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('CASE DETAILS');
  lines.push('───────────');
  for (const c of report.cases) {
    lines.push(`  ${c.name} (${c.typology}, ${c.storeyProfile})`);
    lines.push(`    Readiness: ${c.pilotReadiness.expectedTier}`);
    lines.push(`    Supervision: ${c.pilotReadiness.supervisionContext}`);
    lines.push('    Supervision Requirements:');
    for (const r of c.pilotReadiness.supervisionRequirements) {
      lines.push(`      · ${r}`);
    }
    if (c.knownLimitations.length > 0) {
      lines.push('    Known Limitations:');
      for (const l of c.knownLimitations) {
        lines.push(`      · [${l.impact}] ${l.area}: ${l.description}`);
      }
    }
    lines.push('');
  }

  lines.push('─'.repeat(30));
  lines.push('Generated by Budget Engineer v4.0.0');

  return lines.join('\n');
}

export function downloadReferenceCaseReport(): void {
  const report = buildReportData();
  const html = formatReferenceCaseHtml(report);
  const json = formatReferenceCaseJson(report);
  const text = formatReferenceCaseText(report);

  const blobHtml = new Blob([html], { type: 'text/html' });
  const blobJson = new Blob([json], { type: 'application/json' });
  const blobText = new Blob([text], { type: 'text/plain' });

  const urlHtml = URL.createObjectURL(blobHtml);
  const urlJson = URL.createObjectURL(blobJson);
  const urlText = URL.createObjectURL(blobText);

  const aHtml = document.createElement('a'); aHtml.href = urlHtml; aHtml.download = `reference-case-report-${Date.now()}.html`; aHtml.click();
  const aJson = document.createElement('a'); aJson.href = urlJson; aJson.download = `reference-case-report-${Date.now()}.json`; aJson.click();
  const aText = document.createElement('a'); aText.href = urlText; aText.download = `reference-case-report-${Date.now()}.txt`; aText.click();

  setTimeout(() => {
    URL.revokeObjectURL(urlHtml);
    URL.revokeObjectURL(urlJson);
    URL.revokeObjectURL(urlText);
  }, 10000);
}
