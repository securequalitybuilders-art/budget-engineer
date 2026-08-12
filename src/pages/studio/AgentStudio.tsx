import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Bot, ShieldCheck } from 'lucide-react';
import { AgentRunnerPanel } from '@/components/agent/AgentRunnerPanel';
import { QsGateApprovalPanel } from '@/components/QSGateApprovalPanel';
import { BorderBeamCard } from '@/components/dzenhare';
import type { BudgetAgentResult } from '@/engine/agents';
import { db } from '@/db/db';

export function AgentStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const [pendingGate, setPendingGate] = useState<BudgetAgentResult | null>(null);
  const [gateContext, setGateContext] = useState<{ runId: string; ledgerTotalCents: number; sitePhotoCount: number } | null>(null);

  useEffect(() => {
    if (!projectId || !pendingGate) return;
    let cancelled = false;
    (async () => {
      try {
        const entries = await db.ledgerEntries.where('projectId').equals(projectId).toArray();
        const photos = await db.sitePhotos.where('projectId').equals(projectId).toArray();
        if (cancelled) return;
        setGateContext({
          runId: pendingGate.state.runId,
          ledgerTotalCents: entries.reduce((sum, e) => sum + e.amountCents, 0),
          sitePhotoCount: photos.length,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, pendingGate]);

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">No project selected</h2>
          <Link to="/" className="text-sm text-[var(--brand-accent)] underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const activeGateContext =
    gateContext && pendingGate && gateContext.runId === pendingGate.state.runId ? gateContext : null;

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
            <Bot size={20} className="text-[var(--brand-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Budget Engineer Agent</h1>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Deterministic researcher → calculator → validator → supervisor orchestrator with human-in-the-loop gates.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
        <ShieldCheck size={13} className="text-amber-400" />
        QS gate: when the agent pauses for approval, the panel below shows the anomaly, cited clauses, calculator inputs, ledger cover and site photos.
      </div>

      <QsGateApprovalPanel
        state={pendingGate?.state ?? null}
        interrupt={pendingGate?.interrupt ?? null}
        ledgerTotalCents={activeGateContext?.ledgerTotalCents}
        sitePhotoCount={activeGateContext?.sitePhotoCount}
        onResolved={() => setPendingGate(null)}
        onReset={() => setPendingGate(null)}
      />

      <BorderBeamCard
        badge="Budget Engineer Fortress"
        title="Agent Orchestrator"
        description="Researcher → calculator → validator → supervisor, with SI 56/2025 and QS human-in-the-loop gates. Runs fully offline against the embedded code corpus."
      >
        <AgentRunnerPanel projectId={projectId} onInterrupt={(res) => setPendingGate(res)} />
      </BorderBeamCard>
    </div>
  );
}
