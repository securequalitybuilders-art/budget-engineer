import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePilotFeedbackStore } from '@/stores/pilotFeedbackStore';
import { buildTrendData, buildSessionSnapshot } from '@/lib/pilot/pilotTrendAnalysis';
import type { SessionSnapshot } from '@/lib/pilot/pilotTrendAnalysis';
import { downloadTrendReport, downloadMultiSessionSummary, downloadSessionComparison } from '@/lib/pilot/pilotExport';
import { DOMAIN_LABELS } from '@/lib/pilot/pilotFeedbackModel';
import { AlertTriangle, TrendingUp, BarChart3, FileText, Layers, GitCompare } from 'lucide-react';

export function PilotTrendPanel() {
  const store = usePilotFeedbackStore();
  const allSessions = useMemo(() => store.getAllSessions(), [store]);
  const allObservations = useMemo(() => store.getAllObservations(), [store]);

  const trend = useMemo(() => {
    if (allSessions.length === 0) return null;
    return buildTrendData(allSessions, allObservations);
  }, [allSessions, allObservations]);

  const snapshots = useMemo(() => {
    return allSessions.map(s => buildSessionSnapshot(s, allObservations.filter(o => o.sessionId === s.id)));
  }, [allSessions, allObservations]);

  const handleExportTrend = useCallback(() => {
    downloadTrendReport(allSessions, allObservations);
  }, [allSessions, allObservations]);

  const handleExportMulti = useCallback(() => {
    downloadMultiSessionSummary(allSessions, allObservations);
  }, [allSessions, allObservations]);

  const handleExportComparison = useCallback(() => {
    downloadSessionComparison(allSessions, allObservations);
  }, [allSessions, allObservations]);

  if (!trend || allSessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-[var(--text-muted)] text-[10px]">No pilot sessions yet. Create sessions and add observations to see trends.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall assessment banner */}
      <Card className={`border-l-4 ${
        trend.overallAssessment.includes('positive') || trend.overallAssessment.includes('improving') ? 'border-l-green-500' :
        trend.overallAssessment.includes('concerning') || trend.overallAssessment.includes('attention') ? 'border-l-red-500' :
        'border-l-blue-500'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className={
                  trend.overallAssessment.includes('positive') || trend.overallAssessment.includes('improving') ? 'text-green-400' :
                  trend.overallAssessment.includes('concerning') ? 'text-red-400' : 'text-blue-400'
                } />
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">Overall Trend Assessment</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]">{trend.overallAssessment}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Sessions" value={trend.sessionCount} color="text-blue-400" bg="bg-blue-500/10" />
        <MetricCard label="Total Issues" value={trend.totalObservations} color="text-purple-400" bg="bg-purple-500/10" />
        <MetricCard
          label="Latest Blockers"
          value={trend.blockerTrend[trend.blockerTrend.length - 1]?.count ?? 0}
          color={(trend.blockerTrend[trend.blockerTrend.length - 1]?.count ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}
          bg={(trend.blockerTrend[trend.blockerTrend.length - 1]?.count ?? 0) > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}
        />
        <MetricCard
          label="Latest Resolution"
          value={`${trend.resolutionTrend[trend.resolutionTrend.length - 1]?.rate ?? 0}%`}
          color="text-cyan-400" bg="bg-cyan-500/10" />
      </div>

      {/* Session timeline */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Session Timeline</CardTitle>
          <CardDescription className="text-[9px]">All pilot sessions in chronological order</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="space-y-2">
            {snapshots.map((s) => (
              <SessionTimelineRow key={s.sessionId} snapshot={s} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocker trend */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Blocker Trend</CardTitle>
          <CardDescription className="text-[9px]">Unresolved blockers across sessions</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          {trend.blockerTrend.length === 0 ? (
            <p className="text-[9px] text-[var(--text-muted)]">No data</p>
          ) : (
            <div className="space-y-1.5">
              {trend.blockerTrend.map((t) => {
                const maxCount = Math.max(...trend.blockerTrend.map(x => x.count), 1);
                return (
                  <div key={t.session} className="flex items-center gap-2">
                    <span className="text-[8px] text-[var(--text-tertiary)] w-20 truncate">{t.session}</span>
                    <div className="flex-1 h-4 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        t.count > 0 ? 'bg-red-500' : 'bg-green-500'
                      }`} style={{ width: `${(t.count / maxCount) * 100}%` }} />
                    </div>
                    <span className={`text-[10px] font-bold w-4 text-right ${t.count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {t.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution rate trend */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Resolution Rate Trend</CardTitle>
          <CardDescription className="text-[9px]">Percentage of issues resolved per session</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          {trend.resolutionTrend.length === 0 ? (
            <p className="text-[9px] text-[var(--text-muted)]">No data</p>
          ) : (
            <div className="space-y-1.5">
              {trend.resolutionTrend.map((t) => {
                const maxRate = Math.max(...trend.resolutionTrend.map(x => x.rate), 1);
                return (
                  <div key={t.session} className="flex items-center gap-2">
                    <span className="text-[8px] text-[var(--text-tertiary)] w-20 truncate">{t.session}</span>
                    <div className="flex-1 h-4 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300 bg-cyan-500"
                        style={{ width: `${(t.rate / maxRate) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-cyan-400 w-8 text-right">{t.rate}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness tier progression */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Readiness Tier Progression</CardTitle>
          <CardDescription className="text-[9px]">Validation benchmark score and deployment tier over sessions</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-1">
              {trend.readinessTrend.filter(t => t.tier !== null).length === 0 ? (
            <p className="text-[9px] text-[var(--text-muted)]">No readiness data linked to sessions. Link validation context when creating sessions.</p>
          ) : (
            <div className="space-y-1.5">
              {trend.readinessTrend.map((t, idx) => {
                if (!t.tier) return null;
                const tierColors: Record<string, string> = {
                  'blocked': 'bg-red-500',
                  'internal-only': 'bg-amber-500',
                  'supervised-professional': 'bg-indigo-500',
                  'pilot-deployment': 'bg-green-500',
                };
                const maxScore = Math.max(...trend.readinessTrend.filter(x => x.score !== null).map(x => x.score ?? 0), 1);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[8px] text-[var(--text-tertiary)] w-20 truncate">{t.session}</span>
                    <div className="flex-1 h-4 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${tierColors[t.tier] ?? 'bg-gray-500'}`}
                        style={{ width: `${((t.score ?? 0) / maxScore) * 100}%` }} />
                    </div>
                    <span className="text-[8px] text-[var(--text-secondary)] w-24 text-right">{t.tier}</span>
                    <span className="text-[9px] font-bold text-[var(--text-primary)] w-8 text-right">{t.score !== null ? `${t.score}%` : '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain recurrence */}
      {trend.domainRecurrence.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center gap-2">
              <Layers size={12} className="text-purple-400" />
              <CardTitle className="text-[11px]">Domain Recurrence</CardTitle>
            </div>
            <CardDescription className="text-[9px]">Most frequently affected domains across sessions</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="space-y-1.5">
              {trend.domainRecurrence.map((d) => {
                const maxCount = Math.max(...trend.domainRecurrence.map(x => x.count), 1);
                return (
                  <div key={d.domain} className="flex items-center gap-2">
                    <span className="text-[8px] text-[var(--text-secondary)] w-28 truncate">{DOMAIN_LABELS[d.domain]}</span>
                    <div className="flex-1 h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${(d.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-purple-400 w-4 text-right">{d.count}</span>
                    <span className="text-[7px] text-[var(--text-tertiary)] w-20 text-right">{d.sessions.length} session(s)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring issues */}
      {trend.recurringIssues.length > 0 && (
        <Card className="ring-1 ring-amber-500/20">
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-400" />
              <CardTitle className="text-[11px] text-amber-400">Recurring Issues ({trend.recurringIssues.length})</CardTitle>
            </div>
            <CardDescription className="text-[9px]">Issues appearing across multiple sessions</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1.5">
            {trend.recurringIssues.map(r => (
              <div key={r.key} className="rounded-md bg-amber-500/5 border border-amber-500/20 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-amber-400">{r.key}</span>
                  <Badge variant="warning" className="text-[7px] px-1 py-0">{r.totalOccurrences}x</Badge>
                </div>
                <p className="text-[8px] text-[var(--text-secondary)] mt-0.5">Sessions: {r.sessions.join(', ')}</p>
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
            <Button variant="secondary" size="sm" onClick={handleExportTrend} className="gap-1 text-[9px]">
              <FileText size={12} /> Trend Report
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportMulti} className="gap-1 text-[9px]">
              <BarChart3 size={12} /> Multi-Session Summary
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportComparison} className="gap-1 text-[9px]">
              <GitCompare size={12} /> Session Comparison
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionTimelineRow({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${
          snapshot.readinessTier === 'pilot-deployment' ? 'bg-green-500' :
          snapshot.readinessTier === 'supervised-professional' ? 'bg-indigo-500' :
          snapshot.readinessTier === 'internal-only' ? 'bg-amber-500' :
          snapshot.status === 'closed' ? 'bg-gray-500' : 'bg-blue-500'
        }`} />
        {false && <div className="w-0.5 h-8 bg-[var(--border-default)]" />}
      </div>
      <div className="flex-1 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[var(--text-primary)]">{snapshot.sessionName}</span>
          <span className="text-[8px] text-[var(--text-muted)]">{new Date(snapshot.startDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[8px] text-[var(--text-secondary)]">
          <span>{snapshot.totalObservations} issues</span>
          <span className={snapshot.blockerCount > 0 ? 'text-red-400' : ''}>{snapshot.blockerCount} blockers</span>
          <span>{snapshot.resolutionRate}% resolved</span>
          {snapshot.readinessTier && <Badge variant="secondary" className="text-[7px] px-1 py-0">{snapshot.readinessTier}</Badge>}
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${snapshot.resolutionRate}%` }} />
        </div>
      </div>
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
