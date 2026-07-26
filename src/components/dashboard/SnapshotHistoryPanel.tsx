import { useState, useEffect, useCallback } from 'react';
import { Camera, Clock, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp, History, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { saveProjectSnapshot, loadProjectSnapshots, compareCurrentToSnapshot } from '@/services/projectSnapshotService';
import type { DesignOption } from '@/domain/boq';
import type { BoqResult } from '@/adapters/designToBoq';
import type { ProjectSnapshotRecord, SnapshotComparisonResult } from '@/services/projectSnapshotService';

interface SnapshotHistoryPanelProps {
  projectId?: string;
  selectedDesign?: DesignOption | null;
  currentBoq?: BoqResult | null;
  variant?: 'sidebar' | 'full';
}

function money(v: number, cur = 'USD'): string {
  const sym = cur === 'USD' ? '$' : cur === 'ZAR' ? 'R' : cur === 'KES' ? 'KSh' : '$';
  return `${sym}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DeltaIcon({ value }: { value: number }) {
  if (value > 0.005) return <ArrowUp size={12} className="text-green-400" />;
  if (value < -0.005) return <ArrowDown size={12} className="text-red-400" />;
  return <Minus size={12} className="text-[var(--text-muted)]" />;
}

function DeltaRow({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const abs = Math.abs(value);
  const cls = value > 0.005 ? 'text-green-400' : value < -0.005 ? 'text-red-400' : 'text-[var(--text-muted)]';
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${cls}`}>
        <DeltaIcon value={value} />
        {value > 0 ? '+' : ''}{abs.toLocaleString()}{suffix}
      </span>
    </div>
  );
}

export function SnapshotHistoryPanel({ projectId, selectedDesign, currentBoq, variant = 'sidebar' }: SnapshotHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [snapshots, setSnapshots] = useState<ProjectSnapshotRecord[]>([]);
  const [selectedSnapId, setSelectedSnapId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const hasDesign = !!selectedDesign;

  const loadSnapshots = useCallback(async () => {
    if (!projectId) return;
    const loaded = await loadProjectSnapshots(projectId);
    setSnapshots(loaded);
    if (loaded.length > 0 && !selectedSnapId) {
      setSelectedSnapId(loaded[0].id);
    }
  }, [projectId, selectedSnapId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const selectedSnap = snapshots.find((s) => s.id === selectedSnapId) ?? null;

  const comparison: SnapshotComparisonResult = compareCurrentToSnapshot({
    currentDesign: selectedDesign ?? null,
    currentBoq: currentBoq ?? null,
    snapshot: selectedSnap,
  });

  const handleSave = async () => {
    if (!projectId || !selectedDesign) return;
    setSaving(true);
    try {
      const saved = await saveProjectSnapshot({
        projectId,
        design: selectedDesign,
        boq: currentBoq ?? null,
        label: label.trim() || undefined,
      });
      if (saved) {
        setLabel('');
        await loadSnapshots();
        setSelectedSnapId(saved.id);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn(
      variant === 'full'
        ? 'flex flex-col bg-[var(--bg-secondary)] text-xs'
        : 'flex w-64 flex-shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs'
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-2 hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <History size={14} className="text-[var(--brand-accent)]" />
          <h3 className="font-display text-sm font-semibold">Snapshots</h3>
          {snapshots.length > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{snapshots.length}</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">
          {/* Save snapshot */}
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Snapshot label..."
                className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-cyan-400/40"
                disabled={!hasDesign}
              />
              <Button
                size="sm"
                className="gap-1 px-2 py-1 text-[11px]"
                onClick={handleSave}
                disabled={!hasDesign || saving}
              >
                {saving ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white" />
                ) : (
                  <Camera size={12} />
                )}
                Save
              </Button>
            </div>
            {!hasDesign && (
              <p className="text-[10px] text-[var(--text-muted)]">Generate a design to save snapshots.</p>
            )}
          </div>

          {/* Snapshot list or empty state */}
          {snapshots.length > 0 ? (
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Saved Versions
              </h4>
              <div className="space-y-1">
                {snapshots.map((snap) => (
                  <button
                    key={snap.id}
                    onClick={() => setSelectedSnapId(snap.id)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] ${
                      selectedSnapId === snap.id
                        ? 'bg-cyan-500/10 text-cyan-200'
                        : 'text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    <Clock size={10} className="shrink-0 text-[var(--text-muted)]" />
                    <div className="min-w-0 flex-1 truncate">
                      <span>{snap.label}</span>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(snap.createdAt).toLocaleDateString()}{' '}
                        {snap.grandTotal > 0 && money(snap.grandTotal, snap.currency)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Camera size={20} className="text-[var(--text-muted)]" />
              <p className="text-[10px] text-[var(--text-muted)]">
                Save a snapshot to compare future design changes.
              </p>
            </div>
          )}

          {/* Comparison */}
          {comparison.hasComparison && (
            <div>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                vs {selectedSnap?.label ?? 'previous'}
              </h4>
              <div className="space-y-1 rounded border border-white/5 bg-white/[0.02] p-2">
                <DeltaRow label="Cost" value={comparison.costDelta} suffix={` ${currentBoq?.currency ?? 'USD'}`} />
                {comparison.costDeltaPercent !== 0 && (
                  <div className="text-right text-[10px] text-[var(--text-muted)]">
                    {comparison.costDeltaPercent > 0 ? '+' : ''}{comparison.costDeltaPercent}%
                  </div>
                )}
                <DeltaRow label="Floor area" value={comparison.areaDelta} suffix=" m²" />
                <DeltaRow label="Floors" value={comparison.floorDelta} suffix="" />
                <DeltaRow label="Walls" value={comparison.wallAreaDelta} suffix=" m²" />
                <DeltaRow label="Doors" value={comparison.doorCountDelta} suffix="" />
                <DeltaRow label="Windows" value={comparison.windowCountDelta} suffix="" />
              </div>
              {comparison.warnings.map((w, i) => (
                <p key={i} className="mt-1 text-[10px] text-yellow-400">{w}</p>
              ))}
            </div>
          )}

          {/* Local-only note */}
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Database size={10} />
            Stored in this browser.
          </div>
        </div>
      )}
    </div>
  );
}
