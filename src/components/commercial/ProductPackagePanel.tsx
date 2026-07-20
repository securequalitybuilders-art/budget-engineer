import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CAPABILITY_GROUPS, DEPLOYMENT_PROFILES, USE_CONTEXTS } from '@/lib/commercial/productPackagingModel';
import type { MaturityLevel, AudienceProfile } from '@/lib/commercial/productPackagingModel';
import { generateCapabilityManifest, formatCapabilityManifestStandaloneHtml } from '@/lib/commercial/capabilityManifest';
import { generateDeploymentManifest, formatDeploymentManifestStandaloneHtml } from '@/lib/commercial/deploymentManifest';
import { EVALUATION_CHECKLIST, formatChecklistHtml, formatSupervisedGuidanceHtml, formatPilotRolloutHtml } from '@/lib/commercial/evaluationChecklist';
import { recommendDeployment } from '@/lib/commercial/deploymentRecommender';
import { generateEvaluationReport, formatEvaluationReportHtml } from '@/lib/commercial/evaluationReportGenerator';
import { useEvaluationChecklistStore } from '@/stores/evaluationChecklistStore';
import { buildArtifactFilename, downloadHtml, downloadJson } from '@/lib/commercial/artifactExporter';
import { Download, ShieldCheck, AlertTriangle, CheckCircle2, Info, RefreshCw, FileText } from 'lucide-react';

const MATURITY_CONFIG: Record<MaturityLevel, { color: string; bg: string; label: string }> = {
  mature: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'Mature' },
  established: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', label: 'Established' },
  emerging: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', label: 'Emerging' },
  foundation: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'Foundation' },
};

type Tab = 'capabilities' | 'deployment' | 'contexts' | 'supervision' | 'checklist' | 'manifest' | 'evaluation';

