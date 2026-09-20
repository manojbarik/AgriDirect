import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { ChallengeResponse, Role, UserResponse } from '../api/auth'
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  resendOtp as resendOtpRequest,
  verifyOtp,
} from '../api/auth'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../api/api-client'
import { AuthContext, type PendingChallenge } from './useAuth'

const PENDING_CHALLENGE_KEY = 'marketplace:pending-challenge'

function readPendingChallenge(): PendingChallenge | null {
  const raw = sessionStorage.getItem(PENDING_CHALLENGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingChallenge
  } catch {
    return null
  }
}

function storePendingChallenge(challenge: PendingChallenge) {
  sessionStorage.setItem(PENDING_CHALLENGE_KEY, JSON.stringify(challenge))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(
    readPendingChallenge,
  )

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      if (!getAccessToken() || !getRefreshToken()) {
        setInitializing(false)
        return
      }
      try {
        const { data } = await fetchMe()
        if (!cancelled) setUser(data)
      } catch {
        clearTokens()
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void restore()
    const onAuthExpired = () => {
      clearTokens()
      setUser(null)
      setPendingChallenge(null)
      sessionStorage.removeItem(PENDING_CHALLENGE_KEY)
    }
    window.addEventListener('marketplace:auth-expired', onAuthExpired)
    return () => {
      cancelled = true
      window.removeEventListener('marketplace:auth-expired', onAuthExpired)
    }
  }, [])

  const saveChallenge = useCallback((challenge: ChallengeResponse, email: string) => {
    const pending: PendingChallenge = { ...challenge, email }
    storePendingChallenge(pending)
    setPendingChallenge(pending)
    return pending
  }, [])

  const register = useCallback(
    async (phone: string, email: string, role: Role, password: string) => {
      const { data } = await registerRequest(phone, email, role, password)
      return saveChallenge(data, email)
    },
    [saveChallenge],
  )

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await loginRequest(email, password)
    setTokens(data.tokens.access_token, data.tokens.refresh_token)
    const { data: me } = await fetchMe()
    setUser(me)
    return me
  }, [])

  const resend = useCallback(async () => {
    if (!pendingChallenge) return
    const { data } = await resendOtpRequest(pendingChallenge.user_id)
    saveChallenge(data, pendingChallenge.email)
  }, [pendingChallenge, saveChallenge])

  const verify = useCallback(
    async (code: string) => {
      if (!pendingChallenge) return
      const { data } = await verifyOtp(pendingChallenge.challenge_id, code)
      setTokens(data.tokens.access_token, data.tokens.refresh_token)
      const { data: me } = await fetchMe()
      setUser(me)
      setPendingChallenge(null)
      sessionStorage.removeItem(PENDING_CHALLENGE_KEY)
    },
    [pendingChallenge],
  )

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await logoutRequest(refreshToken)
      } catch {
        // Local sign-out still proceeds when the token is already invalid.
      }
    }
    clearTokens()
    setUser(null)
    setPendingChallenge(null)
    sessionStorage.removeItem(PENDING_CHALLENGE_KEY)
  }, [])

  const value = useMemo(
    () => ({ user, initializing, pendingChallenge, register, login, resend, verify, logout }),
    [user, initializing, pendingChallenge, register, login, resend, verify, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}