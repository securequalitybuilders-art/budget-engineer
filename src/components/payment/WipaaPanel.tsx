import { useEffect, useMemo, useState } from 'react';
import { useWipaaStore } from '@/stores/wipaaStore';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { sortSnapshotsDesc, type WipaaSnapshot } from '@/engine/payment/wipaaAutoRun';
import { CalendarDays, RefreshCw, Scale } from 'lucide-react';

function statusColor(status: WipaaSnapshot['billingStatus']): string {
  switch (status) {
    case 'on-track': return 'bg-green-500/15 text-green-400';
    case 'under-billed': return 'bg-amber-500/15 text-amber-400';
    case 'over-billed': return 'bg-red-500/15 text-red-400';
  }
}

export function WipaaPanel({ projectId }: { projectId: string }) {
  const snapshots = useWipaaStore((s) => s.snapshots);
  const isLoading = useWipaaStore((s) => s.isLoading);
  const loadForProject = useWipaaStore((s) => s.loadForProject);
  const runAutoRollover = useWipaaStore((s) => s.runAutoRollover);
  const runManualSnapshot = useWipaaStore((s) => s.runManualSnapshot);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      await loadForProject(projectId);
      const result = await runAutoRollover(projectId);
      if (!cancelled && result.ran) setNotice('Auto-computed snapshot for this month.');
    })();
    return () => { cancelled = true; };
  }, [projectId, loadForProject, runAutoRollover]);

  const sorted = useMemo(() => sortSnapshotsDesc(snapshots), [snapshots]);
  const latest = sorted[0];

  const handleRunNow = async () => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const snapshot = await runManualSnapshot(projectId);
      if (snapshot) setNotice('Snapshot recomputed.');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Contract value" value={latest ? fmtCents(latest.contractValueCents) : '—'} color="text-cyan-400" />
        <StatCard label="Billed to date" value={latest ? fmtCents(latest.billedToDateCents) : '—'} color="text-green-400" />
        <StatCard label="Revenue earned" value={latest ? fmtCents(latest.revenueEarnedCents) : '—'} color="text-sky-400" />
        <StatCard label="Cost % complete" value={latest ? `${latest.costPctComplete.toFixed(0)}%` : '—'} color="text-amber-400" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRunNow}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)]/15 px-3 py-1.5 text-[10px] font-medium text-[var(--brand-accent)] transition-colors hover:bg-[var(--brand-accent)]/25 disabled:opacity-40"
        >
          <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Computing…' : 'Run now'}
        </button>
        <span className="text-[9px] text-[var(--text-muted)]">
          WIPAA auto-computes once per month on open — no backend needed.
        </span>
      </div>

      {notice && <p className="text-[10px] text-[var(--brand-accent)]">{notice}</p>}

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <Scale size={14} className="text-[var(--brand-accent)]" />
          Latest snapshot
        </h3>
        {!latest ? (
          <p className="text-[10px] text-[var(--text-muted)]">
            No WIPAA snapshot yet. Open the project page to auto-run this month, or click "Run now".
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Billing position"
              value={<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(latest.billingStatus)}`}>{latest.billingStatus}</span>}
              color=""
            />
            <StatCard
              label="Under/over billed"
              value={fmtCents(Math.abs(latest.overUnderBilledCents))}
              color={latest.overUnderBilledCents === 0 ? 'text-green-400' : latest.overUnderBilledCents > 0 ? 'text-amber-400' : 'text-red-400'}
            />
            <StatCard label="Gross profit earned" value={fmtCents(latest.grossProfitEarnedCents)} color={latest.grossProfitEarnedCents >= 0 ? 'text-green-400' : 'text-red-400'} />
            <StatCard label="Month" value={latest.monthKey} color="text-[var(--text-secondary)]" />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <CalendarDays size={14} className="text-[var(--brand-accent)]" />
          Monthly history
        </h3>
        {sorted.length === 0 ? (
          <p className="text-[10px] text-[var(--text-muted)]">No snapshots recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {sorted.map((snapshot) => (
              <div key={snapshot.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-primary)]">
                    <span className="font-semibold">{snapshot.monthKey}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${statusColor(snapshot.billingStatus)}`}>{snapshot.billingStatus}</span>
                    <span className="text-[9px] text-[var(--text-muted)]">{snapshot.source}</span>
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)]">
                    {fmtCents(snapshot.revenueEarnedCents)} earned · {fmtCents(snapshot.billedToDateCents)} billed
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-medium ${snapshot.overUnderBilledCents === 0 ? 'text-green-400' : snapshot.overUnderBilledCents > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {snapshot.overUnderBilledCents > 0 ? '+' : ''}{fmtCents(Math.round(snapshot.overUnderBilledCents))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="mb-1 text-[9px] font-medium text-[var(--text-muted)]">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
