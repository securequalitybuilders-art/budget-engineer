import type { GovernanceRecord } from '../../domain/governance';

export function GovernanceCommentsPanel({
  record,
  onAdd,
}: {
  record: GovernanceRecord;
  onAdd: (message: string) => void;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Governance Signoff History</h3>
      <textarea placeholder="Add review/signoff note" onBlur={(e) => { if (e.target.value.trim()) onAdd(e.target.value.trim()); e.target.value = ''; }} style={textareaStyle} />
      <div style={{ display: 'grid', gap: 10, marginTop: 12, maxHeight: 220, overflow: 'auto' }}>
        {record.comments.length === 0 ? <p style={mutedStyle}>No governance comments yet.</p> : record.comments.map((comment) => (
          <div key={comment.id} style={itemStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ color: '#f8fafc', fontSize: 12 }}>{comment.author}</strong>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(comment.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>{comment.message}</div>
            {comment.action && <div style={{ color: '#d4a574', fontSize: 11, marginTop: 4 }}>{comment.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const mutedStyle: React.CSSProperties = { margin: 0, color: '#94a3b8' };
const textareaStyle: React.CSSProperties = { width: '100%', minHeight: 72, background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
const itemStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
