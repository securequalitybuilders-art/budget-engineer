import { CAPABILITY_GROUPS } from './productPackagingModel';
import type { AudienceProfile } from './productPackagingModel';
import { generateCapabilityManifest } from './capabilityManifest';
import { recommendDeployment, formatRecommendationHtml } from './deploymentRecommender';
import type { DeploymentRecommendation } from './deploymentRecommender';
import { EVALUATION_CHECKLIST, getSupervisedUseGuidance } from './evaluationChecklist';

export interface ChecklistStateEntry {
  checked: boolean;
  notes: string;
}

export interface EvaluationReport {
  productName: string;
  productVersion: string;
  generatedAt: string;
  capabilitySummary: {
    total: number;
    mature: number;
    established: number;
    emerging: number;
    foundation: number;
    requiresHumanReview: number;
    humanReviewPct: number;
  };
  deploymentRecommendation: DeploymentRecommendation;
  validationSummary: {
    benchmarkScore: number;
    totalBenchmarks: number;
    passedBenchmarks: number;
    failedBenchmarks: number;
    pilotTier: string;
  } | null;
  checklistSummary: {
    total: number;
    checked: number;
    completionPct: number;
    unresolvedCategories: string[];
  };
  humanReviewAreas: string[];
  knownLimitations: string[];
  supervisionGuidance: string;
}

export function generateEvaluationReport(
  version: string,
  audiences: AudienceProfile[],
  teamSize: number,
  hasDocker: boolean,
  hasStaticHost: boolean,
  checklistState: Record<string, ChecklistStateEntry>,
  validationData?: {
    benchmarkScore: number;
    totalBenchmarks: number;
    passedBenchmarks: number;
    failedBenchmarks: number;
    pilotTier: string;
  } | null,
): EvaluationReport {
  const capabilityManifest = generateCapabilityManifest(version);
  const completedItems = Object.values(checklistState).filter(e => e.checked).length;
  const totalItems = EVALUATION_CHECKLIST.length;

  const checkedCategories = new Set<string>();
  const allCategories = new Set(EVALUATION_CHECKLIST.map(i => i.category));
  for (const item of EVALUATION_CHECKLIST) {
    if (checklistState[item.id]?.checked) {
      checkedCategories.add(item.category);
    }
  }
  const unresolvedCategories = [...allCategories].filter(c => !checkedCategories.has(c));

  const humanReviewAreas = CAPABILITY_GROUPS
    .filter(g => g.requiresHumanReview)
    .map(g => `${g.label}: ${g.humanReviewNote}`);

  const maturityCounts = {
    mature: CAPABILITY_GROUPS.filter(g => g.maturity === 'mature').length,
    established: CAPABILITY_GROUPS.filter(g => g.maturity === 'established').length,
    emerging: CAPABILITY_GROUPS.filter(g => g.maturity === 'emerging').length,
    foundation: CAPABILITY_GROUPS.filter(g => g.maturity === 'foundation').length,
  };

  return {
    productName: 'Budget Engineer',
    productVersion: version,
    generatedAt: new Date().toISOString(),
    capabilitySummary: {
      total: capabilityManifest.totalCapabilities,
      ...maturityCounts,
      requiresHumanReview: capabilityManifest.requiresHumanReviewCount,
      humanReviewPct: capabilityManifest.totalCapabilities > 0
        ? Math.round((capabilityManifest.requiresHumanReviewCount / capabilityManifest.totalCapabilities) * 100)
        : 0,
    },
    deploymentRecommendation: recommendDeployment(audiences, teamSize, hasDocker, hasStaticHost),
    validationSummary: validationData ?? null,
    checklistSummary: {
      total: totalItems,
      checked: completedItems,
      completionPct: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      unresolvedCategories,
    },
    humanReviewAreas,
    knownLimitations: [
      'Building code compliance is approximate — always verify with local authority.',
      'Structural and MEP outputs are pre-design, not final engineering.',
      'No .dwg or .rvt import/export. Use DXF for CAD interoperability.',
      'No multi-user sync or real-time collaboration.',
      'Cost rates are regional defaults — not suitable for tendering without QS review.',
      'Data is browser-bound — export projects for backup.',
    ],
    supervisionGuidance: getSupervisedUseGuidance(),
  };
}

