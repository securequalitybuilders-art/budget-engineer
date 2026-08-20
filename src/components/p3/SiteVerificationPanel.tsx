import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { DataTable, DzCard, DzPill, FormField, Kicker, PageEnter } from '@/components/dzenhare';
import { matchPhotoToPlan } from '@/engine/sitehawk/computerVision';
import { evaluateEscrowTrigger } from '@/engine/sitehawk/digitalTwin';

interface VerificationEntry {
  id: string;
  snapshotNote: string;
  workingDrawingRef: string;
  matched: boolean;
  confidence: number;
  matchedFeatures: string[];
  mismatchedFeatures: string[];
  escrowStatus: string;
}

export function SiteVerificationPanel() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { digitalTwinTimeline, verificationReports, loadForProject, addVerification } = useSiteHawkStore(
    useShallow((s) => ({
      digitalTwinTimeline: s.digitalTwinTimeline,
      verificationReports: s.verificationReports,
      loadForProject: s.loadForProject,
      addVerification: s.addVerification,
    })),
  );

  const [wdRef, setWdRef] = useState('WD-001');
  const [wdDesc, setWdDesc] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projectId) loadForProject(projectId);
  }, [projectId, loadForProject]);

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

  const verificationEntries: VerificationEntry[] = useMemo(() => {
    return projectTimeline.map((snap) => {
      const match = wdDesc
        ? matchPhotoToPlan({ photoNote: snap.note, workingDrawingRef: wdRef, workingDrawingDescription: wdDesc })
        : { matched: false, confidence: 0, matchedFeatures: [], mismatchedFeatures: [] };
      const trigger = evaluateEscrowTrigger({
        milestoneName: snap.milestoneId ?? 'General',
        verificationPassed: snap.status === 'verified',
        checklistSignedOff: verified,
        photosCount: withPhoto,
        photosVerified: projectReports.filter((r) => r.verdict === 'pass').length,
      });
      return {
        id: snap.id,
        snapshotNote: snap.note,
        workingDrawingRef: wdRef,
        matched: match.matched,
        confidence: match.confidence,
        matchedFeatures: match.matchedFeatures,
        mismatchedFeatures: match.mismatchedFeatures,
        escrowStatus: trigger,
      };
    });
  }, [projectTimeline, wdRef, wdDesc, verified, withPhoto, projectReports]);

  const handleVerifyAll = useCallback(async () => {
    if (!projectId || busy) return;
    setBusy(true);
    try {
      for (const entry of verificationEntries.filter((e) => e.matched)) {
        const snap = projectTimeline.find((t) => t.id === entry.id);
        if (snap) {
          await addVerification({
            milestoneId: snap.milestoneId,
            method: 'ai-vision',
            verdict: 'pass',
            confidence: entry.confidence,
            details: `AI vision matched: ${entry.matchedFeatures.join(', ')}`,
          });
        }
      }
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, verificationEntries, projectTimeline, addVerification]);

  const matchedCount = verificationEntries.filter((e) => e.matched).length;
  const escrowReady = verificationEntries.filter((e) => e.escrowStatus === 'release-ready').length;

  return (
      <PageEnter className="space-y-4">
        {/* KPI row */}
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>To Verify</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectTimeline.length}</p>
            <p className="text-xs text-[var(--text-muted)]">site snapshots</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Matched</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">{matchedCount}</p>
            <p className="text-xs text-[var(--text-muted)]">to working drawings</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Reports</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectReports.length}</p>
            <p className="text-xs text-[var(--text-muted)]">verification reports</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Escrow Ready</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${escrowReady > 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
              {escrowReady}
            </p>
            <p className="text-xs text-[var(--text-muted)]">milestones release-ready</p>
          </DzCard>
        </div>

        {/* Working drawing input */}
        <DzCard className="p-4">
          <Kicker>Working Drawing Reference</Kicker>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <FormField id="sv-wd-ref" label="Drawing Ref" className="w-32" value={wdRef} onChange={(e) => setWdRef(e.target.value)} placeholder="WD-001" />
            <FormField id="sv-wd-desc" label="Description" className="flex-1 min-w-[200px]" value={wdDesc} onChange={(e) => setWdDesc(e.target.value)} placeholder="e.g. Foundation details showing trench, rebar, and blinding" />
            <button
              type="button"
              onClick={handleVerifyAll}
              disabled={busy || !wdDesc}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Running...' : 'Run AI Vision Match'}
            </button>
          </div>
        </DzCard>

        {/* Verification results table */}
        <DzCard className="p-4">
          <Kicker>Photo-to-Plan Verification</Kicker>
          <p className="mt-1 text-xs text-[var(--text-muted)]">AI vision matching site photos against working drawing descriptions</p>
          <DataTable
            columns={[
              { key: 'snapshotNote', header: 'Photo Note' },
              { key: 'workingDrawingRef', header: 'Drawing' },
              { key: 'matched', header: 'Match', render: (r: VerificationEntry) => r.matched ? <DzPill tone="verified">Matched</DzPill> : <DzPill tone="disputed">No match</DzPill> },
              { key: 'confidence', header: 'Confidence', align: 'right', render: (r: VerificationEntry) => `${r.confidence}%` },
              { key: 'matchedFeatures', header: 'Features', render: (r: VerificationEntry) => <span className="text-[11px] text-[var(--text-muted)]">{r.matchedFeatures.length} matched</span> },
              { key: 'escrowStatus', header: 'Escrow', render: (r: VerificationEntry) => <DzPill tone={r.escrowStatus === 'release-ready' ? 'verified' : r.escrowStatus.includes('awaiting') ? 'neutral' : 'disputed'}>{r.escrowStatus}</DzPill> },
            ]}
            rows={verificationEntries.slice(0, 20)}
            rowKey={(r) => r.id}
            className="mt-3"
          />
        </DzCard>

        {/* Feature detail */}
        {verificationEntries.length > 0 && (
          <DzCard className="p-4">
            <Kicker>Feature Detail</Kicker>
            <div className="mt-3 space-y-2">
              {verificationEntries.filter((e) => e.matchedFeatures.length > 0).slice(0, 5).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)]">{entry.snapshotNote}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.matchedFeatures.map((f) => (
                      <DzPill key={f} tone="verified">{f}</DzPill>
                    ))}
                    {entry.mismatchedFeatures.map((f) => (
                      <DzPill key={f} tone="disputed">{f}</DzPill>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DzCard>
        )}
      </PageEnter>
  );
}
