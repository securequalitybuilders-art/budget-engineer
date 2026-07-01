import { useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { buildGovernanceSummary } from '@/adapters/governanceAdapter';
import {
  Shield, CheckCircle, Circle, Clock, Fingerprint, FileText,
  AlertTriangle, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import type { DesignOption } from '@/domain/boq';

interface GovernancePanelProps {
  selectedDesign?: DesignOption | null;
  hasBim?: boolean;
  hasBoq?: boolean;
  hasAnalysis?: boolean;
}

const statusColors: Record<string, string> = {
  draft: 'text-yellow-400',
  ready_for_review: 'text-blue-400',
  reviewed: 'text-green-400',
  exported: 'text-cyan-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for Review',
  reviewed: 'Reviewed',
  exported: 'Exported',
};

export function GovernancePanel({ selectedDesign, hasBim, hasBoq, hasAnalysis }: GovernancePanelProps) {
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
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-3">
          {/* Status + fingerprint */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${statusColors[summary.status]}`}>
              {statusLabels[summary.status]}
            </span>
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
                <div key={role.role} className="text-[10px]">
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
          {summary.warnings.length > 0 && (
            <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-2">
              <div className="space-y-0.5">
                {summary.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-yellow-400">{w}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
