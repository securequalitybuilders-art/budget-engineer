import { useState, useMemo } from 'react';
import { FileText, Download, AlertTriangle, ShieldCheck, X, Link as LinkIcon, GitCompare, RefreshCw } from 'lucide-react';
import type { ReferenceTypology, StoreyProfile, WorkflowScope } from '@/lib/reference/referenceCaseModel';
import { CALIBRATION_MARKER_ANNOTATIONS } from '@/lib/reference/referenceCaseModel';
import type { AssessedProjectSnapshot } from '@/lib/selfAssessment/selfAssessmentModel';
import { buildSelfAssessmentReportData, downloadSelfAssessmentReport } from '@/lib/selfAssessment/selfAssessmentReport';
import { useSelfAssessmentStore } from '@/stores/selfAssessmentStore';
import type { AssessmentComparisonResult, ComparisonDiff } from '@/lib/selfAssessment/assessmentComparison';

const TYPOLOGIES: ReferenceTypology[] = [
  'house', 'villa', 'duplex', 'townhouse', 'apartment', 'mixed-use',
  'clinic', 'school', 'worship', 'warehouse', 'commercial-office', 'retail',
];

const STOREY_PROFILES: StoreyProfile[] = [
  'single-storey', 'two-storey', 'multi-storey-3-5', 'multi-storey-6-plus',
];

const WORKFLOW_OPTIONS: { value: WorkflowScope; label: string }[] = [
  { value: 'brief-to-plan', label: 'Brief to Plan' },
  { value: 'multi-storey-planning', label: 'Multi-Storey Planning' },
  { value: 'drawing-pack', label: 'Drawing Pack' },
  { value: 'structural-pre-design', label: 'Structural Pre-Design' },
  { value: 'mep-pre-design', label: 'MEP Pre-Design' },
  { value: 'code-compliance-check', label: 'Code Compliance Check' },
  { value: 'boq-cost-estimation', label: 'BOQ / Cost Estimation' },
  { value: 'site-analysis', label: 'Site Analysis' },
  { value: 'interior-documentation', label: 'Interior Documentation' },
  { value: 'delivery-workflow', label: 'Delivery Workflow' },
  { value: 'lifecycle-management', label: 'Lifecycle Management' },
  { value: 'package-export', label: 'Package Export' },
];

function RatingBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    strong: 'bg-green-900/30 text-green-400 border-green-700',
    adequate: 'bg-orange-900/30 text-orange-400 border-orange-700',
    weak: 'bg-red-900/30 text-red-400 border-red-700',
    'not-rated': 'bg-gray-800 text-gray-400 border-gray-600',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded ${colors[rating] ?? colors['not-rated']}`}>
      {rating}
    </span>
  );
}

function CalibrationTag({ marker }: { marker: string }) {
  const ann = CALIBRATION_MARKER_ANNOTATIONS[marker as keyof typeof CALIBRATION_MARKER_ANNOTATIONS];
  const colors: Record<string, string> = {
    'confirmed-behavior': 'text-green-400 border-green-700',
    'heuristic-output': 'text-orange-400 border-orange-700',
    'assumed-value': 'text-amber-400 border-amber-700',
    'unverified-before-construction': 'text-red-400 border-red-700',
  };
  return (
    <span className={`inline-block px-1 py-0.5 text-[9px] font-mono border rounded ${colors[marker] ?? 'text-gray-400 border-gray-600'}`}>
      {ann?.prefix ?? marker}
    </span>
  );
}

function DiffRow({ diff }: { diff: ComparisonDiff }) {
  const arrow = diff.changeType === 'improved' ? '↑' : diff.changeType === 'declined' ? '↓' : '→';
  const color = diff.changeType === 'improved' ? 'text-green-400' :
    diff.changeType === 'declined' ? 'text-red-400' :
    diff.changeType === 'added' ? 'text-blue-400' :
    diff.changeType === 'removed' ? 'text-orange-400' : 'text-gray-400';
  return (
    <div className="flex items-center gap-2 text-[10px] py-0.5">
      <span className={`font-mono font-bold ${color}`}>{arrow}</span>
      <span className="text-gray-300 flex-1">{diff.field}</span>
      {diff.before !== '—' && <span className="text-gray-500 line-through">{diff.before}</span>}
      <span className={`font-semibold ${color}`}>{diff.after}</span>
    </div>
  );
}

function ComparisonView({ comparison, onClose }: { comparison: AssessmentComparisonResult; onClose: () => void }) {
  const sections: { label: string; diffs: ComparisonDiff[] }[] = [
    { label: 'Readiness Tier', diffs: comparison.tier },
    { label: 'Domain Ratings', diffs: comparison.domains },
    { label: 'Matched Cases', diffs: comparison.matchedCases },
    { label: 'Risks', diffs: comparison.risks },
    { label: 'Supervision', diffs: comparison.supervision },
    { label: 'Deployment', diffs: comparison.deployment },
  ];

  const hasAny = sections.some(s => s.diffs.length > 0);

  return (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitCompare className="w-3.5 h-3.5 text-blue-400" />
          <h4 className="text-xs font-semibold text-gray-300">Comparison</h4>
        </div>
        <button onClick={onClose} className="p-0.5 text-gray-500 hover:text-gray-300">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex gap-3 mb-3 text-[10px] text-gray-400">
        <span className="text-orange-400">{comparison.beforeName} ({new Date(comparison.beforeDate).toLocaleDateString('en-GB')})</span>
        <span className="text-blue-400">{comparison.afterName} ({new Date(comparison.afterDate).toLocaleDateString('en-GB')})</span>
      </div>
      {!hasAny ? (
        <p className="text-[10px] text-gray-500">No significant differences between these assessments.</p>
      ) : (
        sections.map(s => s.diffs.length > 0 && (
          <div key={s.label} className="mb-2">
            <p className="text-[10px] font-semibold text-gray-400 mb-1">{s.label}</p>
            {s.diffs.map((d, i) => <DiffRow key={i} diff={d} />)}
          </div>
        ))
      )}
    </div>
  );
}

interface SelfAssessmentPanelProps {
  linkedSessionId?: string | null;
}

export function SelfAssessmentPanel({ linkedSessionId = null }: SelfAssessmentPanelProps) {
  const store = useSelfAssessmentStore();
  const [showForm, setShowForm] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState<string | null>(null);

  const [projectName, setProjectName] = useState('');
  const [typology, setTypology] = useState<ReferenceTypology>('house');
  const [storeyProfile, setStoreyProfile] = useState<StoreyProfile>('single-storey');
  const [selectedWorkflows, setSelectedWorkflows] = useState<WorkflowScope[]>(['brief-to-plan', 'drawing-pack']);
  const [notes, setNotes] = useState('');

  const activeAssessment = store.getActiveAssessment();
  const allAssessments = store.getAllAssessments();

  const comparison = useMemo(() => {
    if (!compareTargetId || !activeAssessment) return null;
    return store.compare(compareTargetId, activeAssessment.id);
  }, [compareTargetId, activeAssessment, store]);

  const staleCheck = useMemo(() => {
    if (!activeAssessment) return null;
    const current = { projectName, typology, storeyProfile, workflowScope: selectedWorkflows };
    return store.checkStaleness(activeAssessment.id, current);
  }, [activeAssessment, projectName, typology, storeyProfile, selectedWorkflows, store]);

  const reportData = useMemo(() => {
    if (!activeAssessment) return null;
    return buildSelfAssessmentReportData(activeAssessment.result);
  }, [activeAssessment]);

  const toggleWorkflow = (wf: WorkflowScope) => {
    setSelectedWorkflows(prev =>
      prev.includes(wf) ? prev.filter(w => w !== wf) : [...prev, wf]
    );
  };

  const handleRun = () => {
    const snapshot: AssessedProjectSnapshot = {
      projectName: projectName || 'Unnamed Project',
      typology,
      storeyProfile,
      workflowScope: selectedWorkflows,
      packageScope: [],
      lifecycleScope: [],
      notes,
    };
    store.runAssessment(snapshot, linkedSessionId);
    setShowForm(false);
  };

  const handleExport = () => {
    if (activeAssessment) downloadSelfAssessmentReport(activeAssessment.result);
  };

  const handleSelectAssessment = (id: string) => {
    store.setActiveAssessment(id);
    setCompareTargetId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareTargetId === id) setCompareTargetId(null);
    store.deleteAssessment(id);
  };

  const handleNewForm = () => {
    setProjectName('');
    setTypology('house');
    setStoreyProfile('single-storey');
    setSelectedWorkflows(['brief-to-plan', 'drawing-pack']);
    setNotes('');
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">Self-Assessment</h3>
      </div>

      {/* Recent assessments list */}
      {allAssessments.length > 0 && !showForm && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-300">Saved Assessments</h4>
            <button
              onClick={handleNewForm}
              className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 px-2 rounded transition-colors"
            >
              + New Assessment
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {allAssessments.map(a => (
              <div
                key={a.id}
                onClick={() => handleSelectAssessment(a.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[10px] transition-colors ${
                  activeAssessment?.id === a.id
                    ? 'bg-blue-900/40 border border-blue-700'
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-200 truncate">{a.name}</span>
                  {a.linkedSessionId && (
                    <LinkIcon className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                  )}
                  <span className={`text-[9px] font-semibold px-1 rounded ${
                    a.result.supervision.recommendedTier === 'blocked' ? 'bg-red-900/50 text-red-400' :
                    a.result.supervision.recommendedTier === 'internal-only' ? 'bg-amber-900/50 text-amber-400' :
                    a.result.supervision.recommendedTier === 'supervised-professional' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {a.result.supervision.tierLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-gray-500">{new Date(a.createdAt).toLocaleDateString('en-GB')}</span>
                  {activeAssessment && activeAssessment.id !== a.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCompareTargetId(a.id); }}
                      className={`p-0.5 transition-colors ${compareTargetId === a.id ? 'text-blue-400' : 'text-gray-500 hover:text-blue-400'}`}
                      title="Compare with active assessment"
                    >
                      <GitCompare className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(a.id, e)}
                    className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete assessment"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison view */}
      {comparison && (
        <ComparisonView comparison={comparison} onClose={() => setCompareTargetId(null)} />
      )}

      {/* Stale banner */}
      {activeAssessment && staleCheck?.isStale && !showForm && !comparison && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <RefreshCw className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-semibold text-amber-400">Assessment may be stale</p>
              <p className="text-[9px] text-amber-300 mt-0.5">
                The current form values differ from the saved snapshot:
              </p>
              {staleCheck.changedFields.map((f, i) => (
                <p key={i} className="text-[9px] text-amber-300 ml-2">{f.field}: {f.from} → {f.to}</p>
              ))}
              <button
                onClick={handleNewForm}
                className="mt-2 text-[9px] bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1 px-2 rounded transition-colors"
              >
                Run New Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New assessment button when list exists */}
      {allAssessments.length > 0 && !activeAssessment && !showForm && (
        <button
          onClick={handleNewForm}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors"
        >
          Run New Self-Assessment
        </button>
      )}

      {/* Show form */}
      {(showForm || (allAssessments.length === 0 && !activeAssessment)) && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-300">Project Snapshot</h4>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="My Project"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Typology</label>
              <select
                value={typology}
                onChange={e => setTypology(e.target.value as ReferenceTypology)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {TYPOLOGIES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Storey Profile</label>
              <select
                value={storeyProfile}
                onChange={e => setStoreyProfile(e.target.value as StoreyProfile)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {STOREY_PROFILES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Workflow Scope</label>
            <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
              {WORKFLOW_OPTIONS.map(w => (
                <label key={w.value} className="flex items-center gap-1 text-[10px] text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedWorkflows.includes(w.value)}
                    onChange={() => toggleWorkflow(w.value)}
                    className="accent-blue-500"
                  />
                  {w.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleRun}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors"
            >
              Run Self-Assessment
            </button>
            {allAssessments.length > 0 && (
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold py-1.5 px-3 rounded transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assessment result */}
      {activeAssessment && !showForm && !comparison && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400">
                {activeAssessment.result.matchedCases.length} matched reference case(s)
                <span className="mx-1">·</span>
                {reportData && <>{reportData.domainSummary.strong} strong / {reportData.domainSummary.weak} weak</>}
              </p>
              {activeAssessment.linkedSessionId && (
                <span className="flex items-center gap-1 text-[9px] text-blue-400">
                  <LinkIcon className="w-2.5 h-2.5" />
                  Linked to session
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleExport}
                className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-[10px] font-semibold py-1 px-2 rounded transition-colors">
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          {/* Matched Reference Cases */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Matched Reference Cases</h4>
            {activeAssessment.result.matchedCases.map(mc => (
              <div key={mc.caseId} className="flex items-center justify-between py-1 border-b border-gray-700 last:border-0">
                <div>
                  <span className="text-xs text-gray-200">{mc.caseName}</span>
                  <span className="ml-2 text-[10px] text-gray-400">
                    {mc.typologyMatch ? 'Typology ✓' : 'Typology ✗'}
                    {' · '}
                    {mc.storeyMatch ? 'Storey ✓' : 'Storey ✗'}
                  </span>
                </div>
                <span className="text-xs font-mono font-semibold text-blue-400">{mc.similarityScore}%</span>
              </div>
            ))}
            {activeAssessment.result.matchedCases[0]?.gaps.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-red-400 font-semibold">Gaps (top match):</p>
                {activeAssessment.result.matchedCases[0].gaps.map((g, i) => (
                  <p key={i} className="text-[9px] text-red-300 ml-2">{g}</p>
                ))}
              </div>
            )}
          </div>

          {/* Domain Ratings */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Domain Ratings</h4>
            <div className="space-y-1">
              {activeAssessment.result.domainRatings.map(d => (
                <div key={d.domain} className="flex items-center gap-2 text-[10px] py-0.5">
                  <RatingBadge rating={d.rating} />
                  <span className="text-gray-300 flex-1">{d.domain}</span>
                  <CalibrationTag marker={d.calibration} />
                </div>
              ))}
            </div>
          </div>

          {/* Supervision Summary */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Supervision & Readiness</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                activeAssessment.result.supervision.recommendedTier === 'blocked' ? 'bg-red-900/50 text-red-400' :
                activeAssessment.result.supervision.recommendedTier === 'internal-only' ? 'bg-amber-900/50 text-amber-400' :
                activeAssessment.result.supervision.recommendedTier === 'supervised-professional' ? 'bg-blue-900/50 text-blue-400' :
                'bg-green-900/50 text-green-400'
              }`}>
                {activeAssessment.result.supervision.tierLabel}
              </span>
              <span className="text-[10px] text-gray-400">{activeAssessment.result.supervision.rationale}</span>
            </div>
            {activeAssessment.result.supervision.mandatoryReviewAreas.length > 0 && (
              <div>
                <p className="text-[10px] text-red-400 font-semibold">Mandatory Review Areas:</p>
                {activeAssessment.result.supervision.mandatoryReviewAreas.map((a, i) => (
                  <p key={i} className="text-[9px] text-red-300 ml-2">{a}</p>
                ))}
              </div>
            )}
          </div>

          {/* Risks */}
          {activeAssessment.result.risks.length > 0 && (
            <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <h4 className="text-xs font-semibold text-gray-300">Key Risks & Assumptions</h4>
              </div>
              <div className="space-y-1">
                {activeAssessment.result.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] py-0.5">
                    <span className={`mt-0.5 font-semibold ${
                      risk.impact === 'high' ? 'text-red-400' :
                      risk.impact === 'medium' ? 'text-orange-400' : 'text-amber-400'
                    }`}>
                      {risk.impact}
                    </span>
                    <span className="text-gray-300 flex-1">{risk.area}</span>
                    <CalibrationTag marker={risk.calibration} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deployment Context */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Deployment Context</h4>
            {activeAssessment.result.deploymentContext.recommendedFor.map((item, i) => (
              <p key={i} className="text-[9px] text-green-300 ml-2">+ {item}</p>
            ))}
            {activeAssessment.result.deploymentContext.notRecommendedFor.map((item, i) => (
              <p key={i} className="text-[9px] text-red-300 ml-2">- {item}</p>
            ))}
          </div>

          {/* Footer disclaimer */}
          <div className="bg-gray-800/40 border border-gray-700 rounded p-2">
            <div className="flex items-start gap-1">
              <ShieldCheck className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
              <p className="text-[9px] text-gray-500">
                This self-assessment is for internal capability evaluation only. It does not constitute
                professional design approval, regulatory signoff, or certification of fitness for construction.
                All outputs require qualified professional review before use in real projects.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
