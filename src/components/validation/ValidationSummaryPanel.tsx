import { useMemo } from 'react';
import type { ValidationReport, ValidationResult } from '@/lib/validation/validationEngine';
import { classifyValidationResults, getBlockerSummary } from '@/lib/validation/validationEngine';
import { assessPilotReadiness } from '@/lib/validation/pilotReadinessEvaluator';
import type { PilotDeploymentTier } from '@/lib/validation/pilotReadinessEvaluator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ValidationSummaryPanelProps {
  report: ValidationReport;
  showPilotReadiness?: boolean;
}

const TIER_BADGE_VARIANT: Record<PilotDeploymentTier, 'success' | 'warning' | 'danger' | 'secondary'> = {
  'pilot-deployment': 'success',
  'supervised-professional': 'warning',
  'internal-only': 'secondary',
  'blocked': 'danger',
};

const TIER_BADGE_LABEL: Record<PilotDeploymentTier, string> = {
  'pilot-deployment': 'Pilot Ready',
  'supervised-professional': 'Supervised',
  'internal-only': 'Internal Only',
  'blocked': 'Blocked',
};

const STATUS_COLORS: Record<string, string> = {
  pass: 'text-green-400 bg-green-500/10 border-green-500/30',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  fail: 'text-red-400 bg-red-500/10 border-red-500/30',
  'not-applicable': 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

function ValidationResultRow({ result }: { result: ValidationResult }) {
  const colorClass = STATUS_COLORS[result.status] ?? STATUS_COLORS['not-applicable'];
  return (
    <div className={`rounded-md border px-2 py-1.5 text-[10px] ${colorClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{result.domain}</span>
        <Badge variant={
          result.status === 'pass' ? 'success' :
          result.status === 'warning' ? 'warning' :
          result.status === 'fail' ? 'danger' : 'secondary'
        } className="text-[8px] px-1.5 py-0">
          {result.status}
        </Badge>
      </div>
      <p className="text-[var(--text-secondary)] mt-0.5">{result.reason}</p>
      {result.requiresHumanReview && (
        <div className="mt-1 flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[8px] text-indigo-400">
          <span>Human review required</span>
          {result.humanReviewNote && <span>— {result.humanReviewNote}</span>}
        </div>
      )}
    </div>
  );
}

export function ValidationSummaryPanel({ report, showPilotReadiness = false }: ValidationSummaryPanelProps) {
  const classified = useMemo(() => classifyValidationResults(report.validationResults), [report.validationResults]);
  const blockerSummary = useMemo(() => getBlockerSummary(report.validationResults), [report.validationResults]);
  const pilotReadiness = useMemo(() => showPilotReadiness ? assessPilotReadiness(report) : null, [report, showPilotReadiness]);

  return (
    <div className="space-y-4">
      {/* Scorecard overview */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Validation Scorecard</CardTitle>
            {pilotReadiness && (
              <Badge variant={TIER_BADGE_VARIANT[pilotReadiness.tier]}>
                {TIER_BADGE_LABEL[pilotReadiness.tier]}
              </Badge>
            )}
          </div>
          <CardDescription className="text-[10px]">{report.runAt}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-4 gap-2 mb-3">
            <MetricBox label="Passed" value={report.passed} color="text-green-400" bg="bg-green-500/10" />
            <MetricBox label="Marginal" value={report.marginal} color="text-amber-400" bg="bg-amber-500/10" />
            <MetricBox label="Failed" value={report.failed} color="text-red-400" bg="bg-red-500/10" />
            <MetricBox label="Score" value={`${report.overallScore}%`} color="text-cyan-400" bg="bg-cyan-500/10" />
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <MetricBox label="Val. Failures" value={classified.failures.length} color="text-red-400" bg="bg-red-500/10" />
            <MetricBox label="Val. Warnings" value={classified.warnings.length} color="text-amber-400" bg="bg-amber-500/10" />
            <MetricBox label="Human Review" value={classified.requiresHumanReview.length} color="text-indigo-400" bg="bg-indigo-500/10" />
            <MetricBox label="Regressions" value={report.regressionRecords.length} color="text-rose-400" bg="bg-rose-500/10" />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">{report.summary}</p>
        </CardContent>
      </Card>

      {/* Blocker summary */}
      {(blockerSummary.blockers.length > 0 || blockerSummary.warningsList.length > 0 || blockerSummary.reviewRequired.length > 0) && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Issues</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {blockerSummary.blockers.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-red-400 mb-1">Blockers ({blockerSummary.blockers.length})</h4>
                <ul className="space-y-1">
                  {blockerSummary.blockers.map((b, i) => (
                    <li key={i} className="text-[9px] text-red-400 bg-red-500/5 rounded px-2 py-1">{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {blockerSummary.warningsList.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-amber-400 mb-1">Warnings ({blockerSummary.warningsList.length})</h4>
                <ul className="space-y-1">
                  {blockerSummary.warningsList.map((w, i) => (
                    <li key={i} className="text-[9px] text-amber-400 bg-amber-500/5 rounded px-2 py-1">{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {blockerSummary.reviewRequired.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-indigo-400 mb-1">Human Review ({blockerSummary.reviewRequired.length})</h4>
                <ul className="space-y-1">
                  {blockerSummary.reviewRequired.map((r, i) => (
                    <li key={i} className="text-[9px] text-indigo-400 bg-indigo-500/5 rounded px-2 py-1">{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation results detail */}
      {report.validationResults.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Validation Results ({report.validationResults.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-1.5">
            {report.validationResults.map((r, i) => (
              <ValidationResultRow key={i} result={r} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pilot readiness */}
      {pilotReadiness && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Pilot Readiness</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={TIER_BADGE_VARIANT[pilotReadiness.tier]}>
                {pilotReadiness.label}
              </Badge>
              <span className="text-[9px] text-[var(--text-secondary)]">{pilotReadiness.description}</span>
            </div>
            <p className="text-[10px] text-[var(--text-primary)] mb-2">{pilotReadiness.reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricBox({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`rounded-lg ${bg} border ${color.replace('text-', 'border-').replace('-400', '-500/20')} p-2 text-center`}>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
}
