import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { DzCard, DzPill, FormField, Kicker, PageEnter } from '@/components/dzenhare';
import {
  buildInspectionChecklist,
  toggleChecklistItem,
  signOffChecklist,
  checklistCompletionPct,
  evaluateEscrowTrigger,
} from '@/engine/sitehawk/digitalTwin';
import { checklistTemplateFor } from '@/engine/sitehawk/computerVision';
import type { InspectionCategory } from '@/domain/sitehawk';

const CATEGORY_LABEL: Record<InspectionCategory, string> = {
  structural: 'Structural',
  mep: 'MEP',
  roof: 'Roof',
  final: 'Final / Handover',
};

const CATEGORY_TONE: Record<InspectionCategory, 'verified' | 'disputed' | 'neutral'> = {
  structural: 'verified',
  mep: 'disputed',
  roof: 'neutral',
  final: 'verified',
};

export function InspectionChecklistPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { inspectionChecklists, digitalTwinTimeline, verificationReports, loadForProject, addInspectionChecklist, updateInspectionChecklist } = useSiteHawkStore(
    useShallow((s) => ({
      inspectionChecklists: s.inspectionChecklists,
      digitalTwinTimeline: s.digitalTwinTimeline,
      verificationReports: s.verificationReports,
      loadForProject: s.loadForProject,
      addInspectionChecklist: s.addInspectionChecklist,
      updateInspectionChecklist: s.updateInspectionChecklist,
    })),
  );

  const [newCategory, setNewCategory] = useState<InspectionCategory>('structural');
  const [newMilestone, setNewMilestone] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

  const projectChecklists = useMemo(
    () => inspectionChecklists.filter((c) => c.projectId === projectId),
    [inspectionChecklists, projectId],
  );

  const projectTimeline = useMemo(
    () => digitalTwinTimeline.filter((t) => t.projectId === projectId),
    [digitalTwinTimeline, projectId],
  );
  const projectReports = useMemo(
    () => verificationReports.filter((r) => r.projectId === projectId),
    [verificationReports, projectId],
  );

  const verified = projectReports.some((r) => r.verdict === 'pass');
  const withPhoto = projectTimeline.filter((t) => Boolean(t.photoDataUrl)).length;

  const selected = projectChecklists.find((c) => c.id === selectedId) ?? null;

  const escrowResult = useMemo(() => {
    if (!selected) return null;
    return evaluateEscrowTrigger({
      milestoneName: selected.milestoneName,
      verificationPassed: verified,
      checklistSignedOff: selected.signedOff,
      photosCount: withPhoto,
      photosVerified: projectReports.filter((r) => r.verdict === 'pass').length,
    });
  }, [selected, verified, withPhoto, projectReports]);

  const handleCreate = useCallback(async () => {
    if (!projectId || busy || !newMilestone) return;
    setBusy(true);
    try {
      const template = checklistTemplateFor(newCategory);
      const cl = buildInspectionChecklist({
        projectId,
        category: newCategory,
        milestoneName: newMilestone,
        items: template,
        now: new Date(),
      });
      await addInspectionChecklist(cl);
      setNewMilestone('');
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, newCategory, newMilestone, addInspectionChecklist]);

  const handleToggle = useCallback(async (itemId: string) => {
    if (!selected) return;
    const updated = toggleChecklistItem(selected, itemId);
    await updateInspectionChecklist(updated);
    setSelectedId(updated.id);
  }, [selected, updateInspectionChecklist]);

  const handleSignOff = useCallback(async () => {
    if (!selected) return;
    const signed = signOffChecklist(selected, 'QS Mandla');
    if (signed) {
      await updateInspectionChecklist(signed);
      setSelectedId(signed.id);
    }
  }, [selected, updateInspectionChecklist]);

  const completedCount = projectChecklists.filter((c) => c.signedOff).length;
  const allChecked = selected ? selected.items.every((i) => i.checked) : false;

  return (
      <PageEnter className="space-y-4">
        {/* KPI row */}
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Checklists</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectChecklists.length}</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Signed Off</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">{completedCount}</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>In Progress</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--warning)]">{projectChecklists.length - completedCount}</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Escrow Gate</Kicker>
            {escrowResult ? (
              <DzPill tone={escrowResult === 'release-ready' ? 'verified' : escrowResult === 'blocked' ? 'disputed' : 'neutral'}>
                {escrowResult}
              </DzPill>
            ) : (
              <p className="mt-1 text-xs text-[var(--text-muted)]">Select a checklist</p>
            )}
          </DzCard>
        </div>

        {/* Create checklist */}
        <DzCard className="p-4">
          <Kicker>Create Inspection Checklist</Kicker>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="ic-category" className="mb-1 block text-[11px] font-semibold text-[var(--text-muted)]">Category</label>
              <select
                id="ic-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as InspectionCategory)}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <FormField
              id="ic-milestone"
              label="Milestone Name"
              className="flex-1 min-w-[200px]"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              placeholder="e.g. Substructure, Superstructure"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy || !newMilestone}
              className="flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        </DzCard>

        {/* Checklist list + detail side by side */}
        <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
          {/* Checklist list */}
          <DzCard className="p-4">
            <Kicker>Checklists</Kicker>
            {projectChecklists.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No checklists yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {projectChecklists.map((cl) => (
                  <button
                    key={cl.id}
                    type="button"
                    onClick={() => setSelectedId(cl.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                      selectedId === cl.id
                        ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)]/10'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[var(--text-primary)]">{cl.milestoneName}</span>
                      <DzPill tone={CATEGORY_TONE[cl.category]}>{cl.category}</DzPill>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                        <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${checklistCompletionPct(cl)}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{checklistCompletionPct(cl)}%</span>
                    </div>
                    {cl.signedOff && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--success)]">
                        <CheckCircle2 className="h-3 w-3" /> Signed off by {cl.signedOffBy}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </DzCard>

          {/* Checklist detail */}
          <DzCard className="p-4">
            {selected ? (
              <>
                <div className="flex items-center justify-between">
                  <Kicker>{selected.milestoneName} — {CATEGORY_LABEL[selected.category]}</Kicker>
                  {selected.signedOff ? (
                    <DzPill tone="verified">Signed off</DzPill>
                  ) : (
                    <DzPill tone="neutral">Open</DzPill>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  {selected.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggle(item.id)}
                      disabled={selected.signedOff}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                    >
                      {item.checked ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                      )}
                      <span className={item.checked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSignOff}
                    disabled={!allChecked || selected.signedOff}
                    className="rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    Sign Off Checklist
                  </button>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {selected.items.filter((i) => i.checked).length}/{selected.items.length} items checked
                  </span>
                </div>

                {selected.signedOff && (
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                    Signed by {selected.signedOffBy} on {new Date(selected.signedOffAt!).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-muted)]">Select a checklist to view items.</p>
            )}
          </DzCard>
        </div>
      </PageEnter>
  );
}
