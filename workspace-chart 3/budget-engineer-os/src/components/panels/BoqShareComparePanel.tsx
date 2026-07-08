import { compareBoqShares } from '../../lib/boqShare';

export function BoqShareComparePanel({ left, right }: { left: Record<string, number>; right: Record<string, number> }) {
  const { rows, leftGrandTotal, rightGrandTotal } = compareBoqShares(left, right);
  const hasData = leftGrandTotal > 0 || rightGrandTotal > 0;

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>BOQ Cost Composition (% Share)</h3>
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
        How cost is distributed across categories, normalised by project total — comparable even when project sizes differ.
      </div>

      {!hasData && <div style={{ color: '#64748b', fontSize: 13 }}>Select two projects with BOQ data to compare composition.</div>}

      {hasData && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
            <span>Left total: <strong style={{ color: '#7dd3fc' }}>{leftGrandTotal.toFixed(0)} USD</strong></span>
            <span>Right total: <strong style={{ color: '#d4a574' }}>{rightGrandTotal.toFixed(0)} USD</strong></span>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map((row) => (
              <div key={row.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, fontSize: 12 }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{row.category}</span>
                  <span style={shiftBadge(row.shareDelta)}>
                    {row.shareDelta >= 0 ? '+' : ''}{row.shareDelta.toFixed(1)} pts
                  </span>
                </div>
                <ShareBar label="L" value={row.leftShare} color="#06b6d4" />
                <ShareBar label="R" value={row.rightShare} color="#d4a574" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShareBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ color: '#64748b', fontSize: 10, width: 10 }}>{label}</span>
      <div style={{ flex: 1, background: '#0b1220', borderRadius: 999, height: 12, overflow: 'hidden', border: '1px solid #24324b' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, transition: 'width 0.2s' }} />
      </div>
      <span style={{ color: '#cbd5e1', fontSize: 11, width: 44, textAlign: 'right' }}>{value.toFixed(1)}%</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 6px', fontSize: 16 };
const shiftBadge = (delta: number): React.CSSProperties => {
  const neutral = Math.abs(delta) < 0.05;
  const color = neutral ? '#94a3b8' : delta >= 0 ? '#bbf7d0' : '#fecaca';
  const bg = neutral ? 'rgba(148,163,184,0.12)' : delta >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  return { fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 999, padding: '2px 8px' };
};
