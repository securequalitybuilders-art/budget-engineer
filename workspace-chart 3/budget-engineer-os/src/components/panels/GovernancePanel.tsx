import type { GovernanceRecord } from '../../domain/governance';

export function GovernancePanel({ record }: { record: GovernanceRecord }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Enterprise Governance</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <Row label="Approval State" value={record.approvalState} />
        <Row label="Version Label" value={record.versionLabel} />
        <Row label="Owner" value={record.owner} />
        <Row label="Reviewers" value={record.reviewers.join(', ') || '—'} />
        <Row label="Last Updated" value={new Date(record.lastUpdated).toLocaleString()} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div style={rowStyle}><span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span><strong style={{ color: '#f8fafc', fontSize: 13 }}>{value}</strong></div>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const rowStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 };
