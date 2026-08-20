import { useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import type { RiskRegisterEntry } from '@/domain/sitehawk';
import { DzCard, DzPill, Kicker, Money, DataTable } from '@/components/dzenhare';

interface RiskRegisterCardProps {
  risks: RiskRegisterEntry[];
}

function riskTone(risk: RiskRegisterEntry): 'disputed' | 'neutral' | 'released' {
  if (risk.status === 'closed') return 'released';
  if (risk.score >= 8) return 'disputed';
  return 'neutral';
}

function riskIcon(risk: RiskRegisterEntry) {
  if (risk.status === 'closed') return <CheckCircle className="h-3 w-3 text-emerald-400" />;
  if (risk.score >= 8) return <AlertTriangle className="h-3 w-3 text-safetyOrange" />;
  return <Shield className="h-3 w-3 text-steelBlue" />;
}

export function RiskRegisterCard({ risks }: RiskRegisterCardProps) {
  const totalContingency = useMemo(() => risks.reduce((s, r) => s + r.contingencyCents, 0), [risks]);
  const openCount = useMemo(() => risks.filter((r) => r.status === 'open').length, [risks]);
  const highCount = useMemo(() => risks.filter((r) => r.score >= 8).length, [risks]);

  if (risks.length === 0) {
    return (
      <DzCard className="p-4" data-testid="risk-register">
        <Kicker>Risk Register</Kicker>
        <p className="mt-2 py-6 text-center text-xs text-[var(--text-muted)]">No risks generated — run the critical path engine with a locked baseline.</p>
      </DzCard>
    );
  }

  return (
    <DzCard className="p-4" data-testid="risk-register">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kicker>Risk Register</Kicker>
          <DzPill tone="disputed">{openCount} open</DzPill>
          {highCount > 0 && <DzPill tone="disputed">{highCount} high</DzPill>}
        </div>
        <span className="font-mono text-xs text-[var(--brand-accent)]">
          Contingency: <Money cents={totalContingency} className="text-xs" />
        </span>
      </div>

      <DataTable
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (r: RiskRegisterEntry) => (
              <span className="flex items-center gap-1 font-mono text-xs font-bold">
                {riskIcon(r)} {r.code}
              </span>
            ),
          },
          { key: 'category', header: 'Category', render: (r: RiskRegisterEntry) => <span className="text-xs">{r.category}</span> },
          {
            key: 'description',
            header: 'Risk',
            render: (r: RiskRegisterEntry) => (
              <div>
                <p className="text-xs text-[var(--text-primary)]">{r.description}</p>
                <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Mitigation: {r.mitigation}</p>
              </div>
            ),
          },
          {
            key: 'score',
            header: 'Score',
            align: 'right',
            render: (r: RiskRegisterEntry) => (
              <DzPill tone={riskTone(r)}>{r.score}/20</DzPill>
            ),
          },
          {
            key: 'contingencyCents',
            header: 'Contingency',
            align: 'right',
            render: (r: RiskRegisterEntry) => <Money cents={r.contingencyCents} className="text-xs" />,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r: RiskRegisterEntry) => (
              <DzPill tone={r.status === 'closed' ? 'released' : r.status === 'accepted' ? 'neutral' : 'disputed'}>
                {r.status}
              </DzPill>
            ),
          },
        ]}
        rows={risks}
        rowKey={(r) => r.id}
        className="mt-2"
      />
    </DzCard>
  );
}