export function formatEvaluationReportHtml(report: EvaluationReport): string {
  let html = `<h1>Evaluation Report — ${report.productName} ${report.productVersion}</h1>
<p style="font-size:10px;color:#666">Generated: ${new Date(report.generatedAt).toISOString()}</p>

<h2>1. Capability Summary</h2>
<div style="display:flex;gap:8px;margin:8px 0">
<div style="background:#e8f5e9;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:16px;font-weight:bold;color:#2e7d32">${report.capabilitySummary.mature}</div>
<div style="font-size:8px;color:#666">Mature</div>
</div>
<div style="background:#e3f2fd;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:16px;font-weight:bold;color:#1565c0">${report.capabilitySummary.established}</div>
<div style="font-size:8px;color:#666">Established</div>
</div>
<div style="background:#fff3e0;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:16px;font-weight:bold;color:#e65100">${report.capabilitySummary.emerging}</div>
<div style="font-size:8px;color:#666">Emerging</div>
</div>
<div style="background:#fce4ec;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:16px;font-weight:bold;color:#c62828">${report.capabilitySummary.foundation}</div>
<div style="font-size:8px;color:#666">Foundation</div>
</div>
</div>
<p style="font-size:10px;color:#555">${report.capabilitySummary.requiresHumanReview}/${report.capabilitySummary.total} capabilities (${report.capabilitySummary.humanReviewPct}%) require human review.</p>

${formatRecommendationHtml(report.deploymentRecommendation)}

<h2>3. Validation & Pilot Readiness</h2>`;

  if (report.validationSummary) {
    html += `<div style="display:flex;gap:8px;margin:8px 0">
<div style="background:#f0fdf4;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:14px;font-weight:bold;color:#22c55e">${report.validationSummary.benchmarkScore}%</div>
<div style="font-size:8px;color:#666">Score</div>
</div>
<div style="background:#f0fdf4;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:14px;font-weight:bold;color:#22c55e">${report.validationSummary.passedBenchmarks}/${report.validationSummary.totalBenchmarks}</div>
<div style="font-size:8px;color:#666">Passed</div>
</div>
<div style="background:#fef2f2;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:14px;font-weight:bold;color:#ef4444">${report.validationSummary.failedBenchmarks}</div>
<div style="font-size:8px;color:#666">Failed</div>
</div>
<div style="background:#e3f2fd;border-radius:4px;padding:6px 10px;text-align:center;flex:1">
<div style="font-size:14px;font-weight:bold;color:#6366f1">${report.validationSummary.pilotTier}</div>
<div style="font-size:8px;color:#666">Pilot Tier</div>
</div>
</div>`;
  } else {
    html += `<p style="font-size:10px;color:#888">No validation data available. Run validation benchmarks to populate this section.</p>`;
  }

  html += `<h2>4. Evaluation Checklist Progress</h2>
<p style="font-size:10px;color:#555">${report.checklistSummary.checked}/${report.checklistSummary.total} items completed (${report.checklistSummary.completionPct}%).</p>`;

  if (report.checklistSummary.unresolvedCategories.length > 0) {
    html += `<p style="font-size:9px;color:#c62828">Unresolved categories: ${report.checklistSummary.unresolvedCategories.join(', ')}</p>`;
  }

  html += `<h2>5. Human Review Requirements</h2>
<p style="font-size:10px;color:#555">The following ${report.humanReviewAreas.length} capability groups produce outputs requiring professional review:</p>
<ul style="margin:4px 0;padding-left:16px">`;
  for (const area of report.humanReviewAreas) {
    html += `<li style="font-size:9px;color:#555;margin:2px 0">${area}</li>`;
  }
  html += `</ul>

<h2>6. Known Limitations</h2>
<ul style="margin:4px 0;padding-left:16px">`;
  for (const lim of report.knownLimitations) {
    html += `<li style="font-size:9px;color:#888">${lim}</li>`;
  }
  html += `</ul>`;

  html += `<h2>7. Supervision Guidance</h2>
<div style="font-size:9px;color:#555;white-space:pre-line">${report.supervisionGuidance}</div>`;

  return html;
}

export function formatEvaluationReportJson(report: EvaluationReport): string {
  return JSON.stringify(report, null, 2);
}
