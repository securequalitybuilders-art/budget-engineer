import type { ProjectSnapshot } from '../../domain/versioning';
import type { SnapshotDiff } from '../../lib/snapshotDiff';

export function ComparisonDashboardPanel({
  snapshotA,
  snapshotB,
  diff,
}: {
  snapshotA?: ProjectSnapshot;
  snapshotB?: ProjectSnapshot;
  diff?: SnapshotDiff;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Comparison Dashboard</h3>
      {!snapshotA || !snapshotB || !diff ? <p style={mutedStyle}>Select two snapshots to view an executive comparison summary.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          <Card label="Added Elements" value={String(diff.addedIds.length)} color="#22c55e" />
          <Card label="Removed Elements" value={String(diff.removedIds.length)} color="#ef4444" />
          <Card label="Modified Elements" value={String(diff.modifiedIds.length)} color="#f59e0b" />
          <Card label="Grand Total Delta" value={`${diff.boqGrandTotalDelta.toFixed(2)} USD`} color="#8b5cf6" />
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return <div style={{ background: '#0b1220', border: `1px solid ${color}55`, borderRadius: 10, padding: 10 }}><div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div><div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 700 }}>{value}</div></div>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
