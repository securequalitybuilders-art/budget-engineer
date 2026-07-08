import type { ZoneBoqGroup } from '../../lib/zoneGrouping';

export function ZoneBoqGroupPanel({ group }: { group?: ZoneBoqGroup }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Room-Based BOQ Grouping</h3>
      {!group ? <p style={mutedStyle}>Select a room zone to see grouped BOQ contributors by category.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{group.zoneName}</div>
          {group.categoryTotals.map((entry) => (
            <div key={entry.category} style={itemStyle}>
              <div style={{ color: '#f8fafc', fontSize: 12 }}>{entry.category}</div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>{entry.total.toFixed(2)} USD</div>
            </div>
          ))}
          <div style={{ ...itemStyle, borderColor: '#d4a57455' }}>
            <div style={{ color: '#f5d7ac', fontSize: 12, fontWeight: 700 }}>Total</div>
            <div style={{ color: '#f5d7ac', fontSize: 11 }}>{group.total.toFixed(2)} USD</div>
          </div>
        </div>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const itemStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between' };
