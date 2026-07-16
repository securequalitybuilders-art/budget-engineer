import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssuranceStore } from '@/stores/assuranceStore';
import { useAuthStore } from '@/stores/authStore';
import { computeProjectReadiness } from '@/lib/lifecycle/lifecycleSummary';
import { ProjectReadinessChip } from '@/components/lifecycle/ProjectReadinessChip';
import { EmptyState } from '@/components/lifecycle/EmptyState';
import { NextStepHint } from '@/components/lifecycle/NextStepHint';
import { CrossStudioLinks, buildStudioLink } from '@/components/lifecycle/CrossStudioLinks';
import { ShieldCheck, ArrowRight, Eye } from 'lucide-react';

interface AssurancePanelProps {
  projectId: string;
}

type TabId = 'feasibility' | 'risk-gates' | 'risk-register' | 'solvency';

const TABS: { id: TabId; label: string }[] = [
  { id: 'feasibility', label: 'Feasibility' },
  { id: 'risk-gates', label: 'Risk Gates' },
  { id: 'risk-register', label: 'Risk Register' },
  { id: 'solvency', label: 'Solvency' },
];

const GATE_STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-gray-500/20 text-gray-400',
  'in-progress': 'bg-blue-500/20 text-blue-400',
  passed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  waived: 'bg-amber-500/20 text-amber-400',
};

const RISK_SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

