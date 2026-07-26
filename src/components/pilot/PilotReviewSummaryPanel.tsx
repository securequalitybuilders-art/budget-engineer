import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePilotFeedbackStore } from '@/stores/pilotFeedbackStore';
import { DOMAIN_LABELS, SEVERITY_LABELS, SEVERITY_ORDER } from '@/lib/pilot/pilotFeedbackModel';
import { getDomainConcentration } from '@/lib/pilot/pilotIssueClassification';
import { generatePilotReviewSummary } from '@/lib/pilot/pilotReviewSummary';
import { downloadPilotIssueLog, downloadPilotSummaryReport, downloadOpenBlockerReport, downloadCloseoutRecommendation } from '@/lib/pilot/pilotExport';
import { AlertTriangle, CheckCircle2, Download, FileText, BarChart3, ListChecks, ShieldCheck } from 'lucide-react';

const RECOMMENDATION_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  'continue': 'success',
  'pause': 'danger',
  'close-with-followups': 'warning',
  'close-resolved': 'default',
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  'continue': 'Continue Pilot',
  'pause': 'Pause Pilot',
  'close-with-followups': 'Close with Follow-ups',
  'close-resolved': 'Close — All Resolved',
};

export function PilotReviewSummaryPanel() {
  const store = usePilotFeedbackStore();
  const activeSession = store.getActiveSession();
  const observations = store.getActiveObservations();

  const summary = useMemo(() => {
    if (!activeSession) return null;
    return generatePilotReviewSummary(activeSession, observations);
  }, [activeSession, observations]);

  const domainConcentration = useMemo(() => getDomainConcentration(observations), [observations]);

  const handleExportIssueLog = useCallback(() => {
    if (activeSession) downloadPilotIssueLog(activeSession, observations);
  }, [activeSession, observations]);

  const handleExportSummary = useCallback(() => {
    if (activeSession) downloadPilotSummaryReport(activeSession, observations);
  }, [activeSession, observations]);

  const handleExportBlockers = useCallback(() => {
    downloadOpenBlockerReport(observations);
  }, [observations]);

  const handleExportCloseout = useCallback(() => {
    if (activeSession) downloadCloseoutRecommendation(activeSession, observations);
  }, [activeSession, observations]);

  if (!activeSession || !summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-[var(--text-muted)] text-[10px]">No active pilot session. Create a session in the Feedback tab first.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommendation banner */}
      <Card className={`border-l-4 ${
        summary.recommendation === 'pause' ? 'border-l-red-500' :
        summary.recommendation === 'close-resolved' ? 'border-l-green-500' :
        summary.recommendation === 'close-with-followups' ? 'border-l-amber-500' :
        'border-l-blue-500'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {summary.recommendation === 'pause' ? (
                  <AlertTriangle size={16} className="text-red-400" />
                ) : summary.recommendation === 'close-resolved' ? (
                  <CheckCircle2 size={16} className="text-green-400" />
                ) : (
                  <BarChart3 size={16} className="text-blue-400" />
                )}
                <Badge variant={RECOMMENDATION_BADGE[summary.recommendation]} className="text-[9px] px-2 py-0.5">
                  {RECOMMENDATION_LABEL[summary.recommendation]}
                </Badge>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">{summary.recommendationReason}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="secondary" size="sm" onClick={handleExportCloseout} className="gap-1 text-[9px]">
                <Download size={12} /> Closeout
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness context */}
      {activeSession.readinessContext && (
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-semibold text-[var(--text-primary)]">Validation Readiness Context</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={
                    activeSession.readinessContext.tier === 'pilot-deployment' ? 'success' :
                    activeSession.readinessContext.tier === 'supervised-professional' ? 'default' :
                    activeSession.readinessContext.tier === 'internal-only' ? 'warning' : 'danger'
                  } className="text-[8px] px-1.5 py-0">
                    {activeSession.readinessContext.tierLabel}
                  </Badge>
                  <span className="text-[9px] text-[var(--text-secondary)]">
                    Benchmark: {activeSession.readinessContext.benchmarkScore}% ({activeSession.readinessContext.passedBenchmarks}/{activeSession.readinessContext.totalBenchmarks})
                  </span>
                </div>
                <p className="text-[8px] text-[var(--text-tertiary)] mt-0.5">{activeSession.readinessContext.readinessReason}</p>
                {activeSession.readinessContext.readinessBlockers.length > 0 && (
                  <div className="mt-1 text-[8px] text-red-400">
                    Blockers: {activeSession.readinessContext.readinessBlockers.join(', ')}
                  </div>
                )}
                {activeSession.readinessContext.readinessWarnings.length > 0 && (
                  <div className="mt-1 text-[8px] text-amber-400">
                    Warnings: {activeSession.readinessContext.readinessWarnings.join(', ')}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-indigo-400">{activeSession.readinessContext.benchmarkScore}%</div>
                <div className="text-[7px] text-[var(--text-tertiary)]">Benchmark</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Total Issues" value={summary.totalObservations} color="text-blue-400" bg="bg-blue-500/10" />
        <MetricCard
          label="Unresolved Blockers"
          value={summary.unresolvedBlockers.length}
          color={summary.unresolvedBlockers.length > 0 ? 'text-red-400' : 'text-green-400'}
          bg={summary.unresolvedBlockers.length > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}
        />
        <MetricCard label="Resolution Rate" value={`${summary.resolutionRate}%`} color="text-cyan-400" bg="bg-cyan-500/10" />
        <MetricCard label="Domains Affected" value={domainConcentration.filter(d => d.count > 0).length} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* Severity breakdown */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Issues by Severity</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="space-y-1.5">
            {SEVERITY_ORDER.map(sev => {
              const count = summary.bySeverity[sev];
              if (count === 0) return null;
              const barColor = sev === 'blocker' ? 'bg-red-500' : sev === 'major' ? 'bg-orange-500' : sev === 'minor' ? 'bg-amber-500' : sev === 'observation' ? 'bg-blue-500' : 'bg-green-500';
              const maxCount = Math.max(...SEVERITY_ORDER.map(s => summary.bySeverity[s]), 1);
              return (
                <div key={sev} className="flex items-center gap-2">
                  <span className="text-[9px] text-[var(--text-secondary)] w-20">{SEVERITY_LABELS[sev]}</span>
                  <div className="flex-1 h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-300`}
                      style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold w-6 text-right ${
                    sev === 'blocker' ? 'text-red-400' : sev === 'major' ? 'text-orange-400' : 'text-[var(--text-primary)]'
                  }`}>{count}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Domain concentration */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Domain Concentration</CardTitle>
          <CardDescription className="text-[9px]">Areas most affected by issues</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          {domainConcentration.length === 0 ? (
            <p className="text-[9px] text-[var(--text-muted)]">No data</p>
          ) : (
            <div className="space-y-1.5">
              {domainConcentration.map(d => {
                if (d.count === 0) return null;
                return (
                  <div key={d.domain} className="flex items-center gap-2">
                    <span className="text-[9px] text-[var(--text-secondary)] w-28 truncate">{DOMAIN_LABELS[d.domain]}</span>
                    <div className="flex-1 h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${d.pct}%` }} />
                    </div>
                    <span className="text-[9px] text-[var(--text-primary)] w-8 text-right">{d.count}</span>
                    <span className="text-[8px] text-[var(--text-tertiary)] w-8">{d.pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open vs Resolved */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Resolution Status</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-[var(--text-secondary)]">Open</span>
                <span className="text-[10px] font-bold text-amber-400">{summary.openVsResolved.open}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-[var(--text-secondary)]">Resolved</span>
                <span className="text-[10px] font-bold text-green-400">{summary.openVsResolved.resolved}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${summary.resolutionRate}%` }} />
              </div>
            </div>
            <div className="text-center px-4">
              <div className="text-lg font-bold text-[var(--text-primary)]">{summary.resolutionRate}%</div>
              <div className="text-[8px] text-[var(--text-tertiary)]">Resolved</div>
            </div>
            <div className="text-center px-4 border-l border-[var(--border-default)]">
              <div className="text-lg font-bold text-[var(--text-primary)]">{summary.totalObservations}</div>
              <div className="text-[8px] text-[var(--text-tertiary)]">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unresolved blockers detail */}
      {summary.unresolvedBlockers.length > 0 && (
        <Card className="ring-1 ring-red-500/30">
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <CardTitle className="text-[11px] text-red-400">Unresolved Blockers ({summary.unresolvedBlockers.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-2">
            {summary.unresolvedBlockers.map(b => (
              <div key={b.id} className="rounded-md bg-red-500/5 border border-red-500/20 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-red-400">{b.title}</span>
                  <Badge variant="danger" className="text-[7px] px-1 py-0">{DOMAIN_LABELS[b.domain]}</Badge>
                </div>
                <p className="text-[8px] text-[var(--text-secondary)] mt-0.5">{b.description}</p>
                {b.recommendation && (
                  <p className="text-[8px] text-[var(--text-tertiary)] mt-0.5">Recommendation: {b.recommendation}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Export actions */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-semibold text-[var(--text-primary)] mr-1">Export</span>
            <Button variant="secondary" size="sm" onClick={handleExportIssueLog} className="gap-1 text-[9px]">
              <FileText size={12} /> Issue Log
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportSummary} className="gap-1 text-[9px]">
              <BarChart3 size={12} /> Summary Report
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportBlockers} className="gap-1 text-[9px]">
              <AlertTriangle size={12} /> Blockers
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCloseout} className="gap-1 text-[9px]">
              <ListChecks size={12} /> Closeout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className={`rounded-lg ${bg} border ${color.replace('text-', 'border-').replace('-400', '-500/20')} p-2 text-center`}>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[8px] text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
}
