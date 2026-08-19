import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Eye } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { StageScaffold } from './StageScaffold';
import { DataTable, DzCard, DzPill, FormField, Kicker, PageEnter } from '@/components/dzenhare';

export function P3DigitalTwinStage() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { digitalTwinTimeline, verificationReports, isLoading, loadForProject, addSnapshot } = useSiteHawkStore(
    useShallow((s) => ({
      digitalTwinTimeline: s.digitalTwinTimeline,
      verificationReports: s.verificationReports,
      isLoading: s.isLoading,
      loadForProject: s.loadForProject,
      addSnapshot: s.addSnapshot,
    })),
  );

  const [note, setNote] = useState('');
  const [progressPct, setProgressPct] = useState(0);
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
  const verified = useMemo(() => projectTimeline.filter((t) => t.status === 'verified'), [projectTimeline]);
  const pending = useMemo(() => projectTimeline.filter((t) => t.status === 'pending'), [projectTimeline]);

  const handleSnapshot = useCallback(async () => {
    if (!projectId || busy || !note) return;
    setBusy(true);
    try {
      await addSnapshot({ geoLat: -17.8292, geoLng: 31.0522, note, progressPct });
      setNote('');
      setProgressPct(0);
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, note, progressPct, addSnapshot]);

  return (
    <StageScaffold
      stageId="p3-digital-twin"
      icon={Eye}
      empty={!isLoading && projectTimeline.length === 0}
      emptyTitle="No site snapshots yet"
      emptyMessage="Capture geo-tagged site progress snapshots and run AI/drone/manual verification — the digital twin tracks physical progress against the schedule."
    >
      <PageEnter className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Snapshots</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectTimeline.length}</p>
            <p className="text-xs text-[var(--text-muted)]">site captures logged</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Verified</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">{verified.length}</p>
            <p className="text-xs text-[var(--text-muted)]">passed AI/drone/manual check</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Pending</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${pending.length > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              {pending.length}
            </p>
            <p className="text-xs text-[var(--text-muted)]">awaiting verification</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Reports</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectReports.length}</p>
            <p className="text-xs text-[var(--text-muted)]">verification assessments</p>
          </DzCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DzCard className="p-4 lg:col-span-2">
            <Kicker>Capture site snapshot</Kicker>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <FormField id="p3-note" label="Note" className="flex-1 min-w-[200px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Foundations poured, Blockwork started" />
              <FormField id="p3-progress" label="Progress %" type="number" min={0} max={100} className="w-24" value={progressPct} onChange={(e) => setProgressPct(Number(e.target.value))} />
              <button
                type="button"
                onClick={handleSnapshot}
                disabled={busy || !note}
                className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {busy ? 'Capturing…' : 'Capture snapshot'}
              </button>
            </div>

            <DataTable
              columns={[
                { key: 'capturedAt', header: 'Date', render: (r) => new Date(r.capturedAt).toLocaleDateString() },
                { key: 'note', header: 'Note' },
                { key: 'progressPct', header: 'Progress', align: 'right', render: (r) => `${r.progressPct}%` },
                { key: 'status', header: 'Status', render: (r) => <DzPill tone={r.status === 'verified' ? 'verified' : r.status === 'rejected' ? 'disputed' : 'neutral'}>{r.status}</DzPill> },
                { key: 'geoLat', header: 'Location', render: (r) => <span className="font-mono text-[10px] text-[var(--text-muted)]">{r.geoLat.toFixed(4)}, {r.geoLng.toFixed(4)}</span> },
              ]}
              rows={projectTimeline.slice(0, 20)}
              rowKey={(r) => r.id}
              className="mt-3"
            />
          </DzCard>

          <DzCard className="p-4">
            <Kicker>Verification reports</Kicker>
            {projectReports.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">No verification reports yet — verify a snapshot to start.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {projectReports.slice(0, 8).map((r) => (
                  <li key={r.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">{r.method}</p>
                      <DzPill tone={r.confidence >= 0.8 ? 'verified' : r.confidence >= 0.5 ? 'neutral' : 'disputed'}>
                        {Math.round(r.confidence * 100)}%
                      </DzPill>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">{r.details}</p>
                    <div className="mt-1">
                      <DzPill tone={r.verdict === 'pass' ? 'verified' : r.verdict === 'fail' ? 'disputed' : 'neutral'}>
                        {r.verdict}
                      </DzPill>
                    </div>
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
