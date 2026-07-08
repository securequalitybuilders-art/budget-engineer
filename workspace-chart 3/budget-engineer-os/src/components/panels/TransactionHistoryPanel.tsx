import type { TransactionEvent } from '../../domain/transaction';

export function TransactionHistoryPanel({ items }: { items: TransactionEvent[] }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Transaction History</h3>
      <div style={{ display: 'grid', gap: 10, maxHeight: 260, overflow: 'auto' }}>
        {items.length === 0 ? <div style={mutedStyle}>No events recorded yet.</div> : items.map((item) => (
          <div key={item.id} style={itemStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ color: '#f8fafc', fontSize: 13 }}>{item.action}</strong>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>{item.summary}</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{item.actor} · {item.entityType} · {item.entityId}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const itemStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 12, padding: 10 };
