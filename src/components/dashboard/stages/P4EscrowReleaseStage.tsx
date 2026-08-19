import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ShieldCheck } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { escrowSummary } from '@/engine/sitehawk/escrowTrigger';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

export function P4EscrowReleaseStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { escrowMilestones, escrowReleases, isLoading, loadForProject, addEscrowMilestone, transitionEscrow } = useSiteHawkStore(
    useShallow((s) => ({
      escrowMilestones: s.escrowMilestones,
      escrowReleases: s.escrowReleases,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addEscrowMilestone: s.addEscrowMilestone,
      transitionEscrow: s.transitionEscrow,
    })),
  );

  const [milestoneName, setMilestoneName] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectMilestones = useMemo(
    () => escrowMilestones.filter((m) => m.projectId === projectId),
    [escrowMilestones, projectId],
  );
  const projectReleases = useMemo(
    () => escrowReleases.filter((r) => r.projectId === projectId),
    [escrowReleases, projectId],
  );
  const summary = useMemo(() => escrowSummary(projectMilestones), [projectMilestones]);

  const handleAdd = useCallback(async () => {
    if (!projectId || busy || !milestoneName || amountCents <= 0) return;
    setBusy(true);
    try {
      await addEscrowMilestone({ milestoneName, amountCents });
      setMilestoneName('');
      setAmountCents(0);
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, milestoneName, amountCents, addEscrowMilestone]);

  const handleTransition = useCallback(
    async (id: string, approval?: 'approved' | 'rejected') => { await transitionEscrow(id, approval); },
    [transitionEscrow],
  );

  const statePill = (status: string) => {
    if (status === 'released') return 'verified' as const;
    if (status === 'disputed' || status === 'appeal') return 'disputed' as const;
    if (status === 'verified') return 'released' as const;
    return 'neutral' as const;
  };

  return (
    <StageScaffold
      stageId="p4-escrow-release"
      icon={ShieldCheck}
      empty={!isLoading && projectMilestones.length === 0}
      emptyTitle="No escrow milestones"
      emptyMessage="Create escrow milestones tied to verified site progress — release requires a passing P3 verification report + QS HITL sign-off."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Held in trust</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">
              <Money cents={summary.heldCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">escrow balance</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Released</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">
              <Money cents={summary.releasedCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">funds disbursed</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Pending</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${summary.pending > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              {summary.pending}
            </p>
            <p className="text-xs text-[var(--text-muted)]">milestones awaiting verification</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Disputed</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${summary.disputed > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {summary.disputed}
            </p>
            <p className="text-xs text-[var(--text-muted)]">under dispute</p>
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DzCard className="p-4 lg:col-span-2">
            <Kicker>Escrow milestones</Kicker>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <FormField id="p4-name" label="Milestone" className="w-48" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} placeholder="e.g. Foundations complete" />
              <FormField id="p4-amount" label="Amount ($)" type="number" min={1} className="w-32" value={amountCents} onChange={(e) => setAmountCents(Number(e.target.value))} />
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || !milestoneName || amountCents <= 0}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Adding…' : 'Add milestone'}
              </button>
            </div>

            <DataTable
              columns={[
                { key: 'milestoneName', header: 'Milestone' },
                { key: 'amountCents', header: 'Amount', align: 'right', render: (r) => <Money cents={r.amountCents} /> },
                { key: 'status', header: 'State', render: (r) => <DzPill tone={statePill(r.status)}>{r.status}</DzPill> },
                { key: 'releaseDate', header: 'Released', render: (r) => r.releaseDate ? new Date(r.releaseDate).toLocaleDateString() : '—' },
                { key: '_action', header: '', render: (r) => {
                  if (r.status === 'pending') return (
                    <button type="button" onClick={() => handleTransition(r.id)} className="rounded border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                      Verify
                    </button>
                  );
                  if (r.status === 'verified') return (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => handleTransition(r.id, 'approved')} className="rounded border border-[var(--success)]/40 bg-[var(--success)]/10 px-2 py-0.5 text-[10px] text-[var(--success)] hover:bg-[var(--success)]/20">
                        Approve
                      </button>
                      <button type="button" onClick={() => handleTransition(r.id, 'rejected')} className="rounded border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2 py-0.5 text-[10px] text-[var(--danger)] hover:bg-[var(--danger)]/20">
                        Reject
                      </button>
                    </div>
                  );
                  return null;
                }},
              ]}
              rows={projectMilestones}
              rowKey={(r) => r.id}
              className="mt-3"
            />
          </DzCard>

          <DzCard className="p-4">
            <Kicker>Release log</Kicker>
            {projectReleases.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No funds released yet — verify + approve an escrow milestone.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {projectReleases.slice(0, 8).map((r) => (
                  <li key={r.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm tabular-nums text-[var(--success)]">
                        <Money cents={r.amountCents} />
                      </p>
                      <DzPill tone="verified">{r.releasedBy}</DzPill>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {new Date(r.releasedAt).toLocaleString()} · {r.proofRef || 'no proof ref'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DzCard>
        </div>
      </PageEnter>
    </StageScaffold>
  );
}
