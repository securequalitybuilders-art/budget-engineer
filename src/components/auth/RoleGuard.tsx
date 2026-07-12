import { useAuthStore } from '@/stores/authStore'
import type { UserRecord } from '@/domain/rbac'

interface RoleGuardProps {
  roles: UserRecord['role'][]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function RoleGuard({ roles, fallback, children }: RoleGuardProps) {
  const isAuthorized = useAuthStore((s) => s.isAuthorized)
  if (isAuthorized(roles)) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}

export function RequireRole({ roles, children }: { roles: UserRecord['role'][]; children: React.ReactNode }) {
  const isAuthorized = useAuthStore((s) => s.isAuthorized)
  if (isAuthorized(roles)) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <p className="text-sm text-[var(--text-muted)]">You do not have permission to view this content.</p>
      <p className="text-xs text-[var(--text-tertiary)]">Required role: {roles.join(' or ')}</p>
    </div>
  )
}
