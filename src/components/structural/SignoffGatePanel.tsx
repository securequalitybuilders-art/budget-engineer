import { useState, useMemo, useCallback } from 'react'
import { evaluateGates, createInitialGovernance, transitionState, canSubmit, canApprove, canRequestChanges, canReset } from '@/lib/governance/governanceWorkflow'
import type { SignoffCheckInput, GovernanceState, SignoffRole, SignoffGate } from '@/lib/governance/governanceWorkflow'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'

interface SignoffGatePanelProps {
  plan: PlanModel | null
  design: DesignOption | null
  complianceScore?: number
  criticalIssues?: number
  reviewDecision?: 'PASS' | 'CONDITIONAL PASS' | 'REVISE' | null
  hasStructural?: boolean
  hasMep?: boolean
}

function GateRow({ gate }: { gate: SignoffGate }) {
  return (
    <div className={`flex items-center gap-2 rounded border px-2 py-1.5 text-[11px] ${
      gate.passed
        ? 'border-emerald-700/40 bg-emerald-950/20'
        : 'border-stone-700/40 bg-stone-900/40'
    }`}>
      <span className={`text-sm ${gate.passed ? 'text-emerald-400' : 'text-stone-500'}`}>
        {gate.passed ? '✓' : '○'}
      </span>
      <div className="flex-1">
        <span className="font-medium text-stone-200">{gate.label}</span>
        {!gate.required && <span className="ml-1 text-[9px] text-stone-500">optional</span>}
        <p className="text-[9px] text-stone-500">{gate.description}</p>
      </div>
    </div>
  )
}

