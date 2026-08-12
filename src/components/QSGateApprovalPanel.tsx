// QS human-in-the-loop approval panel.
//
// Shows an interrupted agent run (a gate that stopped the orchestrator) to a
// Quantity Surveyor: the interrupt reason + message + payload, the structural
// anomaly deviation, referenced By-Laws clauses, calculator inputs, committed
// ledger cover and site-photo context. The QS can record a correction note and
// either approve (resume) or reject the run via `resumeAgent`.

import { useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, FileWarning, Calculator, BookOpenText, Scale, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { resumeAgent, type AgentState, type Interrupt } from '@/engine/agents';

export interface QsGateApprovalResult {
  state: AgentState;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}

export interface QsGateApprovalPanelProps {
  state: AgentState | null;
  interrupt?: Interrupt | null;
  busy?: boolean;
  ledgerTotalCents?: number;
  sitePhotoCount?: number;
  onResolved?: (result: QsGateApprovalResult) => void;
  onReset?: () => void;
}

function fmtCentAmount(cents: unknown): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '';
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatPayloadValue(key: string, value: unknown): string {
  if (typeof value === 'number' && /Cents$/.test(key) && Number.isFinite(value)) {
    return `$${Math.round(value / 100).toLocaleString()}`;
  }
  if (typeof value === 'number' && /Pct$/.test(key) && Number.isFinite(value)) {
    return `${value.toFixed(2)}%`;
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value ?? '—');
}

const REASON_LABELS: Record<Interrupt['reason'], string> = {
  'high-value': 'High-value contract',
  'structural-deviation': 'Structural deviation',
  'low-confidence': 'Low retrieval confidence',
  'validation-required': 'Validation required',
};

export function QsGateApprovalPanel({
  state,
  interrupt,
  busy = false,
  ledgerTotalCents,
  sitePhotoCount,
  onResolved,
  onReset,
}: QsGateApprovalPanelProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payloadRows = useMemo(() => {
    if (!interrupt?.payload) return [];
    return Object.entries(interrupt.payload).map(([key, value]) => ({
      key,
      value: formatPayloadValue(key, value),
    }));
  }, [interrupt]);

  const calculatorCalls = useMemo(
    () => state?.toolCalls.filter((c) => c.tool.startsWith('calculate_')) ?? [],
    [state],
  );

  const byLawsClauses = useMemo(() => state?.retrievedDocs ?? [], [state]);

  if (!state) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <ShieldCheck size={16} />
          <span className="text-[11px]">No pending QS gate — run the agent and a gate will pause here for your approval.</span>
        </div>
      </div>
    );
  }

  const awaitingInput = state.status === 'awaiting-input' || state.node === 'hitl';

  const handleResolve = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!state || submitting || busy) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = note.trim();
      const { state: next } = await resumeAgent(state, decision, trimmed || undefined);
      onResolved?.({ state: next, decision, note: trimmed || undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="qs-gate-panel" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-amber-400">
        <ShieldCheck size={12} />
        QS gate · {interrupt ? REASON_LABELS[interrupt.reason] ?? interrupt.reason : 'pending'}
      </div>

      {interrupt?.message && (
        <p data-testid="qs-gate-message" className="mb-3 text-[11px] text-amber-100">
          {interrupt.message}
        </p>
      )}

      {payloadRows.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {payloadRows.map((row) => (
            <span key={row.key} data-testid="qs-gate-payload" className="rounded-full border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[9px] text-[var(--text-secondary)]">
              {row.key}: <span className="font-medium text-[var(--text-primary)]">{row.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Structural anomaly */}
        {state.deviationPct !== null && (
          <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
              <FileWarning size={11} />
              Structural anomaly
            </div>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Estimate deviates <span className="font-medium text-amber-400">{state.deviationPct.toFixed(2)}%</span> from the historical baseline.
            </div>
          </div>
        )}

        {/* By-Laws clauses */}
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
            <BookOpenText size={11} />
            Referenced By-Laws clause ({byLawsClauses.length})
          </div>
          <ul className="space-y-0.5">
            {byLawsClauses.slice(0, 3).map((doc) => (
              <li key={doc.chunkId} className="text-[9px] text-[var(--text-secondary)]">
                [{doc.chapter ?? '?'}] {doc.heading} · <span className="text-[var(--text-tertiary)]">{doc.sectionId}</span>
              </li>
            ))}
            {byLawsClauses.length === 0 && (
              <li className="text-[9px] text-[var(--text-muted)]">No code sections retrieved for this run.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Calculator inputs */}
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
            <Calculator size={11} />
            Calculator inputs
          </div>
          <ul className="space-y-1">
            {calculatorCalls.map((call) => (
              <li key={call.id} className="text-[9px] text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{call.tool}</span>{' '}
                <span className="text-[var(--text-tertiary)]">
                  {JSON.stringify(call.args)}
                </span>
              </li>
            ))}
            {calculatorCalls.length === 0 && (
              <li className="text-[9px] text-[var(--text-muted)]">No quantity/cost tools were run.</li>
            )}
          </ul>
        </div>

        {/* Committed ledger cover */}
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
            <Scale size={11} />
            Committed ledger cover
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {ledgerTotalCents !== undefined ? (
              <>Committed to WBS codes: <span className="font-medium text-[var(--text-primary)]">{fmtCentAmount(ledgerTotalCents)}</span></>
            ) : (
              'Not loaded for this project.'
            )}
          </div>
        </div>

        {/* Site photos */}
        <div className="rounded-lg bg-[var(--bg-tertiary)] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase text-[var(--text-muted)]">
            <Camera size={11} />
            Site photos on file
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {sitePhotoCount !== undefined ? (
              <>{sitePhotoCount} photo{sitePhotoCount === 1 ? '' : 's'} captured offline for this project.</>
            ) : (
              'Not loaded for this project.'
            )}
          </div>
        </div>
      </div>

      {!awaitingInput && (
        <div className="mt-3 rounded-lg bg-[var(--bg-tertiary)] p-3 text-[10px] text-[var(--text-muted)]">
          This run is not waiting on a gate ({state.status}). Nothing to approve.
        </div>
      )}

      <div className="mt-4 space-y-2">
        <label className="block">
          <span className="mb-1 block text-[9px] font-medium text-[var(--text-muted)]">
            QS correction / approval note
          </span>
          <Textarea
            data-testid="qs-gate-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Approved — deviation within tolerable bounds for the region; withhold 5% retention."
            rows={2}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="brand"
            size="sm"
            data-testid="qs-gate-approve"
            disabled={!awaitingInput || submitting || busy}
            onClick={() => void handleResolve('APPROVED')}
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            {submitting ? 'Resuming…' : 'Approve & resume'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            data-testid="qs-gate-reject"
            disabled={!awaitingInput || submitting || busy}
            onClick={() => void handleResolve('REJECTED')}
          >
            <XCircle size={14} className="mr-1.5" />
            Reject
          </Button>
          {onReset && (
            <Button variant="ghost" size="sm" data-testid="qs-gate-reset" onClick={onReset}>
              Dismiss
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-600/10 p-2 text-[10px] text-red-400">{error}</div>
        )}
      </div>
    </div>
  );
}
