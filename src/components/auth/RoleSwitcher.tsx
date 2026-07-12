import { useAuthStore } from '@/stores/authStore'
import { roleLabel } from '@/lib/auth/rbac'
import type { UserRecord } from '@/domain/rbac'
import { Shield, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const ROLES: UserRecord['role'][] = ['owner', 'reviewer', 'viewer']

export function RoleSwitcher() {
  const { user, setRole, setName } = useAuthStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <Shield size={16} />
        <span className="flex-1 text-left truncate">Role: {roleLabel(user.role)}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2 shadow-xl">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Local Role</div>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setOpen(false) }}
              className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                user.role === r
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {roleLabel(r)}
            </button>
          ))}
          <div className="mt-2 border-t border-[var(--border-default)] pt-2">
            <input
              type="text"
              value={user.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--brand-accent)]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
