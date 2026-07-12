import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { UserRecord } from '@/domain/rbac'
import { loadPersistedUserId, persistUserId } from '@/lib/auth/session'

interface AuthState {
  user: UserRecord
  setRole: (role: UserRecord['role']) => void
  setName: (name: string) => void
  isAuthorized: (requiredRoles: UserRecord['role'][]) => boolean
}

const storedId = loadPersistedUserId()
const defaultUser: UserRecord = { id: storedId ?? 'local-user', name: 'Default User', role: 'owner' }

export const useAuthStore = create<AuthState>()(
  immer(
    persist(
      (set, get) => ({
        user: defaultUser,

        setRole: (role) =>
          set((s) => {
            s.user.role = role
          }),

        setName: (name) =>
          set((s) => {
            s.user.name = name
          }),

        isAuthorized: (requiredRoles) => {
          return requiredRoles.includes(get().user.role)
        },
      }),
      {
        name: 'budget-engineer-auth',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ user: state.user }),
        onRehydrateStorage: () => (state) => {
          if (state?.user?.id) persistUserId(state.user.id)
        },
      },
    ),
  ),
)
