import type { UserRecord } from '../../domain/rbac';

export function UserSwitcherPanel({
  users,
  currentUserId,
  onSwitch,
}: {
  users: UserRecord[];
  currentUserId: string;
  onSwitch: (id: string) => void;
}) {
  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>User Switcher</h3>
      <select value={currentUserId} onChange={(e) => onSwitch(e.target.value)} style={selectStyle}>
        {users.map((user) => (
          <option key={user.id} value={user.id}>{user.name} · {user.role}</option>
        ))}
      </select>
    </div>
  );
}

const panelStyle: React.CSSProperties = { background: '#111c31', border: '1px solid #24324b', borderRadius: 18, padding: 16, color: '#e2e8f0' };
const titleStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: 16 };
const selectStyle: React.CSSProperties = { width: '100%', background: '#0b1220', color: '#e2e8f0', border: '1px solid #24324b', padding: '10px 12px', borderRadius: 10 };
