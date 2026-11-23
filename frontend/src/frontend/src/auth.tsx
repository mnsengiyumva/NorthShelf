import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type User } from './api'

type AuthValue = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: api.me })

  const value: AuthValue = {
    user: me.data ?? null,
    isLoading: me.isLoading,
    login: async (email, password) => {
      const user = await api.login(email, password)
      queryClient.setQueryData(['me'], user)
    },
    signup: async (email, password, displayName) => {
      const user = await api.signup(email, password, displayName)
      queryClient.setQueryData(['me'], user)
    },
    logout: async () => {
      await api.logout()
      queryClient.setQueryData(['me'], null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
