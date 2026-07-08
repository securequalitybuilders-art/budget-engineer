import type { ProjectSnapshot } from '../../domain/versioning';
import type { SnapshotDiff } from '../../lib/snapshotDiff';

export function QuantityComparisonPanel({
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
      <h3 style={titleStyle}>Before / After Quantity Comparison</h3>
      {!snapshotA || !snapshotB || !diff ? <p style={mutedStyle}>Select two snapshots to view before/after quantity deltas.</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={thStyle}>Before</th>
              <th style={thStyle}>After</th>
              <th style={thStyle}>Delta</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Added Elements" before="0" after={String(diff.addedIds.length)} delta={String(diff.addedIds.length)} />
            <Row label="Removed Elements" before={String(diff.removedIds.length)} after="0" delta={String(-diff.removedIds.length)} />
            <Row label="Modified Elements" before="0" after={String(diff.modifiedIds.length)} delta={String(diff.modifiedIds.length)} />
            <Row label="Wall Count Change" before="—" after="—" delta={String(diff.wallDelta)} />
            <Row label="Opening Count Change" before="—" after="—" delta={String(diff.openingDelta)} />
            <Row label="Zone Count Change" before="—" after="—" delta={String(diff.zoneDelta)} />
            <Row label="Subtotal Change" before="—" after="—" delta={`${diff.boqSubtotalDelta.toFixed(2)} USD`} />
            <Row label="Grand Total Change" before="—" after="—" delta={`${diff.boqGrandTotalDelta.toFixed(2)} USD`} />
          </tbody>
        </table>
      )}
    </div>
  );
}

function Row({ label, before, after, delta }: { label: string; before: string; after: string; delta: string }) {
  return <tr><td style={tdStyle}>{label}</td><td style={tdStyle}>{before}</td><td style={tdStyle}>{after}</td><td style={tdStyle}>{delta}</td></tr>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #24324b', padding: '8px 6px' };
const tdStyle: React.CSSProperties = { color: '#f8fafc', borderBottom: '1px solid #1e293b', padding: '8px 6px' };
