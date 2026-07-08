import type { ProjectSnapshot } from '../../domain/versioning';
import type { SnapshotDiff } from '../../lib/snapshotDiff';

export function SnapshotComparisonPanel({
  snapshots,
  selectedA,
  selectedB,
  onSelectA,
  onSelectB,
  diff,
}: {
  snapshots: ProjectSnapshot[];
  selectedA?: string;
  selectedB?: string;
  onSelectA: (id: string) => void;
  onSelectB: (id: string) => void;
  diff?: SnapshotDiff;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Snapshot Comparison</h3>
      <div style={{ display: 'grid', gap: 10 }}>
        <select value={selectedA ?? ''} onChange={(e) => onSelectA(e.target.value)} style={selectStyle}>
          <option value="">Select base snapshot</option>
          {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={selectedB ?? ''} onChange={(e) => onSelectB(e.target.value)} style={selectStyle}>
          <option value="">Select compare snapshot</option>
          {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {!diff ? <p style={mutedStyle}>Choose two snapshots to compare cost and geometry deltas.</p> : (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <Metric label="Wall Delta" value={String(diff.wallDelta)} />
          <Metric label="Opening Delta" value={String(diff.openingDelta)} />
          <Metric label="Zone Delta" value={String(diff.zoneDelta)} />
          <Metric label="Subtotal Delta" value={`${diff.boqSubtotalDelta.toFixed(2)} USD`} />
          <Metric label="Grand Total Delta" value={`${diff.boqGrandTotalDelta.toFixed(2)} USD`} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={metricStyle}><span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span><strong style={{ color: '#f8fafc', fontSize: 13 }}>{value}</strong></div>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { marginTop: 12, color: '#94a3b8' };
const selectStyle: React.CSSProperties = { background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '10px 12px', borderRadius: 10 };
const metricStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
