import type { ValidationReport } from './validationEngine';
import { classifyValidationResults } from './validationEngine';

export type PilotDeploymentTier = 'blocked' | 'internal-only' | 'supervised-professional' | 'pilot-deployment';

export interface PilotReadinessReport {
  tier: PilotDeploymentTier;
  label: string;
  description: string;
  reason: string;
  canProceedToPilot: boolean;
  blockers: string[];
  warnings: string[];
  reviewRequirements: string[];
  benchmarkScore: number;
  totalBenchmarks: number;
  passedBenchmarks: number;
  failedBenchmarks: number;
  validationFailures: number;
  validationWarnings: number;
  openWeaknesses: number;
  regressionsDetected: number;
}

const TIER_META: Record<PilotDeploymentTier, { label: string; description: string }> = {
  'blocked': {
    label: 'Blocked',
    description: 'Critical validation failures prevent any deployment.',
  },
  'internal-only': {
    label: 'Internal Only',
    description: 'Suitable for internal team use and development testing only. Not for client or production environments.',
  },
  'supervised-professional': {
    label: 'Supervised Professional',
    description: 'Can be used by professionals under supervision. All outputs require human review before use.',
  },
  'pilot-deployment': {
    label: 'Pilot Deployment',
    description: 'Ready for limited pilot deployment with monitored usage. Suitable for real projects with professional oversight.',
  },
};

export function assessPilotReadiness(report: ValidationReport): PilotReadinessReport {
  const { failures, warnings, requiresHumanReview } = classifyValidationResults(report.validationResults);

  const blockers: string[] = [];
  const warningsList: string[] = [];
  const reviewRequirements: string[] = [];

  for (const f of failures) {
    blockers.push(`[${f.domain}] ${f.reason}`);
  }
  for (const w of warnings) {
    warningsList.push(`[${w.domain}] ${w.reason}`);
  }
  for (const r of requiresHumanReview) {
    if (r.humanReviewNote) {
      reviewRequirements.push(`[${r.domain}] ${r.humanReviewNote}`);
    }
  }

  const hasRegressions = report.regressionRecords.length > 0;
  const openWeakCount = report.weaknesses.filter(w => w.status === 'open').length;
  const anyCriticalRegression = report.regressionRecords.some(r => r.delta < -15);

  let tier: PilotDeploymentTier;
  let reason: string;

  if (report.failed > 0 || failures.length > 0) {
    tier = 'blocked';
    reason = `Blocked by ${report.failed} benchmark failure(s) and ${failures.length} validation failure(s).`;
  } else if (hasRegressions && anyCriticalRegression) {
    tier = 'blocked';
    reason = `Critical regressions detected (delta < -15%). Resolve before proceeding.`;
  } else if (openWeakCount > 3 || report.overallScore < 60) {
    tier = 'blocked';
    reason = `Overall score ${report.overallScore}% with ${openWeakCount} open weaknesses below the 60% threshold.`;
  } else if (openWeakCount > 1 || report.overallScore < 80 || warnings.length > 3 || requiresHumanReview.length > 0) {
    tier = 'supervised-professional';
    reason = `Score ${report.overallScore}% with ${warnings.length} warning(s) and ${reviewRequirements.length} human review item(s). Professional supervision required.`;
  } else if (report.overallScore >= 80 && openWeakCount <= 1 && warnings.length <= 3 && failures.length === 0 && !hasRegressions) {
    tier = 'pilot-deployment';
    reason = `Score ${report.overallScore}% with no blockers. Ready for monitored pilot deployment.`;
  } else {
    tier = 'internal-only';
    reason = `Score ${report.overallScore}% with ${openWeakCount} open weaknesses. Recommend internal testing only.`;
  }

  return {
    tier,
    label: TIER_META[tier].label,
    description: TIER_META[tier].description,
    reason,
    canProceedToPilot: tier === 'pilot-deployment',
    blockers,
    warnings: warningsList,
    reviewRequirements,
    benchmarkScore: report.overallScore,
    totalBenchmarks: report.totalBenchmarks,
    passedBenchmarks: report.passed,
    failedBenchmarks: report.failed,
    validationFailures: failures.length,
    validationWarnings: warnings.length,
    openWeaknesses: openWeakCount,
    regressionsDetected: report.regressionRecords.length,
  };
}

export function getPilotReadinessSummaryHtml(pilotReport: PilotReadinessReport): string {
  const tierColors: Record<PilotDeploymentTier, string> = {
    'blocked': '#ef4444',
    'internal-only': '#f59e0b',
    'supervised-professional': '#6366f1',
    'pilot-deployment': '#22c55e',
  };

  let html = `<div style="font-family:sans-serif;font-size:10px;margin-top:12px">
<h4 style="font-size:11px;margin:0 0 6px">Pilot Readiness Assessment</h4>
<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
<span style="background:${tierColors[pilotReport.tier]}20;color:${tierColors[pilotReport.tier]};border:1px solid ${tierColors[pilotReport.tier]}40;border-radius:4px;padding:2px 8px;font-weight:bold;font-size:11px">${pilotReport.label}</span>
<span style="color:#666;font-size:9px">${pilotReport.description}</span>
</div>
<p style="font-size:9px;color:#333;margin:4px 0">${pilotReport.reason}</p>
<div style="display:flex;gap:12px;margin:8px 0;flex-wrap:wrap">
<div><strong>Score:</strong> ${pilotReport.benchmarkScore}%</div>
<div><strong>Benchmarks:</strong> ${pilotReport.passedBenchmarks}/${pilotReport.totalBenchmarks} passed</div>
<div><strong>Failures:</strong> ${pilotReport.validationFailures}</div>
<div><strong>Warnings:</strong> ${pilotReport.validationWarnings}</div>
<div><strong>Regressions:</strong> ${pilotReport.regressionsDetected}</div>
</div>`;

  if (pilotReport.blockers.length > 0) {
    html += `<div style="margin-top:6px"><strong style="color:#ef4444">Blockers</strong><ul style="margin:2px 0;padding-left:16px">`;
    for (const b of pilotReport.blockers) {
      html += `<li style="font-size:9px;color:#dc2626">${b}</li>`;
    }
    html += `</ul></div>`;
  }

  if (pilotReport.warnings.length > 0) {
    html += `<div style="margin-top:4px"><strong style="color:#f59e0b">Warnings</strong><ul style="margin:2px 0;padding-left:16px">`;
    for (const w of pilotReport.warnings) {
      html += `<li style="font-size:9px;color:#d97706">${w}</li>`;
    }
    html += `</ul></div>`;
  }

  html += `</div>`;
  return html;
}
