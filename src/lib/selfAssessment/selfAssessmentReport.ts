import type { SelfAssessmentResult } from './selfAssessmentModel';
import { CALIBRATION_MARKER_ANNOTATIONS } from '@/lib/reference/referenceCaseModel';

function calibrationLabel(marker: string): string {
  const ann = CALIBRATION_MARKER_ANNOTATIONS[marker as keyof typeof CALIBRATION_MARKER_ANNOTATIONS];
  return ann?.prefix ?? marker;
}

export interface SelfAssessmentReportData {
  generatedAt: string;
  projectName: string;
  typology: string;
  storeyProfile: string;
  matchedCaseCount: number;
  supervision: {
    tier: string;
    label: string;
    rationale: string;
    reviewCount: number;
  };
  domainSummary: {
    strong: number;
    adequate: number;
    weak: number;
    notRated: number;
  };
  riskCount: number;
  result: SelfAssessmentResult;
}

export function buildSelfAssessmentReportData(result: SelfAssessmentResult): SelfAssessmentReportData {
  return {
    generatedAt: result.generatedAt,
    projectName: result.snapshot.projectName,
    typology: result.snapshot.typology,
    storeyProfile: result.snapshot.storeyProfile,
    matchedCaseCount: result.matchedCases.length,
    supervision: {
      tier: result.supervision.recommendedTier,
      label: result.supervision.tierLabel,
      rationale: result.supervision.rationale,
      reviewCount: result.supervision.humanReviewCount,
    },
    domainSummary: {
      strong: result.domainRatings.filter(d => d.rating === 'strong').length,
      adequate: result.domainRatings.filter(d => d.rating === 'adequate').length,
      weak: result.domainRatings.filter(d => d.rating === 'weak').length,
      notRated: result.domainRatings.filter(d => d.rating === 'not-rated').length,
    },
    riskCount: result.risks.length,
    result,
  };
}

