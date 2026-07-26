import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getReferenceCases, getCoverageSummary } from '@/lib/reference/referenceProjectPack';
import { buildReportData, downloadReferenceCaseReport } from '@/lib/reference/referenceCaseReport';
import { CALIBRATION_MARKER_ANNOTATIONS } from '@/lib/reference/referenceCaseModel';
import type { ReferenceCase, ReferenceCaseSummary, CalibrationMarker } from '@/lib/reference/referenceCaseModel';
import { FolderOpen, FileText, Download, AlertTriangle, ShieldCheck, Eye, X } from 'lucide-react';

const READINESS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  'pilot-deployment': 'success',
  'supervised-professional': 'default',
  'internal-only': 'warning',
  'blocked': 'danger',
};

const CALIBRATION_COLORS: Record<CalibrationMarker, 'success' | 'warning' | 'danger' | 'default'> = {
  'confirmed-behavior': 'success',
  'heuristic-output': 'warning',
  'assumed-value': 'default',
  'unverified-before-construction': 'danger',
};

export function ReferenceCasePanel() {
  const [selectedCase, setSelectedCase] = useState<ReferenceCase | null>(null);
  const [view, setView] = useState<'list' | 'summary'>('list');

  const cases = useMemo(() => getReferenceCases(), []);
  const summaries = useMemo(() => getCoverageSummary(), []);

  const handleExport = useCallback(() => {
    downloadReferenceCaseReport();
  }, []);

  if (selectedCase) {
    return (
      <CaseDetailPanel
        caseData={selectedCase}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-[var(--brand-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Reference Cases</h2>
          <span className="text-[8px] text-[var(--text-muted)]">{cases.length} curated profiles</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={view === 'list' ? 'brand' : 'secondary'} size="sm" onClick={() => setView('list')} className="text-[9px]">
            <FolderOpen size={12} /> Cases
          </Button>
          <Button variant={view === 'summary' ? 'brand' : 'secondary'} size="sm" onClick={() => setView('summary')} className="text-[9px]">
            <FileText size={12} /> Coverage
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} className="gap-1 text-[9px]">
            <Download size={12} /> Export
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <CaseListView cases={cases} summaries={summaries} onSelect={setSelectedCase} />
      ) : (
        <CoverageView summaries={summaries} cases={cases} />
      )}

      {/* Local-first integrity note */}
      <Card>
        <CardContent className="p-2">
          <p className="text-[7px] text-[var(--text-muted)]">
            Reference cases are curated project profiles used for capability benchmarking and pilot assessment.
            They represent known system behaviour across typologies, not guarantees of project-specific outcomes.
            All outputs require professional review before construction use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CaseListView({ cases, summaries, onSelect }: {
  cases: ReferenceCase[];
  summaries: ReferenceCaseSummary[];
  onSelect: (c: ReferenceCase) => void;
}) {
  return (
    <div className="space-y-2">
      {cases.map(c => {
        const summary = summaries.find(s => s.caseId === c.id);
        return (
          <Card key={c.id} className="cursor-pointer hover:ring-1 hover:ring-[var(--brand-accent)]/30 transition-all">
            <CardContent className="p-3" onClick={() => onSelect(c)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <Badge variant="secondary" className="text-[7px] px-1 py-0">{c.typology}</Badge>
                    <Badge variant="secondary" className="text-[7px] px-1 py-0">{c.storeyProfile}</Badge>
                    <Badge variant={READINESS_COLORS[c.pilotReadiness.expectedTier] ?? 'secondary'} className="text-[7px] px-1 py-0">
                      {c.pilotReadiness.expectedTier}
                    </Badge>
                  </div>
                  <h3 className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{c.name}</h3>
                  <p className="text-[8px] text-[var(--text-secondary)] line-clamp-1">{c.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[7px] text-[var(--text-muted)]">
                    <span>{c.workflowScope.length} workflow stages</span>
                    <span>{c.expectedOutputs.length} expected outputs</span>
                    {summary && <span>Coverage: {summary.coverageScore}%</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="text-[9px]">
                    <Eye size={12} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CoverageView({ summaries, cases }: { summaries: ReferenceCaseSummary[]; cases: ReferenceCase[] }) {
  const report = useMemo(() => buildReportData(), []);

  const totalMandatoryReview = cases.reduce((sum, c) =>
    sum + c.humanReviewAreas.filter(h => h.severity === 'mandatory').length, 0
  );

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label="Reference Cases" value={summaries.length} color="text-blue-400" bg="bg-blue-500/10" />
        <MetricCard label="Avg Coverage" value={`${Math.round(summaries.reduce((s, x) => s + x.coverageScore, 0) / summaries.length)}%`} color="text-green-400" bg="bg-green-500/10" />
        <MetricCard label="Mandatory Reviews" value={totalMandatoryReview} color={totalMandatoryReview > 0 ? 'text-amber-400' : 'text-green-400'} bg={totalMandatoryReview > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'} />
        <MetricCard label="Open Limitations" value={cases.reduce((s, c) => s + c.knownLimitations.filter(l => l.status === 'open').length, 0)} color="text-red-400" bg="bg-red-500/10" />
      </div>

      {/* Coverage table */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Case Coverage</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="space-y-1.5">
            {summaries.map(s => {
              const maxScore = Math.max(...summaries.map(x => x.coverageScore), 1);
              return (
                <div key={s.caseId} className="flex items-center gap-2">
                  <span className="text-[8px] text-[var(--text-secondary)] w-32 truncate" title={s.caseName}>{s.caseName}</span>
                  <div className="flex-1 h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      s.coverageScore >= 80 ? 'bg-green-500' :
                      s.coverageScore >= 60 ? 'bg-indigo-500' :
                      s.coverageScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`} style={{ width: `${(s.coverageScore / maxScore) * 100}%` }} />
                  </div>
                  <span className="text-[9px] font-bold w-6 text-right text-[var(--text-primary)]">{s.coverageScore}%</span>
                  <Badge variant={READINESS_COLORS[s.readinessTier ?? ''] ?? 'secondary'} className="text-[7px] px-1 py-0 w-20 text-center">
                    {s.readinessTier ?? '—'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weak domains */}
      {report.weakDomains.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-400" />
              <CardTitle className="text-[11px] text-amber-400">Recurring Weak Domains</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1">
            {report.weakDomains.map(d => (
              <div key={d.domain} className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)]">
                <span className="w-40 truncate">{d.domain}</span>
                <span className="text-amber-400">{d.caseCount} case(s)</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Human review hotspots */}
      {report.humanReviewHotspots.length > 0 && (
        <Card className="ring-1 ring-red-500/20">
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-red-400" />
              <CardTitle className="text-[11px] text-red-400">Human Review Hotspots ({report.humanReviewHotspots.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1">
            {report.humanReviewHotspots.map(h => (
              <div key={h.area} className="rounded-md bg-red-500/5 border border-red-500/10 p-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-red-400">{h.area}</span>
                  <Badge variant="danger" className="text-[7px] px-1 py-0">{h.caseCount} cases</Badge>
                </div>
                <p className="text-[7px] text-[var(--text-muted)] mt-0.5">{h.cases.join(', ')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CaseDetailPanel({ caseData, onBack }: { caseData: ReferenceCase; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
        <X size={12} /> Back to cases
      </button>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0">{caseData.typology}</Badge>
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0">{caseData.storeyProfile}</Badge>
            <Badge variant={READINESS_COLORS[caseData.pilotReadiness.expectedTier] ?? 'secondary'} className="text-[8px] px-1.5 py-0">
              {caseData.pilotReadiness.expectedTier}
            </Badge>
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{caseData.name}</h3>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">{caseData.description}</p>
          <p className="text-[9px] text-[var(--text-tertiary)] mt-1"><em>{caseData.projectIntent}</em></p>
          <div className="flex items-center gap-1 mt-2 text-[8px] text-[var(--text-muted)]">
            <span>Workflow: {caseData.workflowScope.join(', ')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Expected outputs with calibration markers */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-[11px]">Expected Outputs</CardTitle>
          <CardDescription className="text-[9px]">
            <span className="text-green-400">[CONFIRMED]</span> ·
            <span className="text-orange-400"> [HEURISTIC]</span> ·
            <span className="text-amber-400"> [ASSUMED]</span> ·
            <span className="text-red-400"> [UNVERIFIED]</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="space-y-1">
            {caseData.expectedOutputs.map((o, i) => {
              const ann = CALIBRATION_MARKER_ANNOTATIONS[o.calibration];
              return (
                <div key={i} className="flex items-start gap-2 text-[9px] text-[var(--text-secondary)]">
                  <Badge variant={CALIBRATION_COLORS[o.calibration]} className="text-[7px] px-1 py-0 mt-0.5 shrink-0">
                    {ann?.prefix ?? o.calibration}
                  </Badge>
                  <div>
                    <span className="font-medium">{o.output}</span>
                    <p className="text-[7px] text-[var(--text-tertiary)]">{o.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pilot readiness */}
      <Card>
        <CardHeader className="p-3 pb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-indigo-400" />
            <CardTitle className="text-[11px]">Pilot Readiness</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={READINESS_COLORS[caseData.pilotReadiness.expectedTier] ?? 'secondary'} className="text-[8px] px-1.5 py-0">
              {caseData.pilotReadiness.expectedTier}
            </Badge>
            <span className="text-[9px] text-[var(--text-secondary)]">{caseData.pilotReadiness.supervisionContext}</span>
          </div>

          {caseData.pilotReadiness.knownRisks.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[var(--text-primary)]">Known Risks</p>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                {caseData.pilotReadiness.knownRisks.map((r, i) => (
                  <li key={i} className="text-[8px] text-[var(--text-tertiary)]">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {caseData.pilotReadiness.supervisionRequirements.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[var(--text-primary)]">Supervision Requirements</p>
              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                {caseData.pilotReadiness.supervisionRequirements.map((r, i) => (
                  <li key={i} className="text-[8px] text-[var(--text-tertiary)]">{r}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Human review areas */}
      <Card className="ring-1 ring-red-500/20">
        <CardHeader className="p-3 pb-1">
          <div className="flex items-center gap-2">
            <Eye size={12} className="text-red-400" />
            <CardTitle className="text-[11px] text-red-400">Human Review Areas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-1.5">
          {caseData.humanReviewAreas.map((h, i) => (
            <div key={i} className="rounded-md bg-red-500/5 border border-red-500/10 p-2">
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-semibold ${h.severity === 'mandatory' ? 'text-red-400' : h.severity === 'recommended' ? 'text-orange-400' : 'text-blue-400'}`}>
                  {h.area}
                </span>
                <Badge variant={h.severity === 'mandatory' ? 'danger' : h.severity === 'recommended' ? 'warning' : 'default'} className="text-[7px] px-1 py-0">
                  {h.severity}
                </Badge>
              </div>
              <p className="text-[8px] text-[var(--text-tertiary)] mt-0.5">{h.why}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Known limitations */}
      {caseData.knownLimitations.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} className="text-amber-400" />
              <CardTitle className="text-[11px] text-amber-400">Known Limitations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1.5">
            {caseData.knownLimitations.map((l, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant={
                  l.impact === 'high' ? 'danger' :
                  l.impact === 'medium' ? 'warning' : 'default'
                } className="text-[7px] px-1 py-0 mt-0.5 shrink-0">{l.impact}</Badge>
                <div>
                  <span className="text-[9px] font-medium text-[var(--text-primary)]">{l.area}</span>
                  <p className="text-[8px] text-[var(--text-tertiary)]">{l.description}</p>
                  <span className="text-[7px] text-[var(--text-muted)]">Status: {l.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {caseData.notes && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[8px] text-[var(--text-tertiary)] italic">{caseData.notes}</p>
          </CardContent>
        </Card>
      )}
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