export function AssurancePanel({ projectId }: AssurancePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('feasibility');
  const { feasibilityAssessments, riskGates, riskRegister, solvencyChecks } =
    useAssuranceStore();
  const user = useAuthStore((s) => s.user);

  const latestAssessment = useMemo(
    () => feasibilityAssessments.sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0],
    [feasibilityAssessments]
  );

  const readiness = useMemo(() => computeProjectReadiness({
    feasibilityAssessments,
    riskGates,
    riskRegister,
    solvencyChecks,
  }), [feasibilityAssessments, riskGates, riskRegister, solvencyChecks]);

  const sortedGates = useMemo(
    () => [...riskGates].sort((a, b) => a.order - b.order),
    [riskGates]
  );

  const hasData = feasibilityAssessments.length > 0 || riskGates.length > 0 || riskRegister.length > 0 || solvencyChecks.length > 0;

  const crossLinks = useMemo(() => [
    buildStudioLink(projectId, 'delivery', 'Delivery', 'View milestone-linked deliveries'),
    buildStudioLink(projectId, 'project-controls', 'Project Controls', 'See assurance impact on controls'),
  ], [projectId]);

  const nextAction = useMemo(() => {
    if (readiness.overallState === 'not-started') {
      return { hint: 'Start by completing a project intake and feasibility assessment.', severity: 'info' as const };
    }
    if (readiness.overallState === 'blocked') {
      const failedGates = readiness.blockedGateNames.length > 0
        ? `Failed gates: ${readiness.blockedGateNames.join(', ')}. Review and re-assess.`
        : 'Resolve blockers to proceed.';
      return { hint: failedGates, severity: 'warning' as const, actionLabel: 'Review gates', actionTo: `/project/${projectId}/studio/assurance` };
    }
    if (readiness.overallState === 'cleared') {
      return { hint: 'All gates passed. Project is cleared to proceed.', severity: 'success' as const };
    }
    if (readiness.overallState === 'deferred') {
      return { hint: 'Conditional clearance — monitor deferred items.', severity: 'warning' as const };
    }
    if (readiness.overallState === 'rejected') {
      return { hint: 'Project rejected. Owner review required to proceed.', severity: 'warning' as const };
    }
    if (readiness.overallState === 'in-feasibility') {
      return { hint: 'Feasibility in progress. Complete assessment to determine next steps.', severity: 'info' as const };
    }
    return null;
  }, [readiness, projectId]);

  return (
    <div className="space-y-6">
      {/* Readiness banner with next action */}
      {nextAction && (
        <NextStepHint
          hint={nextAction.hint}
          actionLabel={nextAction.actionLabel}
          actionTo={nextAction.actionTo}
          severity={nextAction.severity}
        />
      )}

      {/* Role indicator */}
      {user.role !== 'owner' && (
        <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
          <Eye size={12} className="text-amber-400" />
          <span className="text-[9px] text-amber-300">
            {user.role === 'viewer' ? 'Viewing as Viewer — assurance actions are read-only.' : 'Reviewing — you can comment but not approve.'}
          </span>
        </div>
      )}

      <div className="flex gap-0 border-b border-stone-700/60 bg-stone-900/30 rounded-t-xl overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-stone-400 hover:text-stone-300 hover:border-stone-500'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!hasData ? (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title="No assurance data yet"
          description="Assurance gates, feasibility, and risk tracking are empty. Start by completing a project intake and feasibility assessment."
          actionLabel="Go to Delivery"
          actionTo={`/project/${projectId}/studio/delivery`}
        />
      ) : (
        <>
          {activeTab === 'feasibility' && (
            <div className="space-y-4">
              {latestAssessment ? (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Latest Feasibility Assessment</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      latestAssessment.overallResult === 'pass' ? 'bg-green-500/20 text-green-400' :
                      latestAssessment.overallResult === 'conditional' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {latestAssessment.overallResult}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                      <div className="text-[10px] text-[var(--text-muted)]">Budget</div>
                      <div className={`text-sm font-semibold ${latestAssessment.budgetFeasibility === 'pass' ? 'text-green-400' : latestAssessment.budgetFeasibility === 'conditional' ? 'text-amber-400' : 'text-red-400'}`}>
                        {latestAssessment.budgetFeasibility} ({latestAssessment.budgetScore}/100)
                      </div>
                    </div>
                    <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                      <div className="text-[10px] text-[var(--text-muted)]">Timeline</div>
                      <div className={`text-sm font-semibold ${latestAssessment.timelineFeasibility === 'pass' ? 'text-green-400' : latestAssessment.timelineFeasibility === 'conditional' ? 'text-amber-400' : 'text-red-400'}`}>
                        {latestAssessment.timelineFeasibility} ({latestAssessment.timelineScore}/100)
                      </div>
                    </div>
                    <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                      <div className="text-[10px] text-[var(--text-muted)]">Technical</div>
                      <div className={`text-sm font-semibold ${latestAssessment.technicalFeasibility === 'pass' ? 'text-green-400' : latestAssessment.technicalFeasibility === 'conditional' ? 'text-amber-400' : 'text-red-400'}`}>
                        {latestAssessment.technicalFeasibility} ({latestAssessment.technicalScore}/100)
                      </div>
                    </div>
                    <div className="rounded-md bg-[var(--bg-tertiary)] p-2">
                      <div className="text-[10px] text-[var(--text-muted)]">Resource</div>
                      <div className={`text-sm font-semibold ${latestAssessment.resourceFeasibility === 'pass' ? 'text-green-400' : latestAssessment.resourceFeasibility === 'conditional' ? 'text-amber-400' : 'text-red-400'}`}>
                        {latestAssessment.resourceFeasibility} ({latestAssessment.resourceScore}/100)
                      </div>
                    </div>
                  </div>
                  {latestAssessment.notes && (
                    <p className="text-xs text-[var(--text-secondary)]">{latestAssessment.notes}</p>
                  )}
                  {latestAssessment.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-[var(--text-primary)] mb-1">Recommendations</h4>
                      <ul className="space-y-1">
                        {latestAssessment.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-accent)]" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  title="No feasibility assessment yet"
                  description="Complete the project intake to begin."
                  compact
                />
              )}
            </div>
          )}

          {activeTab === 'risk-gates' && (
            <div className="space-y-2">
              {sortedGates.length === 0 ? (
                <EmptyState
                  title="No risk gates defined"
                  description="Configure project gates to proceed with assurance tracking."
                  compact
                />
              ) : (
                <>
                  {/* Gate progress summary */}
                  <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[var(--text-muted)]">Gate Progress</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {sortedGates.filter((g) => g.status === 'passed' || g.status === 'waived').length}/{sortedGates.length} passed
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${(sortedGates.filter((g) => g.status === 'passed' || g.status === 'waived').length / sortedGates.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  {sortedGates.map((gate) => (
                    <div key={gate.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">{gate.name}</span>
                          <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">
                            {gate.gateType}
                          </span>
                          {gate.required && (
                            <span className="text-[9px] text-red-400">Required</span>
                          )}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${GATE_STATUS_COLORS[gate.status] || ''}`}>
                          {gate.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-2">{gate.description}</p>
                      {gate.criteria.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {gate.criteria.map((c, i) => (
                            <span key={i} className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-secondary)]">{c}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                        <span>Order: {gate.order}</span>
                        <span>Checked by: {gate.checkedBy}</span>
                        {gate.approvedBy && <span>Approved: {gate.approvedBy}</span>}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'risk-register' && (
            <div className="space-y-2">
              {riskRegister.length === 0 ? (
                <EmptyState
                  title="Risk register is empty"
                  description="Add risks to begin tracking project threats and mitigations."
                  compact
                />
              ) : (
                riskRegister.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-medium text-[var(--text-primary)]">{entry.description.slice(0, 80)}{entry.description.length > 80 ? '…' : ''}</span>
                        <span className="ml-2 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{entry.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${RISK_SEVERITY_COLORS[entry.severity] || ''}`}>
                          {entry.severity}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">Score: {entry.riskScore}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 text-[9px] text-[var(--text-tertiary)]">
                      <span>Owner: {entry.owner}</span>
                      <span>Status: {entry.status}</span>
                      <span>L: {entry.likelihood} I: {entry.impact}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'solvency' && (
            <div className="space-y-2">
              {solvencyChecks.length === 0 ? (
                <EmptyState
                  title="No solvency checks recorded"
                  description="Run solvency checks on contractors and suppliers before awarding procurement."
                  compact
                />
              ) : (
                solvencyChecks.map((check) => (
                  <div key={check.id} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">{check.entityName}</span>
                        <span className="ml-2 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{check.entityType}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                        check.isSolvent ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {check.isSolvent ? 'Solvent' : 'Not Solvent'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] text-[var(--text-tertiary)]">
                      <span>Credit Score: {check.creditScore}</span>
                      <span>Date: {check.checkDate}</span>
                      <span>Checked by: {check.checkedBy}</span>
                      <span>Financials Reviewed: {check.financialStatementsReviewed ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Cross-studio navigation links */}
      <CrossStudioLinks projectId={projectId} links={crossLinks} title="Related contexts" />

      {/* Readiness footer */}
      <div className="flex items-center gap-2 border-t border-[var(--border-default)] pt-4">
        <ProjectReadinessChip />
        <span className="text-[9px] text-[var(--text-muted)]">
          {readiness.blockers.length > 0
            ? `Blocked by ${readiness.blockers.length} issue(s)`
            : readiness.overallState === 'cleared'
              ? 'All assurance gates passed — project is cleared to proceed'
              : readiness.overallState === 'deferred'
                ? 'Some gates deferred — monitor closely'
                : readiness.overallState === 'rejected'
                  ? 'Project is rejected — review required'
                  : 'Not yet assessed'}
        </span>
        {readiness.overallState === 'cleared' && (
          <Link
            to={`/project/${projectId}/studio/delivery`}
            className="ml-auto flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1 text-[9px] text-green-400 transition-colors hover:bg-green-500/20"
          >
            <ArrowRight size={10} />
            Proceed to Delivery
          </Link>
        )}
      </div>
    </div>
  );
}
