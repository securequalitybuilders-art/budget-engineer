import type { UserRecord } from '../../domain/rbac';
import { isAuthorized, roleLabel, unauthorizedReason, type GovernanceAction } from '../../lib/rbac';

const ACTIONS: { action: GovernanceAction; label: string }[] = [
  { action: 'review', label: 'Send to Review' },
  { action: 'approve', label: 'Approve' },
  { action: 'reject', label: 'Reject' },
  { action: 'comment', label: 'Comment' },
];

export function RbacPanel({ currentUser }: { currentUser: UserRecord }) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Access Control (RBAC)</h3>
      <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
        <Row label="Current User" value={currentUser.name} />
        <Row label="Role" value={roleLabel(currentUser.role)} />
        <Row label="Access" value={currentUser.role === 'viewer' ? 'Read-only' : currentUser.role === 'reviewer' ? 'Review workflow access' : 'Owner / full control'} />
      </div>

      <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Permission Matrix</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {ACTIONS.map(({ action, label }) => {
          const allowed = isAuthorized(currentUser, action);
          const reason = unauthorizedReason(currentUser, action);
          return (
            <div key={action} style={permRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: '#f8fafc', fontSize: 13 }}>{label}</strong>
                <span style={badgeStyle(allowed)}>{allowed ? 'Allowed' : 'Blocked'}</span>
              </div>
              {!allowed && reason && <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>{reason}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ color: '#64748b', fontSize: 11, marginTop: 12, lineHeight: 1.4 }}>
        Your selected identity is remembered locally across reloads. RBAC is enforced in the governance workflow — blocked actions are disabled and explained, never silently ignored.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div style={rowStyle}><span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span><strong style={{ color: '#f8fafc', fontSize: 13 }}>{value}</strong></div>;
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const rowStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 };
const permRowStyle: React.CSSProperties = { background: '#0b1220', border: '1px solid #24324b', borderRadius: 10, padding: 10 };
const badgeStyle = (allowed: boolean): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: allowed ? '#bbf7d0' : '#fecaca', background: allowed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${allowed ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}` });
