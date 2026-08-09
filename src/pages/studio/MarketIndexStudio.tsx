import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMarketIndexStore } from '@/stores/marketIndexStore';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { fxConvert } from '@/engine/ecosystem/priceIndex';
import { sortSnapshotsDesc, type MarketIndexSnapshot } from '@/engine/ecosystem/marketIndexScheduler';
import { StudioLoading } from '@/components/ui/StudioLoading';
import { ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react';

function Sparkline({ snapshot, symbol, width = 96, height = 28 }: {
  snapshot: MarketIndexSnapshot; symbol: string; width?: number; height?: number;
}) {
  const item = snapshot.index.find((i) => i.symbol === symbol);
  if (!item || item.series.length === 0) return <div className="text-[9px] text-[var(--text-muted)]">—</div>;
  const series = item.series;
  const min = Math.min(...series.map((p) => p.valueCents));
  const max = Math.max(...series.map((p) => p.valueCents));
  const span = max - min || 1;
  const pts = series.map((p, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = height - 2 - ((p.valueCents - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = series[series.length - 1].valueCents >= series[0].valueCents;
  return (
    <svg width={width} height={height} aria-label={`${item.label} 30-day sparkline`}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={rising ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MarketIndexStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const snapshot = useMarketIndexStore((s) => s.snapshot);
  const history = useMarketIndexStore((s) => s.history);
  const isLoading = useMarketIndexStore((s) => s.isLoading);
  const load = useMarketIndexStore((s) => s.load);
  const autoRefresh = useMarketIndexStore((s) => s.autoRefresh);
  const runNow = useMarketIndexStore((s) => s.runNow);
  const [currency, setCurrency] = useState<'USD' | 'ZWG'>('USD');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      const result = await autoRefresh();
      if (!cancelled && result.ran) setNotice('Auto-refreshed the daily index.');
    })();
    return () => { cancelled = true; };
  }, [load, autoRefresh]);

  const sortedHistory = useMemo(() => sortSnapshotsDesc(history), [history]);
  const fx = snapshot?.fx ?? 26;

  const display = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.index.map((item) => ({
      ...item,
      baseCents: fxConvert(item.baseCents, fx, currency),
      currentCents: fxConvert(item.currentCents, fx, currency),
    }));
  }, [snapshot, fx, currency]);

  const avgMove = useMemo(() => {
    if (display.length === 0) return 0;
    return display.reduce((sum, item) => sum + Math.abs(item.changePct), 0) / display.length;
  }, [display]);

  const handleRunNow = async () => {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await runNow();
      if (result) setNotice('Index recomputed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/project/${projectId}`}
          className="touch-target flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Market Index</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Cement · steel · brick ZiG/USD volatility ticker — daily auto-refresh on open, no backend needed.
          </p>
        </div>
      </div>
      <div className="flex gap-2 text-[9px]">
        <Link to={`/project/${projectId}/studio/ledger`} className="text-cyan-400 hover:underline">True Ledger</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/wipaa`} className="text-cyan-400 hover:underline">WIPAA</Link>
        <span className="text-[var(--text-tertiary)]">·</span>
        <Link to={`/project/${projectId}/studio/closeout`} className="text-cyan-400 hover:underline">Closeout</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Symbols tracked" value={snapshot ? String(snapshot.symbolCount) : '—'} color="text-cyan-400" />
        <StatCard label="FX (USD → ZWG)" value={String(fx)} color="text-green-400" />
        <StatCard label="Last updated" value={snapshot ? snapshot.dayKey : '—'} color="text-[var(--text-secondary)]" />
        <StatCard label="Avg 30-day move" value={avgMove > 0 ? `${avgMove.toFixed(1)}%` : '—'} color="text-amber-400" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-[var(--border-default)] text-[10px]">
          {(['USD', 'ZWG'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 transition-colors ${currency === c ? 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {c}
            </button>
          ))}
        </div>
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
          Recomputes automatically when the day changes on open.
        </span>
      </div>

      {notice && <p className="text-[10px] text-[var(--brand-accent)]">{notice}</p>}

      {isLoading && !snapshot ? (
        <div className="flex h-64 items-center justify-center">
          <StudioLoading />
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="sticky-head border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="px-3 py-2 font-medium">Material</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Base</th>
                  <th className="px-3 py-2 font-medium">Current</th>
                  <th className="px-3 py-2 font-medium">30d</th>
                  <th className="px-3 py-2 font-medium">Sparkline</th>
                </tr>
              </thead>
              <tbody>
                {display.map((item) => (
                  <tr key={item.symbol} className="border-b border-[var(--border-subtle)] last:border-0" data-symbol={item.symbol}>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{item.label}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">/{item.unit}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{fmtCents(item.baseCents)}</td>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{fmtCents(item.currentCents)}</td>
                    <td className={`px-3 py-2 font-medium ${item.changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2">{snapshot && <Sparkline snapshot={snapshot} symbol={item.symbol} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <h3 className="mb-3 text-xs font-semibold text-[var(--text-primary)]">Snapshot history</h3>
            {sortedHistory.length === 0 ? (
              <p className="text-[10px] text-[var(--text-muted)]">No snapshots recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {sortedHistory.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2">
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-primary)]">
                      <span className="font-semibold">{s.dayKey}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">{s.source}</span>
                    </div>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {s.symbolCount} symbols · {s.currency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
      <div className="mb-1 text-[9px] font-medium text-[var(--text-muted)]">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
