import type { ZoneTrace } from '../../lib/zoneTrace';

export function ZoneTracePanel({ trace }: { trace?: ZoneTrace }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Zone → BOQ Traceability</h3>
      {!trace ? <p style={mutedStyle}>Select a room zone to inspect related BOQ contributors.</p> : (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{trace.zoneName}</div>
          {trace.items.length === 0 ? <div style={mutedStyle}>No related BOQ items found.</div> : trace.items.map((item) => (
            <div key={item.id} style={itemStyle}>
              <div style={{ color: '#f8fafc', fontSize: 12 }}>{item.description}</div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>{item.category} · {item.quantity} {item.unit} · {item.total.toFixed(2)} USD</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8', lineHeight: 1.5 };
const itemStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
