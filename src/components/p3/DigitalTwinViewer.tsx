import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Camera, MapPin, RotateCcw, ZoomIn } from 'lucide-react';
import { useSiteHawkStore } from '@/stores/siteHawkStore';
import { useProjectStore } from '@/stores/projectStore';
import { DataTable, DzCard, DzPill, FormField, Kicker, PageEnter } from '@/components/dzenhare';
import { photoTimeline } from '@/engine/sitehawk/digitalTwin';
import type { DigitalTwinTimelineEntry } from '@/domain/sitehawk';

const STATUS_TONE: Record<string, 'verified' | 'disputed' | 'neutral'> = {
  verified: 'verified',
  rejected: 'disputed',
  pending: 'neutral',
};

const METHOD_ICON: Record<string, string> = { 'ai-vision': 'AI', drone: 'Drone', manual: 'Manual' };

export function DigitalTwinViewer() {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const { digitalTwinTimeline, verificationReports, loadForProject, addSnapshot, addVerification } = useSiteHawkStore(
    useShallow((s) => ({
      digitalTwinTimeline: s.digitalTwinTimeline,
      verificationReports: s.verificationReports,
      loadForProject: s.loadForProject,
      addSnapshot: s.addSnapshot,
      addVerification: s.addVerification,
    })),
  );

  const [note, setNote] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DigitalTwinTimelineEntry | null>(null);
  const [verifyMethod, setVerifyMethod] = useState<'ai-vision' | 'drone' | 'manual'>('ai-vision');
  const [is360, setIs360] = useState(false);

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

  const timeline = useMemo(() => photoTimeline(projectTimeline), [projectTimeline]);
  const verified = useMemo(() => projectTimeline.filter((t) => t.status === 'verified').length, [projectTimeline]);
  const pending = useMemo(() => projectTimeline.filter((t) => t.status === 'pending').length, [projectTimeline]);
  const withPhoto = useMemo(() => projectTimeline.filter((t) => Boolean(t.photoDataUrl)).length, [projectTimeline]);
  const with360 = useMemo(() => projectTimeline.filter((t) => t.is360).length, [projectTimeline]);

  const handleSnapshot = useCallback(async () => {
    if (!projectId || busy || !note) return;
    setBusy(true);
    try {
      await addSnapshot({ geoLat: -17.8292, geoLng: 31.0522, note, progressPct, is360 });
      setNote('');
      setProgressPct(0);
      setIs360(false);
    } finally {
      setBusy(false);
    }
  }, [projectId, busy, note, progressPct, is360, addSnapshot]);

  const handleVerify = useCallback(async (entry: DigitalTwinTimelineEntry) => {
    if (!projectId) return;
    await addVerification({ milestoneId: entry.milestoneId, method: verifyMethod, verdict: 'pass', confidence: 88, details: `Photo verified: ${entry.note}` });
  }, [projectId, verifyMethod, addVerification]);

  return (
    <PageEnter className="space-y-4">
        {/* KPI row */}
        <div className="grid gap-4 lg:grid-cols-4">
          <DzCard className="p-4">
            <Kicker>Snapshots</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectTimeline.length}</p>
            <p className="text-xs text-[var(--text-muted)]">{withPhoto} with photo</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Verified</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">{verified}</p>
            <p className="text-xs text-[var(--text-muted)]">passed verification</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Pending</Kicker>
            <p className={`mt-1 font-display text-2xl font-bold ${pending > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              {pending}
            </p>
            <p className="text-xs text-[var(--text-muted)]">awaiting check</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>360° Panoramic</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--brand-accent)]">{with360}</p>
            <p className="text-xs text-[var(--text-muted)]">panoramic captures</p>
          </DzCard>
          <DzCard className="p-4">
            <Kicker>Reports</Kicker>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">{projectReports.length}</p>
            <p className="text-xs text-[var(--text-muted)]">verification assessments</p>
          </DzCard>
        </div>

        {/* Photo timeline */}
        <DzCard className="p-4">
          <Kicker>Site Photo Timeline</Kicker>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Geo-tagged snapshots chronologically ordered</p>

          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">No snapshots captured yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {timeline.map((entry) => {
                const full = projectTimeline.find((t) => t.id === entry.id);
                return (
                  <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-l-4 border-l-[var(--brand-accent)] border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 p-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
                      {entry.hasPhoto ? <Camera className="h-4 w-4 text-[var(--brand-accent)]" /> : <MapPin className="h-4 w-4 text-[var(--text-muted)]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{entry.note}</span>
                        {full?.is360 && <DzPill tone="verified">360°</DzPill>}
                        <DzPill tone={STATUS_TONE[entry.status]}>{entry.status}</DzPill>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                        {new Date(entry.capturedAt).toLocaleDateString()} · {entry.geoLabel} · {entry.progressPct}%
                      </p>
                      {full && (
                        <div className="mt-2 flex items-center gap-2">
                          <select
                            value={verifyMethod}
                            onChange={(e) => setVerifyMethod(e.target.value as 'ai-vision' | 'drone' | 'manual')}
                            className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)]"
                          >
                            <option value="ai-vision">AI Vision</option>
                            <option value="drone">Drone</option>
                            <option value="manual">Manual</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleVerify(full)}
                            className="rounded bg-[var(--brand-primary)] px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110"
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSnapshot(selectedSnapshot?.id === entry.id ? null : full)}
                            className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                          >
                            <ZoomIn className="inline h-3 w-3" /> Detail
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DzCard>

        {/* Selected snapshot detail */}
        {selectedSnapshot && (
          <DzCard className="p-4">
            <Kicker>Snapshot Detail</Kicker>
            <div className="mt-2 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{selectedSnapshot.note}</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Captured {new Date(selectedSnapshot.capturedAt).toLocaleString()} · {selectedSnapshot.geoLat.toFixed(4)}, {selectedSnapshot.geoLng.toFixed(4)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">Progress: {selectedSnapshot.progressPct}%</p>
                <div className="mt-2 flex items-center gap-2">
                  <DzPill tone={STATUS_TONE[selectedSnapshot.status]}>{selectedSnapshot.status}</DzPill>
                  {selectedSnapshot.is360 && <DzPill tone="verified"><RotateCcw className="inline h-3 w-3" /> 360° panoramic</DzPill>}
                </div>
              </div>
              <div>
                {selectedSnapshot.photoDataUrl ? (
                  <div className="relative">
                    <img src={selectedSnapshot.photoDataUrl} alt={selectedSnapshot.note} className="max-h-48 rounded border border-[var(--border-subtle)] object-cover" />
                    {selectedSnapshot.is360 && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] text-[var(--brand-accent)]">
                        <RotateCcw className="h-3 w-3" /> Drag to pan 360°
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <span className="text-xs text-[var(--text-muted)]">No photo attached</span>
                  </div>
                )}
              </div>
            </div>
          </DzCard>
        )}

        {/* Verification reports */}
        <DzCard className="p-4">
          <Kicker>Verification Reports</Kicker>
          {projectReports.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">No verification reports yet — verify a snapshot to start.</p>
          ) : (
            <DataTable
              columns={[
                { key: 'method', header: 'Method', render: (r) => <DzPill tone="neutral">{METHOD_ICON[r.method] ?? r.method}</DzPill> },
                { key: 'verdict', header: 'Verdict', render: (r) => <DzPill tone={r.verdict === 'pass' ? 'verified' : r.verdict === 'fail' ? 'disputed' : 'neutral'}>{r.verdict}</DzPill> },
                { key: 'confidence', header: 'Confidence', align: 'right', render: (r) => `${Math.round(r.confidence * 100)}%` },
                { key: 'details', header: 'Details', render: (r) => <span className="text-[11px] text-[var(--text-muted)]">{r.details}</span> },
                { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              ]}
              rows={projectReports.slice(0, 20)}
              rowKey={(r) => r.id}
              className="mt-3"
            />
          )}
        </DzCard>

        {/* Capture form */}
        <DzCard className="p-4">
          <Kicker>Capture Site Snapshot</Kicker>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <FormField id="dt-note" label="Note" className="flex-1 min-w-[200px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Foundations poured, Blockwork started" />
            <FormField id="dt-progress" label="Progress %" type="number" min={0} max={100} className="w-24" value={progressPct} onChange={(e) => setProgressPct(Number(e.target.value))} />
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
              <input type="checkbox" checked={is360} onChange={(e) => setIs360(e.target.checked)} className="rounded border-[var(--border-subtle)]" />
              <RotateCcw className="h-3 w-3" /> 360° panoramic
            </label>
            <button
              type="button"
              onClick={handleSnapshot}
              disabled={busy || !note}
              className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Capturing...' : 'Capture snapshot'}
            </button>
          </div>
        </DzCard>
      </PageEnter>
  );
}
