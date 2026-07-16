import type { ReviewReport, ReviewIssue } from '@/engine/review/reviewEngine';

interface ReviewPanelProps {
  report: ReviewReport | null;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  major: '#f59e0b',
  minor: '#3b82f6',
  info: '#666',
};

const STATUS_COLORS: Record<string, string> = {
  pass: '#22c55e',
  warn: '#f59e0b',
  fail: '#ef4444',
  info: '#666',
};

export function ReviewPanel({ report, className = '' }: ReviewPanelProps) {
  if (!report) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 text-sm text-[var(--text-muted)]">
        Run a code review to see results here.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Code Review Report</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
            report.decision === 'pass' ? 'bg-green-500/10 text-green-400' :
            report.decision === 'conditional-pass' ? 'bg-amber-500/10 text-amber-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {report.decision}
          </span>
        </div>

        <div className="mb-3 text-[11px] text-[var(--text-muted)]">
          Jurisdiction: {report.jurisdiction} · Reviewer: {report.reviewer} · {new Date(report.reviewedAt).toLocaleDateString()}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-md bg-[var(--bg-tertiary)] p-2 text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">{report.summary.totalIssues}</div>
            <div className="text-[9px] text-[var(--text-muted)]">Total</div>
          </div>
          <div className="rounded-md bg-red-500/5 p-2 text-center">
            <div className="text-lg font-bold text-red-400">{report.summary.critical}</div>
            <div className="text-[9px] text-[var(--text-muted)]">Critical</div>
          </div>
          <div className="rounded-md bg-amber-500/5 p-2 text-center">
            <div className="text-lg font-bold text-amber-400">{report.summary.major}</div>
            <div className="text-[9px] text-[var(--text-muted)]">Major</div>
          </div>
          <div className="rounded-md bg-green-500/5 p-2 text-center">
            <div className="text-lg font-bold text-green-400">{report.summary.score}%</div>
            <div className="text-[9px] text-[var(--text-muted)]">Score</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border-default)] px-4 py-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">Issues ({report.issues.length})</h3>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {report.issues.length === 0 && (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">No issues found.</div>
          )}
          {report.issues.map((issue) => (
            <ReviewIssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      </div>

      {report.findings.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
          <div className="border-b border-[var(--border-default)] px-4 py-2">
            <h3 className="text-xs font-semibold text-[var(--text-primary)]">Findings ({report.findings.length})</h3>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {report.findings.map((f) => (
              <div key={f.id} className="p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-medium"
                    style={{ backgroundColor: SEVERITY_COLORS[f.severity] + '20', color: SEVERITY_COLORS[f.severity] }}>
                    {f.severity}
                  </span>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{f.title}</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">{f.finding}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">Rec: {f.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-[var(--text-muted)] italic">
        This is code-assisted professional review, not certified approval or legal compliance signoff.
        Always consult a registered professional for final compliance determination.
      </p>
    </div>
  );
}

function ReviewIssueRow({ issue }: { issue: ReviewIssue }) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium"
          style={{ backgroundColor: SEVERITY_COLORS[issue.severity] + '20', color: SEVERITY_COLORS[issue.severity] }}>
          {issue.severity}
        </span>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-medium"
          style={{ backgroundColor: STATUS_COLORS[issue.status] + '20', color: STATUS_COLORS[issue.status] }}>
          {issue.state}
        </span>
        <span className="text-xs font-medium text-[var(--text-primary)]">{issue.title}</span>
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{issue.description}</p>
      <div className="mt-1 flex gap-4 text-[9px] text-[var(--text-tertiary)]">
        <span>Req: {issue.requirement}</span>
        <span>Actual: {issue.actual}</span>
        <span>Loc: {issue.location}</span>
      </div>
    </div>
  );
}
