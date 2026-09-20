import { AxiosError } from 'axios'
import { apiClient } from './api-client'

function isAxiosErrorLike(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && (error as { isAxiosError?: boolean }).isAxiosError === true
}

export function apiErrorMessage(error: unknown): string {
  if (isAxiosErrorLike(error)) {
    const response = error.response
    const detail = (response?.data as { detail?: unknown } | undefined)?.detail

    if (!response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
      return 'Unable to reach the server. Please check your connection or try again later.'
    }

    // 429 from the rate limiter carries a Retry-After header; surface a
    // countdown instead of the generic detail string so UIs can show real
    // guidance ("try again in Ns") rather than a vague failure.
    if (response?.status === 429) {
      const retryAfter = response.headers?.['retry-after']
      const seconds = retryAfter != null ? Number(retryAfter) : NaN
      if (Number.isFinite(seconds) && seconds > 0) {
        return `Too many requests. Try again in ${Math.ceil(seconds)}s.`
      }
    }
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (item as { msg?: string } | undefined)?.msg ?? 'Invalid value')
        .join('. ')
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export const normalizePhone = (raw: string): string => {
  const cleaned = raw.replace(/[\s\-().]/g, '')
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

export function phoneError(raw: string): string | null {
  const phone = normalizePhone(raw)
  if (!/\d/.test(phone)) return 'Enter your phone number, e.g. +91 9850012345'
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return 'Enter a valid phone number with country code, e.g. +91 9850012345'
  }
  return null
}

export function emailError(raw: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) {
    return 'Enter a valid email address'
  }
  return null
}

export function loginIdentifierError(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return 'Enter your email or phone number'
  if (trimmed.includes('@')) {
    return emailError(trimmed)
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 10) {
    return phoneError(trimmed)
  }
  return 'Enter a valid email address or phone number'
}

export type Role = 'FARMER' | 'BUYER' | 'ADMIN' | 'CONSUMER' | 'LOGISTICS' | 'BULK_BUYER'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'

export const ROLE_LABELS: Record<Role, string> = {
  FARMER: 'Farmer',
  BUYER: 'Buyer',
  ADMIN: 'Admin',
  CONSUMER: 'Consumer',
  LOGISTICS: 'Logistics Partner',
  BULK_BUYER: 'Enterprise Buyer',
}

export const ROLES: Role[] = ['FARMER', 'BUYER', 'CONSUMER', 'LOGISTICS', 'ADMIN', 'BULK_BUYER']

export interface ChallengeResponse {
  user_id: string
  challenge_id: string
  purpose: string
  expires_at: string
  resend_after_seconds: number
  mock_code: string | null
}

export interface RegisterResponse extends ChallengeResponse {
  phone_e164: string
  email: string | null
  role: Role
  status: UserStatus
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface VerifyResponse {
  user_id: string
  role: Role
  status: UserStatus
  tokens: TokenResponse
}

export interface UserResponse {
  id: string
  phone_e164: string
  email: string | null
  role: Role
  status: UserStatus
  phone_verified_at: string | null
  created_at: string
}

export const register = (phone: string, email: string, role: Role, password: string) => {
  const invalid = phoneError(phone)
  if (invalid) return Promise.reject(new Error(invalid))
  return apiClient.post<RegisterResponse>('/auth/register', {
    phone_e164: normalizePhone(phone),
    email: email.trim().toLowerCase(),
    role,
    password,
  })
}

export const login = (identifier: string, password: string) => {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) {
    const invalid = emailError(trimmed)
    if (invalid) return Promise.reject(new Error(invalid))
    return apiClient.post<VerifyResponse>('/auth/login', {
      email: trimmed.toLowerCase(),
      password,
    })
  }

  const phone = normalizePhone(trimmed)
  const invalid = phoneError(phone)
  if (invalid) return Promise.reject(new Error(invalid))
  return apiClient.post<VerifyResponse>('/auth/login', {
    phone_e164: phone,
    password,
  })
}

export const resendOtp = (user_id: string) =>
  apiClient.post<ChallengeResponse>('/auth/otp/resend', { user_id })

export const verifyOtp = (challenge_id: string, code: string) =>
  apiClient.post<VerifyResponse>('/auth/otp/verify', { challenge_id, code })

export const logout = (refresh_token: string) =>
  apiClient.post('/auth/logout', { refresh_token })

export const fetchMe = () => apiClient.get<UserResponse>('/auth/me')

export interface ForgotPasswordResponse {
  message: string
  expires_in_minutes: number
  mock_reset_token: string | null
}

export interface ResetPasswordResponse {
  message: string
}

export function identifierError(raw: string): string | null {
  const value = raw.trim()
  if (!value) return 'Enter your email or phone number'
  if (value.includes('@')) return emailError(value)
  const invalid = phoneError(value)
  return invalid && value.startsWith('+') ? invalid : value.length >= 3 ? null : 'Enter your email or phone number'
}

export const requestPasswordReset = (identifier: string) => {
  const invalid = identifierError(identifier)
  if (invalid) return Promise.reject(new Error(invalid))
  return apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
    identifier: identifier.trim(),
  })
}

export const resetPassword = (token: string, newPassword: string) =>
  apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
    token,
    new_password: newPassword,
  })