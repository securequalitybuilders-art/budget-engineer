import { useState, useMemo, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { buildGovernanceSummary } from '@/adapters/governanceAdapter';
import {
  Shield, CheckCircle, Circle, Clock, Fingerprint, FileText,
  AlertTriangle, ChevronDown, ChevronUp, Users, Send, ThumbsUp,
  RotateCcw, MessageSquare, UserCheck,
} from 'lucide-react';
import type { DesignOption } from '@/domain/boq';
import {
  loadGovernanceWorkflow,
  submitForReview,
  approveProject,
  requestChanges,
  resetGovernance,
  addGovernanceCommentAction,
} from '@/services/governanceWorkflowService';
import type { DemoRole, GovernanceWorkflowState, CommentType, GovernanceTimelineEvent } from '@/services/governanceWorkflowService';

interface GovernancePanelProps {
  selectedDesign?: DesignOption | null;
  hasBim?: boolean;
  hasBoq?: boolean;
  hasAnalysis?: boolean;
  projectId?: string | null;
}

const statusColors: Record<string, string> = {
  draft: 'text-yellow-400',
  ready_for_review: 'text-blue-400',
  reviewed: 'text-green-400',
  exported: 'text-cyan-400',
  'in-review': 'text-blue-400',
  approved: 'text-green-400',
  'changes-requested': 'text-red-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for Review',
  reviewed: 'Reviewed',
  exported: 'Exported',
  'in-review': 'In Review',
  approved: 'Approved',
  'changes-requested': 'Changes Requested',
};

const workflowStatusColors: Record<string, string> = {
  draft: 'text-yellow-400',
  'in-review': 'text-blue-400',
  approved: 'text-green-400',
  'changes-requested': 'text-red-400',
};

const roleLabels: Record<DemoRole, string> = {
  owner: 'Owner',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

export function GovernancePanel({ selectedDesign, hasBim, hasBoq, hasAnalysis, projectId }: GovernancePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const transactions = useProjectStore((s) => s.transactions);
  const currentProject = useProjectStore((s) => s.currentProject);

  const summary = useMemo(
    () =>
      buildGovernanceSummary({
        selectedDesign,
        hasBim,
        hasBoq,
        hasAnalysis,
        transactions,
        projectCreatedAt: currentProject?.createdAt,
        projectUpdatedAt: currentProject?.updatedAt,
      }),
    [selectedDesign, hasBim, hasBoq, hasAnalysis, transactions, currentProject],
  );

  const [currentRole, setCurrentRole] = useState<DemoRole>('owner');
  const [workflowState, setWorkflowState] = useState<GovernanceWorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<CommentType>('general');

  const loadWorkflow = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const state = await loadGovernanceWorkflow(projectId, currentRole);
      setWorkflowState(state);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentRole]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const handleAction = useCallback(async (action: string) => {
    if (!projectId || !workflowState) return;
    setIsLoading(true);
    try {
      let state: GovernanceWorkflowState;
      switch (action) {
        case 'submit':
          state = await submitForReview(projectId, currentRole);
          break;
        case 'approve':
          state = await approveProject(projectId, currentRole, commentText || undefined);
          break;
        case 'request-changes':
          state = await requestChanges(projectId, currentRole, commentText || undefined);
          break;
        case 'reset':
          state = await resetGovernance(projectId, currentRole);
          break;
        default:
          return;
      }
      setWorkflowState(state);
      if (action !== 'submit' && action !== 'reset') {
        setCommentText('');
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [projectId, workflowState, currentRole, commentText]);

  const handleAddComment = useCallback(async () => {
    if (!projectId || !commentText.trim()) return;
    setIsLoading(true);
    try {
      const state = await addGovernanceCommentAction({
        projectId,
        actorRole: currentRole,
        type: commentType,
        message: commentText,
      });
      setWorkflowState(state);
      setCommentText('');
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentRole, commentType, commentText]);

  const canSubmit = currentRole === 'owner' && workflowState?.status === 'draft';
  const canApprove = currentRole === 'reviewer' && workflowState?.status === 'in-review';
  const canRequestChanges = currentRole === 'reviewer' && workflowState?.status === 'in-review';
  const canReset = currentRole === 'owner' && (workflowState?.status === 'in-review' || workflowState?.status === 'changes-requested' || workflowState?.status === 'approved');
  const canComment = currentRole === 'owner' || currentRole === 'reviewer';
  const isViewer = currentRole === 'viewer';

  return (
    <div className="flex w-64 flex-shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2 hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-[var(--brand-accent)]" />
          <h3 className="font-display text-sm font-semibold">Governance</h3>
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">
          {/* Role selector */}
          {projectId && (
            <div>
              <h4 className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <UserCheck size={10} />
                Demo Role
              </h4>
              <div className="flex gap-1">
                {(['owner', 'reviewer', 'viewer'] as DemoRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => setCurrentRole(role)}
                    className={`flex-1 rounded px-2 py-1 text-[10px] font-medium ${
                      currentRole === role
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status badges: adapter status + workflow status */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${statusColors[summary.status]}`}>
              {statusLabels[summary.status]}
            </span>
            {workflowState && (
              <span className={`text-xs font-semibold ${workflowStatusColors[workflowState.status]}`}>
                [{statusLabels[workflowState.status]}]
              </span>
            )}
            {summary.fingerprint && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text-muted)]" title={`Fingerprint: ${summary.fingerprint}`}>
                <Fingerprint size={10} />
                {summary.fingerprint.slice(0, 8)}
              </span>
            )}
          </div>

          {/* Created date */}
          {summary.generatedAt && (
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <Clock size={10} />
              Created: {new Date(summary.generatedAt).toLocaleDateString()}
            </div>
          )}

          {/* Workflow action buttons */}
          {projectId && workflowState && (
            <div className="space-y-2 rounded border border-[var(--border-default)] bg-white/5 p-2">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Workflow Actions
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => handleAction('submit')}
                  disabled={!canSubmit || isLoading}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium ${
                    canSubmit && !isLoading
                      ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                      : 'cursor-not-allowed bg-white/5 text-[var(--text-muted)] opacity-50'
                  }`}
                  title={isViewer ? 'Viewers cannot submit for review' : 'Submit for review'}
                >
                  <Send size={10} />
                  Submit
                </button>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={!canApprove || isLoading}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium ${
                    canApprove && !isLoading
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'cursor-not-allowed bg-white/5 text-[var(--text-muted)] opacity-50'
                  }`}
                  title={isViewer ? 'Viewers cannot approve' : 'Approve project'}
                >
                  <ThumbsUp size={10} />
                  Approve
                </button>
                <button
                  onClick={() => handleAction('request-changes')}
                  disabled={!canRequestChanges || isLoading}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium ${
                    canRequestChanges && !isLoading
                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                      : 'cursor-not-allowed bg-white/5 text-[var(--text-muted)] opacity-50'
                  }`}
                  title={isViewer ? 'Viewers cannot request changes' : 'Request changes'}
                >
                  <RotateCcw size={10} />
                  Changes
                </button>
                <button
                  onClick={() => handleAction('reset')}
                  disabled={!canReset || isLoading}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium ${
                    canReset && !isLoading
                      ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                      : 'cursor-not-allowed bg-white/5 text-[var(--text-muted)] opacity-50'
                  }`}
                  title="Reset to draft"
                >
                  <RotateCcw size={10} />
                  Reset
                </button>
              </div>
              {isLoading && (
                <p className="text-[10px] text-cyan-400">Processing...</p>
              )}
            </div>
          )}

          {/* Comment box */}
          {projectId && canComment && workflowState && (
            <div className="space-y-1.5">
              <h4 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <MessageSquare size={10} />
                Add Comment
              </h4>
              <select
                value={commentType}
                onChange={(e) => setCommentType(e.target.value as CommentType)}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[10px] text-[var(--text-primary)]"
                aria-label="Comment type"
              >
                <option value="general">General</option>
                <option value="review">Review</option>
                <option value="approval">Approval</option>
                <option value="change-request">Change Request</option>
              </select>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type your comment..."
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[10px] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                rows={2}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || isLoading}
                className="flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={10} />
                Send
              </button>
            </div>
          )}

          {/* Timeline */}
          {projectId && workflowState && workflowState.timeline.length > 0 && (
            <div>
              <h4 className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Clock size={10} />
                Governance Timeline
              </h4>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {workflowState.timeline.map((event: GovernanceTimelineEvent) => (
                  <div key={event.id} className="flex items-start gap-2 border-l-2 border-[var(--border-default)] pl-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-[var(--text-primary)]">
                          {event.author}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          ({event.role})
                        </span>
                        <span className="ml-auto shrink-0 text-[9px] text-[var(--text-muted)]">
                          {new Date(event.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)]">{event.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval readiness checklist */}
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <CheckCircle size={10} />
              Approval Readiness
            </h4>
            <div className="space-y-1.5">
              {summary.checklistItems.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                  {item.satisfied ? (
                    <CheckCircle size={12} className="mt-0.5 shrink-0 text-green-400" />
                  ) : (
                    <Circle size={12} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                  )}
                  <div>
                    <span className="text-[var(--text-primary)]">{item.label}</span>
                    <p className="text-[10px] text-[var(--text-secondary)]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RBAC roles */}
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Users size={10} />
              Roles & Permissions
            </h4>
            <div className="space-y-1">
              {summary.roleDescriptions.map((role) => (
                <div key={role.role} className={`text-[10px] ${currentRole === role.role.toLowerCase() ? 'rounded bg-cyan-500/10 p-1' : ''}`}>
                  <span className="font-medium text-[var(--text-primary)]">{role.role}</span>
                  <p className="text-[var(--text-muted)]">{role.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[10px] italic text-[var(--text-muted)]">
              Local demo mode — no real authentication.
            </p>
          </div>

          {/* Audit trail */}
          <div>
            <h4 className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <FileText size={10} />
              Recent Activity
            </h4>
            {summary.recentTransactions.length > 0 ? (
              <div className="space-y-1">
                {summary.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-start gap-2">
                    <FileText size={10} className="mt-0.5 shrink-0 text-[var(--brand-accent)]" />
                    <div>
                      <span className="text-[10px] text-[var(--text-primary)]">
                        {tx.action} {tx.entityType}
                      </span>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--text-muted)]">
                No activity yet. Generate a design to see events.
              </p>
            )}
          </div>

          {/* Recommendations */}
          {summary.recommendations.length > 0 && (
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Recommendations
              </h4>
              <div className="space-y-1">
                {summary.recommendations.map((rec, i) => (
                  <p key={i} className="flex items-start gap-1 text-[10px] text-blue-400">
                    <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                    {rec}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-yellow-400">
                Demo governance is stored in this browser. It is not legal approval.
              </p>
              {summary.warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-yellow-400">{w}</p>
              ))}
              {workflowState?.warnings.map((w, i) => (
                <p key={`wf-${i}`} className="text-[10px] text-yellow-400">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
