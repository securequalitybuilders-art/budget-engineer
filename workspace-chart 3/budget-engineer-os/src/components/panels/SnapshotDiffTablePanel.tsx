import type { ProjectSnapshot } from '../../domain/versioning';
import type { SnapshotDiff } from '../../lib/snapshotDiff';

export function SnapshotDiffTablePanel({
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
      <h3 style={titleStyle}>Snapshot Diff Table</h3>
      {!snapshotA || !snapshotB || !diff ? <p style={mutedStyle}>Select two snapshots to view a richer change summary.</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={thStyle}>{snapshotA.name}</th>
              <th style={thStyle}>{snapshotB.name}</th>
              <th style={thStyle}>Delta</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Walls" a="see summary" b="see summary" d={String(diff.wallDelta)} />
            <Row label="Openings" a="see summary" b="see summary" d={String(diff.openingDelta)} />
            <Row label="Zones" a="see summary" b="see summary" d={String(diff.zoneDelta)} />
            <Row label="Added Elements" a="0" b={String(diff.addedIds.length)} d={String(diff.addedIds.length)} />
            <Row label="Removed Elements" a={String(diff.removedIds.length)} b="0" d={String(diff.removedIds.length)} />
            <Row label="Modified Elements" a="—" b="—" d={String(diff.modifiedIds.length)} />
            <Row label="Subtotal" a="see BOQ" b="see BOQ" d={`${diff.boqSubtotalDelta.toFixed(2)} USD`} />
            <Row label="Grand Total" a="see BOQ" b="see BOQ" d={`${diff.boqGrandTotalDelta.toFixed(2)} USD`} />
          </tbody>
        </table>
      )}
    </div>
  );
}

function Row({ label, a, b, d }: { label: string; a: string; b: string; d: string }) {
  return <tr><td style={tdStyle}>{label}</td><td style={tdStyle}>{a}</td><td style={tdStyle}>{b}</td><td style={tdStyle}>{d}</td></tr>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const thStyle: React.CSSProperties = { textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #24324b', padding: '8px 6px' };
const tdStyle: React.CSSProperties = { color: '#f8fafc', borderBottom: '1px solid #1e293b', padding: '8px 6px' };
