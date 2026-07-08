import type { GovernanceRecord, ApprovalState } from '../../domain/governance';

const STATE_META: Record<ApprovalState, { label: string; color: string; bg: string; description: string }> = {
  draft: { label: 'Draft', color: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', description: 'Not yet submitted for review.' },
  in_review: { label: 'In Review', color: '#7dd3fc', bg: 'rgba(6,182,212,0.12)', description: 'Awaiting reviewer decision.' },
  approved: { label: 'Approved', color: '#bbf7d0', bg: 'rgba(34,197,94,0.12)', description: 'Signed off and locked for issue.' },
  rejected: { label: 'Rejected', color: '#fecaca', bg: 'rgba(239,68,68,0.12)', description: 'Returned with corrective actions.' },
};

function fmt(ts?: string): string {
  return ts ? new Date(ts).toLocaleString() : '—';
}

export function GovernanceSummaryPanel({ record }: { record: GovernanceRecord }) {
  const meta = STATE_META[record.approvalState];
  const actionComments = record.comments.filter((c) => c.action);
  const lastDecision = [...record.comments].reverse().find((c) => c.action === 'Approved' || c.action === 'Rejected' || c.action === 'Sent to review');

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h3 style={titleStyle}>Governance Summary</h3>
        <span style={{ ...statusPill, color: meta.color, background: meta.bg, borderColor: meta.color }}>{meta.label}</span>
      </div>

      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14 }}>{meta.description}</div>

      <div style={cardGrid}>
        <Card title="Version" value={record.versionLabel} sub={`Owner · ${record.owner}`} accent="#8b5cf6" />
        <Card title="Reviewed" value={record.reviewedBy ?? 'Pending'} sub={fmt(record.reviewedAt)} accent="#06b6d4" />
        <Card title="Approved" value={record.approvedBy ?? '—'} sub={fmt(record.approvedAt)} accent="#22c55e" />
        <Card title="Rejected" value={record.rejectedBy ?? '—'} sub={fmt(record.rejectedAt)} accent="#ef4444" />
      </div>

      {record.approvalState === 'rejected' && record.rejectionReason && (
        <div style={rejectionBox}>
          <div style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Rejection Reason</div>
          <div style={{ color: '#fecaca', fontSize: 13, lineHeight: 1.5 }}>{record.rejectionReason}</div>
        </div>
      )}

      {lastDecision && (
        <div style={lastDecisionBox}>
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Latest decision</div>
          <div style={{ color: '#f8fafc', fontSize: 13 }}>
            <strong>{lastDecision.action}</strong> by {lastDecision.author} ({lastDecision.role ?? 'user'}) · {fmt(lastDecision.timestamp)}
          </div>
          {lastDecision.reason && <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>“{lastDecision.reason}”</div>}
        </div>
      )}

      <div style={statRow}>
        <Stat label="Reviewers" value={String(record.reviewers.length)} />
        <Stat label="Comments" value={String(record.comments.length)} />
        <Stat label="Decisions" value={String(actionComments.length)} />
        <Stat label="Updated" value={fmt(record.lastUpdated).split(',')[0]} />
      </div>
    </div>
  );
}

function Card({ title, value, sub, accent }: { title: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{ ...cardStyle, borderLeft: `3px solid ${accent}` }}>
      <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700, margin: '4px 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: '1 1 0', textAlign: 'center' }}>
      <div style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#94a3b8', fontSize: 11 }}>{label}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: 16 };
const statusPill: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, border: '1px solid' };
const cardGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 };
const cardStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: 12 };
const rejectionBox: React.CSSProperties = { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 12, marginBottom: 12 };
const lastDecisionBox: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: 12, marginBottom: 12 };
const statRow: React.CSSProperties = { display: 'flex', gap: 8, background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: '12px 10px' };