export function ProductPackagePanel() {
  const [tab, setTab] = useState<Tab>('capabilities');
  const [filterMaturity, setFilterMaturity] = useState<MaturityLevel | 'all'>('all');
  const [filterReview, setFilterReview] = useState<'all' | 'required' | 'not-required'>('all');
  const [showAllChecked, setShowAllChecked] = useState(false);
  const [newNoteId, setNewNoteId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  const version = '4.0.0';
  const checklistStore = useEvaluationChecklistStore();
  const checklistItems = checklistStore.items;

  const capabilityManifest = useMemo(() => generateCapabilityManifest(version), [version]);
  const deploymentManifest = useMemo(() => generateDeploymentManifest(version), [version]);

  const exampleAudiences: AudienceProfile[] = ['architect', 'engineer'];
  const exampleTeamSize = 5;
  const deploymentRec = useMemo(() => recommendDeployment(exampleAudiences, exampleTeamSize, true, true), []);

  const evaluationReport = useMemo(() =>
    generateEvaluationReport(version, exampleAudiences, exampleTeamSize, true, true, checklistItems, null),
  [version, checklistItems]);

  const completedCount = useMemo(() => Object.values(checklistItems).filter(i => i.checked).length, [checklistItems]);
  const totalCount = EVALUATION_CHECKLIST.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredCapabilities = useMemo(() => {
    return CAPABILITY_GROUPS.filter(g => {
      if (filterMaturity !== 'all' && g.maturity !== filterMaturity) return false;
      if (filterReview === 'required' && !g.requiresHumanReview) return false;
      if (filterReview === 'not-required' && g.requiresHumanReview) return false;
      return true;
    });
  }, [filterMaturity, filterReview]);

  const visibleChecklist = useMemo(() => {
    return showAllChecked ? EVALUATION_CHECKLIST : EVALUATION_CHECKLIST.filter(i => !checklistItems[i.id]?.checked);
  }, [showAllChecked, checklistItems]);

  const handleDownload = useCallback((type: string) => {
    switch (type) {
      case 'capability-json':
        downloadJson(capabilityManifest, buildArtifactFilename('capability-manifest', 'json'));
        break;
      case 'capability-html':
        downloadHtml(formatCapabilityManifestStandaloneHtml(capabilityManifest), buildArtifactFilename('capability-manifest', 'html'));
        break;
      case 'deployment-json':
        downloadJson(deploymentManifest, buildArtifactFilename('deployment-manifest', 'json'));
        break;
      case 'deployment-html':
        downloadHtml(formatDeploymentManifestStandaloneHtml(deploymentManifest), buildArtifactFilename('deployment-manifest', 'html'));
        break;
      case 'checklist-html':
        downloadHtml(formatChecklistHtml(checklistItems), buildArtifactFilename('evaluation-checklist', 'html'));
        break;
      case 'guidance-html':
        downloadHtml(formatSupervisedGuidanceHtml(), buildArtifactFilename('supervised-guidance', 'html'));
        break;
      case 'pilot-html':
        downloadHtml(formatPilotRolloutHtml(), buildArtifactFilename('pilot-readiness', 'html'));
        break;
      case 'report-html':
        downloadHtml(formatEvaluationReportHtml(evaluationReport), buildArtifactFilename('evaluation-report', 'html'));
        break;
      case 'report-json':
        downloadJson(evaluationReport, buildArtifactFilename('evaluation-report', 'json'));
        break;
    }
  }, [capabilityManifest, deploymentManifest, checklistItems, evaluationReport]);

  const handleToggleChecklist = useCallback((id: string) => { checklistStore.toggleItem(id); }, [checklistStore]);
  const handleSaveNote = useCallback((id: string) => {
    if (newNoteText.trim()) checklistStore.setItemNotes(id, newNoteText.trim());
    setNewNoteId(null);
    setNewNoteText('');
  }, [newNoteText, checklistStore]);
  const handleResetChecklist = useCallback(() => checklistStore.resetAll(), [checklistStore]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-default)] pb-1">
        {([
          ['capabilities', 'Capabilities'],
          ['deployment', 'Deployment'],
          ['contexts', 'Use Contexts'],
          ['supervision', 'Supervision'],
          ['checklist', 'Checklist'],
          ['manifest', 'Manifest'],
          ['evaluation', 'Report'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={'px-3 py-1.5 text-[10px] font-medium rounded-t transition-colors ' + (tab === id ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')}
          >{label}</button>
        ))}
      </div>

      {tab === 'capabilities' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterMaturity} onChange={(e) => setFilterMaturity(e.target.value as MaturityLevel | 'all')}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none">
              <option value="all">All Maturity</option>
              <option value="mature">Mature</option>
              <option value="established">Established</option>
              <option value="emerging">Emerging</option>
              <option value="foundation">Foundation</option>
            </select>
            <select value={filterReview} onChange={(e) => setFilterReview(e.target.value as 'all' | 'required' | 'not-required')}
              className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none">
              <option value="all">All Review</option>
              <option value="required">Review Required</option>
              <option value="not-required">No Review</option>
            </select>
            <span className="text-[9px] text-[var(--text-tertiary)] ml-auto">{filteredCapabilities.length} capabilities</span>
            <button onClick={() => handleDownload('capability-html')} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Download HTML">
              <Download size={12} />
            </button>
          </div>
          <div className="grid gap-2">
            {filteredCapabilities.map((g) => {
              const mc = MATURITY_CONFIG[g.maturity];
              return (
                <Card key={g.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--text-primary)]">{g.label}</span>
                        <Badge variant={g.maturity === 'mature' ? 'success' : g.maturity === 'established' ? 'default' : g.maturity === 'emerging' ? 'warning' : 'danger'} className="ml-2 text-[8px] px-1.5 py-0">{mc.label}</Badge>
                      </div>
                      {g.requiresHumanReview && <Badge variant="warning" className="text-[8px] px-1.5 py-0">Review</Badge>}
                    </div>
                    <p className="text-[9px] text-[var(--text-secondary)] mb-1">{g.description}</p>
                    {g.requiresHumanReview && g.humanReviewNote && (
                      <div className="flex items-start gap-1 rounded bg-amber-500/5 border border-amber-500/20 px-2 py-1 text-[8px] text-amber-400">
                        <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                        <span>{g.humanReviewNote}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[8px] text-[var(--text-tertiary)]">Stages: {g.workflowStages.length > 0 ? g.workflowStages.join(', ') : '\u2014'}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'deployment' && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px]">Deployment Recommendation</CardTitle>
                <Badge variant={deploymentRec.supervisionLevel === 'supervised-professional' ? 'warning' : deploymentRec.supervisionLevel === 'pilot-evaluation' ? 'default' : 'success'} className="text-[8px] px-1.5 py-0">
                  {deploymentRec.supervisionLevel === 'supervised-professional' ? 'Supervised' : deploymentRec.supervisionLevel === 'pilot-evaluation' ? 'Pilot' : 'Unsupervised'}
                </Badge>
              </div>
              <CardDescription className="text-[9px]">Based on: architect/engineer team of 5, Docker available</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-[10px] font-medium text-[var(--brand-accent)] mb-1">
                Recommended: {DEPLOYMENT_PROFILES.find(p => p.id === deploymentRec.recommendedProfile)?.label}
              </div>
              <p className="text-[9px] text-[var(--text-secondary)] mb-1">{deploymentRec.rationale}</p>
              {deploymentRec.alternativeProfiles.length > 0 && (
                <div className="text-[8px] text-[var(--text-tertiary)] mb-1">
                  Alternatives: {deploymentRec.alternativeProfiles.map(id => DEPLOYMENT_PROFILES.find(p => p.id === id)?.label ?? id).join(', ')}
                </div>
              )}
              {deploymentRec.constraints.length > 0 && (
                <div className="mt-1">
                  <strong className="text-[8px] text-red-400">Constraints</strong>
                  <ul className="list-disc list-inside">
                    {deploymentRec.constraints.slice(0, 4).map((c, i) => (
                      <li key={i} className="text-[7px] text-red-400">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          {DEPLOYMENT_PROFILES.map((p) => (
            <Card key={p.id}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[11px]">{p.label}</CardTitle>
                <CardDescription className="text-[9px]">{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-1">
                <div className="text-[9px] text-[var(--text-secondary)]"><strong>Infrastructure:</strong> {p.infrastructure}</div>
                <div className="text-[9px] text-[var(--text-secondary)]"><strong>Audience:</strong> {p.audience.join(', ')}</div>
                <div className="text-[9px] text-[var(--text-secondary)]"><strong>Modes:</strong> {p.supportedModes.join(', ')}</div>
                {p.limitations.length > 0 && (
                  <div className="mt-1">
                    <strong className="text-[9px] text-red-400">Limitations</strong>
                    <ul className="list-disc list-inside mt-0.5">
                      {p.limitations.map((l, i) => (<li key={i} className="text-[8px] text-red-400">{l}</li>))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'contexts' && (
        <div className="grid gap-3">
          {USE_CONTEXTS.map((c) => (
            <Card key={c.id}>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[11px]">{c.label}</CardTitle>
                <CardDescription className="text-[9px]">{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="mb-1">
                  <span className="text-[9px] font-semibold text-green-400">Suitable for</span>
                  <ul className="list-disc list-inside">
                    {c.suitableFor.map((s, i) => <li key={i} className="text-[8px] text-[var(--text-secondary)]">{s}</li>)}
                  </ul>
                </div>
                <div>
                  <span className="text-[9px] font-semibold text-red-400">Not suitable for</span>
                  <ul className="list-disc list-inside">
                    {c.notSuitableFor.map((n, i) => <li key={i} className="text-[8px] text-red-400">{n}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'supervision' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => handleDownload('guidance-html')} className="flex items-center gap-1 rounded px-2 py-1 text-[9px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
              <Download size={10} /> Download (HTML)
            </button>
          </div>
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-[11px]">Supervised Professional Use</CardTitle>
              <CardDescription className="text-[9px]">Guidelines for professional deployment with human review in the loop</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="space-y-2 text-[9px] text-[var(--text-secondary)]">
                <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">What Supervised Use Means</h3>
                <p>Supervised professional use means that all Budget Engineer outputs must be reviewed, verified, and signed off by a qualified human professional before being used for any real-world decision, submission, or construction activity.</p>
                <h3 className="text-[10px] font-semibold text-[var(--text-primary)] mt-2">Required Human Review Areas</h3>
                {CAPABILITY_GROUPS.filter(g => g.requiresHumanReview).map(g => (
                  <div key={g.id} className="ml-3">\u2022 <strong>{g.label}:</strong> {g.humanReviewNote || 'Professional review required.'}</div>
                ))}
                <h3 className="text-[10px] font-semibold text-[var(--text-primary)] mt-2">Operational Boundaries</h3>
                <div className="ml-3">1. No automated signoff</div>
                <div className="ml-3">2. No code compliance certification</div>
                <div className="ml-3">3. No structural certification</div>
                <div className="ml-3">4. No multi-user sync</div>
                <div className="ml-3">5. Data responsibility is the user's</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--text-primary)]">Progress</span>
                  <span className="text-[9px] text-[var(--text-secondary)]">{completedCount}/{totalCount} ({completionPct}%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDownload('checklist-html')} className="flex items-center gap-1 rounded px-2 py-1 text-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                    <Download size={8} /> Export
                  </button>
                  <button onClick={handleResetChecklist} className="flex items-center gap-1 rounded px-2 py-1 text-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                    <RefreshCw size={8} /> Reset
                  </button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: completionPct + '%', background: completionPct === 100 ? '#22c55e' : completionPct > 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
              {completionPct < 100 && <p className="text-[8px] text-amber-400 mt-1">{totalCount - completedCount} item(s) remaining</p>}
            </CardContent>
          </Card>
          <label className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)] cursor-pointer">
            <input type="checkbox" checked={showAllChecked} onChange={(e) => setShowAllChecked(e.target.checked)} className="rounded border-[var(--border-default)]" />
            Show completed items
          </label>
          {visibleChecklist.map((item) => {
            const state = checklistItems[item.id];
            const isChecked = state?.checked ?? false;
            return (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isChecked} onChange={() => handleToggleChecklist(item.id)} className="mt-0.5 rounded border-[var(--border-default)]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={'text-[9px] font-medium ' + (isChecked ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]')}>{item.label}</span>
                        <Badge variant="secondary" className="text-[7px] px-1 py-0">{item.category}</Badge>
                      </div>
                      <p className="text-[8px] text-[var(--text-tertiary)]">{item.description}</p>
                      <p className="text-[7px] text-[var(--text-muted)]">Verify: {item.verificationMethod}</p>
                      {state?.notes && <div className="mt-1 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[7px] text-[var(--text-secondary)] italic">{state.notes}</div>}
                      <div className="mt-1 flex items-center gap-1">
                        {newNoteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input type="text" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder="Add note..."
                              className="w-40 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[8px] text-[var(--text-primary)] outline-none"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(item.id); if (e.key === 'Escape') { setNewNoteId(null); setNewNoteText(''); } }} autoFocus />
                            <button onClick={() => handleSaveNote(item.id)} className="text-[7px] text-[var(--brand-accent)]">Save</button>
                            <button onClick={() => { setNewNoteId(null); setNewNoteText(''); }} className="text-[7px] text-[var(--text-tertiary)]">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setNewNoteId(item.id); setNewNoteText(state?.notes ?? ''); }} className="text-[7px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                            {state?.notes ? 'Edit note' : 'Add note'}
                          </button>
                        )}
                      </div>
                    </div>
                    {isChecked && <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-green-400" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'manifest' && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px]">Capability Manifest</CardTitle>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDownload('capability-json')} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Download JSON"><Download size={10} /></button>
                  <button onClick={() => handleDownload('capability-html')} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Download HTML"><FileText size={10} /></button>
                </div>
              </div>
              <CardDescription className="text-[9px]">{capabilityManifest.totalCapabilities} capabilities \u00b7 {capabilityManifest.requiresHumanReviewCount} require human review</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success">{capabilityManifest.maturityBreakdown.mature} Mature</Badge>
                <Badge>{capabilityManifest.maturityBreakdown.established} Established</Badge>
                <Badge variant="warning">{capabilityManifest.maturityBreakdown.emerging} Emerging</Badge>
                <Badge variant="danger">{capabilityManifest.maturityBreakdown.foundation} Foundation</Badge>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {capabilityManifest.entries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1 border-b border-[var(--border-default)] last:border-0 text-[8px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--text-primary)]">{e.label}</span>
                      {e.requiresHumanReview && <ShieldCheck size={8} className="text-amber-400" />}
                    </div>
                    <Badge variant={e.maturity === 'mature' ? 'success' : e.maturity === 'established' ? 'default' : e.maturity === 'emerging' ? 'warning' : 'danger'} className="text-[7px] px-1 py-0">{e.maturity}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px]">Deployment Manifest</CardTitle>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDownload('deployment-json')} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Download JSON"><Download size={10} /></button>
                  <button onClick={() => handleDownload('deployment-html')} className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" title="Download HTML"><FileText size={10} /></button>
                </div>
              </div>
              <CardDescription className="text-[9px]">{deploymentManifest.totalProfiles} deployment profiles</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              {deploymentManifest.entries.map((e) => (
                <div key={e.id} className="py-1.5 border-b border-[var(--border-default)] last:border-0">
                  <div className="text-[9px] font-medium text-[var(--text-primary)]">{e.label}</div>
                  <div className="text-[8px] text-[var(--text-tertiary)]">{e.infrastructure}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'evaluation' && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[11px]">Evaluation Report</CardTitle>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDownload('report-html')} className="flex items-center gap-1 rounded px-2 py-1 text-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                    <Download size={8} /> HTML
                  </button>
                  <button onClick={() => handleDownload('report-json')} className="flex items-center gap-1 rounded px-2 py-1 text-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">
                    <Download size={8} /> JSON
                  </button>
                </div>
              </div>
              <CardDescription className="text-[9px]">
                Budget Engineer v{evaluationReport.productVersion} \u2014 Generated {new Date(evaluationReport.generatedAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-2 text-center">
                  <div className="text-lg font-bold text-green-400">{evaluationReport.capabilitySummary.mature}</div>
                  <div className="text-[8px] text-[var(--text-tertiary)]">Mature</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-center">
                  <div className="text-lg font-bold text-blue-400">{evaluationReport.capabilitySummary.established}</div>
                  <div className="text-[8px] text-[var(--text-tertiary)]">Established</div>
                </div>
                <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-2 text-center">
                  <div className="text-lg font-bold text-orange-400">{evaluationReport.capabilitySummary.emerging}</div>
                  <div className="text-[8px] text-[var(--text-tertiary)]">Emerging</div>
                </div>
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2 text-center">
                  <div className="text-lg font-bold text-red-400">{evaluationReport.capabilitySummary.foundation}</div>
                  <div className="text-[8px] text-[var(--text-tertiary)]">Foundation</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-[var(--text-secondary)]">{evaluationReport.capabilitySummary.requiresHumanReview}/{evaluationReport.capabilitySummary.total} capabilities require human review</span>
                <Badge variant={deploymentRec.supervisionLevel === 'supervised-professional' ? 'warning' : 'secondary'}>
                  {deploymentRec.supervisionLevel === 'supervised-professional' ? 'Supervised' : deploymentRec.supervisionLevel === 'pilot-evaluation' ? 'Pilot' : 'Unsupervised'}
                </Badge>
              </div>
              <div className="rounded-md bg-amber-500/5 border border-amber-500/20 px-2 py-1.5 text-[8px] text-amber-400">
                Recommended deployment: {DEPLOYMENT_PROFILES.find(p => p.id === deploymentRec.recommendedProfile)?.label} \u2014 {deploymentRec.rationale}
              </div>
              <div className="text-[9px]">
                <span className="font-semibold text-[var(--text-primary)]">Checklist: </span>
                <span className="text-[var(--text-secondary)]">{evaluationReport.checklistSummary.checked}/{evaluationReport.checklistSummary.total} ({evaluationReport.checklistSummary.completionPct}%)</span>
              </div>
              {evaluationReport.checklistSummary.unresolvedCategories.length > 0 && (
                <div className="text-[8px] text-red-400">
                  Unresolved categories: {evaluationReport.checklistSummary.unresolvedCategories.join(', ')}
                </div>
              )}
              <div className="text-[9px]">
                <span className="font-semibold text-[var(--text-primary)]">Human Review Areas:</span>
                <span className="text-[var(--text-secondary)]"> {evaluationReport.humanReviewAreas.length} areas require professional signoff</span>
              </div>
              <div className="flex items-center gap-1 text-[8px] text-[var(--text-tertiary)]">
                <Info size={8} />
                See full report for deployment constraints, known limitations, and supervision guidance.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
