import { TransactionEvent } from '../../domain/types';

export function TransactionHistoryPanel({ transactions }: { transactions: TransactionEvent[] }) {
  return (
    <div className="panel">
      <h3>Transaction History</h3>
      <p className="sub">Immutable audit trail · {transactions.length} events</p>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {transactions.length === 0 && <p className="note">No events yet.</p>}
        {transactions.map((t) => (
          <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #24324b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="tag">{t.action}</span>
              <span className="note">{new Date(t.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="note" style={{ marginTop: 4 }}>{t.summary}</div>
            <div className="note" style={{ color: '#64748b' }}>{t.actor} · {t.entityType}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
