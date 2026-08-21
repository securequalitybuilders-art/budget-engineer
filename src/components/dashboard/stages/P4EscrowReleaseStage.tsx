import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ShieldCheck, MessageSquare, Send, AlertTriangle, CreditCard, CheckCircle2 } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { escrowSummary } from '@/engine/sitehawk/escrowTrigger';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, EscrowVaultCard, FormField, Kicker, Money, PageEnter } from '@/components/dzenhare';

import type { VaultStatus } from '@/components/dzenhare/EscrowVaultCard';
import type { EscrowMilestoneRecord, SupplierPayment } from '@/domain/sitehawk';

function vaultStatusFromMilestones(ms: EscrowMilestoneRecord[]): VaultStatus {
  if (ms.length === 0) return 'pending';
  if (ms.some((m) => m.status === 'disputed' || m.status === 'appeal')) return 'disputed';
  if (ms.every((m) => m.status === 'released')) return 'released';
  if (ms.some((m) => m.status === 'verified')) return 'verified';
  return 'pending';
}

function paymentStatusPill(status: SupplierPayment['status']) {
  if (status === 'completed') return 'verified' as const;
  if (status === 'failed') return 'disputed' as const;
  return 'neutral' as const;
}

export function P4EscrowReleaseStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const {
    escrowMilestones, escrowReleases, escrowAlerts, escrowConcerns,
    supplierPayments, buildGuideMessages, isLoading, loadForProject,
    addEscrowMilestone, transitionEscrow,
    initiateSupplierPayment,
    sendBuildGuideMessage, dismissAlert,
  } = useSiteHawkStore(
    useShallow((s) => ({
      escrowMilestones: s.escrowMilestones,
      escrowReleases: s.escrowReleases,
      escrowAlerts: s.escrowAlerts,
      escrowConcerns: s.escrowConcerns,
      supplierPayments: s.supplierPayments,
      buildGuideMessages: s.buildGuideMessages,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addEscrowMilestone: s.addEscrowMilestone,
      transitionEscrow: s.transitionEscrow,
      initiateSupplierPayment: s.initiateSupplierPayment,
      sendBuildGuideMessage: s.sendBuildGuideMessage,
      dismissAlert: s.dismissAlert,
    })),
  );

  const [milestoneName, setMilestoneName] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [busy, setBusy] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMilestoneId, setChatMilestoneId] = useState('');

  const [paySupplierName, setPaySupplierName] = useState('');
  const [payBankRef, setPayBankRef] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payMilestoneId, setPayMilestoneId] = useState('');

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
  const projectAlerts = useMemo(
    () => escrowAlerts.filter((a) => a.projectId === projectId).sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [escrowAlerts, projectId],
  );
  const projectConcerns = useMemo(
    () => escrowConcerns.filter((c) => c.projectId === projectId),
    [escrowConcerns, projectId],
  );
  const projectPayments = useMemo(
    () => supplierPayments.filter((p) => p.projectId === projectId),
    [supplierPayments, projectId],
  );
  const projectChat = useMemo(
    () => buildGuideMessages.filter((m) => m.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [buildGuideMessages, projectId],
  );
  const summary = useMemo(() => escrowSummary(projectMilestones), [projectMilestones]);
  const unreadAlerts = useMemo(() => projectAlerts.filter((a) => !a.read), [projectAlerts]);

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

  const handleSendChat = useCallback(async () => {
    if (!chatMilestoneId || !chatInput.trim()) return;
    await sendBuildGuideMessage(chatMilestoneId, 'user', chatInput.trim());
    setChatInput('');
  }, [chatMilestoneId, chatInput, sendBuildGuideMessage]);

  const handlePaySupplier = useCallback(async () => {
    if (!projectId || !payMilestoneId || !paySupplierName || payAmount <= 0) return;
    await initiateSupplierPayment(payMilestoneId, paySupplierName, payBankRef, Math.round(payAmount * 100));
    setPaySupplierName('');
    setPayBankRef('');
    setPayAmount(0);
  }, [projectId, payMilestoneId, paySupplierName, payBankRef, payAmount, initiateSupplierPayment]);

  const statePill = (status: string) => {
    if (status === 'released') return 'verified' as const;
    if (status === 'disputed' || status === 'appeal') return 'disputed' as const;
    if (status === 'verified') return 'released' as const;
    if (status === 'suspended') return 'disputed' as const;
    return 'neutral' as const;
  };

  return (
    <StageScaffold
      stageId="p4-escrow-release"
      icon={ShieldCheck}
      empty={!isLoading && projectMilestones.length === 0}
      emptyTitle="No escrow milestones"
      emptyMessage="Create escrow milestones tied to verified site progress."
    >
      <PageEnter className="space-y-4">
        <EscrowVaultCard
          securedCents={summary.heldCents}
          status={vaultStatusFromMilestones(projectMilestones)}
          title="Funds secured"
          footnote={`${projectMilestones.length} milestone${projectMilestones.length !== 1 ? 's' : ''}`}
        />

        <div className="grid gap-4 lg:grid-cols-5">
          <DzCard className="p-4">
            <Kicker>Held in trust</Kicker>
            <p className="mt-1 font-display text-2xl font-bold font-mono tabular-nums text-[var(--brand-accent)]">
              <Money cents={summary.heldCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">escrow balance</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Released</Kicker>
            <p className="mt-1 font-display text-2xl font-bold font-mono tabular-nums text-[var(--success)]">
              <Money cents={summary.releasedCents} />
            </p>
            <p className="text-xs text-[var(--text-muted)]">funds disbursed</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Pending</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${summary.pending > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              {summary.pending}
            </p>
            <p className="text-xs text-[var(--text-muted)]">awaiting verification</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Disputed</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${summary.disputed > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {summary.disputed}
            </p>
            <p className="text-xs text-[var(--text-muted)]">under dispute</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Suspended</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${summary.suspended > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {summary.suspended}
            </p>
            <p className="text-xs text-[var(--text-muted)]">on hold</p>
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
                {busy ? 'Adding...' : 'Add milestone'}
              </button>
            </div>

            <DataTable
              columns={[
                { key: 'milestoneName', header: 'Milestone' },
                { key: 'amountCents', header: 'Amount', align: 'right', render: (r) => <Money cents={r.amountCents} /> },
                { key: 'status', header: 'State', render: (r) => <DzPill tone={statePill(r.status)}>{r.status}</DzPill> },
                { key: 'releaseDate', header: 'Released', render: (r) => r.releaseDate ? new Date(r.releaseDate).toLocaleDateString() : '---' },
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
              <p className="mt-2 text-xs text-[var(--text-muted)]">No funds released yet.</p>
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
                      {new Date(r.releasedAt).toLocaleString()} --- {r.proofRef || 'no proof ref'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DzCard className="p-4">
            <Kicker><MessageSquare className="mr-1 inline h-3 w-3" />Build Guide</Kicker>
            <div className="mt-2">
              <FormField id="p4-chat-ms" label="Milestone" className="w-full" value={chatMilestoneId} onChange={(e) => setChatMilestoneId(e.target.value)} placeholder="Milestone ID" />
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto space-y-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-3">
              {projectChat.length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">No messages yet. Select a milestone and ask a question.</p>
              )}
              {projectChat.map((msg) => (
                <div key={msg.id} className={`rounded-lg px-3 py-2 text-xs ${msg.type === 'user' ? 'ml-8 bg-[var(--brand-primary)]/10 text-[var(--text-primary)]' : msg.type === 'concierge' ? 'mr-8 bg-[var(--brand-accent)]/10 text-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)]/50 text-[var(--text-secondary)]'}`}>
                  <p className="font-semibold text-[10px] uppercase text-[var(--text-muted)]">{msg.type}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="Ask the build guide..."
                className="flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]"
              />
              <button
                type="button"
                onClick={handleSendChat}
                disabled={!chatMilestoneId || !chatInput.trim()}
                className="rounded bg-[var(--brand-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-primary)] hover:brightness-110 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </DzCard>

          <DzCard className="p-4">
            <Kicker><CreditCard className="mr-1 inline h-3 w-3" />Supplier payments</Kicker>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <FormField id="p4-pay-ms" label="Milestone ID" value={payMilestoneId} onChange={(e) => setPayMilestoneId(e.target.value)} placeholder="Milestone" />
              <FormField id="p4-pay-name" label="Supplier" value={paySupplierName} onChange={(e) => setPaySupplierName(e.target.value)} placeholder="Supplier name" />
              <FormField id="p4-pay-ref" label="Bank ref" value={payBankRef} onChange={(e) => setPayBankRef(e.target.value)} placeholder="Reference" />
              <FormField id="p4-pay-amount" label="Amount ($)" type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            </div>
            <button
              type="button"
              onClick={handlePaySupplier}
              disabled={!payMilestoneId || !paySupplierName || payAmount <= 0}
              className="mt-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              Initiate payment
            </button>

            {projectPayments.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {projectPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 px-3 py-1.5 text-xs">
                    <span className="text-[var(--text-primary)]">{p.supplierName}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums"><Money cents={p.amountCents} /></span>
                      <DzPill tone={paymentStatusPill(p.status)}>{p.status}</DzPill>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DzCard>
        </div>

        {unreadAlerts.length > 0 && (
          <DzCard className="p-4">
            <Kicker><AlertTriangle className="mr-1 inline h-3 w-3" />Alerts ({unreadAlerts.length})</Kicker>
            <ul className="mt-2 space-y-1.5">
              {unreadAlerts.map((alert) => (
                <li key={alert.id} className="flex items-center justify-between rounded border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">{alert.type.replace(/-/g, ' ')}</span>
                    <span className="ml-2 text-[var(--text-muted)]">{alert.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    className="rounded border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          </DzCard>
        )}

        {projectConcerns.length > 0 && (
          <DzCard className="p-4">
            <Kicker><CheckCircle2 className="mr-1 inline h-3 w-3" />Concerns</Kicker>
            <ul className="mt-2 space-y-1.5">
              {projectConcerns.map((c) => (
                <li key={c.id} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{c.raisedBy}</span>
                    <DzPill tone={c.status === 'resolved' ? 'verified' : 'disputed'}>{c.status}</DzPill>
                  </div>
                  <p className="mt-0.5 text-[var(--text-secondary)]">{c.description}</p>
                  {c.reworkEstimateCents != null && (
                    <p className="mt-0.5 font-mono text-[var(--danger)]">Rework estimate: <Money cents={c.reworkEstimateCents} /></p>
                  )}
                </li>
              ))}
            </ul>
          </DzCard>
        )}
      </PageEnter>
    </StageScaffold>
  );
}
