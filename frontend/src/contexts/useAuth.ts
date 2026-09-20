import { createContext, useContext } from 'react'
import type { ChallengeResponse, Role, UserResponse } from '../api/auth'

export interface PendingChallenge extends ChallengeResponse {
  email: string
}

export interface AuthContextValue {
  user: UserResponse | null
  initializing: boolean
  pendingChallenge: PendingChallenge | null
  register: (phone: string, email: string, role: Role, password: string) => Promise<PendingChallenge>
  login: (email: string, password: string) => Promise<UserResponse | void>
  resend: () => Promise<void>
  verify: (code: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}