export function formatSelfAssessmentHtml(report: SelfAssessmentReportData): string {
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
.strong{color:#2e7d32;font-weight:600}
.adequate{color:#e65100}
.weak{color:#c62828;font-weight:600}
.not-rated{color:#999}
.heuristic{color:#e65100}
.assumed{color:#f59e0b}
.unverified{color:#c62828}
.confirmed{color:#2e7d32}
.footer{margin-top:20px;padding-top:8px;border-top:1px solid #ddd;font-size:8px;color:#999}
`;

  const tierBadge = (tier: string) => {
    const map: Record<string, string> = {
      'blocked': 'badge-red',
      'internal-only': 'badge-amber',
      'supervised-professional': 'badge-blue',
      'pilot-deployment': 'badge-green',
    };
    return `<span class="badge ${map[tier] ?? 'badge-gray'}">${tier}</span>`;
  };

  const r = report.result;

  const html = `<h1>Self-Assessment Report</h1>
<p><strong>${report.projectName}</strong> — ${report.typology}, ${report.storeyProfile}</p>
<p>Generated ${new Date(report.generatedAt).toLocaleDateString()} · ${report.matchedCaseCount} matched reference case(s)</p>

<h2>Snapshot</h2>
<table>
<thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>
<tr><td>Typology</td><td>${r.snapshot.typology}</td></tr>
<tr><td>Storey Profile</td><td>${r.snapshot.storeyProfile}</td></tr>
<tr><td>Workflow Scope</td><td>${r.snapshot.workflowScope.join(', ')}</td></tr>
<tr><td>Notes</td><td>${r.snapshot.notes || '—'}</td></tr>
</tbody></table>

<h2>Validation Domain Summary</h2>
<table>
<thead><tr><th>Domain</th><th>Rating</th><th>Calibration</th><th>Reason</th></tr></thead><tbody>
${r.domainRatings.map(d => `<tr>
<td>${d.domain}</td>
<td><span class="${d.rating}">${d.rating}</span></td>
<td>${calibrationLabel(d.calibration)}</td>
<td style="font-size:8px">${d.reason}</td>
</tr>`).join('\n')}
</tbody></table>
<p><strong>Summary:</strong> ${report.domainSummary.strong} strong, ${report.domainSummary.adequate} adequate, ${report.domainSummary.weak} weak, ${report.domainSummary.notRated} not rated</p>

<h2>Matched Reference Cases</h2>
${r.matchedCases.length === 0 ? '<p>No reference cases matched this project profile.</p>' : `
<table>
<thead><tr><th>Case</th><th>Similarity</th><th>Typology</th><th>Storey</th><th>Workflow Overlap</th></tr></thead><tbody>
${r.matchedCases.map(mc => `<tr>
<td><strong>${mc.caseName}</strong></td>
<td>${mc.similarityScore}%</td>
<td>${mc.typologyMatch ? '✓' : '✗'}</td>
<td>${mc.storeyMatch ? '✓' : '✗'}</td>
<td>${mc.workflowMatch} shared</td>
</tr>`).join('\n')}
</tbody></table>
${r.matchedCases[0] ? `<p><strong>Top match:</strong> ${r.matchedCases[0].caseName} (${r.matchedCases[0].similarityScore}% similarity)</p>` : ''}`}

${r.matchedCases.length > 0 ? `<h3>Strengths & Gaps — Top Match</h3>
${r.matchedCases[0].strengths.map(s => `<p style="color:#2e7d32;font-size:9px">✓ ${s}</p>`).join('\n')}
${r.matchedCases[0].gaps.map(g => `<p style="color:#c62828;font-size:9px">✗ ${g}</p>`).join('\n')}` : ''}

<h2>Supervision & Readiness</h2>
<p><strong>Readiness Tier:</strong> ${tierBadge(report.supervision.tier)}</p>
<p><strong>Label:</strong> ${report.supervision.label}</p>
<p><strong>Rationale:</strong> ${report.supervision.rationale}</p>
<p><strong>Human Review Count:</strong> ${report.supervision.reviewCount} item(s)</p>

${r.supervision.supervisionRequirements.length > 0 ? `
<h3>Supervision Requirements</h3>
<ul style="font-size:9px;margin:4px 0;padding-left:16px">
${r.supervision.supervisionRequirements.map(req => `<li>${req}</li>`).join('\n')}
</ul>` : ''}

${r.supervision.mandatoryReviewAreas.length > 0 ? `
<h3>Mandatory Review Areas</h3>
<ul style="font-size:9px;margin:4px 0;padding-left:16px;color:#c62828">
${r.supervision.mandatoryReviewAreas.map(a => `<li>${a}</li>`).join('\n')}
</ul>` : ''}

<h2>Key Risks & Assumptions</h2>
${r.risks.length === 0 ? '<p>No significant risks identified.</p>' : `
<table>
<thead><tr><th>Area</th><th>Impact</th><th>Calibration</th><th>Recommendation</th></tr></thead><tbody>
${r.risks.map(risk => `<tr>
<td style="font-weight:600">${risk.area}</td>
<td>${risk.impact}</td>
<td>${calibrationLabel(risk.calibration)}</td>
<td style="font-size:8px">${risk.recommendation}</td>
</tr>`).join('\n')}
</tbody></table>`}

<h2>Recommended Deployment Context</h2>
${r.deploymentContext.recommendedFor.length > 0 ? `
<p><strong>Recommended for:</strong></p>
<ul style="font-size:9px;margin:4px 0;padding-left:16px;color:#2e7d32">
${r.deploymentContext.recommendedFor.map(item => `<li>${item}</li>`).join('\n')}
</ul>` : '<p>No specific recommendations.</p>'}

${r.deploymentContext.notRecommendedFor.length > 0 ? `
<p><strong>Not recommended for:</strong></p>
<ul style="font-size:9px;margin:4px 0;padding-left:16px;color:#c62828">
${r.deploymentContext.notRecommendedFor.map(item => `<li>${item}</li>`).join('\n')}
</ul>` : ''}

${r.deploymentContext.limitations.length > 0 ? `
<h3>Cross-Case Limitations</h3>
<ul style="font-size:9px;margin:4px 0;padding-left:16px;color:#e65100">
${r.deploymentContext.limitations.map(l => `<li>${l}</li>`).join('\n')}
</ul>` : ''}

<div class="footer">
<p>Generated by Budget Engineer v4.0.0 — Self-Assessment Module</p>
<p><strong>Important:</strong> This self-assessment is for internal capability evaluation only. It does not constitute professional design approval, regulatory signoff, or certification of fitness for construction. All outputs require qualified professional review before use in real projects.</p>
<p>Calibration key: ${calibrationLabel('confirmed-behavior')} = confirmed platform behavior · ${calibrationLabel('heuristic-output')} = heuristic/inferred · ${calibrationLabel('assumed-value')} = assumed value · ${calibrationLabel('unverified-before-construction')} = requires confirmation before construction</p>
</div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Self-Assessment — ${report.projectName}</title><style>${STYLE}</style></head><body>${html}</body></html>`;
}

export function formatSelfAssessmentJson(report: SelfAssessmentReportData): string {
  return JSON.stringify(report, null, 2);
}

export function formatSelfAssessmentText(report: SelfAssessmentReportData): string {
  const r = report.result;
  const lines: string[] = [
    'SELF-ASSESSMENT REPORT',
    `Project: ${report.projectName}`,
    `Typology: ${report.typology} · Storeys: ${report.storeyProfile}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Matched Reference Cases: ${report.matchedCaseCount}`,
    '',
    'VALIDATION DOMAINS',
    '────────────────',
  ];

  for (const d of r.domainRatings) {
    lines.push(`  ${d.domain}: ${d.rating} [${calibrationLabel(d.calibration)}] — ${d.reason}`);
  }
  lines.push(`  Summary: ${report.domainSummary.strong} strong, ${report.domainSummary.adequate} adequate, ${report.domainSummary.weak} weak, ${report.domainSummary.notRated} not rated`);
  lines.push('');

  if (r.matchedCases.length > 0) {
    lines.push('MATCHED REFERENCE CASES');
    lines.push('─────────────────────');
    for (const mc of r.matchedCases) {
      lines.push(`  ${mc.caseName} — ${mc.similarityScore}% match`);
      lines.push(`    Typology: ${mc.typologyMatch ? '✓' : '✗'} · Storey: ${mc.storeyMatch ? '✓' : '✗'} · Workflow overlap: ${mc.workflowMatch}`);
      for (const s of mc.strengths) lines.push(`    + ${s}`);
      for (const g of mc.gaps) lines.push(`    - ${g}`);
    }
    lines.push('');
  }

  lines.push('SUPERVISION & READINESS');
  lines.push('──────────────────────');
  lines.push(`  Tier: ${report.supervision.tier} (${report.supervision.label})`);
  lines.push(`  Rationale: ${report.supervision.rationale}`);
  lines.push(`  Human review items: ${report.supervision.reviewCount}`);
  if (r.supervision.supervisionRequirements.length > 0) {
    lines.push('  Supervision requirements:');
    for (const req of r.supervision.supervisionRequirements) lines.push(`    · ${req}`);
  }
  lines.push('');

  if (r.risks.length > 0) {
    lines.push('KEY RISKS & ASSUMPTIONS');
    lines.push('───────────────────────');
    for (const risk of r.risks) {
      lines.push(`  [${risk.impact}] ${risk.area} (${calibrationLabel(risk.calibration)})`);
      lines.push(`    ${risk.recommendation}`);
    }
    lines.push('');
  }

  lines.push('DEPLOYMENT CONTEXT');
  lines.push('──────────────────');
  if (r.deploymentContext.recommendedFor.length > 0) {
    lines.push('  Recommended for:');
    for (const item of r.deploymentContext.recommendedFor) lines.push(`    + ${item}`);
  }
  if (r.deploymentContext.notRecommendedFor.length > 0) {
    lines.push('  Not recommended for:');
    for (const item of r.deploymentContext.notRecommendedFor) lines.push(`    - ${item}`);
  }
  lines.push('');
  lines.push('─'.repeat(40));
  lines.push('Generated by Budget Engineer v4.0.0 — Self-Assessment Module');
  lines.push('');
  lines.push('IMPORTANT: This self-assessment is for internal capability evaluation only.');
  lines.push('It does not constitute professional design approval, regulatory signoff,');
  lines.push('or certification of fitness for construction. All outputs require qualified');
  lines.push('professional review before use in real projects.');

  return lines.join('\n');
}

export function downloadSelfAssessmentReport(result: SelfAssessmentResult): void {
  const report = buildSelfAssessmentReportData(result);
  const html = formatSelfAssessmentHtml(report);
  const json = formatSelfAssessmentJson(report);
  const text = formatSelfAssessmentText(report);

  const blobHtml = new Blob([html], { type: 'text/html' });
  const blobJson = new Blob([json], { type: 'application/json' });
  const blobText = new Blob([text], { type: 'text/plain' });

  const urlHtml = URL.createObjectURL(blobHtml);
  const urlJson = URL.createObjectURL(blobJson);
  const urlText = URL.createObjectURL(blobText);

  const ts = Date.now();
  const aHtml = document.createElement('a'); aHtml.href = urlHtml; aHtml.download = `self-assessment-${ts}.html`; aHtml.click();
  const aJson = document.createElement('a'); aJson.href = urlJson; aJson.download = `self-assessment-${ts}.json`; aJson.click();
  const aText = document.createElement('a'); aText.href = urlText; aText.download = `self-assessment-${ts}.txt`; aText.click();

  setTimeout(() => {
    URL.revokeObjectURL(urlHtml);
    URL.revokeObjectURL(urlJson);
    URL.revokeObjectURL(urlText);
  }, 10000);
}