export function SignoffGatePanel({ plan, design, complianceScore, criticalIssues, reviewDecision, hasStructural, hasMep }: SignoffGatePanelProps) {
  const [governance, setGovernance] = useState<GovernanceState>(createInitialGovernance)
  const [comment, setComment] = useState('')

  const checkInput: SignoffCheckInput = useMemo(() => ({
    hasPlan: !!plan && plan.rooms.length > 0,
    hasDesign: !!design && design.grossFloorArea > 0,
    hasComplianceScore: complianceScore != null,
    complianceScore: complianceScore ?? 0,
    criticalIssues: criticalIssues ?? 0,
    reviewDecision: reviewDecision ?? null,
    hasStructural: hasStructural ?? false,
    hasMep: hasMep ?? false,
  }), [plan, design, complianceScore, criticalIssues, reviewDecision, hasStructural, hasMep])

  const gates = useMemo(() => evaluateGates(checkInput), [checkInput])
  const passedCount = gates.filter((g) => g.passed).length
  const totalCount = gates.length

  const handleAction = useCallback((action: 'submit' | 'approve' | 'request-changes' | 'reset') => {
    setGovernance((prev) => transitionState({ ...prev, comment }, action))
    if (action !== 'request-changes') setComment('')
  }, [comment])

  const handleRoleChange = useCallback((role: SignoffRole) => {
    setGovernance((prev) => ({ ...prev, role }))
  }, [])

  const submitAllowed = canSubmit(gates, governance)
  const approveAllowed = canApprove(governance, governance.role)
  const requestChangesAllowed = canRequestChanges(governance, governance.role)
  const resetAllowed = canReset(governance, governance.role)

  const workflowColor: Record<string, string> = {
    draft: 'text-stone-400',
    'in-review': 'text-amber-400',
    'changes-requested': 'text-red-400',
    approved: 'text-emerald-400',
  }

  return (
    <div className="space-y-3">
      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-2.5">
        <div className="flex items-start gap-2">
          <span className="mt-px text-sm text-stone-500">⚖</span>
          <div>
            <p className="text-xs font-medium text-amber-400">Project Governance — Not a Legal Signoff</p>
            <p className="mt-0.5 text-[10px] leading-tight text-amber-300/60">
              This signoff workflow is for project governance tracking only. It does not replace
              professional certification, regulatory approvals, or contractual signoffs required
              by local authorities or project stakeholders.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow State */}
      <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-cyan-300">Governance Workflow</h4>
          <span className={`text-[11px] font-bold uppercase ${workflowColor[governance.workflowState]}`}>
            {governance.workflowState.replace('-', ' ')}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span>Required gates: {gates.filter((g) => g.required).filter((g) => g.passed).length}/{gates.filter((g) => g.required).length}</span>
            <span>{passedCount}/{totalCount} total</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${totalCount > 0 ? (passedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Gates */}
        <div className="space-y-1">
          {gates.map((g) => (
            <GateRow key={g.id} gate={g} />
          ))}
        </div>
      </div>

      {/* Role & Actions */}
      <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
        <div className="mb-2 flex items-center gap-2">
          <label className="text-[10px] font-medium text-stone-400">Your Role</label>
          <select
            value={governance.role}
            onChange={(e) => handleRoleChange(e.target.value as SignoffRole)}
            className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-[11px] text-stone-200"
          >
            <option value="owner">Owner</option>
            <option value="reviewer">Reviewer</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* Comment */}
        <div className="mb-2">
          <label className="text-[10px] font-medium text-stone-400">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-stone-700 bg-stone-800 px-2 py-1 text-[11px] text-stone-200 placeholder-stone-500"
            placeholder="Add a note for the project record..."
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1.5">
          {(governance.workflowState === 'draft' || governance.workflowState === 'changes-requested') && (
            <button
              onClick={() => handleAction('submit')}
              disabled={!submitAllowed}
              className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${
                submitAllowed
                  ? 'bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30'
                  : 'cursor-not-allowed bg-stone-800 text-stone-600'
              }`}
            >
              Submit for Review
            </button>
          )}
          {governance.workflowState === 'in-review' && (
            <>
              <button
                onClick={() => handleAction('approve')}
                disabled={!approveAllowed}
                className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  approveAllowed
                    ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                    : 'cursor-not-allowed bg-stone-800 text-stone-600'
                }`}
              >
                Approve
              </button>
              <button
                onClick={() => handleAction('request-changes')}
                disabled={!requestChangesAllowed}
                className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  requestChangesAllowed
                    ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30'
                    : 'cursor-not-allowed bg-stone-800 text-stone-600'
                }`}
              >
                Request Changes
              </button>
            </>
          )}
          {(governance.workflowState === 'changes-requested' || governance.workflowState === 'approved') && (
            <button
              onClick={() => handleAction('reset')}
              disabled={!resetAllowed}
              className={`rounded px-2.5 py-1 text-[10px] font-medium transition-colors ${
                resetAllowed
                  ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                  : 'cursor-not-allowed bg-stone-800 text-stone-600'
              }`}
            >
              Reset to Draft
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-stone-700/60 bg-stone-950/80 p-2.5">
        <h4 className="mb-1.5 text-xs font-semibold text-cyan-300">Timeline</h4>
        <div className="space-y-1 text-[10px] text-stone-400">
          <div className="flex justify-between">
            <span>Status</span>
            <span className={`font-medium ${workflowColor[governance.workflowState]}`}>
              {governance.workflowState.replace('-', ' ')}
            </span>
          </div>
          {governance.submittedAt && (
            <div className="flex justify-between">
              <span>Submitted</span>
              <span>{new Date(governance.submittedAt).toLocaleString()}</span>
            </div>
          )}
          {governance.reviewedAt && (
            <div className="flex justify-between">
              <span>Reviewed</span>
              <span>{new Date(governance.reviewedAt).toLocaleString()}</span>
            </div>
          )}
          {governance.approvedBy && (
            <div className="flex justify-between">
              <span>Approved by</span>
              <span className="font-medium text-emerald-400">{governance.approvedBy}</span>
            </div>
          )}
          {governance.comment && (
            <div className="mt-1 rounded bg-stone-800/40 p-1.5 text-[9px] italic text-stone-500">
              "{governance.comment}"
            </div>
          )}
        </div>
      </div>

      {/* Approval stamp */}
      {governance.workflowState === 'approved' && (
        <div className="rounded-lg border-2 border-emerald-700/50 bg-emerald-950/20 p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">✓ APPROVED</p>
          <p className="text-[10px] text-emerald-600/80">
            Signed by {governance.approvedBy} on {governance.reviewedAt ? new Date(governance.reviewedAt).toLocaleDateString() : '—'}
          </p>
        </div>
      )}
    </div>
  )
}
